import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateAdvFee, AdvCategory } from "@/lib/payroll";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const platform = searchParams.get("platform");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");

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
  where.OR = [
    { keterangan: { equals: null } },
    { keterangan: { not: { contains: "[Sync Otomatis]" } } }
  ];

  // Fetch from both tables
  const [spentData, perfData, summarySpent, summaryPerf, byPlatformSpent, byPlatformPerf] = await Promise.all([
    prisma.spentAds.findMany({
      where,
      orderBy: { tanggal: "desc" },
      include: { user: { select: { name: true } } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adPerformance.findMany({
      where: wherePerf,
      orderBy: { date: "desc" },
      include: { adv: { select: { name: true } } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.spentAds.aggregate({ where, _sum: { jumlah: true }, _count: true }),
    prisma.adPerformance.aggregate({ where: wherePerf, _sum: { spent: true, leads: true }, _count: true }),
    prisma.spentAds.groupBy({
      by: ["platform"],
      where,
      _sum: { jumlah: true },
    }),
    prisma.adPerformance.groupBy({
      by: ["platform"],
      where: wherePerf,
      _sum: { spent: true, leads: true },
    }),
  ]);

  // Combine and Format data for table display
  const formattedSpentData = spentData.map((s: any) => {
    return {
      ...s,
      leads: 0,
      cpl: 0,
      fee: 0,
      isPerformanceData: false
    };
  });

  const formattedPerfData = perfData.map((p: any) => ({
    id: p.id,
    tanggal: p.date,
    platform: p.platform,
    jumlah: p.spent,
    leads: p.leads,
    cpl: p.cpl,
    fee: p.fee || 0,
    keterangan: `Laporan Advertiser: ${p.adv.name}`,
    user: { name: p.adv.name },
    isPerformanceData: true
  }));

  const allData = [...formattedSpentData, ...formattedPerfData].sort((a: any, b: any) => 
    new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
  ).slice(0, limit);

  // Combine Summaries
  const totalAmount = (summarySpent._sum.jumlah ?? 0) + (summaryPerf._sum.spent ?? 0);
  const totalLeads = (summaryPerf._sum.leads ?? 0);
  const totalCount = (summarySpent._count ?? 0) + (summaryPerf._count ?? 0);
  const avgCpl = totalLeads > 0 ? totalAmount / totalLeads : 0;

  // Combine platform breakdown
  const platformMap: Record<string, { spent: number; leads: number }> = {};
  byPlatformSpent.forEach((p: any) => {
    if (!platformMap[p.platform]) platformMap[p.platform] = { spent: 0, leads: 0 };
    platformMap[p.platform].spent += (p._sum.jumlah || 0);
  });
  byPlatformPerf.forEach((p: any) => {
    if (!platformMap[p.platform]) platformMap[p.platform] = { spent: 0, leads: 0 };
    platformMap[p.platform].spent += (p._sum.spent || 0);
    platformMap[p.platform].leads += (p._sum.leads || 0);
  });

  const combinedByPlatform = Object.entries(platformMap).map(([platform, val]) => ({
    platform,
    _sum: { jumlah: val.spent, leads: val.leads }
  }));

  return NextResponse.json({ 
    data: allData, 
    total: totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
    summary: { total: totalAmount, count: totalCount, leads: totalLeads, avgCpl }, 
    byPlatform: combinedByPlatform 
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const sessionUserId = (session.user as any).id;

  // Bulk create
  if (Array.isArray(body)) {
    let successCount = 0;
    try {
      await prisma.$transaction(async (tx) => {
        for (const item of body) {
          const tanggal = item.tanggal ? new Date(item.tanggal) : new Date();
          const platform = item.platform ?? "META";
          const spent = parseFloat(item.jumlah);
          
          if (isNaN(spent)) continue;

          // 1. Buat data SpentAds
          // Selalu tandai sebagai [Sync Otomatis] jika diimpor bersama leads agar tidak double count di laporan
          await tx.spentAds.create({
            data: {
              tanggal,
              platform,
              jumlah: spent,
              keterangan: item.keterangan ? `${item.keterangan} [Sync Otomatis]` : "[Sync Otomatis]",
              dibuatOleh: sessionUserId,
            }
          });
          successCount++;

          // 2. Masukkan juga ke AdPerformance jika ada data leads (0 tetap dimasukkan)
          const leads = parseInt(item.leads);
          if (!isNaN(leads)) {
            let advId = sessionUserId;
            let teamTypeRaw = (session.user as any).teamType || 'ADV_REGULAR';

            if (item.email_advertiser) {
              const adv = await tx.user.findUnique({ where: { email: item.email_advertiser }});
              if (adv) {
                advId = adv.id;
                teamTypeRaw = adv.teamType || 'ADV_REGULAR';
              }
            }

            const cpl = spent / leads;
            const firstTeam = Array.isArray(teamTypeRaw) ? teamTypeRaw[0] : (teamTypeRaw as unknown as string);
            const fee = calculateAdvFee((firstTeam || 'ADV_REGULAR') as AdvCategory, cpl, leads);

            await tx.adPerformance.create({
              data: {
                date: tanggal,
                platform,
                spent,
                leads,
                cpl,
                fee,
                advId
              }
            });
          }
        }
      });
      return NextResponse.json({ success: successCount }, { status: 201 });
    } catch (e: any) {
      console.error(e);
      return NextResponse.json({ error: "Gagal memproses import data" }, { status: 500 });
    }
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
