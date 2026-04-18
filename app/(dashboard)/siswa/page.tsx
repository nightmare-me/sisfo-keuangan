"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { hasPermission, formatDate } from "@/lib/utils";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  MoreHorizontal, 
  ArrowRight, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Download,
  Upload,
  UserPlus,
  CheckCircle,
  XCircle,
  GraduationCap,
  Edit3,
  Wallet
} from "lucide-react";

const STATUS_OPTIONS = ["AKTIF","TIDAK_AKTIF","ALUMNI"];
const STATUS_BADGE: Record<string,string> = { AKTIF:"badge-success", TIDAK_AKTIF:"badge-danger", ALUMNI:"badge-muted" };
const emptyForm = { nama:"", telepon:"", email:"", alamat:"", tanggalLahir:"", catatan:"" };

export default function SiswaPage() {
  const { data: session } = useSession();
  
  // Granular Matrix Permissions
  const canView = hasPermission(session, "siswa:view");
  const canEdit = hasPermission(session, "siswa:edit");
  const canDelete = hasPermission(session, "siswa:delete");
  const canRefund = hasPermission(session, "refund:view") || hasPermission(session, "refund:approve");

  const userId = (session?.user as any)?.id;
  const isCS = (session?.user as any)?.role === "CS";

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

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedForRefund, setSelectedForRefund] = useState<any>(null);
  const [refundForm, setRefundForm] = useState<any>({ jumlah: "", alasan: "", rekeningTujuan: "", pemasukanId: "", invoiceId: "" });
  const [submittingRefund, setSubmittingRefund] = useState(false);

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

  async function handleDeleteAll() {
    if ((session?.user as any)?.role !== "ADMIN") return;
    const conf = prompt("⚠️ PERINGATAN KERAS: Seluruh data SISWA, PENDAFTARAN, dan PEMBAYARAN TERKAIT akan dihapus permanen.\n\nTindakan ini tidak bisa dibatalkan.\n\nKetik 'HAPUS' (huruf besar) untuk mengonfirmasi:");
    if (conf === "HAPUS") {
      setLoading(true);
      const res = await fetch("/api/siswa?all=true", { method: "DELETE" });
      if (res.ok) fetchData();
      else alert("Gagal menghapus.");
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/siswa", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id, status }) });
    fetchData();
  }

  async function handleRequestRefund(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingRefund(true);
    const res = await fetch("/api/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siswaId: selectedForRefund.id,
        pemasukanId: refundForm.pemasukanId,
        invoiceId: refundForm.invoiceId,
        ...refundForm
      })
    });

    if (res.ok) {
      setShowRefundModal(false);
      setRefundForm({ jumlah: "", alasan: "", rekeningTujuan: "" });
      alert("✅ Pengajuan refund berhasil dikirim ke Finance.");
      fetchData();
    } else {
      alert("❌ Gagal mengajukan refund.");
    }
    setSubmittingRefund(false);
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
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <Users size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Student Administration</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Manajemen Siswa</h1>
          <p className="body-lg" style={{ margin: 0 }}>Kelola data profiling dan status akademik {total} siswa</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {(session?.user as any)?.role === "ADMIN" && (
            <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleDeleteAll}>
              <Trash2 size={16} /> Hapus Semua
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={downloadCsvTemplate} style={{ borderRadius: 'var(--radius-full)' }}>
            <Download size={16} /> Template
          </button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", borderRadius: 'var(--radius-full)', margin: 0 }}>
             <Upload size={16} /> {csvLoading ? "Importing..." : "Import CSV"}
             <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCsvImport} />
          </label>
          <button id="btn-tambah-siswa" className="btn btn-primary" onClick={openAdd} style={{ borderRadius: 'var(--radius-full)' }}>
            <UserPlus size={18} /> Tambah Siswa
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {/* Info banner untuk CS */}
        {isCS && (
          <div style={{ background: "var(--primary-container)", borderRadius: 'var(--radius-xl)', padding: "20px 32px", marginBottom: 32, fontSize: 14, color: "var(--on-primary-container)", display: "flex", alignItems: "center", gap: 16, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ background: 'white', padding: 8, borderRadius: '50%' }}><Users size={20} /></div>
            <span><strong>Portal CS:</strong> Menampilkan siswa yang sedang/pernah anda tangani. Data alumni atau siswa baru tanpa transaksi mungkin dibatasi.</span>
          </div>
        )}

        {/* KPI Grid for Status */}
        <div className="kpi-grid" style={{ marginBottom: 48 }}>
          <div className="kpi-card" onClick={()=>setStatusFilter(statusFilter==="AKTIF"?"":"AKTIF")} style={{ cursor:'pointer', "--kpi-color": "var(--success)", "--kpi-bg": "var(--success-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--success)" }}><CheckCircle size={24} /></div>
            <div className="kpi-label">Siswa Aktif</div>
            <div className="kpi-value">{data.filter(d=>d.status==="AKTIF").length}</div>
          </div>
          <div className="kpi-card" onClick={()=>setStatusFilter(statusFilter==="TIDAK_AKTIF"?"":"TIDAK_AKTIF")} style={{ cursor:'pointer', "--kpi-color": "var(--danger)", "--kpi-bg": "var(--danger-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--danger)" }}><XCircle size={24} /></div>
            <div className="kpi-label">Tidak Aktif</div>
            <div className="kpi-value">{data.filter(d=>d.status==="TIDAK_AKTIF").length}</div>
          </div>
          <div className="kpi-card" onClick={()=>setStatusFilter(statusFilter==="ALUMNI"?"":"ALUMNI")} style={{ cursor:'pointer', "--kpi-color": "var(--secondary)", "--kpi-bg": "var(--surface-container-low)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--secondary)" }}><GraduationCap size={24} /></div>
            <div className="kpi-label">Total Alumni</div>
            <div className="kpi-value">{data.filter(d=>d.status==="ALUMNI").length}</div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="card" style={{ padding: '24px 32px', marginBottom: 32 }}>
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:16, flex:1, minWidth:300 }}>
              <Search size={20} style={{ color:'var(--secondary)' }} />
              <input type="text" className="form-control" placeholder="Cari nama, no siswa, atau telepon..." value={search} onChange={e=>{setSearch(e.target.value); setPage(1);}} style={{ border:'none', borderBottom:'1px solid var(--ghost-border)', background:'transparent', borderRadius:0 }} />
            </div>
            
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <Filter size={18} style={{ color:'var(--primary)' }} />
              <select className="form-control" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value); setPage(1);}} style={{ width:160, padding:'8px 12px' }}>
                <option value="">Semua Status</option>
                {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={()=>{ setSearch(""); setStatusFilter(""); }} style={{ borderRadius:'var(--radius-full)' }}>
              <RefreshCw size={14} /> Reset
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>No Siswa</th>
                <th>Nama Lengkap</th>
                <th>Telepon</th>
                <th>Kelas Aktif</th>
                <th>Tgl Daftar</th>
                <th>Status</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign:"center",padding:48,color:"var(--text-muted)" }}>Loading data...</td></tr>
              ) : data.length===0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Users size={48} /></div>
                    <h3 className="title-lg">Belum ada data siswa</h3>
                    <p>Mulai dengan menambahkan siswa baru atau import dari CSV</p>
                  </div>
                </td></tr>
              ) : data.map(s=>(
                <tr key={s.id}>
                  <td style={{ fontFamily:"monospace", fontSize:12, color:"var(--text-muted)" }}>{s.noSiswa}</td>
                  <td style={{ fontWeight:700, color: 'var(--on-surface)' }}>{s.nama}</td>
                  <td style={{ fontSize:14 }}>{s.telepon||"—"}</td>
                  <td>
                    {s.pendaftaran?.length>0 ? (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {s.pendaftaran.slice(0,2).map((p:any)=>(
                          <span key={p.id} className="badge badge-info" style={{ fontSize:10, padding: '4px 10px' }}>{p.kelas?.namaKelas}</span>
                        ))}
                        {s.pendaftaran.length>2 && <span style={{ fontSize:11, color:"var(--text-muted)", alignSelf:'center' }}>+{s.pendaftaran.length-2}</span>}
                      </div>
                    ) : <span style={{ color:"var(--text-muted)", fontSize:12 }}>—</span>}
                  </td>
                  <td style={{ fontSize:12, color:"var(--text-muted)" }}>{formatDate(s.tanggalDaftar)}</td>
                  <td>
                    <select
                      className={`badge ${STATUS_BADGE[s.status]??""}`}
                      style={{ border:"none", cursor:"pointer", background:"transparent", fontFamily:"inherit", fontWeight:700, fontSize:11, padding: '4px 12px', borderRadius: 100 }}
                      value={s.status}
                      onChange={e=>updateStatus(s.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map(st=><option key={st} value={st}>{st}</option>)}
                    </select>
                  </td>
                  <td className="text-center">
                    <div style={{ display:"flex", gap:8, justifyContent:'center' }}>
                      {canEdit && (
                        <button className="btn btn-secondary btn-icon" onClick={() => openEdit(s)} title="Edit Profil">
                          <Edit3 size={16} />
                        </button>
                      )}
                      {canRefund && (
                        <button className="btn btn-secondary btn-icon" onClick={() => { 
                          setSelectedForRefund(s); 
                          const firstPay = s.pemasukan?.[0];
                          setRefundForm({ 
                            jumlah: firstPay?.hargaFinal || "", 
                            alasan: "", 
                            rekeningTujuan: "",
                            pemasukanId: firstPay?.id || "",
                            invoiceId: firstPay?.invoice?.id || ""
                          });
                          setShowRefundModal(true); 
                        }} style={{ color:"var(--warning)" }} title="Ajukan Refund">
                           <Wallet size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn btn-secondary btn-icon" onClick={() => handleDelete(s)} style={{ color:"var(--danger)" }} title="Hapus Siswa">
                           <Trash2 size={16} />
                        </button>
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

      {/* MODAL REFUND */}
      {showRefundModal && selectedForRefund && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRefundModal(false); }}>
          <div className="modal" style={{ width: 440 }}>
            <div className="modal-header">
              <div className="modal-title">💸 Ajukan Pembatalan / Refund</div>
              <button className="modal-close" onClick={() => setShowRefundModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRequestRefund}>
              <div className="modal-body">
                <div style={{ background: "var(--surface)", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
                   Siswa: <strong>{selectedForRefund.nama}</strong> ({selectedForRefund.noSiswa})
                </div>

                <div className="form-group">
                   <label className="form-label required">Pilih Transaksi yang Direfund</label>
                   <select 
                      className="form-control" 
                      value={refundForm.pemasukanId} 
                      onChange={e => {
                        const p = selectedForRefund.pemasukan?.find((x:any) => x.id === e.target.value);
                        setRefundForm({
                          ...refundForm, 
                          pemasukanId: e.target.value, 
                          invoiceId: p?.invoice?.id || "",
                          jumlah: p?.hargaFinal || refundForm.jumlah
                        });
                      }}
                      required
                   >
                     <option value="">-- Pilih Transaksi --</option>
                     {selectedForRefund.pemasukan?.map((p:any) => (
                       <option key={p.id} value={p.id}>
                         {p.program?.nama || 'Tanpa Program'} - Rp {p.hargaFinal?.toLocaleString()} ({new Date(p.createdAt).toLocaleDateString()})
                       </option>
                     ))}
                   </select>
                </div>

                <div className="form-group">
                   <label className="form-label required">Jumlah Refund (Rp)</label>
                   <input type="number" className="form-control" placeholder="Cth: 500000" value={refundForm.jumlah} onChange={e => setRefundForm({...refundForm, jumlah: e.target.value})} required />
                </div>

                <div className="form-group">
                   <label className="form-label required">Rekening Tujuan</label>
                   <input type="text" className="form-control" placeholder="Cth: BCA 12345678 a.n Nama" value={refundForm.rekeningTujuan} onChange={e => setRefundForm({...refundForm, rekeningTujuan: e.target.value})} required />
                </div>

                <div className="form-group">
                   <label className="form-label required">Alasan Pembatalan</label>
                   <textarea className="form-control" rows={3} placeholder="Sertakan alasan yang valid..." value={refundForm.alasan} onChange={e => setRefundForm({...refundForm, alasan: e.target.value})} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRefundModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submittingRefund}>
                   {submittingRefund ? "Mengirim..." : "Ajukan ke Finance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
