import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const where: any = {};
  if (search) {
    where.OR = [
      { noInvoice: { contains: search, mode: "insensitive" } },
      { siswa: { nama: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { tanggal: "desc" },
      include: {
        siswa: { select: { nama: true, noSiswa: true, telepon: true } },
        pemasukan: { include: { program: { select: { nama: true, tipe: true } }, cs: { select: { name: true } } } },
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where })
  ]);

  return NextResponse.json({ 
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role?.toUpperCase();
  if (role !== "ADMIN") return NextResponse.json({ error: "Hanya Admin yang bisa menghapus data" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all");

  if (all === "true") {
    // Hard delete all invoices
    await prisma.invoice.deleteMany({});
    return NextResponse.json({ success: true });
  }

  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
