import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay, subDays } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const yesterdayStart = startOfDay(subDays(today, 1));
    const yesterdayEnd = endOfDay(subDays(today, 1));

    // AMBIL SEMUA REFUND APPROVED UNTUK FILTERING (Termasuk fallback logic student+amount)
    const approvedRefunds = await prisma.refund.findMany({
      where: { status: "APPROVED" },
      select: { pemasukanId: true, siswaId: true, jumlah: true }
    });
    const refundedIds = new Set(approvedRefunds.map(r => r.pemasukanId).filter(Boolean));

    const checkRefund = (p: any) => {
      if (refundedIds.has(p.id)) return true;
      const match = approvedRefunds.find(r => !r.pemasukanId && r.siswaId === p.siswaId && Math.abs(Number(r.jumlah) - p.hargaFinal) < 100);
      return !!match;
    };

    // HITUNG PEMASUKAN HARI INI (Net Sales)
    const [pemasukanHariIniAll, pemasukanKemarinAll] = await Promise.all([
      prisma.pemasukan.findMany({ where: { tanggal: { gte: todayStart, lte: todayEnd } } }),
      prisma.pemasukan.findMany({ where: { tanggal: { gte: yesterdayStart, lte: yesterdayEnd } } })
    ]);
    
    const totalPemasukanHariIni = pemasukanHariIniAll.filter(p => !checkRefund(p)).reduce((s, p) => s + p.hargaFinal, 0);
    const totalPemasukanKemarin = pemasukanKemarinAll.filter(p => !checkRefund(p)).reduce((s, p) => s + p.hargaFinal, 0);

    // Pengeluaran & Ads & Siswa
    const [pengeluaranHariIni, adsHariIni, siswAktif] = await Promise.all([
      prisma.pengeluaran.aggregate({ where: { tanggal: { gte: todayStart, lte: todayEnd } }, _sum: { jumlah: true } }),
      prisma.spentAds.aggregate({ where: { tanggal: { gte: todayStart, lte: todayEnd } }, _sum: { jumlah: true } }),
      prisma.siswa.count({ where: { status: "AKTIF" } })
    ]);

    // Trend 30 Hari
    const trendData = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const ds = startOfDay(date);
      const de = endOfDay(date);
      const [incomeRaw, expAgg, adsAgg] = await Promise.all([
        prisma.pemasukan.findMany({ where: { tanggal: { gte: ds, lte: de } } }),
        prisma.pengeluaran.aggregate({ where: { tanggal: { gte: ds, lte: de } }, _sum: { jumlah: true } }),
        prisma.spentAds.aggregate({ where: { tanggal: { gte: ds, lte: de } }, _sum: { jumlah: true } })
      ]);
      trendData.push({
        date: date.toISOString(),
        pemasukan: incomeRaw.filter(p => !checkRefund(p)).reduce((s, p) => s + p.hargaFinal, 0),
        pengeluaran: expAgg._sum.jumlah ?? 0,
        ads: adsAgg._sum.jumlah ?? 0,
      });
    }

    // Recent Transactions (Filtered)
    const recentRaw = await prisma.pemasukan.findMany({
      take: 20,
      orderBy: { tanggal: "desc" },
      include: { siswa: { select: { nama: true, noSiswa: true } }, program: { select: { nama: true } }, cs: { select: { name: true } } }
    });
    const transaksiTerkini = recentRaw.filter(p => !checkRefund(p)).slice(0, 10);

    const labaHariIni = totalPemasukanHariIni - (pengeluaranHariIni._sum.jumlah ?? 0) - (adsHariIni._sum.jumlah ?? 0);

    return NextResponse.json({
      kpi: { pemasukanHariIni: totalPemasukanHariIni, pemasukanKemarin: totalPemasukanKemarin, pengeluaranHariIni: pengeluaranHariIni._sum.jumlah ?? 0, adsHariIni: adsHariIni._sum.jumlah ?? 0, labaHariIni, siswAktif },
      trendData,
      transaksiTerkini
    });
  } catch (err: any) {
    console.error("DASHBOARD_API_ERROR:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
