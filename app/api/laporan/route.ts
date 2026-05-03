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

    // 5. SOURCE BREAKDOWN (Aturan Baru yang Bersih & Tegas)
    const detailedPemasukan = await prisma.pemasukan.findMany({
      where: { tanggal: dateFilter },
      select: {
        hargaFinal: true,
        isRO: true,
        program: { select: { nama: true, isProfitSharing: true } }
      }
    });
    
    const sourceBreakdown = {
      RO: 0,
      TOEFL: 0,
      LIVE: 0,
      SOSMED: 0,
      AFFILIATE: 0,
      REGULAR: 0
    };

    let totalGrossCalculated = 0;
    detailedPemasukan.forEach(item => {
      const revenue = item.hargaFinal || 0;
      totalGrossCalculated += revenue;

      const progName = (item.program?.nama || "").toUpperCase();

      // --- EKSEKUSI 6 ATURAN EMAS ---
      if (item.isRO) {
        sourceBreakdown.RO += revenue; // 1. Kolom RO = 1
      } else if (item.program?.isProfitSharing) {
        sourceBreakdown.TOEFL += revenue; // 2. Kolom Sharing = 1 (Produk TOEFL)
      } else if (progName.includes("LIVE")) {
        sourceBreakdown.LIVE += revenue; // 3. Nama ada LIVE
      } else if (progName.includes("SOSMED")) {
        sourceBreakdown.SOSMED += revenue; // 4. Nama ada SOSMED
      } else if (progName.includes("AFFILIATE")) {
        sourceBreakdown.AFFILIATE += revenue; // 5. Nama ada AFFILIATE
      } else {
        sourceBreakdown.REGULAR += revenue; // 6. Sisanya REGULAR
      }
    });

    // Adjust proporsional agar totalnya sesuai dengan totalPemasukanNet (net setelah refund)
    if (totalGrossCalculated > 0 && totalRefund > 0) {
      const factor = totalPemasukanNet / totalGrossCalculated;
      Object.keys(sourceBreakdown).forEach(key => {
        (sourceBreakdown as any)[key] *= factor;
      });
    }

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
