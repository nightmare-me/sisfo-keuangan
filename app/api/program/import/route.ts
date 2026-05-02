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

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    for (const item of body) {
      try {
        // Robust key detection with ALIASES
        const findValue = (keyName: string, aliases: string[] = []) => {
          const possibleKeys = [keyName, ...aliases].map(a => a.toLowerCase());
          const key = Object.keys(item).find(k => {
            const cleanK = k.trim().toLowerCase();
            return possibleKeys.includes(cleanK);
          });
          return key ? item[key] : null;
        };

        const nama = findValue("nama", ["program", "nama_program", "nama program", "produk"]);
        const hargaRaw = findValue("harga", ["harga_normal", "harga normal", "price", "harga produk"]);
        const harga = parseFloat(String(hargaRaw || 0).replace(/[^0-9.]/g, ''));
        
        if (!nama) {
          results.failed++;
          results.errors.push("Baris tanpa Nama dilewati");
          continue;
        }

        const isSharing = String(findValue("isProfitSharing", ["profit_sharing", "bagi_hasil"]) || "").trim().toLowerCase() === "true";

        // 1. Cek apakah sudah ada program dengan nama yang sama
        const existing = await prisma.program.findFirst({
          where: { nama: { equals: String(nama), mode: 'insensitive' } }
        });

        const programData = {
          deskripsi: String(findValue("deskripsi", ["keterangan", "deskripsi produk"]) || ""),
          tipe: (findValue("tipe", ["type", "jenis"]) || "REGULAR").toUpperCase(),
          harga: harga,
          kategoriFee: findValue("kategoriFee", ["kategori_fee", "fee_type", "skema_fee"]) || "REG_1B",
          durasi: findValue("durasi", ["duration", "masa_aktif", "jangka_waktu"]) || null,
          feeClosing: parseFloat(String(findValue("feeClosing", ["fee_closing", "fee_new", "komisi"]) || 0)) || 0,
          feeClosingRO: parseFloat(String(findValue("feeClosingRO", ["fee_ro", "fee_closing_ro", "komisi_ro"]) || 0)) || 0,
          isProfitSharing: isSharing,
          kategoriUsia: (findValue("kategoriUsia", ["usia", "category", "kategori_usia", "target_usia"]) || "UMUM").toUpperCase() as any,
          aktif: true,
        };

        if (existing) {
          await prisma.program.update({
            where: { id: existing.id },
            data: programData
          });
        } else {
          await prisma.program.create({
            data: {
              nama: String(nama),
              ...programData
            }
          });
        }
        results.success++;
      } catch (rowErr: any) {
        results.failed++;
        results.errors.push(`Gagal memproses "${item.nama || 'Tanpa Nama'}": ${rowErr.message}`);
      }
    }

    await recordLog(
      (session.user as any).id,
      "Import Program CSV",
      "BATCH",
      `Import selesai. Sukses: ${results.success}, Gagal: ${results.failed}.`
    );

    return NextResponse.json({ 
      success: true, 
      count: results.success,
      failed: results.failed,
      errors: results.errors 
    });
  } catch (error: any) {
    console.error("IMPORT_PROGRAM_ERROR:", error);
    return NextResponse.json({ error: "Gagal memproses impor", details: error.message }, { status: 500 });
  }
}
