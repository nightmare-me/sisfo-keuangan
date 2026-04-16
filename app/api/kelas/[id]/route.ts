import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const kelas = await prisma.kelas.findUnique({
    where: { id: params.id },
    include: {
      program: true,
      pengajar: { select: { id: true, name: true } },
      pendaftaran: {
        include: { siswa: { select: { id: true, noSiswa: true, nama: true, telepon: true, status: true } } },
        where: { aktif: true },
        orderBy: { tanggalDaftar: "asc" },
      },
      _count: { select: { pendaftaran: true } },
    },
  });

  if (!kelas) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
  return NextResponse.json(kelas);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { namaKelas, programId, pengajarId, jadwal, hari, jam, kapasitas, durasi, tanggalMulai, tanggalSelesai, status, linkGrup } = body;

  const kelas = await prisma.kelas.update({
    where: { id: params.id },
    data: {
      ...(namaKelas && { namaKelas }),
      ...(programId && { programId }),
      pengajarId: pengajarId !== undefined ? (pengajarId || null) : undefined,
      ...(jadwal !== undefined && { jadwal }),
      ...(hari !== undefined && { hari }),
      ...(jam !== undefined && { jam }),
      ...(kapasitas !== undefined && { kapasitas: parseInt(kapasitas) }),
      ...(durasi !== undefined && { durasi: durasi || null }),
      ...(linkGrup !== undefined && { linkGrup: linkGrup || null }),
      ...(tanggalMulai !== undefined && { tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : null }),
      ...(tanggalSelesai !== undefined && { tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : null }),
      ...(status && { status }),
    },
    include: { program: true, pengajar: { select: { id: true, name: true } }, _count: { select: { pendaftaran: true } } },
  });

  return NextResponse.json(kelas);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Hapus pendaftaran dulu, lalu kelas
  await prisma.pendaftaran.deleteMany({ where: { kelasId: params.id } });
  await prisma.kelas.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
