import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function wipeDummyData() {
  console.log("Memulai proses penghapusan data dummy/transaksi...");

  try {
    // Gunakan transaction agar jika gagal satu, batal semua (safe)
    await prisma.$transaction(async (tx) => {
      console.log("1. Menghapus data Presensi & Penilaian...");
      await tx.presensi.deleteMany({});
      await tx.nilai.deleteMany({});
      await tx.pesertaKelas.deleteMany({});
      await tx.sesiKelas.deleteMany({});

      console.log("2. Menghapus data Kelas & Pertemuan...");
      await tx.kelas.deleteMany({});
      await tx.jadwalPertemuan.deleteMany({});

      console.log("3. Menghapus data Keuangan & CRM...");
      await tx.invoice.deleteMany({});
      await tx.pemasukan.deleteMany({});
      await tx.pengeluaran.deleteMany({});
      await tx.refund.deleteMany({});
      await tx.spentAds.deleteMany({});
      await tx.adPerformance.deleteMany({});

      console.log("4. Menghapus data Leads & Siswa...");
      await tx.lead.deleteMany({});
      await tx.siswa.deleteMany({});

      console.log("5. Menghapus data Log & Audit...");
      await tx.logSistem.deleteMany({});
      await tx.notifikasi.deleteMany({});
    });

    console.log("✅ Berhasil! Semua data transaksi dummy sudah dibersihkan.");
    console.log("Data master (User, Role, Program, Inventaris) tetap aman.");
  } catch (error) {
    console.error("❌ Gagal menghapus data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

wipeDummyData();
