import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("siswa123", 12);
  const updated = await prisma.siswa.update({
    where: { noSiswa: "SP-2026-67866" },
    data: { password }
  });
  console.log("Password set for student:", updated.noSiswa);
}

main().finally(() => pool.end());
