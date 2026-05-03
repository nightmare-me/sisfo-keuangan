import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Data harus berupa array" }, { status: 400 });
    }

    // 1. PRE-FETCH DATA MASTER
    const [allCS, allPrograms, allUsers, allSiswa] = await Promise.all([
      prisma.user.findMany({
        where: { role: { slug: { in: ["cs", "admin"] } } },
        select: { id: true, name: true, namaPanggilan: true }
      }),
      prisma.program.findMany({ select: { id: true, nama: true } }),
      prisma.user.findMany({ 
        select: { id: true, name: true, namaPanggilan: true } 
      }),
      prisma.siswa.findMany({ select: { id: true, nama: true, telepon: true } })
    ]);

    const siswaCache = new Map();
    allSiswa.forEach(s => siswaCache.set(`${s.nama.toLowerCase()}|${s.telepon || ""}`, s.id));

    const programCache = new Map();
    const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    allPrograms.forEach(p => programCache.set(cleanStr(p.nama), p.id));

    let countSiswa = await prisma.siswa.count();
    const recordsToCreate: any[] = [];
    const errors: any[] = [];

    // HELPER PENCARIAN KOLOM YANG LEBIH CERDAS
    const getVal = (item: any, keys: string[]) => {
      const cleanKeys = keys.map(k => cleanStr(k));
      const foundKey = Object.keys(item).find(k => cleanKeys.includes(cleanStr(k)));
      return foundKey ? item[foundKey] : null;
    };

    // 2. TAHAP 1: PRE-PROCESS
    for (let i = 0; i < body.length; i++) {
      const item = body[i];
      try {
        const sName = String(getVal(item, ["siswa", "nama_siswa", "nama"]) || "").trim();
        if (!sName) continue;

        const rawWA = getVal(item, ["whatsapp", "wa", "nomor_wa"]);
        const cleanWA = ((p: any) => {
          if (!p) return "";
          let s = String(p).trim();
          if (s.toUpperCase().includes('E')) {
            const num = Number(s);
            if (!isNaN(num)) s = num.toLocaleString('fullwide', {useGrouping:false});
          }
          let cleaned = s.replace(/[^0-9]/g, "");
          if (cleaned.startsWith("62")) cleaned = "0" + cleaned.slice(2);
          else if (cleaned.startsWith("8")) cleaned = "0" + cleaned;
          return cleaned;
        })(rawWA);

        // Logic Tanggal (DIPINDAH KE ATAS AGAR BISA DIGUNAKAN UNTUK SISWA)
        let tgl = new Date();
        const tglIn = getVal(item, ["tanggal", "date"]);
        if (tglIn) {
          const s = String(tglIn).trim();
          if (/^\d+$/.test(s) && parseInt(s) > 10000) tgl = new Date((parseInt(s) - 25569) * 86400 * 1000);
          else if (s.includes("/")) {
            const p = s.split("/");
            if (p.length === 3) tgl = new Date(parseInt(p[2].length === 2 ? "20"+p[2] : p[2]), parseInt(p[1])-1, parseInt(p[0]));
          } else {
            const d = new Date(s);
            if (!isNaN(d.getTime())) tgl = d;
          }
        }
        if (isNaN(tgl.getTime()) || tgl.getFullYear() < 2000) tgl = new Date();

        // Cari Siswa
        const sKey = `${sName.toLowerCase()}|${cleanWA}`;
        let sId = siswaCache.get(sKey);

        const kUsiaRaw = String(getVal(item, ["kategori_usia", "usia", "category"]) || "DEWASA").toUpperCase();
        let kUsia: any = "DEWASA";
        if (kUsiaRaw.includes("KID")) kUsia = "KIDS";
        else if (kUsiaRaw.includes("UMUM")) kUsia = "UMUM";

        if (!sId) {
          const matchByName = allSiswa.find(s => s.nama.toLowerCase() === sName.toLowerCase() && (!cleanWA || s.telepon === cleanWA));
          if (matchByName) {
            sId = matchByName.id;
          } else {
            countSiswa++;
            const newS = await prisma.siswa.create({
              data: { 
                noSiswa: `S${countSiswa.toString().padStart(4, '0')}`, 
                nama: sName, 
                telepon: cleanWA || null,
                kategoriUsia: kUsia,
                createdAt: tgl // SINKRONKAN TANGGAL SISWA DENGAN TRANSAKSI
              }
            });
            sId = newS.id;
            allSiswa.push(newS);
            siswaCache.set(sKey, sId);
          }
        }

        // Cari Program
        const pName = String(getVal(item, ["program", "produk"]) || "").trim();
        const pKey = cleanStr(pName);
        let pId = programCache.get(pKey);

        const sharingProfitInput = String(getVal(item, ["sharing_profit", "issharingprofit", "profitsharing"]) || "0");
        const isSharing = sharingProfitInput === "1" || sharingProfitInput.toLowerCase() === "true";

        // CARI TALENT JIKA ADA (Hanya yang punya Role Talent/Pengajar)
        let talentId: string | null = null;
        const talentNameRaw = String(getVal(item, ["talent", "namatalent", "nama_talent"]) || "").trim();
        if (talentNameRaw) {
          const matchedTalent = await prisma.user.findFirst({
            where: {
              AND: [
                {
                  OR: [
                    { name: { contains: talentNameRaw, mode: 'insensitive' } },
                    { email: { contains: talentNameRaw, mode: 'insensitive' } }
                  ]
                },
                {
                  roles: {
                    some: {
                      roleName: { in: ["TALENT", "PENGAJAR"] }
                    }
                  }
                },
                { aktif: true }
              ]
            }
          });
          if (matchedTalent) talentId = matchedTalent.id;
        }

        if (!pId && pName !== "") {
          const newP = await prisma.program.create({
            data: { 
              nama: pName.toUpperCase().trim(), 
              harga: 0, 
              tipe: 'LAINNYA',
              isProfitSharing: isSharing
            }
          });
          pId = newP.id;
          programCache.set(pKey, pId);
        } else if (pId && isSharing) {
          // OPTIMASI: Update status profit sharing jika di excel ditandai 1
          await prisma.program.update({
            where: { id: pId },
            data: { isProfitSharing: true }
          });
        }

        // Cari CS & Talent (Hanya jika ada isinya)
        const csSearch = String(getVal(item, ["cs", "nama_cs"]) || "").trim().toLowerCase();
        let csId = null;
        if (csSearch !== "" && csSearch !== "null" && csSearch !== "—") {
          const foundCS = allCS.find(c => 
            (c.name||"").toLowerCase().includes(csSearch) || 
            (c.namaPanggilan||"").toLowerCase().includes(csSearch)
          );
          csId = foundCS?.id || null;
        }

        const talSearch = String(getVal(item, ["talent", "host"]) || "").trim().toLowerCase();
        let talId = null;
        if (talSearch !== "" && talSearch !== "null" && talSearch !== "—") {
          const foundTal = allUsers.find(u => 
            (u.name||"").toLowerCase().includes(talSearch) || 
            (u.namaPanggilan||"").toLowerCase().includes(talSearch)
          );
          talId = foundTal?.id || null;
        }

        // HARGA & DISKON
        const hNorm = parseFloat(String(getVal(item, ["harga_normal", "harga", "nominal"]) || "0"));
        const disk = parseFloat(String(getVal(item, ["diskon", "potongan"]) || "0"));
        const tot = parseFloat(String(getVal(item, ["total", "totalbayar", "hargafinal"]) || "0"));
        const finalP = tot > 0 ? tot : (hNorm - disk);
        
        let met = String(getVal(item, ["metode", "metode_bayar", "payment"]) || "TRANSFER").toUpperCase();
        if (!["TRANSFER", "QRIS", "CASH"].includes(met)) met = "TRANSFER";

        // 4. LOGIKA KATEGORI UNTUK LABEL KETERANGAN (Murni 6 Aturan Emas)
        let prodT = "REGULAR";
        const pUpper = pName.toUpperCase();
        if (pUpper.includes("LIVE")) prodT = "LIVE";
        else if (pUpper.includes("SOSMED") || pUpper.includes("VIRAL")) prodT = "SOSMED";
        else if (pUpper.includes("AFFILIATE")) prodT = "AFFILIATE";
        else if (pUpper.includes("TOEFL") || pUpper.includes("IELTS")) prodT = "TOEFL";
        else if (pUpper.includes("ELITE")) prodT = "ELITE";
        else if (pUpper.includes("MASTER")) prodT = "MASTER";

        // 5. CREATE PEMASUKAN LANGSUNG (Agar jika satu gagal, tidak mematikan semua)
        await prisma.pemasukan.create({
          data: {
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
          }
        });

        recordsToCreate.push({ success: true }); // Dummy for counting
      } catch (err: any) {
        errors.push({ line: i + 1, error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: recordsToCreate.length,
      message: `Berhasil mengimpor ${recordsToCreate.length} data. Gagal: ${errors.length}`,
      errors: errors.slice(0, 10)
    });

  } catch (error: any) {
    console.error("BULK_IMPORT_ERROR:", error);
    return NextResponse.json({ error: "Gagal import data", details: error.message }, { status: 500 });
  }
}
