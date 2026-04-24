import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Mengecek isi tabel FinancialConfig...");
  try {
    const data = await prisma.financialConfig.findMany();
    console.log("📊 Data Ditemukan:", data.length);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
