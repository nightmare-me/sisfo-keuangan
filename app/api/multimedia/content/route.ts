import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: any = {};
  if (status) where.status = status;

  const contents = await prisma.contentProduction.findMany({
    where,
    include: {
      creator: { select: { name: true } },
      videographer: { select: { name: true } },
      editor: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(contents);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { 
    judul, platform, status, deadline, 
    creatorId, videogId, editorId, 
    urlReferensi, keterangan 
  } = body;

  try {
    const content = await prisma.contentProduction.create({
      data: {
        judul,
        platform: platform as any,
        status: status || "IDEATION",
        deadline: deadline ? new Date(deadline) : null,
        creatorId: creatorId || null,
        videogId: videogId || null,
        editorId: editorId || null,
        urlReferensi,
        keterangan
      }
    });

    return NextResponse.json(content);
  } catch (error) {
    console.error("CONTENT_CREATE_ERROR:", error);
    return NextResponse.json({ error: "Gagal menyimpan rencana konten", details: error }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, views, likes, shares, comments, saved, isViral, status, platform, deadline, judul, keterangan } = body;

    const updateData: any = {};
    if (views !== undefined) updateData.views = Number(views) || 0;
    if (likes !== undefined) updateData.likes = Number(likes) || 0;
    if (shares !== undefined) updateData.shares = Number(shares) || 0;
    if (comments !== undefined) updateData.comments = Number(comments) || 0;
    if (saved !== undefined) updateData.saved = Number(saved) || 0;
    if (isViral !== undefined) updateData.isViral = Boolean(isViral);
    if (status) updateData.status = status;
    if (platform) updateData.platform = platform;
    if (judul) updateData.judul = judul;
    if (keterangan !== undefined) updateData.keterangan = keterangan;
    if (deadline) updateData.deadline = new Date(deadline);

    const updated = await prisma.contentProduction.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("CONTENT_UPDATE_ERROR:", error);
    return NextResponse.json({ error: "Gagal memperbarui data", details: error }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID Required" }, { status: 400 });

  await prisma.contentProduction.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
