import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordLog } from "@/lib/audit";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["ADMIN", "FINANCE"].includes(role)) {
    return NextResponse.json({ error: "Hanya Admin dan Finance yang bisa memproses refund" }, { status: 403 });
  }

  const { id } = params;
  const body = await request.json();
  const { status, catatan } = body; // APPROVED | REJECTED

  const refund = await prisma.refund.findUnique({
    where: { id },
    include: { siswa: true }
  });
  if (!refund) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

  const update = await prisma.refund.update({
    where: { id },
    data: {
      status,
      catatan,
      financeId: (session.user as any).id,
    }
  });

  // Jika APPROVED, otomatis ubah status siswa ke TIDAK_AKTIF (sesuai Image 1)
  if (status === "APPROVED") {
    await prisma.siswa.update({
      where: { id: refund.siswaId },
      data: { status: "TIDAK_AKTIF" }
    });
    
    // Nonaktifkan pendaftaran aktif jika ada
    await prisma.pendaftaran.updateMany({
      where: { siswaId: refund.siswaId, aktif: true },
      data: { aktif: false }
    });
  }

  await recordLog(
    (session.user as any).id,
    `Proses Refund (${status})`,
    refund.siswa.nama,
    `Catatan: ${catatan || '—'}`
  );

  return NextResponse.json(update);
}
