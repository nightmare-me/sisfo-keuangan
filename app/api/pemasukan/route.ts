import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const csId = searchParams.get("csId");
  const programId = searchParams.get("programId");
  const metodeBayar = searchParams.get("metodeBayar");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where: any = {};
  if (from && to) {
    where.tanggal = { gte: new Date(from), lte: new Date(to) };
  }
  if (csId) where.csId = csId;
  if (programId) where.programId = programId;
  if (metodeBayar) where.metodeBayar = metodeBayar;

  const [data, total] = await Promise.all([
    prisma.pemasukan.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { tanggal: "desc" },
      include: {
        siswa: { select: { nama: true, noSiswa: true } },
        program: { select: { nama: true, tipe: true } },
        cs: { select: { name: true } },
        invoice: { select: { noInvoice: true } },
      },
    }),
    prisma.pemasukan.count({ where }),
  ]);

  const summary = await prisma.pemasukan.aggregate({
    where,
    _sum: { hargaFinal: true, diskon: true },
    _count: true,
  });

  return NextResponse.json({
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summary: {
      totalPemasukan: summary._sum.hargaFinal ?? 0,
      totalDiskon: summary._sum.diskon ?? 0,
      jumlahTransaksi: summary._count,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { siswaId, programId, csId, hargaNormal, diskon, hargaFinal: rawHargaFinal, metodeBayar, keterangan, tanggal } = body;

  const hargaNormalNum = parseFloat(hargaNormal) || 0;
  const diskonNum = parseFloat(diskon) || 0;
  const hargaFinal = rawHargaFinal !== undefined && rawHargaFinal !== null
    ? parseFloat(rawHargaFinal)
    : Math.max(0, hargaNormalNum - diskonNum);

  if (hargaNormalNum <= 0 && hargaFinal <= 0) {
    return NextResponse.json({ error: "Harga normal atau harga final harus diisi" }, { status: 400 });
  }

  const noInvoice = generateInvoiceNumber();

  const pemasukan = await prisma.pemasukan.create({
    data: {
      tanggal: tanggal ? new Date(tanggal) : new Date(),
      siswaId: siswaId || null,
      programId: programId || null,
      csId: csId || null,
      hargaNormal: hargaNormalNum || hargaFinal,
      diskon: diskonNum,
      hargaFinal,
      metodeBayar: metodeBayar ?? "CASH",
      keterangan,
      invoice: {
        create: {
          noInvoice,
          siswaId: siswaId || null,
          tanggal: tanggal ? new Date(tanggal) : new Date(),
          total: hargaNormalNum || hargaFinal,
          diskon: diskonNum,
          totalFinal: hargaFinal,
          statusBayar: "LUNAS",
        },
      },
    },
    include: {
      siswa: true,
      program: true,
      cs: true,
      invoice: true,
    },
  });

  return NextResponse.json(pemasukan, { status: 201 });
}
