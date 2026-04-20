# Sisfo Keuangan & CRM - Speaking Partner 🚀

Sistem informasi keuangan terintegrasi dengan CRM Lead Management berperforma tinggi.

## 🚀 Fitur Baru: Automasi & Intelijen Bisnis (v2.1)

### 1. Modul Intelijen Jam Live Staf 🎙️ (BARU!)
*   **Layout Overhaul (Sketsa Gambar 2)**: Antarmuka yang didesain ulang total untuk efisiensi input. 
    *   **Atas**: Tabel riwayat talent live harian (Full-Width).
    *   **Bawah-Kiri**: Form input aktivitas yang ringkas.
    *   **Bawah-Kanan**: Statistik performa talent secara real-time.
*   **Sistem Akumulasi Pintar (Auto-Upsert)**: Jika talent diinput lebih dari sekali di hari yang sama, sistem otomatis **menjumlahkan durasi** dan menggabungkan keterangan, menjaga tabel tetap bersih (Single Row per Daily Talent).
*   **Real-time Revenue Matching**: Menarik data omset dan jumlah closing dari tabel Pemasukan secara otomatis berdasarkan `talentId` pada hari yang dipilih.

### 2. CRM Dashboard & KPI 📊
*   **Status Lengkap**: Mendukung siklus `PAID`, `REFUNDED`, dan `CANCELLED` dengan sinkronisasi database otomatis.
*   **Indikator RO**: Marker khusus untuk siswa lama (Repeat Order) di semua tampilan.
*   **Round Robin Engine**: Pembagian lead otomatis berdasarkan segmentasi tim (Live, TOEFL, RO, Regular).

### 3. Pengeluaran Dinamis & UI Premium 💸
*   **Kelola Kategori**: Bapak bisa manajemen kategori pengeluaran secara mandiri langsung dari dashboard.
*   **Fluid Typography**: Kartu metrik menggunakan *Container Queries* sehingga nominal besar (puluhan/ratusan juta) otomatis menyesuaikan ukuran font agar tetap rapi.
*   **Premium Aesthetics**: Implementasi bayangan ambient, border halus, dan mode *Glassmorphism* untuk kesan visual yang mewah.

### 4. Smart Payroll & Database Engine 💰
*   **Corrected DB Adapter**: Implementasi PostgreSQL Pool pada Prisma Adapter demi stabilitas koneksi tingkat tinggi.
*   **Detection Fallback**: Bonus TOEFL dideteksi otomatis berdasarkan metadata produk.

---
*Created with ❤️ by Antigravity for Speaking Partner Premium Operations. Semua sistem stabil dan siap pakai! Selamat beristirahat sejenak, Pak Muis!*
