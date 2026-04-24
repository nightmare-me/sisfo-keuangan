# Sisfo Keuangan & CRM - Speaking Partner 🚀

Sistem informasi keuangan terintegrasi dengan CRM Lead Management berperforma tinggi.

## 📢 Fitur Baru: Dynamic Finance & Universal Personnel (v4.50) 🚀 (TERBARU!)
*   **Dynamic Financial Settings**: Semua parameter penggajian (Fee Live, Bonus Omset, Sharing Profit TOEFL) kini dapat dikelola langsung via UI di menu "Pengaturan Keuangan". Tidak ada lagi angka yang ditanam kaku (hardcode) di kode program.
*   **Hard Reset Utility**: Penambahan alat pembersih database yang komprehensif untuk menghapus seluruh data transaksi, siswa, dan profil karyawan secara aman (menyisakan akun Admin) saat persiapan *go-live*.
*   **Universal NIP/NIK Separation**: Pemisahan total antara Nomor Induk Pegawai (NIP - Otomatis) dan Nomor Induk Kependudukan (NIK/KTP - Manual) yang berlaku seragam di modul Karyawan maupun Pengajar.
*   **Smart NIP Generator**: Sistem pelacakan urutan otomatis yang cerdas untuk menjamin keunikan NIP saat penginputan manual maupun *import* massal ribuan data sekaligus via CSV.
*   **Unified Personnel Management**: Sinkronisasi format data, template import, dan tampilan tabel antara modul Staf Administrasi dan Pengajar untuk efisiensi manajemen SDM.

---

## 📢 Fitur Sebelumnya: One-Gate Ads Import (v4.28) 🚀

---

## 🛠️ Update: Robust Import & Smart CS Assignment (v4.27) 🚀
*   **Admin Bulk Assignment**: Admin kini dapat mengimpor data sekaligus membagi penugasan CS secara massal lewat satu file CSV dengan kolom `nama_cs`.
*   **Indo-Excel Recovery**: Peningkatan deteksi format ilmiah Excel versi Indonesia (pemulihan angka `6,29E+12` yang menggunakan koma sebagai desimal).
*   **Enhanced Header Matching**: Penambahan dukungan otomatis untuk kolom `harga_normal` dan variasi penamaan header lainnya (Fuzzy Matching v4).
*   **Real-time Import UX**: Alert notifikasi sekarang menampilkan angka riil baris yang berhasil di-import, memberikan kejujuran data saat proses upload massal.
*   **Schema Consistency**: Sinkronisasi otomatis antara logika kode dan Database Enum (`LeadStatus`) untuk menjamin 100% integritas data saat transaksi massal.
*   **Maintenance Logs**: Integrasi sistem *Debug Logging* di server untuk pelacakan cepat jika terjadi kendala saat pemrosesan ribuan data.

---

## 🛠️ Update: Smart CRM Sync & Precision Payroll (v4.19) 🚀

## 🤝 Fitur Sebelumnya: Jalur Pendaftaran Affiliate & Dev Utilities (v4.5) 🚀

## 🧾 Fitur Sebelumnya: Arsip Nota Terintegrasi (v4.4) 📸
*   **One-Gate Entry**: Fitur unggah foto/scan nota kini terintegrasi langsung dan diwajibkan saat mencatat pengeluaran di modul Pengeluaran.
*   **Smart Indicators**: Tabel pengeluaran secara otomatis mendeteksi dan memberi *badge* peringatan ("Tanpa Nota") untuk pengeluaran lama atau import CSV yang belum dilengkapi dokumen fisik.
*   **Print-Ready Digital Archive**: Modul Arsip Nota berfungsi ganda sebagai *viewer* visual dan *generator* dokumen cetak (PDF) berukuran A4 yang secara otomatis menata tata letak banyak struk dalam satu halaman.
*   **Excel Export**: Fungsi pengunduhan laporan lengkap (termasuk *link* gambar nota) berformat `.xlsx` untuk rekapitulasi audit eksternal.

---

## 🛠️ Update Sistem: Multi-Path CS & Contextual Payroll (v4.4) 🚀 (TERBARU!)

### 1. Multi-Team Support (Plan A) 👥
*   **Flexible Assignments**: Satu CS kini bisa ditugaskan ke banyak jalur sekaligus (misal: Regular + TOEFL + Live).
*   **Checkbox UI**: Pembaruan menu Pengaturan User dengan sistem centang untuk pengelolaan tim yang lebih mudah dan visual.
*   **Smart Round Robin**: Logika pembagian jatah lead otomatis kini mendukung CS yang berada di banyak tim secara bersamaan.

### 2. Contextual Fee Engine 💸
*   **Dynamic Rule Selection**: Fee tidak lagi dipatok kaku pada profil CS, melainkan otomatis menyesuaikan dengan **jalur pendaftaran siswa** (closing TOEFL dapat fee TOEFL, closing RO dapat fee RO).
*   **Multi-Skill Fairness**: CS yang memiliki banyak keahlian akan dibayar sesuai dengan tingkat kesulitan masing-masing produk yang mereka *close*.

---

## 🛠️ Update Sebelumnya: CRM Stability & Smart Payroll (v4.3) 🚀

*   **Double-Click Prevention**: Penambahan *loading state* pada modal konversi lunas untuk mencegah error "Lead sudah lunas" akibat pengiriman data ganda.
*   **Navigation Integrity**: Perbaikan link navigasi pada halaman Invoice agar kembali ke dashboard yang tepat tanpa error 404.

### 2. Smart CS Fee Engine 💰
*   **Keyword-Based Detection**: Mesin gaji kini otomatis mendeteksi kata kunci (misal: "Semi", "Private") untuk menentukan fee yang lebih adil meskipun kategori produk belum diatur.
*   **Database First Priority**: Tetap mendukung kustomisasi penuh; jika fee diatur manual di menu Program, sistem akan memprioritaskan angka tersebut daripada deteksi otomatis.

---

## 📱 Update Sebelumnya: Mobile-Responsive Optimization (v4.2) 🚀

## 🚀 Fitur Sebelumnya: Premium Invoice System (v3.8) 📄

### 1. Unified Branding Identity 🎨
*   **Flex-Grid Table Architecture**: Perbaikan masalah *overflow* saat cetak A4.
*   **Asymmetrical Dark-Yellow Header**: Kombinasi warna identitas Speaking Partner.

---
*Created with ❤️ by Antigravity (Powered by Google Deepmind) for Speaking Partner Premium Operations.*
*Sistem v4.1 Aktif - Stabilitas Dashboard Terjamin. Selamat melayani siswa, Pak Muis! ☕*
