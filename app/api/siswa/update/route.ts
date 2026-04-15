import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Fix: Add PUT to siswa API
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
  const siswa = await prisma.siswa.update({
    where: { id },
    data: { ...data, tanggalLahir: data.tanggalLahir ? new Date(data.tanggalLahir) : undefined },
  });
  return NextResponse.json(siswa);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
  await prisma.siswa.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
