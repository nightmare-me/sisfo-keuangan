"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Plus, 
  Trash2, 
  Calendar,
  Clock,
  User,
  Save,
  Wallet,
  CheckCircle,
  Eye,
  TrendingUp,
  Download,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function StaffPayrollPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [processing, setProcessing] = useState(false);
  
  const [showDetail, setShowDetail] = useState<any>(null);

  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";

  function fetchPayroll() {
    setLoading(true);
    fetch(`/api/payroll/staff?bulan=${bulan}&tahun=${tahun}`)
      .then(r => r.json())
      .then(d => {
        setData(d.data || []);
        setMetrics(d.metrics || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchPayroll();
  }, [bulan, tahun]);

  async function handlePay(item: any) {
    if (!confirm(`Konfirmasi pembayaran gaji untuk ${item.name}? Ini akan mencatat pengeluaran otomatis.`)) return;
    
    setProcessing(true);
    const res = await fetch("/api/payroll/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: item.id,
        bulan,
        tahun,
        gapok: item.gapok,
        tunjangan: item.tunjangan,
        fee: item.fee,
        bonus: item.bonus,
        total: item.total,
        keterangan: `Payroll Otomatis Bulan ${bulan}/${tahun}`
      })
    });

    if (res.ok) {
      alert(`Berhasil memproses payroll untuk ${item.name}`);
      fetchPayroll();
    } else {
      alert("Gagal memproses payroll.");
    }
    setProcessing(false);
  }

  const BULAN_LIST = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  return (
    <div className="page-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--primary)", marginBottom: 8 }}>
             <Wallet size={16} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>HR & Finance</span>
          </div>
          <h1 className="headline-lg">Payroll Staf & Bonus</h1>
          <p className="text-muted">Manajemen penggajian otomatis berdasarkan kinerja, jam live, dan profit sharing.</p>
        </div>

        <div className="card glass" style={{ padding: '8px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
           <select className="form-control" value={bulan} onChange={e => setBulan(parseInt(e.target.value))}>
             {BULAN_LIST.map((b, i) => <option key={i} value={i+1}>{b}</option>)}
           </select>
           <select className="form-control" value={tahun} onChange={e => setTahun(parseInt(e.target.value))}>
             {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
           </select>
           <button className="btn btn-secondary btn-icon" onClick={fetchPayroll}><RefreshCw size={14} /></button>
        </div>
      </header>

      {/* Metrics Dashboard */}
      <div className="kpi-grid" style={{ marginBottom: 32 }}>
        <div className="kpi-card" style={{ "--kpi-color": "#3b82f6", "--kpi-bg": "rgba(59,130,246,0.1)" } as any}>
          <div className="kpi-label">Gross Profit (Month)</div>
          <div className="kpi-value">{formatCurrency(metrics.grossProfit || 0)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Revenue: {formatCurrency(metrics.totalPemasukan || 0)}</div>
        </div>
        <div className="kpi-card" style={{ "--kpi-color": "#10b981", "--kpi-bg": "rgba(16,185,129,0.1)" } as any}>
          <div className="kpi-label">TOEFL Profit Share Base</div>
          <div className="kpi-value">{formatCurrency(metrics.toeflProfit || 0)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>50% to Company / 50% to Team</div>
        </div>
        <div className="kpi-card" style={{ "--kpi-color": "#f59e0b", "--kpi-bg": "rgba(245,158,11,0.1)" } as any}>
          <div className="kpi-label">Total Gaji Variabel</div>
          <div className="kpi-value">{formatCurrency(data.reduce((s, d) => s + d.fee + d.bonus + (d.gajiLive || 0), 0))}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Fee + Bonus + Jam Live</div>
        </div>
      </div>

      <div className="card glass no-padding">
        <div className="table-wrapper">
          <table className="table-modern">
            <thead>
              <tr>
                <th>KARYAWAN</th>
                <th>POSISI</th>
                <th style={{ textAlign: 'right' }}>GAJI POKOK</th>
                <th style={{ textAlign: 'right' }}>FEE (CS/ADV)</th>
                <th style={{ textAlign: 'right' }}>BONUS / SHARING</th>
                <th style={{ textAlign: 'right' }}>LIVE (JAM)</th>
                <th style={{ textAlign: 'right' }}>TOTAL</th>
                <th style={{ textAlign: 'center' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center" style={{ padding: 60 }}>Memproses data payroll...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="text-center" style={{ padding: 60 }}>Belum ada data karyawan dengan profil aktif.</td></tr>
              ) : data.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 800 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.id.slice(-6)}</div>
                  </td>
                  <td>
                    <span className="badge badge-muted" style={{ fontSize: 10 }}>{item.posisi || "Staf"}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.gapok + item.tunjangan)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--info)' }}>{formatCurrency(item.fee)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--success)' }}>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(item.bonus)}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(item.gajiLive)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.details.jamLive} jam</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary)' }}>{formatCurrency(item.total)}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                       <button className="btn btn-secondary btn-icon" onClick={() => setShowDetail(item)} title="Detail Breakdown"><Eye size={14} /></button>
                       <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => handlePay(item)}
                        disabled={processing || !isAdmin}
                        style={{ padding: '4px 12px' }}
                       >
                         {processing ? "..." : <CheckCircle size={14} />} Approve
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
             <div className="modal-header">
                <div className="modal-title">Rincian Payroll: {showDetail.name}</div>
             </div>
             <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   <div className="card" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>KOMPONEN TETAP</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                         <span>Gaji Pokok</span>
                         <span style={{ fontWeight: 700 }}>{formatCurrency(showDetail.gapok)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                         <span>Tunjangan</span>
                         <span style={{ fontWeight: 700 }}>{formatCurrency(showDetail.tunjangan)}</span>
                      </div>
                   </div>

                   <div className="card" style={{ background: 'rgba(59,130,246,0.05)' }}>
                      <div style={{ fontSize: 12, color: 'var(--info)', marginBottom: 12 }}>KINERJA & VARIABEL</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                         <span>Fee (Sales/Ads)</span>
                         <span style={{ fontWeight: 700 }}>{formatCurrency(showDetail.fee)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                         <span>Gaji Live ({showDetail.details.jamLive} jam)</span>
                         <span style={{ fontWeight: 700 }}>{formatCurrency(showDetail.gajiLive)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                         <span>Bonus & Sharing Profit</span>
                         <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(showDetail.bonus)}</span>
                      </div>
                   </div>

                   <div style={{ padding: '16px 0', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>TOTAL AKHIR</span>
                      <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary)' }}>{formatCurrency(showDetail.total)}</span>
                   </div>
                </div>
             </div>
             <div className="modal-footer">
                <button className="btn btn-secondary w-full" onClick={() => setShowDetail(null)}>Tutup</button>
             </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .table-modern td {
            vertical-align: middle;
            padding: 16px;
        }
        .badge-success {
            background: rgba(16,185,129,0.1);
            color: #10b981;
        }
        .badge-info {
            background: rgba(59,130,246,0.1);
            color: #3b82f6;
        }
      `}</style>
    </div>
  );
}
