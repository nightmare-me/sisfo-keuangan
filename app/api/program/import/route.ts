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
      if (!item.nama || !item.harga) continue;

      const program = await prisma.program.upsert({
        where: { id: item.id || 'none' }, // Try by ID if provided, otherwise check by name in next step
        update: {
          deskripsi: item.deskripsi || undefined,
          tipe: item.tipe || undefined,
          harga: parseFloat(item.harga) || undefined,
          kategoriFee: item.kategoriFee || undefined,
          durasi: item.durasi || undefined,
          feeClosing: parseFloat(item.feeClosing) || undefined,
          feeClosingRO: parseFloat(item.feeClosingRO) || undefined,
          isProfitSharing: item.isProfitSharing === "true" || item.isProfitSharing === true,
        },
        create: {
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
      }).catch(async () => {
        // Fallback: If no ID or ID not found, check by Name (manual upsert)
        const existing = await prisma.program.findFirst({
          where: { nama: { equals: item.nama, mode: 'insensitive' } }
        });

        if (existing) {
          return await prisma.program.update({
            where: { id: existing.id },
            data: {
              deskripsi: item.deskripsi || undefined,
              tipe: item.tipe || undefined,
              harga: parseFloat(item.harga) || undefined,
              kategoriFee: item.kategoriFee || undefined,
              durasi: item.durasi || undefined,
              feeClosing: parseFloat(item.feeClosing) || undefined,
              feeClosingRO: parseFloat(item.feeClosingRO) || undefined,
              isProfitSharing: item.isProfitSharing === "true" || item.isProfitSharing === true,
            }
          });
        } else {
          return await prisma.program.create({
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
