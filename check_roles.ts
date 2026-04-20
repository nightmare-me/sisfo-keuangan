import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const roles = await prisma.role.findMany();
  console.log("=== DAFTAR ROLE DI DATABASE ===");
  console.log(JSON.stringify(roles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
