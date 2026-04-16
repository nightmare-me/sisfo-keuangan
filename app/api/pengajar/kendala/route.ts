import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const userName = (session.user as any).name;

  if (!["ADMIN", "PENGAJAR", "AKADEMIK"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { kelasId, siswaId, topik, deskripsi } = await request.json();

  if (!kelasId || !siswaId || !topik || !deskripsi) {
    return NextResponse.json({ error: "Kelas, Siswa, Topik, dan Deskripsi wajib diisi" }, { status: 400 });
  }

  const kendala = await prisma.kendalaMurid.create({
    data: {
      kelasId,
      siswaId,
      topik,
      deskripsi,
      dilaporkanOleh: userName,
      status: "OPEN" // Menunggu tindak lanjut dari Akademik
    }
  });

  return NextResponse.json(kendala, { status: 201 });
}
