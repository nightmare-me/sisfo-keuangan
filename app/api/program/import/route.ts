import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role?.toUpperCase();
  if (role !== "ADMIN") return NextResponse.json({ error: "Hanya Admin yang bisa mengimpor data" }, { status: 403 });

  try {
    const body = await request.json();
    
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Format data tidak valid" }, { status: 400 });
    }

    const createdPrograms = [];
    
    for (const item of body) {
      // Basic validation
      if (!item.nama || !item.harga) continue;

      const program = await prisma.program.create({
        data: {
          nama: item.nama,
          deskripsi: item.deskripsi || null,
          tipe: item.tipe || "REGULAR",
          harga: parseFloat(item.harga) || 0,
          kategoriFee: item.kategoriFee || "REG_1B",
          durasi: item.durasi || null,
          feeClosing: parseFloat(item.feeClosing) || 0,
          feeClosingRO: parseFloat(item.feeClosingRO) || 0,
          isProfitSharing: item.isProfitSharing === "true" || item.isProfitSharing === true,
          aktif: true,
        }
      });
      createdPrograms.push(program);
    }

    await recordLog(
      (session.user as any).id,
      "Import Program CSV",
      "BATCH",
      `Berhasil mengimpor ${createdPrograms.length} program baru.`
    );

    return NextResponse.json({ success: true, count: createdPrograms.length });
  } catch (error: any) {
    console.error("IMPORT_PROGRAM_ERROR:", error);
    return NextResponse.json({ error: "Gagal memproses impor", details: error.message }, { status: 500 });
  }
}
