import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database Speaking Partner by Kampung Inggris...");

  // 1. Admin User
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@speakingpartner.id" },
    update: {},
    create: {
      name: "Administrator",
      email: "admin@speakingpartner.id",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin:", admin.email);

  // 2. CS Users
  const csPassword = await bcrypt.hash("cs123456", 12);
  const cs1 = await prisma.user.upsert({
    where: { email: "rizky@speakingpartner.id" },
    update: {},
    create: { name: "Rizky Pratama", email: "rizky@speakingpartner.id", password: csPassword, role: "CS" },
  });
  const cs2 = await prisma.user.upsert({
    where: { email: "sari@speakingpartner.id" },
    update: {},
    create: { name: "Sari Dewi", email: "sari@speakingpartner.id", password: csPassword, role: "CS" },
  });
  console.log("✅ CS users:", cs1.name, ",", cs2.name);

  // 3. Pengajar
  const pgPassword = await bcrypt.hash("pengajar123", 12);
  const pg1 = await prisma.user.upsert({
    where: { email: "budi@speakingpartner.id" },
    update: {},
    create: { name: "Budi Santoso", email: "budi@speakingpartner.id", password: pgPassword, role: "PENGAJAR" },
  });
  const pg2 = await prisma.user.upsert({
    where: { email: "nina@speakingpartner.id" },
    update: {},
    create: { name: "Nina Rahayu", email: "nina@speakingpartner.id", password: pgPassword, role: "PENGAJAR" },
  });
  console.log("✅ Pengajar:", pg1.name, ",", pg2.name);

  // 4. Kasir
  const kasirPw = await bcrypt.hash("kasir123", 12);
  const kasir = await prisma.user.upsert({
    where: { email: "kasir@speakingpartner.id" },
    update: {},
    create: { name: "Dina Kasir", email: "kasir@speakingpartner.id", password: kasirPw, role: "KASIR" },
  });
  console.log("✅ Kasir:", kasir.email);

  // 5. Program Kursus
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
  console.log("✅ Programs:", programs.map(p => p.nama).join(", "));

  // 6. Tarif Pengajar
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
  console.log("✅ Tarif pengajar selesai");

  // 7. Inventaris contoh
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
  console.log("✅ Inventaris contoh ditambahkan");

  console.log("\n🎉 Seed selesai!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("AKUN LOGIN:");
  console.log("  Admin    → admin@speakingpartner.id  / admin123");
  console.log("  Kasir    → kasir@speakingpartner.id  / kasir123");
  console.log("  CS       → rizky@speakingpartner.id  / cs123456");
  console.log("  CS       → sari@speakingpartner.id   / cs123456");
  console.log("  Pengajar → budi@speakingpartner.id   / pengajar123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
