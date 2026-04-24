const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const lastPemasukan = await prisma.pemasukan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      siswa: true,
      program: true
    }
  });

  console.log("=== 5 DATA PEMASUKAN TERAKHIR ===");
  console.log(JSON.stringify(lastPemasukan, null, 2));
  
  const totalCount = await prisma.pemasukan.count();
  console.log("\nTOTAL DATA DI DATABASE:", totalCount);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
