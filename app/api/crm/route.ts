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

  // Jika role = CS, hanya tampilkan lead miliknya ATAU lead baru (belum diassign)
  if (role === "CS") {
    where = {
      OR: [
        { csId: userId },
        { status: "NEW", csId: null }
      ]
    };
    if (status) {
       where = {
         AND: [
           { status: status },
           { OR: [{ csId: userId }, { status: "NEW", csId: null }] }
         ]
       };
    }
  } else if (status) {
    where.status = status;
  }

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

  // Auto-assign: Jika status berubah dari NEW dan csId masih kosong,
  // assign ke user yang mengubahnya (jika user adalah CS)
  if (status && status !== "NEW" && role === "CS") {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (lead && !lead.csId) {
      data.csId = (session.user as any).id;
    }
  }

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
  const isSuperAdmin = role === "ADMIN";

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all");

  if (all === "true") {
    if (!isSuperAdmin) return NextResponse.json({ error: "Hanya Super Admin yang bisa menghapus semua data" }, { status: 403 });
    
    const count = await prisma.lead.count();
    await recordLog((session.user as any).id, "Hapus Semua Lead", "BATCH DELETE", `Menghapus ${count} data lead secara permanen.`);
    await prisma.lead.deleteMany({});
    return NextResponse.json({ success: true, count });
  }

  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  if (!["ADMIN", "CS"].includes(role)) {
    return NextResponse.json({ error: "Hanya Admin dan CS yang bisa menghapus data" }, { status: 403 });
  }

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
