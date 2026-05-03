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
  const cutoffDay = parseInt(configs.find(c => c.key === "PAYROLL_CUTOFF_DAY")?.value?.toString() || "25");

  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
  } else if (period === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else {
    const jktDay = now.getDate();
    const jktMonth = now.getMonth();
    const jktYear = now.getFullYear();

    if (jktDay >= cutoffDay) {
      start.setFullYear(jktYear, jktMonth, cutoffDay);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(jktYear, jktMonth + 1, cutoffDay - 1);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setFullYear(jktYear, jktMonth - 1, cutoffDay);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(jktYear, jktMonth, cutoffDay - 1);
      end.setHours(23, 59, 59, 999);
    }
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

  // Ambil semua user yang memiliki role advertiser atau spv_adv (baik role utama maupun sub-role)
  const advUsers = await prisma.user.findMany({
    where: {
      aktif: true,
      OR: [
        { role: { slug: { in: ["advertiser", "spv_adv"] } } },
        { subRole: { name: { contains: "ADVERTISER", mode: "insensitive" } } },
        { subRole: { name: { contains: "SPV ADV", mode: "insensitive" } } }
      ],
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

  // AMBIL DATA YANG TIDAK TER-ASSIGN (Unassigned Ads)
  const unassignedAds = await prisma.marketingAd.findMany({
    where: { advId: null, tanggal: dateRange },
    select: { spent: true, leads: true }
  });

  const unassignedSpent = unassignedAds.reduce((a, b) => a + b.spent, 0);
  const unassignedLeads = unassignedAds.reduce((a, b) => a + b.leads, 0);

  if (unassignedSpent > 0 || unassignedLeads > 0) {
    advStats.push({
      advId: "unassigned",
      name: "Tanpa Advertiser (Kosong)",
      teamTypes: ["⚠️ PERLU EDIT"],
      totalSpent: unassignedSpent,
      totalLeads: unassignedLeads,
      totalFee: 0
    });
  }

  const summary = {
    totalSpent: advStats.reduce((a, b) => a + b.totalSpent, 0),
    totalLeads: advStats.reduce((a, b) => a + b.totalLeads, 0),
    totalFee: advStats.reduce((a, b) => a + b.totalFee, 0),
  };

  return NextResponse.json({ advStats, summary });
}
