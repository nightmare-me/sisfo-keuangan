"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { 
  History, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Wallet, 
  MessageCircle,
  AlertCircle,
  ArrowRight
} from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-warning",
  APPROVED: "badge-success",
  REJECTED: "badge-danger",
};

export default function RefundPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canApprove = ["ADMIN", "FINANCE"].includes(role);

  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [processForm, setProcessForm] = useState({ status: "APPROVED", catatan: "" });

  function fetchRefunds() {
    setLoading(true);
    fetch("/api/refund")
      .then(r => r.json())
      .then(d => { setRefunds(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { fetchRefunds(); }, []);

  async function handleProcess(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/refund/${selectedRefund.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processForm),
      });

      if (res.ok) {
        setShowProcessModal(false);
        setProcessForm({ status: "APPROVED", catatan: "" });
        fetchRefunds();
      } else {
        const err = await res.json();
        alert("❌ Gagal memproses refund: " + (err.error || "Terjadi kesalahan"));
      }
    } catch (err) {
      console.error("Refund processing error:", err);
      alert("❌ Terjadi kesalahan koneksi.");
    }
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--warning)", marginBottom: 8 }}>
             <Wallet size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Financial Operations</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Manajemen Refund</h1>
          <p className="body-lg" style={{ margin: 0 }}>Verifikasi dan kelola pengembalian dana pembatalan program</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tgl Pengajuan</th>
                <th>Siswa</th>
                <th>Jumlah Refund</th>
                <th>Alasan & Rekening</th>
                <th>Status</th>
                <th>CS Pengaju</th>
                {canApprove && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Memuat data refund...</td></tr>
              ) : refunds.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48 }}>
                   <div className="empty-state">
                      <History size={48} />
                      <p>Belum ada pengajuan refund</p>
                   </div>
                </td></tr>
              ) : refunds.map(r => (
                <tr key={r.id}>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(r.createdAt)}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.siswa?.nama}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.siswa?.noSiswa}</div>
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--danger)' }}>{formatCurrency(r.jumlah)}</td>
                  <td>
                    <div style={{ fontSize: 13 }}>{r.alasan}</div>
                    <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>🏧 {r.rekeningTujuan}</div>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                  </td>
                  <td style={{ fontSize: 12 }}>{r.cs?.name}</td>
                  {canApprove && (
                    <td>
                      {r.status === "PENDING" ? (
                        <button className="btn btn-primary btn-sm" onClick={() => { setSelectedRefund(r); setShowProcessModal(true); }}>
                           Proses
                        </button>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                           Oleh: {r.finance?.name}<br/>
                           {formatDate(r.updatedAt)}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROCESS MODAL */}
      {showProcessModal && selectedRefund && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowProcessModal(false); }}>
          <div className="modal" style={{ width: 440 }}>
            <div className="modal-header">
              <div className="modal-title">Proses Pengajuan Refund</div>
              <button className="modal-close" onClick={() => setShowProcessModal(false)}>✕</button>
            </div>
            <form onSubmit={handleProcess}>
              <div className="modal-body">
                <div className="glass" style={{ padding: 16, borderRadius: 12, marginBottom: 20, border: '1px solid var(--ghost-border)' }}>
                   <div style={{ fontSize: 12, color: 'var(--secondary)', marginBottom: 4 }}>TOTAL REFUND KE SISWA</div>
                   <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--danger)' }}>{formatCurrency(selectedRefund.jumlah)}</div>
                </div>

                <div className="form-group">
                  <label className="form-label required">Keputusan</label>
                  <select className="form-control" value={processForm.status} onChange={e => setProcessForm({...processForm, status: e.target.value})}>
                    <option value="APPROVED">Setujui (Approved)</option>
                    <option value="REJECTED">Tolak (Rejected)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Catatan / Bukti Transfer</label>
                  <textarea className="form-control" rows={3} placeholder="Sertakan kabar konfirmasi atau alasan jika ditolak..." value={processForm.catatan} onChange={e => setProcessForm({...processForm, catatan: e.target.value})} />
                </div>

                {processForm.status === "APPROVED" && (
                  <div style={{ background: 'var(--danger-bg)', padding: 12, borderRadius: 8, fontSize: 12, color: 'var(--danger)', display: 'flex', gap: 10, marginTop: 12 }}>
                    <AlertCircle size={16} />
                    <span><strong>Peringatan Otomatis:</strong> Setelah disetujui, akun siswa ini akan dinonaktifkan dari daftar hadir dan akses akademik akan diputus.</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProcessModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Simpan Keputusan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
