"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { formatDate } from "@/lib/utils";

const STATUS_OPTIONS = ["AKTIF","TIDAK_AKTIF","ALUMNI"];
const STATUS_BADGE: Record<string,string> = { AKTIF:"badge-success", TIDAK_AKTIF:"badge-danger", ALUMNI:"badge-muted" };
const emptyForm = { nama:"", telepon:"", email:"", alamat:"", tanggalLahir:"", catatan:"" };

export default function SiswaPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const isCS = role === "CS";

  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [page, setPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  function fetchData() {
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) p.set("search", search);
    if (statusFilter) p.set("status", statusFilter);
    // CS hanya melihat siswa yang pernah mereka tangani (via pemasukan)
    if (isCS && userId) p.set("csId", userId);
    setLoading(true);
    fetch(`/api/siswa?${p}`).then(r => r.json()).then(d => { setData(d.data ?? []); setTotal(d.total ?? 0); setLoading(false); });
  }

  useEffect(()=>{ fetchData(); },[search, statusFilter, page]);

  function openAdd() { setEditId(null); setForm({ ...emptyForm }); setShowModal(true); }
  function openEdit(s: any) {
    setEditId(s.id);
    setForm({ nama: s.nama, telepon: s.telepon??'', email: s.email??'', alamat: s.alamat??'', tanggalLahir: s.tanggalLahir ? s.tanggalLahir.slice(0,10) : '', catatan: s.catatan??'' });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    if (editId) {
      await fetch("/api/siswa", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id: editId, ...form }) });
    } else {
      await fetch("/api/siswa",{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(form) });
    }
    setSaving(false); setShowModal(false); setEditId(null);
    setForm({ ...emptyForm });
    fetchData();
  }

  async function handleDelete(s: any) {
    if (!confirm(`Hapus siswa "${s.nama}"?\n\nData tidak bisa dikembalikan.`)) return;
    await fetch(`/api/siswa?id=${s.id}`, { method: "DELETE" });
    fetchData();
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/siswa", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id, status }) });
    fetchData();
  }

  // ── CSV Import ──────────────────────────────────────────
  function downloadCsvTemplate() {
    const header = "nama,telepon,email,alamat,tanggalLahir,catatan\n";
    const examples = [
      "Budi Santoso,08123456789,budi@email.com,Jl. Mawar No.1 Kediri,2000-05-15,Siswa baru",
      "Dewi Lestari,08987654321,dewi@email.com,Jl. Melati No.5 Kediri,,",
      "Andi Pratama,08111222333,,,1999-12-01,Referral dari alumni",
    ].join("\n") + "\n";
    const notes = [
      "",
      "# PANDUAN:",
      "# - nama: wajib diisi",
      "# - telepon: tanpa tanda hubung (08xxxxxxxxxx)",
      "# - tanggalLahir: format YYYY-MM-DD (boleh kosong)",
      "# - kolom lain boleh dikosongkan",
    ].join("\n");
    const blob = new Blob([header + examples + notes], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "template_siswa.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setCsvLoading(true);
    const text = await file.text();
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    // Skip baris komentar (#) dan header
    const lines = normalized.split("\n")
      .filter(l => l.trim().length > 0 && !l.trim().startsWith("#"))
      .slice(1);

    let success = 0;
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const delimiter = lines[i].includes(";") ? ";" : ",";
      const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ""));
      const [nama, telepon, email, alamat, tanggalLahir, catatan] = cols;

      if (!nama) { errors.push(`Baris ${i + 2}: nama kosong`); continue; }

      const res = await fetch("/api/siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, telepon: telepon||"", email: email||"", alamat: alamat||"", tanggalLahir: tanggalLahir||"", catatan: catatan||"" }),
      });
      if (res.ok) { success++; } else {
        const err = await res.json().catch(() => ({}));
        errors.push(`Baris ${i + 2} (${nama}): ${err.error ?? res.status}`);
      }
    }

    setCsvLoading(false);
    if (fileRef.current) fileRef.current.value = "";
    let msg = `✅ Import selesai: ${success} dari ${lines.length} siswa berhasil ditambahkan.`;
    if (errors.length > 0) msg += `\n\n⚠️ Catatan (${errors.length}):\n` + errors.slice(0, 7).join("\n");
    alert(msg);
    fetchData();
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">Manajemen Siswa</div>
          <div className="topbar-subtitle">Total {total} siswa terdaftar</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={downloadCsvTemplate}>⬇ Template CSV</button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>
            {csvLoading ? "Importing..." : "📥 Import CSV"}
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCsvImport} />
          </label>
          <button id="btn-tambah-siswa" className="btn btn-primary" onClick={openAdd}>+ Tambah Siswa</button>
        </div>
      </div>

      <div className="page-container">
        {/* Info banner untuk CS */}
        {isCS && (
          <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#818cf8", display: "flex", alignItems: "center", gap: 8 }}>
            <span>🎯</span>
            <span>Menampilkan siswa yang pernah kamu tangani. Siswa baru tanpa transaksi belum muncul di sini.</span>
          </div>
        )}
        {/* Stats */}
        <div className="summary-grid">
          {STATUS_OPTIONS.map(s=>(
            <div key={s} className="summary-card" style={{ cursor:"pointer", border: statusFilter===s?"1px solid var(--brand-primary)":"1px solid var(--border-default)" }} onClick={()=>setStatusFilter(statusFilter===s?"":s)}>
              <label>{s}</label>
              <div className="value">{data.filter(d=>d.status===s).length}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="filter-bar">
          <input type="text" className="form-control" placeholder="🔍 Cari nama, no siswa, telepon..." value={search} onChange={e=>{setSearch(e.target.value); setPage(1);}} style={{ flex:1, maxWidth:320 }} />
          <select className="form-control" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value); setPage(1);}}>
            <option value="">Semua Status</option>
            {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={()=>{ setSearch(""); setStatusFilter(""); }}>Reset</button>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>No Siswa</th>
                <th>Nama</th>
                <th>Telepon</th>
                <th>Email</th>
                <th>Kelas Aktif</th>
                <th>Tanggal Daftar</th>
                <th>Status</th>
                <th style={{ width: 110 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign:"center",padding:32,color:"var(--text-muted)" }}>Loading...</td></tr>
              ) : data.length===0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon">👨‍🎓</div>
                    <h3>Belum ada data siswa</h3>
                    <p>Klik "+ Tambah Siswa" atau import CSV untuk mendaftarkan siswa</p>
                  </div>
                </td></tr>
              ) : data.map(s=>(
                <tr key={s.id}>
                  <td style={{ fontFamily:"monospace",fontSize:12,color:"var(--text-muted)" }}>{s.noSiswa}</td>
                  <td style={{ fontWeight:600 }}>{s.nama}</td>
                  <td style={{ fontSize:13 }}>{s.telepon||"—"}</td>
                  <td style={{ fontSize:12,color:"var(--text-muted)" }}>{s.email||"—"}</td>
                  <td>
                    {s.pendaftaran?.length>0 ? (
                      <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
                        {s.pendaftaran.slice(0,2).map((p:any)=>(
                          <span key={p.id} className="badge badge-primary" style={{ fontSize:10 }}>{p.kelas?.namaKelas}</span>
                        ))}
                        {s.pendaftaran.length>2 && <span style={{ fontSize:11,color:"var(--text-muted)" }}>+{s.pendaftaran.length-2} lagi</span>}
                      </div>
                    ) : <span style={{ color:"var(--text-muted)",fontSize:12 }}>—</span>}
                  </td>
                  <td style={{ fontSize:12,color:"var(--text-muted)" }}>{formatDate(s.tanggalDaftar)}</td>
                  <td>
                    <select
                      className={`badge ${STATUS_BADGE[s.status]??""}`}
                      style={{ border:"none",cursor:"pointer",background:"transparent",fontFamily:"inherit",fontWeight:600,fontSize:11 }}
                      value={s.status}
                      onChange={e=>updateStatus(s.id,e.target.value)}
                    >
                      {STATUS_OPTIONS.map(st=><option key={st} value={st}>{st}</option>)}
                    </select>
                  </td>
                  <td>
                    <div style={{ display:"flex", gap:6 }}>
                      <button
                        onClick={() => openEdit(s)}
                        style={{ background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.3)",color:"#818cf8",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:12,fontWeight:600 }}
                        title="Edit"
                      >✏️</button>
                      {role === "ADMIN" && (
                        <button
                          onClick={() => handleDelete(s)}
                          style={{ background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#f87171",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:12,fontWeight:600 }}
                          title="Hapus"
                        >🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <span className="pagination-info">Total: {total} siswa</span>
          <button className="btn btn-secondary btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
          <span style={{ fontSize:13,color:"var(--text-muted)",padding:"0 8px" }}>hal {page}</span>
          <button className="btn btn-secondary btn-sm" disabled={data.length<20} onClick={()=>setPage(p=>p+1)}>Next →</button>
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget){ setShowModal(false); setEditId(null); } }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">{editId ? "✏️ Edit Data Siswa" : "👨‍🎓 Tambah Siswa Baru"}</div>
              <button className="modal-close" onClick={()=>{ setShowModal(false); setEditId(null); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Nama Lengkap</label>
                    <input id="inp-nama-siswa" type="text" className="form-control" placeholder="Nama siswa..." value={form.nama} onChange={e=>setForm(f=>({...f,nama:e.target.value}))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">No. Telepon / WhatsApp</label>
                    <input type="tel" className="form-control" placeholder="08xx-xxxx-xxxx" value={form.telepon} onChange={e=>setForm(f=>({...f,telepon:e.target.value}))} />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" placeholder="email@gmail.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Lahir</label>
                    <input type="date" className="form-control" value={form.tanggalLahir} onChange={e=>setForm(f=>({...f,tanggalLahir:e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Alamat</label>
                  <input type="text" className="form-control" placeholder="Alamat lengkap..." value={form.alamat} onChange={e=>setForm(f=>({...f,alamat:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Catatan</label>
                  <input type="text" className="form-control" placeholder="Catatan tambahan (opsional)..." value={form.catatan} onChange={e=>setForm(f=>({...f,catatan:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>{ setShowModal(false); setEditId(null); }}>Batal</button>
                <button id="btn-simpan-siswa" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Menyimpan..." : editId ? "💾 Simpan Perubahan" : "👨‍🎓 Tambah Siswa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
