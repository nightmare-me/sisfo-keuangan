"use client";

import { useState } from "react";
import { Shield, Download, FileJson, FileSpreadsheet, AlertTriangle } from "lucide-react";

export default function ArchivePage() {
  const [loading, setLoading] = useState(false);

  async function exportTable(table: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/export?table=${table}`);
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${table}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Gagal mengekspor tabel ${table}`);
    }
    setLoading(false);
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--danger)", marginBottom: 8 }}>
             <Shield size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>System Archive</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Backup & Eksport</h1>
          <p className="body-lg" style={{ margin: 0 }}>Unduh seluruh data sistem untuk arsip pribadi atau migrasi</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        <div className="card" style={{ background: 'var(--danger-bg)', padding: 32, marginBottom: 48, border: '1px solid rgba(239,68,68,0.2)' }}>
           <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <AlertTriangle size={48} color="var(--danger)" />
              <div>
                 <h3 style={{ margin: 0, color: 'var(--danger)', fontSize: '1.2rem' }}>Peringatan Keamanan Data</h3>
                 <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Data yang diunduh berisi informasi sensitif termasuk detail siswa dan laporan keuangan. 
                    Pastikan file disimpan di tempat yang aman.
                 </p>
              </div>
           </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {[
            { id: "User", label: "User & Karyawan", icon: <Shield size={24} /> },
            { id: "Siswa", label: "Master Data Siswa", icon: <Download size={24} /> },
            { id: "Pemasukan", label: "Laporan Pemasukan", icon: <FileSpreadsheet size={24} /> },
            { id: "Pengeluaran", label: "Laporan Pengeluaran", icon: <FileSpreadsheet size={24} /> },
            { id: "Kelas", label: "Data Akademik & Kelas", icon: <FileJson size={24} /> },
            { id: "Lead", label: "Data CRM & Prospek", icon: <Download size={24} /> },
          ].map(table => (
            <div key={table.id} className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: 'var(--primary)' }}>{table.icon}</div>
                  <div className="badge badge-muted">JSON / CSV ready</div>
               </div>
               <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 4 }}>{table.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mencakup semua record historis tabel {table.id}.</div>
               </div>
               <button 
                 className="btn btn-secondary" 
                 style={{ width: '100%', borderRadius: 12 }} 
                 onClick={() => exportTable(table.id)}
                 disabled={loading}
               >
                 {loading ? "Menyiapkan..." : "Unduh Data (.json)"}
               </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
