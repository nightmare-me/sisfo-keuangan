import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInvoiceNumber, generateSiswaNumber } from "@/lib/utils";
import { recordLog } from "@/lib/audit";

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
  const { siswaId, namaSiswa, programId, csId, hargaNormal, diskon, hargaFinal: rawHargaFinal, metodeBayar, keterangan, tanggal } = body;

  let finalSiswaId = siswaId || null;

  // Auto-create / search Siswa jika siswaId kosong tapi namaSiswa ada
  if (!finalSiswaId && namaSiswa) {
    const existing = await prisma.siswa.findFirst({
      where: { nama: { equals: namaSiswa, mode: "insensitive" } }
    });
    if (existing) {
      finalSiswaId = existing.id;
    } else {
      const newSiswa = await prisma.siswa.create({
        data: {
          noSiswa: generateSiswaNumber(),
          nama: namaSiswa,
          status: "AKTIF",
        }
      });
      finalSiswaId = newSiswa.id;
    }
  }

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
      siswaId: finalSiswaId,
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
          siswaId: finalSiswaId,
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

  await recordLog(
    (session.user as any).id,
    "Tambah Pemasukan",
    pemasukan.siswa?.nama || "Non-Siswa",
    `Nominal: ${pemasukan.hargaFinal}. Program: ${pemasukan.program?.nama || '—'}. No Invoice: ${pemasukan.invoice?.noInvoice}`
  );

  return NextResponse.json(pemasukan, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Hanya Admin yang bisa menghapus transaksi" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  const item = await prisma.pemasukan.findUnique({
    where: { id },
    include: { siswa: true, invoice: true }
  });

  if (item) {
    await recordLog(
      (session.user as any).id,
      "Hapus Pemasukan",
      item.siswa?.nama || "Non-Siswa",
      `Transaksi senilai ${item.hargaFinal} dihapus. No Invoice: ${item.invoice?.noInvoice}`
    );
    // Cascade delete invoice handles it if relation is set correctly, but prisma needs explicit usually if not specified
    if (item.invoice) await prisma.invoice.delete({ where: { id: item.invoice.id } });
    await prisma.pemasukan.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
