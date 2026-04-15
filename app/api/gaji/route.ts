import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const bulan = parseInt(searchParams.get("bulan") ?? String(new Date().getMonth() + 1));
  const tahun = parseInt(searchParams.get("tahun") ?? String(new Date().getFullYear()));
  const data = await prisma.gajiPengajar.findMany({
    where: { bulan, tahun },
    include: {
      pengajar: { select: { name: true, email: true } },
      kelas: { include: { program: { select: { tipe: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { pengajarId, kelasId, bulan, tahun, jumlahSesi, tarifPerSesi, totalGaji, metodeBayar, keterangan } = body;
  const gaji = await prisma.gajiPengajar.create({
    data: { pengajarId, kelasId: kelasId || null, bulan, tahun, jumlahSesi, tarifPerSesi, totalGaji, metodeBayar: metodeBayar ?? "TRANSFER", keterangan },
  });
  return NextResponse.json(gaji, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { id, ...data } = body;
  const gaji = await prisma.gajiPengajar.update({
    where: { id },
    data: { ...data, tanggalBayar: data.tanggalBayar ? new Date(data.tanggalBayar) : undefined },
  });
  return NextResponse.json(gaji);
}
