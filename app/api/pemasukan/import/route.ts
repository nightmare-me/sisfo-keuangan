import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Tingkatkan timeout jika di Vercel

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Data harus berupa array" }, { status: 400 });
    }

    // 1. PRE-FETCH DATA (OPTIMASI: Ambil semua di awal agar tidak query di dalam loop)
    const [allCS, allPrograms, allTalents, allSiswa] = await Promise.all([
      prisma.user.findMany({
        where: { OR: [{ role: { slug: "cs" } }, { role: { slug: "admin" } }] },
        select: { id: true, name: true, namaPanggilan: true }
      }),
      prisma.program.findMany({ select: { id: true, nama: true } }),
      prisma.talent.findMany({ select: { id: true, nama: true, namaPanggilan: true } }),
      prisma.siswa.findMany({ select: { id: true, nama: true, telepon: true } })
    ]);

    // Cache untuk mempercepat lookup di memori
    const siswaCache = new Map();
    allSiswa.forEach(s => {
      const key = `${s.nama.toLowerCase()}|${s.telepon || ""}`;
      siswaCache.set(key, s.id);
    });

    const programCache = new Map();
    allPrograms.forEach(p => programCache.set(p.nama.toLowerCase().replace(/[^a-z0-9]/g, ""), p.id));

    let countSiswa = await prisma.siswa.count();
    const results = [];

    // 2. PROSES DATA DALAM LOOP
    for (const item of body) {
      try {
        const findValue = (keyNames: string[]) => {
          const key = Object.keys(item).find(k => {
            const cleanK = k.trim().toLowerCase().replace(/_/g, "");
            return keyNames.some(kn => cleanK === kn.toLowerCase());
          });
          return key ? item[key] : null;
        };

        const siswaName = String(findValue(["siswa", "namasiswa", "studentname", "nama"]) || "").trim();
        if (!siswaName) continue;

        const programName = String(findValue(["program", "namaprogram", "produk"]) || "").trim();
        const csName = String(findValue(["cs", "namacs", "staff", "nama_cs"]) || "").trim();
        const talentName = String(findValue(["talent", "host", "talentname"]) || "").trim();
        
        let hargaNormal = parseFloat(String(findValue(["harganormal", "harga", "nominal", "harga_nor"]) || "0"));
        let diskon = parseFloat(String(findValue(["diskon", "potongan"]) || "0"));
        let nominalInput = parseFloat(String(findValue(["totalbayar", "hargafinal", "total"]) || "0"));

        if (isNaN(hargaNormal)) hargaNormal = 0;
        if (isNaN(diskon)) diskon = 0;
        if (isNaN(nominalInput)) nominalInput = 0;

        // A. Handle Siswa
        const rawWA = findValue(["whatsapp", "wa", "nomorwa"]);
        const cleanPhone = (p: any) => {
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
        };
        const cleanWA = cleanPhone(rawWA);

        const siswaKey = `${siswaName.toLowerCase()}|${cleanWA}`;
        let siswaId = siswaCache.get(siswaKey);

        if (!siswaId) {
          // Cari by name saja jika WA kosong/tidak cocok
          const matchByName = allSiswa.find(s => s.nama.toLowerCase() === siswaName.toLowerCase() && (!cleanWA || s.telepon === cleanWA));
          if (matchByName) {
            siswaId = matchByName.id;
          } else {
            // Buat Siswa Baru (Sequential but unavoidable for ID)
            countSiswa++;
            const newSiswa = await prisma.siswa.create({
              data: {
                noSiswa: `S${countSiswa.toString().padStart(4, '0')}`,
                nama: siswaName,
                telepon: cleanWA || null,
              }
            });
            siswaId = newSiswa.id;
            allSiswa.push(newSiswa);
            siswaCache.set(siswaKey, siswaId);
          }
        }

        // B. Handle Program
        const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
        const progKey = cleanStr(programName);
        let programId = programCache.get(progKey);

        if (!programId && programName !== "") {
          const newProg = await prisma.program.create({
            data: { nama: programName.toUpperCase().trim(), harga: 0, tipe: 'LAINNYA' }
          });
          programId = newProg.id;
          programCache.set(progKey, programId);
        }

        // C. Handle CS & Talent (Memory Lookup)
        const cs = allCS.find(c => 
          (c.name || "").toLowerCase().includes(csName.toLowerCase()) || 
          (c.namaPanggilan || "").toLowerCase().includes(csName.toLowerCase())
        );

        const talent = allTalents.find(t => 
          (t.nama || "").toLowerCase().includes(talentName.toLowerCase()) ||
          (t.namaPanggilan || "").toLowerCase().includes(talentName.toLowerCase())
        );

        // D. Logic Bisnis
        let prodType = "REGULAR";
        const upperProg = programName.toUpperCase();
        if (upperProg.includes("ELITE")) prodType = "ELITE";
        else if (upperProg.includes("MASTER")) prodType = "MASTER";
        else if (upperProg.includes("TOEFL") || upperProg.includes("IELTS")) prodType = "TOEFL";

        let finalPrice = nominalInput > 0 ? nominalInput : (hargaNormal - diskon);
        const kodeUnik = finalPrice % 1000;
        const nominalMurni = finalPrice - kodeUnik;

        // E. Handle Date
        let tgl = new Date();
        const tglInput = findValue(["tanggal", "date", "tgl"]);
        if (tglInput) {
          const s = String(tglInput).trim();
          if (/^\d+$/.test(s) && parseInt(s) > 10000) {
            tgl = new Date((parseInt(s) - 25569) * 86400 * 1000);
          } else if (s.includes("/")) {
            const p = s.split("/");
            if (p.length === 3) tgl = new Date(parseInt(p[2].length === 2 ? "20"+p[2] : p[2]), parseInt(p[1])-1, parseInt(p[0]));
          } else {
            const d = new Date(s);
            if (!isNaN(d.getTime())) tgl = d;
          }
        }
        if (isNaN(tgl.getTime()) || tgl.getFullYear() < 2000) tgl = new Date();

        // F. SAVE PEMASUKAN
        const pemasukan = await prisma.pemasukan.create({
          data: {
            tanggal: tgl,
            siswaId,
            programId,
            csId: cs?.id || null,
            talentId: talent?.id || null,
            hargaNormal: hargaNormal || nominalMurni || 0,
            diskon,
            hargaFinal: finalPrice,
            metodeBayar: String(findValue(["metode", "metodebayar", "payment"]) || "TRANSFER").toUpperCase() as any,
            keterangan: `[TYPE:${prodType}] ${findValue(["keterangan", "note"]) || ""}`.trim(),
            isRO: String(findValue(["isro", "ro"]) || "").toLowerCase() === "true" || findValue(["isro", "ro"]) === "1",
          }
        });
        results.push(pemasukan);

      } catch (err) {
        console.error("Baris Gagal:", item, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: results.length,
      message: `Berhasil mengimpor ${results.length} data. Gagal: ${body.length - results.length}` 
    });

  } catch (error: any) {
    console.error("IMPORT_FATAL_ERROR:", error);
    return NextResponse.json({ error: "Gagal import data", details: error.message }, { status: 500 });
  }
}
