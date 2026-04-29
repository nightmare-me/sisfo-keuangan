"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { History, Shield, User, Activity, Clock, Trash2 } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: () => {}, type: "danger" as "danger" | "warning" | "info" });

  function fetchLogs() {
    setLoading(true);
    fetch("/api/logs")
      .then(r => r.json())
      .then(d => {
        setLogs(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  async function handleDeleteAll() {
    setConfirmModal({
      show: true,
      title: "HAPUS SEMUA LOG?",
      message: "⚠️ PERINGATAN KERAS: Seluruh catatan audit akan dihapus permanen dari sistem. Tindakan ini tidak bisa dibatalkan.",
      type: "danger",
      onConfirm: async () => {
        setLoading(true);
        const res = await fetch("/api/logs?all=true", { method: "DELETE" });
        if (res.ok) fetchLogs();
        else {
          setConfirmModal({
            show: true,
            title: "Gagal Menghapus",
            message: "❌ Terjadi kesalahan server saat mencoba menghapus log.",
            type: "danger",
            onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
          });
        }
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--danger)", marginBottom: 8 }}>
             <Shield size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Security & System</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Audit Log Aktivitas</h1>
          <p className="body-lg" style={{ margin: 0 }}>Pantau delegasi tugas dan integritas data staff secara real-time</p>
        </div>
        <div>
          <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleDeleteAll}>
            <Trash2 size={16} /> Hapus Semua Log
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: 180 }}>Waktu</th>
                <th>Staff / User</th>
                <th>Aksi</th>
                <th>Target</th>
                <th>Detail Tambahan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Memuat log aktivitas...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 48 }}>
                   <div className="empty-state">
                      <History size={48} />
                      <p>Belum ada riwayat aktivitas yang tercatat</p>
                   </div>
                </td></tr>
              ) : logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={12} />
                        {new Date(log.createdAt).toLocaleString('id-ID')}
                     </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                       <div style={{ width: 32, height: 32, borderRadius: 50, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={14} />
                       </div>
                       <div>
                          <div style={{ fontWeight: 700 }}>{log.user?.name}</div>
                          <div className="badge badge-muted" style={{ fontSize: 9, padding: '2px 8px' }}>{log.user?.role}</div>
                       </div>
                    </div>
                  </td>
                  <td>
                     <span style={{ fontWeight: 700, fontSize: 13, color: log.action.includes('DELETE') ? 'var(--danger)' : 'var(--primary)' }}>
                        {log.action}
                     </span>
                  </td>
                  <td>
                     <code style={{ fontSize: 12, background: 'var(--surface)', padding: '4px 8px', borderRadius: 4 }}>{log.target || "—"}</code>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.details || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal 
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() => setConfirmModal({ ...confirmModal, show: false })}
        onConfirm={confirmModal.onConfirm}
        type={confirmModal.type}
        loading={loading}
      />
    </div>
  );
}
