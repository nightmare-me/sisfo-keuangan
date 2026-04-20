import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordLog } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const { id, status, csId, keterangan, incrementFollowUp, setFollowUp, nama, whatsapp, programId, isRO, tanggalLead, tanggalClosing } = body;

  const data: any = {};
  if (status) data.status = status;
  if (csId !== undefined) data.csId = csId;
  if (keterangan !== undefined) data.keterangan = keterangan;
  if (nama) data.nama = nama;
  if (whatsapp) data.whatsapp = whatsapp;
  if (isRO !== undefined) data.isRO = isRO;
  if (programId !== undefined) data.programId = programId === "" ? null : programId;
  if (tanggalLead !== undefined) data.tanggalLead = tanggalLead ? new Date(tanggalLead) : null;
  if (tanggalClosing !== undefined) data.tanggalClosing = tanggalClosing ? new Date(tanggalClosing) : null;
  
  if (incrementFollowUp) data.followUpCount = { increment: 1 };
  if (setFollowUp !== undefined) data.followUpCount = setFollowUp;

  // Auto-assign CS jika belum diassign
  if (status && status !== "NEW" && role === "CS") {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (lead && !lead.csId) {
      data.csId = (session.user as any).id;
    }
    // Auto-set tanggalClosing saat status berubah ke PAID (jika belum diset manual)
    if (status === "PAID" && tanggalClosing === undefined) {
      const lead = await prisma.lead.findUnique({ where: { id } });
      if (lead && !lead.tanggalClosing) {
        data.tanggalClosing = new Date();
      }
    }
  } else if (status === "PAID" && tanggalClosing === undefined) {
    // Admin juga auto-set jika belum ada
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (lead && !lead.tanggalClosing) {
      data.tanggalClosing = new Date();
    }
  } else if (setFollowUp && role === "CS") {
    // Juga auto-assign jika CS klik gelembung follow-up
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (lead && !lead.csId) {
      data.csId = (session.user as any).id;
    }
  }
  try {
    const update = await prisma.lead.update({
      where: { id },
      data,
      include: { program: true }
    });

    await recordLog(
      (session.user as any).id,
      "Ubah Status Lead",
      update.nama,
      `Status diubah ke ${status || 'tetap'}.`
    );

    return NextResponse.json({ 
      success: true, 
      result: update 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const role = (session.user as any).role?.toUpperCase();
  const isSuperAdmin = role === "ADMIN";

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all");

  try {
    if (all === "true") {
      if (!isSuperAdmin) return NextResponse.json({ error: "Hanya Super Admin yang bisa menghapus semua data" }, { status: 403 });
      
      const count = await prisma.lead.count();
      await recordLog((session.user as any).id, "Hapus Semua Lead", "BATCH DELETE", `Menghapus ${count} data lead secara permanen.`);
      await prisma.lead.deleteMany({});
      return NextResponse.json({ success: true, count });
    }

    if (id) {
      if (!["ADMIN", "CS"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const lead = await prisma.lead.findUnique({ where: { id } });
      if (lead) {
        await recordLog((session.user as any).id, "Hapus Lead", lead.nama, `WhatsApp: ${lead.whatsapp}`);
        await prisma.lead.delete({ where: { id } });
      }
      return NextResponse.json({ success: true });
    }

    const body = await request.json().catch(() => ({}));
    if (body.ids && Array.isArray(body.ids)) {
      if (!["ADMIN", "CS"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      await recordLog((session.user as any).id, "Hapus Lead Masal", "BULK DELETE", `Menghapus ${body.ids.length} data lead.`);
      await prisma.lead.deleteMany({ where: { id: { in: body.ids } } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "ID atau IDs diperlukan" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal menghapus", message: err.message }, { status: 500 });
  }
}
