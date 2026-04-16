import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  // Cek apakah admin atau (pengajar yang diassign ke kelas ini)
  const kelas = await prisma.kelas.findUnique({
    where: { id: params.id },
    include: {
      program: true,
      pendaftaran: {
        where: { aktif: true },
        include: { siswa: true }
      },
      sesiKelas: {
        include: { absensi: true },
        orderBy: { tanggal: "asc" }
      },
      materiKelas: { orderBy: { createdAt: "desc" } },
      kendalaMurid: { include: { siswa: true }, orderBy: { createdAt: "desc" } }
    }
  });

  if (!kelas) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
  
  if (role === "PENGAJAR" && kelas.pengajarId !== userId) {
    return NextResponse.json({ error: "Forbidden: Bukan kelas Anda" }, { status: 403 });
  }

  return NextResponse.json(kelas);
}
