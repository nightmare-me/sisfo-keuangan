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
    
    // Calculate Fee
    const fee = calculateAdvFee(
      (user.teamType || 'ADV_REGULAR') as AdvCategory,
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

    // 2. SINKRONISASI KE SPENT ADS (Total Harian)
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const totalSpentAgg = await prisma.adPerformance.aggregate({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        platform: targetPlatform
      },
      _sum: { spent: true }
    });

    const totalJumlah = totalSpentAgg._sum.spent || 0;

    const existingSpent = await prisma.spentAds.findFirst({
      where: {
        tanggal: { gte: dayStart, lte: dayEnd },
        platform: targetPlatform
      }
    });

    if (existingSpent) {
      await prisma.spentAds.update({
        where: { id: existingSpent.id },
        data: { 
          jumlah: totalJumlah,
          keterangan: `Sync Otomatis: Total dari ${targetPlatform} Advertisers`
        }
      });
    } else {
      await prisma.spentAds.create({
        data: {
          tanggal: targetDate,
          platform: targetPlatform,
          jumlah: totalJumlah,
          keterangan: `Sync Otomatis: Total dari ${targetPlatform} Advertisers`,
          dibuatOleh: userId
        }
      });
    }

    return NextResponse.json(performance);
  } catch (err: any) {
    console.error("ADS_PERFORMANCE_POST_ERROR:", err);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}
