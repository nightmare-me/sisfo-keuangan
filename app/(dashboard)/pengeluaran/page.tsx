"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatCurrency, formatDateTime, hasPermission } from "@/lib/utils";
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
  PieChart,
  Upload,
  FileSpreadsheet
} from "lucide-react";

const METODE = ["CASH", "TRANSFER"];

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
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState({ nama: "", color: "#ef4444" });
  const [form, setForm] = useState({
    jumlah: "",
    kategori: "LAINNYA",
    metodeBayar: "CASH",
    keterangan: "",
    tanggal: new Date().toISOString().slice(0, 10),
  });

  function fetchData() {
    const p = new URLSearchParams();
    if (filter.from) p.set("from", filter.from);
    if (filter.to) p.set("to", filter.to+"T23:59:59");
    if (filter.kategori) p.set("kategori", filter.kategori);
    if (filter.metodeBayar) p.set("metodeBayar", filter.metodeBayar);
    setLoading(true);
    fetch(`/api/pengeluaran?${p}`).then(r=>r.json()).then(d=>{
      setData(d.data??[]); setSummary(d.summary??{}); setByKategori(d.byKategori??[]);
      setLoading(false);
    });
  }

  function fetchCategories() {
    fetch("/api/pengeluaran/kategori").then(r => r.json()).then(setKategoriList);
  }

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, [filter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch("/api/pengeluaran",{ method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({...form, jumlah: parseFloat(form.jumlah)}) });
    setSaving(false); setShowModal(false);
    setForm({ jumlah:"", kategori:"LAINNYA", metodeBayar:"CASH", keterangan:"", tanggal: new Date().toISOString().slice(0,10) });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus data pengeluaran ini?")) return;
    await fetch(`/api/pengeluaran?id=${id}`, { method:"DELETE" });
    fetchData();
  }

  async function handleDeleteAll() {
    if (!isAdmin) return;
    const conf = prompt("⚠️ PERINGATAN KERAS: Seluruh data PENGELUARAN akan dihapus permanen.\n\nKetik 'HAPUS' (huruf besar) untuk mengonfirmasi:");
    if (conf === "HAPUS") {
      setLoading(true);
      const res = await fetch("/api/pengeluaran?all=true", { method: "DELETE" });
      if (res.ok) fetchData();
      else alert("Gagal menghapus.");
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Hapus ${selectedIds.length} pengeluaran terpilih secara permanen?`)) return;
    
    setLoading(true);
    const res = await fetch("/api/pengeluaran", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds })
    });
    
    if (res.ok) {
      alert("Pengeluaran terpilih berhasil dihapus.");
      setSelectedIds([]);
      fetchData();
    } else {
      alert("Gagal menghapus beberapa data.");
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleSelectAll() {
    if (selectedIds.length === data.length) setSelectedIds([]);
    else setSelectedIds(data.map(item => item.id));
  }

  const maxKategori = Math.max(...byKategori.map(k=>k._sum.jumlah??0), 1);

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--danger)", marginBottom: 8 }}>
             <TrendingDown size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Financial Management</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Pengeluaran Operasional</h1>
          <p className="body-lg" style={{ margin: 0 }}>Kelola dan lacak pengeluaran operasional lembaga</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
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
          <button id="btn-tambah-pengeluaran" className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)' }} onClick={()=>setShowModal(true)}>
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
              {byKategori.sort((a,b)=>(b._sum.jumlah??0)-(a._sum.jumlah??0)).map(k=>(
                <div key={k.kategori}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:600 }}>{k.kategori}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:"var(--danger)" }}>{formatCurrency(k._sum.jumlah??0)}</span>
                  </div>
                  <div style={{ height:6, background:"var(--bg-elevated)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", background:"var(--danger)", borderRadius:3, width:`${((k._sum.jumlah??0)/maxKategori*100)}%`, transition:"width 0.5s" }} />
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
                <input type="date" className="form-control" value={filter.from} onChange={e=>setFilter(f=>({...f,from:e.target.value}))} style={{ maxWidth:150, padding: '8px 12px' }} />
                <span style={{ color:"var(--text-muted)", fontSize:13 }}>s/d</span>
                <input type="date" className="form-control" value={filter.to} onChange={e=>setFilter(f=>({...f,to:e.target.value}))} style={{ maxWidth:150, padding: '8px 12px' }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <Filter size={18} style={{ color: "var(--primary)" }} />
              <div style={{ display: "flex", gap: 12, flex: 1 }}>
                <select className="form-control" value={filter.kategori} onChange={e=>setFilter(f=>({...f,kategori:e.target.value}))} style={{ padding: '8px 12px' }}>
                  <option value="">Semua Kategori</option>
                  {kategoriList.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                </select>
                <button className="btn btn-secondary btn-icon" onClick={() => setShowCatModal(true)} title="Kelola Kategori">
                  <Plus size={16} />
                </button>
                <select className="form-control" value={filter.metodeBayar} onChange={e=>setFilter(f=>({...f,metodeBayar:e.target.value}))} style={{ padding: '8px 12px' }}>
                  <option value="">Semua Metode</option>
                  {METODE.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={()=>setFilter({from:"",to:"",kategori:"",metodeBayar:""})} style={{ borderRadius: 'var(--radius-full)' }}>
              <RefreshCw size={14} /> Reset
            </button>
          </div>
        </div>

        {/* Table */}
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
                  <td>
                    <span className="badge badge-danger" style={{ padding: '6px 14px', borderRadius: 100 }}>
                      {item.kategori}
                    </span>
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
                    <button className="btn btn-secondary btn-icon" onClick={()=>handleDelete(item.id)} style={{ color:"var(--danger)" }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Tambah Pengeluaran</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Kategori</label>
                    <select id="sel-kategori-pengeluaran" className="form-control" value={form.kategori} onChange={e=>setForm(f=>({...f,kategori:e.target.value}))}>
                      <option value="">-- Pilih Kategori --</option>
                      {kategoriList.map(k=><option key={k.id} value={k.nama}>{k.nama}</option>)}
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
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Batal</button>
                <button id="btn-simpan-pengeluaran" type="submit" className="btn btn-primary" disabled={saving}>{saving?"Menyimpan...":"💸 Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Import CSV */}
      {showImportModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowImportModal(false); }}>
          <div className="modal" style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Upload size={20} style={{ color: 'var(--danger)' }} />
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
                  <p>{KATEGORI.join(", ")}</p>
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
                <FileSpreadsheet size={32} style={{ color: 'var(--danger)', marginBottom: 12 }} />
                <div style={{ marginBottom: 16 }}>
                  <label className="btn btn-primary" style={{ cursor: 'pointer', borderRadius: 'var(--radius-full)', padding: '10px 24px', background: 'var(--danger)' }}>
                    <Upload size={16} /> {csvLoading ? "Memproses..." : "Pilih File CSV"}
                    <input type="file" accept=".csv" style={{ display: 'none' }} disabled={csvLoading} onChange={async (e) => {
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

                        if (confirm(`Impor ${jsonData.length} data pengeluaran?`)) {
                          setCsvLoading(true);
                          try {
                            const res = await fetch("/api/pengeluaran/import", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(jsonData)
                            });
                            if (res.ok) {
                              alert("Berhasil mengimpor data pengeluaran!");
                              setShowImportModal(false);
                              fetchData();
                            } else {
                              const err = await res.json();
                              alert("Gagal impor: " + err.error);
                            }
                          } catch (err) {
                            alert("Terjadi kesalahan saat mengunggah.");
                          } finally {
                            setCsvLoading(false);
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

      {/* MODAL KELOLA KATEGORI */}
      {showCatModal && (
        <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) setShowCatModal(false); }}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Kelola Kategori</div>
              <button className="modal-close" onClick={()=>setShowCatModal(false)}>✕</button>
            </div>
            <div className="modal-body">
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
                 {kategoriList.map(cat => (
                   <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-container-low)', borderRadius: 8 }}>
                     <span style={{ fontSize: 13, fontWeight: 600 }}>{cat.nama}</span>
                     <button className="btn btn-icon" style={{ color: 'var(--danger)', padding: 4 }} onClick={async () => {
                       if(confirm(`Hapus kategori "${cat.nama}"?`)) {
                         await fetch(`/api/pengeluaran/kategori?id=${cat.id}`, { method:"DELETE" });
                         fetchCategories();
                       }
                     }}><Trash2 size={14} /></button>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
