import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateSiswaNumber, generateInvoiceNumber } from "@/lib/utils";
import { recordLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["ADMIN", "CS"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized to convert lead" }, { status: 403 });
  }

  try {
    const { leadId, hargaFinal, metodeBayar, tanggalLunas, talentId } = await request.json();

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return NextResponse.json({ error: "Lead tidak ditemukan" }, { status: 404 });
    if (lead.status === "PAID") return NextResponse.json({ error: "Lead sudah lunas" }, { status: 400 });

    const tx = await prisma.$transaction(async (tx: any) => {
      // 1. Ubah status lead jadi PAID
      await tx.lead.update({
        where: { id: leadId },
        data: { 
          status: "PAID",
          tanggalClosing: tanggalLunas ? new Date(tanggalLunas) : new Date()
        },
      });

      // 2. Cek Siswa (RO Check) & Set Password Portal
      const hashedPw = await bcrypt.hash(lead.whatsapp, 10);
      
      let siswa = await tx.siswa.findFirst({
        where: { telepon: lead.whatsapp }
      });

      let isRO = false;
      if (siswa) {
        isRO = true;
        // Update password siswa lama jika diperlukan
        await tx.siswa.update({
          where: { id: siswa.id },
          data: { password: hashedPw }
        });
      } else {
        const noSiswa = generateSiswaNumber();
        siswa = await tx.siswa.create({
          data: {
            noSiswa,
            nama: lead.nama,
            telepon: lead.whatsapp,
            email: lead.email,
            status: "AKTIF",
            password: hashedPw,
          },
        });
      }

      // 3. Buat Pemasukan
      const noInvoice = generateInvoiceNumber();
      const pemasukan = await tx.pemasukan.create({
        data: {
          tanggal: tanggalLunas ? new Date(tanggalLunas) : new Date(),
          siswaId: siswa.id,
          programId: lead.programId,
          csId: lead.csId || (session.user as any).id,
          hargaNormal: lead.nominalTagihan || hargaFinal,
          diskon: (lead.nominalTagihan || hargaFinal) - hargaFinal,
          hargaFinal: hargaFinal,
          metodeBayar: metodeBayar || "TRANSFER",
          isRO: isRO,
          talentId: talentId || lead.talentId,
          keterangan: isRO ? "Repeat Order (RO) otomatis" : "Dikonversi otomatis dari CRM Lead",
          invoice: {
            create: {
              noInvoice,
              siswaId: siswa.id,
              tanggal: tanggalLunas ? new Date(tanggalLunas) : new Date(),
              total: lead.nominalTagihan || hargaFinal,
              diskon: (lead.nominalTagihan || hargaFinal) - hargaFinal,
              totalFinal: hargaFinal,
              statusBayar: "LUNAS",
            },
          },
        },
      });

      return { siswa, pemasukan };
    });

    await recordLog(
      (session.user as any).id,
      "Convert Lead ke Siswa",
      tx.siswa.nama,
      `Berhasil konversi. No Siswa: ${tx.siswa.noSiswa}. Nominal Lunas: ${tx.pemasukan.hargaFinal}`
    );

    return NextResponse.json({ success: true, data: tx });

  } catch (error: any) {
    console.error("CONVERT_LEAD_ERROR:", error);
    return NextResponse.json({ 
      error: "Gagal memproses konversi", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}
