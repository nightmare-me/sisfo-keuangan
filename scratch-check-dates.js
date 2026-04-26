const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== CEK DATA PENGELUARAN TERBARU ===");
  const data = await prisma.pengeluaran.findMany({
    take: 5,
    orderBy: { tanggal: 'desc' },
    select: { id: true, tanggal: true, jumlah: true, kategori: true }
  });
  
  console.log(JSON.stringify(data, null, 2));
  
  const now = new Date();
  console.log("\n=== INFO WAKTU SERVER ===");
  console.log("Local Time:", now.toString());
  console.log("ISO Time (UTC):", now.toISOString());
}

main().catch(console.error).finally(() => prisma.$disconnect());
