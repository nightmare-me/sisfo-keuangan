import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nama, whatsapp, email, preferensiJadwal, programId } = body;

    if (!nama || !whatsapp) {
      return NextResponse.json({ error: "Nama dan WhatsApp wajib diisi" }, { status: 400 });
    }

    let nominalTagihan = null;
    let kodeUnik = null;

    // Generate kode unik dan tagihan jika program dipilih
    if (programId) {
      const program = await prisma.program.findUnique({ where: { id: programId } });
      if (program) {
        // Generate random kode unik 1 - 999
        kodeUnik = Math.floor(Math.random() * 999) + 1;
        nominalTagihan = program.harga + kodeUnik;
      }
    }

    const lead = await prisma.lead.create({
      data: {
        nama,
        whatsapp,
        email: email || null,
        preferensiJadwal: preferensiJadwal || null,
        programId: programId || null,
        kodeUnik,
        nominalTagihan,
        status: "NEW",
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal memproses pendaftaran", details: error.message }, { status: 500 });
  }
}
