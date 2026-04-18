import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const yesterdayStart = startOfDay(subDays(today, 1));
  const yesterdayEnd = endOfDay(subDays(today, 1));

  // 1. Murid baru hari ini (siswa yang createdAt = hari ini)
  const [muridBariIni, muridKemarin] = await Promise.all([
    prisma.siswa.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.siswa.count({ where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } } }),
  ]);

  // 2. Kelas aktif
  const kelasAktif = await prisma.kelas.count({ where: { status: "AKTIF" } });

  // 3. Total siswa aktif
  const siswaAktif = await prisma.siswa.count({ where: { status: "AKTIF" } });

  // 4. Total pengajar aktif
  const pengajarAktif = await prisma.user.count({ where: { role: { slug: "pengajar" }, aktif: true } });

  // 5. Tren 30 hari penambahan murid
  const trendData = [];
  for (let i = 29; i >= 0; i--) {
    const date = subDays(today, i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    const count = await prisma.siswa.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } });
    trendData.push({ date: date.toISOString(), murid: count });
  }

  // 6. Jumlah siswa per program (dari Pendaftaran aktif)
  const pendaftaranPerProgram = await prisma.pendaftaran.groupBy({
    by: ["kelasId"],
    where: { aktif: true },
    _count: { siswaId: true },
  });

  // Ambil info kelas + program
  const kelasIds = pendaftaranPerProgram.map(p => p.kelasId);
  const kelasList = await prisma.kelas.findMany({
    where: { id: { in: kelasIds } },
    include: { program: { select: { id: true, nama: true, tipe: true } } },
  });

  // Group by program
  const programMap: Record<string, { nama: string; tipe: string; jumlahSiswa: number }> = {};
  for (const p of pendaftaranPerProgram) {
    const kelas = kelasList.find(k => k.id === p.kelasId);
    if (!kelas?.program) continue;
    const key = kelas.program.id;
    if (!programMap[key]) {
      programMap[key] = { nama: kelas.program.nama, tipe: kelas.program.tipe, jumlahSiswa: 0 };
    }
    programMap[key].jumlahSiswa += p._count.siswaId;
  }
  const siswaPerProgram = Object.values(programMap).sort((a, b) => b.jumlahSiswa - a.jumlahSiswa);

  // 7. Murid terkini (siswa yang baru daftar)
  const muridTerkini = await prisma.siswa.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      pendaftaran: {
        where: { aktif: true },
        include: { kelas: { include: { program: { select: { nama: true } } } } },
        take: 1,
        orderBy: { tanggalDaftar: "desc" },
      },
    },
  });

  return NextResponse.json({
    kpi: {
      muridBariIni,
      muridKemarin,
      kelasAktif,
      siswaAktif,
      pengajarAktif,
    },
    trendData,
    siswaPerProgram,
    muridTerkini,
  });
}
