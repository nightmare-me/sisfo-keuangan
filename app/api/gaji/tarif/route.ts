import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tarif = await prisma.tarifPengajar.findMany({ where: { aktif: true }, orderBy: { berlakuDari: "desc" } });
  return NextResponse.json(tarif);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { tipeKelas, tarif, keterangan } = body;
  // Nonaktifkan tarif lama untuk tipe yang sama
  await prisma.tarifPengajar.updateMany({ where: { tipeKelas, aktif: true }, data: { aktif: false } });
  const newTarif = await prisma.tarifPengajar.create({ data: { tipeKelas, tarif, keterangan } });
  return NextResponse.json(newTarif, { status: 201 });
}
