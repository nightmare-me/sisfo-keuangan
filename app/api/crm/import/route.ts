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
      select: { id: true, name: true, namaPanggilan: true }
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
      const csName = String(findValue(["cs", "namacs", "staff", "nama_cs"]) || "").trim();
      const whatsapp = String(findValue(["whatsapp", "wa", "nomorwa", "telepon"]) || "").trim();
      const nominalInput = parseFloat(String(findValue(["nominal", "harga", "harganormal", "total", "tagihan"]) || "0"));
      const rawStatus = String(findValue(["status", "crm_status", "tahap"]) || "").trim().toUpperCase();
      const keterangan = String(findValue(["keterangan", "note", "catatan", "preferensi"]) || "").trim();
      
      const tglLeadRaw = findValue(["tanggal", "date", "tgl", "tanggal_lead", "tgl_lead"]);
      const tglClosingRaw = findValue(["tanggal_closing", "tgl_closing", "closing_date", "deal_date"]);

      // 1. Cari Program ID
      const program = allPrograms.find(p => p.nama.toLowerCase().includes(programName.toLowerCase()));
      
      // 2. Cari CS ID (Nama Lengkap atau Nama Panggilan)
      const cs = allCS.find(c => 
        (c.name || "").toLowerCase().includes(csName.toLowerCase()) || 
        (c.namaPanggilan || "").toLowerCase().includes(csName.toLowerCase())
      );

      // 3. Mapping Status
      let status: any = "NEW";
      if (["LUNAS", "PAID", "DONE"].includes(rawStatus)) status = "PAID";
      else if (["FOLLOW_UP", "FU", "PROSES"].includes(rawStatus)) status = "FOLLOW_UP";
      else if (["PENDING", "MENUNGGU", "WAITING"].includes(rawStatus)) status = "PENDING";
      else if (["REFUNDED", "REFUND"].includes(rawStatus)) status = "REFUNDED";
      else if (["CANCELLED", "CANCEL", "BATAL"].includes(rawStatus)) status = "CANCELLED";
      else if (cs?.id) status = "FOLLOW_UP";

      // 4. Handle Harga & Kode Unik
      let nominalTagihan = nominalInput;
      let kodeUnik = 0;

      if (nominalInput > 0) {
        kodeUnik = nominalInput % 1000;
        nominalTagihan = nominalInput;
      } else if (program) {
        kodeUnik = Math.floor(Math.random() * 999) + 1;
        nominalTagihan = program.harga + kodeUnik;
      }

      // 5. Handle Tanggal
      const parseDate = (val: any) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };

      const lead = await prisma.lead.create({
        data: {
          nama: String(namaSiswa),
          whatsapp: whatsapp,
          email: findValue(["email", "surel"]) || null,
          programId: program?.id || null,
          csId: cs?.id || null,
          status: status,
          nominalTagihan: nominalTagihan,
          kodeUnik: Math.round(kodeUnik),
          isRO: String(findValue(["isro", "ro", "repeatorder"]) || "").toLowerCase() === "true" || findValue(["isro", "ro"]) === "1",
          sumber: String(findValue(["sumber", "source"]) || "IMPORT").toUpperCase(),
          keterangan: keterangan || null,
          tanggalLead: parseDate(tglLeadRaw) || new Date(),
          tanggalClosing: parseDate(tglClosingRaw) || null,
        }
      });
      results.push(lead);
    }

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal import data CRM", details: error.message }, { status: 500 });
  }
}
