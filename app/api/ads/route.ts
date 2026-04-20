import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const platform = searchParams.get("platform");

  const where: any = {};
  const wherePerf: any = {};
  if (from && to) {
    where.tanggal = { gte: new Date(from), lte: new Date(to) };
    wherePerf.date = { gte: new Date(from), lte: new Date(to) };
  }
  if (platform) {
    where.platform = platform;
    wherePerf.platform = platform;
  }

  // EXCLUDE OLD SYNC RECORDS to prevent double counting
  where.NOT = {
    keterangan: { contains: "Sync Otomatis" }
  };

  // Fetch from both tables
  const [spentData, perfData, summarySpent, summaryPerf, byPlatformSpent, byPlatformPerf] = await Promise.all([
    prisma.spentAds.findMany({
      where,
      orderBy: { tanggal: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.adPerformance.findMany({
      where: wherePerf,
      orderBy: { date: "desc" },
      include: { adv: { select: { name: true } } },
    }),
    prisma.spentAds.aggregate({ where, _sum: { jumlah: true }, _count: true }),
    prisma.adPerformance.aggregate({ where: wherePerf, _sum: { spent: true }, _count: true }),
    prisma.spentAds.groupBy({
      by: ["platform"],
      where,
      _sum: { jumlah: true },
    }),
    prisma.adPerformance.groupBy({
      by: ["platform"],
      where: wherePerf,
      _sum: { spent: true },
    }),
  ]);

  // Combine and Format data for table display
  // We transform AdPerformance records to look like SpentAds records
  const formattedPerfData = perfData.map(p => ({
    id: p.id,
    tanggal: p.date,
    platform: p.platform,
    jumlah: p.spent,
    keterangan: `Laporan Advertiser: ${p.adv.name}`,
    user: { name: p.adv.name },
    isPerformanceData: true
  }));

  const allData = [...spentData, ...formattedPerfData].sort((a,b) => 
    new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
  );

  // Combine Summaries
  const totalAmount = (summarySpent._sum.jumlah ?? 0) + (summaryPerf._sum.spent ?? 0);
  const totalCount = (summarySpent._count ?? 0) + (summaryPerf._count ?? 0);

  // Combine platform breakdown
  const platformMap: Record<string, number> = {};
  byPlatformSpent.forEach(p => {
    platformMap[p.platform] = (platformMap[p.platform] || 0) + (p._sum.jumlah || 0);
  });
  byPlatformPerf.forEach(p => {
    platformMap[p.platform] = (platformMap[p.platform] || 0) + (p._sum.spent || 0);
  });

  const combinedByPlatform = Object.entries(platformMap).map(([platform, amount]) => ({
    platform,
    _sum: { jumlah: amount }
  }));

  return NextResponse.json({ 
    data: allData, 
    summary: { total: totalAmount, count: totalCount }, 
    byPlatform: combinedByPlatform 
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Bulk create
  if (Array.isArray(body)) {
    const data = body.map((item: any) => ({
      tanggal: item.tanggal ? new Date(item.tanggal) : new Date(),
      platform: item.platform ?? "META",
      jumlah: parseFloat(item.jumlah),
      keterangan: item.keterangan || null,
      dibuatOleh: (session.user as any).id,
    }));
    const result = await prisma.spentAds.createMany({ data });
    return NextResponse.json({ success: result.count }, { status: 201 });
  }

  // Single create
  const { platform, jumlah, keterangan, tanggal } = body;

  const ads = await prisma.spentAds.create({
    data: {
      tanggal: tanggal ? new Date(tanggal) : new Date(),
      platform: platform ?? "META",
      jumlah: parseFloat(jumlah),
      keterangan,
      dibuatOleh: (session.user as any).id,
    },
  });

  return NextResponse.json(ads, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all");

  if (all === "true") {
    if (role !== "ADMIN") return NextResponse.json({ error: "Hanya Admin yang bisa menghapus semua data" }, { status: 403 });
    await prisma.spentAds.deleteMany({});
    return NextResponse.json({ success: true });
  }

  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  await prisma.spentAds.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
