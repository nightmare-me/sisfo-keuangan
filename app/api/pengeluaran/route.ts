import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const kategori = searchParams.get("kategori");
    const metodeBayar = searchParams.get("metodeBayar");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "200"); // Ditambah limitnya agar data tidak terpotong

    const where: any = {};
    if (from && to) where.tanggal = { gte: new Date(from), lte: new Date(to) };
    else if (from) where.tanggal = { gte: new Date(from) };
    else if (to) where.tanggal = { lte: new Date(to) };

    if (kategori) where.kategori = kategori;
    if (metodeBayar) where.metodeBayar = metodeBayar;

    const [data, total, summary] = await Promise.all([
      prisma.pengeluaran.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { tanggal: "desc" },
        include: { 
          user: { select: { name: true } },
          arsipNota: { select: { id: true, urlFile: true } }
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
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { jumlah, kategori, metodeBayar, keterangan, tanggal, urls } = body;

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
        arsipNota: urls && Array.isArray(urls) && urls.length > 0 ? {
          create: urls.map((url: string) => ({ urlFile: url }))
        } : undefined
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
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, jumlah, kategori, metodeBayar, keterangan, tanggal, urls } = body;

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
          d.setUTCHours(now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
          return d;
        })(),
        jumlah,
        kategori,
        metodeBayar,
        keterangan,
        arsipNota: urls && Array.isArray(urls) && urls.length > 0 ? {
          create: urls.map((url: string) => ({ urlFile: url }))
        } : undefined
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
  const session = await auth();
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
