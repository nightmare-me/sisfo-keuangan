import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  if (role !== "PENGAJAR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ambil kelas dimana user ini adalah pengajar
  const kelas = await prisma.kelas.findMany({
    where: { pengajarId: userId, status: "AKTIF" },
    include: {
      program: true,
      _count: { select: { pendaftaran: true, sesiKelas: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(kelas);
}
