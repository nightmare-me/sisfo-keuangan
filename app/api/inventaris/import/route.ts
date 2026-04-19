import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Data must be an array" }, { status: 400 });
    }

    let successCount = 0;
    
    for (const item of data) {
      try {
        if (!item.nama) continue;

        const jumlah = parseInt(item.jumlah || 0);
        const hargaBeli = item.hargabeli ? parseFloat(item.hargabeli) : null;
        const stokMinimum = parseInt(item.stokminimum || 1);
        const tglBeli = item.tanggalbeli ? new Date(item.tanggalbeli) : null;

        // Ensure valid condition
        let kondisi = item.kondisi?.toUpperCase().replace(/\s+/g, "_") || "BAIK";
        if (!["BAIK", "RUSAK_RINGAN", "RUSAK_BERAT"].includes(kondisi)) {
          kondisi = "BAIK";
        }

        await prisma.inventaris.create({
          data: {
            nama: item.nama.trim(),
            kategori: item.kategori?.trim() || "LAINNYA",
            jumlah,
            satuan: item.satuan?.trim() || "pcs",
            hargaBeli,
            kondisi: kondisi as any,
            tanggalBeli: isNaN(tglBeli?.getTime()!) ? null : tglBeli,
            keterangan: item.keterangan?.trim() || "Imported massal",
            stokMinimum
          }
        });

        successCount++;
      } catch (err) {
        console.error("Inventory import item error:", err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengimpor ${successCount} item inventaris.` 
    });

  } catch (error: any) {
    console.error("Fatal Inventory import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
