import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanup() {
  console.log("🧹 Cleaning up old Sync Otomatis records in SpentAds...");
  
  const result = await prisma.spentAds.deleteMany({
    where: {
      keterangan: {
        contains: "Sync Otomatis"
      }
    }
  });

  console.log(`✅ Deleted ${result.count} sync records.`);
}

cleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
