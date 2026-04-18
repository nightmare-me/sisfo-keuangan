import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInvoiceNumber, generateSiswaNumber } from "@/lib/utils";
import { recordLog } from "@/lib/audit";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
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

    // 1. Ambil SEMUA ID Pemasukan yang direfund (Approved)
    const approvedRefunds = await prisma.refund.findMany({
      where: { status: "APPROVED" },
      select: { pemasukanId: true, siswaId: true, jumlah: true }
    });
    const refundedPemasukanIds = new Set(approvedRefunds.map(r => r.pemasukanId).filter(Boolean));

    // 2. Query Pemasukan (Include SiswaId for fallback filtering)
    const allMatchingPemasukan = await prisma.pemasukan.findMany({
      where,
      orderBy: { tanggal: "desc" },
      include: {
        siswa: { select: { nama: true, noSiswa: true, id: true } },
        program: { select: { nama: true, tipe: true } },
        cs: { select: { name: true } },
        invoice: { select: { noInvoice: true } },
      },
    });

    // 3. Filter dengan "Radar Refund" (Fallback logic)
    const filteredData = allMatchingPemasukan.filter(p => {
      // Cek berdasarkan ID
      if (refundedPemasukanIds.has(p.id)) return false;
      
      // Backup: Cek jika ada refund APPROVED untuk siswa ini dengan jumlah yang sama
      const hasMatchingRefund = approvedRefunds.find(r => 
        !r.pemasukanId && 
        r.siswaId === p.siswaId && 
        Math.abs(Number(r.jumlah) - p.hargaFinal) < 100
      );
      
      if (hasMatchingRefund) {
        (hasMatchingRefund as any).pemasukanId = p.id;
        return false;
      }
      
      return true;
    });

    // 4. Pagination & Summary
    const finalData = filteredData.slice((page - 1) * limit, page * limit);
    const totalCount = filteredData.length;
    const totalPemasukan = filteredData.reduce((sum, p) => sum + p.hargaFinal, 0);
    const totalDiskon = filteredData.reduce((sum, p) => sum + p.diskon, 0);

    return NextResponse.json({
      data: finalData,
      total: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      summary: {
        totalPemasukan,
        totalDiskon,
        jumlahTransaksi: totalCount,
      },
    });
  } catch (error: any) {
    console.error("PEMASUKAN_GET_ERROR:", error);
    return NextResponse.json({ error: "Gagal mengambil data pemasukan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { siswaId, namaSiswa, programId, csId, hargaNormal, diskon, hargaFinal: rawHargaFinal, metodeBayar, keterangan, tanggal } = body;

  let finalSiswaId = siswaId || null;

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
    if (item.invoice) await prisma.invoice.delete({ where: { id: item.invoice.id } });
    await prisma.pemasukan.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
