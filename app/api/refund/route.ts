import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const refunds = await prisma.refund.findMany({
    include: {
      siswa: { select: { nama: true, noSiswa: true } },
      cs: { select: { name: true } },
      finance: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(refunds);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["ADMIN", "CS"].includes(role)) {
    return NextResponse.json({ error: "Hanya Admin dan CS yang bisa mengajukan refund" }, { status: 403 });
  }

  const body = await request.json();
  const { siswaId, jumlah, alasan, rekeningTujuan, buktiChat, pemasukanId, invoiceId } = body;

  if (!siswaId || !jumlah || !alasan || !rekeningTujuan) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  const refund = await prisma.refund.create({
    data: {
      siswaId,
      jumlah: parseFloat(jumlah),
      alasan,
      rekeningTujuan,
      buktiChat,
      pemasukanId,
      invoiceId,
      csId: (session.user as any).id,
      status: "PENDING",
    },
    include: { siswa: true }
  });

  await recordLog(
    (session.user as any).id,
    "Ajukan Refund",
    refund.siswa.nama,
    `Jumlah: ${jumlah}. Alasan: ${alasan}`
  );

  return NextResponse.json(refund, { status: 201 });
}
