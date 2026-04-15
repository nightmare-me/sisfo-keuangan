import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay, subDays } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const yesterdayStart = startOfDay(subDays(today, 1));
  const yesterdayEnd = endOfDay(subDays(today, 1));

  // Today's income
  const [pemasukanHariIni, pemasukanKemarin] = await Promise.all([
    prisma.pemasukan.aggregate({
      where: { tanggal: { gte: todayStart, lte: todayEnd } },
      _sum: { hargaFinal: true },
    }),
    prisma.pemasukan.aggregate({
      where: { tanggal: { gte: yesterdayStart, lte: yesterdayEnd } },
      _sum: { hargaFinal: true },
    }),
  ]);

  // Today's expenses
  const [pengeluaranHariIni, adsHariIni] = await Promise.all([
    prisma.pengeluaran.aggregate({
      where: { tanggal: { gte: todayStart, lte: todayEnd } },
      _sum: { jumlah: true },
    }),
    prisma.spentAds.aggregate({
      where: { tanggal: { gte: todayStart, lte: todayEnd } },
      _sum: { jumlah: true },
    }),
  ]);

  // Active students
  const siswAktif = await prisma.siswa.count({ where: { status: "AKTIF" } });

  // Income by CS today
  const pemasukanPerCS = await prisma.pemasukan.groupBy({
    by: ["csId"],
    where: { tanggal: { gte: todayStart, lte: todayEnd } },
    _sum: { hargaFinal: true },
    _count: true,
  });

  const csIds = pemasukanPerCS.map((p) => p.csId).filter(Boolean) as string[];
  const csUsers = await prisma.user.findMany({
    where: { id: { in: csIds } },
    select: { id: true, name: true },
  });

  const pemasukanPerCSWithName = pemasukanPerCS.map((p) => ({
    csId: p.csId,
    csName: csUsers.find((u) => u.id === p.csId)?.name ?? "Tidak Diketahui",
    total: p._sum.hargaFinal ?? 0,
    count: p._count,
  }));

  // Income by Program today
  const pemasukanPerProgram = await prisma.pemasukan.groupBy({
    by: ["programId"],
    where: { tanggal: { gte: todayStart, lte: todayEnd } },
    _sum: { hargaFinal: true },
    _count: true,
  });

  const programIds = pemasukanPerProgram.map((p) => p.programId).filter(Boolean) as string[];
  const programs = await prisma.program.findMany({
    where: { id: { in: programIds } },
    select: { id: true, nama: true },
  });

  const pemasukanPerProgramWithName = pemasukanPerProgram.map((p) => ({
    programId: p.programId,
    programName: programs.find((pr) => pr.id === p.programId)?.nama ?? "Tidak Diketahui",
    total: p._sum.hargaFinal ?? 0,
    count: p._count,
  }));

  // 30-day trend
  const trendData = [];
  for (let i = 29; i >= 0; i--) {
    const date = subDays(today, i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const [income, expense, ads] = await Promise.all([
      prisma.pemasukan.aggregate({
        where: { tanggal: { gte: dayStart, lte: dayEnd } },
        _sum: { hargaFinal: true },
      }),
      prisma.pengeluaran.aggregate({
        where: { tanggal: { gte: dayStart, lte: dayEnd } },
        _sum: { jumlah: true },
      }),
      prisma.spentAds.aggregate({
        where: { tanggal: { gte: dayStart, lte: dayEnd } },
        _sum: { jumlah: true },
      }),
    ]);

    trendData.push({
      date: date.toISOString(),
      pemasukan: income._sum.hargaFinal ?? 0,
      pengeluaran: expense._sum.jumlah ?? 0,
      ads: ads._sum.jumlah ?? 0,
    });
  }

  // Recent transactions
  const transaksiTerkini = await prisma.pemasukan.findMany({
    take: 10,
    orderBy: { tanggal: "desc" },
    include: {
      siswa: { select: { nama: true, noSiswa: true } },
      program: { select: { nama: true } },
      cs: { select: { name: true } },
    },
  });

  const totalPemasukan = pemasukanHariIni._sum.hargaFinal ?? 0;
  const totalPengeluaran = pengeluaranHariIni._sum.jumlah ?? 0;
  const totalAds = adsHariIni._sum.jumlah ?? 0;
  const labaHariIni = totalPemasukan - totalPengeluaran - totalAds;

  return NextResponse.json({
    kpi: {
      pemasukanHariIni: totalPemasukan,
      pemasukanKemarin: pemasukanKemarin._sum.hargaFinal ?? 0,
      pengeluaranHariIni: totalPengeluaran,
      adsHariIni: totalAds,
      labaHariIni,
      siswAktif,
    },
    pemasukanPerCS: pemasukanPerCSWithName,
    pemasukanPerProgram: pemasukanPerProgramWithName,
    trendData,
    transaksiTerkini,
  });
}
