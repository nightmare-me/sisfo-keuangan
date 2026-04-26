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
  const type = searchParams.get("type") || (from ? "custom" : "month");

  // 0. AMBIL CONFIG KEUANGAN DARI DB (Untuk Cutoff)
  const dbConfigs = await prisma.financialConfig.findMany();
  const config: Record<string, number> = {};
  dbConfigs.forEach(c => {
    config[c.key] = c.value;
  });
  const cutoffDay = config.PAYROLL_CUTOFF_DAY || 25;

  let startDate: Date, endDate: Date;
  const now = new Date();

  if (from && to && type === "custom") {
    startDate = startOfDay(new Date(from));
    endDate = endOfDay(new Date(to));
  } else if (type === "today") {
    startDate = startOfDay(now);
    endDate = endOfDay(now);
  } else if (type === "week") {
    const day = now.getDay();
    startDate = new Date(now);
    startDate.setDate(now.getDate() - day + (day === 0 ? -6 : 1)); // Mon start
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // DEFAULT: MONTH (DENGAN CUTOFF CERDAS)
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

  // 1. Pemasukan Saya (Dalam Range Filter)
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
