"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { formatCurrency, formatDate } from "@/lib/utils";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Papa from "papaparse";
import { 
  TrendingUp, 
  Activity, 
  Search, 
  Plus, 
  Download, 
  Trash2, 
  Edit3,
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
  const { data: session } = useSession();
  const role = (session?.user as any)?.role?.toUpperCase();
  const isAdmin = role === "ADMIN";
  const allRoles = (session?.user as any)?.secondaryRoles || [];
  const isAdv = allRoles.includes("advertiser") || role === "ADVERTISER";
  const isSPVAdv = allRoles.includes("spv_adv") || role === "SPV_ADV";
  
  const [data, setData] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [summary, setSummary] = useState({ total:0, count:0, leads:0, avgCpl:0, totalFee: 0 });
  const [byPlatform, setByPlatform] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvLoading, setCsvLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState({ from:"", to:"", platform:"" });
  const [form, setForm] = useState({ platform:"META", jumlah:"", keterangan:"", leads:"", tanggal: new Date().toISOString().slice(0,10), advId: "" });
  const [allAdvs, setAllAdvs] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: () => {}, type: "danger" as "danger" | "warning" | "info" | "success" });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);

  // FUNGSI UNTUK MENGHITUNG DEFAULT CUTOFF (SAMA DENGAN ADMIN)
  async function initDefaultFilter() {
    try {
      const res = await fetch("/api/settings/financial");
      const configs = await res.json();
      const cutoffDay = configs.find((c: any) => c.key === "PAYROLL_CUTOFF_DAY")?.value || 25;
      
      const now = new Date();
      const jktDay = now.getDate();
      const jktMonth = now.getMonth();
      const jktYear = now.getFullYear();

      const formatYMD = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      let startDate: string, endDate: string;

      if (jktDay > cutoffDay) {
        startDate = formatYMD(new Date(jktYear, jktMonth, cutoffDay + 1));
        endDate = formatYMD(new Date(jktYear, jktMonth + 1, cutoffDay));
      } else {
        startDate = formatYMD(new Date(jktYear, jktMonth - 1, cutoffDay + 1));
        endDate = formatYMD(new Date(jktYear, jktMonth, cutoffDay));
      }

      setFilter(prev => ({ ...prev, from: startDate, to: endDate }));
    } catch (e) {
      console.error("Gagal mengambil config:", e);
    }
  }

  useEffect(() => {
    initDefaultFilter();
  }, []);

  function fetchData() {
    if (!filter.from || !filter.to) return; // Tunggu filter diinisialisasi
    const p = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });
    if (filter.from) p.set("from", filter.from);
    if (filter.to) p.set("to", filter.to+"T23:59:59");
    if (filter.platform) p.set("platform", filter.platform);
    setLoading(true);
    fetch(`/api/ads?${p}`).then(r=>r.json()).then(d=>{
      setData(d.data??[]); 
      setSummary(d.summary??{}); 
      setByPlatform(d.byPlatform??[]);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || 1);
      setLoading(false);
    });
  }

  useEffect(()=>{ fetchData(); },[filter, page, limit]);

  useEffect(() => {
    fetch("/api/users?role=advertiser").then(r => r.json()).then(d => setAllAdvs(d.users || []));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const url = isEditing ? "/api/ads" : "/api/ads";
    const method = isEditing ? "PUT" : "POST";
    const payload = isEditing 
      ? { ...form, id: editId, jumlah: parseFloat(form.jumlah), leads: parseInt(form.leads || "0"), advId: form.advId }
      : { ...form, jumlah: parseFloat(form.jumlah), leads: parseInt(form.leads || "0"), advId: form.advId };

    const res = await fetch(url, { 
      method, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload) 
    });

    setSaving(false);
    if (res.ok) {
      setShowModal(false);
      setForm({ platform: "META", jumlah: "", keterangan: "", leads: "", tanggal: new Date().toISOString().slice(0, 10) });
      setIsEditing(false);
      setEditId(null);
      fetchData();
    } else {
      let errorMsg = "Terjadi kesalahan";
      try {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } else {
          errorMsg = await res.text();
        }
      } catch (e) {
        console.error("Error parsing response:", e);
      }
      alert("Gagal menyimpan: " + errorMsg);
    }
  }

  function openEdit(item: any) {
    setForm({
      platform: item.platform,
      jumlah: item.spent.toString(),
      leads: (item.leads || 0).toString(),
      keterangan: item.keterangan || "",
      tanggal: item.tanggal.slice(0, 10),
      advId: item.advId || ""
    });
    setEditId(item.id);
    setIsEditing(true);
    setShowModal(true);
  }

  async function handleDelete(id: string) {
    setConfirmModal({
      show: true,
      title: "Hapus Metrik Iklan?",
      message: "Apakah Anda yakin ingin menghapus data metrik iklan ini secara permanen?",
      type: "danger",
      onConfirm: async () => {
        setLoading(true);
        await fetch(`/api/ads?id=${id}`,{ method:"DELETE" });
        fetchData();
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  }

  async function handleDeleteAll() {
    if (!isAdmin) return;
    setConfirmModal({
      show: true,
      title: "HAPUS SELURUH DATA IKLAN?",
      message: "⚠️ PERINGATAN KERAS: Seluruh data SPENT ADS (Biaya Iklan) akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.",
      type: "danger",
      onConfirm: async () => {
        setLoading(true);
        const res = await fetch("/api/ads?all=true", { method: "DELETE" });
        if (res.ok) fetchData();
        else {
          setConfirmModal({
            show: true,
            title: "Gagal Menghapus",
            message: "❌ Terjadi kesalahan saat mencoba menghapus data.",
            type: "danger",
            onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
          });
        }
        setLoading(false);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  }

  function downloadCsvTemplate() {
    const header = "tanggal,platform,jumlah,keterangan,leads,email_advertiser\n";
    const examples = [
      "2024-03-01,META,500000,Iklan Promo Maret,50,advertiser@speakingpartner.id",
      "2024-03-02,GOOGLE,1000000,Search Engine Campaign,80,",
      "2024-03-03,TIKTOK,750000,Video kreatif,,",
    ].join("\n") + "\n";
    const notes = [
      "",
      "# PANDUAN:",
      "# - tanggal: format YYYY-MM-DD",
      "# - platform: GOOGLE / META / TIKTOK / INSTAGRAM / YOUTUBE / LAINNYA",
      "# - jumlah: angka saja tanpa titik/koma (contoh: 1500000)",
      "# - leads: Jumlah leads yang didapat dari iklan ini",
      "# - email_advertiser: (Opsional) Email user advertiser untuk perhitungan bonus fee. Jika kosong, akan memakai akun Anda."
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
            setConfirmModal({
              show: true,
              title: "CSV Tidak Valid",
              message: "⚠️ File CSV kosong atau tidak memiliki data yang valid. Periksa format kolom Anda.",
              type: "warning",
              onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
            });
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
            setConfirmModal({
              show: true,
              title: "Import Gagal",
              message: "❌ Gagal import: " + (err.error ?? "Terjadi kesalahan"),
              type: "danger",
              onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
            });
          } else {
            const result = await res.json();
            setConfirmModal({
              show: true,
              title: "Import Berhasil",
              message: `✅ Berhasil import ${result.success || 0} data ads!`,
              type: "success" as any,
              onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
            });
            fetchData();
          }
        } catch (error: any) {
          setConfirmModal({
            show: true,
            title: "Error System",
            message: "❌ Terjadi kesalahan saat mencoba memproses file CSV.",
            type: "danger",
            onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
          });
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
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Manajemen Iklan</h1>
          <p className="body-lg" style={{ margin: 0 }}>Lacak pengeluaran iklan dan performa leads harian</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {isAdmin && (
            <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleDeleteAll}>
              <Trash2 size={16} /> Hapus Semua
            </button>
          )}
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
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
           <Calendar size={14} style={{ color: 'var(--primary)' }} />
           <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
              Periode Gaji: <span style={{ color: 'var(--on-surface)' }}>{formatDate(filter.from, "dd MMM")} - {formatDate(filter.to, "dd MMM yyyy")}</span>
           </span>
        </div>
        <div className="kpi-grid" style={{ marginBottom: 32 }}>
          <div className="kpi-card" style={{ "--kpi-color": "var(--warning)", "--kpi-bg": "var(--warning-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--warning)" }}><TrendingUp size={24} /></div>
            <div className="kpi-label">Total Spent Ads</div>
            <div className="kpi-value">{formatCurrency(summary.total)}</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--primary)", "--kpi-bg": "var(--primary-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--primary)" }}><Activity size={24} /></div>
            <div className="kpi-label">Total Leads</div>
            <div className="kpi-value">{summary.leads} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>leads</span></div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--success)", "--kpi-bg": "var(--success-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--success)" }}><TrendingUp size={24} /></div>
            <div className="kpi-label">Avg CPL</div>
            <div className="kpi-value">{formatCurrency(summary.avgCpl)}</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "#8b5cf6", "--kpi-bg": "#8b5cf615" } as any}>
            <div className="kpi-icon" style={{ color: "#8b5cf6" }}><Plus size={24} /></div>
            <div className="kpi-label">Estimasi Bonus</div>
            <div className="kpi-value" style={{ color: "#8b5cf6" }}>{formatCurrency(summary.totalFee)}</div>
          </div>
        </div>
        {/* Summary Breakdown & Chart */}
        <div className="panel-grid-2-reverse" style={{ marginBottom: 48 }}>
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

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Filter size={18} style={{ color: "var(--primary)" }} />
              <select className="form-control" value={filter.platform} onChange={e=>setFilter(f=>({...f,platform:e.target.value}))} style={{ padding: '8px 12px', width: 220 }}>
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
                <th className="text-right">Spent</th>
                <th className="text-right">Leads</th>
                <th className="text-right">CPL</th>
                <th className="text-right">Est. Fee Adv</th>
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
                  <td style={{ color:"var(--text-secondary)", fontSize:14 }}>
                    {item.keterangan||"—"}
                  </td>
                  <td style={{ fontSize:14, color:"var(--text-muted)" }}>{item.user?.name??"—"}</td>
                  <td className="text-right" style={{ fontWeight:800, color: "var(--on-surface)", fontSize: 15 }}>{formatCurrency(item.jumlah)}</td>
                  <td className="text-right" style={{ fontWeight:600, color: "var(--primary)" }}>{item.leads || 0}</td>
                  <td className="text-right" style={{ fontWeight:600, color: "var(--success)" }}>{formatCurrency(item.cpl || 0)}</td>
                  <td className="text-right" style={{ fontWeight:700, color: "#8b5cf6" }}>{formatCurrency(item.fee || 0)}</td>
                  <td className="text-center">
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button 
                        className="btn btn-secondary btn-icon" 
                        style={{ width: 42, height: 42, borderRadius: 12, color: "var(--primary)" }} 
                        onClick={() => openEdit(item)} 
                        title="Edit"
                      >
                        <Edit3 size={20} />
                      </button>
                      {isAdmin && (
                        <button 
                          className="btn btn-secondary btn-icon" 
                          style={{ width: 42, height: 42, borderRadius: 12, color: "var(--danger)" }} 
                          onClick={() => handleDelete(item.id)} 
                          title="Hapus"
                        >
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

      {showModal && (
        <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) setShowModal(false); }}>
          <div className="modal">
              <div className="modal-header">
              <div className="modal-title">{isEditing ? "Edit Spent Ads" : "Input Spent Ads"}</div>
              <button className="modal-close" onClick={() => { setShowModal(false); setIsEditing(false); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Platform & Advertiser */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Platform</label>
                    <select className="form-control" value={form.platform} onChange={e=>setForm(f=>({...f,platform:e.target.value}))}>
                      {PLATFORMS.map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Advertiser</label>
                    <select className="form-control" value={form.advId} onChange={e=>setForm(f=>({...f,advId:e.target.value}))}>
                      <option value="">-- Pilih Advertiser --</option>
                      {allAdvs.map((adv: any) => (
                        <option key={adv.id} value={adv.id}>{adv.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Tanggal</label>
                    <input type="date" className="form-control" value={form.tanggal} onChange={e=>setForm(f=>({...f,tanggal:e.target.value}))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Jumlah Ads Spend (Rp)</label>
                    <input type="number" className="form-control" placeholder="0" value={form.jumlah} onChange={e=>setForm(f=>({...f,jumlah:e.target.value}))} required min={1} />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Leads Didapat</label>
                    <input type="number" className="form-control" placeholder="0" value={form.leads} onChange={e=>setForm(f=>({...f,leads:e.target.value}))} min={0} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Keterangan</label>
                    <input type="text" className="form-control" placeholder="Nama campaign, target audience, dll..." value={form.keterangan} onChange={e=>setForm(f=>({...f,keterangan:e.target.value}))} />
                  </div>
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
