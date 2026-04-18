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

### 🚀 Fitur Baru & Peningkatan (Update 2)
- **Ads-Spent Sync Automation**: Implementasi sinkronisasi otomatis antara input **Performa Iklan** (Advertiser) dengan **Spent Ads** (Dashboard Finansial). Total spent harian harian per platform kini terupdate otomatis saat advertiser menyimpan data.
- **Enhanced Ad Platform Tracking**: Penambahan field **Platform** (Meta, Google, TikTok, dll) pada modul performa iklan untuk akurasi sinkronisasi data biaya.
- **Advanced API Validation**: Penguatan API ads performance dengan validasi data numerik (pencegahan NaN) dan penanganan error yang lebih detail.

### 🛠️ Teknis & Stabilitas Sistem
- **React v18 Downgrade**: Melakukan downgrade `react` & `react-dom` dari v19 ke v18.2.0 untuk memastikan kompatibilitas penuh dengan Next.js 14, memperbaiki error `TypeError: ... (reading 'call')` pada NextAuth, serta mengatasi masalah *white screen* pada dashboard.
- **Prisma Client Alignment**: Sinkronisasi skema database terbaru dengan Prisma Client untuk mendukung field platform baru.
- **Optimasi Optional Chaining**: Perbaikan sintaks pada dashboard untuk mencegah crash saat data API belum termuat.
- **Audit System**: Implementasi sistem audit log untuk pelacakan aktivitas yang lebih komprehensif.
