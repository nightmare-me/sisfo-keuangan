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
    talentMap[talentId].totalFee = 0; // Fee talent dihitung di payroll, bukan di sini
  }));

  const talentStats = Object.values(talentMap);

  const summary = {
    totalSesi: talentStats.reduce((a, b) => a + b.totalSesi, 0),
    totalJamLive: talentStats.reduce((a, b) => a + b.totalJam, 0),
    totalLeads: talentStats.reduce((a, b) => a + (b.totalLeads || 0), 0),
    totalOmset: talentStats.reduce((a, b) => a + (b.totalOmset || 0), 0),
  };

  return NextResponse.json({ talentStats, summary });
}
