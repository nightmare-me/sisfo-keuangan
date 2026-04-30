export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAllRoles } from "@/lib/roles";

function getDateRange(period: string) {
  const now = new Date();
  const start = new Date();
  if (period === "today") { start.setHours(0, 0, 0, 0); }
  else if (period === "week") { start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0); }
  else if (period === "month") { start.setDate(1); start.setHours(0, 0, 0, 0); }
  else if (period === "year") { start.setMonth(0, 1); start.setHours(0, 0, 0, 0); }
  return { gte: start, lte: now };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allRoles = getAllRoles(session);
  const hasAccess = allRoles.some(r => ["spv_multimedia", "admin", "finance"].includes(r));
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "month";
  const dateRange = getDateRange(period);

  // Ambil semua Live Session di periode ini (groupby talent)
  const liveSessions = await prisma.liveSession.findMany({
    where: { tanggal: dateRange },
    include: { user: { select: { id: true, name: true } } }
  });

  // Group by talentId
  const talentMap: Record<string, any> = {};
  for (const session of liveSessions) {
    const id = session.userId;
    if (!talentMap[id]) {
      talentMap[id] = {
        talentId: id,
        name: session.user?.name || "Unknown",
        totalSesi: 0,
        totalJam: 0,
      };
    }
    talentMap[id].totalSesi++;
    talentMap[id].totalJam += session.durasi ?? 0;
  }

  // Tambahkan data leads & omset dari pemasukan (talentId)
  await Promise.all(Object.keys(talentMap).map(async (talentId) => {
    const [leads, pemasukan] = await Promise.all([
      prisma.lead.count({ where: { talentId, createdAt: dateRange } }),
      prisma.pemasukan.findMany({
        where: { talentId, tanggal: dateRange },
        select: { hargaFinal: true }
      }),
    ]);
    talentMap[talentId].totalLeads = leads;
    talentMap[talentId].totalClosing = pemasukan.length;
    talentMap[talentId].totalOmset = pemasukan.reduce((a: number, b: any) => a + b.hargaFinal, 0);
    talentMap[talentId].totalFee = 0; 
  }));

  // AMBIL DATA TAMBAHAN (Metrics & Content)
  const [socialMetrics, contents, viralContents] = await Promise.all([
    prisma.socialMetric.findMany({
      where: { tanggal: dateRange },
      orderBy: { tanggal: "desc" }
    }),
    prisma.contentProduction.findMany({
      where: { updatedAt: dateRange },
      include: { creator: true, videographer: true }
    }),
    prisma.contentProduction.findMany({
      where: { isViral: true },
      include: { creator: true, videographer: true },
      orderBy: { views: "desc" },
      take: 5
    })
  ]);

  const talentStats = Object.values(talentMap);

  const summary = {
    totalSesi: talentStats.reduce((a, b) => a + b.totalSesi, 0),
    totalJamLive: talentStats.reduce((a, b) => a + b.totalJam, 0),
    totalLeads: talentStats.reduce((a, b) => a + (b.totalLeads || 0), 0),
    totalOmset: talentStats.reduce((a, b) => a + (b.totalOmset || 0), 0),
    social: {
      // Semua metrik adalah snapshot kumulatif → ambil nilai entry TERBARU
      views:      socialMetrics.length > 0 ? socialMetrics[0].views      : 0,
      likes:      socialMetrics.length > 0 ? socialMetrics[0].likes      : 0,
      shares:     socialMetrics.length > 0 ? socialMetrics[0].shares     : 0,
      saved:      socialMetrics.length > 0 ? socialMetrics[0].saved      : 0,
      comments:   socialMetrics.length > 0 ? socialMetrics[0].comments   : 0,
      engagement: socialMetrics.length > 0 ? socialMetrics[0].engagement : 0,
      followers:  socialMetrics.length > 0 ? socialMetrics[0].followers  : 0,

      // Growth = selisih entry terbaru vs entry terlama dalam periode
      followerGrowth: socialMetrics.length > 1
        ? socialMetrics[0].followers - socialMetrics[socialMetrics.length - 1].followers
        : 0,
      viewsGrowth: socialMetrics.length > 1
        ? socialMetrics[0].views - socialMetrics[socialMetrics.length - 1].views
        : 0,
      engagementGrowth: socialMetrics.length > 1
        ? socialMetrics[0].engagement - socialMetrics[socialMetrics.length - 1].engagement
        : 0,
    },
    production: {
      total: contents.length,
      posted: contents.filter(c => c.status === "POSTED").length,
      viral: viralContents.length,
      inProgress: contents.filter(c => !["POSTED", "CANCELLED", "IDEATION"].includes(c.status)).length,
    }
  };

  return NextResponse.json({ talentStats, summary, socialMetrics, contents, viralContents });
}
