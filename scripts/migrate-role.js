// Script untuk migrate database: rename KASIR→FINANCE, tambah AKADEMIK, tambah kolom durasi
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgresql://postgres:123456@localhost:5432/sisfo_speaking_partner",
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("🔄 Mulai migrasi database...");

    // 1. Rename KASIR → FINANCE di enum Role
    try {
      await client.query(`ALTER TYPE "Role" RENAME VALUE 'KASIR' TO 'FINANCE';`);
      console.log("✅ Renamed KASIR → FINANCE");
    } catch (e) {
      if (e.message.includes("does not exist")) {
        console.log("⏭  KASIR sudah tidak ada (mungkin sudah direname sebelumnya)");
      } else {
        console.warn("⚠️  Rename KASIR:", e.message);
      }
    }

    // 2. Tambah AKADEMIK ke enum Role (jika belum ada)
    try {
      await client.query(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AKADEMIK';`);
      console.log("✅ Tambah AKADEMIK ke Role");
    } catch (e) {
      console.warn("⚠️  Tambah AKADEMIK:", e.message);
    }

    // 3. Tambah kolom durasi ke Kelas (jika belum ada)
    try {
      await client.query(`ALTER TABLE "Kelas" ADD COLUMN IF NOT EXISTS "durasi" TEXT;`);
      console.log("✅ Tambah kolom durasi ke Kelas");
    } catch (e) {
      console.warn("⚠️  Tambah durasi:", e.message);
    }

    console.log("\n✅ Migrasi selesai!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
