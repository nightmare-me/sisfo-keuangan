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
      startDate.setDate(now.getDate() - day + (day === 0 ? -6 : 1)); // Monday start
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (type === "custom" && from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // DEFAULT: MONTH (DENGAN CUTOFF SAKLEK)
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

    const dateFilter = { gte: startDate, lte: endDate };

    // 4. AMBIL SEMUA DATA UNTUK AGGREGATION CERDAS (RADAR REFUND)
    const [
      allPemasukan,
      approvedRefunds,
      pengeluaranSum,
      adsSpentSum,
      adsPerfSum,
    ] = await Promise.all([
      prisma.pemasukan.findMany({
        where: { tanggal: dateFilter },
        include: { program: true, cs: true }
      }),
      prisma.refund.findMany({
        where: { status: "APPROVED" },
        select: { pemasukanId: true, siswaId: true, jumlah: true }
      }),
      prisma.pengeluaran.aggregate({ where: { tanggal: dateFilter }, _sum: { jumlah: true }, _count: true }),
      prisma.spentAds.aggregate({ where: { tanggal: dateFilter }, _sum: { jumlah: true } }),
      prisma.adPerformance.aggregate({ where: { date: dateFilter }, _sum: { spent: true } }),
    ]);

    // 5. RADAR REFUND LOGIC (SAMA DENGAN DASHBOARD)
    const refundedIds = new Set(approvedRefunds.map((r: any) => r.pemasukanId).filter(Boolean));
    const checkRefund = (p: any) => {
      if (refundedIds.has(p.id)) return true;
      const match = approvedRefunds.find((r: any) => 
        !r.pemasukanId && 
        r.siswaId === p.siswaId && 
        Math.abs(Number(r.jumlah) - p.hargaFinal) < 100
      );
      return !!match;
    };

    const activePemasukan = allPemasukan.filter(p => !checkRefund(p));

    // 6. HITUNG BREAKDOWN CERDAS & TABEL
    let revenueRO = 0;
    let revenueTOEFL = 0;
    let revenueLive = 0;
    let revenueSocial = 0;
    let revenueAffiliate = 0;
    let revenueRegular = 0;

    const programBreakdown: Record<string, { name: string, total: number, count: number }> = {};
    const csBreakdown: Record<string, { name: string, total: number, count: number }> = {};
    const methodBreakdown: Record<string, { total: number, count: number }> = {};

    activePemasukan.forEach(p => {
      const progName = (p.program?.nama || "").toUpperCase();
      const isSharing = p.program?.isProfitSharing || false;
      
      // LOGIKA GRUP PRODUK (Berdasarkan Profit Sharing)
      if (isSharing) {
        // Semua yang bagi hasil masuk ke kategori TOEFL (Produk Premium)
        revenueTOEFL += p.hargaFinal;
      } else if (progName.includes("LIVE")) {
        revenueLive += p.hargaFinal;
      } else if (p.isRO) {
        revenueRO += p.hargaFinal;
      } else {
        revenueRegular += p.hargaFinal;
      }

      // Grouping by ID for Tables
      const progId = p.programId || "unknown";
      if (!programBreakdown[progId]) programBreakdown[progId] = { name: p.program?.nama || "Tanpa Program", total: 0, count: 0 };
      programBreakdown[progId].total += p.hargaFinal;
      programBreakdown[progId].count += 1;

      const csId = p.csId || "unknown";
      if (!csBreakdown[csId]) csBreakdown[csId] = { name: p.cs?.name || "Tanpa CS", total: 0, count: 0 };
      csBreakdown[csId].total += p.hargaFinal;
      csBreakdown[csId].count += 1;

      if (!methodBreakdown[p.metodeBayar]) methodBreakdown[p.metodeBayar] = { total: 0, count: 0 };
      methodBreakdown[p.metodeBayar].total += p.hargaFinal;
      methodBreakdown[p.metodeBayar].count += 1;
    });

    const totalPemasukan = activePemasukan.reduce((sum, p) => sum + p.hargaFinal, 0);
    const totalPengeluaran = (pengeluaranSum._sum.jumlah || 0);
    const totalAds = (adsSpentSum._sum.jumlah || 0) + (adsPerfSum._sum.spent || 0);
    const labaBersih = totalPemasukan - totalPengeluaran - totalAds;

    // 7. FORMAT LEADERBOARD CS
    const leaderboard = Object.values(csBreakdown)
      .map(b => ({ name: b.name, revenue: b.total }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      summary: {
        totalPemasukan,
        totalDiskon: activePemasukan.reduce((sum, p) => sum + (p.diskon || 0), 0),
        totalPengeluaran,
        totalAds,
        labaBersih,
        jumlahTransaksiIn: activePemasukan.length,
        jumlahTransaksiOut: pengeluaranSum._count,
      },
      breakdown: {
        regular: revenueRegular,
        ro: revenueRO,
        social: revenueSocial,
        affiliate: revenueAffiliate,
        live: revenueLive,
        toefl: revenueTOEFL,
      },
      leaderboard,
      pemasukanPerProgram: Object.values(programBreakdown)
        .sort((a, b) => b.total - a.total)
        .map(p => ({ nama: p.name, total: p.total, count: p.count })),
      pemasukanPerCS: Object.values(csBreakdown)
        .sort((a, b) => b.total - a.total)
        .map(c => ({ nama: c.name, total: c.total, count: c.count })),
      pemasukanPerMetode: Object.entries(methodBreakdown).map(([name, data]) => ({
        metode: name,
        total: data.total,
        count: data.count
      }))
    });

  } catch (error: any) {
    console.error("LAPORAN_API_ERROR:", error);
    return NextResponse.json({ error: "Gagal mengambil data laporan", details: error.message }, { status: 500 });
  }
}
