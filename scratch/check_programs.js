const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPrograms() {
  const programs = await prisma.program.findMany({
    select: { id: true, nama: true, kategoriFee: true }
  });
  console.log(JSON.stringify(programs, null, 2));
  await prisma.$disconnect();
}

checkPrograms();
