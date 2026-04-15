"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { formatCurrency } from "@/lib/utils";

const TIPE_OPTIONS = ["REGULAR", "PRIVATE", "SEMI_PRIVATE", "ONLINE", "LAINNYA"];
const TIPE_BADGE: Record<string, string> = {
  REGULAR: "badge-primary", PRIVATE: "badge-warning",
  SEMI_PRIVATE: "badge-info", ONLINE: "badge-success", LAINNYA: "badge-muted",
};

const emptyForm = { nama: "", deskripsi: "", tipe: "REGULAR", harga: "", durasiBuilan: "3" };

export default function ProgramPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [showNonaktif, setShowNonaktif] = useState(false);

  function fetchData() {
    setLoading(true);
    fetch(`/api/program${showNonaktif ? "?all=true" : ""}`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); });
  }

  useEffect(() => { fetchData(); }, [showNonaktif]);

  function openAdd() {
    setEditId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  }

  function openEdit(p: any) {
    setEditId(p.id);
    setForm({ nama: p.nama, deskripsi: p.deskripsi ?? "", tipe: p.tipe, harga: String(p.harga), durasiBuilan: String(p.durasiBuilan ?? 3) });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, harga: parseFloat(form.harga), durasiBuilan: parseInt(form.durasiBuilan) };
    if (editId) {
      await fetch("/api/program", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...payload }) });
    } else {
      await fetch("/api/program", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setSaving(false);
    setShowModal(false);
    setEditId(null);
    fetchData();
  }

  async function handleDelete(p: any) {
    if (!confirm(`Nonaktifkan produk "${p.nama}"?\n\nData historis transaksi tetap aman.`)) return;
    await fetch(`/api/program?id=${p.id}`, { method: "DELETE" });
    fetchData();
  }

  async function handleReaktifkan(p: any) {
    await fetch("/api/program", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, aktif: true }) });
    fetchData();
  }

  const aktif = data.filter(d => d.aktif);
  const nonaktif = data.filter(d => !d.aktif);

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">Produk / Program</div>
          <div className="topbar-subtitle">Kelola program kursus dan harga</div>
        </div>
        <div className="topbar-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowNonaktif(v => !v)}
            style={{ opacity: showNonaktif ? 1 : 0.6 }}
          >
            {showNonaktif ? "👁 Sembunyikan Nonaktif" : "👁 Tampilkan Nonaktif"}
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={openAdd}>+ Tambah Produk</button>
          )}
        </div>
      </div>

      <div className="page-container">
        {/* Summary cards */}
        <div className="summary-grid">
          {TIPE_OPTIONS.map(t => {
            const cnt = aktif.filter(p => p.tipe === t).length;
            if (cnt === 0) return null;
            return (
              <div key={t} className="summary-card">
                <label>{t}</label>
                <div className="value">{cnt} produk</div>
              </div>
            );
          })}
          <div className="summary-card">
            <label>Total Aktif</label>
            <div className="value green">{aktif.length}</div>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nama Produk</th>
                <th>Tipe</th>
                <th>Harga Normal</th>
                <th>Durasi</th>
                <th>Deskripsi</th>
                <th>Status</th>
                {isAdmin && <th style={{ width: 110 }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <h3>Belum ada produk</h3>
                    <p>Klik "+ Tambah Produk" untuk menambahkan program kursus</p>
                  </div>
                </td></tr>
              ) : data.map(p => (
                <tr key={p.id} style={{ opacity: p.aktif ? 1 : 0.5 }}>
                  <td style={{ fontWeight: 600 }}>{p.nama}</td>
                  <td><span className={`badge ${TIPE_BADGE[p.tipe] ?? "badge-muted"}`}>{p.tipe}</span></td>
                  <td style={{ fontWeight: 700, color: "var(--success)" }}>{formatCurrency(p.harga)}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{p.durasiBuilan} bulan</td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.deskripsi || "—"}</td>
                  <td>
                    <span className={`badge ${p.aktif ? "badge-success" : "badge-danger"}`}>
                      {p.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => openEdit(p)}
                          style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                          title="Edit"
                        >✏️</button>
                        {p.aktif ? (
                          <button
                            onClick={() => handleDelete(p)}
                            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                            title="Nonaktifkan"
                          >🚫</button>
                        ) : (
                          <button
                            onClick={() => handleReaktifkan(p)}
                            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                            title="Aktifkan kembali"
                          >✅</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setEditId(null); } }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">{editId ? "✏️ Edit Produk" : "📦 Tambah Produk Baru"}</div>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditId(null); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Nama Produk</label>
                    <input type="text" className="form-control" placeholder="Contoh: Speaking Regular" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Tipe Program</label>
                    <select className="form-control" value={form.tipe} onChange={e => setForm(f => ({ ...f, tipe: e.target.value }))}>
                      {TIPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Harga Normal (Rp)</label>
                    <input type="number" className="form-control" placeholder="0" value={form.harga} onChange={e => setForm(f => ({ ...f, harga: e.target.value }))} required min={0} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Durasi (bulan)</label>
                    <input type="number" className="form-control" placeholder="3" value={form.durasiBuilan} onChange={e => setForm(f => ({ ...f, durasiBuilan: e.target.value }))} min={1} max={24} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <input type="text" className="form-control" placeholder="Keterangan singkat tentang program ini..." value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} />
                </div>
                {form.harga && (
                  <div style={{ background: "var(--success-bg)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Harga yang akan ditampilkan:</span>
                    <span style={{ color: "var(--success)", fontWeight: 800, fontSize: 18 }}>{formatCurrency(parseFloat(form.harga) || 0)}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditId(null); }}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Menyimpan..." : editId ? "💾 Simpan Perubahan" : "📦 Tambah Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
