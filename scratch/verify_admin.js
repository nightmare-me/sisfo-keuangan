const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

async function check() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Checking Admin User...");
  const user = await prisma.user.findUnique({
    where: { email: "admin@speakingpartner.id" },
    include: { role: true }
  });

  if (!user) {
    console.log("❌ ERROR: User admin@speakingpartner.id TIDAK ditemukan di database.");
  } else {
    console.log("✅ SUCCESS: User ditemukan.");
    console.log("Detail User:");
    console.log("- Name    :", user.name);
    console.log("- Email   :", user.email);
    console.log("- Aktif   :", user.aktif);
    console.log("- Role    :", user.role ? user.role.slug : "Tidak punya role");
    console.log("- DB Pass :", user.password.substring(0, 10) + "...");
  }

  await pool.end();
}

check()
  .catch(console.error);
