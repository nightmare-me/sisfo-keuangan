import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const modules = [
  { name: 'Dashboard', slug: 'dashboard' },
  { name: 'CRM / Lead', slug: 'crm' },
  { name: 'Pemasukan', slug: 'finance_in' },
  { name: 'Pengeluaran', slug: 'finance_out' },
  { name: 'Spent Ads', slug: 'ads_spent' },
  { name: 'Performa Iklan', slug: 'ads_performance' },
  { name: 'Laporan Keuangan', slug: 'report' },
  { name: 'Manajemen Refund', slug: 'refund' },
  { name: 'Payroll Staff', slug: 'payroll_staff' },
  { name: 'Siswa', slug: 'siswa' },
  { name: 'Manajemen kelas', slug: 'kelas' },
  { name: 'Produk / Program', slug: 'program' },
  { name: 'Payroll Pengajar', slug: 'payroll_tutor' },
  { name: 'Kelas Saya', slug: 'pengajar' },
  { name: 'Invoice', slug: 'invoice' },
  { name: 'Inventaris', slug: 'inventaris' },
  { name: 'Input Jam Live', slug: 'live_tracking' },
  { name: 'Manajemen User', slug: 'user' },
  { name: 'Pengaturan Role', slug: 'settings' },
  { name: 'Audit Log', slug: 'audit' },
  { name: 'Backup & Arsip', slug: 'archive' },
  { name: 'Template Whatsapp', slug: 'wa_template' },
];

const actions = [
  { name: 'View', slug: 'view' },
  { name: 'Edit', slug: 'edit' },
  { name: 'Delete', slug: 'delete' },
];

async function main() {
  console.log("⚡ Generating Matrix Permissions...");
  
  for (const mod of modules) {
    for (const act of actions) {
      const permSlug = `${mod.slug}:${act.slug}`;
      const permName = `${mod.name} ${act.name}`;
      
      await prisma.permission.upsert({
        where: { slug: permSlug },
        update: { name: permName },
        create: { name: permName, slug: permSlug },
      });
    }
  }

  console.log("✅ Matrix Permissions Created Successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
