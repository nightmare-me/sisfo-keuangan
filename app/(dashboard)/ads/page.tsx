"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const PLATFORMS = ["GOOGLE","META","TIKTOK","INSTAGRAM","YOUTUBE","LAINNYA"];
const PLATFORM_COLOR: Record<string,string> = {
  GOOGLE:"#4285f4", META:"#0866ff", TIKTOK:"#69c9d0", INSTAGRAM:"#e1306c", YOUTUBE:"#ff0000", LAINNYA:"#6366f1"
};

export default function AdsPage() {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total:0, count:0 });
  const [byPlatform, setByPlatform] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState({ from:"", to:"", platform:"" });
  const [form, setForm] = useState({ platform:"META", jumlah:"", keterangan:"", tanggal: new Date().toISOString().slice(0,10) });

  function fetchData() {
    const p = new URLSearchParams();
    if (filter.from) p.set("from", filter.from);
    if (filter.to) p.set("to", filter.to+"T23:59:59");
    if (filter.platform) p.set("platform", filter.platform);
    setLoading(true);
    fetch(`/api/ads?${p}`).then(r=>r.json()).then(d=>{
      setData(d.data??[]); setSummary(d.summary??{}); setByPlatform(d.byPlatform??[]);
      setLoading(false);
    });
  }

  useEffect(()=>{ fetchData(); },[filter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch("/api/ads",{ method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({...form, jumlah: parseFloat(form.jumlah)}) });
    setSaving(false); setShowModal(false);
    setForm({ platform:"META", jumlah:"", keterangan:"", tanggal: new Date().toISOString().slice(0,10) });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus data iklan ini?")) return;
    await fetch(`/api/ads?id=${id}`,{ method:"DELETE" });
    fetchData();
  }

  const chartData = byPlatform.map(p=>({ platform: p.platform, total: p._sum.jumlah??0 }));

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">Spent Ads</div>
          <div className="topbar-subtitle">Lacak pengeluaran iklan per platform</div>
        </div>
        <div className="topbar-actions">
          <button id="btn-tambah-ads" className="btn btn-primary" onClick={()=>setShowModal(true)}>+ Input Ads</button>
        </div>
      </div>

      <div className="page-container">
        {/* Summary & Chart */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:16, marginBottom:16 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div className="summary-card">
              <label>Total Spent Ads</label>
              <div className="value yellow">{formatCurrency(summary.total)}</div>
            </div>
            <div className="summary-card">
              <label>Jumlah Input</label>
              <div className="value">{summary.count}</div>
            </div>
            {/* Platform breakdown list */}
            <div className="card" style={{ flex:1 }}>
              <div className="card-title" style={{ marginBottom:12 }}>Per Platform</div>
              {byPlatform.length===0 ? <p style={{ color:"var(--text-muted)", fontSize:12 }}>Belum ada data</p> :
                byPlatform.map(p=>(
                  <div key={p.platform} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid var(--border-default)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background: PLATFORM_COLOR[p.platform]??"#6366f1" }} />
                      <span style={{ fontSize:13, fontWeight:600 }}>{p.platform}</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:"var(--warning)" }}>{formatCurrency(p._sum.jumlah??0)}</span>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Grafik per Platform</div></div>
            <div style={{ height:260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="platform" tick={{ fill:"#64748b", fontSize:12 }} />
                  <YAxis tick={{ fill:"#64748b", fontSize:11 }} tickFormatter={v=>`${(v/1000000).toFixed(1)}jt`} />
                  <Tooltip formatter={(v:any)=>formatCurrency(v)} />
                  <Bar dataKey="total" radius={[6,6,0,0]} name="Total Ads">
                    {chartData.map((entry,i)=>(
                      <Cell key={i} fill={PLATFORM_COLOR[entry.platform]??"#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="filter-bar">
          <input type="date" className="form-control" value={filter.from} onChange={e=>setFilter(f=>({...f,from:e.target.value}))} style={{ maxWidth:160 }} />
          <span style={{ color:"var(--text-muted)", fontSize:13 }}>s/d</span>
          <input type="date" className="form-control" value={filter.to} onChange={e=>setFilter(f=>({...f,to:e.target.value}))} style={{ maxWidth:160 }} />
          <select className="form-control" value={filter.platform} onChange={e=>setFilter(f=>({...f,platform:e.target.value}))}>
            <option value="">Semua Platform</option>
            {PLATFORMS.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={()=>setFilter({from:"",to:"",platform:""})}>Reset</button>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Platform</th>
                <th>Keterangan</th>
                <th>Dibuat Oleh</th>
                <th className="text-right">Jumlah</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign:"center",padding:32,color:"var(--text-muted)" }}>Loading...</td></tr>
              ) : data.length===0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📣</div>
                    <h3>Belum ada data iklan</h3>
                    <p>Klik "+ Input Ads" untuk mencatat pengeluaran iklan</p>
                  </div>
                </td></tr>
              ) : data.map(item=>(
                <tr key={item.id}>
                  <td style={{ fontSize:12,color:"var(--text-muted)",whiteSpace:"nowrap" }}>{formatDate(item.tanggal,"dd MMM yyyy")}</td>
                  <td>
                    <span style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"3px 10px",borderRadius:100,fontSize:12,fontWeight:700,background:`${PLATFORM_COLOR[item.platform]}20`,color:PLATFORM_COLOR[item.platform]??"var(--text-primary)" }}>
                      ● {item.platform}
                    </span>
                  </td>
                  <td style={{ color:"var(--text-secondary)",fontSize:13 }}>{item.keterangan||"—"}</td>
                  <td style={{ fontSize:12,color:"var(--text-muted)" }}>{item.user?.name??"—"}</td>
                  <td className="text-right" style={{ fontWeight:700,color:"var(--warning)" }}>{formatCurrency(item.jumlah)}</td>
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
              <div className="modal-title">Input Spent Ads</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Platform</label>
                    <select id="sel-platform" className="form-control" value={form.platform} onChange={e=>setForm(f=>({...f,platform:e.target.value}))}>
                      {PLATFORMS.map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Tanggal</label>
                    <input type="date" className="form-control" value={form.tanggal} onChange={e=>setForm(f=>({...f,tanggal:e.target.value}))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label required">Jumlah Ads Spend (Rp)</label>
                  <input id="inp-jumlah-ads" type="number" className="form-control" placeholder="0" value={form.jumlah} onChange={e=>setForm(f=>({...f,jumlah:e.target.value}))} required min={1} />
                </div>
                <div className="form-group">
                  <label className="form-label">Keterangan</label>
                  <input type="text" className="form-control" placeholder="Nama campaign, target audience, dll..." value={form.keterangan} onChange={e=>setForm(f=>({...f,keterangan:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Batal</button>
                <button id="btn-simpan-ads" type="submit" className="btn btn-primary" disabled={saving}>{saving?"Menyimpan...":"📣 Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
