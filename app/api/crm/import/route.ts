import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const role = (session.user as any).role?.toUpperCase();

  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Data must be an array" }, { status: 400 });
    }

    const allPrograms = await prisma.program.findMany();
    let successCount = 0;
    
    // Helper fuzzy header matching
    const getValue = (item: any, keys: string[]) => {
      const itemKeys = Object.keys(item);
      for (const k of keys) {
        const found = itemKeys.find(ik => 
          ik.toLowerCase().replace(/[\s_]/g, '') === k.toLowerCase().replace(/[\s_]/g, '')
        );
        if (found) return item[found];
      }
      for (const k of keys) {
        const found = itemKeys.find(ik => ik.toLowerCase().includes(k.toLowerCase()));
        if (found) return item[found];
      }
      return null;
    };

    // Helper format WA (Recover from 6.28E+12)
    const formatWA = (val: any) => {
      if (!val) return "";
      let str = String(val).trim();
      
      // Handle scientific notation (Excel E+12)
      if (str.includes("E+") || str.includes("e+")) {
        str = Number(str).toLocaleString('fullwide', {useGrouping:false});
      }
      
      let cleaned = str.replace(/\D/g, "");
      if (cleaned.startsWith("0")) cleaned = "62" + cleaned.substring(1);
      if (cleaned.startsWith("8")) cleaned = "62" + cleaned;
      return cleaned;
    };

    for (const item of body) {
      try {
        const rawNama = getValue(item, ["nama", "nama_siswa", "name", "student"]);
        const rawWA = getValue(item, ["whatsapp", "wa", "no_wa", "phone"]);
        const rawProgram = getValue(item, ["program", "produk", "product"]);
        const rawPreferensi = getValue(item, ["preferensi", "jadwal", "preference"]);
        const rawTanggal = getValue(item, ["tanggal", "date", "tgl"]);

        if (!rawNama) continue;

        const wa = formatWA(rawWA);
        const pName = String(rawProgram || "").trim();
        
        let targetProgram = allPrograms.find((p: any) => 
          p.nama.toLowerCase() === pName.toLowerCase() ||
          p.nama.toLowerCase().includes(pName.toLowerCase()) ||
          pName.toLowerCase().includes(p.nama.toLowerCase())
        );

        // Auto-create program if not found
        if (!targetProgram && pName) {
          targetProgram = await prisma.program.create({
            data: { nama: pName, harga: 0, tipe: "REGULAR", deskripsi: "Auto-Import" }
          });
          allPrograms.push(targetProgram);
        }

        const parseDate = (d: any) => {
          if (!d) return new Date();
          const s = String(d);
          if (s.includes("/")) {
            const p = s.split("/");
            if (p.length === 3) return new Date(`${p[2]}-${p[1]}-${p[0]}`);
          }
          const parsed = new Date(s);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        };

        await prisma.lead.create({
          data: {
            nama: String(rawNama).trim(),
            whatsapp: wa,
            programId: targetProgram?.id,
            preferensiJadwal: rawPreferensi ? String(rawPreferensi) : null,
            csId: role === "CS" ? userId : undefined,
            status: "NEW",
            tanggalLead: parseDate(rawTanggal),
            sumber: "IMPORT_CSV",
          }
        });
        
        successCount++;
      } catch (err) {
        console.error("Row import error:", err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengimpor ${successCount} leads.` 
    });

  } catch (error: any) {
    console.error("Fatal CRM import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
