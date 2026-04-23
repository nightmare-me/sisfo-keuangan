import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInvoiceNumber, generateSiswaNumber } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const role = (session.user as any).role?.toUpperCase();

  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Data must be an array" }, { status: 400 });
    }

    // Pre-load lookup data
    const allPrograms = await prisma.program.findMany();
    const allSiswa = await prisma.siswa.findMany();
    const allCS = await prisma.user.findMany({
      where: { role: { slug: "cs" } },
      select: { id: true, name: true },
    });

    const parseDate = (dateStr: string) => {
      if (!dateStr || dateStr.trim() === "") return new Date();
      
      try {
        // Handle DD/MM/YYYY
        if (dateStr.includes("/")) {
          const parts = dateStr.split("/");
          if (parts.length === 3) {
            const d = parts[0].padStart(2, "0");
            const m = parts[1].padStart(2, "0");
            const y = parts[2];
            const parsed = new Date(`${y}-${m}-${d}`);
            if (!isNaN(parsed.getTime())) return parsed;
          }
        }
        
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date() : d;
      } catch (e) {
        return new Date();
      }
    };

    let successCount = 0;
    
    for (const item of data) {
      try {
        if (!item.nama_siswa || !item.tanggal) continue;

        // Matching Student
        const sName = item.nama_siswa.trim();
        let targetSiswa = allSiswa.find((s: any) => s.nama.toLowerCase() === sName.toLowerCase());
        
        // AUTO-CREATE SISWA jika tidak ditemukan
        if (!targetSiswa && sName) {
           try {
             targetSiswa = await prisma.siswa.create({
               data: {
                 nama: sName,
                 noSiswa: generateSiswaNumber(),
                 status: "AKTIF"
               }
             });
             // Tambahkan ke list agar baris berikutnya jika ada nama yang sama bisa matching
             allSiswa.push(targetSiswa);
           } catch (e) {
             console.error("Auto-create siswa failed:", e);
           }
        }
        
        if (!targetSiswa) continue;

        // Matching Program
        const pName = item.program?.trim();
        let targetProgram = allPrograms.find((p: any) => 
          p.nama.toLowerCase() === pName?.toLowerCase() ||
          p.nama.toLowerCase().includes(pName?.toLowerCase() || "") || 
          pName?.toLowerCase().includes(p.nama.toLowerCase())
        );

        // AUTO-CREATE PROGRAM jika tidak ditemukan
        if (!targetProgram && pName) {
           try {
             targetProgram = await prisma.program.create({
               data: {
                 nama: pName,
                 harga: parseFloat(item.harga_normal || 0),
                 deskripsi: "Otomatis dibuat dari Import CSV",
                 tipe: "REGULAR"
               }
             });
             // Tambahkan ke list allPrograms agar baris berikutnya bisa matching
             allPrograms.push(targetProgram);
           } catch (e) {
             console.error("Auto-create program failed:", e);
           }
        }

        // Matching CS (Pencarian otomatis CS berdasarkan nama di CSV)
        let finalCSId = role === "CS" ? userId : undefined;
        if (item.nama_cs) {
           const targetCS = allCS.find((u: any) => u.name?.toLowerCase().includes(item.nama_cs.toLowerCase()));
           if (targetCS) finalCSId = targetCS.id;
        }

        const hargaNormal = parseFloat(item.harga_normal || 0);
        const diskon = parseFloat(item.diskon || 0);
        const hargaFinal = Math.max(0, hargaNormal - diskon);

        // Start Transaction for each row
        await prisma.$transaction(async (tx: any) => {
          const pemasukan = await tx.pemasukan.create({
            data: {
              tanggal: parseDate(item.tanggal),
              siswaId: targetSiswa.id,
              programId: targetProgram?.id,
              csId: finalCSId,
              hargaNormal,
              diskon,
              hargaFinal,
              isRO: item.ro === "1" || item.ro === 1 || String(item.ro).toLowerCase() === "true",
              metodeBayar: ["CASH", "TRANSFER", "QRIS"].includes(item.metode?.toUpperCase()) ? item.metode.toUpperCase() : "CASH",
              keterangan: item.keterangan || "Imported massal",
            }
          });

          await tx.invoice.create({
            data: {
              pemasukanId: pemasukan.id,
              noInvoice: generateInvoiceNumber(),
              total: hargaFinal,
              totalFinal: hargaFinal,
              statusBayar: "LUNAS"
            }
          });
        });

        successCount++;
      } catch (err) {
        console.error("Income import item error:", err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengimpor ${successCount} data pemasukan & invoice.` 
    });

  } catch (error: any) {
    console.error("Fatal Income import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
