"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Megaphone, Plus, TrendingUp, DollarSign, MousePointer2, Calendar, Layout, Trash2 } from "lucide-react";

export default function AdsPerformancePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role?.toUpperCase();
  const isAdmin = ["ADMIN", "CEO"].includes(role);

  const [performances, setPerformances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    spent: "",
    leads: "",
    platform: "META",
    date: new Date().toISOString().slice(0, 10),
  });

  function fetchData() {
    setLoading(true);
    fetch("/api/ads/performance")
      .then(r => r.json())
      .then(d => { setPerformances(Array.isArray(d) ? d : []); setLoading(false); });
  }

  useEffect(() => { fetchData(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/ads/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spent: parseFloat(form.spent),
        leads: parseInt(form.leads),
        platform: form.platform,
        date: form.date,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowModal(false);
      setForm({ spent: "", leads: "", platform: "META", date: new Date().toISOString().slice(0, 10) });
      fetchData();
    }
  }

  async function handleDeleteAll() {
    if (role !== "ADMIN") return;
    const conf = prompt("⚠️ PERINGATAN KERAS: Seluruh data PERFORMA IKLAN akan dihapus permanen.\n\nKetik 'HAPUS' (huruf besar) untuk mengonfirmasi:");
    if (conf === "HAPUS") {
      setLoading(true);
      const res = await fetch("/api/ads/performance?all=true", { method: "DELETE" });
      if (res.ok) fetchData();
      else alert("Gagal menghapus.");
    }
  }

  const totalSpent = performances.reduce((a, b) => a + b.spent, 0);
  const totalLeads = performances.reduce((a, b) => a + b.leads, 0);
  const avgCpl = totalLeads > 0 ? (totalSpent / totalLeads) : 0;
  const totalFee = performances.reduce((a, b) => a + b.fee, 0);

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <Megaphone size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Advertiser Performance</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Performa Iklan</h1>
          <p className="body-lg" style={{ margin: 0 }}>Pantau spent, Leads, CPL harian, dan akumulasi fee advertiser</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {role === "ADMIN" && (
            <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleDeleteAll}>
              <Trash2 size={16} /> Hapus Semua
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ borderRadius: 'var(--radius-full)' }}>
             <Plus size={18} /> Input Data Harian
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {/* KPI Grid */}
        <div className="kpi-grid" style={{ marginBottom: 48 }}>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ color: "var(--primary)" }}><DollarSign size={24} /></div>
            <div className="kpi-label">Total Spent</div>
            <div className="kpi-value">{formatCurrency(totalSpent)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ color: "var(--info)" }}><MousePointer2 size={24} /></div>
            <div className="kpi-label">Total Leads</div>
            <div className="kpi-value">{totalLeads} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>leads</span></div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ color: "var(--success)" }}><TrendingUp size={24} /></div>
            <div className="kpi-label">Avg CPL</div>
            <div className="kpi-value">{formatCurrency(avgCpl)}</div>
          </div>
          <div className="kpi-card" style={{ background: 'var(--primary-container)' }}>
            <div className="kpi-icon" style={{ color: "var(--on-primary-container)" }}><Layout size={24} /></div>
            <div className="kpi-label" style={{ color: "var(--on-primary-container)" }}>Estimasi Bonus Fee</div>
            <div className="kpi-value" style={{ color: "var(--on-primary-container)" }}>{formatCurrency(totalFee)}</div>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Platform</th>
                {isAdmin && <th>Advertiser</th>}
                <th>Spent</th>
                <th>Leads</th>
                <th>CPL</th>
                <th>Fee Advertiser</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : performances.length === 0 ? (
                <tr><td colSpan={isAdmin ? 6 : 5}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <h3>Belum ada data performa</h3>
                    <p>Input data iklan harian untuk melihat dashboard</p>
                  </div>
                </td></tr>
              ) : performances.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{formatDate(p.date)}</td>
                  <td><span className="badge badge-secondary" style={{ fontSize: 10 }}>{p.platform || "META"}</span></td>
                  {isAdmin && (
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.adv?.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.adv?.teamType?.replace('ADV_', '')}</div>
                    </td>
                  )}
                  <td>{formatCurrency(p.spent)}</td>
                  <td style={{ fontWeight: 700 }}>{p.leads}</td>
                  <td style={{ color: p.cpl > 15000 ? "var(--danger)" : "var(--success)", fontWeight: 700 }}>{formatCurrency(p.cpl)}</td>
                  <td style={{ background: 'rgba(16,185,129,0.05)', fontWeight: 800, color: "var(--success)" }}>
                    + {formatCurrency(p.fee)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Input Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-title">📉 Input Performa Iklan</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Tanggal Iklan</label>
                  <input type="date" className="form-control" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label required">Platform Iklan</label>
                  <select className="form-control" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} required>
                    <option value="META">Meta (FB/IG)</option>
                    <option value="GOOGLE">Google Ads</option>
                    <option value="TIKTOK">TikTok Ads</option>
                    <option value="INSTAGRAM">Instagram Direct</option>
                    <option value="YOUTUBE">YouTube</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Spent (Rp)</label>
                    <input type="number" className="form-control" placeholder="0" value={form.spent} onChange={e => setForm(f => ({ ...f, spent: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Jumlah Leads</label>
                    <input type="number" className="form-control" placeholder="0" value={form.leads} onChange={e => setForm(f => ({ ...f, leads: e.target.value }))} required />
                  </div>
                </div>
                {form.spent && form.leads && (
                   <div style={{ background: "var(--surface-container-low)", padding: 12, borderRadius: 10, marginTop: 10 }}>
                     <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Estimasi CPL:</div>
                     <div style={{ fontSize: 18, fontWeight: 800, color: (parseFloat(form.spent)/parseInt(form.leads)) > 15000 ? "var(--danger)" : "var(--success)" }}>
                        {formatCurrency(parseFloat(form.spent)/parseInt(form.leads))}
                     </div>
                   </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? "Menyimpan..." : "💾 Simpan Data"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
