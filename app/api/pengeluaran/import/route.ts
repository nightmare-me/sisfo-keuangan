import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const KATEGORI_MAP: Record<string, string> = {
  "GAJI PENGAJAR": "GAJI_PENGAJAR",
  "GAJI STAF": "GAJI_STAF",
  "SEWA TEMPAT": "SEWA_TEMPAT",
  "UTILITAS": "UTILITAS",
  "ATK": "ATK",
  "MARKETING": "MARKETING",
  "PERALATAN": "PERALATAN",
  "PEMELIHARAAN": "PEMELIHARAAN",
  "LAINNYA": "LAINNYA"
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Data must be an array" }, { status: 400 });
    }

    let successCount = 0;
    
    for (const item of data) {
      try {
        if (!item.jumlah || !item.tanggal) continue;

        // Map category
        let category = item.kategori?.toUpperCase().replace(/\s+/g, "_") || "LAINNYA";
        if (KATEGORI_MAP[item.kategori?.toUpperCase()]) {
          category = KATEGORI_MAP[item.kategori.toUpperCase()];
        }

        await prisma.pengeluaran.create({
          data: {
            tanggal: new Date(item.tanggal),
            kategori: category as any,
            jumlah: parseFloat(item.jumlah),
            metodeBayar: ["CASH", "TRANSFER"].includes(item.metode?.toUpperCase()) ? item.metode.toUpperCase() : "CASH",
            keterangan: item.keterangan || "Mass imported",
            dibuatOleh: userId
          }
        });

        successCount++;
      } catch (err) {
        console.error("Expense import item error:", err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengimpor ${successCount} data pengeluaran.` 
    });

  } catch (error: any) {
    console.error("Fatal Expense import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
