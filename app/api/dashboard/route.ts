import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay, subDays } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const type = searchParams.get("type") || (fromParam ? "custom" : "month");

    // 0. AMBIL CONFIG KEUANGAN DARI DB (Untuk Cutoff)
    const dbConfigs = await prisma.financialConfig.findMany();
    const config: Record<string, number> = {};
    dbConfigs.forEach(c => {
      config[c.key] = c.value;
    });
    const cutoffDay = config.PAYROLL_CUTOFF_DAY || 25;

    let startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date;
    const now = new Date();

    if (fromParam && toParam && type === "custom") {
      startDate = startOfDay(new Date(fromParam));
      endDate = endOfDay(new Date(toParam));
    } else if (type === "today") {
      startDate = startOfDay(now);
      endDate = endOfDay(now);
    } else if (type === "week") {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day + (day === 0 ? -6 : 1)); // Mon start
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // DEFAULT: MONTH (DENGAN CUTOFF CERDAS)
      // Jika hari ini tanggal 25, 26, 27, 28, 29, 30, 31 (Baru ganti periode)
      // Kita tetap nampilin periode sebelumnya s/d hari ini agar data tidak kosong melompong.
      
      if (cutoffDay === 1) {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else {
        // Logika: Jika tanggal sekarang < cutoff + 7 hari, tampilkan periode yang baru lewat.
        // Misal cutoff 25. Jika hari ini tgl 26, maka range: 25 Mar - 24 Apr (periode yg baru tutup).
        if (now.getDate() >= cutoffDay && now.getDate() < (cutoffDay + 7)) {
             // Baru ganti periode? Tampilkan periode yang baru saja berakhir (biar ada datanya)
             startDate = new Date(now.getFullYear(), now.getMonth() - 1, cutoffDay, 0, 0, 0);
             endDate = new Date(now.getFullYear(), now.getMonth(), cutoffDay - 1, 23, 59, 59);
        } else if (now.getDate() >= cutoffDay) {
          startDate = new Date(now.getFullYear(), now.getMonth(), cutoffDay, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, cutoffDay - 1, 23, 59, 59);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, cutoffDay, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), cutoffDay - 1, 23, 59, 59);
        }
      }
    }

    // Hitung Periode Sebelumnya untuk perbandingan (YoY/MoM)
    const diff = endDate.getTime() - startDate.getTime();
    prevStartDate = new Date(startDate.getTime() - diff - 1);
    prevEndDate = new Date(startDate.getTime() - 1);

    // AMBIL SEMUA REFUND APPROVED UNTUK FILTERING
    const approvedRefunds = await prisma.refund.findMany({
      where: { status: "APPROVED" },
      select: { pemasukanId: true, siswaId: true, jumlah: true }
    });
    const refundedIds = new Set(approvedRefunds.map((r: any) => r.pemasukanId).filter(Boolean));

    const checkRefund = (p: any) => {
      if (refundedIds.has(p.id)) return true;
      const match = approvedRefunds.find((r: any) => !r.pemasukanId && r.siswaId === p.siswaId && Math.abs(Number(r.jumlah) - p.hargaFinal) < 100);
      return !!match;
    };

    // HITUNG PEMASUKAN PERIODE INI vs PERIODE SEBELUMNYA
    const [pemasukanPeriodeIni, pemasukanPeriodeLalu] = await Promise.all([
      prisma.pemasukan.findMany({ where: { tanggal: { gte: startDate, lte: endDate } } }),
      prisma.pemasukan.findMany({ where: { tanggal: { gte: prevStartDate, lte: prevEndDate } } })
    ]);
    
    const totalPemasukanIni = pemasukanPeriodeIni.filter((p: any) => !checkRefund(p)).reduce((s: number, p: any) => s + p.hargaFinal, 0);
    const totalPemasukanLalu = pemasukanPeriodeLalu.filter((p: any) => !checkRefund(p)).reduce((s: number, p: any) => s + p.hargaFinal, 0);

    const totalTransactionsIni = pemasukanPeriodeIni.filter((p: any) => !checkRefund(p)).length;
    const roTransactionsIni = pemasukanPeriodeIni.filter((p: any) => !checkRefund(p) && p.isRO).length;

    // Pengeluaran & Ads & Siswa
    const [pengeluaranIni, adsIniSpent, adsIniPerf, pengeluaranLalu, adsLaluSpent, adsLaluPerf, siswAktif] = await Promise.all([
      prisma.pengeluaran.aggregate({ where: { tanggal: { gte: startDate, lte: endDate } }, _sum: { jumlah: true } }),
      prisma.spentAds.aggregate({ where: { tanggal: { gte: startDate, lte: endDate } }, _sum: { jumlah: true } }),
      prisma.adPerformance.aggregate({ where: { date: { gte: startDate, lte: endDate } }, _sum: { spent: true } }),
      prisma.pengeluaran.aggregate({ where: { tanggal: { gte: prevStartDate, lte: prevEndDate } }, _sum: { jumlah: true } }),
      prisma.spentAds.aggregate({ where: { tanggal: { gte: prevStartDate, lte: prevEndDate } }, _sum: { jumlah: true } }),
      prisma.adPerformance.aggregate({ where: { date: { gte: prevStartDate, lte: prevEndDate } }, _sum: { spent: true } }),
      prisma.siswa.count({ where: { status: "AKTIF" } })
    ]);

    const totalAdsIni = (adsIniSpent._sum.jumlah ?? 0) + (adsIniPerf._sum.spent ?? 0);
    const totalAdsLalu = (adsLaluSpent._sum.jumlah ?? 0) + (adsLaluPerf._sum.spent ?? 0);
    const totalExIni = pengeluaranIni._sum.jumlah ?? 0;
    const totalExLalu = pengeluaranLalu._sum.jumlah ?? 0;

    // Trend always shows recent 30 days regardless of filter? 
    // Usually better to keep it fixed or adjust to filter. Let's keep it 30 days for now for stability.
    const today = new Date();
    const trendData = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const ds = startOfDay(date);
      const de = endOfDay(date);
      const [incomeRaw, expAgg, adsAggSpent, adsAggPerf] = await Promise.all([
        prisma.pemasukan.findMany({ where: { tanggal: { gte: ds, lte: de } } }),
        prisma.pengeluaran.aggregate({ where: { tanggal: { gte: ds, lte: de } }, _sum: { jumlah: true } }),
        prisma.spentAds.aggregate({ where: { tanggal: { gte: ds, lte: de } }, _sum: { jumlah: true } }),
        prisma.adPerformance.aggregate({ where: { date: { gte: ds, lte: de } }, _sum: { spent: true } }),
      ]);
      trendData.push({
        date: date.toISOString(),
        pemasukan: incomeRaw.filter((p: any) => !checkRefund(p)).reduce((s: number, p: any) => s + p.hargaFinal, 0),
        pengeluaran: expAgg._sum.jumlah ?? 0,
        ads: (adsAggSpent._sum.jumlah ?? 0) + (adsAggPerf._sum.spent ?? 0),
      });
    }

    // Recent Transactions (Filtered)
    const recentRaw = await prisma.pemasukan.findMany({
      take: 20,
      orderBy: { tanggal: "desc" },
      include: { siswa: { select: { nama: true, noSiswa: true } }, program: { select: { nama: true } }, cs: { select: { name: true } } }
    });
    const transaksiTerkini = recentRaw.filter((p: any) => !checkRefund(p)).slice(0, 10);

    const labaIni = totalPemasukanIni - totalExIni - totalAdsIni;

    // Breakdown Pemasukan per Program
    const pemasukanPerProgramRaw = await prisma.pemasukan.groupBy({
      by: ['programId'],
      where: { tanggal: { gte: startDate, lte: endDate } },
      _sum: { hargaFinal: true },
      _count: { _all: true }
    });

    const programs = await prisma.program.findMany({
      where: { id: { in: pemasukanPerProgramRaw.map((p: any) => p.programId).filter((id: any): id is string => id !== null) } },
      select: { id: true, nama: true }
    });

    const pemasukanPerProgram = pemasukanPerProgramRaw.map((p: any) => ({
      programName: programs.find((pr: any) => pr.id === p.programId)?.nama || "Lainnya",
      total: p._sum.hargaFinal ?? 0,
      count: p._count._all
    })).sort((a: any, b: any) => b.total - a.total);

    // Breakdown Pengeluaran per Kategori
    const pengeluaranPerKategoriRaw = await prisma.pengeluaran.groupBy({
      by: ['kategori'],
      where: { tanggal: { gte: startDate, lte: endDate } },
      _sum: { jumlah: true }
    });

    const pengeluaranPerKategori = pengeluaranPerKategoriRaw.map((p: any) => ({
      kategori: p.kategori,
      total: p._sum.jumlah ?? 0
    })).sort((a: any, b: any) => b.total - a.total);

    return NextResponse.json({
      kpi: { 
        pemasukanHariIni: totalPemasukanIni, 
        pemasukanKemarin: totalPemasukanLalu, 
        pengeluaranHariIni: totalExIni, 
        pengeluaranKemarin: totalExLalu,
        adsHariIni: totalAdsIni, 
        adsKemarin: totalAdsLalu, 
        labaHariIni: labaIni, 
        siswAktif,
        retentionRate: totalTransactionsIni > 0 ? (roTransactionsIni / totalTransactionsIni) * 100 : 0
      },
      trendData,
      transaksiTerkini,
      pemasukanPerProgram,
      pengeluaranPerKategori
    });
  } catch (err: any) {
    console.error("DASHBOARD_API_ERROR:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
