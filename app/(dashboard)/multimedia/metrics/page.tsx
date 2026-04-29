"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  BarChart3, Save, Calendar, Globe, 
  Eye, Heart, MessageSquare, Share2, 
  ChevronLeft, History, Trash2, Edit3, X, TrendingUp
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, AreaChart, Area 
} from "recharts";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function SocialMetricsPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role?.toUpperCase() === "ADMIN";
  
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    platform: "TIKTOK",
    followers: "",
    views: "",
    likes: "",
    shares: "",
    comments: "",
    saved: "",
    tanggal: new Date().toISOString().slice(0, 10),
    keterangan: ""
  });

  useEffect(() => { fetchHistory(); }, []);

  function fetchHistory() {
    fetch("/api/multimedia/metrics")
      .then(r => r.json())
      .then(d => setHistory(d))
      .catch(() => setHistory([]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/multimedia/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      alert("Metrik berhasil disimpan!");
      setForm({ ...form, followers: "", views: "", likes: "", shares: "", comments: "", saved: "", keterangan: "" });
      fetchHistory();
    } else {
      const errorData = await res.json();
      alert("Gagal menyimpan: " + (errorData.error || "Terjadi kesalahan server"));
    }
    setLoading(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/multimedia/metrics", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editItem)
    });
    if (res.ok) {
      setShowEditModal(false);
      fetchHistory();
    }
    setLoading(false);
  }

  async function confirmDelete() {
    if (!deletingId) return;
    setLoading(true);
    const res = await fetch(`/api/multimedia/metrics?id=${deletingId}`, { method: "DELETE" });
    if (res.ok) {
      setShowConfirm(false);
      setDeletingId(null);
      fetchHistory();
    }
    setLoading(false);
  }

  // Siapkan data grafik (10 data terakhir)
  const chartData = [...history]
    .reverse()
    .slice(-10)
    .map(h => ({
      name: new Date(h.tanggal).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' }),
      followers: h.followers,
      views: h.views,
    }));

  return (
    <div className="page-container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      {/* ... (Header dan Grafik Tren tetap sama) */}
      <div style={{ marginBottom: 40, display: "flex", alignItems: "center", gap: 20 }}>
        <button onClick={() => window.history.back()} className="btn btn-secondary btn-icon" style={{ borderRadius: 12 }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Metrik Sosmed</h1>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>Pantau pertumbuhan akun dan evaluasi tren performa</p>
        </div>
      </div>

      <div className="card" style={{ padding: 32, borderRadius: 24, marginBottom: 32, height: 350 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <TrendingUp className="text-primary" size={20} /> Tren Pertumbuhan Followers & Views
        </h2>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorFoll" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ghost-border)" />
            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }} />
            <Area type="monotone" dataKey="followers" name="Followers" stroke="var(--primary)" strokeWidth={3} fill="url(#colorFoll)" />
            <Line type="monotone" dataKey="views" name="Views" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="panel-grid-37" style={{ alignItems: "start" }}>
        {/* Form Section */}
        <div className="card" style={{ padding: 32, borderRadius: 24 }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, fontSize: 20, fontWeight: 700 }}>
            <BarChart3 className="text-primary" /> Data Baru
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Platform</label>
              <select className="form-control" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>
                <option value="TIKTOK">TikTok</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="FACEBOOK">Facebook</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Tanggal Data</label>
              <input type="date" className="form-control" value={form.tanggal} onChange={e => setForm({...form, tanggal: e.target.value})} required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
               <div className="form-group">
                 <label className="form-label">Followers</label>
                 <input type="number" className="form-control" value={form.followers} onChange={e => setForm({...form, followers: e.target.value})} placeholder="Total Pengikut" required />
               </div>
               <div className="form-group">
                 <label className="form-label">Views</label>
                 <input type="number" className="form-control" value={form.views} onChange={e => setForm({...form, views: e.target.value})} placeholder="0" required />
               </div>
               <div className="form-group">
                 <label className="form-label">Likes</label>
                 <input type="number" className="form-control" value={form.likes} onChange={e => setForm({...form, likes: e.target.value})} placeholder="0" required />
               </div>
               <div className="form-group">
                 <label className="form-label">Saved</label>
                 <input type="number" className="form-control" value={form.saved} onChange={e => setForm({...form, saved: e.target.value})} placeholder="0" />
               </div>
               <div className="form-group">
                 <label className="form-label">Shares</label>
                 <input type="number" className="form-control" value={form.shares} onChange={e => setForm({...form, shares: e.target.value})} placeholder="0" />
               </div>
               <div className="form-group">
                 <label className="form-label">Comments</label>
                 <input type="number" className="form-control" value={form.comments} onChange={e => setForm({...form, comments: e.target.value})} placeholder="0" />
               </div>
            </div>

            <div className="form-group" style={{ marginBottom: 32 }}>
              <label className="form-label">Keterangan / Link Konten</label>
              <textarea className="form-control" rows={3} value={form.keterangan} onChange={e => setForm({...form, keterangan: e.target.value})} placeholder="Misal: Konten Promo Ramadhan..." />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", height: 54, borderRadius: 16, fontWeight: 700 }}>
              {loading ? "Menyimpan..." : "Simpan Data Statistik"}
            </button>
          </form>
        </div>

        {/* History Section */}
        <div className="card" style={{ padding: 32, borderRadius: 24 }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, fontSize: 20, fontWeight: 700 }}>
            <History className="text-muted" /> Riwayat Input
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Belum ada data tercatat</div>
            ) : history.map(m => (
              <div key={m.id} style={{ padding: 16, background: "var(--surface-container-low)", borderRadius: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 12 }}>
                    {m.platform}
                    {isAdmin && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button 
                          onClick={() => { setEditItem(m); setShowEditModal(true); }} 
                          className="btn btn-secondary btn-icon" 
                          style={{ width: 42, height: 42, borderRadius: 12, color: "var(--primary)" }}
                          title="Edit Data"
                        >
                          <Edit3 size={20} />
                        </button>
                        <button 
                          onClick={() => { setDeletingId(m.id); setShowConfirm(true); }} 
                          className="btn btn-secondary btn-icon" 
                          style={{ width: 42, height: 42, borderRadius: 12, color: "var(--danger)" }}
                          title="Hapus Data"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(m.tanggal).toLocaleDateString("id-ID")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: "var(--primary)" }}>{(m.followers || 0).toLocaleString()} <span style={{ fontSize: 10, fontWeight: 400 }}>Foll</span></div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{(m.views || 0).toLocaleString()} Views</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ maxWidth: 450, width: "100%", padding: 32, borderRadius: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontWeight: 800, margin: 0 }}>Edit Metrik</h2>
              <button onClick={() => setShowEditModal(false)} className="btn btn-ghost btn-icon"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdate}>
               <div className="form-group">
                 <label className="form-label">Followers</label>
                 <input type="number" className="form-control" value={editItem.followers} onChange={e => setEditItem({...editItem, followers: e.target.value})} required />
               </div>
               <div className="form-group">
                 <label className="form-label">Views</label>
                 <input type="number" className="form-control" value={editItem.views} onChange={e => setEditItem({...editItem, views: e.target.value})} required />
               </div>
               <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                 <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary" style={{ flex: 1, borderRadius: 12 }}>Batal</button>
                 <button type="submit" className="btn btn-primary" style={{ flex: 2, borderRadius: 12 }} disabled={loading}>Simpan</button>
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
        title="Hapus Data Metrik?"
        message="Data pertumbuhan harian ini akan dihapus permanen dari sistem."
      />
    </div>
  );
}
