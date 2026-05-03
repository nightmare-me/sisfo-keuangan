import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Data harus berupa array" }, { status: 400 });
    }

    // 1. PRE-FETCH DATA MASTER (Pindah ke memori untuk kecepatan kilat)
    const [allCS, allPrograms, allUsers, allSiswaCount] = await Promise.all([
      prisma.user.findMany({
        where: { roles: { some: { roleName: { in: ["CS", "ADMIN"] } } } },
        select: { id: true, name: true, namaPanggilan: true }
      }),
      prisma.program.findMany({ select: { id: true, nama: true, isProfitSharing: true } }),
      prisma.user.findMany({ 
        where: { roles: { some: { roleName: { in: ["TALENT", "PENGAJAR"] } } } },
        select: { id: true, name: true, namaPanggilan: true } 
      }),
      prisma.siswa.count()
    ]);

    // Cache untuk mempercepat pencarian
    const programMap = new Map();
    allPrograms.forEach(p => programMap.set(p.nama.toUpperCase().trim(), p.id));

    const csMap = new Map();
    allCS.forEach(c => {
      if (c.name) csMap.set(c.name.toLowerCase().trim(), c.id);
      if (c.namaPanggilan) csMap.set(c.namaPanggilan.toLowerCase().trim(), c.id);
    });

    const talentMap = new Map();
    allUsers.forEach(u => {
      if (u.name) talentMap.set(u.name.toLowerCase().trim(), u.id);
      if (u.namaPanggilan) talentMap.set(u.namaPanggilan.toLowerCase().trim(), u.id);
    });

    const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const getVal = (item: any, keys: string[]) => {
      const cleanKeys = keys.map(k => cleanStr(k));
      const foundKey = Object.keys(item).find(k => cleanKeys.includes(cleanStr(k)));
      return foundKey ? item[foundKey] : null;
    };

    const parseCurrency = (val: any) => {
      if (!val) return 0;
      return parseFloat(String(val).replace(/[^0-9.-]/g, "")) || 0;
    };

    let nextSiswaNumber = allSiswaCount + 1;
    const recordsToCreate: any[] = [];
    const errors: any[] = [];

    // TAHAP 1: SIAPKAN DATA & BUAT SISWA/PROGRAM BARU JIKA PERLU
    // Agar cepat, kita akan kumpulkan dulu apa yang perlu dibuat
    for (let i = 0; i < body.length; i++) {
      const item = body[i];
      try {
        const sName = String(getVal(item, ["siswa", "nama_siswa", "nama"]) || "").trim();
        const sWA = String(getVal(item, ["whatsapp", "wa", "nomor_wa"]) || "").trim();
        const pName = String(getVal(item, ["program", "produk"]) || "").trim();
        
        if (!sName) continue;

        // Cari/Buat Siswa (Pakai pencarian langsung agar akurat)
        let sId: string | null = null;
        const existingSiswa = await prisma.siswa.findFirst({
           where: {
             OR: [
               { nama: { equals: sName, mode: 'insensitive' } },
               { telepon: sWA !== "" ? sWA : undefined }
             ]
           }
        });

        if (existingSiswa) {
          sId = existingSiswa.id;
        } else {
          const newS = await prisma.siswa.create({
            data: {
              noSiswa: `S${(nextSiswaNumber++).toString().padStart(4, '0')}`,
              nama: sName,
              telepon: sWA || null,
              kategoriUsia: "DEWASA"
            }
          });
          sId = newS.id;
        }

        // Cari/Buat Program
        let pId = programMap.get(pName.toUpperCase().trim());
        if (!pId && pName !== "") {
          const sharingProfitInput = String(getVal(item, ["sharing_profit", "issharingprofit", "profitsharing"]) || "0");
          const isSharing = sharingProfitInput === "1" || sharingProfitInput.toLowerCase() === "true";
          
          const newP = await prisma.program.create({
            data: { 
              nama: pName.toUpperCase().trim(),
              isProfitSharing: isSharing
            }
          });
          pId = newP.id;
          programMap.set(pName.toUpperCase().trim(), pId);
        }

        // Cari CS & Talent
        const csSearch = String(getVal(item, ["cs", "nama_cs", "marketing"]) || "").trim().toLowerCase();
        const csId = csMap.get(csSearch) || null;

        const talSearch = String(getVal(item, ["talent", "host", "namatalent"]) || "").trim().toLowerCase();
        const talId = talentMap.get(talSearch) || null;

        // Parsing Lainnya
        const hNorm = parseCurrency(getVal(item, ["harga_normal", "harga", "nominal"]));
        const disk = parseCurrency(getVal(item, ["diskon", "potongan"]));
        const tot = parseCurrency(getVal(item, ["total", "totalbayar", "hargafinal"]));
        const finalP = tot > 0 ? tot : (hNorm - disk);

        let met = String(getVal(item, ["metode", "metode_bayar", "payment"]) || "TRANSFER").toUpperCase();
        if (!["TRANSFER", "QRIS", "CASH"].includes(met)) met = "TRANSFER";

        // Aturan Emas untuk Label
        let prodT = "REGULAR";
        const pUpper = pName.toUpperCase();
        if (pUpper.includes("LIVE")) prodT = "LIVE";
        else if (pUpper.includes("SOSMED") || pUpper.includes("VIRAL")) prodT = "SOSMED";
        else if (pUpper.includes("AFFILIATE")) prodT = "AFFILIATE";
        else if (pUpper.includes("TOEFL") || pUpper.includes("IELTS")) prodT = "TOEFL";

        // Parsing Tanggal
        let tgl = new Date();
        const tglIn = getVal(item, ["tanggal", "date"]);
        if (tglIn) {
          const s = String(tglIn).trim();
          if (/^\d+$/.test(s) && parseInt(s) > 10000) tgl = new Date((parseInt(s) - 25569) * 86400 * 1000);
          else {
            const d = new Date(s);
            if (!isNaN(d.getTime())) tgl = d;
          }
        }

        recordsToCreate.push({
          tanggal: tgl,
          siswaId: sId,
          programId: pId,
          csId: csId,
          talentId: talId,
          hargaNormal: hNorm || finalP || 0,
          diskon: disk || 0,
          hargaFinal: finalP,
          metodeBayar: met,
          isRO: String(getVal(item, ["ro", "isro"]) || "").toLowerCase() === "true" || getVal(item, ["ro"]) === "1" || getVal(item, ["ro"]) === 1,
          keterangan: `[TYPE:${prodT}] ${getVal(item, ["keterangan", "note"]) || ""}`.trim(),
        });

      } catch (err: any) {
        errors.push({ line: i + 1, error: err.message });
      }
    }

    // TAHAP 2: BULK INSERT (Sangat Cepat)
    if (recordsToCreate.length > 0) {
      await prisma.pemasukan.createMany({
        data: recordsToCreate,
        skipDuplicates: false,
      });
    }

    return NextResponse.json({ 
      success: true, 
      count: recordsToCreate.length,
      message: `Berhasil mengimpor ${recordsToCreate.length} data. Gagal: ${errors.length}`,
      errors: errors.slice(0, 5)
    });

  } catch (error: any) {
    console.error("BULK_IMPORT_ERROR:", error);
    return NextResponse.json({ error: "Gagal import data", details: error.message }, { status: 500 });
  }
}
