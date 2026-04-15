import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
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
    startDate.setDate(now.getDate() - day + 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (type === "custom" && from && to) {
    startDate = new Date(from);
    endDate = new Date(to);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  const dateFilter = { gte: startDate, lte: endDate };

  const [pemasukan, pengeluaran, ads, pemasukanPerKategori, pengeluaranPerKategori, pemasukanPerCS, pemasukanPerProgram] =
    await Promise.all([
      prisma.pemasukan.aggregate({ where: { tanggal: dateFilter }, _sum: { hargaFinal: true, diskon: true }, _count: true }),
      prisma.pengeluaran.aggregate({ where: { tanggal: dateFilter }, _sum: { jumlah: true }, _count: true }),
      prisma.spentAds.aggregate({ where: { tanggal: dateFilter }, _sum: { jumlah: true }, _count: true }),
      prisma.pemasukan.groupBy({
        by: ["programId"],
        where: { tanggal: dateFilter },
        _sum: { hargaFinal: true },
        _count: true,
      }),
      prisma.pengeluaran.groupBy({
        by: ["kategori"],
        where: { tanggal: dateFilter },
        _sum: { jumlah: true },
        _count: true,
      }),
      prisma.pemasukan.groupBy({
        by: ["csId"],
        where: { tanggal: dateFilter },
        _sum: { hargaFinal: true },
        _count: true,
      }),
      prisma.pemasukan.groupBy({
        by: ["metodeBayar"],
        where: { tanggal: dateFilter },
        _sum: { hargaFinal: true },
        _count: true,
      }),
    ]);

  const totalPemasukan = pemasukan._sum.hargaFinal ?? 0;
  const totalPengeluaran = pengeluaran._sum.jumlah ?? 0;
  const totalAds = ads._sum.jumlah ?? 0;
  const labaKotor = totalPemasukan - totalPengeluaran;
  const labaBersih = labaKotor - totalAds;

  // Fetch names for CS and programs
  const csIds = pemasukanPerCS.map((p) => p.csId).filter(Boolean) as string[];
  const programIds = pemasukanPerKategori.map((p) => p.programId).filter(Boolean) as string[];

  const [csUsers, programs] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: csIds } }, select: { id: true, name: true } }),
    prisma.program.findMany({ where: { id: { in: programIds } }, select: { id: true, nama: true, tipe: true } }),
  ]);

  return NextResponse.json({
    periode: { from: startDate, to: endDate, type },
    ringkasan: {
      totalPemasukan,
      totalDiskon: pemasukan._sum.diskon ?? 0,
      totalPengeluaran,
      totalAds,
      labaKotor,
      labaBersih,
      jumlahTransaksiIn: pemasukan._count,
      jumlahTransaksiOut: pengeluaran._count,
    },
    pemasukanPerProgram: pemasukanPerKategori.map((p) => ({
      programId: p.programId,
      nama: programs.find((pr) => pr.id === p.programId)?.nama ?? "Tidak Diketahui",
      tipe: programs.find((pr) => pr.id === p.programId)?.tipe,
      total: p._sum.hargaFinal ?? 0,
      count: p._count,
    })),
    pengeluaranPerKategori: pengeluaranPerKategori.map((p) => ({
      kategori: p.kategori,
      total: p._sum.jumlah ?? 0,
      count: p._count,
    })),
    pemasukanPerCS: pemasukanPerCS.map((p) => ({
      csId: p.csId,
      nama: csUsers.find((u) => u.id === p.csId)?.name ?? "Tidak Diketahui",
      total: p._sum.hargaFinal ?? 0,
      count: p._count,
    })),
    pemasukanPerMetode: pemasukanPerProgram,
  });
}
