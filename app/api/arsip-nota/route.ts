import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/arsip-nota - Fetch pengeluaran that have arsip nota
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let dateFilter = {};
    if (startDateParam && endDateParam) {
      dateFilter = {
        tanggal: {
          gte: new Date(startDateParam),
          lte: new Date(endDateParam),
        },
      };
    }

    const pengeluaranDenganNota = await prisma.pengeluaran.findMany({
      where: {
        ...dateFilter,
        arsipNota: {
          some: {}, // Only get pengeluaran that have at least one nota
        },
      },
      include: {
        arsipNota: true,
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        tanggal: "desc",
      },
    });

    return NextResponse.json(pengeluaranDenganNota);
  } catch (error: any) {
    console.error("GET Arsip Nota error:", error);
    return NextResponse.json({ error: "Failed to fetch arsip nota" }, { status: 500 });
  }
}

// POST /api/arsip-nota - Create pengeluaran and attach nota
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jumlah, kategori, keterangan, tanggal, urls } = body;

    if (!jumlah || !kategori || !urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Default to today if tanggal is not provided
    const pengeluaranDate = tanggal ? new Date(tanggal) : new Date();

    const pengeluaran = await prisma.pengeluaran.create({
      data: {
        jumlah: parseFloat(jumlah),
        kategori,
        keterangan,
        tanggal: pengeluaranDate,
        metodeBayar: "CASH", // Defaulting to CASH, can be updated later if needed
        dibuatOleh: (session.user as any).id,
        arsipNota: {
          create: urls.map((url: string) => ({
            urlFile: url,
          })),
        },
      },
      include: {
        arsipNota: true,
      },
    });

    return NextResponse.json({ success: true, pengeluaran }, { status: 201 });
  } catch (error: any) {
    console.error("POST Arsip Nota error:", error);
    return NextResponse.json({ error: "Failed to create arsip nota", details: error.message }, { status: 500 });
  }
}
