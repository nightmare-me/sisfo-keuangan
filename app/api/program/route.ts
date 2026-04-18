import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";
  const programs = await prisma.program.findMany({
    where: all ? {} : { aktif: true },
    orderBy: { nama: "asc" },
  });
  return NextResponse.json(programs);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { nama, deskripsi, tipe, harga, kategoriFee, durasi } = body;
  if (!nama || !harga) return NextResponse.json({ error: "Nama dan harga diperlukan" }, { status: 400 });
  const program = await prisma.program.create({ 
    data: { 
      nama, 
      deskripsi, 
      tipe: tipe ?? "REGULAR", 
      harga, 
      kategoriFee: kategoriFee ?? "REG_1B",
      durasi: durasi ?? null 
    } 
  });
  return NextResponse.json(program, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { id, ...data } = body;
  const program = await prisma.program.update({ where: { id }, data });
  return NextResponse.json(program);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
  // Soft delete — nonaktifkan agar data historis tetap aman
  await prisma.program.update({ where: { id }, data: { aktif: false } });
  return NextResponse.json({ success: true });
}
