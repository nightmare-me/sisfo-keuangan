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
    // Catatan: Talent di schema Bapak ternyata disimpan di tabel 'User'
    const [allCS, allPrograms, allUsers, allSiswa] = await Promise.all([
      prisma.user.findMany({
        where: { role: { slug: { in: ["cs", "admin"] } } },
        select: { id: true, name: true, namaPanggilan: true }
      }),
      prisma.program.findMany({ select: { id: true, nama: true } }),
      prisma.user.findMany({ 
        select: { id: true, name: true, namaPanggilan: true } 
      }), // Ambil semua user untuk pencarian Talent
      prisma.siswa.findMany({ select: { id: true, nama: true, telepon: true } })
    ]);

    const siswaCache = new Map();
    allSiswa.forEach(s => siswaCache.set(`${s.nama.toLowerCase()}|${s.telepon || ""}`, s.id));

    const programCache = new Map();
    allPrograms.forEach(p => programCache.set(p.nama.toLowerCase().replace(/[^a-z0-9]/g, ""), p.id));

    let countSiswa = await prisma.siswa.count();
    const recordsToCreate: any[] = [];
    const errors: any[] = [];

    // Helper untuk cari value di CSV
    const getVal = (item: any, keys: string[]) => {
      const key = Object.keys(item).find(k => {
        const cleanK = k.trim().toLowerCase().replace(/_/g, "");
        return keys.some(kn => cleanK === kn.toLowerCase());
      });
      return key ? item[key] : null;
    };

    // 2. TAHAP 1: PRE-PROCESS
    for (let i = 0; i < body.length; i++) {
      const item = body[i];
      try {
        const sName = String(getVal(item, ["siswa", "namasiswa", "nama"]) || "").trim();
        if (!sName) continue;

        const rawWA = getVal(item, ["whatsapp", "wa", "nomorwa"]);
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

        // Cari Siswa
        const sKey = `${sName.toLowerCase()}|${cleanWA}`;
        let sId = siswaCache.get(sKey);

        if (!sId) {
          const matchByName = allSiswa.find(s => s.nama.toLowerCase() === sName.toLowerCase() && (!cleanWA || s.telepon === cleanWA));
          if (matchByName) {
            sId = matchByName.id;
          } else {
            countSiswa++;
            const newS = await prisma.siswa.create({
              data: { noSiswa: `S${countSiswa.toString().padStart(4, '0')}`, nama: sName, telepon: cleanWA || null }
            });
            sId = newS.id;
            allSiswa.push(newS);
            siswaCache.set(sKey, sId);
          }
        }

        // Cari Program
        const pName = String(getVal(item, ["program", "produk"]) || "").trim();
        const pKey = pName.toLowerCase().replace(/[^a-z0-9]/g, "");
        let pId = programCache.get(pKey);

        if (!pId && pName !== "") {
          const newP = await prisma.program.create({
            data: { nama: pName.toUpperCase().trim(), harga: 0, tipe: 'LAINNYA' }
          });
          pId = newP.id;
          programCache.set(pKey, pId);
        }

        // Cari CS & Talent (Keduanya dari tabel User)
        const csN = String(getVal(item, ["cs", "nama_cs"]) || "").trim();
        const cs = allCS.find(c => (c.name||"").toLowerCase().includes(csN.toLowerCase()) || (c.namaPanggilan||"").toLowerCase().includes(csN.toLowerCase()));

        const talN = String(getVal(item, ["talent", "host"]) || "").trim();
        const tal = allUsers.find(u => (u.name||"").toLowerCase().includes(talN.toLowerCase()) || (u.namaPanggilan||"").toLowerCase().includes(talN.toLowerCase()));

        // Logic Tanggal
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

        const hNorm = parseFloat(String(getVal(item, ["harga_normal", "nominal"]) || "0"));
        const disk = parseFloat(String(getVal(item, ["diskon"]) || "0"));
        const tot = parseFloat(String(getVal(item, ["total", "totalbayar", "hargafinal"]) || "0"));
        const finalP = tot > 0 ? tot : (hNorm - disk);
        
        let met = String(getVal(item, ["metode", "payment"]) || "TRANSFER").toUpperCase();
        if (!["TRANSFER", "QRIS", "CASH"].includes(met)) met = "TRANSFER";

        let prodT = "REGULAR";
        if (pName.toUpperCase().includes("ELITE")) prodT = "ELITE";
        else if (pName.toUpperCase().includes("MASTER")) prodT = "MASTER";
        else if (pName.toUpperCase().includes("TOEFL") || pName.toUpperCase().includes("IELTS")) prodT = "TOEFL";

        recordsToCreate.push({
          tanggal: tgl,
          siswaId: sId,
          programId: pId,
          csId: cs?.id || null,
          talentId: tal?.id || null,
          hargaNormal: hNorm || finalP || 0,
          diskon: disk || 0,
          hargaFinal: finalP,
          metodeBayar: met,
          keterangan: `[TYPE:${prodT}] ${getVal(item, ["keterangan"]) || ""}`.trim(),
          isRO: String(getVal(item, ["ro", "isro"]) || "").toLowerCase() === "true" || getVal(item, ["ro"]) === "1" || getVal(item, ["ro"]) === 1,
        });

      } catch (err: any) {
        errors.push({ line: i + 1, error: err.message });
      }
    }

    // 3. TAHAP 2: BULK INSERT
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
      errors: errors.slice(0, 10)
    });

  } catch (error: any) {
    console.error("BULK_IMPORT_ERROR:", error);
    return NextResponse.json({ error: "Gagal import data", details: error.message }, { status: 500 });
  }
}
