import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nama, whatsapp, email, preferensiJadwal, programId, csId, isRO, sumber } = body;

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
      } else if (sumber === "SOSMED") {
        targetTeamType = "CS_SOSMED";
      } else if (sumber === "AFFILIATE") {
        targetTeamType = "CS_AFFILIATE";
      } else if (lowerName.includes("tes toefl")) {
        targetTeamType = "CS_TOEFL";
      } else if (lowerName.includes("live")) {
        targetTeamType = "CS_LIVE";
      }

      // 1. Ambil semua CS aktif sesuai timnya yang sedang ON
      const availableCS = await prisma.user.findMany({
        where: { 
          role: { slug: { equals: "cs", mode: "insensitive" } },
          teamType: { has: targetTeamType },
          aktif: true,
          isLeadActive: true
        }
      });

      // Filter berdasarkan Jadwal Shift (WIB)
      const currentTimeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date());

      const onShiftCS = availableCS.filter((user: any) => {
        const start = user.shiftStart || "00:00";
        const end = user.shiftEnd || "23:59";
        if (start <= end) {
          return currentTimeStr >= start && currentTimeStr <= end;
        } else {
          // Jam lembur melewati tengah malam (misal 22:00 - 04:00)
          return currentTimeStr >= start || currentTimeStr <= end;
        }
      });

      if (onShiftCS.length > 0) {
        onShiftCS.sort((a: any, b: any) => a.id.localeCompare(b.id)); // Konsistensi urutan
        // 2. Hitung total lead untuk tim spesifik ini guna menentukan giliran
        const teamLeadCount = await prisma.lead.count({
          where: { cs: { teamType: { has: targetTeamType } } }
        });
        // 3. Tentukan giliran di dalam tim yang sedang ON
        const nextCsIndex = teamLeadCount % onShiftCS.length;
        finalCsId = onShiftCS[nextCsIndex].id;
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
        sumber: sumber || null,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal memproses pendaftaran", details: error.message }, { status: 500 });
  }
}
