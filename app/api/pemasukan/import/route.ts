import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Data harus berupa array" }, { status: 400 });
    }

    const results = [];
    
    // Ambil semua CS
    const allCS = await prisma.user.findMany({
      where: { role: { slug: "cs" } },
      select: { id: true, name: true }
    });

    // Ambil semua Program
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
        const csName = String(findValue(["cs", "namacs", "staff"]) || "").trim();
        
        let hargaNormal = parseFloat(String(findValue(["harganormal", "harga", "nominal"]) || "0"));
        let diskon = parseFloat(String(findValue(["diskon", "potongan"]) || "0"));
        let nominalInput = parseFloat(String(findValue(["totalbayar", "hargafinal", "total"]) || "0"));

        if (isNaN(hargaNormal)) hargaNormal = 0;
        if (isNaN(diskon)) diskon = 0;
        if (isNaN(nominalInput)) nominalInput = 0;

        // 1. Cari atau Buat Siswa (Pemasukan butuh siswaId)
        let siswaId = null;
        if (siswa) {
          let siswaRecord = await prisma.siswa.findFirst({
            where: {
              OR: [
                { nama: { contains: String(siswa), mode: 'insensitive' } },
                { telepon: String(findValue(["whatsapp", "wa", "nomorwa"]) || "") }
              ]
            }
          });

          if (!siswaRecord) {
            // Jika siswa tidak ada, buat baru
            const countSiswa = await prisma.siswa.count();
            siswaRecord = await prisma.siswa.create({
              data: {
                noSiswa: `S${(countSiswa + 1).toString().padStart(4, '0')}`,
                nama: String(siswa),
                telepon: String(findValue(["whatsapp", "wa", "nomorwa"]) || ""),
              }
            });
          }
          siswaId = siswaRecord.id;
        }

        // 2. Cari Program & CS
        const program = allPrograms.find(p => p.nama.toLowerCase().includes(programName.toLowerCase()));
        const cs = allCS.find(c => (c.name || "").toLowerCase().includes(csName.toLowerCase()));

        // 3. Handle Nominal & Kode Unik
        let finalPrice = nominalInput;
        if (finalPrice <= 0) {
          finalPrice = hargaNormal - diskon;
        }

        const kodeUnik = finalPrice % 1000;
        const nominalMurni = finalPrice - kodeUnik;

        // 4. Handle Date
        let tgl = new Date();
        const tglInput = findValue(["tanggal", "date", "tgl"]);
        if (tglInput) {
          const parsedDate = new Date(String(tglInput));
          if (!isNaN(parsedDate.getTime())) {
            tgl = parsedDate;
          }
        }

        const pemasukan = await prisma.pemasukan.create({
          data: {
            tanggal: tgl,
            siswaId: siswaId,
            programId: program?.id || null,
            csId: cs?.id || null,
            hargaNormal: hargaNormal || nominalMurni || 0,
            diskon: diskon || 0,
            hargaFinal: finalPrice || 0,
            metodeBayar: String(findValue(["metode", "metodebayar", "payment"]) || "TRANSFER").toUpperCase() as any,
            keterangan: findValue(["keterangan", "note"]) || null,
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
