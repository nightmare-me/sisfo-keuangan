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
    const allUsers = await prisma.user.findMany({ where: { role: { slug: "cs" } } });

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
    let failCount = 0;

    // Helper to find value in item with fuzzy header
    const getValue = (item: any, keys: string[]) => {
      const itemKeys = Object.keys(item);
      for (const k of keys) {
        const found = itemKeys.find(ik => 
          ik.toLowerCase().replace(/[\s_]/g, '') === k.toLowerCase().replace(/[\s_]/g, '')
        );
        if (found) return item[found];
      }
      // Last resort: check if key is in the string at all
      for (const k of keys) {
        const found = itemKeys.find(ik => ik.toLowerCase().includes(k.toLowerCase()));
        if (found) return item[found];
      }
      return null;
    };

    if (data.length > 0) {
      const fs = require('fs');
      const debugInfo = {
        timestamp: new Date().toISOString(),
        firstRowKeys: Object.keys(data[0]),
        firstRowValues: data[0],
        totalRows: data.length
      };
      fs.writeFileSync('c:\\Users\\Muis M\\.gemini\\antigravity\\scratch\\sisfo-keuangan\\scratch\\import_debug.log', JSON.stringify(debugInfo, null, 2));
      console.log("Importing Pemasukan. Debug info written to scratch/import_debug.log");
    }

    for (const item of data) {
      try {
        const rawNamaSiswa = getValue(item, ["nama_siswa", "nama", "siswa", "student"]);
        const rawProgram = getValue(item, ["program", "produk", "product"]);
        const rawNominal = getValue(item, ["nominal", "harga_normal", "harga", "total", "bayar", "amount", "price"]);
        const rawTanggal = getValue(item, ["tanggal", "date", "tgl"]);
        const rawCS = getValue(item, ["cs", "nama_cs", "marketing", "sales"]);
        const rawRO = getValue(item, ["ro", "repeat_order", "repeat"]);
        const rawKeterangan = getValue(item, ["keterangan", "note", "keterangan_tambahan"]);
        const rawMetode = getValue(item, ["metode", "metode_bayar", "payment"]);

        if (!rawNamaSiswa) {
          failCount++;
          continue;
        }

        const sName = String(rawNamaSiswa).trim();
        let targetSiswa = allSiswa.find((s: any) => s.nama.toLowerCase() === sName.toLowerCase());
        
        if (!targetSiswa && sName) {
           targetSiswa = await prisma.siswa.create({
             data: { nama: sName, noSiswa: generateSiswaNumber(), status: "AKTIF" }
           });
           allSiswa.push(targetSiswa);
        }
        
        if (!targetSiswa) continue;

        const pName = String(rawProgram || "").trim();
        let targetProgram = allPrograms.find((p: any) => 
          p.nama.toLowerCase() === pName.toLowerCase() ||
          p.nama.toLowerCase().includes(pName.toLowerCase()) ||
          pName.toLowerCase().includes(p.nama.toLowerCase())
        );

        if (!targetProgram && pName) {
           targetProgram = await prisma.program.create({
             data: { nama: pName, harga: parseFloat(String(rawNominal || 0)) || 0, tipe: "REGULAR", deskripsi: "Otomatis" }
           });
           allPrograms.push(targetProgram);
        }

        let finalCSId = role === "CS" ? userId : undefined;
        if (rawCS) {
           const targetCS = allUsers.find((u: any) => u.name?.toLowerCase().includes(String(rawCS).toLowerCase()));
           if (targetCS) finalCSId = targetCS.id;
        }

        const nominal = parseFloat(String(rawNominal || 0)) || 0;

        await prisma.$transaction(async (tx: any) => {
          const pemasukan = await tx.pemasukan.create({
            data: {
              tanggal: parseDate(String(rawTanggal || "")),
              siswaId: targetSiswa.id,
              programId: targetProgram?.id,
              csId: finalCSId,
              hargaNormal: nominal,
              diskon: 0,
              hargaFinal: nominal,
              isRO: String(rawRO).toLowerCase() === "true" || rawRO === "1" || rawRO === 1,
              metodeBayar: ["CASH", "TRANSFER", "QRIS"].includes(String(rawMetode || "").toUpperCase()) ? String(rawMetode).toUpperCase() : "CASH",
              keterangan: String(rawKeterangan || "Imported massal"),
            }
          });

          const pendingLead = await tx.lead.findFirst({
            where: { 
              nama: { equals: targetSiswa.nama, mode: 'insensitive' },
              status: { not: "PAID" } 
            },
            orderBy: { createdAt: "desc" }
          });

          if (pendingLead) {
            await tx.lead.update({ where: { id: pendingLead.id }, data: { status: "PAID" } });
          }

          await tx.invoice.create({
            data: {
              pemasukanId: pemasukan.id,
              noInvoice: generateInvoiceNumber(),
              siswaId: targetSiswa.id,
              tanggal: parseDate(String(rawTanggal || "")),
              total: nominal,
              totalFinal: nominal,
              statusBayar: "LUNAS"
            }
          });
        });
        successCount++;
      } catch (err: any) {
        if (failCount === 0) {
          const fs = require('fs');
          const errorLog = {
            error: err.message,
            stack: err.stack,
            item: item
          };
          fs.appendFileSync('c:\\Users\\Muis M\\.gemini\\antigravity\\scratch\\sisfo-keuangan\\scratch\\import_debug.log', "\n\nFIRST ERROR:\n" + JSON.stringify(errorLog, null, 2));
        }
        failCount++;
        console.error("Row import error:", err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: successCount, 
      failed: failCount,
      message: `Berhasil mengimpor ${successCount} data pemasukan & invoice.` 
    });

  } catch (error: any) {
    console.error("Fatal Income import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
