import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("type") ?? "month";

    // 0. AMBIL CONFIG KEUANGAN DARI DB
    const dbConfigs = await prisma.financialConfig.findMany();
    const config: Record<string, number> = {};
    dbConfigs.forEach(c => {
      config[c.key] = c.value;
    });

    const cutoffDay = config.PAYROLL_CUTOFF_DAY || 25;

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (type === "today") {
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
    } else if (type === "week") {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day + (day === 0 ? -6 : 1)); // Adjust for Monday start
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (type === "custom" && from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // DEFAULT: BULAN INI (DENGAN CUTOFF)
      // Jika cutoffDay = 1, maka ini akan jadi bulan kalender biasa.
      if (cutoffDay === 1) {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else {
        // Misal hari ini 26 April. Cutoff 25.
        // Maka range: 25 April - 24 Mei? 
        // Biasanya kalau user lihat "Bulan Ini" di tanggal 26 April, dia mau lihat periode yang SEDANG BERJALAN.
        // Periode berjalan sekarang adalah 25 April s/d 24 Mei.
        
        // Tapi kalau sekarang tanggal 10 April, periode berjalannya adalah 25 Maret s/d 24 April.
        
        if (now.getDate() >= cutoffDay) {
          startDate = new Date(now.getFullYear(), now.getMonth(), cutoffDay, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, cutoffDay - 1, 23, 59, 59);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, cutoffDay, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), cutoffDay - 1, 23, 59, 59);
        }
      }
    }

    const dateFilter = { gte: startDate, lte: endDate };

    const [
      pemasukanAgg, 
      pengeluaranAgg, 
      adsAgg,
      adsPerfAgg,
      refundAgg,
      rawPemasukanPerProgram, 
      rawPengeluaranPerKategori, 
      rawPemasukanPerCS, 
      rawPemasukanPerMetode
    ] = await Promise.all([
      // 1. Pemasukan Aggregation
      prisma.pemasukan.aggregate({ 
        where: { tanggal: dateFilter }, 
        _sum: { hargaFinal: true, diskon: true }, 
        _count: true 
      }),
      // 2. Pengeluaran Aggregation
      prisma.pengeluaran.aggregate({ 
        where: { tanggal: dateFilter }, 
        _sum: { jumlah: true }, 
        _count: true 
      }),
      // 3. Ads Aggregation (SpentAds + AdPerformance)
      prisma.spentAds.aggregate({ 
        where: { tanggal: dateFilter }, 
        _sum: { jumlah: true }, 
        _count: true 
      }),
      prisma.adPerformance.aggregate({
        where: { date: dateFilter },
        _sum: { spent: true },
        _count: true
      }),
      // 4. Approved Refunds Aggregation
      prisma.refund.aggregate({
        where: { status: "APPROVED", updatedAt: dateFilter },
        _sum: { jumlah: true },
        _count: true
      }),
      // 5. Pemasukan per Program
      prisma.pemasukan.groupBy({
        by: ["programId"],
        where: { tanggal: dateFilter },
        _sum: { hargaFinal: true },
        _count: true,
      }),
      // 6. Pengeluaran per Kategori
      prisma.pengeluaran.groupBy({
        by: ["kategori"],
        where: { tanggal: dateFilter },
        _sum: { jumlah: true },
        _count: true,
      }),
      // 8. Pemasukan per CS
      prisma.pemasukan.groupBy({
        by: ["csId"],
        where: { tanggal: dateFilter },
        _sum: { hargaFinal: true },
        _count: true,
      }),
      // 9. Pemasukan per Metode
      prisma.pemasukan.groupBy({
        by: ["metodeBayar"],
        where: { tanggal: dateFilter },
        _sum: { hargaFinal: true },
        _count: true,
      }),
    ]);

    // 5. LEADERBOARD CS (IKUT FILTER TANGGAL)
    const csStats = await prisma.pemasukan.groupBy({
      by: ["csId"],
      where: {
        tanggal: { gte: startDate, lte: endDate },
        csId: { not: null }
      },
      _sum: { hargaFinal: true },
      _count: { id: true },
    });

    const leaderboardRaw = await Promise.all(csStats.map(async (stat) => {
      const user = await prisma.user.findUnique({ where: { id: stat.csId! } });
      return {
        name: user?.name || "Unknown",
        closing: stat._count.id,
        revenue: stat._sum.hargaFinal || 0
      };
    }));

    const leaderboard = leaderboardRaw.sort((a, b) => b.revenue - a.revenue);

    const totalRefund = refundAgg._sum.jumlah ?? 0;
    // Pemasukan Bersih (setelah dikurangi refund approved)
    const totalPemasukanBruto = pemasukanAgg._sum.hargaFinal ?? 0;
    const totalPemasukanNeto = totalPemasukanBruto - totalRefund;
    
    const totalPengeluaran = pengeluaranAgg._sum.jumlah ?? 0;
    const totalAds = (adsAgg._sum.jumlah ?? 0) + (adsPerfAgg._sum.spent ?? 0);
    const labaKotor = totalPemasukanNeto - totalPengeluaran;
    const labaBersih = labaKotor - totalAds;

    // Fetch related info
    const csIds = rawPemasukanPerCS.map((p: any) => p.csId).filter(Boolean) as string[];
    const programIds = rawPemasukanPerProgram.map((p: any) => p.programId).filter(Boolean) as string[];

    const [csUsers, programs] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: csIds } }, select: { id: true, name: true } }),
      prisma.program.findMany({ where: { id: { in: programIds } }, select: { id: true, nama: true, tipe: true } }),
    ]);

    // 10. Breakdown sumber (RO, TOEFL, Live, Regular, Sosmed)
    const rawBreakdown = await prisma.pemasukan.findMany({
      where: { tanggal: dateFilter },
      select: {
        isRO: true,
        hargaFinal: true,
        programId: true,
        csId: true,
        cs: { select: { teamType: true } },
        program: { select: { nama: true, isProfitSharing: true } },
        refunds: {
          where: { status: "APPROVED" },
          select: { jumlah: true }
        }
      }
    });

    const sourceBreakdown = { RO: 0, TOEFL: 0, LIVE: 0, SOSMED: 0, REGULAR: 0, AFFILIATE: 0 };
    const perProgramMap: Record<string, { total: number, count: number }> = {};
    const perCSMap: Record<string, { total: number, count: number }> = {};
    const perMetodeMap: Record<string, { total: number, count: number }> = {};

    rawBreakdown.forEach((p: any) => {
      const refundAmount = p.refunds.reduce((s: number, r: any) => s + r.jumlah, 0);
      const netAmount = p.hargaFinal - refundAmount;
      
      // Breakdown Sumber (Logic yang lebih presisi)
      const nama = (p.program?.nama || "").toUpperCase();
      const isSharing = p.program?.isProfitSharing || false;
      const teamTypes = p.cs?.teamType || [];
      const hasTeam = (t: string) => teamTypes.includes(t);
      
      if (nama.includes("ELITE") || nama.includes("MASTER") || nama.includes("TOEFL") || nama.includes("IELTS") || isSharing) {
        // Prioritas Utama: Produk High-Tier (TOEFL/IELTS/ELITE/MASTER)
        sourceBreakdown.TOEFL += netAmount;
      } else if (p.isRO || nama.includes("RO") || nama.includes("REPEAT")) {
        sourceBreakdown.RO += netAmount;
      } else if (hasTeam("CS_AFFILIATE") || nama.includes("AFFILIATE")) {
        sourceBreakdown.AFFILIATE += netAmount;
      } else if (hasTeam("CS_SOSMED") || nama.includes("SOSMED") || nama.includes("VIRAL")) {
        sourceBreakdown.SOSMED += netAmount;
      } else if (nama.includes("LIVE")) {
        sourceBreakdown.LIVE += netAmount;
      } else {
        sourceBreakdown.REGULAR += netAmount;
      }

      // Per Program
      if (p.programId) {
        if (!perProgramMap[p.programId]) perProgramMap[p.programId] = { total: 0, count: 0 };
        perProgramMap[p.programId].total += netAmount;
        perProgramMap[p.programId].count += 1;
      }

      // Per CS
      const csId = p.csId || "UNKNOWN";
      if (!perCSMap[csId]) perCSMap[csId] = { total: 0, count: 0 };
      perCSMap[csId].total += netAmount;
      perCSMap[csId].count += 1;
    });

    return NextResponse.json({
      periode: { from: startDate, to: endDate, type },
      ringkasan: {
        totalPemasukan: totalPemasukanNeto,
        totalPemasukanBruto,
        totalRefund,
        totalDiskon: pemasukanAgg._sum.diskon ?? 0,
        totalPengeluaran,
        totalAds,
        labaKotor,
        labaBersih,
        jumlahTransaksiIn: pemasukanAgg._count,
        jumlahTransaksiOut: pengeluaranAgg._count,
        sourceBreakdown
      },
      pemasukanPerProgram: programs.map((prog: any) => ({
        programId: prog.id,
        nama: prog.nama,
        tipe: prog.tipe,
        total: perProgramMap[prog.id]?.total ?? 0,
        count: perProgramMap[prog.id]?.count ?? 0,
      })).filter((p: any) => p.count > 0 || p.total > 0),
      pengeluaranPerKategori: rawPengeluaranPerKategori.map((p: any) => ({
        kategori: p.kategori,
        total: p._sum.jumlah ?? 0,
        count: p._count,
      })),
      pemasukanPerCS: csUsers.map((u: any) => ({
        csId: u.id,
        nama: u.name,
        total: perCSMap[u.id]?.total ?? 0,
        count: perCSMap[u.id]?.count ?? 0,
      })).filter((p: any) => p.count > 0 || p.total > 0),
      pemasukanPerMetode: rawPemasukanPerMetode.map((p: any) => ({
        metode: p.metodeBayar,
        total: p._sum.hargaFinal ?? 0, // Metode bayar remains bruto/historical for now or we could fix it too
        count: p._count,
      })),
    });

  } catch (error: any) {
    console.error("LAPORAN_API_ERROR:", error);
    return NextResponse.json({ error: "Gagal mengambil data laporan", details: error.message }, { status: 500 });
  }
}
