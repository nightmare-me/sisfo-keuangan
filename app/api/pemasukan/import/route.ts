import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Data harus berupa array" }, { status: 400 });
    }

    // 1. PRE-FETCH DATA
    const [allCS, allPrograms, allTalents, allSiswa] = await Promise.all([
      prisma.user.findMany({
        where: { OR: [{ role: { slug: "cs" } }, { role: { slug: "admin" } }] },
        select: { id: true, name: true, namaPanggilan: true }
      }),
      prisma.program.findMany({ select: { id: true, nama: true } }),
      prisma.talent.findMany({ select: { id: true, nama: true, namaPanggilan: true } }),
      prisma.siswa.findMany({ select: { id: true, nama: true, telepon: true } })
    ]);

    const siswaCache = new Map();
    allSiswa.forEach(s => siswaCache.set(`${s.nama.toLowerCase()}|${s.telepon || ""}`, s.id));

    const programCache = new Map();
    allPrograms.forEach(p => programCache.set(p.nama.toLowerCase().replace(/[^a-z0-9]/g, ""), p.id));

    let countSiswa = await prisma.siswa.count();
    const results = [];
    const errors = [];

    // 2. PROSES DATA DALAM LOOP
    for (let i = 0; i < body.length; i++) {
      const item = body[i];
      try {
        const findValue = (keyNames: string[]) => {
          const key = Object.keys(item).find(k => {
            const cleanK = k.trim().toLowerCase().replace(/_/g, "");
            return keyNames.some(kn => cleanK === kn.toLowerCase());
          });
          return key ? item[key] : null;
        };

        const siswaName = String(findValue(["siswa", "namasiswa", "studentname", "nama"]) || "").trim();
        if (!siswaName) {
          errors.push({ line: i + 1, error: "Nama siswa kosong" });
          continue;
        }

        const programName = String(findValue(["program", "namaprogram", "produk"]) || "").trim();
        const csName = String(findValue(["cs", "namacs", "staff", "nama_cs"]) || "").trim();
        const talentName = String(findValue(["talent", "host", "talentname"]) || "").trim();
        
        let hargaNormal = parseFloat(String(findValue(["harganormal", "harga", "nominal", "harga_nor"]) || "0"));
        let diskon = parseFloat(String(findValue(["diskon", "potongan"]) || "0"));
        let nominalInput = parseFloat(String(findValue(["totalbayar", "hargafinal", "total"]) || "0"));

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
          const matchByName = allSiswa.find(s => s.nama.toLowerCase() === siswaName.toLowerCase() && (!cleanWA || s.telepon === cleanWA));
          if (matchByName) {
            siswaId = matchByName.id;
          } else {
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
        const progKey = programName.toLowerCase().replace(/[^a-z0-9]/g, "");
        let programId = programCache.get(progKey);

        if (!programId && programName !== "") {
          const newProg = await prisma.program.create({
            data: { nama: programName.toUpperCase().trim(), harga: 0, tipe: 'LAINNYA' }
          });
          programId = newProg.id;
          programCache.set(progKey, programId);
          allPrograms.push(newProg);
        }

        // C. Handle CS & Talent
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
        if (programName.toUpperCase().includes("ELITE")) prodType = "ELITE";
        else if (programName.toUpperCase().includes("MASTER")) prodType = "MASTER";
        else if (programName.toUpperCase().includes("TOEFL") || programName.toUpperCase().includes("IELTS")) prodType = "TOEFL";

        let finalPrice = nominalInput > 0 ? nominalInput : (hargaNormal - diskon);

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

        // F. Validate Enum Metode Bayar
        let metode = String(findValue(["metode", "metodebayar", "payment"]) || "TRANSFER").toUpperCase();
        if (!["TRANSFER", "QRIS", "CASH"].includes(metode)) metode = "TRANSFER";

        // G. SAVE
        const pemasukan = await prisma.pemasukan.create({
          data: {
            tanggal: tgl,
            siswaId,
            programId,
            csId: cs?.id || null,
            talentId: talent?.id || null,
            hargaNormal: hargaNormal || finalPrice || 0,
            diskon: diskon || 0,
            hargaFinal: finalPrice,
            metodeBayar: metode as any,
            keterangan: `[TYPE:${prodType}] ${findValue(["keterangan", "note"]) || ""}`.trim(),
            isRO: String(findValue(["isro", "ro"]) || "").toLowerCase() === "true" || findValue(["isro", "ro"]) === "1",
          }
        });
        results.push(pemasukan);

      } catch (err: any) {
        errors.push({ line: i + 1, error: err.message, data: item.nama_siswa || item.siswa });
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: results.length,
      total: body.length,
      errors: errors.slice(0, 10), // Kirim 10 error pertama saja agar tidak berat
      message: `Berhasil: ${results.length} | Gagal: ${errors.length}` 
    });

  } catch (error: any) {
    console.error("FATAL_IMPORT:", error);
    return NextResponse.json({ error: "Gagal total import", details: error.message }, { status: 500 });
  }
}
