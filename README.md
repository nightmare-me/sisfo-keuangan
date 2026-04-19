This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

---

## Update Log - 19 April 2026

### 🏆 Final ERP Finance Optimization & Sync (Update 3)
- **Full-Spectrum Finance Sync**: 
  - **Advertiser Sync**: Data dari Advertiser (AdPerformance) kini terhubung 100% ke Dashboard Finansial dan Laporan Keuangan sebagai sumber kebenaran data iklan.
  - **Automated Payroll Expense**: Setiap pembayaran gaji (Staf & Pengajar) otomatis tercatat sebagai pengeluaran perusahaan secara real-time.
  - **Integrated Inventory**: Belanja barang inventaris baru otomatis terdaftar sebagai pengeluaran operasional perusahaan.
- **Advanced Dashboard Filters**: Penambahan fitur selector periode waktu yang dinamis (Hari Ini, Kemarin, Minggu Ini, Bulan Ini, dan Custom Date Range).
- **Revenue Source Identification**: Klasifikasi otomatis sumber pemasukan ke dalam 4 kategori strategis: **Regular**, **Repeat Order (RO)**, **Produk Live**, dan **Produk TOEFL**.
- **Automated CSV Imports**:
  - Dukungan import massal untuk Pemasukan, Siswa, Karyawan, dan Inventaris.
  - **Auto CS Tracking**: Import Pemasukan kini otomatis mengenali CS berdasarkan kolom `nama_cs`.
  - **Standard Format**: `nama_siswa`, `tanggal`, `program`, `harga_normal`, `diskon`, `nama_cs`, `ro`, `metode`, `keterangan`.
- **The "Bagan" Standard (TOEFL Sharing)**:
  - Implementasi sistem bagi hasil TOEFL 50/50 sesuai standar alur keuangan perusahaan.
  - Penambahan flag `isProfitSharing` pada manajemen produk untuk membedakan TOEFL Internal dan Partnership.
  - Perhitungan profit bersih departemen TOEFL (Omset dikurangi Ads & Fees) sebelum dilakukan pembagian profit ke tim.
- **Reporting & UX Excellence**:
  - Fitur **Export Excel & PDF** kini menyertakan rincian breakdown sumber pemasukan.
  - Fitur **"Hitung Otomatis"** sesi mengajar pada payroll guru berdasarkan data absensi terkini.

### 🛠️ Stabilitas & Bug Fixes
- **Prisma Schema Update**: Penambahan field `isProfitSharing` pada model Program.
- **API Optimization**: Peningkatan performa aggregation pada `/api/laporan`.
- **System Synchronization**: Reset dan restart server secara menyeluruh untuk sinkronisasi schema database terbaru.

---

## Update Log - 18 April 2026

### 🚀 Granular Role-Based Access Control (RBAC)
- **Dynamic Roles & Granular Permissions**: Implementasi sistem perijinan dinamis berbasis database untuk skalabilitas pengelolaan staf.
- **Role Management UI**: Dashboard baru di `/settings/roles` untuk mengatur hak akses secara visual.
- **Ads-Spent Sync Automation**: Sinkronisasi otomatis input Performa Iklan ke Laporan Keuangan.
