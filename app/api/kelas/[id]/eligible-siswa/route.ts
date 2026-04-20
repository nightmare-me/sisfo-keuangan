import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const kelas = await prisma.kelas.findUnique({
    where: { id: params.id },
    select: { programId: true }
  });

  if (!kelas) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });

  // Tampilkan siswa yang memenuhi syarat:
  // 1. Status AKTIF
  // 2. Punya Invoice LUNAS untuk program ini
  // 3. BELUM terdaftar AKTIF di kelas LAIN dengan program yang SAMA
  //    → Siswa yang pernah keluar dari kelas INI boleh muncul kembali (re-enroll)
  //    → Siswa aktif di kelas program lain tetap bisa muncul (multi-program)
  const eligibleSiswaList = await prisma.siswa.findMany({
    where: {
      status: "AKTIF",
      // Syarat 2: Sudah bayar program ini
      pemasukan: {
        some: {
          programId: kelas.programId,
          invoice: { statusBayar: "LUNAS" }
        }
      },
      // Syarat 3: Tidak boleh sudah AKTIF di kelas LAIN dengan program SAMA
      // (Kelas ini sendiri dikecualikan → boleh re-enroll jika pernah dikeluarkan)
      NOT: {
        pendaftaran: {
          some: {
            aktif: true,
            kelasId: { not: params.id },
            kelas: { programId: kelas.programId }
          }
        }
      }
    },
    select: {
      id: true,
      noSiswa: true,
      nama: true,
      telepon: true,
    },
    orderBy: { nama: "asc" }
  });

  return NextResponse.json(eligibleSiswaList);
}
