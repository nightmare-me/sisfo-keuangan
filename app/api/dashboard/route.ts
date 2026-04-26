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
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const type = searchParams.get("type") || (fromParam ? "custom" : "month");

    // 0. CONFIG
    const dbConfigs = await prisma.financialConfig.findMany();
    const config: Record<string, number> = {};
    dbConfigs.forEach(c => { config[c.key] = c.value; });
    const cutoffDay = config.PAYROLL_CUTOFF_DAY || 25;

    // PAKSA PAKAI WAKTU JAKARTA (WIB)
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
    let startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date;

    if (fromParam && toParam && type === "custom") {
      startDate = startOfDay(new Date(fromParam));
      endDate = endOfDay(new Date(toParam));
    } else if (type === "today") {
      startDate = startOfDay(now);
      endDate = endOfDay(now);
    } else if (type === "week") {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
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
    }

    const diff = endDate.getTime() - startDate.getTime();
    prevStartDate = new Date(startDate.getTime() - diff - 1);
    prevEndDate = new Date(startDate.getTime() - 1);

    // 1. EFISIENSI AGREGASI (Sangat Cepat)
    const [
      pemasukanAggIni, 
      pemasukanAggLalu,
      pengeluaranAggIni,
      pengeluaranAggLalu,
      adsAggIni,
      adsAggLalu,
      perfAggIni,
      perfAggLalu,
      refundAggIni,
      siswaAktifCount
    ] = await Promise.all([
      prisma.pemasukan.aggregate({ where: { tanggal: { gte: startDate, lte: endDate } }, _sum: { hargaFinal: true }, _count: true }),
      prisma.pemasukan.aggregate({ where: { tanggal: { gte: prevStartDate, lte: prevEndDate } }, _sum: { hargaFinal: true } }),
      prisma.pengeluaran.aggregate({ where: { tanggal: { gte: startDate, lte: endDate } }, _sum: { jumlah: true } }),
      prisma.pengeluaran.aggregate({ where: { tanggal: { gte: prevStartDate, lte: prevEndDate } }, _sum: { jumlah: true } }),
      prisma.spentAds.aggregate({ where: { tanggal: { gte: startDate, lte: endDate } }, _sum: { jumlah: true } }),
      prisma.spentAds.aggregate({ where: { tanggal: { gte: prevStartDate, lte: prevEndDate } }, _sum: { jumlah: true } }),
      prisma.adPerformance.aggregate({ where: { date: { gte: startDate, lte: endDate } }, _sum: { spent: true } }),
      prisma.adPerformance.aggregate({ where: { date: { gte: prevStartDate, lte: prevEndDate } }, _sum: { spent: true } }),
      prisma.refund.aggregate({ where: { status: "APPROVED", pemasukan: { tanggal: { gte: startDate, lte: endDate } } }, _sum: { jumlah: true } }),
      prisma.siswa.count({ where: { status: "AKTIF" } })
    ]);

    const totalPemasukanIni = (pemasukanAggIni._sum.hargaFinal || 0) - (refundAggIni._sum.jumlah || 0);
    const totalPemasukanLalu = (pemasukanAggLalu._sum.hargaFinal || 0);
    const totalExIni = pengeluaranAggIni._sum.jumlah || 0;
    const totalAdsIni = (adsAggIni._sum.jumlah || 0) + (perfAggIni._sum.spent || 0);
    const labaIni = totalPemasukanIni - totalExIni - totalAdsIni;

    // 2. TREND DATA (Efisien: 4 Query untuk 30 hari, bukan 120)
    const trendStart = subDays(now, 29);
    const [trendIncomes, trendExes, trendAdsSpent, trendAdsPerf] = await Promise.all([
      prisma.pemasukan.findMany({ 
        where: { tanggal: { gte: startOfDay(trendStart) } }, 
        select: { tanggal: true, hargaFinal: true, id: true } 
      }),
      prisma.pengeluaran.groupBy({ 
        by: ['tanggal'], 
        where: { tanggal: { gte: startOfDay(trendStart) } }, 
        _sum: { jumlah: true } 
      }),
      prisma.spentAds.groupBy({ 
        by: ['tanggal'], 
        where: { tanggal: { gte: startOfDay(trendStart) } }, 
        _sum: { jumlah: true } 
      }),
      prisma.adPerformance.groupBy({ 
        by: ['date'], 
        where: { date: { gte: startOfDay(trendStart) } }, 
        _sum: { spent: true } 
      })
    ]);

    // Map Trend Data in Memory
    const trendMap: Record<string, any> = {};
    for (let i = 0; i < 30; i++) {
      const d = format(subDays(now, i), "yyyy-MM-dd");
      trendMap[d] = { pemasukan: 0, pengeluaran: 0, ads: 0 };
    }

    trendIncomes.forEach(p => {
      const d = format(new Date(p.tanggal), "yyyy-MM-dd");
      if (trendMap[d]) trendMap[d].pemasukan += p.hargaFinal;
    });
    trendExes.forEach(e => {
      const d = format(new Date(e.tanggal), "yyyy-MM-dd");
      if (trendMap[d]) trendMap[d].pengeluaran += e._sum.jumlah || 0;
    });
    trendAdsSpent.forEach(a => {
      const d = format(new Date(a.tanggal), "yyyy-MM-dd");
      if (trendMap[d]) trendMap[d].ads += a._sum.jumlah || 0;
    });
    trendAdsPerf.forEach(a => {
      const d = format(new Date(a.date), "yyyy-MM-dd");
      if (trendMap[d]) trendMap[d].ads += a._sum.spent || 0;
    });

    const trendData = Object.entries(trendMap).map(([date, vals]) => ({
      date, ...vals
    })).sort((a,b) => a.date.localeCompare(b.date));

    // 3. TRANSAKSI TERKINI (Take 10, bukan fetch semua)
    const transaksiTerkini = await prisma.pemasukan.findMany({
      take: 10,
      orderBy: { tanggal: "desc" },
      include: { 
        siswa: { select: { nama: true } }, 
        program: { select: { nama: true } } 
      }
    });

    // 4. BREAKDOWN (Efisien)
    const [pemasukanPerProgramRaw, pengeluaranPerKategoriRaw] = await Promise.all([
      prisma.pemasukan.groupBy({
        by: ['programId'],
        where: { tanggal: { gte: startDate, lte: endDate } },
        _sum: { hargaFinal: true },
        _count: true
      }),
      prisma.pengeluaran.groupBy({
        by: ['kategori'],
        where: { tanggal: { gte: startDate, lte: endDate } },
        _sum: { jumlah: true }
      })
    ]);

    const progIds = pemasukanPerProgramRaw.map(p => p.programId).filter(Boolean) as string[];
    const programs = await prisma.program.findMany({
      where: { id: { in: progIds } },
      select: { id: true, nama: true }
    });

    const pemasukanPerProgram = pemasukanPerProgramRaw.map(p => ({
      programName: programs.find(pr => pr.id === p.programId)?.nama || "Lainnya",
      total: p._sum.hargaFinal || 0,
      count: p._count
    })).sort((a,b) => b.total - a.total);

    return NextResponse.json({
      kpi: { 
        pemasukanHariIni: totalPemasukanIni, 
        pemasukanKemarin: totalPemasukanLalu, 
        pengeluaranHariIni: totalExIni, 
        pengeluaranKemarin: (pengeluaranAggLalu._sum.jumlah || 0),
        adsHariIni: totalAdsIni, 
        adsKemarin: (adsAggLalu._sum.jumlah || 0) + (perfAggLalu._sum.spent || 0), 
        labaHariIni: labaIni, 
        siswAktif: siswaAktifCount,
        retentionRate: 0 // Will be calculated differently later if needed
      },
      trendData,
      transaksiTerkini,
      pemasukanPerProgram,
      pengeluaranPerKategori: pengeluaranPerKategoriRaw.map(p => ({ kategori: p.kategori, total: p._sum.jumlah || 0 })),
      debug: {
        now: now.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        type
      }
    });

  } catch (err: any) {
    console.error("DASHBOARD_API_ERROR:", err);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}
