import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const type = searchParams.get("type") || (fromParam ? "custom" : "month");

    // 0. AMBIL CONFIG KEUANGAN DARI DB
    const dbConfigs = await prisma.financialConfig.findMany();
    const config: Record<string, number> = {};
    dbConfigs.forEach(c => {
      config[c.key] = c.value;
    });

    const cutoffDay = config.PAYROLL_CUTOFF_DAY || 25;
    // PAKSA PAKAI WAKTU JAKARTA (WIB - UTC+7) SECARA MANUAL & ROBUST
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const jktNow = new Date(utc + (3600000 * 7));
    
    let startDate: Date, endDate: Date;

    if (fromParam && toParam && type === "custom") {
      startDate = startOfDay(new Date(fromParam));
      endDate = endOfDay(new Date(toParam));
    } else if (type === "today") {
      startDate = new Date(startOfDay(jktNow).getTime() - (3600000 * 7));
      endDate = new Date(endOfDay(jktNow).getTime() - (3600000 * 7));
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

    const dateFilter = { gte: startDate, lte: endDate };

    // 1. AGREGASI PEMASUKAN UTAMA (SANGAT CEPAT)
    const [
      pemasukanAgg,
      pengeluaranAgg,
      adsAgg,
      refundsAgg
    ] = await Promise.all([
      prisma.pemasukan.aggregate({
        where: { tanggal: dateFilter },
        _sum: { hargaFinal: true, diskon: true },
        _count: true
      }),
      prisma.pengeluaran.aggregate({
        where: { tanggal: dateFilter },
        _sum: { jumlah: true },
        _count: true
      }),
      prisma.marketingAd.aggregate({
        where: { tanggal: dateFilter },
        _sum: { spent: true }
      }),
      prisma.refund.aggregate({
        where: { 
          status: "APPROVED",
          pemasukan: { tanggal: dateFilter }
        },
        _sum: { jumlah: true }
      })
    ]);

    // 2. GROUP BY UNTUK TABEL & GRAFIK (Efisien)
    const [
      byProgram,
      byCS,
      byKategori
    ] = await Promise.all([
      prisma.pemasukan.groupBy({
        by: ['programId'],
        where: { tanggal: dateFilter },
        _sum: { hargaFinal: true },
        _count: true
      }),
      prisma.pemasukan.groupBy({
        by: ['csId'],
        where: { tanggal: dateFilter },
        _sum: { hargaFinal: true },
        _count: true
      }),
      prisma.pengeluaran.groupBy({
        by: ['kategori'],
        where: { tanggal: dateFilter },
        _sum: { jumlah: true },
        _count: true
      })
    ]);

    // 3. AMBIL NAMA PROGRAM & CS (Hanya yang muncul di laporan)
    const [activePrograms, activeCS] = await Promise.all([
      prisma.program.findMany({
        where: { id: { in: byProgram.map(p => p.programId).filter(Boolean) as string[] } },
        select: { id: true, nama: true, isProfitSharing: true }
      }),
      prisma.user.findMany({
        where: { id: { in: byCS.map(c => c.csId).filter(Boolean) as string[] } },
        select: { id: true, name: true }
      })
    ]);

    // 4. MAP NAMES
    const progMap: Record<string, any> = {};
    activePrograms.forEach(p => progMap[p.id] = p);
    const csMap: Record<string, string> = {};
    activeCS.forEach(c => csMap[c.id] = c.name);

    // 5. SOURCE BREAKDOWN (Mesti narik data Pemasukan atau pakai groupBy isRO & programId)
    const sourceData = await prisma.pemasukan.groupBy({
      by: ['programId', 'isRO'],
      where: { tanggal: dateFilter },
      _sum: { hargaFinal: true }
    });

    const totalPemasukan = (pemasukanAgg._sum.hargaFinal || 0);
    const totalRefund = (refundsAgg._sum.jumlah || 0);
    const totalPemasukanNet = totalPemasukan - totalRefund;
    const totalPengeluaran = (pengeluaranAgg._sum.jumlah || 0);
    const totalAds = adsAgg._sum.spent ?? 0;
    const labaBersih = totalPemasukanNet - totalPengeluaran - totalAds;

    // Hitung source breakdown
    const sourceBreakdown = {
      REGULAR: 0,
      RO: 0,
      SOSMED: 0,
      AFFILIATE: 0,
      LIVE: 0,
      TOEFL: 0
    };

    // Kita hitung gross dulu, lalu nanti kita adjust proporsional terhadap net (jika ada refund)
    let totalGrossCalculated = 0;
    sourceData.forEach(item => {
      const revenue = item._sum.hargaFinal || 0;
      totalGrossCalculated += revenue;

      if (item.isRO) {
        sourceBreakdown.RO += revenue;
      } else {
        const prog = item.programId ? progMap[item.programId] : null;
        const name = (prog?.nama || "").toUpperCase();

        if (prog?.isProfitSharing) {
          sourceBreakdown.TOEFL += revenue;
        } else if (name.includes("SOSMED")) {
          sourceBreakdown.SOSMED += revenue;
        } else if (name.includes("AFFILIATE")) {
          sourceBreakdown.AFFILIATE += revenue;
        } else if (name.includes("LIVE")) {
          sourceBreakdown.LIVE += revenue;
        } else {
          sourceBreakdown.REGULAR += revenue;
        }
      }
    });

    // Adjust proporsional agar totalnya sesuai dengan totalPemasukanNet (net setelah refund)
    if (totalGrossCalculated > 0 && totalRefund > 0) {
      const factor = totalPemasukanNet / totalGrossCalculated;
      sourceBreakdown.REGULAR *= factor;
      sourceBreakdown.RO *= factor;
      sourceBreakdown.SOSMED *= factor;
      sourceBreakdown.AFFILIATE *= factor;
      sourceBreakdown.LIVE *= factor;
      sourceBreakdown.TOEFL *= factor;
    }

    return NextResponse.json({
      periode: { from: startDate, to: endDate },
      ringkasan: {
        totalPemasukan: totalPemasukanNet,
        totalDiskon: pemasukanAgg._sum.diskon || 0,
        totalPengeluaran,
        totalAds,
        labaBersih,
        jumlahTransaksiIn: pemasukanAgg._count,
        jumlahTransaksiOut: pengeluaranAgg._count,
        sourceBreakdown,
      },
      pemasukanPerProgram: byProgram.map(p => ({
        nama: progMap[p.programId || ""]?.nama || "Tanpa Program",
        total: p._sum.hargaFinal || 0,
        count: p._count
      })).sort((a,b) => b.total - a.total),
      pemasukanPerCS: byCS.map(c => ({
        nama: csMap[c.csId || ""] || "Tanpa CS",
        total: c._sum.hargaFinal || 0,
        count: c._count
      })).sort((a,b) => b.total - a.total),
      pengeluaranPerKategori: byKategori.map(k => ({
        kategori: k.kategori,
        total: k._sum.jumlah || 0,
        count: k._count
      }))
    });

  } catch (error: any) {
    console.error("LAPORAN_API_ERROR:", error);
    return NextResponse.json({ 
      error: "Gagal mengambil data laporan", 
      details: error.message 
    }, { status: 500 });
  }
}
