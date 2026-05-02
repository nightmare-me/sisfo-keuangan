import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TipeArsip } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const kategori = searchParams.get("kategori");
    const metodeBayar = searchParams.get("metodeBayar");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "200");

    const where: any = {};
    
    // Validasi Tanggal yang lebih ketat untuk menghindari "Invalid Date"
    if (from && from !== "undefined" && from !== "") {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        where.tanggal = { ...where.tanggal, gte: fromDate };
      }
    }
    
    if (to && to !== "undefined" && to !== "") {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        where.tanggal = { ...where.tanggal, lte: toDate };
      }
    }

    if (kategori && kategori !== "") where.kategori = kategori;
    if (metodeBayar && metodeBayar !== "") where.metodeBayar = metodeBayar;

    const [data, total, summary] = await Promise.all([
      prisma.pengeluaran.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { tanggal: "desc" },
        include: { 
          user: { select: { name: true } },
          arsipNota: { select: { id: true, urlFile: true, tipe: true } }
        },
      }),
      prisma.pengeluaran.count({ where }),
      prisma.pengeluaran.aggregate({
        where,
        _sum: { jumlah: true },
        _count: true,
      }),
    ]);

    // Group by kategori
    const byKategori = await prisma.pengeluaran.groupBy({
      by: ["kategori"],
      where,
      _sum: { jumlah: true },
      _count: true,
    });

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalPengeluaran: summary._sum.jumlah ?? 0,
        jumlahTransaksi: summary._count,
      },
      byKategori,
    });
  } catch (error: any) {
    console.error("GET Pengeluaran Error:", error);
    return NextResponse.json({ error: "Gagal memuat data", details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { jumlah, kategori, metodeBayar, keterangan, tanggal, urls, urlsTransfer } = body;

    if (!jumlah || jumlah <= 0) {
      return NextResponse.json({ error: "Jumlah harus lebih dari 0" }, { status: 400 });
    }

    const pengeluaran = await prisma.pengeluaran.create({
      data: {
        tanggal: (() => {
          if (!tanggal) return new Date();
          const d = new Date(tanggal);
          const now = new Date();
          d.setUTCHours(now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
          return d;
        })(),
        jumlah,
        kategori: kategori ?? "LAINNYA",
        metodeBayar: metodeBayar ?? "CASH",
        keterangan,
        dibuatOleh: (session.user as any).id,
        arsipNota: {
          create: [
            ...(urls && Array.isArray(urls) ? urls : []).map((url: string) => ({ urlFile: url, tipe: TipeArsip.NOTA })),
            ...(urlsTransfer && Array.isArray(urlsTransfer) ? urlsTransfer : []).map((url: string) => ({ urlFile: url, tipe: TipeArsip.BUKTI_TRANSFER }))
          ]
        }
      },
      include: { arsipNota: true }
    });

    return NextResponse.json(pengeluaran, { status: 201 });
  } catch (error: any) {
    console.error("POST Pengeluaran Error:", error);
    return NextResponse.json({ error: "Gagal menyimpan", details: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, jumlah, kategori, metodeBayar, keterangan, tanggal, urls, urlsTransfer } = body;

    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    if (!jumlah || jumlah <= 0) {
      return NextResponse.json({ error: "Jumlah harus lebih dari 0" }, { status: 400 });
    }

    const pengeluaran = await prisma.pengeluaran.update({
      where: { id },
      data: {
        tanggal: (() => {
          if (!tanggal) return undefined;
          const d = new Date(tanggal);
          const now = new Date();
          now.setHours(now.getHours() + 7); // Adjust to WIB if needed, but let's keep it simple
          d.setUTCHours(now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
          return d;
        })(),
        jumlah,
        kategori,
        metodeBayar,
        keterangan,
        arsipNota: {
          create: [
            ...(urls && Array.isArray(urls) ? urls : []).map((url: string) => ({ urlFile: url, tipe: TipeArsip.NOTA })),
            ...(urlsTransfer && Array.isArray(urlsTransfer) ? urlsTransfer : []).map((url: string) => ({ urlFile: url, tipe: TipeArsip.BUKTI_TRANSFER }))
          ]
        }
      },
      include: { arsipNota: true }
    });

    return NextResponse.json(pengeluaran);
  } catch (error: any) {
    console.error("PUT Pengeluaran Error:", error);
    return NextResponse.json({ error: "Gagal menyimpan", details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all");

  try {
    if (all === "true") {
      if (role !== "ADMIN") return NextResponse.json({ error: "Hanya Admin yang bisa menghapus semua data" }, { status: 403 });
      await prisma.pengeluaran.deleteMany({});
      return NextResponse.json({ success: true });
    }

    if (id) {
       await prisma.pengeluaran.delete({ where: { id } });
       return NextResponse.json({ success: true });
    }

    const body = await request.json().catch(() => ({}));
    if (body.ids && Array.isArray(body.ids)) {
      await prisma.pengeluaran.deleteMany({ where: { id: { in: body.ids } } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "ID atau IDs diperlukan" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal menghapus", message: err.message }, { status: 500 });
  }
}
