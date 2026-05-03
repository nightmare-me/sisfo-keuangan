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

    // 3. HITUNG GROSS PROFIT TERPISAH (GLOBAL VS TOEFL)
    const [pemasukanAll, pengeluaranAll, refundsAll, adsAll] = await Promise.all([
      prisma.pemasukan.findMany({ where: { tanggal: { gte: dayStart, lte: dayEnd } }, include: { program: true } }),
      prisma.pengeluaran.findMany({ where: { tanggal: { gte: dayStart, lte: dayEnd } } }),
      prisma.refund.findMany({ 
        where: { status: "APPROVED", pemasukan: { tanggal: { gte: dayStart, lte: dayEnd } } },
        include: { pemasukan: { include: { program: true } } }
      }),
      prisma.marketingAd.findMany({ where: { tanggal: { gte: dayStart, lte: dayEnd } } })
    ]);

    // A. KATEGORISASI TOEFL
    const toeflRevenue = pemasukanAll.filter((p: any) => p.program?.isProfitSharing).reduce((s, p) => s + p.hargaFinal, 0);
    const toeflAdsSpent = adsAll.filter((a: any) => a.kategori?.toUpperCase().includes("TOEFL")).reduce((s, a) => s + (a.spent || 0), 0);
    const toeflExpenses = pengeluaranAll.filter((e: any) => e.kategori?.toUpperCase().includes("TOEFL")).reduce((s, e) => s + e.jumlah, 0);
    const toeflRefund = refundsAll.filter((r: any) => r.pemasukan?.program?.isProfitSharing).reduce((s, r) => s + r.jumlah, 0);
    
    // B. HITUNG PROFIT TOEFL (MURNI)
    // Sesuai Flowchart: TOEFL Profit = Revenue - (Fee CS + Fee Adv + Ads + Ops)
    // Note: Fee CS/Adv akan dihitung di dalam loop per karyawan, tapi untuk metrik global kita pakai estimasi atau total real.
    const toeflProfitNet = toeflRevenue - toeflRefund - toeflAdsSpent - toeflExpenses; 

    // C. HITUNG GROSS PROFIT GLOBAL (NON-TOEFL)
    const globalRevenue = pemasukanAll.filter((p: any) => !p.program?.isProfitSharing).reduce((s, p) => s + p.hargaFinal, 0);
    const globalRefund = refundsAll.filter((r: any) => !r.pemasukan?.program?.isProfitSharing).reduce((s, r) => s + r.jumlah, 0);
    const globalAds = adsAll.filter((a: any) => !a.kategori?.toUpperCase().includes("TOEFL")).reduce((s, a) => s + (a.spent || 0), 0);
    const globalExpenses = pengeluaranAll.filter((e: any) => !e.kategori?.toUpperCase().includes("TOEFL")).reduce((s, e) => s + e.jumlah, 0);
    
    const grossProfitGlobalActual = globalRevenue - globalRefund - globalAds - globalExpenses;

    // --- LOGIKA ACCRUAL UNTUK BONUS MANAJEMEN ---
    // Karena gaji sekarang sistemnya "Approve dulu baru Lunas", kita harus menghitung 
    // "Estimasi Beban Gaji" agar profit tidak terlihat terlalu tinggi saat menghitung bonus.
    const allEmpProfiles = await prisma.karyawanProfile.findMany({
      where: { user: { aktif: true } }
    });
    const totalFixedSalary = allEmpProfiles.reduce((s, p) => s + (p.gajiPokok || 0) + (p.tunjangan || 0), 0);

    // Gunakan Laba Kotor yang sudah dikurangi estimasi beban gaji tetap
    const grossProfitGlobal = grossProfitGlobalActual - totalFixedSalary;

    // Metrik untuk dikirim ke frontend
    const incomeTotal = globalRevenue + toeflRevenue;
    const refundTotal = globalRefund + toeflRefund;
    const grossProfitTotal = grossProfitGlobal + toeflProfitNet;


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

    const results = employees.map(async (emp: any) => {
      const profile = emp.karyawanProfile!;
      const posisi = profile.posisi || "";
      const roleSlug = emp.role?.slug?.toLowerCase();
      // Gabungkan semua role (primary + secondary) untuk logika fee
      const allRoles: string[] = [roleSlug, ...(emp.secondaryRoles || []).map((r: string) => r.toLowerCase())].filter(Boolean);
      
      // Cek apakah sudah ada record gaji di DB untuk bulan/tahun ini
      const existingRecord = await prisma.gajiStaf.findFirst({
        where: { userId: emp.id, bulan, tahun }
      });

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
      
      const matchedKeyword = whitelistBonus.find(w => 
        posisi.toUpperCase().includes(w) || 
        allRoles.some(r => r.toUpperCase().includes(w))
      );

      if (matchedKeyword) {
        let targetPos = posisi;
        if (matchedKeyword === "SPV") {
            const spvRole = allRoles.find(r => r.toUpperCase().includes("SPV")) || 
                            (posisi.toUpperCase().includes("SPV") ? posisi : "");
            if (spvRole) targetPos = spvRole;
        }
        const pClean = targetPos.toUpperCase().trim().replace(/\s+/g, "_").replace(/__/g, "_");
        const pSpace = pClean.replace(/_/g, " ");

        if (!isAkademik) {
            const b1 = calculateBonusGrossProfit(grossProfitGlobal, pClean, config);
            const b2 = calculateBonusGrossProfit(grossProfitGlobal, pSpace, config);
            totalBonus += (b1 || b2 || 0);
        }

        const s1 = calculateSharingTOEFL(toeflProfitNet, pClean, config);
        const s2 = calculateSharingTOEFL(toeflProfitNet, pSpace, config);
        totalBonus += (s1 || s2 || 0);
      }

      // G. Honor Mengajar (Jika punya role pengajar — primary ATAU secondary)
      let honorMengajar = 0;
      if (allRoles.includes("pengajar")) {
        const sesi = await prisma.sesiKelas.findMany({
          where: {
            kelas: { pengajarId: emp.id },
            tanggal: { gte: dayStart, lte: dayEnd },
            status: "SELESAI",
          },
          include: { kelas: true }
        });
        honorMengajar = sesi.reduce((s: number, sc: any) => s + (sc.kelas.feePerSesi || 0), 0);
      }

      const subtotal = profile.gajiPokok + profile.tunjangan + totalFee + totalBonus + extraGaji + honorMengajar;

      return {
        id: emp.id,
        name: emp.name,
        posisi,
        roles: allRoles,
        gapok: profile.gajiPokok,
        tunjangan: profile.tunjangan,
        fee: totalFee,
        feeCS,
        feeAdv,
        bonus: totalBonus,
        gajiLive: extraGaji,
        honorMengajar,
        total: subtotal,
        statusBayar: existingRecord?.statusBayar || null,
        recordId: existingRecord?.id || null,
        details: {
          jamLive: totalJam,
          omsetTalent
        }
      };
    });

    const finalResults = await Promise.all(results);

    return NextResponse.json({ 
        data: finalResults,
        total: totalEmp,
        page,
        totalPages: Math.ceil(totalEmp / limit),
        metrics: {
            grossProfit: grossProfitGlobal,
            toeflProfit: toeflProfitNet,
            totalPemasukan: incomeTotal,
            totalRefund: refundTotal
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
                statusBayar: "BELUM_BAYAR"
            }
        });

        return NextResponse.json(record);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { id, statusBayar, metodeBayar } = body;

        const existing = await prisma.gajiStaf.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

        const record = await prisma.gajiStaf.update({
            where: { id },
            data: { 
                statusBayar,
                tanggalBayar: statusBayar === "LUNAS" ? new Date() : undefined,
                metodeBayar: metodeBayar || existing.metodeBayar
            }
        });

        // Jika berubah jadi LUNAS, catat ke Pengeluaran
        if (statusBayar === "LUNAS" && existing.statusBayar !== "LUNAS") {
            await prisma.pengeluaran.create({
                data: {
                    tanggal: new Date(),
                    jumlah: existing.total,
                    kategori: "GAJI_STAF",
                    metodeBayar: metodeBayar || existing.metodeBayar || "TRANSFER",
                    keterangan: `LUNAS: Gaji Staff ${existing.userId} (${existing.bulan}/${existing.tahun})`,
                    dibuatOleh: (session.user as any).id
                }
            });

            // SINKRONISASI: Jika dia punya draf di Gaji Pengajar, ikut dilunaskan
            await prisma.gajiPengajar.updateMany({
                where: {
                    pengajarId: existing.userId,
                    bulan: existing.bulan,
                    tahun: existing.tahun,
                    statusBayar: "BELUM_BAYAR"
                },
                data: {
                    statusBayar: "LUNAS",
                    tanggalBayar: new Date()
                }
            });
        }

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
