# 🛡️ Panduan Hak Akses (Role-Based Access Control)
**Speaking Partner ERP System**

Dokumen ini menjelaskan fungsi dari setiap hak akses (permission) yang tersedia di halaman Pengaturan Role. Gunakan panduan ini untuk menentukan kewenangan staf dengan tepat.

## 📊 Kelompok 1: Utama & Dashboard
| Nama Akses | Slug Izin | Penjelasan Fungsi |
| :--- | :--- | :--- |
| **Dashboard View** | `dashboard:view` | Mengizinkan user melihat ringkasan grafik, total pemasukan/pengeluaran, dan transaksi terkini di halaman utama (Dashboard). |

## 🤝 Kelompok 2: CRM & Customer Service
| Nama Akses | Slug Izin | Penjelasan Fungsi |
| :--- | :--- | :--- |
| **Lihat CRM** | `crm:view` | Mengizinkan user masuk ke halaman CRM dan melihat daftar lead (calon siswa). Jika user adalah CS, ia hanya melihat lead miliknya. |
| **Edit CRM** | `crm:edit` | Mengizinkan user mengubah data calon siswa, mengupdate status (Follow up, Pending, dll), dan menambahkan catatan. |
| **CRM Manage** | `crm:manage` | **Hak Super CS**: Mengizinkan user menghapus data lead dan melakukan eksport data leads ke Excel/CSV. |

## 💰 Kelompok 3: Keuangan (Finance)
| Nama Akses | Slug Izin | Penjelasan Fungsi |
| :--- | :--- | :--- |
| **Lihat Keuangan** | `finance:view` | Mengizinkan user melihat data pemasukan, pengeluaran harian, invoice, dan data spent ads. |
| **Edit Keuangan** | `finance:edit` | Mengizinkan user menambah transaksi baru (Input pemasukan/pengeluaran) atau mengubah data transaksi yang sudah ada. |
| **Hapus Transaksi** | `finance:delete` | **Hak Kritis**: Mengizinkan user menghapus data transaksi dari sistem. Berikan hanya pada level manajer finance. |
| **Finance Manage** | `finance:manage` | Mengizinkan user mengakses fitur-fitur administratif keuangan tingkat lanjut. |
| **Approve Refund** | `refund:approve` | Tombol khusus untuk menyetujui (Approve) atau menolak (Reject) pengajuan refund dari CS. |

## 🎓 Kelompok 4: Akademik & Siswa
| Nama Akses | Slug Izin | Penjelasan Fungsi |
| :--- | :--- | :--- |
| **Siswa View** | `siswa:view` | Mengizinkan user melihat daftar profil siswa, histori kelas mereka, dan status keaktifan. |
| **Manajemen Siswa** | `siswa:manage` | Mengizinkan user mendaftarkan siswa baru, menghapus data siswa, atau mengedit profil siswa (nik, alamat, dll). |
| **Manajemen Kelas** | `kelas:manage` | Mengizinkan user membuat kelas baru, menentukan pengajar, mengatur link grup WA kelas, dan materi kelas. |
| **Akademik Manage** | `akademik:manage` | Mengizinkan akses ke pengaturan Program/Produk dan pengaturan gaji pengajar per sesi. |

## 💵 Kelompok 5: Payroll & Laporan
| Nama Akses | Slug Izin | Penjelasan Fungsi |
| :--- | :--- | :--- |
| **Payroll View** | `payroll:view` | Mengizinkan user melihat slip gaji staf dan rekap jam live harian (biasanya untuk staf yang ingin cek gajinya sendiri). |
| **Manajemen Payroll** | `payroll:manage` | Mengizinkan user memproses pembayaran gaji (Update status bayar) dan mengubah data gaji staf/pengajar. |
| **Lihat Laporan** | `report:view` | Mengizinkan akses ke menu Laporan Tahunan/Bulanan untuk melihat laba bersih dan performa bisnis secara mendalam. |

## 📢 Kelompok 6: Marketing & Advertiser
| Nama Akses | Slug Izin | Penjelasan Fungsi |
| :--- | :--- | :--- |
| **Ads Manage** | `ads:manage` | Mengizinkan akses ke halaman **Performa Iklan**. User bisa input data spent, leads, dan melihat CPL (Cost Per Lead) harian. |

## ⚙️ Kelompok 7: Sistem (Super Admin)
| Nama Akses | Slug Izin | Penjelasan Fungsi |
| :--- | :--- | :--- |
| **Manajemen User & Role** | `user:manage` | Mengizinkan user menambah staf baru, mengganti password staf, dan mengatur hak akses (role) staf lain. |
| **Settings Manage** | `settings:manage` | Mengizinkan user mengubah pengaturan sistem seperti Template WhatsApp dan Audit Log. |

---

### Tips Pemberian Izin:
- **Prinsip Least Privilege**: Berikan izin seminimal mungkin yang dibutuhkan staf untuk bekerja. Staf CS biasanya cukup diberikan `dashboard:view`, `crm:view`, `crm:edit`, dan `siswa:view`.
- **Administrator**: User dengan role Administrator secara otomatis memiliki **semua centang di atas**, meskipun Bapak tidak mencentangnya di halaman Settings.
- **Audit Log**: Setiap tindakan yang dilakukan user (terutama penghapusan) akan tercatat di Audit Log, jadi Bapak bisa melacak siapa yang melakukan apa.
