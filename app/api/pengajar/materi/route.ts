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

  const { kelasId, judul, deskripsi, urlFile } = await request.json();

  if (!kelasId || !judul || !urlFile) {
    return NextResponse.json({ error: "Kelas, Judul, dan URL File wajib diisi" }, { status: 400 });
  }

  const materi = await prisma.materiKelas.create({
    data: {
      kelasId,
      judul,
      deskripsi,
      urlFile,
      diunggahOleh: userName, // mencatat nama pengunggah
    }
  });

  return NextResponse.json(materi, { status: 201 });
}
