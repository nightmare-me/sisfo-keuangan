import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  // const role = (session?.user as any)?.role?.toString().toUpperCase();
  // if (!session || !(["ADMIN", "CEO", "FINANCE"].includes(role))) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    let configs = await prisma.financialConfig.findMany({
      orderBy: { category: "asc" }
    });

    // AUTO-SEED if empty
    if (configs.length === 0) {
      const initialConfigs = [
        { key: "GAJI_LIVE_PER_JAM", value: 13500, label: "Gaji Live per Jam", category: "GAJI", description: "Tarif gaji per jam untuk sesi Live Talent" },
        { key: "FEE_CS_RO_PERCENT", value: 0.05, label: "Fee CS RO (%)", category: "FEE", description: "Persentase fee untuk pendaftaran Repeat Order (Default: 5% atau 0.05)" },
        { key: "FEE_AFFILIATE_FIXED", value: 25000, label: "Fee Affiliate Fixed", category: "FEE", description: "Nominal fee tetap untuk pendaftaran jalur Affiliate" },
        { key: "SHARING_TOEFL_TEAM_PERCENT", value: 0.5, label: "Sharing TOEFL Tim (%)", category: "SHARING", description: "Porsi keuntungan TOEFL yang dibagikan ke tim (Default: 50% atau 0.5)" },
        { key: "RATE_SHARING_CEO", value: 0.825, label: "Rate Sharing CEO", category: "SHARING_DETAIL", description: "Jatah CEO dari total sharing tim (Default: 82.5%)" },
        { key: "RATE_SHARING_COO", value: 0.05, label: "Rate Sharing COO", category: "SHARING_DETAIL", description: "Jatah COO dari total sharing tim (Default: 5%)" },
        { key: "RATE_SHARING_SPV_AKADEMIK", value: 0.05, label: "Rate Sharing SPV Akademik", category: "SHARING_DETAIL", description: "Jatah SPV Akademik (Default: 5%)" },
        { key: "BONUS_GROSS_CEO", value: 0.015, label: "Bonus Gross CEO (%)", category: "BONUS", description: "Bonus dari Omset Bruto untuk CEO (Default: 1.5%)" },
        { key: "BONUS_GROSS_COO", value: 0.03, label: "Bonus Gross COO (%)", category: "BONUS", description: "Bonus dari Omset Bruto untuk COO (Default: 3%)" },
      ];

      for (const c of initialConfigs) {
        await prisma.financialConfig.create({ data: c });
      }
      configs = await prisma.financialConfig.findMany({ orderBy: { category: "asc" } });
    }

    return NextResponse.json(configs);
  } catch (error: any) {
    console.error("FINANCIAL_SETTINGS_GET_ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role?.toString().toUpperCase();
  if (!session || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await request.json();
    
    if (data.id) {
      // UPDATE EXISTING
      const updated = await prisma.financialConfig.update({
        where: { id: data.id },
        data: { 
          value: parseFloat(data.value),
          label: data.label,
          description: data.description 
        }
      });
      return NextResponse.json(updated);
    } else {
      // CREATE NEW
      const created = await prisma.financialConfig.create({
        data: {
          key: data.key,
          value: parseFloat(data.value),
          label: data.label,
          description: data.description,
          category: data.category
        }
      });
      return NextResponse.json(created);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
