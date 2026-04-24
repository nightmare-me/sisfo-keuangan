import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Menambahkan sisa konfigurasi bonus...");

  const configs = [
    { key: "BONUS_GROSS_ASSISTANT_CEO", value: 0.015, label: "Bonus Gross Assistant CEO (%)", category: "BONUS", description: "Bonus dari Omset Bruto untuk Assistant CEO (Default: 1.5%)" },
    { key: "BONUS_GROSS_FINANCE", value: 0.01, label: "Bonus Gross Finance (%)", category: "BONUS", description: "Bonus dari Omset Bruto untuk Finance (Default: 1%)" },
    { key: "BONUS_GROSS_SPV_ADV", value: 0.015, label: "Bonus Gross SPV Adv (%)", category: "BONUS", description: "Bonus dari Omset Bruto untuk SPV Adv (Default: 1.5%)" },
    { key: "BONUS_GROSS_SPV_MULTIMEDIA", value: 0.015, label: "Bonus Gross SPV Multimedia (%)", category: "BONUS", description: "Bonus dari Omset Bruto untuk SPV Multimedia (Default: 1.5%)" },
    
    // Tambahkan juga detail sharing TOEFL yang belum lengkap tadi
    { key: "RATE_SHARING_SPV_ADV", value: 0.025, label: "Rate Sharing SPV Adv", category: "SHARING_DETAIL", description: "Jatah SPV Adv dari total sharing tim (Default: 2.5%)" },
    { key: "RATE_SHARING_SPV_MULTIMEDIA", value: 0.02, label: "Rate Sharing SPV Multimedia", category: "SHARING_DETAIL", description: "Jatah SPV Multimedia (Default: 2%)" },
    { key: "RATE_SHARING_ASSISTANT_CEO", value: 0.02, label: "Rate Sharing Assistant CEO", category: "SHARING_DETAIL", description: "Jatah Assistant CEO (Default: 2%)" },
    { key: "RATE_SHARING_FINANCE", value: 0.01, label: "Rate Sharing Finance", category: "SHARING_DETAIL", description: "Jatah Finance (Default: 1%)" },
  ];

  for (const c of configs) {
    await prisma.financialConfig.upsert({
      where: { key: c.key },
      update: {},
      create: c
    });
  }

  console.log("✅ Berhasil menambahkan semua posisi!");
}

main();
