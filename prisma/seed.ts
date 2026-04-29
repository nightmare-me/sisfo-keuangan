import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function ensureRoles() {
  const allRoles = [
    "admin", "finance", "cs", "advertiser", "pengajar", 
    "akademik", "talent", "spv_cs", "spv_adv", "spv_multimedia", "siswa",
    "ceo", "coo", "multimedia"
  ];

  const allPermissions = [
    { name: "View Dashboard", slug: "dashboard:view" },
    { name: "View CRM", slug: "crm:view" },
    { name: "View Finance In", slug: "finance_in:view" },
    { name: "View Finance Out", slug: "finance_out:view" },
    { name: "View Reports", slug: "report:view" },
    { name: "View Multimedia", slug: "multimedia:view" },
    { name: "Track Live", slug: "live_tracking:view" },
    { name: "Manage Users", slug: "user:view" },
  ];

  // 1. Create Permissions
  const permissions = await Promise.all(
    allPermissions.map(p => 
      prisma.permission.upsert({
        where: { slug: p.slug },
        update: { name: p.name },
        create: p
      })
    )
  );

  const permMap = Object.fromEntries(permissions.map(p => [p.slug, p.id]));

  // 2. Create Roles and Connect Permissions
  const roles = await Promise.all(
    allRoles.map((slug) => {
      // Tentukan permission default untuk tiap role (untuk seeding)
      let rolePerms: string[] = [];
      if (slug === "admin") rolePerms = allPermissions.map(p => p.slug);
      if (slug === "cs") rolePerms = ["dashboard:view", "crm:view", "finance_in:view"];
      if (slug === "talent" || slug === "multimedia") rolePerms = ["dashboard:view", "live_tracking:view", "multimedia:view"];
      if (slug === "spv_multimedia") rolePerms = ["dashboard:view", "live_tracking:view", "multimedia:view", "report:view"];

      return prisma.role.upsert({
        where: { slug },
        update: {
          permissions: {
            set: rolePerms.map(slug => ({ slug }))
          }
        },
        create: {
          name: slug.toUpperCase().replace(/_/g, ' '),
          slug,
          description: `Auto-generated role for ${slug}`,
          permissions: {
            connect: rolePerms.map(slug => ({ slug }))
          }
        },
      })
    })
  );

  const roleMap = Object.fromEntries(roles.map((role) => [role.slug, role])) as Record<string, { id: string }>;

  // Seed SubRoles
  const subRoles = [
    { name: "Assistant CEO", roleId: roleMap.ceo?.id },
    { name: "Assistant COO", roleId: roleMap.coo?.id },
    { name: "Staff AKADEMIK", roleId: roleMap.akademik?.id },
    { name: "Staff FINANCE", roleId: roleMap.finance?.id }
  ];

  for (const sr of subRoles) {
    if (!sr.roleId) continue;
    const existing = await prisma.subRole.findFirst({ where: { name: sr.name, roleId: sr.roleId } });
    if (!existing) {
      await prisma.subRole.create({
        data: {
          name: sr.name,
          roleId: sr.roleId,
          description: `Auto-generated subrole ${sr.name}`,
        }
      });
    }
  }

  return roleMap;
}

async function main() {
  console.log("Seeding database Speaking Partner by Kampung Inggris...");

  const roleMap = await ensureRoles();

  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@speakingpartner.id" },
    update: { roleId: roleMap.admin.id },
    create: {
      name: "Administrator",
      email: "admin@speakingpartner.id",
      password: adminPassword,
      roleId: roleMap.admin.id,
    },
  });
  console.log("Admin:", admin.email);

  const csPassword = await bcrypt.hash("cs123456", 12);
  const cs1 = await prisma.user.upsert({
    where: { email: "rizky@speakingpartner.id" },
    update: { roleId: roleMap.cs.id },
    create: {
      name: "Rizky Pratama",
      email: "rizky@speakingpartner.id",
      password: csPassword,
      roleId: roleMap.cs.id,
    },
  });
  const cs2 = await prisma.user.upsert({
    where: { email: "sari@speakingpartner.id" },
    update: { roleId: roleMap.cs.id },
    create: {
      name: "Sari Dewi",
      email: "sari@speakingpartner.id",
      password: csPassword,
      roleId: roleMap.cs.id,
    },
  });
  console.log("CS users:", cs1.name, ",", cs2.name);

  const pgPassword = await bcrypt.hash("pengajar123", 12);
  const pg1 = await prisma.user.upsert({
    where: { email: "budi@speakingpartner.id" },
    update: { roleId: roleMap.pengajar.id },
    create: {
      name: "Budi Santoso",
      email: "budi@speakingpartner.id",
      password: pgPassword,
      roleId: roleMap.pengajar.id,
    },
  });
  const pg2 = await prisma.user.upsert({
    where: { email: "nina@speakingpartner.id" },
    update: { roleId: roleMap.pengajar.id },
    create: {
      name: "Nina Rahayu",
      email: "nina@speakingpartner.id",
      password: pgPassword,
      roleId: roleMap.pengajar.id,
    },
  });
  console.log("Pengajar:", pg1.name, ",", pg2.name);

  const kasirPw = await bcrypt.hash("kasir123", 12);
  const kasir = await prisma.user.upsert({
    where: { email: "kasir@speakingpartner.id" },
    update: { roleId: roleMap.finance.id },
    create: {
      name: "Dina Kasir",
      email: "kasir@speakingpartner.id",
      password: kasirPw,
      roleId: roleMap.finance.id,
    },
  });
  console.log("Kasir:", kasir.email);

  const programs = await Promise.all([
    prisma.program.upsert({
      where: { id: "prog-speaking-regular" },
      update: {},
      create: { id: "prog-speaking-regular", nama: "Speaking Regular", deskripsi: "Kelas speaking bahasa Inggris regular", tipe: "REGULAR", harga: 1500000, durasiBuilan: 1 },
    }),
    prisma.program.upsert({
      where: { id: "prog-speaking-private" },
      update: {},
      create: { id: "prog-speaking-private", nama: "Speaking Private", deskripsi: "Kelas speaking 1-on-1 dengan native tutor", tipe: "PRIVATE", harga: 3000000, durasiBuilan: 1 },
    }),
    prisma.program.upsert({
      where: { id: "prog-speaking-semi" },
      update: {},
      create: { id: "prog-speaking-semi", nama: "Speaking Semi-Private", deskripsi: "Kelas speaking 2-4 orang", tipe: "SEMI_PRIVATE", harga: 2000000, durasiBuilan: 1 },
    }),
    prisma.program.upsert({
      where: { id: "prog-grammar" },
      update: {},
      create: { id: "prog-grammar", nama: "Grammar Intensive", deskripsi: "Kelas grammar intensif untuk semua level", tipe: "REGULAR", harga: 1200000, durasiBuilan: 1 },
    }),
    prisma.program.upsert({
      where: { id: "prog-toefl" },
      update: {},
      create: { id: "prog-toefl", nama: "TOEFL Preparation", deskripsi: "Persiapan ujian TOEFL/IELTS", tipe: "REGULAR", harga: 2500000, durasiBuilan: 2 },
    }),
  ]);
  console.log("Programs:", programs.map((program) => program.nama).join(", "));

  await prisma.tarifPengajar.upsert({
    where: { id: "tarif-regular" },
    update: {},
    create: { id: "tarif-regular", tipeKelas: "REGULAR", tarif: 75000, keterangan: "Tarif standar kelas regular" },
  });
  await prisma.tarifPengajar.upsert({
    where: { id: "tarif-private" },
    update: {},
    create: { id: "tarif-private", tipeKelas: "PRIVATE", tarif: 150000, keterangan: "Tarif kelas private 1-on-1" },
  });
  await prisma.tarifPengajar.upsert({
    where: { id: "tarif-semi" },
    update: {},
    create: { id: "tarif-semi", tipeKelas: "SEMI_PRIVATE", tarif: 100000, keterangan: "Tarif kelas semi-private" },
  });
  console.log("Tarif pengajar selesai");

  await prisma.inventaris.createMany({
    skipDuplicates: true,
    data: [
      { nama: "Whiteboard Besar", kategori: "Peralatan", jumlah: 5, satuan: "pcs", hargaBeli: 500000, kondisi: "BAIK", stokMinimum: 2 },
      { nama: "Spidol Whiteboard", kategori: "ATK", jumlah: 20, satuan: "pcs", hargaBeli: 15000, kondisi: "BAIK", stokMinimum: 10 },
      { nama: "Kursi Kelas", kategori: "Furnitur", jumlah: 40, satuan: "unit", hargaBeli: 250000, kondisi: "BAIK", stokMinimum: 30 },
      { nama: "Meja Belajar", kategori: "Furnitur", jumlah: 20, satuan: "unit", hargaBeli: 400000, kondisi: "BAIK", stokMinimum: 15 },
      { nama: "Proyektor", kategori: "Elektronik", jumlah: 3, satuan: "unit", hargaBeli: 5000000, kondisi: "BAIK", stokMinimum: 2 },
      { nama: "Kertas A4", kategori: "ATK", jumlah: 5, satuan: "rim", hargaBeli: 50000, kondisi: "BAIK", stokMinimum: 3 },
    ],
  });
  console.log("Inventaris contoh ditambahkan");

  console.log("\nSeed selesai!");
  console.log("=============================================");
  console.log("AKUN LOGIN:");
  console.log("  Admin    -> admin@speakingpartner.id  / admin123");
  console.log("  Kasir    -> kasir@speakingpartner.id  / kasir123");
  console.log("  CS       -> rizky@speakingpartner.id  / cs123456");
  console.log("  CS       -> sari@speakingpartner.id   / cs123456");
  console.log("  Pengajar -> budi@speakingpartner.id   / pengajar123");
  console.log("=============================================");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
