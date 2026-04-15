import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/pendaftaran?kelasId=xxx  → daftar siswa dalam satu kelas
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const kelasId = searchParams.get("kelasId");

  if (!kelasId) return NextResponse.json({ error: "kelasId diperlukan" }, { status: 400 });

  const data = await prisma.pendaftaran.findMany({
    where: { kelasId },
    include: {
      siswa: {
        select: { id: true, noSiswa: true, nama: true, telepon: true, status: true },
      },
    },
    orderBy: { tanggalDaftar: "asc" },
  });

  return NextResponse.json(data);
}

// POST /api/pendaftaran  → daftarkan siswa ke kelas
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { siswaId, kelasId, tanggalMulai, tanggalSelesai } = body;

  if (!siswaId || !kelasId) {
    return NextResponse.json({ error: "siswaId dan kelasId diperlukan" }, { status: 400 });
  }

  // Cek kapasitas kelas
  const kelas = await prisma.kelas.findUnique({
    where: { id: kelasId },
    include: { _count: { select: { pendaftaran: true } } },
  });
  if (!kelas) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });

  if (kelas._count.pendaftaran >= kelas.kapasitas) {
    return NextResponse.json({ error: `Kelas sudah penuh (kapasitas: ${kelas.kapasitas})` }, { status: 400 });
  }

  // Cek duplikat
  const existing = await prisma.pendaftaran.findUnique({ where: { siswaId_kelasId: { siswaId, kelasId } } });
  if (existing) {
    if (existing.aktif) return NextResponse.json({ error: "Siswa sudah terdaftar di kelas ini" }, { status: 400 });
    // Re-aktifkan jika pernah nonaktif
    const updated = await prisma.pendaftaran.update({ where: { id: existing.id }, data: { aktif: true, tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : null, tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : null } });
    return NextResponse.json(updated, { status: 200 });
  }

  const pendaftaran = await prisma.pendaftaran.create({
    data: {
      siswaId,
      kelasId,
      tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : null,
      tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : null,
    },
    include: { siswa: { select: { nama: true, noSiswa: true } } },
  });

  return NextResponse.json(pendaftaran, { status: 201 });
}

// DELETE /api/pendaftaran?id=xxx  → keluarkan siswa dari kelas
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  await prisma.pendaftaran.update({ where: { id }, data: { aktif: false } });
  return NextResponse.json({ success: true });
}
