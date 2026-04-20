import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nama, whatsapp, email, preferensiJadwal, programId, csId, isRO } = body;

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

    // ROUND ROBIN LOGIC: Auto-assign CS if not provided
    let finalCsId = csId || null;
    if (!finalCsId) {
      // 0. Cek apakan program ini bertipe LIVE
      let programName = "";
      if (programId) {
        const program = await prisma.program.findUnique({ where: { id: programId }, select: { nama: true } });
        programName = program?.nama || "";
      }
      
      const lowerName = programName.toLowerCase();
      let targetTeamType = "CS_REGULAR";

      if (isRO) {
        targetTeamType = "CS_RO";
      } else if (lowerName.includes("tes toefl")) {
        targetTeamType = "CS_TOEFL";
      } else if (lowerName.includes("live")) {
        targetTeamType = "CS_LIVE";
      }

      // 1. Ambil semua CS aktif sesuai timnya
      const allCS = await prisma.user.findMany({
        where: { 
          role: { slug: { equals: "cs", mode: "insensitive" } },
          teamType: targetTeamType
        },
        orderBy: { id: "asc" }
      });

      if (allCS.length > 0) {
        // 2. Hitung total lead untuk tim spesifik ini guna menentukan giliran
        const teamLeadCount = await prisma.lead.count({
          where: { cs: { teamType: targetTeamType } }
        });
        // 3. Tentukan giliran di dalam tim
        const nextCsIndex = teamLeadCount % allCS.length;
        finalCsId = allCS[nextCsIndex].id;
      }
    }

    const lead = await prisma.lead.create({
      data: {
        nama,
        whatsapp,
        email: email || null,
        preferensiJadwal: preferensiJadwal || null,
        programId: programId || null,
        isRO: isRO || false,
        kodeUnik,
        nominalTagihan,
        status: finalCsId ? "FOLLOW_UP" : "NEW",
        csId: finalCsId,
        tanggalLead: new Date(),
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal memproses pendaftaran", details: error.message }, { status: 500 });
  }
}
