import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay } from "date-fns";
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
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const spent = parseFloat(body.spent);
    const leads = parseInt(body.leads);
    const { date, platform } = body;

    if (isNaN(spent) || isNaN(leads)) {
      return NextResponse.json({ error: "Spent dan Leads harus berupa angka valid" }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const cpl = leads > 0 ? (spent / leads) : 0;
    
    const firstTeam = Array.isArray(user.teamType) ? user.teamType[0] : (user.teamType as unknown as string);
    
    // Calculate Fee
    const fee = calculateAdvFee(
      (firstTeam || 'ADV_REGULAR') as AdvCategory,
      cpl,
      leads
    );

    const targetDate = date ? new Date(date) : new Date();

    // Enforce valid platform enum
    const validPlatforms = ["META", "GOOGLE", "TIKTOK", "INSTAGRAM", "YOUTUBE", "LAINNYA"];
    const targetPlatform: any = validPlatforms.includes(platform) ? platform : "META";

    // 1. Simpan Performance Personal
    const performance = await prisma.adPerformance.create({
      data: {
        advId: userId,
        date: targetDate,
        platform: targetPlatform,
        spent,
        leads,
        cpl,
        fee
      }
    });

    return NextResponse.json(performance);
  } catch (err: any) {
    console.error("ADS_PERFORMANCE_POST_ERROR:", err);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role?.toUpperCase();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all");

  if (all === "true") {
    if (role !== "ADMIN") return NextResponse.json({ error: "Hanya Admin yang bisa menghapus data" }, { status: 403 });
    await prisma.adPerformance.deleteMany({});
    return NextResponse.json({ success: true });
  }

  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  await prisma.adPerformance.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
