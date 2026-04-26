import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    console.log("--- START DATABASE CLEANUP ---");
    
    const allProgs = await prisma.program.findMany();
    const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    const groups: Record<string, any[]> = {};
    allProgs.forEach(p => {
      const key = cleanStr(p.nama);
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    let totalMerged = 0;

    for (const key in groups) {
      const progs = groups[key];
      if (progs.length > 1) {
        // Cari yang SHARING-nya nyala
        const good = progs.find(p => p.isProfitSharing === true) || progs[0];
        const bads = progs.filter(p => p.id !== good.id);
        
        for (const bad of bads) {
          // Pindahkan transaksi
          const updated = await prisma.pemasukan.updateMany({
            where: { programId: bad.id },
            data: { programId: good.id }
          });
          
          totalMerged += updated.count;
          
          // Hapus program duplikat
          await prisma.program.delete({ where: { id: bad.id } });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Pembersihan selesai! ${totalMerged} transaksi telah digabungkan.` 
    });

  } catch (error: any) {
    console.error("CLEANUP_ERROR:", error);
    return NextResponse.json({ error: "Gagal membersihkan data", details: error.message }, { status: 500 });
  }
}
