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

  // Cari murid yang memiliki Pemasukan/Invoice lunas untuk program ini, 
  // DAN status aktif, DAN belum ada di Pendaftaran kelas manapun (atau minimal tidak terdaftar di program yang sama)
  // Untuk kesederhanaan fitur Akademik ini: Tampilkan siswa yang punya "LUNAS" di program ini. 
  // Pengguna Akademik yang akan menyaring visual jika anak ini sudah masuk kelas.

  const eligibleSiswaList = await prisma.siswa.findMany({
    where: {
      status: "AKTIF",
      pemasukan: {
        some: {
          programId: kelas.programId,
          invoice: {
            statusBayar: "LUNAS"
          }
        }
      }
    },
    select: {
      id: true,
      noSiswa: true,
      nama: true,
      pendaftaran: {
        where: { aktif: true },
        select: { kelasId: true, kelas: { select: { programId: true, namaKelas: true } } }
      }
    }
  });

  return NextResponse.json(eligibleSiswaList);
}
