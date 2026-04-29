"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { hasPermission, formatDate } from "@/lib/utils";
import ConfirmModal from "@/components/ui/ConfirmModal";
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
  Wallet,
  FileSpreadsheet
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
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: () => {}, type: "danger" as "danger" | "warning" | "info" });
  const fileRef = useRef<HTMLInputElement>(null);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedForRefund, setSelectedForRefund] = useState<any>(null);
  const [refundForm, setRefundForm] = useState<any>({ jumlah: "", alasan: "", rekeningTujuan: "", pemasukanId: "", invoiceId: "" });
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [summary, setSummary] = useState({ aktif: 0, nonaktif: 0, alumni: 0 });

  function fetchData() {
    const p = new URLSearchParams({ 
      page: String(page), 
      limit: String(limit) 
    });
    if (search) p.set("search", search);
    if (statusFilter) p.set("status", statusFilter);
    // CS hanya melihat siswa yang pernah mereka tangani (via pemasukan)
    if (isCS && userId) p.set("csId", userId);
    setLoading(true);
    fetch(`/api/siswa?${p}`).then(r => r.json()).then(d => { 
      setData(d.data ?? []); 
      setTotal(d.total ?? 0); 
      setTotalPages(d.totalPages || 1);
      setSummary(d.summary ?? { aktif: 0, nonaktif: 0, alumni: 0 });
      setLoading(false); 
    });
  }

  useEffect(()=>{ fetchData(); },[page, limit, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

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
    setConfirmModal({
      show: true,
      title: "Hapus Siswa?",
      message: `Apakah Anda yakin ingin menghapus data siswa "${s.nama}" secara permanen? Data pendaftaran dan riwayat terkait lainnya mungkin akan terdampak.`,
      type: "danger",
      onConfirm: async () => {
        setLoading(true);
        await fetch(`/api/siswa?id=${s.id}`, { method: "DELETE" });
        fetchData();
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  }

  async function handleDeleteAll() {
    if ((session?.user as any)?.role !== "ADMIN") return;
    setConfirmModal({
      show: true,
      title: "HAPUS SEMUA SISWA?",
      message: "⚠️ PERINGATAN KERAS: Seluruh data SISWA, PENDAFTARAN, dan PEMBAYARAN TERKAIT akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.",
      type: "danger",
      onConfirm: async () => {
        setLoading(true);
        const res = await fetch("/api/siswa?all=true", { method: "DELETE" });
        if (res.ok) fetchData();
        setLoading(false);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/siswa", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id, status }) });
    fetchData();
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    
    setConfirmModal({
      show: true,
      title: "Hapus Masal Siswa?",
      message: `Apakah Anda yakin ingin menghapus ${selectedIds.length} siswa terpilih secara permanen?`,
      type: "danger",
      onConfirm: async () => {
        setLoading(true);
        const res = await fetch("/api/siswa", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds })
        });
        
        if (res.ok) {
          setSelectedIds([]);
          fetchData();
          setConfirmModal(prev => ({ ...prev, show: false }));
        } else {
          setLoading(false);
          setConfirmModal({
            show: true,
            title: "Gagal Menghapus",
            message: "Beberapa data gagal dihapus. Silakan periksa koneksi atau hak akses Anda.",
            type: "danger",
            onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
          });
        }
      }
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleSelectAll() {
    if (selectedIds.length === data.length) setSelectedIds([]);
    else setSelectedIds(data.map(s => s.id));
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
      setConfirmModal({
        show: true,
        title: "Pengajuan Terkirim",
        message: "✅ Pengajuan refund berhasil dikirim ke Finance.",
        type: "info",
        onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
      });
      fetchData();
    } else {
      setConfirmModal({
        show: true,
        title: "Gagal Mengajukan",
        message: "❌ Gagal mengajukan refund. Periksa kembali saldo atau data transaksi.",
        type: "danger",
        onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
      });
    }
    setSubmittingRefund(false);
  }


  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <Users size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Student Administration</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Manajemen Siswa</h1>
          <p className="body-lg" style={{ margin: 0 }}>Kelola data profiling dan status akademik {total} siswa</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {(session?.user as any)?.role === "ADMIN" && (
            <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleDeleteAll}>
              <Trash2 size={16} /> Hapus Semua
            </button>
          )}
          {selectedIds.length > 0 && (
            <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleBulkDelete}>
              <Trash2 size={16} /> Hapus ({selectedIds.length})
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setShowImportModal(true)} style={{ borderRadius: 'var(--radius-full)' }}>
             <FileSpreadsheet size={16} /> Import CSV
          </button>
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
            <div className="kpi-value">{summary.aktif}</div>
          </div>
          <div className="kpi-card" onClick={()=>setStatusFilter(statusFilter==="TIDAK_AKTIF"?"":"TIDAK_AKTIF")} style={{ cursor:'pointer', "--kpi-color": "var(--danger)", "--kpi-bg": "var(--danger-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--danger)" }}><XCircle size={24} /></div>
            <div className="kpi-label">Tidak Aktif</div>
            <div className="kpi-value">{summary.nonaktif}</div>
          </div>
          <div className="kpi-card" onClick={()=>setStatusFilter(statusFilter==="ALUMNI"?"":"ALUMNI")} style={{ cursor:'pointer', "--kpi-color": "var(--secondary)", "--kpi-bg": "var(--surface-container-low)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--secondary)" }}><GraduationCap size={24} /></div>
            <div className="kpi-label">Total Alumni</div>
            <div className="kpi-value">{summary.alumni}</div>
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
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={selectedIds.length === data.length && data.length > 0} onChange={handleSelectAll} />
                </th>
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
                <tr><td colSpan={8} style={{ textAlign:"center",padding:48,color:"var(--text-muted)" }}>Loading data...</td></tr>
              ) : data.length===0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Users size={48} /></div>
                    <h3 className="title-lg">Belum ada data siswa</h3>
                    <p>Mulai dengan menambahkan siswa baru atau import dari CSV</p>
                  </div>
                </td></tr>
              ) : data.map(s=>(
                <tr key={s.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} />
                  </td>
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
                        <button className="btn btn-secondary btn-icon" style={{ width: 42, height: 42, borderRadius: 12 }} onClick={() => openEdit(s)} title="Edit Profil">
                          <Edit3 size={20} />
                        </button>
                      )}
                      {canRefund && (
                        <button className="btn btn-secondary btn-icon" style={{ width: 42, height: 42, borderRadius: 12 }} onClick={() => { 
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
                        }} style={{ width: 42, height: 42, borderRadius: 12, color:"var(--warning)" }} title="Ajukan Refund">
                           <Wallet size={20} />
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn btn-secondary btn-icon" style={{ width: 42, height: 42, borderRadius: 12 }} onClick={() => handleDelete(s)} style={{ width: 42, height: 42, borderRadius: 12, color:"var(--danger)" }} title="Hapus Siswa">
                           <Trash2 size={20} />
                        </button>
                      )}
                    </div>
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
        <div className="modal-overlay">
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
      {/* Modal Import CSV */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Upload size={20} style={{ color: 'var(--primary)' }} />
                <span>Import Data Siswa via CSV</span>
              </div>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Gunakan format CSV berikut untuk mengimpor data masal siswa baru.
                </p>
                <div style={{ background: 'var(--surface-container-low)', padding: 12, borderRadius: 8, fontSize: 11, fontFamily: 'monospace', overflowX: 'auto', border: '1px solid var(--ghost-border)' }}>
                  nama,telepon,email,alamat,tanggallahir,catatan
                </div>
                <button 
                  className="btn btn-sm" 
                  style={{ marginTop: 8, fontSize: 11, color: 'var(--primary)', textDecoration: 'underline', padding: 0, background: 'none' }}
                  onClick={() => {
                    const csvContent = "nama,telepon,email,alamat,tanggallahir,catatan\n" +
                                     "Rendi Wijaya,081233445566,rendi@email.com,Jl Kediri No 10,2005-01-20,Siswa pindahan\n" +
                                     "Siska Putri,089977665544,siska@email.com,Kec. Pesantren,2006-05-12,Target IELTS";
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", "template_siswa.csv");
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
                    <Upload size={16} /> {importing ? "Memproses..." : "Pilih File CSV"}
                    <input type="file" accept=".csv" style={{ display: 'none' }} disabled={importing} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        const text = event.target?.result as string;
                        const lines = text.split("\n").filter(l => l.trim());
                        // Smart Delimiter Detection
                        const commaCount = (lines[0].match(/,/g) || []).length;
                        const semicolonCount = (lines[0].match(/;/g) || []).length;
                        const delimiter = semicolonCount > commaCount ? ";" : ",";

                        const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
                        const jsonData = lines.slice(1).map(line => {
                          const values = line.split(delimiter).map(v => v.trim());
                          const obj: any = {};
                          headers.forEach((h, i) => {
                            obj[h] = values[i];
                          });
                          return obj;
                        });

                        setConfirmModal({
                          show: true,
                          title: "Impor Siswa?",
                          message: `Impor ${jsonData.length} data siswa baru dari file CSV ke sistem?`,
                          type: "info",
                          onConfirm: async () => {
                            setShowImportModal(false);
                            setImporting(true);
                            try {
                              const res = await fetch("/api/siswa/import", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(jsonData)
                              });
                              if (res.ok) {
                                setConfirmModal({
                                  show: true,
                                  title: "Import Berhasil",
                                  message: "Berhasil mengimpor data siswa ke sistem!",
                                  type: "success" as any,
                                  onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
                                });
                                fetchData();
                              } else {
                                const err = await res.json();
                                setConfirmModal({
                                  show: true,
                                  title: "Import Gagal",
                                  message: "Gagal impor: " + err.error,
                                  type: "danger",
                                  onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
                                });
                              }
                            } finally {
                              setImporting(false);
                              setConfirmModal(prev => ({ ...prev, show: false }));
                            }
                          }
                        });
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
      <ConfirmModal 
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() => setConfirmModal({ ...confirmModal, show: false })}
        onConfirm={confirmModal.onConfirm}
        type={confirmModal.type}
        loading={loading}
      />
    </div>
  );
}
