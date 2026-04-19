import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const categories = await prisma.kategoriPengeluaran.findMany({
    orderBy: { nama: "asc" }
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nama, color } = await request.json();
  const slug = nama.toLowerCase().replace(/\s+/g, '-');

  const category = await prisma.kategoriPengeluaran.create({
    data: { nama, slug, color }
  });

  return NextResponse.json(category);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    await prisma.kategoriPengeluaran.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "ID required" }, { status: 400 });
}
