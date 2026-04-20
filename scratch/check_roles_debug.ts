import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log("🔍 Checking Users and Roles...");
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      roleId: true,
      role: { select: { name: true, slug: true } }
    }
  });

  const roles = await prisma.role.findMany();

  console.log("\n--- Roles in DB ---");
  console.table(roles.map(r => ({ id: r.id, name: r.name, slug: r.slug })));

  console.log("\n--- Users in DB ---");
  console.table(users.map(u => ({
    email: u.email,
    roleId: u.roleId || "NULL",
    roleName: u.role?.name || "NULL"
  })));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
