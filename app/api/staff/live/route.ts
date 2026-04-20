import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const [sessions, omsetRaw] = await Promise.all([
      prisma.liveSession.findMany({
        where: { tanggal: { gte: dayStart, lte: dayEnd } },
        include: {
          user: { include: { role: true } }
        }
      }),
      prisma.pemasukan.findMany({
        where: { 
          tanggal: { gte: dayStart, lte: dayEnd },
          talentId: { not: null }
        },
        include: {
          talent: { select: { id: true, name: true } }
        }
      })
    ]);

    // Grouping omset per talent
    const talentStats = omsetRaw.reduce((acc: any, curr: any) => {
      const tid = curr.talentId;
      if (!acc[tid]) {
        acc[tid] = { 
          id: tid, 
          name: curr.talent?.name || "Unknown", 
          total: 0,
          count: 0
        };
      }
      acc[tid].total += curr.hargaFinal;
      acc[tid].count += 1;
      return acc;
    }, {});

    const formattedSessions = sessions.map((s: any) => ({
      ...s,
      user: {
        ...s.user,
        role: s.user.role?.slug?.toUpperCase() || "USER"
      }
    }));

    return NextResponse.json({
      sessions: formattedSessions || [],
      performance: Object.values(talentStats)
    });
  } catch (err: any) {
    console.error("LIVE_SESSIONS_GET_ERROR:", err);
    return NextResponse.json({ error: err.message, details: "Gagal mengambil data live session" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role?.toUpperCase() !== 'ADMIN') {
        return NextResponse.json({ error: "Forbidden: Admin Only" }, { status: 403 });
    }

    const { userId, date, durasi, keterangan } = await request.json();
    const targetDate = date ? new Date(date) : new Date();
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // Cari apakah sudah ada record untuk user ini di hari yang sama
    const existing = await prisma.liveSession.findFirst({
        where: {
            userId,
            tanggal: { gte: dayStart, lte: dayEnd }
        }
    });

    if (existing) {
        // Gabungkan durasi dan keterangan
        const updated = await prisma.liveSession.update({
            where: { id: existing.id },
            data: {
                durasi: { increment: parseFloat(durasi) },
                keterangan: existing.keterangan 
                    ? (keterangan ? `${existing.keterangan}, ${keterangan}` : existing.keterangan)
                    : (keterangan || null)
            }
        });
        return NextResponse.json(updated, { status: 200 });
    }

    const newSession = await prisma.liveSession.create({
      data: {
        userId,
        tanggal: dayStart, // Simpan di awal hari agar pengecekan konsisten
        durasi: parseFloat(durasi),
        keterangan
      }
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
    try {
      const session = await auth();
      if (!session || (session.user as any).role?.toUpperCase() !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
  
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "ID Required" }, { status: 400 });
  
      await prisma.liveSession.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
