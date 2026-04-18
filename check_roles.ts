import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from 'pg';
const { Pool } = pkg;

const connectionString = "postgresql://postgres:123456@localhost:5432/sisfo_speaking_partner?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const roles = await prisma.role.findMany();
  console.log("=== DAFTAR ROLE DI DATABASE ===");
  console.log(JSON.stringify(roles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
