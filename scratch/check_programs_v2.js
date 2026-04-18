const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:123456@localhost:5432/sisfo_speaking_partner?schema=public";

async function checkPrograms() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const programs = await prisma.program.findMany({
      select: { id: true, nama: true, kategoriFee: true }
    });
    console.log(JSON.stringify(programs, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkPrograms();
