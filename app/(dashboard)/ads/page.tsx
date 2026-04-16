"use client";

import { useEffect, useState, useRef } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Papa from "papaparse";
import { 
  TrendingUp, 
  Activity, 
  Search, 
  Plus, 
  Download, 
  Trash2, 
  Megaphone, 
  Filter,
  RefreshCw,
  Calendar,
  Layers
} from "lucide-react";

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
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <Megaphone size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Marketing Performance</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Spent Ads</h1>
          <p className="body-lg" style={{ margin: 0 }}>Lacak pengeluaran iklan harian per platform</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={downloadCsvTemplate} style={{ borderRadius: 'var(--radius-full)' }}>
            <Download size={16} /> Template
          </button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", borderRadius: 'var(--radius-full)', margin: 0 }}>
            <Activity size={16} /> {csvLoading ? "Importing..." : "Import CSV"}
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCsvImport} />
          </label>
          <button id="btn-tambah-ads" className="btn btn-primary" onClick={()=>setShowModal(true)} style={{ borderRadius: 'var(--radius-full)' }}>
            <Plus size={18} /> Input Ads
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {/* KPI Grid - Top of Content */}
        <div className="kpi-grid" style={{ marginBottom: 32 }}>
          <div className="kpi-card" style={{ "--kpi-color": "var(--warning)", "--kpi-bg": "var(--warning-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--warning)" }}><TrendingUp size={24} /></div>
            <div className="kpi-label">Total Spent Ads</div>
            <div className="kpi-value">{formatCurrency(summary.total)}</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--info)", "--kpi-bg": "var(--info-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--info)" }}><Layers size={24} /></div>
            <div className="kpi-label">Jumlah Input</div>
            <div className="kpi-value">{summary.count} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>records</span></div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--success)", "--kpi-bg": "var(--success-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--success)" }}><Activity size={24} /></div>
            <div className="kpi-label">Active Platforms</div>
            <div className="kpi-value">{byPlatform.length}</div>
          </div>
        </div>
        {/* Summary Breakdown & Chart */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:32, marginBottom:48 }}>
          <div className="card" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ marginBottom: 24 }}>
              <div className="card-title" style={{ fontSize: '1.2rem' }}>Pecahan per Platform</div>
            </div>
            <div style={{ flex: 1 }}>
              {byPlatform.length===0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                   <p style={{ fontSize: 13 }}>Belum ada data iklan di periode ini</p>
                </div>
              ) :
                byPlatform.map(p=>(
                  <div key={p.platform} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 0", borderBottom:"1px solid var(--ghost-border)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:12, height:12, borderRadius:"50%", background: PLATFORM_COLOR[p.platform]??"#6366f1" }} />
                      <span style={{ fontSize:14, fontWeight:600, color: 'var(--text-primary)' }}>{p.platform}</span>
                    </div>
                    <span style={{ fontSize:14, fontWeight:700, color: "var(--on-surface)" }}>{formatCurrency(p._sum.jumlah??0)}</span>
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

        {/* Filter Section */}
        <div className="card" style={{ padding: '24px 32px', marginBottom: 32 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Calendar size={18} style={{ color: "var(--primary)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="date" className="form-control" value={filter.from} onChange={e=>setFilter(f=>({...f,from:e.target.value}))} style={{ maxWidth:160, padding: '8px 12px' }} />
                <span style={{ color:"var(--text-muted)", fontSize:13 }}>s/d</span>
                <input type="date" className="form-control" value={filter.to} onChange={e=>setFilter(f=>({...f,to:e.target.value}))} style={{ maxWidth:160, padding: '8px 12px' }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 200 }}>
              <Filter size={18} style={{ color: "var(--primary)" }} />
              <select className="form-control" value={filter.platform} onChange={e=>setFilter(f=>({...f,platform:e.target.value}))} style={{ padding: '8px 12px' }}>
                <option value="">Semua Platform</option>
                {PLATFORMS.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={()=>setFilter({from:"",to:"",platform:""})} style={{ borderRadius: 'var(--radius-full)' }}>
              <RefreshCw size={14} /> Reset Filter
            </button>
          </div>
        </div>

        {/* Table */}
        {/* Table Section */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Platform</th>
                <th>Keterangan</th>
                <th>Dibuat Oleh</th>
                <th className="text-right">Jumlah Spent</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign:"center",padding:48,color:"var(--text-muted)" }}>Loading data...</td></tr>
              ) : data.length===0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Megaphone size={48} /></div>
                    <h3 className="title-lg">Belum ada data iklan</h3>
                    <p>Klik "+ Input Ads" untuk mencatat pengeluaran iklan Anda</p>
                  </div>
                </td></tr>
              ) : data.map(item=>(
                <tr key={item.id}>
                  <td style={{ fontSize:14, color:"var(--text-muted)", whiteSpace:"nowrap" }}>{formatDate(item.tanggal,"dd MMM yyyy")}</td>
                  <td>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 14px", borderRadius:100, fontSize:12, fontWeight:700, background:`${PLATFORM_COLOR[item.platform]}15`, color:PLATFORM_COLOR[item.platform]??"var(--text-primary)" }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background: PLATFORM_COLOR[item.platform] }} />
                      {item.platform}
                    </span>
                  </td>
                  <td style={{ color:"var(--text-secondary)", fontSize:14 }}>{item.keterangan||"—"}</td>
                  <td style={{ fontSize:14, color:"var(--text-muted)" }}>{item.user?.name??"—"}</td>
                  <td className="text-right" style={{ fontWeight:800, color: "var(--on-surface)", fontSize: 16 }}>{formatCurrency(item.jumlah)}</td>
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
