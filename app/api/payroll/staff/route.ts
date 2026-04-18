import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfMonth, endOfMonth } from "date-fns";
import { 
  calculateCSFee, 
  calculateAdvFee, 
  calculateBonusTalent, 
  calculateBonusAkademikRO, 
  calculateBonusMultimediaEksternal,
  calculateSharingTOEFL,
  calculateBonusGrossProfit,
  calculateGajiLive
} from "@/lib/payroll";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const bulan = parseInt(searchParams.get("bulan") ?? String(new Date().getMonth() + 1));
    const tahun = parseInt(searchParams.get("tahun") ?? String(new Date().getFullYear()));

    const dayStart = startOfMonth(new Date(tahun, bulan - 1));
    const dayEnd = endOfMonth(new Date(tahun, bulan - 1));

    // 1. HITUNG METRIK GLOBAL (Profit)
    const [pemasukanAll, approvedRefunds, pengeluaranAll, adsAll] = await Promise.all([
      prisma.pemasukan.findMany({ 
        where: { tanggal: { gte: dayStart, lte: dayEnd } },
        include: { program: true }
      }),
      prisma.refund.findMany({ where: { status: "APPROVED", createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.pengeluaran.findMany({ where: { tanggal: { gte: dayStart, lte: dayEnd } } }),
      prisma.spentAds.aggregate({ where: { tanggal: { gte: dayStart, lte: dayEnd } }, _sum: { jumlah: true } })
    ]);

    const totalRefund = approvedRefunds.reduce((s, r) => s + r.jumlah, 0);
    const totalPemasukan = pemasukanAll.reduce((s, p) => s + p.hargaFinal, 0);
    const grossProfit = totalPemasukan - totalRefund;

    const opCosts = pengeluaranAll
        .filter(exp => exp.kategori !== "GAJI_STAF" && exp.kategori !== "GAJI_PENGAJAR")
        .reduce((s, e) => s + e.jumlah, 0);
    
    // Revenue TOEFL Khusus
    const toeflRevenue = pemasukanAll
        .filter(p => p.program?.nama.toUpperCase().includes("TOEFL"))
        .reduce((s, p) => s + p.hargaFinal, 0);
    
    // Untuk saat ini asumsi Profit TOEFL = Revenue TOEFL (kecuali ada biaya spesifik)
    const toeflProfit = toeflRevenue; 

    // 2. AMBIL SEMUA KARYAWAN
    const employees = await prisma.user.findMany({
      where: { karyawanProfile: { isNot: null }, aktif: true },
      include: { 
        karyawanProfile: true,
        adPerformances: { where: { date: { gte: dayStart, lte: dayEnd } } },
        liveSessions: { where: { tanggal: { gte: dayStart, lte: dayEnd } } },
        pemasukan: { where: { tanggal: { gte: dayStart, lte: dayEnd } }, include: { program: true } }, // As CS
        pemasukanTalent: { where: { tanggal: { gte: dayStart, lte: dayEnd } } } // As Talent
      }
    });

    const results = employees.map(emp => {
      const profile = emp.karyawanProfile!;
      const posisi = profile.posisi || "";
      let totalFee = 0;
      let totalBonus = 0;
      let extraGaji = 0;

      // A. Hitung Gaji Live
      const totalJam = emp.liveSessions.reduce((s, l) => s + l.durasi, 0);
      extraGaji += calculateGajiLive(totalJam);

      // B. Hitung Fee CS (Jika Role CS)
      if (emp.role === "CS") {
        emp.pemasukan.forEach(p => {
          totalFee += calculateCSFee(
            (emp.teamType || "CS_REGULAR") as any,
            p.program?.kategoriFee || "",
            p.hargaFinal,
            p.isRO
            // CR logic could be added here if session stats available
          );
        });
      }

      // C. Hitung Fee Advertiser
      if (emp.role === "ADVERTISER" || posisi.includes("ADV")) {
        emp.adPerformances.forEach(perf => {
          totalFee += perf.fee; // Already calculated in API Performance
        });
      }

      // D. Bonus Omset Talent
      const omsetTalent = emp.pemasukanTalent.reduce((s, p) => s + p.hargaFinal, 0);
      totalBonus += calculateBonusTalent(omsetTalent);

      // E. Bonus Akademik (RO Omset) - If role is Akademik or SPV Akademik
      if (posisi.toUpperCase().includes("AKADEMIK")) {
          const totalRO = pemasukanAll.filter(p => p.isRO).reduce((s, p) => s + p.hargaFinal, 0);
          totalBonus += calculateBonusAkademikRO(totalRO);
      }

      // F. Profit Shared Bonuses (CEO, COO, SPV, etc)
      totalBonus += calculateBonusGrossProfit(grossProfit, posisi);
      totalBonus += calculateSharingTOEFL(toeflProfit, posisi);

      const subtotal = profile.gajiPokok + profile.tunjangan + totalFee + totalBonus + extraGaji;

      return {
        id: emp.id,
        name: emp.name,
        posisi,
        gapok: profile.gajiPokok,
        tunjangan: profile.tunjangan,
        fee: totalFee,
        bonus: totalBonus,
        gajiLive: extraGaji,
        total: subtotal,
        details: {
          jamLive: totalJam,
          omsetTalent
        }
      };
    });

    return NextResponse.json({ 
        data: results,
        metrics: {
            grossProfit,
            toeflProfit,
            totalPemasukan,
            totalRefund
        }
    });

  } catch (err: any) {
    console.error("PAYROLL_STAFF_ERROR:", err);
    return NextResponse.json({ 
        error: err.message, 
        data: [], 
        metrics: { grossProfit: 0, toeflProfit: 0, totalPemasukan: 0, totalRefund: 0 } 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { userId, bulan, tahun, gapok, tunjangan, fee, bonus, total, metodeBayar, keterangan } = body;

        const record = await prisma.gajiStaf.create({
            data: {
                userId, bulan, tahun, gapok, tunjangan, fee, bonus, total, metodeBayar, keterangan,
                statusBayar: "LUNAS",
                tanggalBayar: new Date()
            }
        });

        // OTOMATIS CATAT KE PENGELUARAN
        await prisma.pengeluaran.create({
            data: {
                tanggal: new Date(),
                jumlah: total,
                kategori: "GAJI_STAF",
                metodeBayar: metodeBayar || "TRANSFER",
                keterangan: `Gaji Staff: ${record.userId} (${bulan}/${tahun}). ${keterangan || ""}`,
                dibuatOleh: (session.user as any).id
            }
        });

        return NextResponse.json(record);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
