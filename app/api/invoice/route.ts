import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const where: any = {};
  if (search) where.noInvoice = { contains: search, mode: "insensitive" };
  const data = await prisma.invoice.findMany({
    where,
    orderBy: { tanggal: "desc" },
    include: {
      siswa: { select: { nama: true, noSiswa: true, telepon: true } },
      pemasukan: { include: { program: { select: { nama: true, tipe: true } }, cs: { select: { name: true } } } },
    },
    take: 100,
  });
  return NextResponse.json({ data });
}
