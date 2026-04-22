import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const siswa = await prisma.siswa.findFirst();
  console.log("Found Student:", JSON.stringify(siswa, null, 2));
}

main().finally(() => pool.end());
