import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const pengajarId = searchParams.get("pengajarId");
    const kelasId = searchParams.get("kelasId");
    const bulan = parseInt(searchParams.get("bulan") ?? "");
    const tahun = parseInt(searchParams.get("tahun") ?? "");

    if (!pengajarId || isNaN(bulan) || isNaN(tahun)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Ambil Config Cutoff dari Database
    const configs = await prisma.financialConfig.findMany({
      where: { key: "PAYROLL_CUTOFF_DAY" }
    });
    const cutoffDay = configs.find(c => c.key === "PAYROLL_CUTOFF_DAY")?.value || 25;

    // Hitung Range Berdasarkan Cutoff (Contoh: 26 April - 25 Mei untuk Gaji Mei)
    // Sesi bulan ini (Mei) dihitung dari tgl 26 bulan lalu (April) s/d tgl 25 bulan ini (Mei)
    const dayStart = new Date(tahun, bulan - 2, cutoffDay + 1, 0, 0, 0);
    const dayEnd = new Date(tahun, bulan - 1, cutoffDay, 23, 59, 59);

    // AUTO-FIX: Jika ada sesi yang statusnya masih DIJADWALKAN tapi sudah ada absensi, set ke SELESAI
    await prisma.sesiKelas.updateMany({
      where: {
        status: "DIJADWALKAN",
        tanggal: { gte: dayStart, lte: dayEnd },
        absensi: { some: {} },
        kelas: {
          pengajarId: pengajarId,
          ...(kelasId && { id: kelasId })
        }
      },
      data: { status: "SELESAI" }
    });

    // Hitung sesi pengajar dari SesiKelas yang statusnya SELESAI
    const sessions = await prisma.sesiKelas.findMany({
      where: {
        status: "SELESAI",
        tanggal: { gte: dayStart, lte: dayEnd },
        kelas: {
          pengajarId: pengajarId,
          ...(kelasId && { id: kelasId })
        }
      },
      include: {
        kelas: {
          select: { feePerSesi: true }
        }
      }
    });

    const totalCount = sessions.length;
    const totalNominal = sessions.reduce((acc, s) => acc + (s.kelas?.feePerSesi || 0), 0);
    const details = sessions.map(s => ({
      topik: s.topik,
      tanggal: s.tanggal,
      namaKelas: (s.kelas as any)?.namaKelas
    }));
    
    return NextResponse.json({ 
      count: totalCount,
      totalNominal: totalNominal,
      details: details
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
