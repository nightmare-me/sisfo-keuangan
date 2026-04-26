"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Users, 
  Plus, 
  Mail, 
  UserCircle, 
  Phone, 
  Briefcase, 
  CreditCard, 
  Search,
  CheckCircle,
  Clock,
  Trash2,
  Lock,
  Upload
} from "lucide-react";
import Papa from "papaparse";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  nik: "",
  posisi: "Pengajar",
  bankName: "",
  rekeningNomor: "",
  rekeningNama: ""
};

export default function PengajarPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search
      });
      const res = await fetch(`/api/akademik/pengajar?${p}`);
      const d = await res.json();
      setData(d.data ?? []);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setSaving(true);
        try {
          const res = await fetch("/api/akademik/pengajar/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(results.data)
          });
          const d = await res.json();
          alert(d.message || "Import selesai");
          fetchData();
        } catch (err: any) {
          alert("Gagal impor: " + err.message);
        } finally {
          setSaving(false);
          if (e.target) e.target.value = "";
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/akademik/pengajar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ ...emptyForm });
        fetchData();
      } else {
        const err = await res.json();
        alert("⚠️ Gagal: " + err.error);
      }
    } catch (e: any) {
      alert("⚠️ Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, limit]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <Briefcase size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Academic Resources</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Data Pengajar</h1>
          <p className="body-lg" style={{ margin: 0 }}>Manajemen database tutor, keahlian, dan informasi administrasi akademik</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input 
            type="file" 
            id="csv-import" 
            style={{ display: 'none' }} 
            accept=".csv" 
            onChange={handleImport}
          />
          <button 
            className="btn btn-secondary" 
            onClick={() => document.getElementById('csv-import')?.click()}
            style={{ borderRadius: 'var(--radius-full)' }}
            disabled={saving}
          >
            <Upload size={18} /> {saving ? "Processing..." : "Import CSV"}
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ borderRadius: 'var(--radius-full)' }}>
            <Plus size={18} /> Tambah Pengajar
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {/* KPI Grid */}
        <div className="kpi-grid" style={{ marginBottom: 32 }}>
          <div className="kpi-card" style={{ "--kpi-color": "var(--primary)", "--kpi-bg": "var(--primary-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--primary)" }}><Users size={24} /></div>
            <div className="kpi-label">Total Pengajar</div>
            <div className="kpi-value">{total} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>tutor</span></div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--success)", "--kpi-bg": "var(--success-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--success)" }}><CheckCircle size={24} /></div>
            <div className="kpi-label">Status Aktif</div>
            <div className="kpi-value">{data.filter(t => t.aktif).length} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>tutor</span></div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--warning)", "--kpi-bg": "var(--warning-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--warning)" }}><Clock size={24} /></div>
            <div className="kpi-label">Baru Ditambahkan</div>
            <div className="kpi-value">{data.filter(t => new Date(t.createdAt).getMonth() === new Date().getMonth()).length}</div>
          </div>
        </div>

        {/* Search & Table */}
        <div className="card glass" style={{ marginBottom: 24, padding: '12px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Search size={20} className="text-muted" />
            <input 
              type="text" 
              placeholder="Cari nama atau email pengajar..." 
              style={{ border: 'none', background: 'none', width: '100%', outline: 'none', fontSize: 15 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nama & Email</th>
                <th>NIP</th>
                <th>NIK (KTP)</th>
                <th>Posisi / Spesialisasi</th>
                <th>Informasi Bank</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Memproses data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🎓</div>
                    <h3>Tidak ada pengajar ditemukan</h3>
                    <p>Silakan gunakan kata kunci lain atau tambah pengajar baru</p>
                  </div>
                </td></tr>
              ) : data.map(t => (
                <tr key={t.id} className="table-row-hover">
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-container)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><code style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-bg)', padding: '2px 6px', borderRadius: 4 }}>{t.karyawanProfile?.nip || "-"}</code></td>
                  <td style={{ fontSize: 13, fontFamily: 'monospace' }}>{t.karyawanProfile?.nik || "—"}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.karyawanProfile?.posisi || "Pengajar"}</div>
                  </td>
                  <td>
                    {t.karyawanProfile?.bankName ? (
                      <div style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 700 }}>{t.karyawanProfile.bankName}</div>
                        <div style={{ opacity: 0.7 }}>{t.karyawanProfile.rekeningNomor}</div>
                        <div style={{ fontSize: 11, fontStyle: 'italic' }}>a/n {t.karyawanProfile.rekeningNama}</div>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${t.aktif ? "badge-success" : "badge-danger"}`}>
                      {t.aktif ? "Aktif" : "Nonaktif"}
                    </span>
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

      {/* Modal Tambah Pengajar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg" style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <div className="modal-title">🎓 Pendaftaran Pengajar Baru</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: 24, padding: 16, background: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: 12, fontSize: 13 }}>
                  <strong>Catatan Akademik:</strong> Tim Akademik berwenang mendaftarkan akun pengajar. Data finansial (Gaji Pokok) akan diatur kemudian oleh Tim Finance.
                </div>

                <div className="form-grid-2" style={{ gap: 24 }}>
                  {/* Column 1: Akun */}
                  <section>
                    <h4 style={{ marginBottom: 16, fontSize: 14, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Detail Akun</h4>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label required">Nama Lengkap</label>
                      <input type="text" className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label required">Email Instansi</label>
                      <input type="email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label required">Password Awal</label>
                      <div style={{ position: 'relative' }}>
                        <input type="text" className="form-control" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
                        <Lock size={16} style={{ position: 'absolute', right: 12, top: 12, opacity: 0.4 }} />
                      </div>
                    </div>
                  </section>

                  {/* Column 2: Profil & Bank */}
                  <section>
                    <h4 style={{ marginBottom: 16, fontSize: 14, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Informasi Profil</h4>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">NIK (KTP)</label>
                      <input type="text" className="form-control" value={form.nik} onChange={e => setForm({...form, nik: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">Posisi / Spesialisasi</label>
                      <input type="text" className="form-control" placeholder="Contoh: Tutor TOEFL Premium" value={form.posisi} onChange={e => setForm({...form, posisi: e.target.value})} />
                    </div>
                    
                    <div style={{ background: 'var(--surface-container-low)', padding: 16, borderRadius: 16, marginTop: 24 }}>
                       <h5 style={{ marginBottom: 12, fontSize: 12, fontWeight: 800 }}>Informasi Transfer Gaji</h5>
                       <div className="form-group" style={{ marginBottom: 12 }}>
                         <input type="text" className="form-control" placeholder="Nama Bank" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} />
                       </div>
                       <div className="form-grid-2" style={{ gap: 8 }}>
                         <input type="text" className="form-control" placeholder="Nomor Rekening" value={form.rekeningNomor} onChange={e => setForm({...form, rekeningNomor: e.target.value})} />
                         <input type="text" className="form-control" placeholder="Nama di Rekening" value={form.rekeningNama} onChange={e => setForm({...form, rekeningNama: e.target.value})} />
                       </div>
                    </div>
                  </section>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Mendaftarkan..." : "🚀 Daftarkan Pengajar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
