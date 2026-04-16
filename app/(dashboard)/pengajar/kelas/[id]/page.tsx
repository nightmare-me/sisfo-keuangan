"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatDate } from "@/lib/utils";

const GRADES = ["A", "B", "C", "D", "E"];

export default function PengajarKelasDetail({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const userName = session?.user?.name;

  const [kelas, setKelas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("SESI"); // SESI, INFO, MATERI, KENDALA

  // Formulir
  const [showAddSesi, setShowAddSesi] = useState(false);
  const [sesiForm, setSesiForm] = useState({ topik: "", tanggal: "", catatan: "" });
  
  const [showAddMateri, setShowAddMateri] = useState(false);
  const [materiForm, setMateriForm] = useState({ judul: "", urlFile: "", deskripsi: "" });

  const [showAddKendala, setShowAddKendala] = useState(false);
  const [kendalaForm, setKendalaForm] = useState({ siswaId: "", topik: "", deskripsi: "" });

  // Absensi View
  const [editingSesiId, setEditingSesiId] = useState<string | null>(null);
  const [absensiDraft, setAbsensiDraft] = useState<any[]>([]);

  function fetchData() {
    setLoading(true);
    fetch(`/api/pengajar/kelas/${params.id}`)
      .then(res => res.json())
      .then(d => { setKelas(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, [params.id]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Memuat profil kelas...</div>;
  }

  if (!kelas || kelas.error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🚫</div>
        <h3>Tidak Ditemukan</h3>
        <p>{kelas?.error || "Gagal memuat kelas"}</p>
      </div>
    );
  }

  const pendaftaran = kelas.pendaftaran || [];
  const sesi = kelas.sesiKelas || [];
  const materi = kelas.materiKelas || [];
  const kendala = kelas.kendalaMurid || [];

  // --- Handlers
  async function submitSesi(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/pengajar/sesi", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kelasId: kelas.id, ...sesiForm })
    });
    if (res.ok) { setShowAddSesi(false); setSesiForm({ topik: "", tanggal: "", catatan: "" }); fetchData(); }
  }

  async function submitMateri(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/pengajar/materi", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kelasId: kelas.id, ...materiForm })
    });
    if (res.ok) { setShowAddMateri(false); setMateriForm({ judul: "", urlFile: "", deskripsi: "" }); fetchData(); }
  }

  async function submitKendala(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/pengajar/kendala", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kelasId: kelas.id, ...kendalaForm })
    });
    if (res.ok) { setShowAddKendala(false); setKendalaForm({ siswaId: "", topik: "", deskripsi: "" }); fetchData(); }
  }

  function startEditAbsensi(s: any) {
    setEditingSesiId(s.id);
    setAbsensiDraft(s.absensi.map((a: any) => ({ ...a })));
  }

  function updateDraft(absensiId: string, field: string, value: string) {
    setAbsensiDraft(draft => draft.map(d => d.id === absensiId ? { ...d, [field]: value } : d));
  }

  async function saveAbsensi() {
    const res = await fetch("/api/pengajar/absensi", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(absensiDraft)
    });
    if (res.ok) { alert("Absensi dan Nilai tersimpan!"); setEditingSesiId(null); fetchData(); }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">{kelas.namaKelas}</div>
          <div className="topbar-subtitle">{kelas.program?.nama} · {pendaftaran.length} Siswa Terdaftar</div>
        </div>
        <div className="topbar-actions">
           <button className="btn btn-secondary" onClick={() => window.history.back()}>Kembali</button>
           {kelas.linkGrup && (
             <a href={kelas.linkGrup.startsWith('http') ? kelas.linkGrup : `https://${kelas.linkGrup}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ textDecoration: "none" }}>📱 Buka Grup WA</a>
           )}
        </div>
      </div>

      <div className="page-container">
        {/* TABS */}
        <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--border-default)", marginBottom: 20 }}>
          {["SESI", "INFO", "MATERI", "KENDALA"].map(tab => (
            <div 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 16px", cursor: "pointer", fontWeight: 600, fontSize: 14,
                borderBottom: activeTab === tab ? "3px solid var(--brand-primary)" : "3px solid transparent",
                color: activeTab === tab ? "var(--brand-primary)" : "var(--text-muted)",
              }}
            >
              {tab === "SESI" ? "Daftar Sesi & Absensi" :
               tab === "INFO" ? "Info & Siswa" :
               tab === "MATERI" ? "Link Materi" : "Report Kendala"}
            </div>
          ))}
        </div>

        {/* --- TAB: INFO (Daftar Murid) --- */}
        {activeTab === "INFO" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div className="card">
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Jadwal Rutin</div>
                <div style={{ fontWeight: 600 }}>{kelas.hari ? `${kelas.hari}, ${kelas.jam}` : kelas.jadwal}</div>
              </div>
              <div className="card">
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Durasi</div>
                <div style={{ fontWeight: 600 }}>{kelas.durasi || "Belum ditentukan"}</div>
              </div>
            </div>

            <div className="card-header">
              <div className="card-title">Daftar Murid Kelas Ini</div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>No</th><th>No Siswa</th><th>Nama Murid</th><th>Telepon</th></tr></thead>
                <tbody>
                  {pendaftaran.map((p: any, i: number) => (
                     <tr key={p.id}>
                       <td>{i+1}</td>
                       <td style={{ fontFamily: "monospace" }}>{p.siswa.noSiswa}</td>
                       <td style={{ fontWeight: 600 }}>{p.siswa.nama}</td>
                       <td>{p.siswa.telepon}</td>
                     </tr>
                  ))}
                  {pendaftaran.length === 0 && <tr><td colSpan={4} style={{textAlign: "center"}}>Belum ada murid di kelas ini.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB: MATERI --- */}
        {activeTab === "MATERI" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h4>Daftar Link Materi / Modul</h4>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddMateri(true)}>+ Tautkan Materi Baru</button>
            </div>

            {showAddMateri && (
               <div className="card" style={{ marginBottom: 20, border: "1px dashed var(--brand-primary)" }}>
                 <h5 style={{ marginBottom: 12 }}>Tautkan Link Materi Cloud (G-Drive/Notion/Youtube)</h5>
                 <form onSubmit={submitMateri} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                   <input className="form-control" placeholder="Judul Materi (Contoh: Slide Modul 1)" required value={materiForm.judul} onChange={e => setMateriForm(f=>({...f, judul: e.target.value}))}/>
                   <input className="form-control" type="url" placeholder="https://drive.google.com/..." required value={materiForm.urlFile} onChange={e => setMateriForm(f=>({...f, urlFile: e.target.value}))}/>
                   <textarea className="form-control" placeholder="Deskripsi/Keterangan singkat materi..." rows={2} value={materiForm.deskripsi} onChange={e => setMateriForm(f=>({...f, deskripsi: e.target.value}))}/>
                   <div style={{ display: "flex", gap: 8 }}>
                     <button type="submit" className="btn btn-primary btn-sm">Simpan Tautan</button>
                     <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddMateri(false)}>Batal</button>
                   </div>
                 </form>
               </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {materi.length === 0 && <p style={{ color: "var(--text-muted)" }}>Belum ada materi dibagikan.</p>}
              {materi.map((m: any) => (
                <div key={m.id} className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{formatDate(m.createdAt, "dd MMM yyyy")} • {m.diunggahOleh}</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{m.judul}</div>
                  <div style={{ fontSize: 13, marginBottom: 12 }}>{m.deskripsi}</div>
                  <a href={m.urlFile} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ display: "inline-block", textDecoration: "none" }}>Buka Materi 🔗</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB: KENDALA --- */}
        {activeTab === "KENDALA" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h4>Report Kendala Murid ke Tim Akademik</h4>
              <button className="btn btn-danger btn-sm" onClick={() => setShowAddKendala(true)}>+ Laporkan Kendala</button>
            </div>

            {showAddKendala && (
               <div className="card" style={{ marginBottom: 20, border: "1px dashed var(--danger)" }}>
                 <h5 style={{ marginBottom: 12 }}>Form Laporan Kendala Khusus</h5>
                 <form onSubmit={submitKendala} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                   <select className="form-control" required value={kendalaForm.siswaId} onChange={e=>setKendalaForm(f=>({...f, siswaId: e.target.value}))}>
                     <option value="">Pilih Murid Terdampak</option>
                     {pendaftaran.map((p: any) => <option key={p.siswaId} value={p.siswaId}>{p.siswa.nama}</option>)}
                   </select>
                   <input className="form-control" placeholder="Topik Kendala (Cth: Sering tidak hadir tanpa kabar)" required value={kendalaForm.topik} onChange={e => setKendalaForm(f=>({...f, topik: e.target.value}))}/>
                   <textarea className="form-control" placeholder="Deskripsikan dengan mendetail..." required rows={3} value={kendalaForm.deskripsi} onChange={e => setKendalaForm(f=>({...f, deskripsi: e.target.value}))}/>
                   <div style={{ display: "flex", gap: 8 }}>
                     <button type="submit" className="btn btn-danger btn-sm">Submit Report</button>
                     <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddKendala(false)}>Batal</button>
                   </div>
                 </form>
               </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {kendala.length === 0 && <p style={{ color: "var(--text-muted)" }}>Tidak ada laporan kendala.</p>}
              {kendala.map((k: any) => (
                <div key={k.id} className="card" style={{ borderLeft: `4px solid ${k.status === "OPEN" ? "var(--warning)" : "var(--success)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontWeight: 700 }}>⚠️ {k.topik}</div>
                    <span className={`badge ${k.status === "OPEN" ? "badge-warning" : "badge-success"}`}>{k.status}</span>
                  </div>
                  <div style={{ fontSize: 13, background: "var(--bg-elevated)", padding: "4px 8px", borderRadius: 4, display: "inline-block", marginBottom: 8 }}>
                    👨‍🎓 {k.siswa?.nama}
                  </div>
                  <div style={{ fontSize: 14 }}>{k.deskripsi}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Dilaporkan oleh <b>{k.dilaporkanOleh}</b> pada {formatDate(k.createdAt, "dd/MM/yyyy")}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB: SESI & ABSENSI --- */}
        {activeTab === "SESI" && (
           <div>
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
               <h4>Daftar Pertemuan (Sesi)</h4>
               <button className="btn btn-primary btn-sm" onClick={() => setShowAddSesi(true)}>+ Buat Sesi Baru</button>
             </div>

             {showAddSesi && (
               <div className="card" style={{ marginBottom: 20, border: "1px dashed #6366f1" }}>
                 <h5 style={{ marginBottom: 12 }}>Buat Sesi Kelas</h5>
                 <form onSubmit={submitSesi}>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Tanggal Pelaksanaan</label>
                        <input className="form-control" type="date" required value={sesiForm.tanggal} onChange={e=>setSesiForm(f=>({...f, tanggal: e.target.value}))}/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Topik Pembahasan</label>
                        <input className="form-control" required placeholder="Bab 1: Introduction" value={sesiForm.topik} onChange={e=>setSesiForm(f=>({...f, topik: e.target.value}))}/>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Catatan Tambahan (Opsional)</label>
                      <input className="form-control" value={sesiForm.catatan} onChange={e=>setSesiForm(f=>({...f, catatan: e.target.value}))}/>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                       <button type="submit" className="btn btn-primary btn-sm">Buat Sesi</button>
                       <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddSesi(false)}>Batal</button>
                    </div>
                 </form>
               </div>
             )}

             {sesi.length === 0 && <p style={{ color: "var(--text-muted)" }}>Belum ada sesi tercatat. Silakan buat sesi terlebih dahulu.</p>}
             
             {sesi.map((s: any, index: number) => {
               const isEditing = editingSesiId === s.id;
               
               // Cari mapping siswa info utk list absensi
               const getSiswaInfo = (sid: string) => pendaftaran.find((p:any) => p.siswaId === sid)?.siswa;

               return (
                 <div key={s.id} className="card" style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border-default)" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>Pertemuan {index + 1}: {s.topik}</div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>📅 {formatDate(s.tanggal, "dd MMMM yyyy")} {s.catatan ? `• ${s.catatan}` : ''}</div>
                      </div>
                      {!isEditing && (
                        <button className="btn btn-secondary btn-sm" onClick={() => startEditAbsensi(s)}>✏️ Input/Edit Absensi & Nilai</button>
                      )}
                      {isEditing && (
                         <div style={{ display: "flex", gap: 8 }}>
                           <button className="btn btn-primary btn-sm" onClick={saveAbsensi}>💾 Simpan</button>
                           <button className="btn btn-secondary btn-sm" onClick={() => setEditingSesiId(null)}>Batal</button>
                         </div>
                      )}
                    </div>

                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Nama Murid</th>
                            <th>Status Kehadiran</th>
                            <th>Nilai / Grading</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!isEditing ? (
                             // View Mode
                             s.absensi.map((ab: any) => {
                               const sw = getSiswaInfo(ab.siswaId);
                               return (
                                 <tr key={ab.id}>
                                   <td style={{ fontWeight: 600 }}>{sw?.nama ?? "Murid Ghoib"}</td>
                                   <td>
                                     <span className={`badge ${ab.status === 'HADIR' ? 'badge-success' : ab.status === 'ALPA' ? 'badge-danger' : 'badge-warning'}`}>
                                       {ab.status}
                                     </span>
                                   </td>
                                   <td>
                                      {ab.nilaiHuruf ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                          <div style={{ width: 24, height: 24, background: "#818cf8", color: "white", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                                            {ab.nilaiHuruf}
                                          </div>
                                          {ab.catatan && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>"{ab.catatan}"</span>}
                                        </div>
                                      ) : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>}
                                   </td>
                                 </tr>
                               )
                             })
                          ) : (
                             // Edit Mode (menggunakan absensiDraft)
                             absensiDraft.map((ab: any) => {
                               const sw = getSiswaInfo(ab.siswaId);
                               return (
                                 <tr key={ab.id}>
                                   <td style={{ fontWeight: 600 }}>{sw?.nama}</td>
                                   <td>
                                      <select className="form-control" style={{ padding: "4px 8px", fontSize: 13 }} value={ab.status} onChange={(e) => updateDraft(ab.id, "status", e.target.value)}>
                                        <option value="HADIR">✅ Hadir</option>
                                        <option value="IZIN">🟡 Izin</option>
                                        <option value="SAKIT">🔵 Sakit</option>
                                        <option value="ALPA">❌ Alpa</option>
                                      </select>
                                   </td>
                                   <td>
                                      <div style={{ display: "flex", gap: 8 }}>
                                        <select className="form-control" style={{ width: 80, padding: "4px 8px", fontSize: 13 }} value={ab.nilaiHuruf || ""} onChange={(e) => updateDraft(ab.id, "nilaiHuruf", e.target.value)}>
                                          <option value="">Nilai (Ops)</option>
                                          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                        <input type="text" className="form-control" placeholder="Keterangan skor..." style={{ padding: "4px 8px", fontSize: 13, flex: 1 }} value={ab.catatan || ""} onChange={(e) => updateDraft(ab.id, "catatan", e.target.value)} />
                                      </div>
                                   </td>
                                 </tr>
                               )
                             })
                          )}
                        </tbody>
                      </table>
                    </div>
                 </div>
               )
             })}
           </div>
        )}

      </div>
    </div>
  );
}
