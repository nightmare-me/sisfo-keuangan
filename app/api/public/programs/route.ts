import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  const programs = await prisma.program.findMany({
    where: { aktif: true },
    select: { id: true, nama: true, tipe: true, harga: true, deskripsi: true },
    orderBy: { nama: "asc" },
  });
  return NextResponse.json(programs);
}
