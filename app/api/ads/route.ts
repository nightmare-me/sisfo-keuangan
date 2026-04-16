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
  if (from && to) where.tanggal = { gte: new Date(from), lte: new Date(to) };
  if (platform) where.platform = platform;

  const [data, summary, byPlatform] = await Promise.all([
    prisma.spentAds.findMany({
      where,
      orderBy: { tanggal: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.spentAds.aggregate({ where, _sum: { jumlah: true }, _count: true }),
    prisma.spentAds.groupBy({
      by: ["platform"],
      where,
      _sum: { jumlah: true },
    }),
  ]);

  return NextResponse.json({ data, summary: { total: summary._sum.jumlah ?? 0, count: summary._count }, byPlatform });
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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  await prisma.spentAds.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
