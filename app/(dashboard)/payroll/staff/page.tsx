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
import { formatCurrency, formatDate, SUPER_ROLES } from "@/lib/utils";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function StaffPayrollPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [processing, setProcessing] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: () => {}, type: "danger" as "danger" | "warning" | "info" | "success" });
  
  const [showDetail, setShowDetail] = useState<any>(null);

  const role = (session?.user as any)?.role?.toUpperCase();
  const isAdmin = SUPER_ROLES.includes(role);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);

  function fetchPayroll() {
    setLoading(true);
    const p = new URLSearchParams({ 
      bulan: String(bulan), 
      tahun: String(tahun),
      page: String(page),
      limit: String(limit)
    });
    fetch(`/api/payroll/staff?${p}`)
      .then(r => r.json())
      .then(d => {
        setData(d.data || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
        setMetrics(d.metrics || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchPayroll();
  }, [bulan, tahun, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [bulan, tahun]);

  async function handlePay(item: any) {
    setConfirmModal({
      show: true,
      title: "Konfirmasi Pembayaran Gaji?",
      message: `Apakah Anda yakin ingin memproses pembayaran gaji untuk "${item.name}"? Tindakan ini akan mencatat pengeluaran otomatis ke buku kas.`,
      type: "warning",
      onConfirm: async () => {
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
          fetchPayroll();
        } else {
          setConfirmModal({
            show: true,
            title: "Gagal Memproses",
            message: "❌ Terjadi kesalahan saat memproses data payroll. Silakan coba lagi.",
            type: "danger",
            onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
          });
        }
        setProcessing(false);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  }

  async function handleDeleteAll() {
    if (role !== "ADMIN") return;
    setConfirmModal({
      show: true,
      title: "HAPUS HISTORI PAYROLL?",
      message: "⚠️ PERINGATAN KERAS: Seluruh riwayat data PAYROLL STAF (Histori Pembayaran) akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.",
      type: "danger",
      onConfirm: async () => {
        setLoading(true);
        const res = await fetch("/api/payroll/staff?all=true", { method: "DELETE" });
        if (res.ok) fetchPayroll();
        else {
          setConfirmModal({
            show: true,
            title: "Gagal Menghapus",
            message: "❌ Terjadi kesalahan server saat mencoba menghapus data.",
            type: "danger",
            onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
          });
        }
        setLoading(false);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  }

  const BULAN_LIST = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  return (
    <div className="page-container">
      <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 40 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--primary)", marginBottom: 8 }}>
             <Wallet size={16} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>HR & Finance</span>
          </div>
          <h1 className="headline-lg">Payroll Staf & Bonus</h1>
          <p className="text-muted">Manajemen penggajian otomatis berdasarkan kinerja, jam live, dan profit sharing.</p>
          {role === "ADMIN" && (
            <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', marginTop: 12 }} onClick={handleDeleteAll}>
              <Trash2 size={16} /> Hapus Histori Payroll
            </button>
          )}
        </div>

        <div className="card glass" style={{ padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
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
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {(item.roles || [item.posisi]).map((r: string) => (
                        <span key={r} style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                          background: r === 'cs' ? 'rgba(59,130,246,0.1)' : r === 'advertiser' ? 'rgba(139,92,246,0.1)' : r.includes('spv') ? 'rgba(234,88,12,0.1)' : 'var(--surface-container)',
                          color: r === 'cs' ? '#3b82f6' : r === 'advertiser' ? '#8b5cf6' : r.includes('spv') ? '#ea580c' : 'var(--text-muted)'
                        }}>{r.toUpperCase()}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-muted" style={{ fontSize: 10 }}>{item.posisi || "Staf"}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.gapok + item.tunjangan)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {/* Tampilkan breakdown fee CS+ADV jika user merangkap */}
                    {(item.feeCS > 0 && item.feeAdv > 0) ? (
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(item.fee)}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>CS: {formatCurrency(item.feeCS)}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ADV: {formatCurrency(item.feeAdv)}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--info)', fontWeight: 700 }}>{formatCurrency(item.fee)}</span>
                    )}
                  </td>
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
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                       <button className="btn btn-secondary btn-icon" style={{ width: 42, height: 42, borderRadius: 12 }} onClick={() => setShowDetail(item)} title="Detail Breakdown"><Eye size={20} /></button>
                       <button 
                        className="btn btn-primary btn-icon" 
                        onClick={() => handlePay(item)}
                        disabled={processing || !isAdmin}
                        style={{ width: 42, height: 42, borderRadius: 12 }}
                        title="Approve"
                       >
                         {processing ? "..." : <CheckCircle size={20} />}
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination Footer */}
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--ghost-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Baris per halaman:</span>
                <select 
                  className="form-control form-control-sm" 
                  style={{ width: 80 }}
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                   Halaman <span style={{ fontWeight: 800, color: 'var(--on-surface)' }}>{page}</span> dari <span style={{ fontWeight: 800, color: 'var(--on-surface)' }}>{totalPages}</span>
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                   <button 
                     className="btn btn-secondary btn-sm" 
                     disabled={page <= 1 || loading}
                     onClick={() => setPage(prev => prev - 1)}
                     style={{ padding: '4px 12px' }}
                   >
                     Sebelumnya
                   </button>
                   <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2))
                      .map((p, i, arr) => (
                        <div key={p} style={{ display: 'flex', gap: 4 }}>
                          {i > 0 && arr[i-1] !== p - 1 && <span style={{ padding: '0 4px', alignSelf: 'center' }}>...</span>}
                          <button 
                            className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ minWidth: 32 }}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        </div>
                      ))}
                   </div>
                   <button 
                     className="btn btn-secondary btn-sm" 
                     disabled={page >= totalPages || loading}
                     onClick={() => setPage(prev => prev + 1)}
                     style={{ padding: '4px 12px' }}
                   >
                     Selanjutnya
                   </button>
                </div>
             </div>
          </div>
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
                      {(showDetail.feeCS > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                           <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                             <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>CS</span>
                             Fee Closing
                           </span>
                           <span style={{ fontWeight: 700, color: '#3b82f6' }}>{formatCurrency(showDetail.feeCS)}</span>
                        </div>
                      )}
                      {(showDetail.feeAdv > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                           <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                             <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>ADV</span>
                             Fee Iklan
                           </span>
                           <span style={{ fontWeight: 700, color: '#8b5cf6' }}>{formatCurrency(showDetail.feeAdv)}</span>
                        </div>
                      )}
                      {(!showDetail.feeCS && !showDetail.feeAdv) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                           <span>Fee (Sales/Ads)</span>
                           <span style={{ fontWeight: 700 }}>{formatCurrency(showDetail.fee)}</span>
                        </div>
                      )}
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
      <ConfirmModal 
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() => setConfirmModal({ ...confirmModal, show: false })}
        onConfirm={confirmModal.onConfirm}
        type={confirmModal.type}
        loading={processing || loading}
      />
    </div>
  );
}
