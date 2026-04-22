import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateCSFee } from "@/lib/payroll";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUserId = (session.user as any).id;
    
    // AMBIL DATA SECARA TERPISAH UNTUK MENGHINDARI ERROR 500 PADA JOIN/RELATION
    const user = await prisma.user.findUnique({ where: { id: currentUserId } });
    
    // Ambil SEMUA pemasukan Halla
    const rawPemasukan = await prisma.pemasukan.findMany({
      where: { csId: currentUserId },
      include: { program: true }
    });

    // Ambil SEMUA refund yang sudah APPROVED
    const approvedRefunds = await prisma.refund.findMany({
      where: { status: "APPROVED" },
      select: { pemasukanId: true, siswaId: true, jumlah: true }
    });
    const refundedPemasukanIds = new Set(approvedRefunds.map((r: any) => r.pemasukanId).filter(Boolean));

    // Filter pemasukan yang TIDAK direfund secara manual di JS
    const myPemasukan = rawPemasukan.filter((p: any) => {
      // 1. Cek berdasarkan ID (Past)
      if (refundedPemasukanIds.has(p.id)) return false;
      
      // 2. Backup: Cek jika ada refund APPROVED untuk siswa ini dengan jumlah yang sama (Fallback)
      const hasMatchingRefund = approvedRefunds.find((r: any) => 
        !r.pemasukanId && // Hanya cari refund yang tidak punya ID link
        r.siswaId === p.siswaId && 
        Math.abs(Number(r.jumlah) - p.hargaFinal) < 100 // Toleransi selisih tipis
      );
      
      if (hasMatchingRefund) {
        // Tandai agar tidak terpakai lagi untuk transaksi lain
        (hasMatchingRefund as any).pemasukanId = p.id; 
        return false;
      }
      
      return true;
    });

    const myLeads = await prisma.lead.findMany({
      where: { csId: currentUserId }
    });

    const totalLeads = myLeads.length;
    const paidLeads = myLeads.filter((l: any) => l.status === "PAID").length;
    const refundedLeads = myLeads.filter((l: any) => l.status === "REFUNDED").length;
    const cr = totalLeads > 0 ? (paidLeads / totalLeads) : 0;
    const omset = myPemasukan.reduce((sum: number, p: any) => sum + p.hargaFinal, 0);

    let totalFee = 0;
    const teamType = user?.teamType || 'CS_REGULAR';
    
    myPemasukan.forEach((p: any) => {
      totalFee += calculateCSFee(
        teamType as any,
        p.program?.kategoriFee || '',
        p.hargaFinal,
        p.isRO,
        cr,
        p.program || undefined
      );
    });

    return NextResponse.json([{
      csId: currentUserId,
      name: session.user?.name || "User",
      totalLeads,
      paidLeads,
      refundedLeads,
      cr: (cr * 100).toFixed(1) + "%",
      omset,
      fee: totalFee
    }]);

  } catch (error: any) {
    console.error("FATAL_STATS_ERROR:", error);
    return NextResponse.json([{ 
      name: "ERROR: " + error.message, 
      omset: 0, 
      fee: 0, 
      cr: "0%",
      refundedLeads: 0
    }]);
  }
}
