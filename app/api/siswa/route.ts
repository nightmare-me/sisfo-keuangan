import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateSiswaNumber } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const csId = searchParams.get("csId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    const where: any = {};
    if (search) {
      where.OR = [
        { nama: { contains: search, mode: "insensitive" } },
        { noSiswa: { contains: search, mode: "insensitive" } },
        { telepon: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    if (csId) {
      where.pemasukan = { some: { csId } };
    }

    const [data, total, aktifCount, nonaktifCount, alumniCount] = await Promise.all([
      prisma.siswa.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          pendaftaran: {
            include: { kelas: { include: { program: true } } },
            where: { aktif: true },
          },
          pemasukan: {
            take: 5,
            orderBy: { createdAt: "desc" },
            select: { 
              id: true, 
              hargaFinal: true, 
              createdAt: true, 
              invoice: { select: { id: true, noInvoice: true } },
              program: { select: { nama: true } }
            }
          },
          _count: { select: { pemasukan: true } },
        },
      }),
      prisma.siswa.count({ where }),
      prisma.siswa.count({ where: { status: "AKTIF" } }),
      prisma.siswa.count({ where: { status: "TIDAK_AKTIF" } }),
      prisma.siswa.count({ where: { status: "ALUMNI" } }),
    ]);

    return NextResponse.json({ 
      data, 
      total, 
      page, 
      totalPages: Math.ceil(total / limit),
      summary: {
        aktif: aktifCount,
        nonaktif: nonaktifCount,
        alumni: alumniCount
      }
    });
  } catch (error: any) {
    console.error("SISWA_API_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { nama, telepon, email, alamat, tanggalLahir, catatan, kategoriUsia } = body;

  if (!nama) return NextResponse.json({ error: "Nama siswa diperlukan" }, { status: 400 });

  const noSiswa = generateSiswaNumber();

  const siswa = await prisma.siswa.create({
    data: {
      noSiswa,
      nama,
      telepon: telepon || null,
      email: email || null,
      alamat: alamat || null,
      tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
      catatan: catatan || null,
      kategoriUsia: kategoriUsia ?? "DEWASA",
    },
  });

  return NextResponse.json(siswa, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, nama, telepon, email, alamat, tanggalLahir, catatan, status, kategoriUsia } = body;

  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  const siswa = await prisma.siswa.update({
    where: { id },
    data: {
      ...(nama !== undefined && { nama }),
      ...(telepon !== undefined && { telepon: telepon || null }),
      ...(email !== undefined && { email: email || null }),
      ...(alamat !== undefined && { alamat: alamat || null }),
      ...(catatan !== undefined && { catatan: catatan || null }),
      ...(tanggalLahir !== undefined && { tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null }),
      ...(kategoriUsia !== undefined && { kategoriUsia }),
      ...(status !== undefined && { status }),
    },
  });

  return NextResponse.json(siswa);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Hanya Admin yang bisa menghapus data" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all");

  try {
    if (all === "true") {
      await prisma.absensi.deleteMany({});
      await prisma.pendaftaran.deleteMany({});
      await prisma.invoice.deleteMany({});
      await prisma.pemasukan.deleteMany({});
      await prisma.siswa.deleteMany({});
      return NextResponse.json({ success: true });
    }

    if (id) {
       await prisma.siswa.delete({ where: { id } });
       return NextResponse.json({ success: true });
    }

    const body = await request.json().catch(() => ({}));
    if (body.ids && Array.isArray(body.ids)) {
      await prisma.siswa.deleteMany({ where: { id: { in: body.ids } } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "ID atau IDs diperlukan" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal menghapus: " + err.message }, { status: 500 });
  }
}
