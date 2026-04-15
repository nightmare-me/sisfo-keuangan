"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

const KONDISI_BADGE: Record<string,string> = { BAIK:"badge-success", RUSAK_RINGAN:"badge-warning", RUSAK_BERAT:"badge-danger" };

export default function InventarisPage() {
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

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">Inventaris</div>
          <div className="topbar-subtitle">Kelola aset dan perlengkapan lembaga</div>
        </div>
        <div className="topbar-actions">
          {lowStockCount > 0 && (
            <span className="badge badge-danger" style={{ padding:"6px 12px" }}>⚠ {lowStockCount} stok menipis</span>
          )}
          <button id="btn-tambah-inventaris" className="btn btn-primary" onClick={()=>{ setEditItem(null); setShowModal(true); }}>+ Tambah Barang</button>
        </div>
      </div>

      <div className="page-container">
        {lowStockCount > 0 && (
          <div className="alert alert-warning">
            ⚠️ Ada {lowStockCount} barang dengan stok di bawah minimum. Segera lakukan pengadaan.
          </div>
        )}

        {/* Filter */}
        <div className="filter-bar">
          <input type="text" className="form-control" placeholder="🔍 Cari nama barang..." value={search} onChange={e=>setSearch(e.target.value)} style={{ flex:1, maxWidth:280 }} />
          <select className="form-control" value={kondisiFilter} onChange={e=>setKondisiFilter(e.target.value)}>
            <option value="">Semua Kondisi</option>
            <option value="BAIK">Baik</option>
            <option value="RUSAK_RINGAN">Rusak Ringan</option>
            <option value="RUSAK_BERAT">Rusak Berat</option>
          </select>
          <label style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--text-secondary)",cursor:"pointer",whiteSpace:"nowrap" }}>
            <input type="checkbox" checked={lowStockOnly} onChange={e=>setLowStockOnly(e.target.checked)} />
            Stok Menipis Saja
          </label>
          <button className="btn btn-secondary btn-sm" onClick={()=>{ setSearch(""); setKondisiFilter(""); setLowStockOnly(false); }}>Reset</button>
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
