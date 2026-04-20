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
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
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

    const totalRefund = refundAgg._sum.jumlah ?? 0;
    // Pemasukan Bersih (setelah dikurangi refund approved)
    const totalPemasukanBruto = pemasukanAgg._sum.hargaFinal ?? 0;
    const totalPemasukanNeto = totalPemasukanBruto - totalRefund;
    
    const totalPengeluaran = pengeluaranAgg._sum.jumlah ?? 0;
    const totalAds = (adsAgg._sum.jumlah ?? 0) + (adsPerfAgg._sum.spent ?? 0);
    const labaKotor = totalPemasukanNeto - totalPengeluaran;
    const labaBersih = labaKotor - totalAds;

    // Fetch related info
    const csIds = rawPemasukanPerCS.map(p => p.csId).filter(Boolean) as string[];
    const programIds = rawPemasukanPerProgram.map(p => p.programId).filter(Boolean) as string[];

    const [csUsers, programs] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: csIds } }, select: { id: true, name: true } }),
      prisma.program.findMany({ where: { id: { in: programIds } }, select: { id: true, nama: true, tipe: true } }),
    ]);

    // 10. Breakdown sumber (RO, TOEFL, Live, Regular)
    const rawBreakdown = await prisma.pemasukan.findMany({
      where: { tanggal: dateFilter },
      select: {
        isRO: true,
        hargaFinal: true,
        programId: true,
        program: { select: { nama: true, isProfitSharing: true } },
      }
    });

    const sourceBreakdown = {
      RO: 0,
      TOEFL: 0,
      LIVE: 0,
      REGULAR: 0
    };

    rawBreakdown.forEach(p => {
      const nama = p.program?.nama?.toUpperCase() || "";
      const isSharing = p.program?.isProfitSharing || false;
      
      if (p.isRO) {
        sourceBreakdown.RO += p.hargaFinal;
      } else if (isSharing) {
        sourceBreakdown.TOEFL += p.hargaFinal;
      } else if (nama.includes("LIVE")) {
        sourceBreakdown.LIVE += p.hargaFinal;
      } else {
        sourceBreakdown.REGULAR += p.hargaFinal;
      }
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
      pemasukanPerProgram: rawPemasukanPerProgram.map(p => {
        const prog = programs.find(pr => pr.id === p.programId);
        return {
          programId: p.programId,
          nama: prog?.nama ?? "Tidak Diketahui",
          tipe: prog?.tipe,
          total: p._sum.hargaFinal ?? 0,
          count: p._count,
        };
      }),
      pengeluaranPerKategori: rawPengeluaranPerKategori.map(p => ({
        kategori: p.kategori,
        total: p._sum.jumlah ?? 0,
        count: p._count,
      })),
      pemasukanPerCS: rawPemasukanPerCS.map(p => ({
        csId: p.csId,
        nama: csUsers.find(u => u.id === p.csId)?.name ?? "Tidak Diketahui",
        total: p._sum.hargaFinal ?? 0,
        count: p._count,
      })),
      pemasukanPerMetode: rawPemasukanPerMetode.map(p => ({
        metode: p.metodeBayar,
        total: p._sum.hargaFinal ?? 0,
        count: p._count,
      })),
    });

  } catch (error: any) {
    console.error("LAPORAN_API_ERROR:", error);
    return NextResponse.json({ error: "Gagal mengambil data laporan", details: error.message }, { status: 500 });
  }
}
