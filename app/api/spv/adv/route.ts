export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAllRoles } from "@/lib/roles";
import { calculateAdvFee, AdvCategory } from "@/lib/payroll";

async function getDateRange(period: string) {
  const configs = await prisma.financialConfig.findMany({
    where: { key: { in: ["PAYROLL_CUTOFF_DAY"] } }
  });
  const cutoffDay = configs.find(c => c.key === "PAYROLL_CUTOFF_DAY")?.value || 25;

  const now = new Date();
  if (period === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { gte: start, lte: now };
  } else if (period === "week") {
    const start = new Date();
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return { gte: start, lte: now };
  } else if (period === "year") {
    const start = new Date();
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return { gte: start, lte: now };
  }
  
  // DEFAULT: CURRENT CUTOFF PERIOD (25 - 24)
  const jktDay = now.getDate();
  const jktMonth = now.getMonth();
  const jktYear = now.getFullYear();

  let start: Date, end: Date;
  if (jktDay >= cutoffDay) {
    start = new Date(jktYear, jktMonth, cutoffDay);
    end = new Date(jktYear, jktMonth + 1, cutoffDay - 1, 23, 59, 59);
  } else {
    start = new Date(jktYear, jktMonth - 1, cutoffDay);
    end = new Date(jktYear, jktMonth, cutoffDay - 1, 23, 59, 59);
  }
  return { gte: start, lte: end };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allRoles = getAllRoles(session);
  const hasAccess = allRoles.some(r => ["spv_adv", "admin", "finance"].includes(r));
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "month";
  const search = searchParams.get("search") || "";
  const dateRange = await getDateRange(period);

  // Ambil semua user role advertiser atau spv_adv
  const advRoles = await prisma.role.findMany({ where: { slug: { in: ["advertiser", "spv_adv"] } }, select: { id: true } });
  const advRoleIds = advRoles.map(r => r.id);

  const advUsers = await prisma.user.findMany({
    where: {
      roleId: { in: advRoleIds },
      aktif: true,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    select: { id: true, name: true, teamType: true }
  });

  const advStats = await Promise.all(advUsers.map(async (adv) => {
    const ads = await prisma.marketingAd.findMany({
      where: { advId: adv.id, tanggal: dateRange },
      select: { spent: true, leads: true }
    });
    const totalSpent = ads.reduce((a, b) => a + b.spent, 0);
    const totalLeads = ads.reduce((a, b) => a + b.leads, 0);
    const cpl = totalLeads > 0 ? totalSpent / totalLeads : 0;
    const category = (adv.teamType?.[0] || "ADV_REGULAR") as AdvCategory;
    const totalFee = calculateAdvFee(category, cpl, totalLeads);
    return { advId: adv.id, name: adv.name, teamTypes: adv.teamType, totalSpent, totalLeads, totalFee };
  }));

  const summary = {
    totalSpent: advStats.reduce((a, b) => a + b.totalSpent, 0),
    totalLeads: advStats.reduce((a, b) => a + b.totalLeads, 0),
    totalFee: advStats.reduce((a, b) => a + b.totalFee, 0),
  };

  return NextResponse.json({ advStats, summary });
}
