import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const role = (session.user as any).role?.toUpperCase();

  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Data must be an array" }, { status: 400 });
    }

    // Pre-load all programs for matching
    const allPrograms = await prisma.program.findMany();

    let successCount = 0;
    
    for (const item of data) {
      try {
        let wa = item.whatsapp?.toString().replace(/\D/g, "") || "";
        if (wa.startsWith("0")) wa = "62" + wa.substring(1);
        
        if (!item.nama || !wa) continue;

        // Try to find program by name
        const programName = item.program?.toLowerCase().trim();
        const targetProgram = allPrograms.find(p => 
          p.nama.toLowerCase().includes(programName) || 
          programName.includes(p.nama.toLowerCase())
        );

        await prisma.lead.create({
          data: {
            nama: item.nama.trim(),
            whatsapp: wa,
            programId: targetProgram?.id,
            preferensiJadwal: item.preferensi || null,
            csId: role === "CS" ? userId : undefined,
            status: "NEW",
            tanggalLead: item.tanggal ? new Date(item.tanggal) : new Date(),
          }
        });
        
        successCount++;
      } catch (err) {
        console.error("Lead import item error:", err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengimpor ${successCount} leads.` 
    });

  } catch (error: any) {
    console.error("Fatal CRM import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
