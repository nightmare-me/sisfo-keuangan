"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { 
  Calendar, Users, BookOpen, AlertCircle, CheckCircle2, 
  ChevronLeft, ExternalLink, Plus, MessageSquare, 
  FileText, Info, MoreVertical, Save, X, Send,
  FileCheck
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const GRADES = ["A", "B", "C", "D", "E"];

export default function PengajarKelasDetail({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const [kelas, setKelas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("SESI"); // SESI, SISWA, MATERI, KENDALA
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [showAddSesi, setShowAddSesi] = useState(false);
  const [sesiForm, setSesiForm] = useState({ topik: "", tanggal: "", catatan: "" });
  
  const [showAddMateri, setShowAddMateri] = useState(false);
  const [materiForm, setMateriForm] = useState({ judul: "", urlFile: "", deskripsi: "" });

  const [showAddKendala, setShowAddKendala] = useState(false);
  const [kendalaForm, setKendalaForm] = useState({ siswaId: "", topik: "", deskripsi: "" });

  // Absensi & Nilai
  const [editingSesiId, setEditingSesiId] = useState<string | null>(null);
  const [absensiDraft, setAbsensiDraft] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/pengajar/kelas/${params.id}`);
      const d = await res.json();
      setKelas(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="animate-pulse" style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid var(--brand-primary)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Menyiapkan profil kelas...</p>
        </div>
      </div>
    );
  }

  if (!kelas || kelas.error) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 20, fontWeight: 700 }}>Kelas Tidak Ditemukan</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{kelas?.error || "Gagal memuat data kelas."}</p>
          <Link href="/pengajar/dashboard" className="btn btn-primary">Kembali ke Dashboard</Link>
        </div>
      </div>
    );
  }

  const pendaftaran = kelas.pendaftaran || [];
  const sesi = kelas.sesiKelas || [];
  const materi = kelas.materiKelas || [];
  const kendala = kelas.kendalaMurid || [];

  // Logic Progress
  const totalSesiTarget = 24; // Default target
  const sesiSelesaiCount = sesi.filter((s: any) => s.status === "SELESAI").length;
  const progressPercent = Math.min(Math.round((sesiSelesaiCount / totalSesiTarget) * 100), 100);

  // --- Handlers ---
  async function submitSesi(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/pengajar/sesi", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kelasId: kelas.id, ...sesiForm })
    });
    if (res.ok) { 
      setShowAddSesi(false); 
      setSesiForm({ topik: "", tanggal: "", catatan: "" }); 
      fetchData(); 
    }
    setSubmitting(false);
  }

  async function submitMateri(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/pengajar/materi", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kelasId: kelas.id, ...materiForm })
    });
    if (res.ok) { 
      setShowAddMateri(false); 
      setMateriForm({ judul: "", urlFile: "", deskripsi: "" }); 
      fetchData(); 
    }
    setSubmitting(false);
  }

  async function submitKendala(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/pengajar/kendala", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kelasId: kelas.id, ...kendalaForm })
    });
    if (res.ok) { 
      setShowAddKendala(false); 
      setKendalaForm({ siswaId: "", topik: "", deskripsi: "" }); 
      fetchData(); 
    }
    setSubmitting(false);
  }

  function startEditAbsensi(s: any) {
    setEditingSesiId(s.id);
    setAbsensiDraft(s.absensi.map((a: any) => ({ ...a })));
  }

  async function saveAbsensi() {
    setSubmitting(true);
    const res = await fetch("/api/pengajar/absensi", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(absensiDraft)
    });
    if (res.ok) { 
      setEditingSesiId(null); 
      fetchData(); 
    }
    setSubmitting(false);
  }

  return (
    <div className="page-container">
      {/* ── TOP NAVIGATION & HEADER ── */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/pengajar/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          <ChevronLeft size={16} /> Kembali ke Dashboard
        </Link>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="badge badge-success">AKTIF</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>{kelas.program?.nama}</span>
            </div>
            <h1 className="headline-lg" style={{ marginBottom: 4 }}>{kelas.namaKelas}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 14, color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> {kelas.hari || "Custom"}, {kelas.jam || "-"}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> {pendaftaran.length} Siswa Terdaftar</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {kelas.linkGrup && (
              <a href={kelas.linkGrup.startsWith('http') ? kelas.linkGrup : `https://${kelas.linkGrup}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
                <MessageSquare size={18} /> Grup WhatsApp
              </a>
            )}
            <button className="btn btn-primary btn-icon" title="Menu Lainnya">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── PROGRESS TRACKER ── */}
      <div className="card shadow-glow" style={{ marginBottom: 32, padding: '20px 24px', background: 'var(--surface-container-low)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
             <BookOpen size={18} style={{ color: 'var(--brand-primary-light)' }} />
             <span style={{ fontWeight: 700, fontSize: 14 }}>Progress Pembelajaran</span>
           </div>
           <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary-light)' }}>{sesiSelesaiCount} / {totalSesiTarget} Sesi</span>
        </div>
        <div style={{ width: '100%', height: 8, background: 'var(--surface-container-high)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-primary-light) 100%)', transition: 'width 1s ease-in-out' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
          <span>MULAI</span>
          <span>TARGET SELESAI ({progressPercent}%)</span>
        </div>
      </div>

      {/* ── TABS NAVIGATION ── */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-container-high)', padding: 4, borderRadius: 14, marginBottom: 32, maxWidth: 'fit-content' }}>
        {[
          { id: "SESI", label: "Sesi & Absensi", icon: <FileText size={16} /> },
          { id: "SISWA", label: "Daftar Siswa", icon: <Users size={16} /> },
          { id: "MATERI", label: "Materi", icon: <BookOpen size={16} /> },
          { id: "KENDALA", label: "Kendala", icon: <AlertCircle size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-ghost"}`}
            style={{ 
              borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: activeTab === tab.id ? 'var(--shadow-md)' : 'none'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT: SESI & ABSENSI ── */}
      {activeTab === "SESI" && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Daftar Pertemuan</h3>
            <button className="btn btn-primary" style={{ borderRadius: 10, padding: '8px 16px' }} onClick={() => setShowAddSesi(true)}>
              <Plus size={18} /> Tambah Sesi
            </button>
          </div>

          {showAddSesi && (
            <div className="card shadow-glow animate-slide-up" style={{ marginBottom: 24, border: '1px dashed var(--brand-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h4 style={{ fontSize: 16, fontWeight: 800 }}>Buat Sesi Kelas Baru</h4>
                <X size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowAddSesi(false)} />
              </div>
              <form onSubmit={submitSesi}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Tanggal</label>
                    <input type="date" className="form-control" required value={sesiForm.tanggal} onChange={e => setSesiForm({...sesiForm, tanggal: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Topik / Materi</label>
                    <input type="text" className="form-control" placeholder="Contoh: Modul 1 - Intro" required value={sesiForm.topik} onChange={e => setSesiForm({...sesiForm, topik: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Catatan Tambahan (Opsional)</label>
                  <textarea className="form-control" rows={2} placeholder="Detail materi atau tugas..." value={sesiForm.catatan} onChange={e => setSesiForm({...sesiForm, catatan: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Menyimpan..." : "Simpan Sesi"}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddSesi(false)}>Batal</button>
                </div>
              </form>
            </div>
          )}

          {sesi.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📓</div>
              <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Belum ada sesi tercatat. Klik tombol di atas untuk memulai sesi pertama.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sesi.map((s: any, idx: number) => {
                const isEditing = editingSesiId === s.id;
                const getSiswa = (sid: string) => pendaftaran.find((p: any) => p.siswaId === sid)?.siswa;

                return (
                  <div key={s.id} className="card shadow-hover" style={{ overflow: 'hidden', padding: 0 }}>
                    <div style={{ padding: '16px 20px', background: 'var(--surface-container-high)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-primary-light)', textTransform: 'uppercase', marginBottom: 2 }}>Pertemuan {sesi.length - idx}</div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{s.topik}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>📅 {formatDate(s.tanggal, "eeee, dd MMM yyyy")} {s.catatan && `• ${s.catatan}`}</div>
                      </div>
                      {!isEditing ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => startEditAbsensi(s)}>
                          <FileCheck size={14} /> Absensi & Nilai
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-primary btn-sm" onClick={saveAbsensi} disabled={submitting}>
                            <Save size={14} /> {submitting ? "Saving..." : "Simpan"}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingSesiId(null)}>Batal</button>
                        </div>
                      )}
                    </div>

                    <div className="table-wrapper" style={{ padding: '0 10px' }}>
                      <table style={{ width: '100%', borderSpacing: '0 8px', borderCollapse: 'separate' }}>
                        <thead style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          <tr>
                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Siswa</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', width: 140 }}>Status</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Penilaian</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(isEditing ? absensiDraft : s.absensi).map((ab: any) => {
                            const sw = getSiswa(ab.siswaId);
                            return (
                              <tr key={ab.id}>
                                <td style={{ padding: '10px 12px' }}>
                                  <div style={{ fontWeight: 700, fontSize: 14 }}>{sw?.nama}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sw?.noSiswa}</div>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  {isEditing ? (
                                    <select 
                                      className="form-control" style={{ padding: '4px 8px', fontSize: 12, height: 32 }}
                                      value={ab.status}
                                      onChange={e => setAbsensiDraft(draft => draft.map(d => d.id === ab.id ? { ...d, status: e.target.value } : d))}
                                    >
                                      <option value="HADIR">Hadir</option>
                                      <option value="IZIN">Izin</option>
                                      <option value="SAKIT">Sakit</option>
                                      <option value="ALPA">Alpa</option>
                                    </select>
                                  ) : (
                                    <span className={`badge ${ab.status === 'HADIR' ? 'badge-success' : ab.status === 'ALPA' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                                      {ab.status}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  {isEditing ? (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <select 
                                        className="form-control" style={{ width: 70, padding: '4px 8px', fontSize: 12, height: 32 }}
                                        value={ab.nilaiHuruf || ""}
                                        onChange={e => setAbsensiDraft(draft => draft.map(d => d.id === ab.id ? { ...d, nilaiHuruf: e.target.value } : d))}
                                      >
                                        <option value="">Nilai</option>
                                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                      </select>
                                      <input 
                                        className="form-control" placeholder="Catatan skor..." style={{ flex: 1, padding: '4px 8px', fontSize: 12, height: 32 }}
                                        value={ab.catatan || ""}
                                        onChange={e => setAbsensiDraft(draft => draft.map(d => d.id === ab.id ? { ...d, catatan: e.target.value } : d))}
                                      />
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      {ab.nilaiHuruf && (
                                        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>
                                          {ab.nilaiHuruf}
                                        </div>
                                      )}
                                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ab.catatan || (ab.nilaiHuruf ? "" : "Belum dinilai")}</span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT: SISWA ── */}
      {activeTab === "SISWA" && (
        <div className="card">
           <div className="card-header" style={{ marginBottom: 20 }}>
             <h3 style={{ fontSize: 18, fontWeight: 800 }}>Daftar Murid Terdaftar</h3>
             <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Total {pendaftaran.length} siswa dalam kelas ini.</p>
           </div>
           <div className="table-wrapper">
             <table>
               <thead>
                 <tr>
                   <th style={{ width: 50 }}>No</th>
                   <th>Informasi Siswa</th>
                   <th>Kontak</th>
                   <th style={{ textAlign: 'center' }}>Kehadiran Avg</th>
                 </tr>
               </thead>
               <tbody>
                 {pendaftaran.map((p: any, i: number) => {
                   const attendanceCount = sesi.filter((s: any) => s.absensi.some((a: any) => a.siswaId === p.siswaId && a.status === 'HADIR')).length;
                   const totalSesiPassed = sesi.length || 1;
                   const attendanceRate = Math.round((attendanceCount / totalSesiPassed) * 100);

                   return (
                     <tr key={p.id}>
                       <td>{i + 1}</td>
                       <td>
                         <div style={{ fontWeight: 700 }}>{p.siswa.nama}</div>
                         <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.siswa.noSiswa}</div>
                       </td>
                       <td>
                         <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                           📱 {p.siswa.telepon || "-"}
                         </div>
                       </td>
                       <td style={{ textAlign: 'center' }}>
                         <div style={{ fontSize: 14, fontWeight: 700, color: attendanceRate > 80 ? 'var(--success)' : attendanceRate > 50 ? 'var(--warning)' : 'var(--danger)' }}>
                           {attendanceRate}%
                         </div>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* ── TAB CONTENT: MATERI ── */}
      {activeTab === "MATERI" && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Sumber Belajar & Materi</h3>
            <button className="btn btn-primary" onClick={() => setShowAddMateri(true)}>
              <Plus size={18} /> Bagikan Materi
            </button>
          </div>

          {showAddMateri && (
            <div className="card shadow-glow animate-slide-up" style={{ marginBottom: 24, border: '1px dashed var(--brand-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h4 style={{ fontSize: 16, fontWeight: 800 }}>Tautkan Materi Baru</h4>
                <X size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowAddMateri(false)} />
              </div>
              <form onSubmit={submitMateri}>
                <div className="form-group">
                  <label className="form-label">Judul Materi</label>
                  <input type="text" className="form-control" placeholder="Contoh: Modul Grammar Basic" required value={materiForm.judul} onChange={e => setMateriForm({...materiForm, judul: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">URL Link (G-Drive / Dropbox / Website)</label>
                  <input type="url" className="form-control" placeholder="https://..." required value={materiForm.urlFile} onChange={e => setMateriForm({...materiForm, urlFile: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi Singkat</label>
                  <textarea className="form-control" rows={2} value={materiForm.deskripsi} onChange={e => setMateriForm({...materiForm, deskripsi: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Uploading..." : "Simpan Tautan"}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddMateri(false)}>Batal</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
             {materi.length === 0 && <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>Belum ada materi dibagikan.</div>}
             {materi.map((m: any) => (
               <div key={m.id} className="card shadow-hover" style={{ display: 'flex', flexDirection: 'column' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary-light)' }}>
                       <BookOpen size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                       <div style={{ fontWeight: 800, fontSize: 15 }}>{m.judul}</div>
                       <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(m.createdAt, "dd MMM yyyy")}</div>
                    </div>
                 </div>
                 <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, flex: 1 }}>{m.deskripsi || "Tidak ada deskripsi."}</p>
                 <a href={m.urlFile} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    Buka Materi <ExternalLink size={14} />
                 </a>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: KENDALA ── */}
      {activeTab === "KENDALA" && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Laporan Kendala Murid</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Gunakan ini untuk koordinasi dengan tim Akademik.</p>
            </div>
            <button className="btn btn-danger" onClick={() => setShowAddKendala(true)}>
              <Plus size={18} /> Lapor Kendala
            </button>
          </div>

          {showAddKendala && (
            <div className="card shadow-glow animate-slide-up" style={{ marginBottom: 24, border: '1px dashed var(--danger)' }}>
               <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Buat Laporan Kendala</h4>
               <form onSubmit={submitKendala}>
                 <div className="form-group">
                   <label className="form-label">Siswa Terdampak</label>
                   <select className="form-control" required value={kendalaForm.siswaId} onChange={e => setKendalaForm({...kendalaForm, siswaId: e.target.value})}>
                     <option value="">Pilih Siswa</option>
                     {pendaftaran.map((p: any) => <option key={p.siswaId} value={p.siswaId}>{p.siswa.nama}</option>)}
                   </select>
                 </div>
                 <div className="form-group">
                   <label className="form-label">Topik Masalah</label>
                   <input type="text" className="form-control" placeholder="Contoh: Jarang hadir / Kurang fokus" required value={kendalaForm.topik} onChange={e => setKendalaForm({...kendalaForm, topik: e.target.value})} />
                 </div>
                 <div className="form-group">
                   <label className="form-label">Deskripsi Detail</label>
                   <textarea className="form-control" rows={3} placeholder="Ceritakan detail kendala agar tim akademik bisa membantu..." required value={kendalaForm.deskripsi} onChange={e => setKendalaForm({...kendalaForm, deskripsi: e.target.value})} />
                 </div>
                 <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                   <button type="submit" className="btn btn-danger" disabled={submitting}>
                     <Send size={14} /> {submitting ? "Sending..." : "Kirim Laporan"}
                   </button>
                   <button type="button" className="btn btn-secondary" onClick={() => setShowAddKendala(false)}>Batal</button>
                 </div>
               </form>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
             {kendala.length === 0 && <div className="card" style={{ textAlign: 'center', padding: '40px' }}>Tidak ada laporan kendala saat ini.</div>}
             {kendala.map((k: any) => (
               <div key={k.id} className="card shadow-hover" style={{ borderLeft: `4px solid ${k.status === 'OPEN' ? 'var(--warning)' : 'var(--success)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                     <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                           <span className={`badge ${k.status === 'OPEN' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: 10 }}>{k.status}</span>
                           <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(k.createdAt, "dd/MM/yyyy")}</span>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{k.topik}</div>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{k.siswa?.nama}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Murid</div>
                     </div>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', background: 'var(--surface-container-high)', padding: 12, borderRadius: 10 }}>{k.deskripsi}</p>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* ── HELP FOOTER ── */}
      <div style={{ marginTop: 64, textAlign: 'center', padding: '32px 0', borderTop: '1px solid var(--border-default)' }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            <Info size={16} /> Butuh bantuan terkait manajemen kelas? <Link href="#" style={{ color: 'var(--brand-primary-light)', fontWeight: 700 }}>Hubungi Tim Akademik</Link>
         </div>
      </div>
    </div>
  );
}
