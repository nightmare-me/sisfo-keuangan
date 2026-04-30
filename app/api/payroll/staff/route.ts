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
  calculateGajiLive,
  AdvCategory
} from "@/lib/payroll";


export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const bulan = parseInt(searchParams.get("bulan") ?? String(new Date().getMonth() + 1));
    const tahun = parseInt(searchParams.get("tahun") ?? String(new Date().getFullYear()));
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    // 0. AMBIL CONFIG KEUANGAN DARI DB
    const dbConfigs = await prisma.financialConfig.findMany();
    const config: Record<string, number> = {};
    dbConfigs.forEach(c => {
      config[c.key] = c.value;
    });

    const cutoffDay = config.PAYROLL_CUTOFF_DAY || 25;

    // Hitung Range Berdasarkan Cutoff (Misal: 25 Maret - 24 April untuk Gaji April)
    const dayStart = new Date(tahun, bulan - 2, cutoffDay, 0, 0, 0);
    const dayEnd = new Date(tahun, bulan - 1, cutoffDay - 1, 23, 59, 59);

    // 1. HITUNG METRIK GLOBAL (Profit) - Tetap untuk seluruh data bulan ini
    const [pemasukanAll, approvedRefunds, pengeluaranAll, adsAll] = await Promise.all([
      prisma.pemasukan.findMany({ 
        where: { tanggal: { gte: dayStart, lte: dayEnd } },
        include: { program: true }
      }),
      prisma.refund.findMany({ where: { status: "APPROVED", createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.pengeluaran.findMany({ where: { tanggal: { gte: dayStart, lte: dayEnd } } }),
      prisma.marketingAd.aggregate({ where: { tanggal: { gte: dayStart, lte: dayEnd } }, _sum: { spent: true } })
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
      
      const ket = p.keterangan || "";
      const typeMatch = ket.match(/\[TYPE:(.*?)\]/);
      const extractedType = typeMatch ? typeMatch[1] : (p.program?.kategoriFee || "");

      toeflFeeCS += calculateCSFee(
        "CS_TOEFL",
        extractedType,
        p.hargaFinal,
        p.isRO,
        0,
        p.program || undefined,
        config
      );
    });

    const toeflAdsSpent = adsAll._sum.spent ?? 0;

    const toeflTeam = await prisma.user.findMany({ 
      where: { teamType: { has: "ADV_TOEFL" } }, 
      include: { marketingAds: { where: { tanggal: { gte: dayStart, lte: dayEnd } } } } 
    });
    
    toeflTeam.forEach((adv: any) => {
       adv.marketingAds.forEach((perf: any) => {
         toeflFeeAdv += calculateAdvFee("ADV_TOEFL" as any, perf.cpl, perf.leads);
       });
    });

    // IDENTIFIKASI PENGELUARAN KHUSUS TOEFL (Operasional & Gaji Data Support)
    // Otomatis memotong pengeluaran yang kategorinya mengandung kata "TOEFL"
    const toeflExpenses = pengeluaranAll
      .filter((exp: any) => exp.kategori && exp.kategori.toUpperCase().includes("TOEFL"))
      .reduce((s: number, e: any) => s + e.jumlah, 0);

    const toeflProfit = toeflRevenue - toeflFeeCS - toeflFeeAdv - toeflAdsSpent - toeflExpenses;


    // 3. AMBIL KARYAWAN (Paginated)
    const empWhere = { karyawanProfile: { isNot: null }, aktif: true };
    const [employees, totalEmp] = await Promise.all([
      prisma.user.findMany({
        where: empWhere,
        include: { 
          role: true,
          karyawanProfile: true,
          marketingAds: { where: { tanggal: { gte: dayStart, lte: dayEnd } } },
          liveSessions: { where: { tanggal: { gte: dayStart, lte: dayEnd } } },
          pemasukan: { where: { tanggal: { gte: dayStart, lte: dayEnd } }, include: { program: true } },
          pemasukanTalent: { where: { tanggal: { gte: dayStart, lte: dayEnd } } }
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where: empWhere })
    ]);

    const results = employees.map((emp: any) => {
      const profile = emp.karyawanProfile!;
      const posisi = profile.posisi || "";
      const roleSlug = emp.role?.slug?.toLowerCase();
      // Gabungkan semua role (primary + secondary) untuk logika fee
      const allRoles: string[] = [roleSlug, ...(emp.secondaryRoles || []).map((r: string) => r.toLowerCase())].filter(Boolean);
      let totalFee = 0;
      let feeCS = 0;
      let feeAdv = 0;
      let totalBonus = 0;
      let extraGaji = 0;

      // A. Hitung Gaji Live
      const totalJam = emp.liveSessions.reduce((s: number, l: any) => s + l.durasi, 0);
      extraGaji += calculateGajiLive(totalJam, config);

      // B. Hitung Fee CS (Jika punya role cs — primary ATAU secondary)
      if (allRoles.includes("cs") || allRoles.includes("spv_cs")) {
        // SPV CS tidak input closing sendiri, skip fee CS untuk spv_cs pure
        if (allRoles.includes("cs")) {
          emp.pemasukan.forEach((p: any) => {
            let feeCategory = "CS_REGULAR";
            const progName = p.program?.nama?.toLowerCase() || "";
            if (p.isRO) feeCategory = "CS_RO";
            else if (progName.includes("toefl") || progName.includes("ielts") || progName.includes("elite") || progName.includes("master")) feeCategory = "CS_TOEFL";
            else if (progName.includes("live")) feeCategory = "CS_LIVE";
            else if (progName.includes("affiliate")) feeCategory = "CS_AFFILIATE";

            const ket = p.keterangan || "";
            const typeMatch = ket.match(/\[TYPE:(.*?)\]/);
            const extractedType = typeMatch ? typeMatch[1] : (p.program?.kategoriFee || "");

            feeCS += calculateCSFee(
              feeCategory as any,
              extractedType,
              p.hargaFinal,
              p.isRO,
              0,
              p.program || undefined,
              config
            );
          });
        }
      }

      // C. Hitung Fee Advertiser (Jika punya role advertiser/spv_adv — primary ATAU secondary)
      if (allRoles.includes("advertiser") || allRoles.includes("spv_adv") || posisi.toUpperCase().includes("ADV")) {
        const totalSpent = emp.marketingAds.reduce((s: number, p: any) => s + p.spent, 0);
        const totalLeads = emp.marketingAds.reduce((s: number, p: any) => s + p.leads, 0);
        
        if (totalLeads > 0) {
          const avgCPL = totalSpent / totalLeads;
          
          // Cari kategori ADV_ dari teamType atau default ke ADV_REGULAR
          const teamTypes = Array.isArray(emp.teamType) ? emp.teamType : [];
          let advCat = teamTypes.find((t: string) => t.startsWith("ADV_"));
          
          // Fallback: Jika tidak ada ADV_ di teamType, coba cari di roles
          if (!advCat && allRoles.includes("advertiser")) advCat = "ADV_REGULAR";
          
          feeAdv = calculateAdvFee((advCat || 'ADV_REGULAR') as AdvCategory, avgCPL, totalLeads);
        }
      }

      // Gabungkan semua fee
      totalFee = feeCS + feeAdv;

      // D. Bonus Omset Talent
      const omsetTalent = emp.pemasukanTalent.reduce((s: number, p: any) => s + p.hargaFinal, 0);
      totalBonus += calculateBonusTalent(omsetTalent);

      // E. Bonus Akademik (RO Omset) - If role is Akademik or SPV Akademik
      if (posisi.toUpperCase().includes("AKADEMIK")) {
          const totalRO = pemasukanAll.filter((p: any) => p.isRO).reduce((s: number, p: any) => s + p.hargaFinal, 0);
          totalBonus += calculateBonusAkademikRO(totalRO, config);
      }

      // F. Profit Shared Bonuses (HANYA UNTUK POSISI TERTENTU)
      const isAkademik = posisi.toUpperCase().includes("AKADEMIK");
      const whitelistBonus = ["CEO", "COO", "ASSISTANT CEO", "FINANCE", "SPV"];
      const isWhitelisted = !isAkademik && whitelistBonus.some(w => posisi.toUpperCase().includes(w));

      if (isWhitelisted) {
        // Coba cari dengan format UNDERSCORE (SPV_ADV)
        const posUnderscore = posisi.toUpperCase().trim().replace(/\s+/g, "_");
        const bonus1 = calculateBonusGrossProfit(grossProfit, posUnderscore, config);
        const sharing1 = calculateSharingTOEFL(toeflProfit, posUnderscore, config);

        // Coba cari dengan format SPASI (SPV ADV) jika hasil 0
        const posSpace = posisi.toUpperCase().trim().replace(/_/g, " ");
        const bonus2 = calculateBonusGrossProfit(grossProfit, posSpace, config);
        const sharing2 = calculateSharingTOEFL(toeflProfit, posSpace, config);

        totalBonus += (bonus1 || bonus2 || 0);
        totalBonus += (sharing1 || sharing2 || 0);
      }

      const subtotal = profile.gajiPokok + profile.tunjangan + totalFee + totalBonus + extraGaji;

      return {
        id: emp.id,
        name: emp.name,
        posisi,
        roles: allRoles, // Kirim semua role ke frontend untuk tampilan
        gapok: profile.gajiPokok,
        tunjangan: profile.tunjangan,
        fee: totalFee,
        feeCS,
        feeAdv,
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
        total: totalEmp,
        page,
        totalPages: Math.ceil(totalEmp / limit),
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
