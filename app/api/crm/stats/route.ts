import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

function localCalculateFee(
  csCategory: string,
  productType: string,
  price: number,
  isRO: boolean = false,
  cr: number = 0
): number {
  if (csCategory === 'CS_REGULAR' || !csCategory) {
    if (!isRO) {
      if (productType === '49K_DISKON') return 2000;
      if (productType === '49K') return 2500;
      if (productType === 'EFP') return 4000;
      if (productType === 'REG_1B') return 10000;
      if (productType === 'REG_ADV') return 12500;
      if (productType === 'NATIVE') return 12500;
      if (productType === 'TOEFL') return 12500;
      if (productType === 'PRIVATE_550' || productType === 'PRIVATE_850') return 25000;
      if (productType === 'PRIVATE_1B' || productType === 'PRIVATE_VIP' || productType === 'PRIVATE_FAMILY') return 50000;
    } else {
      if (productType === '49K_DISKON') return 2000;
      if (productType === '49K') return 2500;
      if (productType === 'EFP') return 4000;
      if (productType === 'REG_1B') return 10000;
      if (productType === 'REG_ADV') return 12500;
      if (productType === 'NATIVE') return 12500;
      if (productType === 'TOEFL') return 12500;
      if (productType === 'PRIVATE_550' || productType === 'PRIVATE_850') return 15000;
      if (productType === 'PRIVATE_1B' || productType === 'PRIVATE_VIP' || productType === 'PRIVATE_FAMILY') return 30000;
    }
  }
  if (csCategory === 'CS_LIVE') {
    if (productType === '49K' || productType === '49K_DISKON') return cr > 0.5 ? 2500 : 2000;
    if (productType.includes('FAST') || productType.includes('PRIVATE')) return price * 0.05;
  }
  if (csCategory === 'CS_TOEFL') {
    if (productType === 'TOEFL') return price * 0.05;
    if (productType === 'CERTIFICATE') return price * 0.10;
  }
  if (csCategory === 'CS_RO') return price * 0.05;
  return 0;
}

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
    const refundedPemasukanIds = new Set(approvedRefunds.map(r => r.pemasukanId).filter(Boolean));

    // Filter pemasukan yang TIDAK direfund secara manual di JS
    const myPemasukan = rawPemasukan.filter(p => {
      // 1. Cek berdasarkan ID (Past)
      if (refundedPemasukanIds.has(p.id)) return false;
      
      // 2. Backup: Cek jika ada refund APPROVED untuk siswa ini dengan jumlah yang sama (Fallback)
      const hasMatchingRefund = approvedRefunds.find(r => 
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
    const paidLeads = myLeads.filter(l => l.status === "PAID").length;
    const cr = totalLeads > 0 ? (paidLeads / totalLeads) : 0;
    const omset = myPemasukan.reduce((sum, p) => sum + p.hargaFinal, 0);

    let totalFee = 0;
    const teamType = user?.teamType || 'CS_REGULAR';
    
    myPemasukan.forEach(p => {
      totalFee += localCalculateFee(
        teamType as any,
        p.program?.kategoriFee || 'REG_1B',
        p.hargaFinal,
        p.isRO,
        cr
      );
    });

    return NextResponse.json([{
      csId: currentUserId,
      name: session.user?.name || "User",
      totalLeads,
      paidLeads,
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
      cr: "0%" 
    }]);
  }
}
