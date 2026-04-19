import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateSiswaNumber } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Data must be an array" }, { status: 400 });
    }

    let successCount = 0;
    
    // We process sequentially or in chunks to avoid duplicate noSiswa during generation
    for (const item of data) {
      try {
        if (!item.nama) continue;
        
        const noSiswa = generateSiswaNumber();
        const tglLahir = item.tanggallahir ? new Date(item.tanggallahir) : null;

        await prisma.siswa.create({
          data: {
            noSiswa,
            nama: item.nama.trim(),
            telepon: item.telepon?.toString() || null,
            email: item.email?.toString() || null,
            alamat: item.alamat?.toString() || null,
            tanggalLahir: isNaN(tglLahir?.getTime()!) ? null : tglLahir,
            catatan: item.catatan?.toString() || null,
            status: "AKTIF"
          }
        });
        
        successCount++;
      } catch (err) {
        console.error("Student import item error:", err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengimpor ${successCount} siswa.` 
    });

  } catch (error: any) {
    console.error("Fatal Student import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
