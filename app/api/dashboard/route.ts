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
    // PAKSA PAKAI WAKTU JAKARTA (WIB - UTC+7) SECARA MANUAL & ROBUST
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const jktNow = new Date(utc + (3600000 * 7));
    
    let startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date;

    if (fromParam && toParam && type === "custom") {
      startDate = startOfDay(new Date(fromParam));
      endDate = endOfDay(new Date(toParam));
    } else if (type === "today") {
      startDate = new Date(startOfDay(jktNow).getTime() - (3600000 * 7));
      endDate = new Date(endOfDay(jktNow).getTime() - (3600000 * 7));
    } else if (type === "yesterday") {
      const yesterday = new Date(jktNow);
      yesterday.setDate(jktNow.getDate() - 1);
      startDate = new Date(startOfDay(yesterday).getTime() - (3600000 * 7));
      endDate = new Date(endOfDay(yesterday).getTime() - (3600000 * 7));
    } else if (type === "week") {
      const day = jktNow.getDay();
      const weekStart = new Date(jktNow);
      weekStart.setDate(jktNow.getDate() - day + (day === 0 ? -6 : 1));
      startDate = new Date(startOfDay(weekStart).getTime() - (3600000 * 7));
      endDate = new Date(startDate.getTime() + (7 * 24 * 3600000) - 1);
    } else {
      // DEFAULT: MONTH
      const jktDay = jktNow.getDate();
      const jktMonth = jktNow.getMonth();
      const jktYear = jktNow.getFullYear();

      if (cutoffDay === 1) {
        const s = new Date(jktYear, jktMonth, 1);
        const e = new Date(jktYear, jktMonth + 1, 0, 23, 59, 59);
        startDate = new Date(s.getTime() - (3600000 * 7));
        endDate = new Date(e.getTime() - (3600000 * 7));
      } else {
        if (jktDay >= cutoffDay) {
          const s = new Date(jktYear, jktMonth, cutoffDay);
          const e = new Date(jktYear, jktMonth + 1, cutoffDay - 1, 23, 59, 59);
          startDate = new Date(s.getTime() - (3600000 * 7));
          endDate = new Date(e.getTime() - (3600000 * 7));
        } else {
          const s = new Date(jktYear, jktMonth - 1, cutoffDay);
          const e = new Date(jktYear, jktMonth, cutoffDay - 1, 23, 59, 59);
          startDate = new Date(s.getTime() - (3600000 * 7));
          endDate = new Date(e.getTime() - (3600000 * 7));
        }
      }
    }

    const diff = endDate.getTime() - startDate.getTime();
    prevStartDate = new Date(startDate.getTime() - diff - 1);
    prevEndDate = new Date(startDate.getTime() - 1);

    // 1. EFISIENSI AGREGASI (Sangat Cepat)
    const userRole = (session.user as any)?.role?.toUpperCase();
    const userId = (session.user as any)?.id;
    const SUPER_ROLES = ["ADMIN", "CEO", "COO", "FINANCE"];
    const isSuper = SUPER_ROLES.includes(userRole);

    const adsWhereIni: any = { tanggal: { gte: startDate, lte: endDate } };
    const adsWhereLalu: any = { tanggal: { gte: prevStartDate, lte: prevEndDate } };
    
    // Privacy filter for Ads
    if (!isSuper) {
      adsWhereIni.advId = userId;
      adsWhereLalu.advId = userId;
    }

    const [
      pemasukanAggIni, 
      pemasukanAggLalu,
      pengeluaranAggIni,
      pengeluaranAggLalu,
      adsAggIni,
      adsAggLalu,
      refundAggIni,
      siswaAktifCount
    ] = await Promise.all([
      prisma.pemasukan.aggregate({ where: { tanggal: { gte: startDate, lte: endDate } }, _sum: { hargaFinal: true }, _count: true }),
      prisma.pemasukan.aggregate({ where: { tanggal: { gte: prevStartDate, lte: prevEndDate } }, _sum: { hargaFinal: true } }),
      prisma.pengeluaran.aggregate({ where: { tanggal: { gte: startDate, lte: endDate } }, _sum: { jumlah: true } }),
      prisma.pengeluaran.aggregate({ where: { tanggal: { gte: prevStartDate, lte: prevEndDate } }, _sum: { jumlah: true } }),
      prisma.marketingAd.aggregate({ where: adsWhereIni, _sum: { spent: true } }),
      prisma.marketingAd.aggregate({ where: adsWhereLalu, _sum: { spent: true } }),
      prisma.refund.aggregate({ where: { status: "APPROVED", pemasukan: { tanggal: { gte: startDate, lte: endDate } } }, _sum: { jumlah: true } }),
      prisma.siswa.count({ where: { status: "AKTIF" } })
    ]);

    const totalPemasukanIni = (pemasukanAggIni._sum.hargaFinal || 0) - (refundAggIni._sum.jumlah || 0);
    const totalPemasukanLalu = (pemasukanAggLalu._sum.hargaFinal || 0);
    const totalExIni = pengeluaranAggIni._sum.jumlah || 0;
    const totalAdsIni = adsAggIni._sum.spent ?? 0;
    const labaIni = totalPemasukanIni - totalExIni - totalAdsIni;

    // 2. TREND DATA (Efisien: 4 Query untuk 30 hari, bukan 120)
    const trendStart = subDays(now, 29);
    const [trendIncomes, trendExes, trendAdsSpent] = await Promise.all([
      prisma.pemasukan.findMany({ 
        where: { tanggal: { gte: startOfDay(trendStart) } }, 
        select: { tanggal: true, hargaFinal: true, id: true } 
      }),
      prisma.pengeluaran.groupBy({ 
        by: ['tanggal'], 
        where: { tanggal: { gte: startOfDay(trendStart) } }, 
        _sum: { jumlah: true } 
      }),
      prisma.marketingAd.groupBy({ 
        by: ['tanggal'], 
        where: { 
          tanggal: { gte: startOfDay(trendStart) },
          ...(!isSuper ? { advId: userId } : {})
        }, 
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
      if (trendMap[d]) trendMap[d].ads += a._sum.spent || 0;
    });

    const trendData = Object.entries(trendMap).map(([date, vals]) => ({
      date, ...vals
    })).sort((a,b) => a.date.localeCompare(b.date));

    // 3. TRANSAKSI TERKINI (Take 10, bukan fetch semua)
    const transaksiTerkini = await prisma.pemasukan.findMany({
      take: 10,
      orderBy: { tanggal: "desc" },
      select: {
        id: true,
        tanggal: true,
        hargaFinal: true,
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

    // 5. PENYESUAIAN RESPON BERDASARKAN ROLE (PRIVASI)
    const responseData: any = {
      kpi: { 
        pemasukanHariIni: isSuper ? totalPemasukanIni : 0, 
        pemasukanKemarin: isSuper ? totalPemasukanLalu : 0, 
        pengeluaranHariIni: isSuper ? totalExIni : 0, 
        pengeluaranKemarin: isSuper ? (pengeluaranAggLalu._sum.jumlah || 0) : 0,
        adsHariIni: totalAdsIni, 
        adsKemarin: adsAggLalu._sum.spent ?? 0, 
        labaHariIni: isSuper ? labaIni : 0, 
        siswAktif: isSuper ? siswaAktifCount : 0,
        avgCpl: totalAdsIni > 0 ? totalAdsIni / (adsAggIni._sum.leads || 1) : 0
      },
      trendData: trendData.map(t => ({
        date: t.date,
        ads: t.ads,
        pemasukan: isSuper ? t.pemasukan : 0,
        pengeluaran: isSuper ? t.pengeluaran : 0
      })),
      transaksiTerkini: isSuper ? transaksiTerkini : [],
      pemasukanPerProgram: isSuper ? pemasukanPerProgram : [],
      pengeluaranPerKategori: isSuper ? pengeluaranPerKategoriRaw.map(p => ({ kategori: p.kategori, total: p._sum.jumlah || 0 })) : [],
      debug: {
        type,
        role: userRole,
        isSuper
      }
    };

    return NextResponse.json(responseData);

  } catch (err: any) {
    console.error("DASHBOARD_API_ERROR:", err);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}
