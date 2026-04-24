-- 1. Bersihkan transaksi & data operasional
DELETE FROM "Refund";
DELETE FROM "Invoice";
DELETE FROM "ArsipNota";
DELETE FROM "Pengeluaran";
DELETE FROM "SpentAds";
DELETE FROM "AdPerformance";
DELETE FROM "Pemasukan";

-- 2. Bersihkan akademik
DELETE FROM "Pendaftaran";
DELETE FROM "Absensi";
DELETE FROM "SesiKelas";
DELETE FROM "MateriKelas";
DELETE FROM "KendalaMurid";
DELETE FROM "Kelas";
DELETE FROM "Siswa";

-- 3. Bersihkan CRM
DELETE FROM "Lead";

-- 4. Bersihkan SDM & Gaji
DELETE FROM "LiveSession";
DELETE FROM "GajiStaf";
DELETE FROM "GajiPengajar";
DELETE FROM "KaryawanProfile";

-- 5. Bersihkan Log
DELETE FROM "AuditLog";

-- 6. Bersihkan User (Kecuali Admin)
-- Kita asumsikan role Admin punya slug 'admin'
DELETE FROM "User" WHERE "roleId" NOT IN (SELECT "id" FROM "Role" WHERE "slug" IN ('admin', 'ceo', 'coo', 'owner')) AND "email" NOT LIKE '%admin%';
