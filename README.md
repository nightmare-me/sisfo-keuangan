# Sisfo Keuangan & CRM - Speaking Partner 🚀

Sistem informasi keuangan terintegrasi dengan CRM Lead Management berperforma tinggi.

## 📢 Fitur Baru: Executive Financial Intelligence & Unified Data Sync (v10.5) 🚀 (TERBARU!)
### [v10.5] - 2026-05-03
**Sistem Keuangan & Dashboard Advertiser Update**
- **Fitur Baru: Satpam Import Iklan**: Penambahan validasi kolom wajib (tanggal, platform, jumlah) pada import CSV iklan untuk mencegah error format.
- **Perbaikan Dashboard Advertiser**:
  - Penugasan Advertiser (`advId`) kini tersimpan dengan benar saat input baru maupun edit data.
  - Perhitungan fee/bonus otomatis menggunakan kategori tim dari advertiser yang ditugaskan.
- **Audit & Penyesuaian Payroll**:
  - Bonus Omset RO Akademik kini dibatasi eksklusif hanya untuk jabatan **SPV AKADEMIK**.
  - Perbaikan bug dropdown "Pilih Staf" di Input Jam Live yang sempat memotong nama-nama berawalan huruf awal (A, B, C) akibat limitasi pagination.
- **Optimasi Backend & Vercel**:
  - Perbaikan 5+ TypeScript errors yang menghambat proses build di Vercel.
  - Pencarian email advertiser pada import CSV kini bersifat case-insensitive.

*   **Smart Financial Grouping (6-Rule Hierarchy)**: Implementasi logika pengelompokan laporan keuangan yang sangat bersih dan sinkron 100% dengan hitungan manual CSV. Sistem kini memprioritaskan RO, Sharing Profit (TOEFL), lalu kategori berbasis keyword (Live, Sosmed, Affiliate) secara presisi.
*   **Executive Transaction Insights**: Peningkatan transparansi data dengan menampilkan **Jumlah Transaksi** di bawah nominal omset pada dashboard laporan. Memberikan konteks instan mengenai volume penjualan di balik setiap angka rupiah.
*   **Unified Age Category Support**: Standarisasi kolom `kategori_usia` (KIDS, DEWASA, UMUM) pada seluruh template import (CRM & Pemasukan), memastikan sinkronisasi data siswa otomatis sejak tahap prospek hingga pembayaran.
*   **Admin CS Performance Filter**: Penambahan dropdown filter CS pada halaman Pemasukan khusus untuk Admin, memudahkan monitoring performa closing per individu secara real-time langsung dari modul keuangan.
*   **Enhanced Multi-Format Export**: Pembaruan sistem export Excel dan PDF yang kini menyertakan detail jumlah transaksi per kategori, memberikan laporan yang lebih komprehensif untuk kebutuhan audit bulanan.

## 📢 Fitur Sebelumnya: Enhanced Teacher Portal, Secure Data Privacy & Grid Layout (v8.5) 🚀
*   **Secure CS Data Privacy**: Implementasi sistem filter data server-side yang ketat. User dengan role **CS** kini hanya dapat melihat data Lead, Transaksi, dan Statistik Performance milik mereka sendiri. Data rahasia perusahaan (omset global, laba bersih, dll) kini benar-benar tertutup rapat untuk staf non-admin.
*   **Teacher Financial Hub 2.0**: Pembaruan visual pada portal pengajar dengan tema premium. Tombol **"Chat Admin Finance"** kini aktif dan terhubung secara dinamis ke pengaturan sistem, memudahkan pengajar berkonsultasi mengenai slip gaji mereka.
*   **Compact System Config (2-Column Grid)**: Redesain halaman Pengaturan Sistem menjadi layout grid 2-kolom yang lebih efisien, memudahkan admin mengelola konfigurasi global (seperti nomor WA Finance, Cutoff, dll) tanpa banyak scrolling.
*   **Dynamic Finance Contact**: Penambahan kunci `whatsapp_finance` di database, memungkinkan admin mengubah nomor kontak keuangan secara real-time melalui UI tanpa perlu menyentuh kode program.
*   **Strict Access Control (RBAC)**: Pengetatan banner "Masuk Mode Manajemen" pada portal pengajar, yang kini hanya muncul untuk pimpinan (Admin, CEO, COO) dan SPV Akademik, menjaga fokus kerja tim kreatif dan talent.
*   **Zero-Error CI/CD Build**: Optimasi tipe data TypeScript di seluruh modul (Refund, Lead, User) untuk memastikan proses build di Vercel berjalan 100% lancar tanpa hambatan teknis.

## 📢 Fitur Sebelumnya: Unified Financial Standard & Smart Sales Round-Robin (v8.0) 🚀 

## 📢 Fitur Sebelumnya: Registration Embed Mode & System Configuration (v7.6) 🚀 

## 📢 Fitur Sebelumnya: Unified Teacher Portal 2.0 & Smart Receipt System (v7.0) 🎓 
*   **Integrated Multi-Role Portal**: Transformasi Dashboard Pengajar menjadi pusat kendali mandiri. Pengajar kini dapat mengelola kelas, absensi, materi, sekaligus memantau riwayat keuangan dalam satu pintu.
*   **Smart Multi-Role Payroll View**: Inovasi transparansi finansial. Pengajar yang merangkap sub-role (SPV, Talent, Admin) kini dapat melihat gabungan **Honor Mengajar** dan **Tunjangan/Bonus Role** dalam satu dashboard yang komprehensif.
*   **Dual-Category Receipt Management**: Upgrade sistem arsip nota dengan dukungan **Bukti Transfer**. Pemisahan visual antara nota fisik (Nota) dan bukti transaksi digital (TRF) untuk memudahkan audit keuangan.
*   **High-Density Print Layout (3-Column)**: Optimasi cetak laporan nota dengan layout 3-kolom yang cerdas, mampu memuat lebih banyak bukti bayar dalam satu lembar A4 tanpa mengurangi keterbacaan (Hemat kertas & lebih profesional).
*   **Intelligent Navigation & Role-Switcher**: Implementasi sistem deteksi role otomatis. Pengajar dengan sub-role kini mendapatkan *Switcher Banner* khusus untuk berpindah ke Dashboard Manajemen dalam satu klik.

## 📢 Fitur Sebelumnya: Standardized UX & Custom Branding (v6.0) 🎨 

## 📢 Fitur Sebelumnya: Multi-Role Architecture, SPV Intelligence & Smart Import (v5.1) 🚀
*   **Expanded Role Ecosystem**: Penambahan role `CEO`, `COO`, dan `Multimedia` ke dalam ekosistem bawaan sistem, memastikan fleksibilitas akses dari level *C-Suite* hingga operasional kreatif.
*   **True Multi-Role System**: Implementasi arsitektur role ganda. Seorang user kini bisa memiliki satu Role Utama (misal: SPV Multimedia) sekaligus Role Tambahan (misal: Talent Live atau Advertiser) tanpa perlu berganti akun.
*   **Supervisor Dashboards (Three Pillars)**:
    *   **SPV CS Dashboard**: Pantauan *real-time* seluruh leads, closing, conversion rate, dan omset dari tiap anggota tim CS di bawahnya.
    *   **SPV ADV Dashboard**: Monitoring efisiensi iklan (Spent, Leads, CPL) dari seluruh advertiser tim marketing.
    *   **SPV Multimedia Dashboard**: Pelacakan performa Talent Live (Durasi Live, Leads yang didapat, hingga Omset yang dihasilkan).
*   **Admin Omni-Portal**: Akses "Dewa" untuk Admin agar dapat melihat seluruh Dashboard Supervisor dalam satu kategori menu terpusat.

---

## 🛠️ Update: Robust Import & Smart CS Assignment (v4.27) 🚀
*   **Admin Bulk Assignment**: Admin kini dapat mengimpor data sekaligus membagi penugasan CS secara massal lewat satu file CSV dengan kolom `nama_cs`.
*   **Indo-Excel Recovery**: Peningkatan deteksi format ilmiah Excel versi Indonesia (pemulihan angka `6,29E+12` yang menggunakan koma sebagai desimal).
*   **Enhanced Header Matching**: Penambahan dukungan otomatis untuk kolom `harga_normal` dan variasi penamaan header lainnya (Fuzzy Matching v4).
*   **Real-time Import UX**: Alert notifikasi sekarang menampilkan angka riil baris yang berhasil di-import, memberikan kejujuran data saat proses upload massal.

---

## 🧾 Fitur Sebelumnya: Arsip Nota Terintegrasi (v4.4) 📸
*   **One-Gate Entry**: Fitur unggah foto/scan nota kini terintegrasi langsung dan diwajibkan saat mencatat pengeluaran di modul Pengeluaran.
*   **Smart Indicators**: Tabel pengeluaran secara otomatis mendeteksi dan memberi *badge* peringatan ("Tanpa Nota") untuk pengeluaran lama atau import CSV yang belum dilengkapi dokumen fisik.
*   **Print-Ready Digital Archive**: Modul Arsip Nota berfungsi ganda sebagai *viewer* visual dan *generator* dokumen cetak (PDF) berukuran A4 yang secara otomatis menata tata letak banyak struk dalam satu halaman.

---

## 🛠️ Update Sistem: Multi-Path CS & Contextual Payroll (v4.4) 🚀 
### 1. Multi-Team Support (Plan A) 👥
*   **Flexible Assignments**: Satu CS kini bisa ditugaskan ke banyak jalur sekaligus (misal: Regular + TOEFL + Live).
*   **Smart Round Robin**: Logika pembagian jatah lead otomatis kini mendukung CS yang berada di banyak tim secara bersamaan.

---

*Created with ❤️ by Antigravity (Powered by Google Deepmind) for Speaking Partner Premium Operations.*
*Sistem v10.0 Aktif - Executive Insights & Unified Sync. Selamat beristirahat, Pak Muis! ☕*
