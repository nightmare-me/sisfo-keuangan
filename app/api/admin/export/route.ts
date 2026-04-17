import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const table = searchParams.get("table");

  if (!table) return NextResponse.json({ error: "Tabel diperlukan" }, { status: 400 });

  try {
    let data: any[] = [];
    
    // @ts-ignore
    if (prisma[table.toLowerCase()]) {
      // @ts-ignore
      data = await prisma[table.toLowerCase()].findMany();
    } else {
        // Fallback for case sensitivity or specific models
        switch(table) {
            case "User": data = await prisma.user.findMany(); break;
            case "Siswa": data = await prisma.siswa.findMany(); break;
            case "Pemasukan": data = await prisma.pemasukan.findMany(); break;
            case "Pengeluaran": data = await prisma.pengeluaran.findMany(); break;
            case "Kelas": data = await prisma.kelas.findMany(); break;
            case "Lead": data = await prisma.lead.findMany(); break;
            default: return NextResponse.json({ error: "Tabel tidak dikenal" }, { status: 404 });
        }
    }

    await recordLog(
      (session.user as any).id,
      "Full Table Export",
      table,
      `Berhasil mengekspor ${data.length} baris data.`
    );

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengekspor data" }, { status: 500 });
  }
}
