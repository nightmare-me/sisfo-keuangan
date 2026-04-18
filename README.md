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

## Update Log - 18 April 2026

### 🚀 Fitur Baru & Peningkatan
- **Ads Performance Monitoring**: Penambahan halaman performa iklan (`/ads/performance`) untuk memantau efektivitas kampanye.
- **CRM Stats & Optimization**: Implementasi API statistik CRM dan pemindahan Executive Summary ke strip horizontal untuk memaksimalkan ruang kerja Kanban.
- **Payroll Logic Update**: Pembaruan sistem kalkulasi gaji pengajar (`lib/payroll.ts`) untuk akurasi honorarium.
- **Restrukturisasi Menu**: Reorganisasi halaman Laporan menjadi **Laporan Keuangan** untuk kejelasan modul.

### 💻 Optimasi UI/UX (Responsivitas)
- **Laptop Screen Optimization**: Penyesuaian menyeluruh untuk layar 1366px - 1280px.
- **Global Design System**: Sidebar lebih ramping (260px), padding kontainer lebih efisien, dan ukuran font/tombol yang lebih proporsional.
- **Fix Kanban Cropping**: Perbaikan kolom Kanban yang terpotong di layar laptop kecil.

### 🛠️ Teknis & Database
- **Employee & Payroll Database**: Implementasi model `KaryawanProfile` untuk menyimpan NIK, data bank, dan parameter penggajian.
- **Auto-Generate NIK**: Sistem penomoran otomatis karyawan dengan format `SP-*****`.
- **Management UI**: Penambahan modal pengaturan payroll pada halaman Manajemen Personil untuk akses Admin/Finance.
- **Schema Synchronization**: Pembaruan relasi Refund, Pemasukan, dan penambahan field durasi pada Program.
- **Audit System**: Implementasi sistem audit log untuk pelacakan aktivitas.
