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
      
      const hargaNormal = parseFloat(String(findValue(["harganormal", "harga", "nominal"]) || "0"));
      const diskon = parseFloat(String(findValue(["diskon", "potongan"]) || "0"));
      const nominalInput = parseFloat(String(findValue(["totalbayar", "hargafinal", "total"]) || "0"));

      // 1. Cari Program & CS
      const program = allPrograms.find(p => p.nama.toLowerCase().includes(programName.toLowerCase()));
      const cs = allCS.find(c => (c.name || "").toLowerCase().includes(csName.toLowerCase()));

      // 2. Handle Nominal & Kode Unik
      let finalPrice = nominalInput;
      if (finalPrice <= 0) {
        finalPrice = hargaNormal - diskon;
      }

      let kodeUnik = 0;
      let nominalMurni = finalPrice;

      if (finalPrice > 0) {
        // Cek apakah sudah ada kode unik (bukan kelipatan 1000)
        if (finalPrice % 1000 !== 0) {
           kodeUnik = finalPrice % 1000;
           nominalMurni = finalPrice - kodeUnik;
        } else {
           // Jika kelipatan 1000, biarkan kodeUnik 0 atau generate jika perlu?
           // Untuk pemasukan biasanya data historis, jadi pakai 0 saja jika pas
           kodeUnik = 0;
           nominalMurni = finalPrice;
        }
      }

      const pemasukan = await prisma.pemasukan.create({
        data: {
          tanggal: findValue(["tanggal", "date", "tgl"]) ? new Date(String(findValue(["tanggal", "date", "tgl"]))) : new Date(),
          siswa: String(siswa),
          whatsapp: String(findValue(["whatsapp", "wa", "nomorwa"]) || ""),
          programId: program?.id || null,
          csId: cs?.id || null,
          nominal: nominalMurni,
          kodeUnik: Math.round(kodeUnik),
          hargaFinal: finalPrice,
          metodeBayar: String(findValue(["metode", "metodebayar", "payment"]) || "TRANSFER").toUpperCase(),
          keterangan: findValue(["keterangan", "note"]) || null,
          isRO: String(findValue(["isro", "ro", "repeatorder"]) || "").toLowerCase() === "true" || findValue(["isro", "ro"]) === "1",
        }
      });
      results.push(pemasukan);
    }

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal import data Pemasukan", details: error.message }, { status: 500 });
  }
}
