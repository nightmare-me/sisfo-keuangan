"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Users, 
  Search, 
  Filter, 
  RefreshCw, 
  Briefcase, 
  Banknote, 
  Wallet, 
  CreditCard,
  Target,
  Edit2,
  ChevronRight,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { formatCurrency, hasPermission } from "@/lib/utils";

export default function KaryawanPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [selectedKaryawan, setSelectedKaryawan] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    nik: "", posisi: "", bankName: "", rekeningNomor: "", rekeningNama: "",
    gajiPokok: 0, tunjangan: 0, feeClosing: 0, feeLead: 0, bonusTarget: 0, bonusNominal: 0, keterangan: ""
  });

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/karyawan");
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const filtered = data.filter(u => {
    if (filterRole && u.role?.name !== filterRole) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const roles = Array.from(new Set(data.map(u => u.role?.name))).filter(Boolean);

  function openEdit(user: any) {
    setSelectedKaryawan(user);
    const p = user.karyawanProfile || {};
    setForm({
      nik: p.nik || "",
      posisi: p.posisi || "",
      bankName: p.bankName || "",
      rekeningNomor: p.rekeningNomor || "",
      rekeningNama: p.rekeningNama || "",
      gajiPokok: p.gajiPokok || 0,
      tunjangan: p.tunjangan || 0,
      feeClosing: p.feeClosing || 0,
      feeLead: p.feeLead || 0,
      bonusTarget: p.bonusTarget || 0,
      bonusNominal: p.bonusNominal || 0,
      keterangan: p.keterangan || ""
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/karyawan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedKaryawan.id, ...form })
      });
      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        alert("Gagal menyimpan data karyawan");
      }
    } catch (e) {
      alert("Error saving data");
    } finally {
      setSaving(false);
    }
  }

  // Summary KPIs
  const totalGajiPokok = data.reduce((a, b) => a + (b.karyawanProfile?.gajiPokok || 0), 0);
  const avgGaji = data.length > 0 ? totalGajiPokok / data.length : 0;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <Users size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Human Resources & Payroll</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Data Karyawan</h1>
          <p className="body-lg" style={{ margin: 0 }}>Manajemen profil finansial, struktur gaji, dan bonus tim</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {/* KPI Grid */}
        <div className="kpi-grid" style={{ marginBottom: 48 }}>
          <div className="kpi-card" style={{ "--kpi-color": "var(--primary)", "--kpi-bg": "var(--primary-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--primary)" }}><UserCheck size={24} /></div>
            <div className="kpi-label">Total Karyawan</div>
            <div className="kpi-value">{data.length} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>Staff</span></div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--success)", "--kpi-bg": "var(--success-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--success)" }}><Banknote size={24} /></div>
            <div className="kpi-label">Estimasi Gaji Pokok</div>
            <div className="kpi-value">{formatCurrency(totalGajiPokok)}</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--info)", "--kpi-bg": "var(--info-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--info)" }}><TrendingUp size={24} /></div>
            <div className="kpi-label">Rata-rata Gaji</div>
            <div className="kpi-value">{formatCurrency(avgGaji)}</div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: 32, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="form-control" placeholder="Cari nama karyawan..." style={{ paddingLeft: 44 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Filter size={16} style={{ color: "var(--primary)" }} />
            <select className="form-control" value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ width: 160 }}>
              <option value="">Semua Bagian</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button className="btn btn-secondary btn-icon" onClick={() => { setSearch(""); setFilterRole(""); fetchData(); }}><RefreshCw size={16} /></button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Karyawan</th>
                <th>NIK</th>
                <th>Posisi</th>
                <th className="text-right">Gaji Pokok</th>
                <th className="text-right">Tunjangan</th>
                <th>Bank & Rekening</th>
                <th style={{ width: 80 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 64 }}>Data kosong</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.email}</div>
                  </td>
                  <td><code style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{u.karyawanProfile?.nik || "-"}</code></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.karyawanProfile?.posisi || "-"}</div>
                    <div style={{ fontSize: 10, color: "var(--secondary)", textTransform: 'uppercase' }}>{u.role?.name}</div>
                  </td>
                  <td className="text-right" style={{ fontWeight: 700 }}>{formatCurrency(u.karyawanProfile?.gajiPokok || 0)}</td>
                  <td className="text-right">{formatCurrency(u.karyawanProfile?.tunjangan || 0)}</td>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{u.karyawanProfile?.bankName || "-"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.karyawanProfile?.rekeningNomor || "-"}</div>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)} style={{ borderRadius: 8 }}>
                      <Edit2 size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Data Karyawan */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CreditCard size={20} style={{ color: 'var(--success)' }} />
                <span>Manajemen Data Karyawan: {selectedKaryawan?.name}</span>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  
                  {/* Seksi Identitas & Posisi */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">NIK (Nomor Induk Karyawan)</label>
                      <input type="text" className="form-control" value={form.nik} placeholder="Otomatis jika kosong" onChange={e => setForm(f => ({ ...f, nik: e.target.value }))} style={{ fontWeight: 700, color: 'var(--primary)' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Posisi / Jabatan</label>
                      <div style={{ position: 'relative' }}>
                        <Briefcase size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="text" className="form-control" style={{ paddingLeft: 38 }} placeholder="Contoh: Manager, Senior CS..." value={form.posisi} onChange={e => setForm(f => ({ ...f, posisi: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  {/* Seksi Perbankan */}
                  <div className="card glass" style={{ padding: 20, borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--on-surface)', fontWeight: 700, fontSize: 13 }}>
                      <Wallet size={16} /> DATA REKENING BANK
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 12, marginBottom: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Nama Bank</label>
                        <input type="text" className="form-control" placeholder="BCA / Mandiri..." value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Nomor Rekening</label>
                        <input type="text" className="form-control" placeholder="XXXX-XXXX-XXXX" value={form.rekeningNomor} onChange={e => setForm(f => ({ ...f, rekeningNomor: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Nama Pemilik Rekening</label>
                      <input type="text" className="form-control" placeholder="Harus sesuai buku tabungan" value={form.rekeningNama} onChange={e => setForm(f => ({ ...f, rekeningNama: e.target.value }))} />
                    </div>
                  </div>

                  {/* Seksi Financial Params */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--on-surface)', fontWeight: 700, fontSize: 13 }}>
                      <Banknote size={16} /> KOMPONEN GAJI & FEE
                    </div>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Gaji Pokok (Bulanan)</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Rp</span>
                          <input type="number" className="form-control" style={{ paddingLeft: 44 }} value={form.gajiPokok} onChange={e => setForm(f => ({ ...f, gajiPokok: parseFloat(e.target.value) || 0 }))} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Tunjangan Tetap</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Rp</span>
                          <input type="number" className="form-control" style={{ paddingLeft: 44 }} value={form.tunjangan} onChange={e => setForm(f => ({ ...f, tunjangan: parseFloat(e.target.value) || 0 }))} />
                        </div>
                      </div>
                    </div>

                    <div className="form-grid-2" style={{ marginTop: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Fee per Closing (CS)</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Rp</span>
                          <input type="number" className="form-control" style={{ paddingLeft: 44 }} value={form.feeClosing} onChange={e => setForm(f => ({ ...f, feeClosing: parseFloat(e.target.value) || 0 }))} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Fee per Lead (Adv)</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Rp</span>
                          <input type="number" className="form-control" style={{ paddingLeft: 44 }} value={form.feeLead} onChange={e => setForm(f => ({ ...f, feeLead: parseFloat(e.target.value) || 0 }))} />
                        </div>
                      </div>
                    </div>

                    <div className="card" style={{ marginTop: 16, background: 'rgba(99,102,241,0.04)', border: '1px dashed rgba(99,102,241,0.2)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                           <label className="form-label"><Target size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Target Bonus (Unit)</label>
                           <input type="number" className="form-control" value={form.bonusTarget} onChange={e => setForm(f => ({ ...f, bonusTarget: parseInt(e.target.value) || 0 }))} />
                        </div>
                        <div className="form-group">
                           <label className="form-label">Nominal Bonus Target</label>
                           <input type="number" className="form-control" value={form.bonusNominal} onChange={e => setForm(f => ({ ...f, bonusNominal: parseFloat(e.target.value) || 0 }))} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                     <label className="form-label">Catatan Tambahan</label>
                     <textarea className="form-control" rows={2} value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}></textarea>
                  </div>

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--success)', border: 'none' }} disabled={saving}>
                  {saving ? "Menyimpan..." : "💾 Simpan Perubahan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
