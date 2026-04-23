const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const pengeluaranDate = new Date();
    const urls = ["/uploads/nota/test.png"];
    const jumlah = 53280;
    const kategori = "Lainnya";
    const keterangan = "Google One";
    
    // Test the exact insert
    const pengeluaran = await prisma.pengeluaran.create({
      data: {
        jumlah: jumlah,
        kategori,
        keterangan,
        tanggal: pengeluaranDate,
        metodeBayar: "CASH",
        // dibuatOleh: undefined, // Simulating missing ID
        arsipNota: {
          create: urls.map((url) => ({
            urlFile: url,
          })),
        },
      },
      include: {
        arsipNota: true,
      },
    });
    console.log("Success:", pengeluaran);
  } catch (e) {
    console.error("Error:");
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
