import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient({ log: ['query', 'error', 'info', 'warn'] });

async function main() {
  console.log("🌱 Seeding Financial Configs...");

  const configs = [
    // GAJI & FEE
    { key: "GAJI_LIVE_PER_JAM", value: 13500, label: "Gaji Live per Jam", category: "GAJI", description: "Tarif gaji per jam untuk sesi Live Talent" },
    { key: "FEE_CS_RO_PERCENT", value: 0.05, label: "Fee CS RO (%)", category: "FEE", description: "Persentase fee untuk pendaftaran Repeat Order (Default: 5%)" },
    { key: "FEE_AFFILIATE_FIXED", value: 25000, label: "Fee Affiliate Fixed", category: "FEE", description: "Nominal fee tetap untuk pendaftaran jalur Affiliate" },
    
    // SHARING PROFIT
    { key: "SHARING_TOEFL_TEAM_PERCENT", value: 0.5, label: "Sharing TOEFL Tim (%)", category: "SHARING", description: "Porsi keuntungan TOEFL yang dibagikan ke tim (Default: 50% atau 0.5)" },
    
    // SHARING TOEFL RATES (Dari 100% jatah tim)
    { key: "RATE_SHARING_CEO", value: 0.825, label: "Rate Sharing CEO", category: "SHARING_DETAIL", description: "Jatah CEO dari total sharing tim (Default: 82.5%)" },
    { key: "RATE_SHARING_COO", value: 0.05, label: "Rate Sharing COO", category: "SHARING_DETAIL", description: "Jatah COO dari total sharing tim (Default: 5%)" },
    { key: "RATE_SHARING_SPV_AKADEMIK", value: 0.05, label: "Rate Sharing SPV Akademik", category: "SHARING_DETAIL", description: "Jatah SPV Akademik (Default: 5%)" },
    
    // BONUS OMSET / PROFIT
    { key: "BONUS_GROSS_CEO", value: 0.015, label: "Bonus Gross CEO (%)", category: "BONUS", description: "Bonus dari Omset Bruto untuk CEO (Default: 1.5%)" },
    { key: "BONUS_GROSS_COO", value: 0.03, label: "Bonus Gross COO (%)", category: "BONUS", description: "Bonus dari Omset Bruto untuk COO (Default: 3%)" },
  ];

  for (const c of configs) {
    await prisma.financialConfig.upsert({
      where: { key: c.key },
      update: {},
      create: c
    });
  }

  console.log("✅ Seeding Financial Configs Selesai!");
}

main();
