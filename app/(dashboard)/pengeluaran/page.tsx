"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatCurrency, formatDateTime, hasPermission } from "@/lib/utils";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { 
  TrendingDown, 
  Activity, 
  Plus, 
  Search, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Wallet,
  CreditCard,
  Trash2,
  Edit2,
  PieChart,
  Upload,
  FileSpreadsheet,
  Camera,
  X
} from "lucide-react";

const METODE = ["CASH", "TRANSFER"];
const PIE_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];

export default function PengeluaranPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role?.toUpperCase();
  const isAdmin = role === "ADMIN";
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalPengeluaran:0, jumlahTransaksi:0 });
  const [byKategori, setByKategori] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState({ from:"", to:"", kategori:"", metodeBayar:"" });
  const [editId, setEditId] = useState<string|null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingNotes, setExistingNotes] = useState<any[]>([]);
  const [newCat, setNewCat] = useState({ nama: "", color: "#ef4444" });
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: () => {}, type: "danger" as "danger" | "warning" | "info" | "success" });
  const [form, setForm] = useState({
    jumlah: "",
    kategori: "LAINNYA",
    metodeBayar: "CASH",
    keterangan: "",
    tanggal: new Date().toISOString().slice(0, 10),
  });

  function openEdit(item: any) {
    setEditId(item.id);
    setForm({
      jumlah: item.jumlah.toString(),
      kategori: item.kategori,
      metodeBayar: item.metodeBayar,
      keterangan: item.keterangan || "",
      tanggal: new Date(item.tanggal).toISOString().slice(0, 10),
    });
    setExistingNotes(item.arsipNota || []);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setShowModal(true);
  }

  function resetForm() {
    setEditId(null);
    setForm({ jumlah:"", kategori:"LAINNYA", metodeBayar:"CASH", keterangan:"", tanggal: new Date().toISOString().slice(0,10) });
    setSelectedFiles([]);
    setPreviewUrls([]);
    setExistingNotes([]);
  }

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(25);

  function fetchData() {
    const p = new URLSearchParams();
    if (filter.from) p.set("from", filter.from);
    if (filter.to) p.set("to", filter.to+"T23:59:59");
    if (filter.kategori) p.set("kategori", filter.kategori);
    if (filter.metodeBayar) p.set("metodeBayar", filter.metodeBayar);
    
    p.set("page", String(page));
    p.set("limit", String(limit));

    setLoading(true);
    fetch(`/api/pengeluaran?${p}`)
      .then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error || "Gagal memuat data");
        }
        return r.json();
      })
      .then(d => {
        setData(d.data ?? []);
        setSummary(d.summary ?? { totalPengeluaran: 0, jumlahTransaksi: 0 });
        setByKategori(d.byKategori ?? []);
        setTotalPages(d.totalPages ?? 1);
      })
      .catch(err => {
        console.error("Fetch Data Error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function fetchCategories() {
    fetch("/api/pengeluaran/kategori").then(r => r.json()).then(setKategoriList);
  }

  async function syncCategories() {
    setSaving(true);
    await fetch("/api/pengeluaran/kategori"); // Ini akan memicu ensureCategories di server
    fetchCategories();
    setSaving(false);
  }

  useEffect(() => {
    fetchData();
  }, [filter, page, limit]);

  useEffect(() => {
    fetchCategories();
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
      const newUrls = files.map(f => URL.createObjectURL(f));
      setPreviewUrls(prev => [...prev, ...newUrls]);
    }
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); 
    
    if (!editId && selectedFiles.length === 0) {
      setConfirmModal({
        show: true,
        title: "Nota Wajib Diisi",
        message: "Wajib menyertakan minimal 1 foto nota untuk pengeluaran baru!",
        type: "warning",
        onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
      });
      return;
    }

    setSaving(true);
    try {
      let uploadedUrls: string[] = [];
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach(f => formData.append("file", f));
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Gagal upload gambar");
        uploadedUrls = uploadData.urls;
      }

      const method = editId ? "PUT" : "POST";
      const body: any = { 
        ...form, 
        jumlah: parseFloat(form.jumlah),
        urls: uploadedUrls.length > 0 ? uploadedUrls : undefined
      };
      if (editId) body.id = editId;

      const res = await fetch("/api/pengeluaran",{ 
        method, 
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(body) 
      });
      const resJson = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(`${resJson.error || "Error"}: ${resJson.details || "Gagal menyimpan pengeluaran"}`);

      setSaving(false); setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      setConfirmModal({
        show: true,
        title: "Gagal Menyimpan",
        message: err.message || "Terjadi kesalahan saat menyimpan data pengeluaran.",
        type: "danger",
        onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
      });
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setConfirmModal({
      show: true,
      title: "Hapus Pengeluaran?",
      message: "Apakah Anda yakin ingin menghapus data pengeluaran ini secara permanen?",
      type: "danger",
      onConfirm: async () => {
        setLoading(true);
        await fetch(`/api/pengeluaran?id=${id}`, { method:"DELETE" });
        fetchData();
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  }

  async function handleDeleteAll() {
    if (!isAdmin) return;
    setConfirmModal({
      show: true,
      title: "HAPUS SEMUA DATA?",
      message: "⚠️ PERINGATAN KERAS: Seluruh data PENGELUARAN akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.",
      type: "danger",
      onConfirm: async () => {
        setLoading(true);
        const res = await fetch("/api/pengeluaran?all=true", { method: "DELETE" });
        if (res.ok) fetchData();
        setLoading(false);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    
    setConfirmModal({
      show: true,
      title: "Hapus Masal Pengeluaran?",
      message: `Apakah Anda yakin ingin menghapus ${selectedIds.length} pengeluaran terpilih secara permanen?`,
      type: "danger",
      onConfirm: async () => {
        setLoading(true);
        const res = await fetch("/api/pengeluaran", {
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
    else setSelectedIds(data.map(item => item.id));
  }

  const maxKategori = Math.max(...byKategori.map(k=>k._sum.jumlah??0), 1);
  const importCategoryNames = Array.isArray(kategoriList)
    ? kategoriList.map((kategori) => kategori.nama)
    : [];

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--danger)", marginBottom: 8 }}>
             <TrendingDown size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Financial Management</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Pengeluaran Operasional</h1>
          <p className="body-lg" style={{ margin: 0 }}>Kelola dan lacak pengeluaran operasional lembaga</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {isAdmin && (
            <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleDeleteAll}>
              <Trash2 size={16} /> Hapus Semua
            </button>
          )}
          {selectedIds.length > 0 && (
            <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleBulkDelete}>
              <Trash2 size={16} /> Hapus ({selectedIds.length})
            </button>
          )}
          <button className="btn btn-secondary" style={{ borderRadius: 'var(--radius-full)' }} onClick={() => setShowImportModal(true)}>
            <FileSpreadsheet size={16} /> Import CSV
          </button>
          <button id="btn-tambah-pengeluaran" className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)' }} onClick={()=>{ resetForm(); setShowModal(true); }}>
            <Plus size={18} /> Tambah Pengeluaran
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {/* KPI Grid */}
        <div className="kpi-grid" style={{ marginBottom: 32 }}>
          <div className="kpi-card" style={{ "--kpi-color": "var(--danger)", "--kpi-bg": "var(--danger-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--danger)" }}><TrendingDown size={24} /></div>
            <div className="kpi-label">Total Pengeluaran</div>
            <div className="kpi-value">{formatCurrency(summary.totalPengeluaran)}</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--info)", "--kpi-bg": "var(--info-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--info)" }}><Activity size={24} /></div>
            <div className="kpi-label">Jumlah Transaksi</div>
            <div className="kpi-value">{summary.jumlahTransaksi} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>trx</span></div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--warning)", "--kpi-bg": "var(--warning-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--warning)" }}><PieChart size={24} /></div>
            <div className="kpi-label">Kategori Aktif</div>
            <div className="kpi-value">{byKategori.length}</div>
          </div>
        </div>

        {/* Breakdown per Kategori */}
        {byKategori.length > 0 && (
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-header"><div className="card-title">Breakdown per Kategori</div></div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {byKategori.sort((a,b)=>(b._sum.jumlah??0)-(a._sum.jumlah??0)).map((k, i)=>(
                <div key={k.kategori}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:600 }}>{k.kategori}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:PIE_COLORS[i%PIE_COLORS.length] }}>{formatCurrency(k._sum.jumlah??0)}</span>
                  </div>
                  <div style={{ height:6, background:"var(--bg-elevated)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", background:PIE_COLORS[i%PIE_COLORS.length], borderRadius:3, width:`${((k._sum.jumlah??0)/maxKategori*100)}%`, transition:"width 0.5s" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Section */}
        <div className="card" style={{ padding: '24px 32px', marginBottom: 32 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Calendar size={18} style={{ color: "var(--primary)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="date" className="form-control" value={filter.from} onChange={e=>{setFilter(f=>({...f,from:e.target.value})); setPage(1);}} style={{ maxWidth:150, padding: '8px 12px' }} />
                <span style={{ color:"var(--text-muted)", fontSize:13 }}>s/d</span>
                <input type="date" className="form-control" value={filter.to} onChange={e=>{setFilter(f=>({...f,to:e.target.value})); setPage(1);}} style={{ maxWidth:150, padding: '8px 12px' }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <Filter size={18} style={{ color: "var(--primary)" }} />
              <div style={{ display: "flex", gap: 12, flex: 1 }}>
                <select className="form-control" value={filter.kategori} onChange={e=>{setFilter(f=>({...f,kategori:e.target.value})); setPage(1);}} style={{ padding: '8px 12px' }}>
                  <option value="">Semua Kategori</option>
                  {Array.isArray(kategoriList) && kategoriList.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                </select>
                <button className="btn btn-secondary btn-icon" onClick={() => setShowCatModal(true)} title="Kelola Kategori">
                  <Plus size={16} />
                </button>
                <select className="form-control" value={filter.metodeBayar} onChange={e=>{setFilter(f=>({...f,metodeBayar:e.target.value})); setPage(1);}} style={{ padding: '8px 12px' }}>
                  <option value="">Semua Metode</option>
                  {METODE.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={()=>{setFilter({from:"",to:"",kategori:"",metodeBayar:""}); setPage(1);}} style={{ borderRadius: 'var(--radius-full)' }}>
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
                <th>Tanggal</th>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th>Metode</th>
                <th>Dibuat Oleh</th>
                <th className="text-right">Jumlah</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign:"center",padding:48,color:"var(--text-muted)" }}>Loading data...</td></tr>
              ) : data.length===0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><TrendingDown size={48} /></div>
                    <h3 className="title-lg">Belum ada data pengeluaran</h3>
                    <p>Klik "+ Tambah Pengeluaran" untuk mencatat pengeluaran operasional</p>
                  </div>
                </td></tr>
              ) : data.map(item=>(
                <tr key={item.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                  </td>
                  <td style={{ fontSize:14, color:"var(--text-muted)", whiteSpace:"nowrap" }}>{formatDateTime(item.tanggal)}</td>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="badge badge-danger" style={{ padding: '6px 14px', borderRadius: 100 }}>
                      {item.kategori}
                    </span>
                    {(!item.arsipNota || item.arsipNota.length === 0) && (
                      <span className="badge badge-warning" style={{ fontSize: 10, padding: '4px 8px', borderRadius: 100 }} title="Tanpa Nota">Tanpa Nota</span>
                    )}
                  </td>
                  <td style={{ color:"var(--text-secondary)", fontSize:14 }}>{item.keterangan||"—"}</td>
                  <td>
                    <span className={`badge ${item.metodeBayar==="CASH"?"badge-warning":"badge-info"}`} style={{ padding: '6px 14px', borderRadius: 100 }}>
                      {item.metodeBayar==="CASH" ? <Wallet size={12} style={{marginRight:6}} /> : <CreditCard size={12} style={{marginRight:6}} />}
                      {item.metodeBayar}
                    </span>
                  </td>
                  <td style={{ fontSize:14, color:"var(--text-muted)" }}>{item.user?.name??"—"}</td>
                  <td className="text-right" style={{ fontWeight:800, color:"var(--danger)", fontSize: 16 }}>{formatCurrency(item.jumlah)}</td>
                  <td className="text-center">
                    <div style={{ display: 'flex', gap:8, justifyContent: 'center' }}>
                      <button className="btn btn-secondary btn-icon" style={{ width: 42, height: 42, borderRadius: 12, color: "var(--primary)" }} onClick={()=>openEdit(item)}>
                        <Edit2 size={20} />
                      </button>
                      <button className="btn btn-secondary btn-icon" style={{ width: 42, height: 42, borderRadius: 12, color: "var(--danger)" }} onClick={()=>handleDelete(item.id)}>
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--ghost-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)', marginTop: 24, borderRadius: '0 0 12px 12px' }}>
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
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Halaman <span style={{ fontWeight: 800, color: 'var(--on-surface)' }}>{page}</span> dari <span style={{ fontWeight: 800, color: 'var(--on-surface)' }}>{totalPages}</span>
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={page === 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Sebelumnya
              </button>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                  .map((p, i, arr) => (
                    <div key={p} style={{ display: 'flex', gap: 4 }}>
                      {i > 0 && arr[i-1] !== p - 1 && <span style={{ padding: '0 4px' }}>...</span>}
                      <button 
                        className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ minWidth: 36 }}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </div>
                  ))}
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={page === totalPages} 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editId ? "Edit Pengeluaran" : "Tambah Pengeluaran"}</div>
              <button className="modal-close" onClick={()=>{ setShowModal(false); resetForm(); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Bagian Upload Nota */}
                <div style={{ border: '2px dashed var(--ghost-border)', borderRadius: 12, padding: 24, textAlign: 'center', background: 'var(--surface-container-lowest)', marginBottom: 24 }}>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: previewUrls.length > 0 || existingNotes.length > 0 ? 20 : 0 }}>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', borderRadius: 'var(--radius-full)' }}>
                      <Camera size={16} style={{ marginRight: 8 }} /> Ambil Foto / Kamera
                      <input type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                    </label>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', borderRadius: 'var(--radius-full)' }}>
                      <Upload size={16} style={{ marginRight: 8 }} /> Upload Gambar
                      <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                    </label>
                  </div>
                  
                  {(previewUrls.length > 0 || existingNotes.length > 0) && (
                    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, justifyContent: (previewUrls.length + existingNotes.length) > 2 ? 'flex-start' : 'center' }}>
                      {existingNotes.map((nota, idx) => (
                        <div key={`exist-${idx}`} style={{ position: 'relative', width: 100, height: 120, flexShrink: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--ghost-border)' }}>
                          <img src={nota.urlFile} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 10, padding: 4 }}>Tersimpan</div>
                        </div>
                      ))}
                      {previewUrls.map((url, idx) => (
                        <div key={`new-${idx}`} style={{ position: 'relative', width: 100, height: 120, flexShrink: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--ghost-border)' }}>
                          <img src={url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" onClick={() => removeFile(idx)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {previewUrls.length === 0 && existingNotes.length === 0 && (
                     <p style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>*Wajib menyertakan minimal 1 foto nota</p>
                  )}
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Kategori</label>
                    <select id="sel-kategori-pengeluaran" className="form-control" value={form.kategori} onChange={e=>setForm(f=>({...f,kategori:e.target.value}))}>
                      <option value="">-- Pilih Kategori --</option>
                      {Array.isArray(kategoriList) && kategoriList.map(k=><option key={k.id} value={k.nama}>{k.nama}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Metode Pembayaran</label>
                    <select id="sel-metode-pengeluaran" className="form-control" value={form.metodeBayar} onChange={e=>setForm(f=>({...f,metodeBayar:e.target.value}))}>
                      {METODE.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Jumlah (Rp)</label>
                    <input id="inp-jumlah-pengeluaran" type="number" className="form-control" placeholder="0" value={form.jumlah} onChange={e=>setForm(f=>({...f,jumlah:e.target.value}))} required min={1} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Tanggal</label>
                    <input type="date" className="form-control" value={form.tanggal} onChange={e=>setForm(f=>({...f,tanggal:e.target.value}))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Keterangan</label>
                  <input type="text" className="form-control" placeholder="Detail pengeluaran..." value={form.keterangan} onChange={e=>setForm(f=>({...f,keterangan:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>{ setShowModal(false); resetForm(); }}>Batal</button>
                <button id="btn-simpan-pengeluaran" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Menyimpan..." : (editId ? "💾 Simpan Perubahan" : "💸 Simpan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Import CSV */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Upload size={20} style={{ color: '#facd00' }} />
                <span>Import Pengeluaran Operasional</span>
              </div>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Silakan gunakan format kolom berikut:
                </p>
                <div style={{ background: 'var(--surface-container-low)', padding: 12, borderRadius: 8, fontSize: 11, fontFamily: 'monospace', overflowX: 'auto', border: '1px solid var(--ghost-border)', marginBottom: 16 }}>
                  tanggal,kategori,jumlah,metode,keterangan
                </div>
                
                <div style={{ padding: 12, background: 'var(--warning-bg)', borderRadius: 8, fontSize: 11 }}>
                  <p style={{ fontWeight: 700, marginBottom: 4, color: 'var(--on-warning-container)' }}>⚠️ Kategori Valid (Pilih salah satu):</p>
                  <p>{importCategoryNames.length > 0 ? importCategoryNames.join(", ") : "Belum ada kategori tersedia."}</p>
                </div>

                <button 
                  className="btn btn-sm" 
                  style={{ marginTop: 12, fontSize: 11, color: 'var(--primary)', textDecoration: 'underline', padding: 0, background: 'none' }}
                  onClick={() => {
                    const csvContent = "tanggal,kategori,jumlah,metode,keterangan\n" +
                                     "2024-03-01,ATK,150000,CASH,Beli Kertas & Tinta\n" +
                                     "2024-03-02,UTILITAS,500000,TRANSFER,Listrik & WiFi Bulanan";
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", "template_pengeluaran.csv");
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
                <FileSpreadsheet size={32} style={{ color: '#facd00', marginBottom: 12 }} />
                <div style={{ marginBottom: 16 }}>
                  <label className="btn btn-primary" style={{ cursor: 'pointer', borderRadius: 'var(--radius-full)', padding: '10px 24px', background: '#facd00', color: '#000', fontWeight: 'bold' }}>
                    <Upload size={16} /> {csvLoading ? "Memproses..." : "Pilih File CSV"}
                    <input type="file" accept=".csv" style={{ display: 'none' }} disabled={csvLoading} onChange={async (e) => {
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
                          title: "Impor Pengeluaran?",
                          message: `Impor ${jsonData.length} data pengeluaran dari file CSV ke sistem?`,
                          type: "info",
                          onConfirm: async () => {
                            setShowImportModal(false);
                            setCsvLoading(true);
                            try {
                              const res = await fetch("/api/pengeluaran/import", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(jsonData)
                              });
                                if (res.ok) {
                                  setConfirmModal({
                                    show: true,
                                    title: "Import Berhasil",
                                    message: "Berhasil mengimpor data pengeluaran ke sistem!",
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
                              setCsvLoading(false);
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

      {/* MODAL KELOLA KATEGORI */}
      {showCatModal && (
        <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) setShowCatModal(false); }}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Kelola Kategori</div>
              <button className="modal-close" onClick={()=>setShowCatModal(false)}>✕</button>
            </div>
            <div className="modal-body">
               <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                 <button className="btn btn-secondary w-full" onClick={syncCategories} disabled={saving} style={{ background: 'var(--info-bg)', color: 'var(--info)', borderColor: 'var(--info)' }}>
                   {saving ? "Memproses..." : "🔄 Sinkronkan Kategori Standar"}
                 </button>
               </div>
               <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                 <input type="text" className="form-control" placeholder="Nama kategori baru..." value={newCat.nama} onChange={e=>setNewCat({...newCat, nama: e.target.value})} />
                 <button className="btn btn-primary" onClick={async () => {
                   if (!newCat.nama) return;
                   await fetch("/api/pengeluaran/kategori", { 
                     method:"POST", 
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify(newCat) 
                   });
                   setNewCat({ nama: "", color: "#ef4444" });
                   fetchCategories();
                 }}>Tambah</button>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                 {Array.isArray(kategoriList) && kategoriList.map(cat => (
                   <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-container-low)', borderRadius: 8 }}>
                     <span style={{ fontSize: 13, fontWeight: 600 }}>{cat.nama}</span>
                     <button className="btn btn-icon" style={{ color: 'var(--danger)', padding: 4 }} onClick={async () => {
                        setConfirmModal({
                          show: true,
                          title: "Hapus Kategori?",
                          message: `Hapus kategori "${cat.nama}"? Ini tidak akan menghapus data transaksi yang sudah ada.`,
                          type: "danger",
                          onConfirm: async () => {
                            await fetch(`/api/pengeluaran/kategori?id=${cat.id}`, { method:"DELETE" });
                            fetchCategories();
                            setConfirmModal(prev => ({ ...prev, show: false }));
                          }
                        });
                      }}><Trash2 size={20} /></button>
                   </div>
                 ))}
               </div>
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
