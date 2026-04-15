"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const KATEGORI = ["GAJI_PENGAJAR","GAJI_STAF","SEWA_TEMPAT","UTILITAS","ATK","MARKETING","PERALATAN","PEMELIHARAAN","LAINNYA"];
const METODE = ["CASH","TRANSFER"];
const KATEGORI_LABEL: Record<string,string> = {
  GAJI_PENGAJAR:"Gaji Pengajar",GAJI_STAF:"Gaji Staf",SEWA_TEMPAT:"Sewa Tempat",
  UTILITAS:"Utilitas",ATK:"ATK",MARKETING:"Marketing",PERALATAN:"Peralatan",
  PEMELIHARAAN:"Pemeliharaan",LAINNYA:"Lainnya"
};

export default function PengeluaranPage() {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalPengeluaran:0, jumlahTransaksi:0 });
  const [byKategori, setByKategori] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState({ from:"", to:"", kategori:"", metodeBayar:"" });
  const [form, setForm] = useState({ jumlah:"", kategori:"LAINNYA", metodeBayar:"CASH", keterangan:"", tanggal: new Date().toISOString().slice(0,10) });
  const [editId, setEditId] = useState<string|null>(null);

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

  useEffect(()=>{ fetchData(); },[filter]);

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

  const maxKategori = Math.max(...byKategori.map(k=>k._sum.jumlah??0), 1);

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">Pengeluaran Operasional</div>
          <div className="topbar-subtitle">Kelola data pengeluaran lembaga</div>
        </div>
        <div className="topbar-actions">
          <button id="btn-tambah-pengeluaran" className="btn btn-primary" onClick={()=>setShowModal(true)}>+ Tambah Pengeluaran</button>
        </div>
      </div>

      <div className="page-container">
        {/* Summary */}
        <div className="summary-grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))" }}>
          <div className="summary-card">
            <label>Total Pengeluaran</label>
            <div className="value red">{formatCurrency(summary.totalPengeluaran)}</div>
          </div>
          <div className="summary-card">
            <label>Jumlah Transaksi</label>
            <div className="value">{summary.jumlahTransaksi}</div>
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
                    <span style={{ fontSize:13, fontWeight:600 }}>{KATEGORI_LABEL[k.kategori]??k.kategori}</span>
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

        {/* Filter */}
        <div className="filter-bar">
          <input type="date" className="form-control" value={filter.from} onChange={e=>setFilter(f=>({...f,from:e.target.value}))} style={{ maxWidth:160 }} />
          <span style={{ color:"var(--text-muted)", fontSize:13 }}>s/d</span>
          <input type="date" className="form-control" value={filter.to} onChange={e=>setFilter(f=>({...f,to:e.target.value}))} style={{ maxWidth:160 }} />
          <select className="form-control" value={filter.kategori} onChange={e=>setFilter(f=>({...f,kategori:e.target.value}))}>
            <option value="">Semua Kategori</option>
            {KATEGORI.map(k=><option key={k} value={k}>{KATEGORI_LABEL[k]}</option>)}
          </select>
          <select className="form-control" value={filter.metodeBayar} onChange={e=>setFilter(f=>({...f,metodeBayar:e.target.value}))}>
            <option value="">Semua Metode</option>
            {METODE.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={()=>setFilter({from:"",to:"",kategori:"",metodeBayar:""})}>Reset</button>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th>Metode</th>
                <th>Dibuat Oleh</th>
                <th className="text-right">Jumlah</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign:"center",padding:32,color:"var(--text-muted)" }}>Loading...</td></tr>
              ) : data.length===0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">💸</div>
                    <h3>Belum ada data pengeluaran</h3>
                    <p>Klik "+ Tambah Pengeluaran" untuk mencatat</p>
                  </div>
                </td></tr>
              ) : data.map(item=>(
                <tr key={item.id}>
                  <td style={{ fontSize:12, color:"var(--text-muted)", whiteSpace:"nowrap" }}>{formatDateTime(item.tanggal)}</td>
                  <td><span className="badge badge-danger">{KATEGORI_LABEL[item.kategori]??item.kategori}</span></td>
                  <td style={{ color:"var(--text-secondary)", fontSize:13 }}>{item.keterangan||"—"}</td>
                  <td><span className={`badge ${item.metodeBayar==="CASH"?"badge-warning":"badge-info"}`}>{item.metodeBayar}</span></td>
                  <td style={{ fontSize:12, color:"var(--text-muted)" }}>{item.user?.name??"—"}</td>
                  <td className="text-right" style={{ fontWeight:700, color:"var(--danger)" }}>{formatCurrency(item.jumlah)}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(item.id)}>🗑</button>
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
                      {KATEGORI.map(k=><option key={k} value={k}>{KATEGORI_LABEL[k]}</option>)}
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
    </div>
  );
}
