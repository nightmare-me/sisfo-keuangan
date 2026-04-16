"use client";

import { useEffect, useState, useRef } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Papa from "papaparse";

const PLATFORMS = ["GOOGLE","META","TIKTOK","INSTAGRAM","YOUTUBE","LAINNYA"];
const PLATFORM_COLOR: Record<string,string> = {
  GOOGLE:"#4285f4", META:"#0866ff", TIKTOK:"#69c9d0", INSTAGRAM:"#e1306c", YOUTUBE:"#ff0000", LAINNYA:"#6366f1"
};

export default function AdsPage() {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total:0, count:0 });
  const [byPlatform, setByPlatform] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvLoading, setCsvLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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

  function downloadCsvTemplate() {
    const header = "tanggal,platform,jumlah,keterangan\n";
    const examples = [
      "2024-03-01,META,500000,Iklan Promo Maret",
      "2024-03-02,GOOGLE,1000000,Search Engine Campaign",
      "2024-03-03,TIKTOK,750000,Video kreatif",
    ].join("\n") + "\n";
    const notes = [
      "",
      "# PANDUAN:",
      "# - tanggal: format YYYY-MM-DD",
      "# - platform: GOOGLE / META / TIKTOK / INSTAGRAM / YOUTUBE / LAINNYA",
      "# - jumlah: angka saja tanpa titik/koma (contoh: 1500000)",
    ].join("\n");
    const blob = new Blob([header + examples + notes], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "template_ads.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data.filter((row: any) => row.tanggal && !row.tanggal.toString().startsWith("#"));
          if (rows.length === 0) {
            alert("⚠️ File CSV kosong atau tidak memiliki data yang valid.");
            setCsvLoading(false);
            if (fileRef.current) fileRef.current.value = "";
            return;
          }

          const res = await fetch("/api/ads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rows),
          });
          
          if (!res.ok) {
            const err = await res.json();
            alert("❌ Gagal import: " + (err.error ?? "Terjadi kesalahan"));
          } else {
            alert(`✅ Berhasil import ${rows.length} data ads!`);
            fetchData();
          }
        } catch (error: any) {
          alert("❌ Terjadi kesalahan saat import.");
        }
        setCsvLoading(false);
        if (fileRef.current) fileRef.current.value = "";
      },
    });
  }

  // Siapkan data untuk LineChart (tren harian per platform)
  const trendMap: Record<string, any> = {};
  data.forEach(item => {
    const d = item.tanggal.slice(0, 10); // "YYYY-MM-DD"
    if (!trendMap[d]) trendMap[d] = { date: d };
    trendMap[d][item.platform] = (trendMap[d][item.platform] || 0) + item.jumlah;
  });
  const lineChartData = Object.values(trendMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ ...d, dateFormatted: formatDate(d.date, "dd MMM") }));

  // Custom Tooltip untuk LineChart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 10, padding: "12px 16px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">Spent Ads</div>
          <div className="topbar-subtitle">Lacak pengeluaran iklan per platform</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={downloadCsvTemplate}>⬇ Template CSV</button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>
            {csvLoading ? "Importing..." : "📥 Import CSV"}
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCsvImport} />
          </label>
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
            <div className="card-header"><div className="card-title">Tren Ads per Platform</div></div>
            {lineChartData.length === 0 ? (
              <div className="empty-state" style={{ height: 260 }}>
                <p>Belum ada data untuk ditampilkan</p>
              </div>
            ) : (
              <div style={{ height:260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="dateFormatted" tick={{ fill:"#64748b", fontSize:11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill:"#64748b", fontSize:11 }} tickLine={false} axisLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    {PLATFORMS.map(platform => {
                      // Cek apakah platform ini punya data di periode ini
                      const hasData = lineChartData.some(d => d[platform] !== undefined);
                      if (!hasData) return null;
                      return (
                        <Line
                          key={platform}
                          type="monotone"
                          dataKey={platform}
                          name={platform}
                          stroke={PLATFORM_COLOR[platform] ?? "#6366f1"}
                          strokeWidth={2}
                          dot={{ r: 4, fill: PLATFORM_COLOR[platform] ?? "#6366f1", strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
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
