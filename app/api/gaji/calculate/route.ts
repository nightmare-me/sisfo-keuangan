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
    const bulan = parseInt(searchParams.get("bulan") ?? "");
    const tahun = parseInt(searchParams.get("tahun") ?? "");

    if (!pengajarId || isNaN(bulan) || isNaN(tahun)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const dayStart = startOfMonth(new Date(tahun, bulan - 1));
    const dayEnd = endOfMonth(new Date(tahun, bulan - 1));

    // Hitung sesi pengajar dari SesiKelas yang statusnya SELESAI
    const sessions = await prisma.sesiKelas.count({
      where: {
        status: "SELESAI",
        tanggal: { gte: dayStart, lte: dayEnd },
        kelas: {
          pengajarId: pengajarId
        }
      }
    });

    // Ambil tarif pengajar (jika ada config tarif dasar atau dari profile)
    // Untuk saat ini kita return count-nya saja, UI akan mengalikan dengan tarif yang diinput admin
    
    return NextResponse.json({ count: sessions });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
