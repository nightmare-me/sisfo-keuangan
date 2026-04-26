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
      // Robust key detection (remove spaces and ignore case)
      const findValue = (keyName: string) => {
        const key = Object.keys(item).find(k => k.trim().toLowerCase() === keyName.toLowerCase());
        return key ? item[key] : null;
      };

      const nama = findValue("nama");
      const harga = findValue("harga");
      
      if (!nama || !harga) continue;

      const isSharing = String(findValue("isProfitSharing") || "").trim().toLowerCase() === "true";

      // 1. Cek apakah sudah ada program dengan nama yang sama (case-insensitive)
      const existing = await prisma.program.findFirst({
        where: { nama: { equals: String(nama), mode: 'insensitive' } }
      });

      let program;
      if (existing) {
        // 2. Jika ada, UPDATE
        program = await prisma.program.update({
          where: { id: existing.id },
          data: {
            deskripsi: findValue("deskripsi") || undefined,
            tipe: findValue("tipe") || undefined,
            harga: parseFloat(String(harga)) || undefined,
            kategoriFee: findValue("kategoriFee") || undefined,
            durasi: findValue("durasi") || undefined,
            feeClosing: parseFloat(String(findValue("feeClosing") || 0)) || undefined,
            feeClosingRO: parseFloat(String(findValue("feeClosingRO") || 0)) || undefined,
            isProfitSharing: isSharing,
            aktif: true,
          }
        });
      } else {
        // 3. Jika tidak ada, CREATE NEW
        program = await prisma.program.create({
          data: {
            nama: String(nama),
            deskripsi: findValue("deskripsi") || null,
            tipe: findValue("tipe") || "REGULAR",
            harga: parseFloat(String(harga)) || 0,
            kategoriFee: findValue("kategoriFee") || "REG_1B",
            durasi: findValue("durasi") || null,
            feeClosing: parseFloat(String(findValue("feeClosing") || 0)) || 0,
            feeClosingRO: parseFloat(String(findValue("feeClosingRO") || 0)) || 0,
            isProfitSharing: isSharing,
            aktif: true,
          }
        });
      }
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
