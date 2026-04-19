import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordLog } from "@/lib/audit";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["ADMIN", "FINANCE"].includes(role)) {
      return NextResponse.json({ error: "Hanya Admin dan Finance yang bisa memproses refund" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { status, catatan } = body; // APPROVED | REJECTED

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
       return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    // 1. Cek data refund
    const refund = await prisma.refund.findUnique({
      where: { id },
      include: { siswa: true }
    });
    if (!refund) return NextResponse.json({ error: "Data refund tidak ditemukan" }, { status: 404 });

    // 2. Proses dalam transaksi
    const result = await prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.refund.update({
        where: { id },
        data: {
          status: status as any,
          catatan,
          financeId: (session.user as any).id,
        }
      });

      // Jika disetujui, update status siswa, pendaftaran, dan lead
      if (status === "APPROVED") {
        await tx.siswa.update({
          where: { id: refund.siswaId },
          data: { status: "TIDAK_AKTIF" }
        });

        await tx.pendaftaran.updateMany({
          where: { siswaId: refund.siswaId, aktif: true },
          data: { aktif: false }
        });

        // Jika ada invoice terkait, tandai sebagai BATAL
        if (refund.invoiceId) {
          await tx.invoice.update({
            where: { id: refund.invoiceId },
            data: { statusBayar: "BATAL" }
          });
        }

        // Cari Lead siswa tersebut (berdasarkan nama & nomor WA) dan tandai sebagai REFUNDED
        try {
          if (refund.siswa?.nama || refund.siswa?.telepon) {
            const wa = refund.siswa.telepon || "";
            const waAlt = wa.startsWith('62') ? '0' + wa.substring(2) : (wa.startsWith('0') ? '62' + wa.substring(1) : wa);
            
            await tx.lead.updateMany({
              where: { 
                OR: [
                  { whatsapp: { in: [wa, waAlt] } },
                  { nama: { contains: refund.siswa.nama, mode: 'insensitive' } }
                ]
              },
              data: { status: "REFUNDED" }
            });
          }
        } catch (e) {
          console.warn("Gagal update status lead, tapi refund tetap dilanjutkan:", e);
        }
      }

      return updatedRefund;
    });

    // 3. Catat log
    await recordLog(
      (session.user as any).id,
      `Proses Refund (${status})`,
      refund.siswa.nama,
      `Catatan: ${catatan || '—'}`
    );

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("REFUND_APPROVE_ERROR:", error);
    return NextResponse.json({ 
      error: "Gagal memproses refund", 
      details: error.message 
    }, { status: 500 });
  }
}
