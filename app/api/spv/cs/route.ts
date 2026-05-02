export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAllRoles } from "@/lib/roles";

async function getDateRange(period: string) {
  const configs = await prisma.financialConfig.findMany({
    where: { key: { in: ["PAYROLL_CUTOFF_DAY"] } }
  });
  const cutoffDay = configs.find(c => c.key === "PAYROLL_CUTOFF_DAY")?.value || 25;

  const now = new Date();
  if (period === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { gte: start, lte: now };
  } else if (period === "week") {
    const start = new Date();
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return { gte: start, lte: now };
  } else if (period === "year") {
    const start = new Date();
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return { gte: start, lte: now };
  }
  
  // DEFAULT: CURRENT CUTOFF PERIOD (25 - 24)
  const jktDay = now.getDate();
  const jktMonth = now.getMonth();
  const jktYear = now.getFullYear();

  let start: Date, end: Date;
  if (jktDay >= cutoffDay) {
    start = new Date(jktYear, jktMonth, cutoffDay);
    end = new Date(jktYear, jktMonth + 1, cutoffDay - 1, 23, 59, 59);
  } else {
    start = new Date(jktYear, jktMonth - 1, cutoffDay);
    end = new Date(jktYear, jktMonth, cutoffDay - 1, 23, 59, 59);
  }
  return { gte: start, lte: end };
}

import { calculateCSFee } from "@/lib/payroll";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const allRoles = getAllRoles(session);
  const hasAccess = allRoles.some(r => ["spv_cs", "admin", "finance"].includes(r));
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "month";
  const search = searchParams.get("search") || "";
  const dateRange = await getDateRange(period);

  // Ambil config keuangan
  const configRaw = await prisma.financialConfig.findMany();
  const config: Record<string, number> = {};
  configRaw.forEach(c => config[c.key] = c.value);

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
        include: { program: true }
      }),
    ]);
    
    const totalOmset = pemasukan.reduce((a, b) => a + b.hargaFinal, 0);
    const totalClosing = pemasukan.length;

    // Hitung fee CS dinamis
    const teamTypeRaw = cs.teamType;
    const firstTeam = Array.isArray(teamTypeRaw) ? teamTypeRaw[0] : (teamTypeRaw as string);

    let totalFee = 0;
    pemasukan.forEach(p => {
      totalFee += calculateCSFee(
        (firstTeam || "CS_REGULAR") as any,
        p.program?.kategoriFee || "REG_1B",
        p.hargaFinal,
        p.isRO,
        0,
        p.program as any,
        config
      );
    });

    return { csId: cs.id, name: cs.name, teamTypes: cs.teamType, totalLeads: leads, totalClosing, totalOmset, totalFee };
  }));

  const summary = {
    totalLeads: csStats.reduce((a, b) => a + b.totalLeads, 0),
    totalClosing: csStats.reduce((a, b) => a + b.totalClosing, 0),
    totalOmset: csStats.reduce((a, b) => a + b.totalOmset, 0),
  };

  return NextResponse.json({ csStats, summary });
}
