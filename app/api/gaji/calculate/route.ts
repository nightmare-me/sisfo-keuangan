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

    const dayStart = startOfMonth(new Date(tahun, bulan - 1));
    const dayEnd = endOfMonth(new Date(tahun, bulan - 1));

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
