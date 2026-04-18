"use client";

import { useEffect, useState, useRef } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Papa from "papaparse";
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
  Upload
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

  function downloadCsvTemplate() {
    const header = "nama,kategori,jumlah,satuan,hargaBeli,kondisi,tanggalBeli,keterangan,stokMinimum\n";
    const example = "Kursi Kantor,Furnitur,10,unit,500000,BAIK,2024-03-01,Kursi baru ruang staff,2\n";
    const note = "# Kondisi: BAIK / RUSAK_RINGAN / RUSAK_BERAT";
    const blob = new Blob([header + example + note], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "template_inventaris.csv"; a.click();
  }

  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data.filter((r:any)=>r.nama && !r.nama.startsWith("#"));
        if (rows.length === 0) return alert("File kosong atau tidak valid.");
        const res = await fetch("/api/inventaris", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rows) });
        if (res.ok) { alert(`Berhasil import ${rows.length} barang!`); fetchData(); }
        else alert("Gagal import.");
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
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
            <button className="btn btn-secondary btn-sm" onClick={downloadCsvTemplate} style={{ borderRadius: 'var(--radius-full)' }}>
              <Download size={16} /> Template
            </button>
            <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", borderRadius: 'var(--radius-full)', margin: 0 }}>
              <Upload size={16} /> Import CSV
              <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCsvImport} />
            </label>
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
                <tr><td colSpan={8} style={{ textAlign:"center",padding:32,color:"var(--text-muted)" }}>Loading...</td></tr>
              ) : data.length===0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <h3>Belum ada data inventaris</h3>
                    <p>Klik "+ Tambah Barang" untuk mencatat aset</p>
                  </div>
                </td></tr>
              ) : data.map(item=>(
                <tr key={item.id} style={{ background: item.isLowStock ? "rgba(239,68,68,0.04)" : "" }}>
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
    </div>
  );
}
