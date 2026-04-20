require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const halla = await prisma.user.findFirst({
    where: { name: { contains: "Halla", mode: "insensitive" } },
    include: { role: true },
  });
  if (!halla) {
    const all = await prisma.user.findMany({
      select: { name: true, role: { select: { slug: true } } },
    });
    console.log("Halla not found. All users:", all);
    return;
  }
  console.log(`Halla ID: ${halla.id}, Role: ${halla.role?.slug ?? "no-role"}`);

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
  console.log(`Period: ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`);

  const leads = await prisma.lead.findMany({ 
    where: { 
      csId: halla.id,
      createdAt: { gte: startOfMonth, lte: endOfMonth }
    } 
  });
  console.log(`\nLeads for Halla (This Month): ${leads.length}`);
  leads.forEach(l => console.log(`- ${l.status}: ${l.nama} (Created: ${l.createdAt.toISOString()})`));

  const pemasukan = await prisma.pemasukan.findMany({ 
    where: { 
      csId: halla.id,
      tanggal: { gte: startOfMonth, lte: endOfMonth }
    } 
  });
  console.log(`\nPemasukan for Halla (This Month): ${pemasukan.length}`);
  pemasukan.forEach(p => console.log(`- Rp ${p.hargaFinal} (Date: ${p.tanggal.toISOString()})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
