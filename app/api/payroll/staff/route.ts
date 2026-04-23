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

    const totalRefund = approvedRefunds.reduce((s: number, r: any) => s + r.jumlah, 0);
    const totalPemasukan = pemasukanAll.reduce((s: number, p: any) => s + p.hargaFinal, 0);
    const grossProfit = totalPemasukan - totalRefund;

    const opCosts = pengeluaranAll
        .filter((exp: any) => exp.kategori !== "GAJI_STAF" && exp.kategori !== "GAJI_PENGAJAR")
        .reduce((s: number, e: any) => s + e.jumlah, 0);
    
    // 2. ANALISIS KHUSUS TOEFL (Sesuai Gambar Flowchart)
    let toeflRevenue = 0;
    let toeflFeeCS = 0;
    let toeflFeeAdv = 0;
    
    pemasukanAll.filter((p: any) => p.program?.isProfitSharing).forEach((p: any) => {
      toeflRevenue += p.hargaFinal;
      // Hitung jatah CS untuk pengeluaran TOEFL
      toeflFeeCS += calculateCSFee(
        "CS_TOEFL",
        p.program?.nama?.toUpperCase() || "",
        p.hargaFinal,
        p.isRO,
        0,
        p.program || undefined
      );
    });

    // Ambil pengeluaran iklan TOEFL (Asumsi Platform Ads dengan Keterangan TOEFL atau dari Advertiser khusus TOEFL)
    const toeflAdsSpent = adsAll._sum.jumlah || 0; // Sementara ambil total ads atau filter jika ada kategori

    // Hitung jatah Adv untuk pengeluaran TOEFL
    const toeflTeam = await prisma.user.findMany({ where: { teamType: "ADV_TOEFL" as any }, include: { adPerformances: { where: { date: { gte: dayStart, lte: dayEnd } } } } });
    toeflTeam.forEach((adv: any) => {
       adv.adPerformances.forEach((perf: any) => {
         toeflFeeAdv += calculateAdvFee("ADV_TOEFL" as any, perf.cpl, perf.leads);
       });
    });

    // PROFIT TOEFL MURNI (Sesuai Bagan Bapak: Pemasukan - Pengeluaran)
    const toeflProfit = toeflRevenue - toeflFeeCS - toeflFeeAdv - toeflAdsSpent;

    // 3. AMBIL SEMUA KARYAWAN
    const employees = await prisma.user.findMany({
      where: { karyawanProfile: { isNot: null }, aktif: true },
      include: { 
        role: true,
        karyawanProfile: true,
        adPerformances: { where: { date: { gte: dayStart, lte: dayEnd } } },
        liveSessions: { where: { tanggal: { gte: dayStart, lte: dayEnd } } },
        pemasukan: { where: { tanggal: { gte: dayStart, lte: dayEnd } }, include: { program: true } }, // As CS
        pemasukanTalent: { where: { tanggal: { gte: dayStart, lte: dayEnd } } } // As Talent
      }
    });

    const results = employees.map((emp: any) => {
      const profile = emp.karyawanProfile!;
      const posisi = profile.posisi || "";
      const roleSlug = emp.role?.slug?.toLowerCase();
      let totalFee = 0;
      let totalBonus = 0;
      let extraGaji = 0;

      // A. Hitung Gaji Live
      const totalJam = emp.liveSessions.reduce((s: number, l: any) => s + l.durasi, 0);
      extraGaji += calculateGajiLive(totalJam);

      // B. Hitung Fee CS (Jika Role CS)
      if (roleSlug === "cs") {
        emp.pemasukan.forEach((p: any) => {
          // Tentukan kategori fee berdasarkan konteks pendaftaran/program
          let feeCategory = "CS_REGULAR";
          const progName = p.program?.nama?.toLowerCase() || "";
          
          if (p.isRO) feeCategory = "CS_RO";
          else if (progName.includes("toefl") || progName.includes("ielts")) feeCategory = "CS_TOEFL";
          else if (progName.includes("live")) feeCategory = "CS_LIVE";

          totalFee += calculateCSFee(
            feeCategory as any,
            p.program?.kategoriFee || "",
            p.hargaFinal,
            p.isRO,
            0,
            p.program || undefined
          );
        });
      }

      // C. Hitung Fee Advertiser
      if (roleSlug === "advertiser" || posisi.toUpperCase().includes("ADV")) {
        emp.adPerformances.forEach((perf: any) => {
          totalFee += perf.fee; // Already calculated in API Performance
        });
      }

      // D. Bonus Omset Talent
      const omsetTalent = emp.pemasukanTalent.reduce((s: number, p: any) => s + p.hargaFinal, 0);
      totalBonus += calculateBonusTalent(omsetTalent);

      // E. Bonus Akademik (RO Omset) - If role is Akademik or SPV Akademik
      if (posisi.toUpperCase().includes("AKADEMIK")) {
          const totalRO = pemasukanAll.filter((p: any) => p.isRO).reduce((s: number, p: any) => s + p.hargaFinal, 0);
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

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all");

  if (all === "true") {
    await prisma.gajiStaf.deleteMany({});
    return NextResponse.json({ success: true });
  }

  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  await prisma.gajiStaf.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
