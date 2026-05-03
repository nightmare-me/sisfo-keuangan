export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAllRoles } from "@/lib/roles";

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

import { calculateBonusTalent, calculateGajiLive } from "@/lib/payroll";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allRoles = getAllRoles(session);
  const hasAccess = allRoles.some(r => ["spv_multimedia", "admin", "finance", "talent"].includes(r));
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "month";
  const dateRange = await getDateRange(period);

  // Ambil config gaji live
  const configRaw = await prisma.financialConfig.findMany();
  const config: Record<string, number> = {};
  configRaw.forEach(c => config[c.key] = c.value);

  // 1. Ambil semua Talent ID yang terlibat (baik dari Live Session maupun Pemasukan)
  const [sessions, allPemasukan] = await Promise.all([
    prisma.liveSession.findMany({
      where: { tanggal: dateRange },
      include: { user: { select: { id: true, name: true } } }
    }),
    prisma.pemasukan.findMany({
      where: { talentId: { not: null }, tanggal: dateRange },
      select: { talentId: true, talent: { select: { name: true } } }
    })
  ]);

  // Gabungkan semua Talent ID unik
  const talentMap: Record<string, any> = {};
  
  // Masukkan dari Live Session
  sessions.forEach(s => {
    const id = s.userId;
    if (!talentMap[id]) {
      talentMap[id] = { talentId: id, name: s.user?.name || "Unknown", totalSesi: 0, totalJam: 0, totalLeads: 0, totalClosing: 0, totalOmset: 0, totalFee: 0 };
    }
    talentMap[id].totalSesi++;
    talentMap[id].totalJam += (s.durasi ?? 0);
  });

  // Masukkan dari Pemasukan (Jika ada talent yang jualan tapi belum input live)
  allPemasukan.forEach(p => {
    const id = p.talentId;
    if (id && !talentMap[id]) {
      talentMap[id] = { talentId: id, name: p.talent?.name || "Unknown", totalSesi: 0, totalJam: 0, totalLeads: 0, totalClosing: 0, totalOmset: 0, totalFee: 0 };
    }
  });

  // Tambahkan data leads & omset dari pemasukan (talentId)
  await Promise.all(Object.keys(talentMap).map(async (talentId) => {
    const [leads, pemasukan] = await Promise.all([
      prisma.lead.count({ where: { talentId, createdAt: dateRange } }),
      prisma.pemasukan.findMany({
        where: { talentId, tanggal: dateRange },
        select: { hargaFinal: true }
      }),
    ]);
    
    const omset = pemasukan.reduce((a: number, b: any) => a + b.hargaFinal, 0);
    const jam = talentMap[talentId].totalJam || 0;

    talentMap[talentId].totalLeads = leads;
    talentMap[talentId].totalClosing = pemasukan.length;
    talentMap[talentId].totalOmset = omset;
    
    // HITUNG ESTIMASI FEE (Bonus Omset + Gaji Live)
    const bonusOmset = calculateBonusTalent(omset);
    const gajiLive = calculateGajiLive(jam, config);
    talentMap[talentId].totalFee = bonusOmset + gajiLive; 
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
      engagementRate: socialMetrics.length > 0 && socialMetrics[0].views > 0
        ? (socialMetrics[0].engagement / socialMetrics[0].views) * 100
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
