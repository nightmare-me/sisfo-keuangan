import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

  try {
    const updated = await prisma.pemasukan.update({
      where: { id: params.id },
      data: {
        tanggal: tanggal ? new Date(tanggal) : undefined,
        siswaId: siswaId || null,
        programId: programId || null,
        csId: csId || null,
        hargaNormal: hargaNormalNum || hargaFinal,
        diskon: diskonNum,
        hargaFinal,
        metodeBayar: metodeBayar ?? "CASH",
        keterangan,
      },
      include: {
        siswa: { select: { nama: true, noSiswa: true } },
        program: { select: { nama: true, tipe: true } },
        cs: { select: { name: true } },
        invoice: { select: { noInvoice: true } },
      },
    });

    // Sync invoice juga
    await prisma.invoice.updateMany({
      where: { pemasukanId: params.id },
      data: {
        siswaId: siswaId || null,
        tanggal: tanggal ? new Date(tanggal) : undefined,
        total: hargaNormalNum || hargaFinal,
        diskon: diskonNum,
        totalFinal: hargaFinal,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Hanya ADMIN dan FINANCE yang bisa hapus
  const role = (session.user as any)?.role;
  if (!["ADMIN", "FINANCE"].includes(role)) {
    return NextResponse.json({ error: "Tidak punya akses" }, { status: 403 });
  }

  try {
    // Hapus invoice terkait dulu (cascade)
    await prisma.invoice.deleteMany({ where: { pemasukanId: params.id } });
    await prisma.pemasukan.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  }
}
