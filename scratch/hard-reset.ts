import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: "postgresql://postgres:123456@localhost:5432/sisfo_speaking_partner?schema=public",
});

async function main() {
  console.log("🚀 Memulai Hard Reset Database...");

  try {
    // 1. Bersihkan tabel-tabel transaksi & data operasional (Urutan sangat penting karena Foreign Key)
    console.log("🧹 Membersihkan data transaksi...");
    await prisma.refund.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.arsipNota.deleteMany({});
    await prisma.pengeluaran.deleteMany({});
    await prisma.spentAds.deleteMany({});
    await prisma.adPerformance.deleteMany({});
    await prisma.pemasukan.deleteMany({});
    
    console.log("🧹 Membersihkan data akademik...");
    await prisma.pendaftaran.deleteMany({});
    await prisma.absensi.deleteMany({});
    await prisma.sesiKelas.deleteMany({});
    await prisma.materiKelas.deleteMany({});
    await prisma.kendalaMurid.deleteMany({});
    await prisma.kelas.deleteMany({});
    await prisma.siswa.deleteMany({});
    
    console.log("🧹 Membersihkan data CRM & Leads...");
    await prisma.lead.deleteMany({});
    
    console.log("🧹 Membersihkan data SDM & Gaji...");
    await prisma.liveSession.deleteMany({});
    await prisma.gajiStaf.deleteMany({});
    await prisma.gajiPengajar.deleteMany({});
    await prisma.karyawanProfile.deleteMany({});
    
    console.log("🧹 Membersihkan log sistem...");
    await prisma.auditLog.deleteMany({});

    // 2. Membersihkan User KECUALI Admin/Superuser
    console.log("👤 Membersihkan akun User (kecuali Admin)...");
    
    // Cari role Admin/CEO/COO yang tidak boleh dihapus
    const protectedRoles = await prisma.role.findMany({
      where: {
        slug: { in: ["admin", "ceo", "coo", "owner"] }
      }
    });
    const protectedRoleIds = protectedRoles.map(r => r.id);

    const deletedUsers = await prisma.user.deleteMany({
      where: {
        roleId: { notIn: protectedRoleIds },
        // Pastikan email utama admin tidak terhapus jika slug role tidak pas
        NOT: {
          email: { contains: "admin" }
        }
      }
    });

    console.log(`✅ Berhasil menghapus ${deletedUsers.count} akun user.`);
    console.log("✨ DATABASE SELESAI DIBERSIHKAN! ✨");
    console.log("Sekarang Bapak bisa mulai Import data baru dari nol.");

  } catch (error) {
    console.error("❌ Terjadi kesalahan saat Hard Reset:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
