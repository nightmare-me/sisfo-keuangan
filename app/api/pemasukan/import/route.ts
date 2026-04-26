import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Data harus berupa array" }, { status: 400 });
    }

    const results = [];
    
    // Ambil semua CS (Termasuk Nama Panggilan)
    const allCS = await prisma.user.findMany({
      where: { 
        OR: [
          { role: { slug: "cs" } },
          { role: { slug: "admin" } }
        ]
      },
      select: { id: true, name: true, namaPanggilan: true }
    });

    // Ambil semua Program untuk mapping nama ke ID
    const allPrograms = await prisma.program.findMany({
      select: { id: true, nama: true }
    });

    for (const item of body) {
      try {
        const findValue = (keyNames: string[]) => {
          const key = Object.keys(item).find(k => {
            const cleanK = k.trim().toLowerCase().replace(/_/g, "");
            return keyNames.some(kn => cleanK === kn.toLowerCase());
          });
          return key ? item[key] : null;
        };

        const siswa = findValue(["siswa", "namasiswa", "studentname", "nama"]);
        if (!siswa) continue;

        const programName = String(findValue(["program", "namaprogram", "produk"]) || "").trim();
        const csName = String(findValue(["cs", "namacs", "staff", "nama_cs"]) || "").trim();
        
        let hargaNormal = parseFloat(String(findValue(["harganormal", "harga", "nominal", "harga_nor"]) || "0"));
        let diskon = parseFloat(String(findValue(["diskon", "potongan"]) || "0"));
        let nominalInput = parseFloat(String(findValue(["totalbayar", "hargafinal", "total"]) || "0"));

        if (isNaN(hargaNormal)) hargaNormal = 0;
        if (isNaN(diskon)) diskon = 0;
        if (isNaN(nominalInput)) nominalInput = 0;

        // 1. Cari atau Buat Siswa (Pemasukan butuh siswaId)
        let siswaId = null;
        if (siswa && String(siswa).trim() !== "") {
          const cleanSiswa = String(siswa).trim();
          const cleanWA = String(findValue(["whatsapp", "wa", "nomorwa"]) || "").trim();

          // Cari yang benar-benar mirip
          // Cari siswa yang Nama DAN WA-nya cocok (jika ada WA)
          // Jika WA kosong, cari berdasarkan Nama saja
          let siswaRecord = await prisma.siswa.findFirst({
            where: {
              nama: { equals: cleanSiswa, mode: 'insensitive' },
              ...(cleanWA !== "" ? { telepon: cleanWA } : {})
            }
          });

          if (!siswaRecord) {
            // Jika siswa tidak ada, buat baru
            const countSiswa = await prisma.siswa.count();
            siswaRecord = await prisma.siswa.create({
              data: {
                noSiswa: `S${(countSiswa + 1).toString().padStart(4, '0')}`,
                nama: cleanSiswa,
                telepon: cleanWA !== "" ? cleanWA : null,
              }
            });
          }
          siswaId = siswaRecord.id;
        }

        // 2. Cari atau Buat Program otomatis jika tidak ada (Fuzzy matching)
        let programId = null;
        if (programName !== "") {
          const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          const targetClean = clean(programName);
          
          let targetProg = allPrograms.find(p => clean(p.nama) === targetClean);
          
          if (!targetProg) {
            // Buat program baru jika tidak ada (Misal: Lain-lain)
            targetProg = await prisma.program.create({
              data: {
                nama: programName.toUpperCase().trim(),
                harga: 0,
                tipe: 'LAINNYA'
              }
            });
            // Masukkan ke list biar tidak buat dobel di baris berikutnya
            allPrograms.push(targetProg);
          }
          programId = targetProg.id;
        }

        const cs = (csName !== "" && csName !== "null" && csName !== "—") 
          ? allCS.find(c => 
              (c.name || "").toLowerCase().includes(csName.toLowerCase()) || 
              (c.namaPanggilan || "").toLowerCase().includes(csName.toLowerCase())
            ) 
          : null;

        // 3. Tentukan Product Type untuk Fee Calculation
        let prodType = "REGULAR";
        const upperProg = programName.toUpperCase();
        if (upperProg.includes("ELITE")) prodType = "ELITE";
        else if (upperProg.includes("MASTER")) prodType = "MASTER";
        else if (upperProg.includes("TOEFL") || upperProg.includes("IELTS")) prodType = "TOEFL";
        else if (upperProg.includes("LAIN")) prodType = "LAINNYA";
        else if (upperProg.includes("PRIVATE")) prodType = "PRIVATE";

        // 4. Handle Nominal & Kode Unik
        let finalPrice = nominalInput;
        if (finalPrice <= 0) {
          finalPrice = hargaNormal - diskon;
        }

        const kodeUnik = finalPrice % 1000;
        const nominalMurni = finalPrice - kodeUnik;

        // 5. Handle Date (Paksa dd/mm/yyyy agar tidak terbalik mm/dd)
        let tgl = new Date();
        const tglInput = findValue(["tanggal", "date", "tgl"]);
        if (tglInput && String(tglInput).trim() !== "") {
          const s = String(tglInput).trim();
          // Jika format dd/mm/yyyy (pakai slash /)
          if (s.includes("/")) {
            const parts = s.split("/");
            if (parts.length === 3) {
              const d = parseInt(parts[0]);
              const m = parseInt(parts[1]) - 1; // JS month 0-11
              const y = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
              const parsedDate = new Date(y, m, d);
              if (!isNaN(parsedDate.getTime())) {
                tgl = parsedDate;
              }
            }
          } else {
            const parsedDate = new Date(s);
            if (!isNaN(parsedDate.getTime())) {
              tgl = parsedDate;
            }
          }
        }

        const keterangan = findValue(["keterangan", "note"]) || "";
        const finalKeterangan = `[TYPE:${prodType}] ${keterangan}`.trim();

        const pemasukan = await prisma.pemasukan.create({
          data: {
            tanggal: tgl,
            siswaId: siswaId,
            programId: programId,
            csId: cs?.id || null,
            hargaNormal: hargaNormal || nominalMurni || 0,
            diskon: diskon || 0,
            hargaFinal: finalPrice || 0,
            metodeBayar: String(findValue(["metode", "metodebayar", "payment"]) || "TRANSFER").toUpperCase() as any,
            keterangan: finalKeterangan,
            isRO: String(findValue(["isro", "ro", "repeatorder"]) || "").toLowerCase() === "true" || findValue(["isro", "ro"]) === "1",
          }
        });
        results.push(pemasukan);
      } catch (itemError: any) {
        console.error("Error pada item:", item, itemError);
        // Lanjutkan ke item berikutnya saja jika satu baris gagal
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: results.length,
      message: `Berhasil mengimpor ${results.length} data. Gagal: ${body.length - results.length}` 
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal import data Pemasukan", details: error.message }, { status: 500 });
  }
}
