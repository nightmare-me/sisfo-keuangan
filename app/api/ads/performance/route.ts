import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateAdvFee, AdvCategory } from "@/lib/payroll";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  // Filter by user if not Admin
  const where = role === "ADMIN" ? {} : { advId: userId };
  
  const performances = await prisma.adPerformance.findMany({
    where,
    orderBy: { date: "desc" },
    include: { adv: { select: { name: true, teamType: true } } }
  });

  return NextResponse.json(performances);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { spent, leads, date } = await request.json();
  const userId = (session.user as any).id;
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const cpl = leads > 0 ? (spent / leads) : 0;
  
  // Calculate Fee
  const fee = calculateAdvFee(
    (user.teamType || 'ADV_REGULAR') as AdvCategory,
    cpl,
    leads
  );

  const performance = await prisma.adPerformance.create({
    data: {
      advId: userId,
      date: date ? new Date(date) : new Date(),
      spent,
      leads,
      cpl,
      fee
    }
  });

  return NextResponse.json(performance);
}
