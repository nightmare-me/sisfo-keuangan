import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Data harus berupa array" }, { status: 400 });
    }

    const results = [];
    
    // Ambil semua CS untuk mapping nama ke ID
    const allCS = await prisma.user.findMany({
      where: { role: { slug: "cs" } },
      select: { id: true, name: true }
    });

    // Ambil semua Program untuk mapping nama ke ID
    const allPrograms = await prisma.program.findMany({
      select: { id: true, nama: true, harga: true }
    });

    for (const item of body) {
      // Robust key detection (handles spaces, underscores, and case)
      const findValue = (keyNames: string[]) => {
        const key = Object.keys(item).find(k => {
          const cleanK = k.trim().toLowerCase().replace(/_/g, "");
          return keyNames.some(kn => cleanK === kn.toLowerCase());
        });
        return key ? item[key] : null;
      };

      const namaSiswa = findValue(["nama", "namasiswa", "studentname"]);
      if (!namaSiswa) continue;

      const programName = String(findValue(["program", "namaprogram", "produk"]) || "").trim();
      const csName = String(findValue(["cs", "namacs", "staff"]) || "").trim();
      const whatsapp = String(findValue(["whatsapp", "wa", "nomorwa"]) || "").trim();
      const nominalInput = parseFloat(String(findValue(["nominal", "harga", "harganormal", "total"]) || "0"));

      // 1. Cari Program ID
      const program = allPrograms.find(p => p.nama.toLowerCase().includes(programName.toLowerCase()));
      
      // 2. Cari CS ID
      const cs = allCS.find(c => (c.name || "").toLowerCase().includes(csName.toLowerCase()));

      // 3. Handle Harga & Kode Unik (Import pakai angka apa adanya)
      let nominalTagihan = nominalInput;
      let kodeUnik = 0;

      if (nominalInput > 0) {
        // Import: Pakai angka dari file apa adanya. Jika bulat ya biarkan bulat.
        kodeUnik = nominalInput % 1000;
        nominalTagihan = nominalInput;
      } else if (program) {
        // Jika nominal kosong di file, baru generate dari harga program + kode unik
        kodeUnik = Math.floor(Math.random() * 999) + 1;
        nominalTagihan = program.harga + kodeUnik;
      }

      const lead = await prisma.lead.create({
        data: {
          nama: String(namaSiswa),
          whatsapp: whatsapp,
          email: findValue(["email", "surel"]) || null,
          programId: program?.id || null,
          csId: cs?.id || null,
          status: cs?.id ? "FOLLOW_UP" : "NEW",
          nominalTagihan: nominalTagihan,
          kodeUnik: Math.round(kodeUnik),
          isRO: String(findValue(["isro", "ro", "repeatorder"]) || "").toLowerCase() === "true" || findValue(["isro", "ro"]) === "1",
          sumber: String(findValue(["sumber", "source"]) || "IMPORT").toUpperCase(),
          tanggalLead: findValue(["tanggal", "date", "tgl"]) ? new Date(String(findValue(["tanggal", "date", "tgl"]))) : new Date(),
        }
      });
      results.push(lead);
    }

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal import data CRM", details: error.message }, { status: 500 });
  }
}
