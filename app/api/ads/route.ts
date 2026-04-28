import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateAdvFee, AdvCategory } from "@/lib/payroll";

const VALID_PLATFORMS = ["GOOGLE", "META", "TIKTOK", "INSTAGRAM", "YOUTUBE", "LAINNYA"];

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
  if (from && to) {
    where.tanggal = { gte: new Date(from), lte: new Date(to) };
  }
  if (platform) {
    where.platform = platform;
  }

  const [ads, total, summary, byPlatform] = await Promise.all([
    prisma.marketingAd.findMany({
      where,
      orderBy: { tanggal: "desc" },
      include: {
        adv: { select: { name: true } },
        creator: { select: { name: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.marketingAd.count({ where }),
    prisma.marketingAd.aggregate({
      where,
      _sum: { spent: true, leads: true, fee: true },
      _count: true,
    }),
    prisma.marketingAd.groupBy({
      by: ["platform"],
      where,
      _sum: { spent: true, leads: true },
    }),
  ]);

  const totalSpent = summary._sum.spent ?? 0;
  const totalLeads = summary._sum.leads ?? 0;
  const avgCpl = totalLeads > 0 ? totalSpent / totalLeads : 0;

  const formattedData = ads.map((a: any) => ({
    id: a.id,
    tanggal: a.tanggal,
    platform: a.platform,
    jumlah: a.spent,
    spent: a.spent,
    leads: a.leads,
    cpl: a.cpl,
    fee: a.fee,
    keterangan: a.keterangan,
    user: a.adv ?? a.creator,
    advId: a.advId,
  }));

  const combinedByPlatform = byPlatform.map((p: any) => ({
    platform: p.platform,
    _sum: { jumlah: p._sum.spent ?? 0, leads: p._sum.leads ?? 0 },
  }));

  return NextResponse.json({
    data: formattedData,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summary: {
      total: totalSpent,
      count: summary._count,
      leads: totalLeads,
      avgCpl,
    },
    byPlatform: combinedByPlatform,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const sessionUserId = (session.user as any).id;

  // Bulk create dari import CSV
  if (Array.isArray(body)) {
    let successCount = 0;
    try {
      await prisma.$transaction(async (tx) => {
        for (const item of body) {
          const tanggal = item.tanggal ? new Date(item.tanggal) : new Date();
          const platform: any = VALID_PLATFORMS.includes(item.platform) ? item.platform : "META";
          const spent = parseFloat(item.jumlah);
          if (isNaN(spent)) continue;

          const leads = !isNaN(parseInt(item.leads)) ? parseInt(item.leads) : 0;
          const cpl = leads > 0 ? spent / leads : 0;

          let advId = sessionUserId;
          let teamTypeRaw = (session.user as any).teamType || "ADV_REGULAR";

          if (item.email_advertiser) {
            const adv = await tx.user.findUnique({ where: { email: item.email_advertiser } });
            if (adv) {
              advId = adv.id;
              teamTypeRaw = adv.teamType || "ADV_REGULAR";
            }
          }

          const firstTeam = Array.isArray(teamTypeRaw) ? teamTypeRaw[0] : (teamTypeRaw as string);
          const fee = calculateAdvFee((firstTeam || "ADV_REGULAR") as AdvCategory, cpl, leads);

          await tx.marketingAd.create({
            data: {
              tanggal,
              platform,
              spent,
              leads,
              cpl,
              fee,
              keterangan: item.keterangan || null,
              advId,
              dibuatOleh: sessionUserId,
            },
          });
          successCount++;
        }
      });
      return NextResponse.json({ success: successCount }, { status: 201 });
    } catch (e: any) {
      console.error(e);
      return NextResponse.json({ error: "Gagal memproses import data" }, { status: 500 });
    }
  }

  // Single create
  const { platform, jumlah, keterangan, tanggal, leads: leadsRaw } = body;
  const spent = parseFloat(jumlah);
  const leads = parseInt(leadsRaw || "0") || 0;
  const cpl = leads > 0 ? spent / leads : 0;

  const user = await prisma.user.findUnique({ where: { id: sessionUserId } });
  const teamTypeRaw = (user as any)?.teamType;
  const firstTeam = Array.isArray(teamTypeRaw) ? teamTypeRaw[0] : (teamTypeRaw as string);
  const fee = calculateAdvFee((firstTeam || "ADV_REGULAR") as AdvCategory, cpl, leads);

  const ad = await prisma.marketingAd.create({
    data: {
      tanggal: tanggal ? new Date(tanggal) : new Date(),
      platform: VALID_PLATFORMS.includes(platform) ? platform : "META",
      spent,
      leads,
      cpl,
      fee,
      keterangan,
      advId: sessionUserId,
      dibuatOleh: sessionUserId,
    },
  });

  return NextResponse.json(ad, { status: 201 });
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
    await prisma.marketingAd.deleteMany({});
    return NextResponse.json({ success: true });
  }

  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  await prisma.marketingAd.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
