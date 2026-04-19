import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const listTable = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    const kategoriCount = await prisma.kategoriPengeluaran.count();
    const categories = await prisma.kategoriPengeluaran.findMany();
    
    return NextResponse.json({
      status: "OK",
      tables: listTable,
      count: kategoriCount,
      data: categories
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "ERROR",
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
