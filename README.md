# Sisfo Keuangan & CRM - Speaking Partner 🚀

Sistem informasi keuangan terintegrasi dengan CRM Lead Management berperforma tinggi.

## 🚀 Fitur Baru: Premium Invoice System (v3.8) 📄 (BARU!)

### 1. Unified Branding Identity 🎨
*   **Flex-Grid Table Architecture**: Pembangunan ulang sistem tabel menggunakan Flexbox (bukan tag table tradisional) untuk menghentikan masalah *overflow* permanen saat dicetak di kertas A4.
*   **Asymmetrical Dark-Yellow Header**: Implementasi identitas visual Speaking Partner yang modern dengan kombinasi warna `#facd00` (Kuning) dan `#1e293b` (Dark Slate).
*   **100% Visual Parity**: Keseragaman desain mutlak antara Halaman Invoice, Preview Modal di dashboard, hingga file Download PDF.

### 2. Branding Persistence & Customization 🖼️
*   **LocalStorage Intelligence**: Detail kop surat (nama, alamat, telp) dan link logo disimpan di browser secara otomatis. CS cukup input satu kali, dan data akan bertahan di sesi berikutnya.
*   **Dynamic GDrive Converter**: Mendukung link "Share" Google Drive secara langsung; sistem otomatis mengonversinya menjadi *direct source link* untuk merender logo secara instan.
*   **Dual Mode Header**: Fleksibilitas memilih antara "Kop Teks" (Input Manual) atau "Kop Gambar" (Upload Banner) sesuai kebutuhan promosi.

### 3. Print-Ready Engineering 📐
*   **Fluid Print Scaling**: Komponen dirancang responsif terhadap fitur "Scale" di browser print preview, memastikan hasil cetak selalu pas di dalam margin printer apapun.
*   **Direct-Download PDF Sync**: Modul unduh PDF di daftar invoice telah di-overhaul menggunakan `jsPDF` dengan styling yang sinkron dengan branding baru.
*   **Smart Navigation**: Integrasi tombol kembali yang cerdas untuk alur kerja cepat antara CRM, Manajemen Lead, dan Dokumentasi Keuangan.

## 🚀 Fitur Sebelumnya: Lead Source Tracking & Attribution (v2.4)

### 1. CRM: Marketing Source Attribution 🏷️ (BARU!)
*   **Source Tagging**: Setiap lead kini memiliki label `sumber` (SOSMED, REGULAR, RO, MANUAL, IMPORT).
*   **Jalur Sosmed (Viral)**: Penambahan link pendaftaran khusus untuk kampanye sosial media (IG/TikTok) guna membedakan trafik organik dan iklan.
*   **Visual Badge**: Tabel CRM kini menampilkan badge sumber di bawah nama siswa untuk identifikasi cepat delegasi tim.
*   **Manual Source Selection**: Admin/CS dapat menentukan sumber lead saat melakukan input manual.
*   **Round Robin Sosmed Ready**: Arsitektur pendistribusian lead otomatis untuk tim khusus `CS_SOSMED`.

### 2. CRM: Lead Conversion Tracking & Analytics (v2.3 Recap) 📈
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
*Created with ❤️ by Antigravity (Powered by Google Deepmind) for Speaking Partner Premium Operations.*
*Semua sistem stabil, fitur invoice v3.8 aktif, dan siap untuk operasional penuh. Selamat bekerja, Pak Muis! ☕*
