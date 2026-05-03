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
        if (jktDay > cutoffDay) {
          // Contoh: Hari ini tgl 26 Mei. Cutoff 25.
          // Start: 26 Mei, End: 25 Juni
          const s = new Date(jktYear, jktMonth, cutoffDay + 1);
          const e = new Date(jktYear, jktMonth + 1, cutoffDay, 23, 59, 59);
          startDate = new Date(s.getTime() - (3600000 * 7));
          endDate = new Date(e.getTime() - (3600000 * 7));
        } else {
          // Contoh: Hari ini tgl 2 Mei. Cutoff 25.
          // Start: 26 April, End: 25 Mei
          const s = new Date(jktYear, jktMonth - 1, cutoffDay + 1);
          const e = new Date(jktYear, jktMonth, cutoffDay, 23, 59, 59);
          startDate = new Date(s.getTime() - (3600000 * 7));
          endDate = new Date(e.getTime() - (3600000 * 7));
        }
      }
    }

    const dateFilter = { gte: startDate, lte: endDate };

    // 1. AGREGASI PEMASUKAN UTAMA (SANGAT CEPAT)
    let totalAds = 0;
    
    const [
      pemasukanAgg,
      pengeluaranAgg,
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
      prisma.refund.aggregate({
        where: { 
          status: "APPROVED",
          pemasukan: { tanggal: dateFilter }
        },
        _sum: { jumlah: true }
      })
    ]);

    // Ambil data Ads secara terpisah agar jika tabelnya belum ada tidak merusak seluruh laporan
    try {
      const adsAgg = await prisma.marketingAd.aggregate({
        where: { tanggal: dateFilter },
        _sum: { spent: true }
      });
      totalAds = adsAgg._sum.spent ?? 0;
    } catch (e) {
      console.warn("MarketingAd table might not exist yet:", e);
      totalAds = 0;
    }

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

    const totalPemasukan = (pemasukanAgg._sum.hargaFinal || 0);
    const totalRefund = (refundsAgg._sum.jumlah || 0);
    const totalPemasukanNet = totalPemasukan - totalRefund;
    const totalPengeluaranReal = (pengeluaranAgg._sum.jumlah || 0);

    // --- LOGIKA ACCRUAL UNTUK LAPORAN KEUANGAN ---
    const [allEmpProfiles, completedSessions] = await Promise.all([
      prisma.karyawanProfile.findMany({ where: { user: { aktif: true } } }),
      prisma.sesiKelas.findMany({
        where: { status: "SELESAI", tanggal: dateFilter },
        include: { kelas: true }
      })
    ]);
    
    const totalFixedSalary = allEmpProfiles.reduce((s, p) => s + (p.gajiPokok || 0) + (p.tunjangan || 0), 0);
    const totalTeacherFees = completedSessions.reduce((s, sc) => s + (sc.kelas.feePerSesi || 0), 0);
    
    const gajiPaidAgg = await prisma.pengeluaran.aggregate({
      where: { 
        tanggal: dateFilter,
        OR: [
          { kategori: "GAJI_STAF" },
          { kategori: "GAJI_PENGAJAR" }
        ]
      },
      _sum: { jumlah: true }
    });
    const totalGajiPaid = gajiPaidAgg._sum.jumlah || 0;
    const bebanGajiTerhutang = Math.max(0, (totalFixedSalary + totalTeacherFees) - totalGajiPaid);
    const totalPengeluaranEfektif = totalPengeluaranReal + bebanGajiTerhutang;
    const labaBersih = totalPemasukanNet - totalPengeluaranEfektif - totalAds;

    // 5. SOURCE BREAKDOWN (Aturan Baru yang Bersih & Sinkron 100% dengan CSV)
    const detailedPemasukan = await prisma.pemasukan.findMany({
      where: { tanggal: dateFilter },
      select: {
        hargaFinal: true,
        isRO: true,
        keterangan: true,
        program: { select: { nama: true, isProfitSharing: true } }
      }
    });
    
    const sourceBreakdown: Record<string, { total: number, count: number }> = {
      RO: { total: 0, count: 0 },
      TOEFL: { total: 0, count: 0 },
      LIVE: { total: 0, count: 0 },
      SOSMED: { total: 0, count: 0 },
      AFFILIATE: { total: 0, count: 0 },
      REGULAR: { total: 0, count: 0 }
    };

    detailedPemasukan.forEach(item => {
      const revenue = item.hargaFinal || 0;
      const progName = (item.program?.nama || "").toUpperCase();
      const note = (item.keterangan || "").toUpperCase();

      let targetKey = "REGULAR";

      if (item.isRO) {
        targetKey = "RO";
      } else if (item.program?.isProfitSharing) {
        targetKey = "TOEFL";
      } else if (progName.includes("LIVE") || note.includes("LIVE") || progName.includes("TALENT") || note.includes("TALENT")) {
        targetKey = "LIVE";
      } else if (progName.includes("SOSMED") || note.includes("SOSMED") || note.includes("VIRAL")) {
        targetKey = "SOSMED";
      } else if (progName.includes("AFFILIATE") || note.includes("AFFILIATE")) {
        targetKey = "AFFILIATE";
      }

      sourceBreakdown[targetKey].total += revenue;
      sourceBreakdown[targetKey].count += 1;
    });

    return NextResponse.json({
      periode: { from: startDate, to: endDate },
      ringkasan: {
        totalPemasukan: totalPemasukanNet,
        totalDiskon: pemasukanAgg._sum.diskon || 0,
        totalPengeluaran: totalPengeluaranEfektif,
        totalPengeluaranReal,
        bebanGajiTerhutang,
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
