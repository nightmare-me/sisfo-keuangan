import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["ADMIN", "PENGAJAR", "AKADEMIK"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Expecting an array of absensi updates: [{ id, status, nilaiHuruf, catatan }]
  const updates = await request.json();

  if (!Array.isArray(updates)) {
    return NextResponse.json({ error: "Format data tidak valid, diharapkan array" }, { status: 400 });
  }

    try {
      const results = await prisma.$transaction(async (tx) => {
        const updatedAbsensi = await Promise.all(
          updates.map((ab: any) => 
            tx.absensi.update({
              where: { id: ab.id },
              data: {
                status: ab.status,
                nilaiHuruf: ab.nilaiHuruf || null,
                catatan: ab.catatan || null,
              }
            })
          )
        );

        // Update status SesiKelas menjadi SELESAI jika ada update absensi
        if (updatedAbsensi.length > 0) {
          await tx.sesiKelas.update({
            where: { id: updatedAbsensi[0].sesiKelasId },
            data: { status: "SELESAI" }
          });
        }

        return updatedAbsensi;
      });

      return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal menyimpan absensi", message: error.message }, { status: 500 });
  }
}
