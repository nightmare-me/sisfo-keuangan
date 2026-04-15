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
  const withLowStock = data.map((item) => ({
    ...item,
    isLowStock: item.jumlah <= item.stokMinimum,
  }));

  const lowStockCount = withLowStock.filter((i) => i.isLowStock).length;

  return NextResponse.json({ data: withLowStock, lowStockCount });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  await prisma.inventaris.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
