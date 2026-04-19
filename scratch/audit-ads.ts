import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const today = new Date();
  const starts = [2, 1, 0].map(d => {
    const dt = new Date();
    dt.setDate(today.getDate() - d);
    dt.setHours(0,0,0,0);
    return dt;
  });

  console.log("--- DATA AUDIT ---");
  for (const start of starts) {
    const end = new Date(start);
    end.setHours(23,59,59,999);
    
    const performance = await prisma.adPerformance.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { spent: true },
      _count: true
    });
    
    const spentAds = await prisma.spentAds.aggregate({
      where: { tanggal: { gte: start, lte: end } },
      _sum: { jumlah: true },
      _count: true
    });

    console.log(`Tanggal: ${start.toISOString().slice(0,10)}`);
    console.log(`  AdPerformance: ${performance._count} records, Total: ${performance._sum.spent || 0}`);
    console.log(`  SpentAds: ${spentAds._count} records, Total: ${spentAds._sum.jumlah || 0}`);
  }
}

check();
