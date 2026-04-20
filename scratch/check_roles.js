const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({ select: { name: true, slug: true } });
  console.log(JSON.stringify(roles, null, 2));
}

main().finally(() => prisma.$disconnect());
