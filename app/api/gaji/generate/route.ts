import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfMonth, endOfMonth } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { bulan, tahun } = body;

    if (!bulan || !tahun) {
      return NextResponse.json({ error: "Bulan dan Tahun wajib diisi" }, { status: 400 });
    }

    // 1. Ambil Config Cutoff
    const configs = await prisma.financialConfig.findMany({
      where: { key: "PAYROLL_CUTOFF_DAY" }
    });
    const cutoffDay = configs.find(c => c.key === "PAYROLL_CUTOFF_DAY")?.value || 25;

    // 2. Hitung Range Cutoff
    const dayStart = new Date(tahun, bulan - 2, cutoffDay + 1, 0, 0, 0);
    const dayEnd = new Date(tahun, bulan - 1, cutoffDay, 23, 59, 59);

    // 3. Cari SEMUA sesi yang SELESAI di periode tersebut
    const sessions = await prisma.sesiKelas.findMany({
      where: {
        status: "SELESAI",
        tanggal: { gte: dayStart, lte: dayEnd },
      },
      include: {
        kelas: {
          select: {
            id: true,
            pengajarId: true,
            feePerSesi: true
          }
        }
      }
    });

    // 4. Kelompokkan berdasarkan Pengajar & Kelas
    const payrollDrafts: Record<string, { count: number, total: number, pengajarId: string, kelasId: string, fee: number }> = {};

    sessions.forEach(s => {
      if (!s.kelas.pengajarId) return;
      const key = `${s.kelas.pengajarId}-${s.kelas.id}`;
      if (!payrollDrafts[key]) {
        payrollDrafts[key] = { 
          count: 0, 
          total: 0, 
          pengajarId: s.kelas.pengajarId, 
          kelasId: s.kelas.id, 
          fee: s.kelas.feePerSesi || 0 
        };
      }
      payrollDrafts[key].count += 1;
      payrollDrafts[key].total += (s.kelas.feePerSesi || 0);
    });

    // 5. Simpan ke database (hanya jika belum ada recordnya)
    let createdCount = 0;
    const results = [];

    for (const key in payrollDrafts) {
      const draft = payrollDrafts[key];
      
      // 1. Cek apakah sudah ada record di GajiPengajar (Tabel ini)
      const existingGaji = await prisma.gajiPengajar.findFirst({
        where: {
          pengajarId: draft.pengajarId,
          kelasId: draft.kelasId,
          bulan: parseInt(bulan),
          tahun: parseInt(tahun)
        }
      });

      // 2. Cek apakah sudah ada record di GajiStaf (Karena honor mengajar sudah include di sana)
      const existingStaf = await prisma.gajiStaf.findFirst({
        where: {
          userId: draft.pengajarId,
          bulan: parseInt(bulan),
          tahun: parseInt(tahun)
        }
      });

      if (!existingGaji && !existingStaf && draft.count > 0) {
        const newGaji = await prisma.gajiPengajar.create({
          data: {
            pengajarId: draft.pengajarId,
            kelasId: draft.kelasId,
            bulan: parseInt(bulan),
            tahun: parseInt(tahun),
            jumlahSesi: draft.count,
            tarifPerSesi: draft.fee,
            totalGaji: draft.total,
            statusBayar: "BELUM_BAYAR",
            metodeBayar: "TRANSFER",
            keterangan: "Generated Automatically"
          }
        });
        results.push(newGaji);
        createdCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${createdCount} draf gaji berhasil di-generate.`,
      data: results 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
