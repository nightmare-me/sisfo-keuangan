import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/utils";

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

    let successCount = 0;
    
    for (const item of data) {
      try {
        if (!item.nama_siswa || !item.tanggal) continue;

        // Matching Student
        const sName = item.nama_siswa.toLowerCase().trim();
        const targetSiswa = allSiswa.find((s: any) => s.nama.toLowerCase() === sName);
        if (!targetSiswa) continue;

        // Matching Program
        const pName = item.program?.toLowerCase().trim();
        const targetProgram = allPrograms.find((p: any) => 
          p.nama.toLowerCase().includes(pName) || 
          pName?.includes(p.nama.toLowerCase())
        );

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
              tanggal: new Date(item.tanggal),
              siswaId: targetSiswa.id,
              programId: targetProgram?.id,
              csId: finalCSId,
              hargaNormal,
              diskon,
              hargaFinal,
              isRO: !!item.ro,
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
