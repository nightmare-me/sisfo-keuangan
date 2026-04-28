# Sisfo Keuangan & CRM - Speaking Partner 🚀

Sistem informasi keuangan terintegrasi dengan CRM Lead Management berperforma tinggi.

## 📢 Fitur Baru: Premium Teacher & Student Experience (v4.80) 🚀 (TERBARU!)
*   **Modernized Teacher Portal**: Perombakan total antarmuka portal pengajar dengan desain *Glassmorphism* dan *KPI-driven* Dashboard.
*   **Payroll Transparency Dashboard**: Pengajar kini dapat memantau estimasi **Take Home Pay** (Gaji Pokok + Tunjangan + Fee Sesi) secara *real-time* langsung dari Dashboard mereka.
*   **Dynamic Learning Progress**: Visualisasi progress pembelajaran menggunakan *Progress Bar* otomatis untuk setiap kelas aktif guna memantau ketercapaian modul.
*   **New Student Experience**: Dashboard siswa kini dinamis; menampilkan rata-rata nilai (GPA) dan tingkat kehadiran yang dihitung otomatis dari input absensi pengajar.
*   **Full Grade Transparency**: Portal siswa kini dilengkapi halaman rincian nilai per sesi, memungkinkan siswa melihat feedback tutor dan rincian skor di setiap pertemuan.
*   **Teacher-Student Material Sync**: Pengajar dapat mengunggah link materi/modul yang secara otomatis terdistribusi ke sidebar materi pada portal siswa terkait.
*   **Refactored RBAC (Roles & Access)**: Pemisahan izin akses administratif (Data Pengajar) dan operasional (Kelas Saya) untuk menjaga kerahasiaan data sekaligus kemudahan navigasi.

---

---

## 📢 Fitur Sebelumnya: Big Data Optimization & Server-Side Pagination (v4.60) 🚀

---

## 📢 Fitur Sebelumnya: Hyper-Flexible Finance & Smart UX (v4.55) 🚀
*   **Fully Flexible Positions**: Bapak kini bisa menambah posisi baru (misal: Manager, Staff Ahli) langsung dari dashboard. Mesin payroll akan otomatis mencari kecocokan antara nama posisi dan pengaturan bonus tanpa perlu ubah kode.
*   **Complete Dynamic Fees**: Modul CS Live dan CS TOEFL kini 100% dinamis. Pengaturan rate CR (konversi), fee paket Elite/Master, dan persentase sharing bisa diubah kapan saja.
*   **Compact Tiered UI**: Desain ulang antarmuka pengaturan bonus bertingkat (Tiered Bonus) menjadi format horizontal yang padat dan informatif sesuai standar profesional.
*   **Accordion Sidebar Navigation**: Implementasi menu samping yang bisa di-*collapse* per kategori (Keuangan, Akademik, dll) untuk navigasi yang lebih bersih dan efisien pada dashboard yang kompleks.
*   **Universal NIP/NIK Separation**: Pemisahan total antara Nomor Induk Pegawai (NIP - Otomatis) dan Nomor Induk Kependudukan (NIK/KTP - Manual) yang berlaku seragam di modul Karyawan maupun Pengajar.
*   **Hard Reset Utility**: Penambahan alat pembersih database yang komprehensif untuk persiapan *go-live*.


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
*Sistem v4.6 Aktif - Performa & Stabilitas Big Data Terjamin. Selamat melayani siswa, Pak Muis! ☕*
