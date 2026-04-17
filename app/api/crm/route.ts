import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let where: any = {};
  if (status) where.status = status;

  // Jika role = CS, opsional: hanya melihat lead miliknya atau yang belum diassign. 
  // Tapi untuk kebutuhan sekarang kita tampilkan semua agar bisa kolaborasi, atau sesuai rules.
  // Sementara tampilkan semua.

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      program: { select: { nama: true } },
      cs: { select: { name: true } },
    },
  });

  return NextResponse.json(leads);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const role = (session.user as any).role;
  if (!["ADMIN", "CS"].includes(role)) {
    return NextResponse.json({ error: "Hanya Admin dan CS yang bisa mengubah data Lead" }, { status: 403 });
  }

  const body = await request.json();
  const { id, status, csId, keterangan } = body;

  const data: any = {};
  if (status) data.status = status;
  if (csId !== undefined) data.csId = csId;
  if (keterangan !== undefined) data.keterangan = keterangan;

  const update = await prisma.lead.update({
    where: { id },
    data,
    include: { program: true }
  });

  await recordLog(
    (session.user as any).id,
    "Ubah Status Lead",
    update.nama,
    `Status diubah ke ${status || 'tetap'}. Program: ${update.program?.nama || '—'}`
  );

  return NextResponse.json(update);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const role = (session.user as any).role;
  if (!["ADMIN", "CS"].includes(role)) {
    return NextResponse.json({ error: "Hanya Admin dan CS yang bisa menghapus data" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (lead) {
    await recordLog(
      (session.user as any).id,
      "Hapus Lead",
      lead.nama,
      `WhatsApp: ${lead.whatsapp}`
    );
    await prisma.lead.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
