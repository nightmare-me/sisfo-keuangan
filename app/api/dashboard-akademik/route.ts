import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type") || (from ? "custom" : "month");

  // 0. AMBIL CONFIG KEUANGAN DARI DB (Untuk Cutoff)
  const dbConfigs = await prisma.financialConfig.findMany();
  const config: Record<string, number> = {};
  dbConfigs.forEach(c => {
    config[c.key] = c.value;
  });
  const cutoffDay = config.PAYROLL_CUTOFF_DAY || 25;

  let startDate: Date, endDate: Date, yesterdayStart: Date, yesterdayEnd: Date;
  const now = new Date();

  if (from && to && type === "custom") {
    startDate = startOfDay(new Date(from));
    endDate = endOfDay(new Date(to));
    const diff = endDate.getTime() - startDate.getTime();
    yesterdayStart = new Date(startDate.getTime() - diff - 1);
    yesterdayEnd = new Date(startDate.getTime() - 1);
  } else if (type === "today") {
    startDate = startOfDay(now);
    endDate = endOfDay(now);
    yesterdayStart = startOfDay(subDays(now, 1));
    yesterdayEnd = endOfDay(subDays(now, 1));
  } else if (type === "week") {
    const day = now.getDay();
    startDate = new Date(now);
    startDate.setDate(now.getDate() - day + (day === 0 ? -6 : 1)); // Mon start
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    const diff = endDate.getTime() - startDate.getTime();
    yesterdayStart = new Date(startDate.getTime() - diff - 1);
    yesterdayEnd = new Date(startDate.getTime() - 1);
  } else {
    // DEFAULT: MONTH (DENGAN CUTOFF CERDAS)
    if (cutoffDay === 1) {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else {
      if (now.getDate() >= cutoffDay) {
        startDate = new Date(now.getFullYear(), now.getMonth(), cutoffDay, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, cutoffDay - 1, 23, 59, 59);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, cutoffDay, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), cutoffDay - 1, 23, 59, 59);
      }
    }
    const diff = endDate.getTime() - startDate.getTime();
    yesterdayStart = new Date(startDate.getTime() - diff - 1);
    yesterdayEnd = new Date(startDate.getTime() - 1);
  }

  // 1. Murid baru periode ini (siswa yang createdAt dalam range)
  const [muridBariIni, muridKemarin] = await Promise.all([
    prisma.siswa.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
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
    const date = subDays(now, i);
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
  const kelasIds = pendaftaranPerProgram.map((p: any) => p.kelasId);
  const kelasList = await prisma.kelas.findMany({
    where: { id: { in: kelasIds } },
    include: { program: { select: { id: true, nama: true, tipe: true } } },
  });

  // Group by program
  const programMap: Record<string, { nama: string; tipe: string; jumlahSiswa: number }> = {};
  for (const p of pendaftaranPerProgram) {
    const kelas = kelasList.find((k: any) => k.id === p.kelasId);
    if (!kelas?.program) continue;
    const key = kelas.program.id;
    if (!programMap[key]) {
      programMap[key] = { nama: kelas.program.nama, tipe: kelas.program.tipe, jumlahSiswa: 0 };
    }
    programMap[key].jumlahSiswa += p._count.siswaId;
  }
  const siswaPerProgram = (Object.values(programMap) as any[]).sort((a: any, b: any) => b.jumlahSiswa - a.jumlahSiswa);

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
