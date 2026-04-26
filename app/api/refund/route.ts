import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const [data, total] = await Promise.all([
    prisma.refund.findMany({
      include: {
        siswa: { select: { nama: true, noSiswa: true } },
        cs: { select: { name: true } },
        finance: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.refund.count()
  ]);

  return NextResponse.json({ 
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  });
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

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role?.toUpperCase();
  if (role !== "ADMIN") return NextResponse.json({ error: "Hanya Admin yang bisa menghapus data" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all");

  if (all === "true") {
    const count = await prisma.refund.count();
    await recordLog((session.user as any).id, "Hapus Semua Refund", "BATCH DELETE", `Menghapus seluruh ${count} data permintaan refund.`);
    await prisma.refund.deleteMany({});
    return NextResponse.json({ success: true });
  }

  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  const item = await prisma.refund.findUnique({ where: { id }, include: { siswa: true } });
  if (item) {
    await recordLog(
      (session.user as any).id,
      "Hapus Refund",
      item.siswa.nama,
      `Refund senilai ${item.jumlah} dihapus.`
    );
    await prisma.refund.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
