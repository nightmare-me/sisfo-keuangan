import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const kondisi = searchParams.get("kondisi");
  const lowStock = searchParams.get("lowStock") === "true";

  const where: any = {};
  if (search) where.nama = { contains: search, mode: "insensitive" };
  if (kondisi) where.kondisi = kondisi;
  if (lowStock) where.jumlah = { lte: prisma.inventaris.fields.stokMinimum };

  const data = await prisma.inventaris.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Flag low stock items
  const withLowStock = data.map((item: any) => ({
    ...item,
    isLowStock: item.jumlah <= item.stokMinimum,
  }));

  const lowStockCount = withLowStock.filter((i: any) => i.isLowStock).length;

  return NextResponse.json({ data: withLowStock, lowStockCount });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Bulk create for CSV
  if (Array.isArray(body)) {
    const data = body.map((item: any) => ({
      nama: item.nama,
      kategori: item.kategori ?? "Umum",
      jumlah: parseInt(item.jumlah) || 0,
      satuan: item.satuan ?? "pcs",
      hargaBeli: parseFloat(item.hargaBeli) || null,
      kondisi: ["BAIK", "RUSAK_RINGAN", "RUSAK_BERAT"].includes(item.kondisi) ? item.kondisi : "BAIK",
      tanggalBeli: item.tanggalBeli ? new Date(item.tanggalBeli) : null,
      keterangan: item.keterangan || null,
      stokMinimum: parseInt(item.stokMinimum) || 1,
    }));
    const result = await prisma.inventaris.createMany({ data });
    return NextResponse.json({ success: result.count }, { status: 201 });
  }

  const { nama, kategori, jumlah, satuan, hargaBeli, kondisi, tanggalBeli, keterangan, stokMinimum } = body;
  if (!nama) return NextResponse.json({ error: "Nama barang diperlukan" }, { status: 400 });

  const item = await prisma.inventaris.create({
    data: {
      nama,
      kategori: kategori ?? "Umum",
      jumlah: jumlah ?? 0,
      satuan: satuan ?? "pcs",
      hargaBeli: hargaBeli ?? null,
      kondisi: kondisi ?? "BAIK",
      tanggalBeli: tanggalBeli ? new Date(tanggalBeli) : null,
      keterangan,
      stokMinimum: stokMinimum ?? 1,
    },
  });

  // OTOMATIS CATAT KE PENGELUARAN JIKA ADA HARGA BELI
  if (hargaBeli && hargaBeli > 0) {
    await prisma.pengeluaran.create({
      data: {
        tanggal: tanggalBeli ? new Date(tanggalBeli) : new Date(),
        jumlah: hargaBeli * (jumlah || 1),
        kategori: "PERALATAN",
        metodeBayar: "TRANSFER", // Default to transfer for assets
        keterangan: `Pembelian Inventaris: ${nama} (${jumlah || 1} ${satuan || 'pcs'})`,
        dibuatOleh: (session.user as any).id
      }
    });
  }

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  const item = await prisma.inventaris.update({
    where: { id },
    data: {
      ...data,
      tanggalBeli: data.tanggalBeli ? new Date(data.tanggalBeli) : undefined,
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role?.toUpperCase();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all");

  try {
    if (all === "true") {
      if (role !== "ADMIN") return NextResponse.json({ error: "Hanya Admin yang bisa menghapus semua data" }, { status: 403 });
      await prisma.inventaris.deleteMany({});
      return NextResponse.json({ success: true });
    }

    if (id) {
       await prisma.inventaris.delete({ where: { id } });
       return NextResponse.json({ success: true });
    }

    const body = await request.json().catch(() => ({}));
    if (body.ids && Array.isArray(body.ids)) {
      await prisma.inventaris.deleteMany({ where: { id: { in: body.ids } } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "ID atau IDs diperlukan" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal menghapus", message: err.message }, { status: 500 });
  }
}
