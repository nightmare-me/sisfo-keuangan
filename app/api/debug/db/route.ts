import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const totalPengeluaran = await prisma.pengeluaran.aggregate({
      _sum: { jumlah: true }
    });

    const pengeluaranTerakhir = await prisma.pengeluaran.findMany({
      orderBy: { tanggal: 'desc' },
      take: 10
    });
    
    return NextResponse.json({
      status: "OK",
      totalDb: totalPengeluaran._sum.jumlah || 0,
      recent: pengeluaranTerakhir
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "ERROR",
      message: error.message
    }, { status: 500 });
  }
}
