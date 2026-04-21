import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["ADMIN", "PENGAJAR", "AKADEMIK"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { kelasId, topik, tanggal, catatan } = await request.json();

  if (!kelasId || !topik || !tanggal) {
    return NextResponse.json({ error: "Kelas, Topik, dan Tanggal wajib diisi" }, { status: 400 });
  }

  const tx = await prisma.$transaction(async (tx: any) => {
    // 1. Buat SesiKelas
    const sesi = await tx.sesiKelas.create({
      data: {
        kelasId,
        topik,
        tanggal: new Date(tanggal),
        catatan,
        status: "SELESAI", // asumsi tutor membuat saat akan memulai/sesudah selesai
      }
    });

    // 2. Ambil pendaftaran murid yang aktif di kelas ini
    const pendaftaranList = await tx.pendaftaran.findMany({
      where: { kelasId, aktif: true }
    });

    // 3. Buat kerangka Absensi default "HADIR" untuk semua murid
    if (pendaftaranList.length > 0) {
      await tx.absensi.createMany({
        data: pendaftaranList.map((p: any) => ({
          sesiKelasId: sesi.id,
          siswaId: p.siswaId,
          status: "HADIR"
        }))
      });
    }

    return sesi;
  });

  return NextResponse.json(tx, { status: 201 });
}
