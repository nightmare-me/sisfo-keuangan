export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAllRoles } from "@/lib/roles";

function getDateRange(period: string) {
  const now = new Date();
  const start = new Date();
  if (period === "today") { start.setHours(0, 0, 0, 0); }
  else if (period === "week") { start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0); }
  else if (period === "month") { start.setDate(1); start.setHours(0, 0, 0, 0); }
  else if (period === "year") { start.setMonth(0, 1); start.setHours(0, 0, 0, 0); }
  return { gte: start, lte: now };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const allRoles = getAllRoles(session);
  const hasAccess = allRoles.some(r => ["spv_cs", "admin", "finance"].includes(r));
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "month";
  const search = searchParams.get("search") || "";
  const dateRange = getDateRange(period);

  // Ambil semua user role CS
  const csUsers = await prisma.user.findMany({
    where: {
      role: { slug: "cs" },
      aktif: true,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    select: { id: true, name: true, teamType: true }
  });

  // Hitung leads & closing per CS
  const csStats = await Promise.all(csUsers.map(async (cs) => {
    const [leads, pemasukan] = await Promise.all([
      prisma.lead.count({ where: { csId: cs.id, createdAt: dateRange } }),
      prisma.pemasukan.findMany({
        where: { csId: cs.id, tanggal: dateRange },
        select: { hargaFinal: true }
      }),
    ]);
    const totalOmset = pemasukan.reduce((a, b) => a + b.hargaFinal, 0);
    const totalClosing = pemasukan.length;
    // Hitung fee CS berdasarkan karyawanProfile
    const profile = await prisma.karyawanProfile.findUnique({ where: { userId: cs.id } });
    const totalFee = (profile?.feeClosing ?? 0) * totalClosing;
    return { csId: cs.id, name: cs.name, teamTypes: cs.teamType, totalLeads: leads, totalClosing, totalOmset, totalFee };
  }));

  const summary = {
    totalLeads: csStats.reduce((a, b) => a + b.totalLeads, 0),
    totalClosing: csStats.reduce((a, b) => a + b.totalClosing, 0),
    totalOmset: csStats.reduce((a, b) => a + b.totalOmset, 0),
  };

  return NextResponse.json({ csStats, summary });
}
