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
  UserCheck,
  Trash2,
  Upload,
  FileSpreadsheet
} from "lucide-react";
import { formatCurrency, hasPermission } from "@/lib/utils";

const rowSelectedStyle = {
  background: 'rgba(99, 102, 241, 0.08)',
  transition: 'all 0.2s'
};

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
    nik: "", 
    namaPanggilan: "",
    posisi: "", 
    tempatLahir: "",
    tanggalLahir: "",
    jenisKelamin: "",
    noHp: "",
    alamat: "",
    statusPernikahan: "",
    tanggalMasuk: "",
    tanggalResign: "",
    kontakDarurat: "",
    bankName: "", 
    rekeningNomor: "", 
    rekeningNama: "",
    gajiPokok: 0, 
    tunjangan: 0, 
    feeClosing: 0, 
    feeLead: 0, 
    bonusTarget: 0, 
    bonusNominal: 0, 
    keterangan: ""
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

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

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(u => u.id));
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Hapus data profil karyawan untuk ${selectedIds.length} orang terpilih?\n\nAkun user tidak akan terhapus, hanya profil finansial karyawannya saja.`)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/karyawan", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchData();
      } else {
        alert("Gagal menghapus data");
      }
    } catch (e) {
      alert("Error deleting data");
    } finally {
      setLoading(false);
    }
  }

  const roles = Array.from(new Set(data.map(u => u.role?.name))).filter(Boolean);

  function openEdit(user: any) {
    setSelectedKaryawan(user);
    const p = user.karyawanProfile || {};
    setForm({
      nik: p.nik || "",
      namaPanggilan: user.namaPanggilan || "",
      posisi: p.posisi || "",
      tempatLahir: p.tempatLahir || "",
      tanggalLahir: p.tanggalLahir ? p.tanggalLahir.split("T")[0] : "",
      jenisKelamin: p.jenisKelamin || "",
      noHp: user.noHp || "",
      alamat: p.alamat || "",
      statusPernikahan: p.statusPernikahan || "",
      tanggalMasuk: p.tanggalMasuk ? p.tanggalMasuk.split("T")[0] : "",
      tanggalResign: p.tanggalResign ? p.tanggalResign.split("T")[0] : "",
      kontakDarurat: p.kontakDarurat || "",
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <Users size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Human Resources & Payroll</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Data Karyawan</h1>
          <p className="body-lg" style={{ margin: 0 }}>Manajemen profil finansial, struktur gaji, dan bonus tim</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {selectedIds.length > 0 && (
            <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleBulkDelete}>
              <Trash2 size={16} /> Hapus ({selectedIds.length})
            </button>
          )}
          <button className="btn btn-secondary" style={{ borderRadius: 'var(--radius-full)' }} onClick={() => setShowImportModal(true)}>
            <FileSpreadsheet size={16} /> Import CSV
          </button>
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
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
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
                <tr key={u.id} style={selectedIds.includes(u.id) ? rowSelectedStyle : {}}>
                  <td style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleSelect(u.id)} style={{ cursor: 'pointer' }} />
                  </td>
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
                <span>Payroll Profile: {selectedKaryawan?.name}</span>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  
                  {/* Seksi Informasi Pribadi */}
                  <div className="card" style={{ background: 'var(--surface-container-lowest)', padding: 16, border: '1px solid var(--ghost-border)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>
                      <TrendingUp size={16} /> DATA PRIBADI KARYAWAN
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Nama Panggilan</label>
                        <input type="text" className="form-control" placeholder="Cth: Rara" value={form.namaPanggilan} onChange={e => setForm(f => ({ ...f, namaPanggilan: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Jenis Kelamin</label>
                        <select className="form-control" value={form.jenisKelamin} onChange={e => setForm(f => ({ ...f, jenisKelamin: e.target.value }))}>
                          <option value="">-- Pilih --</option>
                          <option value="LAKI-LAKI">Laki-laki</option>
                          <option value="PEREMPUAN">Perempuan</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Tempat Lahir</label>
                        <input type="text" className="form-control" placeholder="Kota kelahiran" value={form.tempatLahir} onChange={e => setForm(f => ({ ...f, tempatLahir: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Tanggal Lahir</label>
                        <input type="date" className="form-control" value={form.tanggalLahir} onChange={e => setForm(f => ({ ...f, tanggalLahir: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status Pernikahan</label>
                      <select className="form-control" value={form.statusPernikahan} onChange={e => setForm(f => ({ ...f, statusPernikahan: e.target.value }))}>
                        <option value="">-- Pilih Status --</option>
                        <option value="LAJANG">Lajang</option>
                        <option value="MENIKAH">Menikah</option>
                        <option value="CERAI">Cerai</option>
                      </select>
                    </div>
                  </div>

                  {/* Seksi Kontak & Alamat */}
                  <div className="card" style={{ background: 'var(--surface-container-lowest)', padding: 16, border: '1px solid var(--ghost-border)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>
                      <Users size={16} /> KONTAK & ALAMAT
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Nomor HP / WhatsApp</label>
                        <input type="tel" className="form-control" placeholder="0812xxxx" value={form.noHp} onChange={e => setForm(f => ({ ...f, noHp: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Kontak Darurat (Nama & No)</label>
                        <input type="text" className="form-control" placeholder="Cth: Ibu Siti (0813xxxx)" value={form.kontakDarurat} onChange={e => setForm(f => ({ ...f, kontakDarurat: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Alamat Lengkap (Domisili)</label>
                      <textarea className="form-control" rows={2} placeholder="Jl. Anggrek No. 123..." value={form.alamat} onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))}></textarea>
                    </div>
                  </div>

                  {/* Seksi Kepegawaian */}
                  <div className="card" style={{ background: 'var(--surface-container-lowest)', padding: 16, border: '1px solid var(--ghost-border)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>
                      <Briefcase size={16} /> DATA KEPEGAWAIAN
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div className="form-group">
                        <label className="form-label">NIK (Sesuai KTP)</label>
                        <input type="text" className="form-control" placeholder="16 Digit NIK" value={form.nik} onChange={e => setForm(f => ({ ...f, nik: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Posisi / Jabatan</label>
                        <input type="text" className="form-control" placeholder="Contoh: Manager, Senior CS..." value={form.posisi} onChange={e => setForm(f => ({ ...f, posisi: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Tanggal Masuk</label>
                        <input type="date" className="form-control" value={form.tanggalMasuk} onChange={e => setForm(f => ({ ...f, tanggalMasuk: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Tanggal Resign (Jika Ada)</label>
                        <input type="date" className="form-control" value={form.tanggalResign} onChange={e => setForm(f => ({ ...f, tanggalResign: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  {/* Seksi Perbankan */}
                  <div className="card" style={{ background: 'var(--surface-container-lowest)', padding: 16, border: '1px solid var(--ghost-border)', borderRadius: 'var(--radius-lg)' }}>
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
                    <div className="form-group">
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
                  {saving ? "Menyimpan..." : "💾 Simpan Profil Payroll"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import CSV */}
      {showImportModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowImportModal(false); }}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Upload size={20} style={{ color: 'var(--primary)' }} />
                <span>Import Data Karyawan via CSV</span>
              </div>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Gunakan format CSV berikut untuk mengimpor data masal. Baris pertama wajib judul kolom.
                </p>
                <div style={{ background: 'var(--surface-container-low)', padding: 12, borderRadius: 8, fontSize: 11, fontFamily: 'monospace', overflowX: 'auto', border: '1px solid var(--ghost-border)' }}>
                  email,nama,role,nik,posisi,gajipokok,tunjangan,bank,rekeningnomor,rekeningnama
                </div>
                <button 
                  className="btn btn-sm" 
                  style={{ marginTop: 8, fontSize: 11, color: 'var(--primary)', textDecoration: 'underline', padding: 0, background: 'none' }}
                  onClick={() => {
                    const csvContent = "email,nama,role,nik,posisi,gajipokok,tunjangan,bank,rekeningnomor,rekeningnama\n" +
                                     "budi@example.com,Budi Santoso,CS,SP-00001,Customer Service,3500000,500000,BCA,123456789,Budi Santoso\n" +
                                     "siti@example.com,Siti Aminah,Finance,SP-00002,Finance Staff,4000000,750000,Mandiri,987654321,Siti Aminah";
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", "template_karyawan.csv");
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  📥 Download Template CSV
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
                        const lines = text.split("\n").filter(l => l.trim());
                        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
                        
                        const jsonData = lines.slice(1).map(line => {
                          const values = line.split(",").map(v => v.trim());
                          const obj: any = {};
                          headers.forEach((h, i) => {
                            obj[h] = values[i];
                          });
                          return obj;
                        });

                        if (confirm(`Impor ${jsonData.length} data karyawan?`)) {
                          setLoading(true);
                          try {
                            const res = await fetch("/api/karyawan/import", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(jsonData)
                            });
                            if (res.ok) {
                              alert("Berhasil mengimpor data!");
                              setShowImportModal(false);
                              fetchData();
                            } else {
                              const err = await res.json();
                              alert("Gagal impor: " + err.error);
                            }
                          } catch (err) {
                            alert("Terjadi kesalahan saat mengunggah.");
                          } finally {
                            setLoading(false);
                          }
                        }
                      };
                      reader.readAsText(file);
                    }} />
                  </label>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Maksimal 2MB .csv | Format UTF-8</p>
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
