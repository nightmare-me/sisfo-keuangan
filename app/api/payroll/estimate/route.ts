import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";
import { calculateAdvFee, AdvCategory, calculateBonusTalent } from "@/lib/payroll";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = (session?.user as any)?.id;
    const now = new Date();
    
    // 0. AMBIL CONFIG KEUANGAN DARI DB
    const dbConfigs = await prisma.financialConfig.findMany();
    const config: Record<string, number> = {};
    dbConfigs.forEach(c => {
      config[c.key] = c.value;
    });

    const cutoffDay = config.PAYROLL_CUTOFF_DAY || 25;
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Hitung Range Berdasarkan Cutoff (Misal: 25 Maret - 24 April untuk Gaji April)
    // Jika hari ini >= cutoff, berarti kita melihat periode berjalan (Cutoff Bulan Ini - Cutoff Bulan Depan)
    // Jika hari ini < cutoff, berarti kita melihat (Cutoff Bulan Lalu - Cutoff Bulan Ini)
    let start, end;
    if (now.getDate() >= cutoffDay) {
      start = new Date(currentYear, currentMonth - 1, cutoffDay, 0, 0, 0);
      end = new Date(currentYear, currentMonth, cutoffDay - 1, 23, 59, 59);
    } else {
      start = new Date(currentYear, currentMonth - 2, cutoffDay, 0, 0, 0);
      end = new Date(currentYear, currentMonth - 1, cutoffDay - 1, 23, 59, 59);
    }

    // 1. Ambil Profil Karyawan & User Info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        karyawanProfile: true,
        role: true,
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const profile = user.karyawanProfile;
    const items = [];

    // 2. Gaji Pokok & Tunjangan (Jika ada)
    if (profile?.gajiPokok && profile.gajiPokok > 0) {
      items.push({ label: "Gaji Pokok", amount: profile.gajiPokok });
    }
    if (profile?.tunjangan && profile.tunjangan > 0) {
      items.push({ label: "Tunjangan Tetap", amount: profile.tunjangan });
    }

    // 3. Insentif CS (Berdasarkan Pemasukan Bulan Ini)
    if (user.role?.slug === "cs") {
      const closingBulanIni = await prisma.pemasukan.findMany({
        where: {
          csId: userId,
          tanggal: { gte: start, lte: end },
        },
      });

      let totalFeeClosing = 0;
      closingBulanIni.forEach(p => {
        // Logika fee closing bisa statis dari profil atau dinamis per program
        // Di sini kita pakai feeClosing dari profil sebagai default
        totalFeeClosing += profile?.feeClosing || 0;
      });

      if (totalFeeClosing > 0) {
        items.push({ label: "Insentif Closing CS", amount: totalFeeClosing, count: closingBulanIni.length });
      }
    }

    // 4. Honor Mengajar (Berdasarkan Sesi Selesai Bulan Ini)
    if (user.role?.slug === "pengajar") {
      const sesiBulanIni = await prisma.sesiKelas.findMany({
        where: {
          kelas: { pengajarId: userId },
          tanggal: { gte: start, lte: end },
          status: "SELESAI",
        },
        include: { kelas: true }
      });

      let totalHonor = 0;
      sesiBulanIni.forEach(s => {
        totalHonor += s.kelas.feePerSesi || 0;
      });

      if (totalHonor > 0) {
        items.push({ label: "Honor Mengajar", amount: totalHonor, count: sesiBulanIni.length });
      }
    }

    // 5. Fee Advertiser (Berdasarkan Average CPL Bulan Ini)
    const allRoles = user.secondaryRoles || [];
    if (user.role?.slug === "advertiser" || allRoles.includes("advertiser")) {
      const adsBulanIni = await prisma.marketingAd.aggregate({
        where: {
          advId: userId,
          tanggal: { gte: start, lte: end }
        },
        _sum: { spent: true, leads: true },
        _count: true
      });

      const totalSpent = adsBulanIni._sum.spent || 0;
      const totalLeads = adsBulanIni._sum.leads || 0;
      const avgCpl = totalLeads > 0 ? totalSpent / totalLeads : 0;

      // Ambil kategori dari teamType pertama
      const teamTypeRaw = user.teamType;
      const firstTeam = Array.isArray(teamTypeRaw) ? teamTypeRaw[0] : (teamTypeRaw as string);
      
      const feeTotal = calculateAdvFee(
        (firstTeam || "ADV_REGULAR") as AdvCategory, 
        avgCpl, 
        totalLeads
      );

      if (feeTotal > 0) {
        items.push({ 
          label: "Fee Performa Iklan (Avg CPL)", 
          amount: feeTotal, 
          count: totalLeads
        });
      }
    }

    // 6. Bonus Talent (Berdasarkan Omset Live Bulan Ini)
    if (user.role?.slug === "talent" || allRoles.includes("talent")) {
      const closingBulanIni = await prisma.pemasukan.findMany({
        where: {
          talentId: userId,
          tanggal: { gte: start, lte: end }
        }
      });

      const totalOmsetTalent = closingBulanIni.reduce((acc, curr) => acc + curr.hargaFinal, 0);
      const bonusTalent = calculateBonusTalent(totalOmsetTalent);

      if (bonusTalent > 0) {
        items.push({ 
          label: "Bonus Omset Live Talent", 
          amount: bonusTalent, 
          count: closingBulanIni.length 
        });
      }
    }

    const totalEstimasi = items.reduce((acc, curr) => acc + curr.amount, 0);

    return NextResponse.json({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      items,
      totalEstimasi
    });

  } catch (error: any) {
    console.error("Estimate Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
