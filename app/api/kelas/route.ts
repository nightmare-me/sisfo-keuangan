import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const tipe = searchParams.get("tipe");

  const where: any = {};
  if (search) where.namaKelas = { contains: search, mode: "insensitive" };
  if (status) where.status = status;
  if (tipe && tipe !== "all") where.program = { tipe };

  const data = await prisma.kelas.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      program: true,
      pengajar: { select: { id: true, name: true } },
      _count: { select: { pendaftaran: { where: { aktif: true } } } },
    },
  });

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { namaKelas, programId, pengajarId, jadwal, hari, jam, kapasitas, durasi, tanggalMulai, tanggalSelesai, linkGrup } = body;

  if (!namaKelas || !programId) {
    return NextResponse.json({ error: "Nama kelas dan program diperlukan" }, { status: 400 });
  }

  // Validasi: Cek konflik jadwal pengajar
  if (pengajarId && hari && jam) {
    const conflict = await prisma.kelas.findFirst({
      where: {
        pengajarId,
        hari,
        jam,
        status: { not: "SELESAI" } // Kelas yang sudah selesai tidak dihitung
      }
    });
    if (conflict) {
      return NextResponse.json(
        { error: `Konflik Jadwal! ${conflict.namaKelas} sudah dijadwalkan pada ${hari}, ${jam} untuk pengajar ini.` },
        { status: 409 }
      );
    }
  }

  const kelas = await prisma.kelas.create({
    data: {
      namaKelas, programId,
      pengajarId: pengajarId || null,
      jadwal, hari, jam,
      kapasitas: kapasitas ?? 10,
      durasi: durasi || null,
      linkGrup: linkGrup || null,
      tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : null,
      tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : null,
      feePerSesi: body.feePerSesi ? parseFloat(body.feePerSesi) : 0,
      materiLink: body.materiLink || null,
    },
    include: { program: true, pengajar: true },
  });

  return NextResponse.json(kelas, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role?.toUpperCase();
  if (role !== "ADMIN") return NextResponse.json({ error: "Hanya Admin yang bisa menghapus data" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all");

  if (all === "true") {
    // Delete dependencies first
    await prisma.absensi.deleteMany({});
    await prisma.pendaftaran.deleteMany({});
    await prisma.kelas.deleteMany({});
    return NextResponse.json({ success: true });
  }

  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  await prisma.kelas.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
