# Sisfo Keuangan & CRM - Speaking Partner 🚀

Sistem informasi keuangan terintegrasi dengan CRM Lead Management berperforma tinggi.

## 🚀 Fitur Baru: CRM Date Intelligence & Class Dashboard Upgrade (v2.3)

### 1. CRM: Lead Conversion Tracking & Analytics 📈 (BARU!)
*   **Dual-Date Tracking**: Ditambahkan kolom **TGL LEAD** (kapan prospek masuk) dan **TGL CLOSING** (kapan prospek bayar/lunas).
*   **Auto-Closing Logic**: Tanggal closing otomatis terisi saat status diubah ke `PAID`, namun tetap bisa diedit manual untuk akurasi data.
*   **Timezone Local (WIB)**: Perbaikan logika penanggalan yang kini menggunakan waktu lokal (WIB), mencegah tanggal "berubah ke hari kemarin" saat input di dini hari.
*   **Import Bulk with Dates**: Pendukung kolom `tanggal` pada impor CSV agar data history lead lama bisa dimasukkan dengan tepat.
*   **KPI Dashboard Update**: Counter Rasio Bayar, Menunggu Bayar, dan Refunded kini terupdate secara otomatis dan akurat.

### 2. Manajemen Kelas: Filter & Redesign Dashboard 🎨 (BARU!)
*   **Filter Berbasis Bulan & Program**: Dashboard kelas kini dilengkapi filter bulan (berdasarkan tanggal mulai) dan program untuk memudahkan pencarian kelas aktif.
*   **UI Kartu Kelas Baru**: Tata letak kartu kelas yang lebih informatif (3 baris: Info Nama, Program & Jadwal, Pengajar & Kuota).
*   **Status Bar Visual**: Progress bar kuota kelas dipindahkan ke dalam kartu dengan indikator warna (biru/kuning/merah) untuk visibilitas kapasitas yang lebih baik.

### 3. Fitur Academic Intelligence (v2.2 Recap) 🎓
*   **Akses Independen**: Tim Akademik dapat mendaftarkan pengajar baru tanpa bergantung pada Admin.
*   **Form Onboarding Lengkap**: Satu form untuk buat akun login + profil karyawan (NIK, spesialisasi, data bank) secara bersamaan via database transaction.
*   **Import Massal CSV**: Upload ratusan pengajar sekaligus via file CSV. Sistem otomatis skip duplikat email dan memberi password default jika kolom password kosong.
*   **Role & Permission Baru**: Role `AKADEMIK` terdaftar dengan permission `pengajar:view` dan `pengajar:manage`.
*   **Menu Sidebar**: Tersedia di grup AKADEMIK → "Data Pengajar".

### 2. Pendaftaran Siswa ke Kelas: Upgrade Massal (Batch Enrollment) 📋 (BARU!)
*   **Multi-Checklist UI**: Ganti dropdown satu-satu dengan panel checklist interaktif. Pilih banyak siswa sekaligus, lalu daftarkan dalam satu klik.
*   **Search Real-time**: Filter nama atau nomor siswa langsung di dalam panel checklist.
*   **Tombol Pilih Semua**: Centang seluruh siswa sekaligus, dibatasi otomatis sesuai sisa kapasitas kursi.
*   **Live Counter**: Indikator "Sisa Kursi" dan "Dipilih" terupdate secara real-time.
*   **API Batch (PATCH)**: Endpoint `/api/pendaftaran` baru yang mendaftarkan banyak siswa dalam satu request, dengan cek kapasitas dan skip duplikat.

### 3. Filter Siswa Cerdas (One Class Per Program) 🔒 (BARU!)
*   **Aturan Satu Program, Satu Kelas**: Siswa yang sudah aktif di "Speaking Regular jam 19.00" tidak akan muncul di daftar pilihan kelas "Speaking Regular jam 20.00".
*   **Multi-Program Tetap Bebas**: Siswa tetap bisa didaftarkan ke kelas program berbeda (misal: Native, TOEFL).
*   **Re-Enroll Aman**: Siswa yang pernah dikeluarkan dari sebuah kelas bisa didaftarkan kembali ke kelas yang sama.
*   **Fix Hitungan Kapasitas**: Counter di kartu kelas kini hanya menghitung pendaftaran `aktif: true`, sinkron 100% dengan daftar siswa.

### 4. Validasi Konflik Jadwal Pengajar 🛡️ (BARU!)
*   **Anti Double-Booking**: Sistem menolak pembuatan atau edit kelas jika pengajar yang dipilih sudah memiliki kelas aktif di hari dan jam yang sama.
*   **Pesan Error Informatif**: Alert menampilkan nama kelas yang konflik agar mudah diperbaiki.
*   **Modal Tetap Terbuka**: Form tidak menutup saat terjadi error, sehingga pengguna bisa langsung mengganti jadwal tanpa mengisi ulang.
*   **Pengecualian Kelas Selesai**: Kelas berstatus `SELESAI` tidak dihitung sebagai konflik.

### 5. Modul Input Jam Live Staf (v2.1) 🎙️
*   **Layout Overhaul**: Tabel riwayat (atas) + Form input (bawah-kiri) + Statistik omset real-time (bawah-kanan).
*   **Auto-Akumulasi Durasi**: Input nama talent yang sama di hari yang sama otomatis menambah jam, tidak membuat baris baru.
*   **Fix Auth (Modular)**: `authOptions` dipisah ke `lib/auth-options.ts` untuk mencegah circular dependency yang menyebabkan error 500.

### 6. Infrastruktur & Stabilitas ⚙️
*   **Prisma PostgreSQL Pool**: Koneksi database menggunakan `Pool` dari paket `pg` untuk stabilitas dan efisiensi tinggi.
*   **_count Filter Aktif**: Semua query `_count.pendaftaran` kini difilter `aktif: true` untuk data yang akurat.
*   **Modal Anti-Tutup Sendiri**: Modal form kelas tidak menutup ketika area luar diklik secara tidak sengaja.

---
*Created with ❤️ by Antigravity for Speaking Partner Premium Operations.*
*Semua sistem stabil, fitur lengkap, dan siap untuk operasional penuh. Selamat beristirahat, Pak Muis! ☕*
