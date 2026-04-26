"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { formatCurrency, SUPER_ROLES } from "@/lib/utils";

const TIPE_OPTIONS = ["REGULAR", "PRIVATE", "SEMI_PRIVATE", "ONLINE", "LAINNYA"];
const TIPE_BADGE: Record<string, string> = {
  REGULAR: "badge-primary", PRIVATE: "badge-warning",
  SEMI_PRIVATE: "badge-info", ONLINE: "badge-success", LAINNYA: "badge-muted",
};

import { 
  Package, 
  Plus, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  Type, 
  CheckCircle, 
  Edit3, 
  Trash2,
  Clock,
  Layout,
  Tag,
  Upload,
  FileSpreadsheet
} from "lucide-react";
import Papa from "papaparse";

const DURASI_OPTIONS = [
  { value: "2_MINGGU", label: "2 Minggu" },
  { value: "1_BULAN",  label: "1 Bulan" },
  { value: "3_BULAN",  label: "3 Bulan" },
  { value: "6_BULAN",  label: "6 Bulan" },
  { value: "LAINNYA",  label: "Lainnya / Kustom" },
];

const DURASI_LABEL: Record<string, string> = {
  "2_MINGGU": "2 Minggu", "1_BULAN": "1 Bulan",
  "3_BULAN": "3 Bulan",   "6_BULAN": "6 Bulan", "LAINNYA": "Lainnya",
};

const emptyForm = { nama: "", deskripsi: "", tipe: "REGULAR", harga: "", kategoriFee: "REG_1B", durasi: "", feeClosing: "0", feeClosingRO: "0", isProfitSharing: false };

export default function ProgramPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role?.toUpperCase();
  const isAdmin = SUPER_ROLES.includes(role);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [showNonaktif, setShowNonaktif] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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
    setForm({ 
      nama: p.nama, 
      deskripsi: p.deskripsi ?? "", 
      tipe: p.tipe, 
      harga: String(p.harga), 
      kategoriFee: p.kategoriFee || "REG_1B",
      durasi: p.durasi ?? "",
      feeClosing: String(p.feeClosing || 0),
      feeClosingRO: String(p.feeClosingRO || 0),
      isProfitSharing: !!p.isProfitSharing
    });
    setEditId(p.id);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { 
      ...form, 
      harga: parseFloat(form.harga) || 0,
      feeClosing: parseFloat(form.feeClosing) || 0,
      feeClosingRO: parseFloat(form.feeClosingRO) || 0
    };
    console.log("SUBMITTING_PAYLOAD:", payload);
    let res;
    try {
      if (editId) {
        res = await fetch("/api/program", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...payload }) });
      } else {
        res = await fetch("/api/program", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }

      if (!res.ok) {
        let msg = "Terjadi kesalahan internal";
        try {
          const errData = await res.json();
          msg = errData.error || msg;
        } catch (e) {}
        alert("⚠️ Gagal menyimpan: " + msg);
      } else {
        setShowModal(false);
        setEditId(null);
        fetchData();
      }
    } catch (err: any) {
      alert("⚠️ Koneksi terputus atau server tidak merespon: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: any) {
    if (!confirm(`Nonaktifkan produk "${p.nama}"?\n\nData historis transaksi tetap aman.`)) return;
    await fetch(`/api/program?id=${p.id}`, { method: "DELETE" });
    fetchData();
  }

  async function handleDeleteAll() {
    if (role !== "ADMIN") return;
    const conf = prompt("⚠️ PERINGATAN KERAS: Seluruh data PRODUK/PROGRAM akan dihapus PERMANEN.\n\nPenghapusan akan GAGAL jika program masih digunakan di data kelas/invoice.\n\nKetik 'HAPUS' (huruf besar) untuk mengonfirmasi:");
    if (conf === "HAPUS") {
      setLoading(true);
      const res = await fetch("/api/program?deleteAll=true", { method: "DELETE" });
      if (res.ok) fetchData();
      else {
        const err = await res.json();
        alert("Gagal menghapus: " + (err.error ?? "Terjadi kesalahan"));
      }
    }
  }

  async function handleReaktifkan(p: any) {
    await fetch("/api/program", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, aktif: true }) });
    fetchData();
  }

  const aktif = data.filter(d => d.aktif);
  const nonaktif = data.filter(d => !d.aktif);

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <Package size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Product Portfolio</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Katalog Program</h1>
          <p className="body-lg" style={{ margin: 0 }}>Kelola standar harga, durasi, dan klasifikasi produk layanan</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowNonaktif(v => !v)}
            style={{ opacity: showNonaktif ? 1 : 0.6, borderRadius: 'var(--radius-full)', padding: '8px 20px' }}
          >
            {showNonaktif ? <EyeOff size={16} /> : <Eye size={16} />}
            {showNonaktif ? " Sembunyikan Nonaktif" : " Tampilkan Nonaktif"}
          </button>
          {role === "ADMIN" && (
            <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleDeleteAll}>
              <Trash2 size={16} /> Hapus Semua
            </button>
          )}
          {isAdmin && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowImportModal(true)}
              style={{ borderRadius: 'var(--radius-full)', padding: '8px 20px' }}
            >
              <Upload size={16} /> Import CSV
            </button>
          )}
          {isAdmin && (
            <button className="btn btn-primary" onClick={openAdd} style={{ borderRadius: 'var(--radius-full)' }}>
              <Plus size={18} /> Tambah Produk
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {/* KPI Grid */}
        <div className="kpi-grid" style={{ marginBottom: 48 }}>
          <div className="kpi-card" style={{ "--kpi-color": "var(--success)", "--kpi-bg": "var(--success-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--success)" }}><CheckCircle size={24} /></div>
            <div className="kpi-label">Total Aktif</div>
            <div className="kpi-value">{aktif.length} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>produk</span></div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--primary)", "--kpi-bg": "var(--primary-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--primary)" }}><Layout size={24} /></div>
            <div className="kpi-label">Variasi Program</div>
            <div className="kpi-value">{TIPE_OPTIONS.filter(t => aktif.some(p => p.tipe === t)).length} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>tipe</span></div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--warning)", "--kpi-bg": "var(--warning-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--warning)" }}><Tag size={24} /></div>
            <div className="kpi-label">Private Program</div>
            <div className="kpi-value">{aktif.filter(p => p.tipe === "PRIVATE").length}</div>
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
                <th>Fee New</th>
                <th>Fee RO</th>
                <th>Durasi</th>
                <th>Deskripsi</th>
                <th>Status</th>
                {isAdmin && <th style={{ width: 110 }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <h3>Belum ada produk</h3>
                    <p>Klik "+ Tambah Produk" untuk menambahkan program kursus</p>
                  </div>
                </td></tr>
              ) : data.map(p => (
                <tr key={p.id} style={{ opacity: p.aktif ? 1 : 0.5 }}>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.nama}
                      {p.isProfitSharing && (
                        <span className="badge badge-warning" style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4 }}>SHARING</span>
                      )}
                    </div>
                  </td>
                  <td><span className={`badge ${TIPE_BADGE[p.tipe] ?? "badge-muted"}`}>{p.tipe}</span></td>
                  <td style={{ fontWeight: 700, color: "var(--success)" }}>{formatCurrency(p.harga)}</td>
                  <td style={{ color: "var(--primary)", fontWeight: 600 }}>{formatCurrency(p.feeClosing || 0)}</td>
                  <td style={{ color: "var(--warning)", fontWeight: 600 }}>{formatCurrency(p.feeClosingRO || 0)}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{DURASI_LABEL[p.durasi] ?? p.durasi ?? "—"}</td>
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
        <div className="modal-overlay">
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
                    <label className="form-label">Durasi Program</label>
                    <select className="form-control" value={form.durasi} onChange={e => setForm(f => ({ ...f, durasi: e.target.value }))}>
                      <option value="">Pilih Durasi</option>
                      {DURASI_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label required">Klasifikasi Fee CS</label>
                  <select className="form-control" value={form.kategoriFee} onChange={e => setForm(f => ({ ...f, kategoriFee: e.target.value }))}>
                    <option value="49K">Produk 49K (Normal)</option>
                    <option value="49K_DISKON">Produk 49K (Diskon)</option>
                    <option value="EFP">Produk EFP</option>
                    <option value="REG_1B">Reguler 1 Bulan</option>
                    <option value="REG_ADV">Reguler Advance</option>
                    <option value="NATIVE">Native Class</option>
                    <option value="TOEFL">Reguler TOEFL</option>
                    <option value="PRIVATE_550">Private 550K</option>
                    <option value="PRIVATE_850">Private 850K</option>
                    <option value="PRIVATE_1B">Private 1B</option>
                    <option value="PRIVATE_VIP">Private VIP</option>
                    <option value="PRIVATE_FAMILY">Private FAMILY</option>
                  </select>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Fee Closing Baru (Rp)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="0" 
                      value={form.feeClosing} 
                      onChange={e => setForm(f => ({ ...f, feeClosing: e.target.value }))} 
                      min={0}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fee Closing RO (Rp)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="0" 
                      value={form.feeClosingRO} 
                      onChange={e => setForm(f => ({ ...f, feeClosingRO: e.target.value }))} 
                      min={0}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ 
                  background: 'var(--surface-container-low)', 
                  padding: '12px 16px', 
                  borderRadius: 12, 
                  marginTop: 16,
                  border: form.isProfitSharing ? '1px solid var(--primary)' : '1px solid var(--ghost-border)'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={form.isProfitSharing} 
                      onChange={e => setForm(f => ({ ...f, isProfitSharing: e.target.checked }))}
                      style={{ width: 20, height: 20 }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: form.isProfitSharing ? 'var(--primary)' : 'inherit' }}>Aktifkan Profit Sharing 🚀</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Centang jika produk ini menggunakan sistem bagi hasil 50/50 untuk tim.</div>
                    </div>
                  </label>
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
      {/* Modal Import CSV */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Upload size={20} style={{ color: 'var(--primary)' }} />
                <span>Import Katalog Program via CSV</span>
              </div>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Gunakan format CSV berikut untuk mengimpor daftar program masal ke dalam katalog.
                </p>
                <div style={{ background: 'var(--surface-container-low)', padding: 12, borderRadius: 8, fontSize: 10, fontFamily: 'monospace', overflowX: 'auto', border: '1px solid var(--ghost-border)', whiteSpace: 'nowrap' }}>
                  nama,deskripsi,tipe,harga,kategoriFee,durasi,feeClosing,feeClosingRO,isProfitSharing
                </div>
                <button 
                  className="btn btn-sm" 
                  style={{ marginTop: 8, fontSize: 11, color: 'var(--primary)', textDecoration: 'underline', padding: 0, background: 'none' }}
                  onClick={() => {
                    const csvContent = "nama,deskripsi,tipe,harga,kategoriFee,durasi,feeClosing,feeClosingRO,isProfitSharing\n" +
                                     "Speaking Regular,Program speaking dasar,REGULAR,250000,REG_1B,1_BULAN,25000,15000,false\n" +
                                     "Private VIP 10 Sesi,Program privat intensif,PRIVATE,1500000,PRIVATE_VIP,LAINNYA,100000,50000,true";
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", "template_program.csv");
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  📥 Download Template CSV Program
                </button>
              </div>
              
              <div style={{ border: '2px dashed var(--ghost-border)', borderRadius: 12, padding: 32, textAlign: 'center', background: 'var(--surface-container-lowest)' }}>
                <FileSpreadsheet size={32} style={{ color: 'var(--primary)', marginBottom: 12 }} />
                <div style={{ marginBottom: 16 }}>
                  <label className="btn btn-primary" style={{ cursor: 'pointer', borderRadius: 'var(--radius-full)', padding: '10px 24px' }}>
                    <Upload size={16} /> Pilih File CSV
                    <input type="file" accept=".csv" style={{ display: 'none' }} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        const text = event.target?.result as string;
                        Papa.parse(text, {
                          header: true,
                          skipEmptyLines: true,
                          complete: async (results) => {
                            const jsonData = results.data;
                            if (jsonData.length === 0) {
                              alert("File CSV kosong atau tidak valid.");
                              return;
                            }
                            
                            if (confirm(`Impor ${jsonData.length} data program kursus?`)) {
                              setLoading(true);
                              try {
                                const res = await fetch("/api/program/import", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(jsonData)
                                });
                                if (res.ok) {
                                  alert("Berhasil mengimpor katalog program!");
                                  setShowImportModal(false);
                                  fetchData();
                                } else {
                                  const err = await res.json();
                                  alert("Gagal impor: " + (err.error || "Cek format file"));
                                }
                              } catch (err) {
                                alert("Terjadi kesalahan saat mengunggah.");
                              } finally {
                                setLoading(false);
                              }
                            }
                          }
                        });
                      };
                      reader.readAsText(file);
                    }} />
                  </label>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Maksimal 2MB .csv | Pastikan tipe & kategori sesuai pilihan sistem</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
