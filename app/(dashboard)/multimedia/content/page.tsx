"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  ListTodo, Plus, Calendar, User, 
  Film, CheckCircle2, AlertCircle, 
  ChevronLeft, Trash2, Edit3, ExternalLink,
  BarChart3
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function ContentProductionPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [contents, setContents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    judul: "",
    platform: "TIKTOK",
    status: "IDEATION",
    deadline: "",
    creatorId: "",
    videogId: "",
    editorId: "",
    urlReferensi: "",
    keterangan: ""
  });

  useEffect(() => { 
    fetchContents();
    fetchUsers();
  }, []);

  function fetchContents() {
    fetch("/api/multimedia/content")
      .then(r => r.json())
      .then(d => setContents(d))
      .catch(() => setContents([]));
  }

  function fetchUsers() {
    fetch("/api/users")
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.data || []);
        // Filter: Cek Role Utama ATAU Role Tambahan
        const filtered = list.filter((u: any) => {
          const primaryRole = u.role?.toUpperCase();
          const secondaries = (u.secondaryRoles || []).map((sr: string) => sr.toUpperCase());
          const targetRoles = ['MULTIMEDIA', 'SPV_MULTIMEDIA', 'TALENT'];
          
          return u.aktif && (
            targetRoles.includes(primaryRole) || 
            secondaries.some((sr: string) => targetRoles.includes(sr))
          );
        });
        setUsers(filtered);
      });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/multimedia/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setForm({
        judul: "", platform: "TIKTOK", status: "IDEATION", deadline: "",
        creatorId: "", videogId: "", editorId: "", urlReferensi: "", keterangan: ""
      });
      setShowModal(false);
      fetchContents();
    } else {
      const errorData = await res.json();
      alert("Gagal menyimpan: " + (errorData.error || "Terjadi kesalahan server"));
    }
    setLoading(false);
  }

  async function updateStatus(id: string, newStatus: string) {
    await fetch("/api/multimedia/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus })
    });
    fetchContents();
  }

  async function confirmDelete() {
    if (!deletingId) return;
    setLoading(true);
    await fetch(`/api/multimedia/content?id=${deletingId}`, { method: "DELETE" });
    setShowConfirm(false);
    setDeletingId(null);
    fetchContents();
    setLoading(false);
  }

  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [metricForm, setMetricForm] = useState({
    views: "", likes: "", shares: "", comments: "", saved: "", isViral: false
  });

  function openMetricModal(content: any) {
    setSelectedContent(content);
    setMetricForm({
      views: content.views?.toString() || "",
      likes: content.likes?.toString() || "",
      shares: content.shares?.toString() || "",
      comments: content.comments?.toString() || "",
      saved: content.saved?.toString() || "",
      isViral: content.isViral || false
    });
    setShowMetricModal(true);
  }

  async function saveMetrics(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/multimedia/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedContent.id,
        views: Number(metricForm.views) || 0,
        likes: Number(metricForm.likes) || 0,
        shares: Number(metricForm.shares) || 0,
        comments: Number(metricForm.comments) || 0,
        saved: Number(metricForm.saved) || 0,
        isViral: metricForm.isViral
      })
    });
    if (res.ok) {
      setShowMetricModal(false);
      fetchContents();
    }
    setLoading(false);
  }

  return (
    <div className="page-container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      {/* ... (Header tetap sama) */}
      <div style={{ marginBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button onClick={() => window.history.back()} className="btn btn-secondary btn-icon" style={{ borderRadius: 12 }}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Content Tracker</h1>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Manajemen antrean produksi konten kreatif Speaking Partner</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ borderRadius: 12, height: 50, padding: "0 24px", fontWeight: 700 }}>
          <Plus size={20} /> Konten Baru
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: 24 }}>
        <div className="table-wrapper">
          <table style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: "var(--surface-container-low)" }}>
                <th style={{ padding: "20px 24px" }}>JUDUL & PERFORMA</th>
                <th>TIM PRODUKSI</th>
                <th>STATUS</th>
                <th>DEADLINE</th>
                <th style={{ textAlign: "right", padding: "20px 24px" }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {contents.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 80, color: "var(--text-muted)" }}>Belum ada rencana konten</td></tr>
              ) : contents.map(c => (
                <tr key={c.id} className="table-row-hover">
                  <td style={{ padding: "20px 24px" }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{c.judul}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                      <span className="badge" style={{ background: "var(--primary-container)", color: "var(--primary)" }}>{c.platform}</span>
                      {c.isViral && <span className="badge" style={{ background: "#fef3c7", color: "#d97706", border: "1px solid #fcd34d" }}>🔥 VIRAL</span>}
                      {c.status === 'POSTED' && (
                        <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 700 }}>
                          📈 {(c.views || 0).toLocaleString()} Views | {(c.likes || 0).toLocaleString()} Likes
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ opacity: 0.6 }}>✍️ Creator:</span> 
                        <span style={{ fontWeight: 700 }}>{c.creator?.name || "-"}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ opacity: 0.6 }}>📹 Video:</span> 
                        <span style={{ fontWeight: 700 }}>{c.videographer?.name || "-"}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select 
                      value={c.status} 
                      onChange={e => updateStatus(c.id, e.target.value)}
                      style={{ 
                        padding: "6px 12px", 
                        borderRadius: 8, 
                        border: "none",
                        fontWeight: 700,
                        fontSize: 12,
                        background: c.status === 'POSTED' ? 'var(--success-container)' : c.status === 'EDITING' ? 'var(--warning-container)' : 'var(--secondary-container)',
                        color: c.status === 'POSTED' ? 'var(--success)' : c.status === 'EDITING' ? 'var(--warning)' : 'var(--secondary)'
                      }}
                    >
                      {["IDEATION", "SCRIPTING", "FILMING", "EDITING", "REVIEW", "POSTED", "CANCELLED"].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                      <Calendar size={14} className="text-muted" />
                      {c.deadline ? new Date(c.deadline).toLocaleDateString("id-ID") : "-"}
                    </div>
                  </td>
                  <td style={{ textAlign: "right", padding: "20px 24px" }}>
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                      {c.status === 'POSTED' && (
                        <button 
                          onClick={() => openMetricModal(c)} 
                          className="btn btn-secondary btn-icon" 
                          title="Update Metrik Video" 
                          style={{ color: "var(--success)", width: 42, height: 42, borderRadius: 12 }}
                        >
                          <BarChart3 size={20} />
                        </button>
                      )}
                      {c.urlHasil && (
                        <a href={c.urlHasil} target="_blank" className="btn btn-secondary btn-icon" style={{ width: 42, height: 42, borderRadius: 12 }}>
                          <ExternalLink size={20} />
                        </a>
                      )}
                      <button 
                        onClick={() => { setDeletingId(c.id); setShowConfirm(true); }} 
                        className="btn btn-secondary btn-icon" 
                        style={{ color: "var(--danger)", width: 42, height: 42, borderRadius: 12 }}
                        title="Hapus Konten"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Metrik (Muncul saat klik icon Chart di baris konten Posted) */}
      {showMetricModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ maxWidth: 450, width: "100%", padding: 32, borderRadius: 24 }}>
            <h2 style={{ marginBottom: 8, fontWeight: 800 }}>Update Performa Konten</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>{selectedContent?.judul}</p>
            
            <form onSubmit={saveMetrics}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div className="form-group">
                  <label className="form-label">Views</label>
                  <input type="number" className="form-control" value={metricForm.views} onChange={e => setMetricForm({...metricForm, views: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Likes</label>
                  <input type="number" className="form-control" value={metricForm.likes} onChange={e => setMetricForm({...metricForm, likes: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Saved</label>
                  <input type="number" className="form-control" value={metricForm.saved} onChange={e => setMetricForm({...metricForm, saved: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Shares</label>
                  <input type="number" className="form-control" value={metricForm.shares} onChange={e => setMetricForm({...metricForm, shares: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Comments</label>
                  <input type="number" className="form-control" value={metricForm.comments} onChange={e => setMetricForm({...metricForm, comments: e.target.value})} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, gridColumn: "span 2", background: "var(--surface-container-low)", padding: 12, borderRadius: 12 }}>
                  <input 
                    type="checkbox" 
                    id="isViral" 
                    checked={metricForm.isViral} 
                    onChange={e => setMetricForm({...metricForm, isViral: e.target.checked})} 
                    style={{ width: 20, height: 20 }}
                  />
                  <label htmlFor="isViral" style={{ fontWeight: 700, cursor: "pointer" }}>🔥 Tandai sebagai Konten VIRAL / FYP</label>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={() => setShowMetricModal(false)} className="btn btn-secondary" style={{ flex: 1, borderRadius: 12 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, borderRadius: 12 }} disabled={loading}>
                  {loading ? "Menyimpan..." : "Update Metrik"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Konten Sederhana */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ maxWidth: 600, width: "100%", padding: 32, borderRadius: 24, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ marginBottom: 24, fontWeight: 800 }}>Buat Rencana Konten</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Judul Konten</label>
                <input type="text" className="form-control" value={form.judul} onChange={e => setForm({...form, judul: e.target.value})} placeholder="Misal: Review Program Speaking..." required />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Platform Utama</label>
                  <select className="form-control" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>
                    <option value="TIKTOK">TikTok</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="YOUTUBE">YouTube</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input type="date" className="form-control" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Content Creator</label>
                  <select className="form-control" value={form.creatorId} onChange={e => setForm({...form, creatorId: e.target.value})}>
                    <option value="">Pilih Creator</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Videographer</label>
                  <select className="form-control" value={form.videogId} onChange={e => setForm({...form, videogId: e.target.value})}>
                    <option value="">Pilih Videographer</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">URL Referensi (Optional)</label>
                <input type="url" className="form-control" value={form.urlReferensi} onChange={e => setForm({...form, urlReferensi: e.target.value})} placeholder="https://..." />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1, borderRadius: 12 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, borderRadius: 12 }} disabled={loading}>
                  {loading ? "Menyimpan..." : "Buat Rencana Konten"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmDelete}
        loading={loading}
        title="Hapus Rencana Konten?"
        message={`Rencana konten "${contents.find(c => c.id === deletingId)?.judul}" akan dihapus permanen.`}
      />
    </div>
  );
}
