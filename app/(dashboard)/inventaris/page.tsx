"use client";

import { useEffect, useState, useRef } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Archive, 
  AlertTriangle, 
  AlertCircle,
  Package,
  ArrowRight,
  MoreVertical,
  Edit2,
  Trash2,
  Boxes,
  Zap,
  Download,
  Upload,
  FileSpreadsheet
} from "lucide-react";

const KONDISI_BADGE: Record<string,string> = { BAIK:"badge-success", RUSAK_RINGAN:"badge-warning", RUSAK_BERAT:"badge-danger" };

export default function InventarisPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role?.toUpperCase();
  const isAdmin = role === "ADMIN";
  const fileRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<any[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [kondisiFilter, setKondisiFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState({ nama:"", kategori:"", jumlah:"0", satuan:"pcs", hargaBeli:"", kondisi:"BAIK", tanggalBeli:"", keterangan:"", stokMinimum:"1" });

  function fetchData() {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (kondisiFilter) p.set("kondisi", kondisiFilter);
    if (lowStockOnly) p.set("lowStock", "true");
    setLoading(true);
    fetch(`/api/inventaris?${p}`).then(r=>r.json()).then(d=>{ setData(d.data??[]); setLowStockCount(d.lowStockCount??0); setLoading(false); });
  }

  useEffect(()=>{ fetchData(); },[search, kondisiFilter, lowStockOnly]);

  const totalNilai = data.reduce((acc, item) => acc + (item.hargaBeli || 0) * (item.jumlah || 0), 0);
  const totalItemUnique = data.length;

  function openEdit(item: any) {
    setEditItem(item);
    setForm({ nama:item.nama, kategori:item.kategori, jumlah:String(item.jumlah), satuan:item.satuan, hargaBeli:item.hargaBeli?String(item.hargaBeli):"", kondisi:item.kondisi, tanggalBeli:item.tanggalBeli?item.tanggalBeli.slice(0,10):"", keterangan:item.keterangan??"", stokMinimum:String(item.stokMinimum) });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const body = { ...form, jumlah: parseInt(form.jumlah), hargaBeli: form.hargaBeli?parseFloat(form.hargaBeli):null, stokMinimum: parseInt(form.stokMinimum) };
    if (editItem) {
      await fetch("/api/inventaris",{ method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id:editItem.id, ...body }) });
    } else {
      await fetch("/api/inventaris",{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) });
    }
    setSaving(false); setShowModal(false); setEditItem(null);
    setForm({ nama:"", kategori:"", jumlah:"0", satuan:"pcs", hargaBeli:"", kondisi:"BAIK", tanggalBeli:"", keterangan:"", stokMinimum:"1" });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus barang inventaris ini?")) return;
    await fetch(`/api/inventaris?id=${id}`,{ method:"DELETE" });
    fetchData();
  }

  async function handleDeleteAll() {
    if (!isAdmin) return;
    const conf = prompt("⚠️ PERINGATAN KERAS: Seluruh data INVENTARIS akan dihapus permanen.\n\nKetik 'HAPUS' (huruf besar) untuk mengonfirmasi:");
    if (conf === "HAPUS") {
      setLoading(true);
      const res = await fetch("/api/inventaris?all=true", { method: "DELETE" });
      if (res.ok) fetchData();
      else alert("Gagal menghapus.");
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Hapus ${selectedIds.length} item inventaris terpilih secara permanen?`)) return;
    
    setLoading(true);
    const res = await fetch("/api/inventaris", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds })
    });
    
    if (res.ok) {
      alert("Item terpilih berhasil dihapus.");
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


  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--warning)", marginBottom: 8 }}>
             <Archive size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Administrative Assets</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Daftar Inventaris</h1>
          <p className="body-lg" style={{ margin: 0 }}>Monitoring stok perlengkapan dan manajemen aset lembaga operasional</p>
        </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
            <button className="btn btn-secondary btn-sm" onClick={() => setShowImportModal(true)} style={{ borderRadius: 'var(--radius-full)' }}>
              <FileSpreadsheet size={16} /> Import CSV
            </button>
            <button id="btn-tambah-inventaris" className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)' }} onClick={()=>{ setEditItem(null); setShowModal(true); }}>
              <Plus size={18} /> Tambah Barang
            </button>
          </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {/* KPI Grid */}
        <div className="kpi-grid" style={{ marginBottom: 48 }}>
          <div className="kpi-card" style={{ "--kpi-color": "var(--primary)", "--kpi-bg": "var(--primary-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--primary)" }}><Archive size={24} /></div>
            <div className="kpi-label">Jumlah Aset</div>
            <div className="kpi-value">{totalItemUnique} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>Item</span></div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--danger)", "--kpi-bg": "var(--danger-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--danger)" }}><AlertCircle size={24} /></div>
            <div className="kpi-label">Stok Menipis</div>
            <div className="kpi-value">{lowStockCount}</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--success)", "--kpi-bg": "var(--success-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--success)" }}><Zap size={24} /></div>
            <div className="kpi-label">Estimasi Nilai</div>
            <div className="kpi-value">{formatCurrency(totalNilai)}</div>
          </div>
        </div>

        {lowStockCount > 0 && (
          <div className="card" style={{ marginBottom: 32, background: 'linear-gradient(to right, rgba(239,68,68,0.05), transparent)', borderLeft: '4px solid var(--danger)', padding: '16px 24px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: 'var(--danger)' }}>
               <AlertTriangle size={20} />
               <span style={{ fontWeight: 600 }}>Peringatan: {lowStockCount} item inventaris berada di bawah ambang batas stok minimum.</span>
            </div>
          </div>
        )}

        {/* Filter Section */}
        <div className="card" style={{ padding: '20px 24px', marginBottom: 32 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 250 }}>
               <Search size={18} style={{ color: "var(--secondary)" }} />
               <input type="text" className="form-control" placeholder="Cari nama barang..." value={search} onChange={e=>setSearch(e.target.value)} style={{ border: 'none', borderBottom: '1px solid var(--ghost-border)', background: 'transparent', borderRadius: 0 }} />
            </div>
            <select className="form-control" value={kondisiFilter} onChange={e=>setKondisiFilter(e.target.value)} style={{ width: 180, padding: '8px 16px', borderRadius: 100 }}>
              <option value="">Semua Kondisi</option>
              <option value="BAIK">Kondisi Baik</option>
              <option value="RUSAK_RINGAN">Rusak Ringan</option>
              <option value="RUSAK_BERAT">Rusak Berat</option>
            </select>
            <label style={{ display:"flex",alignItems:"center",gap:10,fontSize:14,color:"var(--on-surface)",cursor:"pointer",whiteSpace:"nowrap", fontWeight: 600 }}>
              <input type="checkbox" checked={lowStockOnly} onChange={e=>setLowStockOnly(e.target.checked)} style={{ width: 18, height: 18 }} />
              Hanya Stok Menipis
            </label>
            <button className="btn btn-secondary btn-sm" onClick={()=>{ setSearch(""); setKondisiFilter(""); setLowStockOnly(false); }} style={{ borderRadius: 'var(--radius-full)' }}>
              <RefreshCw size={14} /> Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={selectedIds.length === data.length && data.length > 0} onChange={handleSelectAll} />
                </th>
                <th>Nama Barang</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Stok Min.</th>
                <th>Kondisi</th>
                <th>Harga Beli</th>
                <th>Tanggal Beli</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign:"center",padding:32,color:"var(--text-muted)" }}>Loading...</td></tr>
              ) : data.length===0 ? (
                <tr><td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <h3>Belum ada data inventaris</h3>
                    <p>Klik "+ Tambah Barang" untuk mencatat aset</p>
                  </div>
                </td></tr>
              ) : data.map(item=>(
                <tr key={item.id} style={{ background: item.isLowStock ? "rgba(239,68,68,0.04)" : "" }}>
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                  </td>
                  <td>
                    <div style={{ fontWeight:600 }}>{item.nama}</div>
                    {item.keterangan && <div style={{ fontSize:11,color:"var(--text-muted)" }}>{item.keterangan}</div>}
                  </td>
                  <td style={{ fontSize:12 }}>{item.kategori}</td>
                  <td>
                    <span style={{ fontWeight:700, color: item.isLowStock ? "var(--danger)" : "var(--success)", fontSize:15 }}>
                      {item.jumlah}
                    </span>
                    <span style={{ color:"var(--text-muted)",fontSize:12 }}> {item.satuan}</span>
                    {item.isLowStock && <span style={{ marginLeft:6 }}>⚠️</span>}
                  </td>
                  <td style={{ color:"var(--text-muted)",fontSize:12 }}>{item.stokMinimum} {item.satuan}</td>
                  <td><span className={`badge ${KONDISI_BADGE[item.kondisi]??""}`}>{item.kondisi.replace("_"," ")}</span></td>
                  <td>{item.hargaBeli ? formatCurrency(item.hargaBeli) : "—"}</td>
                  <td style={{ fontSize:12,color:"var(--text-muted)" }}>{item.tanggalBeli ? formatDate(item.tanggalBeli) : "—"}</td>
                  <td>
                    <div style={{ display:"flex",gap:6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(item)}>✏</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(item.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget){ setShowModal(false); setEditItem(null); } }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">{editItem?"Edit Barang":"Tambah Barang Inventaris"}</div>
              <button className="modal-close" onClick={()=>{ setShowModal(false); setEditItem(null); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Nama Barang</label>
                    <input id="inp-nama-inventaris" type="text" className="form-control" placeholder="Nama barang..." value={form.nama} onChange={e=>setForm(f=>({...f,nama:e.target.value}))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <input type="text" className="form-control" placeholder="Furnitur, Elektronik, ATK..." value={form.kategori} onChange={e=>setForm(f=>({...f,kategori:e.target.value}))} />
                  </div>
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Jumlah</label>
                    <input type="number" className="form-control" value={form.jumlah} onChange={e=>setForm(f=>({...f,jumlah:e.target.value}))} min={0} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Satuan</label>
                    <input type="text" className="form-control" placeholder="pcs, unit, rim..." value={form.satuan} onChange={e=>setForm(f=>({...f,satuan:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stok Minimum</label>
                    <input type="number" className="form-control" value={form.stokMinimum} onChange={e=>setForm(f=>({...f,stokMinimum:e.target.value}))} min={0} />
                  </div>
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Kondisi</label>
                    <select className="form-control" value={form.kondisi} onChange={e=>setForm(f=>({...f,kondisi:e.target.value}))}>
                      <option value="BAIK">Baik</option>
                      <option value="RUSAK_RINGAN">Rusak Ringan</option>
                      <option value="RUSAK_BERAT">Rusak Berat</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Harga Beli (Rp)</label>
                    <input type="number" className="form-control" placeholder="0" value={form.hargaBeli} onChange={e=>setForm(f=>({...f,hargaBeli:e.target.value}))} min={0} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Beli</label>
                    <input type="date" className="form-control" value={form.tanggalBeli} onChange={e=>setForm(f=>({...f,tanggalBeli:e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Keterangan</label>
                  <input type="text" className="form-control" placeholder="Keterangan tambahan..." value={form.keterangan} onChange={e=>setForm(f=>({...f,keterangan:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>{ setShowModal(false); setEditItem(null); }}>Batal</button>
                <button id="btn-simpan-inventaris" type="submit" className="btn btn-primary" disabled={saving}>{saving?"Menyimpan...":"📦 Simpan"}</button>
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
                <Upload size={20} style={{ color: 'var(--warning)' }} />
                <span>Import Data Inventaris</span>
              </div>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Gunakan format CSV berikut untuk mengimpor aset:
                </p>
                <div style={{ background: 'var(--surface-container-low)', padding: 12, borderRadius: 8, fontSize: 11, fontFamily: 'monospace', overflowX: 'auto', border: '1px solid var(--ghost-border)', marginBottom: 16 }}>
                  nama,kategori,jumlah,satuan,hargabeli,kondisi,tanggalbeli,stokminimum
                </div>
                
                <div style={{ padding: 12, background: 'var(--surface-container-low)', borderRadius: 8, fontSize: 11 }}>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>💡 Tips Kondisi:</p>
                  <p>Gunakan: <strong>BAIK</strong>, <strong>RUSAK_RINGAN</strong>, atau <strong>RUSAK_BERAT</strong></p>
                </div>

                <button 
                  className="btn btn-sm" 
                  style={{ marginTop: 12, fontSize: 11, color: 'var(--primary)', textDecoration: 'underline', padding: 0, background: 'none' }}
                  onClick={() => {
                    const csvContent = "nama,kategori,jumlah,satuan,hargabeli,kondisi,tanggalbeli,stokminimum\n" +
                                     "Laptop Asus,Elektronik,5,unit,7500000,BAIK,2024-01-10,1\n" +
                                     "Meja Kerja,Furnitur,10,unit,1200000,BAIK,2024-01-15,2";
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", "template_inventaris.csv");
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
                <FileSpreadsheet size={32} style={{ color: 'var(--warning)', marginBottom: 12 }} />
                <div style={{ marginBottom: 16 }}>
                  <label className="btn btn-primary" style={{ cursor: 'pointer', borderRadius: 'var(--radius-full)', padding: '10px 24px', background: 'var(--warning)', border: 'none' }}>
                    <Upload size={16} /> {importing ? "Memproses..." : "Pilih File CSV"}
                    <input type="file" accept=".csv" style={{ display: 'none' }} disabled={importing} onChange={async (e) => {
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

                        if (confirm(`Impor ${jsonData.length} item inventaris?`)) {
                          setImporting(true);
                          try {
                            const res = await fetch("/api/inventaris/import", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(jsonData)
                            });
                            if (res.ok) {
                              alert("Berhasil mengimpor data inventaris!");
                              setShowImportModal(false);
                              fetchData();
                            } else {
                              const err = await res.json();
                              alert("Gagal impor: " + err.error);
                            }
                          } catch (err) {
                            alert("Terjadi kesalahan saat mengunggah.");
                          } finally {
                            setImporting(false);
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
