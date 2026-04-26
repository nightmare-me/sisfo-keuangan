import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay, subDays } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session?.user as any)?.id;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let startDate: Date, endDate: Date;
  if (from && to) {
    startDate = startOfDay(new Date(from));
    endDate = endOfDay(new Date(to));
  } else {
    startDate = startOfDay(subDays(new Date(), 30));
    endDate = endOfDay(new Date());
  }

  // 1. Pemasukan Saya Hari Ini (Dalam Range Filter)
  const myRevenueToday = await prisma.pemasukan.aggregate({
    where: {
      csId: userId,
      tanggal: { gte: startDate, lte: endDate }
    },
    _sum: { hargaFinal: true }
  });

  // 2. Statistik Leads Saya (Dalam Range Filter)
  const myLeadsCount = await prisma.lead.count({
    where: {
      csId: userId,
      createdAt: { gte: startDate, lte: endDate }
    }
  });

  const myClosingCount = await prisma.lead.count({
    where: {
      csId: userId,
      status: "PAID",
      tanggalClosing: { gte: startDate, lte: endDate }
    }
  });

  // 3. Leaderboard CS (Dalam Range Filter)
  const leaderboardRaw = await prisma.pemasukan.groupBy({
    by: ['csId'],
    where: {
      tanggal: { gte: startDate, lte: endDate },
      csId: { not: null }
    },
    _sum: { hargaFinal: true },
    _count: { id: true },
    orderBy: {
      _sum: { hargaFinal: 'desc' }
    },
    take: 5
  });

  // Ambil nama CS untuk leaderboard
  const csIds = leaderboardRaw.map(item => item.csId as string);
  const csUsers = await prisma.user.findMany({
    where: { id: { in: csIds } },
    select: { id: true, name: true }
  });

  const leaderboard = leaderboardRaw.map(item => {
    const user = csUsers.find(u => u.id === item.csId);
    return {
      name: user?.name || "Unknown",
      totalRevenue: item._sum.hargaFinal || 0,
      closingCount: item._count.id
    };
  });

  return NextResponse.json({
    personal: {
      revenueToday: myRevenueToday._sum.hargaFinal || 0,
      leads30Days: myLeadsCount,
      closing30Days: myClosingCount,
      conversionRate: myLeadsCount > 0 ? (myClosingCount / myLeadsCount) * 100 : 0
    },
    leaderboard
  });
}
