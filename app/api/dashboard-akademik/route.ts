import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("type") || (from ? "custom" : "month");

    // 0. CONFIG
    const dbConfigs = await prisma.financialConfig.findMany();
    const config: Record<string, number> = {};
    dbConfigs.forEach(c => { config[c.key] = c.value; });
    const cutoffDay = config.PAYROLL_CUTOFF_DAY || 25;

    // PAKSA PAKAI WAKTU JAKARTA (WIB)
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
    let startDate: Date, endDate: Date, yesterdayStart: Date, yesterdayEnd: Date;

    if (from && to && type === "custom") {
      startDate = startOfDay(new Date(from));
      endDate = endOfDay(new Date(to));
      const diff = endDate.getTime() - startDate.getTime();
      yesterdayStart = new Date(startDate.getTime() - diff - 1);
      yesterdayEnd = new Date(startDate.getTime() - 1);
    } else if (type === "today") {
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      yesterdayStart = startOfDay(subDays(now, 1));
      yesterdayEnd = endOfDay(subDays(now, 1));
    } else if (type === "week") {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      const diff = endDate.getTime() - startDate.getTime();
      yesterdayStart = new Date(startDate.getTime() - diff - 1);
      yesterdayEnd = new Date(startDate.getTime() - 1);
    } else {
      if (cutoffDay === 1) {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else {
        if (now.getDate() >= cutoffDay) {
          startDate = new Date(now.getFullYear(), now.getMonth(), cutoffDay, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, cutoffDay - 1, 23, 59, 59);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, cutoffDay, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), cutoffDay - 1, 23, 59, 59);
        }
      }
      const diff = endDate.getTime() - startDate.getTime();
      yesterdayStart = new Date(startDate.getTime() - diff - 1);
      yesterdayEnd = new Date(startDate.getTime() - 1);
    }

    // 1. KPI UTAMA (Cepat)
    const [muridBariIni, muridKemarin, kelasAktif, siswaAktif, pengajarAktif] = await Promise.all([
      prisma.siswa.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.siswa.count({ where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } } }),
      prisma.kelas.count({ where: { status: "AKTIF" } }),
      prisma.siswa.count({ where: { status: "AKTIF" } }),
      prisma.user.count({ where: { role: { slug: "pengajar" }, aktif: true } })
    ]);

    // 2. TREND 30 HARI (Efisien: 1 Query, bukan 30)
    const trendStart = subDays(now, 29);
    const trendRaw = await prisma.siswa.findMany({
      where: { createdAt: { gte: startOfDay(trendStart) } },
      select: { createdAt: true }
    });

    const trendMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      trendMap[format(subDays(now, i), "yyyy-MM-dd")] = 0;
    }
    trendRaw.forEach(s => {
      const d = format(new Date(s.createdAt), "yyyy-MM-dd");
      if (trendMap[d] !== undefined) trendMap[d]++;
    });

    const trendData = Object.entries(trendMap).map(([date, count]) => ({
      date, murid: count
    })).sort((a,b) => a.date.localeCompare(b.date));

    // 3. SISWA PER PROGRAM (Efisien)
    const pendaftaranPerProgram = await prisma.pendaftaran.groupBy({
      by: ["kelasId"],
      where: { aktif: true },
      _count: { siswaId: true },
    });

    const kelasIds = pendaftaranPerProgram.map((p: any) => p.kelasId).filter(Boolean);
    const kelasList = await prisma.kelas.findMany({
      where: { id: { in: kelasIds } },
      include: { program: { select: { id: true, nama: true, tipe: true } } },
    });

    const programMap: Record<string, { nama: string; tipe: string; jumlahSiswa: number }> = {};
    pendaftaranPerProgram.forEach(p => {
      const kelas = kelasList.find((k: any) => k.id === p.kelasId);
      if (kelas?.program) {
        const prog = kelas.program;
        if (!programMap[prog.id]) programMap[prog.id] = { nama: prog.nama, tipe: prog.tipe, jumlahSiswa: 0 };
        programMap[prog.id].jumlahSiswa += p._count.siswaId;
      }
    });

    const siswaPerProgram = Object.values(programMap).sort((a,b) => b.jumlahSiswa - a.jumlahSiswa);

    // 4. MURID TERKINI
    const muridTerkini = await prisma.siswa.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        pendaftaran: {
          where: { aktif: true },
          include: { kelas: { include: { program: { select: { nama: true } } } } },
          take: 1,
          orderBy: { tanggalDaftar: "desc" },
        },
      },
    });

    return NextResponse.json({
      kpi: { muridBariIni, muridKemarin, kelasAktif, siswaAktif, pengajarAktif },
      trendData,
      siswaPerProgram,
      muridTerkini,
    });

  } catch (error: any) {
    console.error("AKADEMIK_DASHBOARD_ERROR:", error);
    return NextResponse.json({ error: "Gagal memuat data akademik", details: error.message }, { status: 500 });
  }
}
