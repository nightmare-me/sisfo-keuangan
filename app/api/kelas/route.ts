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
      _count: { select: { pendaftaran: true } },
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
