import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = {};
  if (platform) where.platform = platform;
  if (from && to) where.tanggal = { gte: new Date(from), lte: new Date(to) };

  const metrics = await prisma.socialMetric.findMany({
    where,
    orderBy: { tanggal: "desc" }
  });

  return NextResponse.json(metrics);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { platform, followers, views, likes, shares, comments, saved, tanggal, keterangan } = body;

  // Hitung engagement: (Likes + Comments + Shares + Saved)
  const engagement = (Number(likes) || 0) + (Number(comments) || 0) + (Number(shares) || 0) + (Number(saved) || 0);

  try {
    const metric = await prisma.socialMetric.create({
      data: {
        platform: platform as any,
        followers: Number(followers) || 0,
        views: Number(views) || 0,
        likes: Number(likes) || 0,
        shares: Number(shares) || 0,
        comments: Number(comments) || 0,
        saved: Number(saved) || 0,
        engagement,
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        keterangan,
        dibuatOleh: session.user?.name || "System"
      }
    });

    return NextResponse.json(metric);
  } catch (error) {
    console.error("METRIC_CREATE_ERROR:", error);
    return NextResponse.json({ error: "Gagal menyimpan data", details: error }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, platform, followers, views, likes, shares, comments, saved, tanggal, keterangan } = body;

    const engagement = (Number(likes) || 0) + (Number(comments) || 0) + (Number(shares) || 0) + (Number(saved) || 0);

    const updated = await prisma.socialMetric.update({
      where: { id },
      data: {
        platform,
        followers: Number(followers) || 0,
        views: Number(views) || 0,
        likes: Number(likes) || 0,
        shares: Number(shares) || 0,
        comments: Number(comments) || 0,
        saved: Number(saved) || 0,
        engagement,
        tanggal: tanggal ? new Date(tanggal) : undefined,
        keterangan
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal update data", details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = (session.user as any).role?.toUpperCase() === 'ADMIN';
  if (!isAdmin) return NextResponse.json({ error: "Hanya Admin yang bisa menghapus data" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    await prisma.socialMetric.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal menghapus data", details: error.message }, { status: 500 });
  }
}
