import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const permissions = [
  { name: "Melihat Laporan Keuangan", slug: "view_financial_reports", description: "Akses ke grafik laba rugi dan omzet global" },
  { name: "Manajemen Murid", slug: "manage_students", description: "Menambah, mengedit, dan menghapus data murid" },
  { name: "Manajemen Pengajar", slug: "manage_teachers", description: "Menambah, mengedit, dan menghapus data pengajar" },
  { name: "Manajemen Kelas", slug: "manage_classes", description: "Membuat kelas, mengatur jadwal, dan assign pengajar" },
  { name: "Manajemen Payroll", slug: "manage_payroll", description: "Memproses gaji staf dan honor pengajar" },
  { name: "Manajemen Inventaris", slug: "manage_inventory", description: "Mengatur stok barang dan peralatan" },
  { name: "Manajemen CRM", slug: "manage_crm", description: "Mengelola leads dan follow-up calon murid" },
  { name: "Input Nilai Sertifikat", slug: "input_grades", description: "Memberikan nilai akhir untuk e-sertifikat" },
  { name: "Input Absensi", slug: "input_attendance", description: "Mencatat kehadiran murid di setiap sesi" },
  { name: "Akses Settings Global", slug: "manage_settings", description: "Mengatur konfigurasi sistem dan sub-role" },
];

async function main() {
  console.log("Seeding Permissions...");
  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }
  console.log("Permissions seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
