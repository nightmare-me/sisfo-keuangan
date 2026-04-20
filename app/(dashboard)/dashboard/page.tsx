"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  BookOpen, 
  Wallet, 
  Megaphone, 
  ArrowRight,
  Sparkles,
  Calendar,
  GraduationCap,
  Clock,
  ArrowUpRight,
  User,
  Activity
} from "lucide-react";
import { formatCurrency, formatDate, percentageChange, hasPermission } from "@/lib/utils";

// ── Interfaces ─────────────────────────────────────────────

interface DashboardData {
  kpi: {
    pemasukanHariIni: number;
    pemasukanKemarin: number;
    pengeluaranHariIni: number;
    pengeluaranKemarin: number;
    adsHariIni: number;
    adsKemarin: number;
    labaHariIni: number;
    siswAktif: number;
  };
  pemasukanPerCS: { csName: string; total: number; count: number }[];
  pemasukanPerProgram: { programName: string; total: number; count: number }[];
  pengeluaranPerKategori: { kategori: string; total: number }[];
  trendData: { date: string; pemasukan: number; pengeluaran: number; ads: number }[];
  transaksiTerkini: any[];
}

interface AkademikData {
  kpi: {
    muridBariIni: number;
    muridKemarin: number;
    kelasAktif: number;
    siswaAktif: number;
    pengajarAktif: number;
  };
  trendData: { date: string; murid: number }[];
  siswaPerProgram: { nama: string; tipe: string; jumlahSiswa: number }[];
  muridTerkini: any[];
}

// ── Tooltips ────────────────────────────────────────────────

const PremiumTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass" style={{ borderRadius: 12, padding: "12px 16px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border-default)" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 8, letterSpacing: '0.05em' }}>{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color || p.fill }} />
            <span style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>
              {p.name}: {typeof p.value === 'number' && p.name !== "Murid Baru" ? formatCurrency(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ── Main Component ──────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  
  // Granular Matrix Permissions
  const canViewAkademik = hasPermission(session, "kelas:view");
  const canViewFinance = hasPermission(session, "pemasukan:view");
  const canViewAds = hasPermission(session, "ads:view");
  
  const userName = session?.user?.name?.split(' ')[0] ?? "User";

  const [data, setData] = useState<DashboardData | null>(null);
  const [akademikData, setAkademikData] = useState<AkademikData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("TODAY");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });

  function getPeriodParams() {
    const now = new Date();
    let from = "", to = "";
    
    if (period === "TODAY") {
      from = to = now.toISOString().slice(0, 10);
    } else if (period === "YESTERDAY") {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      from = to = yest.toISOString().slice(0, 10);
    } else if (period === "WEEK") {
      const week = new Date(now);
      week.setDate(now.getDate() - 7);
      from = week.toISOString().slice(0, 10);
      to = now.toISOString().slice(0, 10);
    } else if (period === "MONTH") {
      const month = new Date(now);
      month.setDate(now.getDate() - 30);
      from = month.toISOString().slice(0, 10);
      to = now.toISOString().slice(0, 10);
    } else if (period === "CUSTOM") {
      from = customRange.from;
      to = customRange.to;
    }
    return { from, to };
  }

  useEffect(() => {
    setLoading(true);
    const promises = [];
    const { from, to } = getPeriodParams();
    const query = from && to ? `?from=${from}&to=${to}` : "";
    
    if (canViewAkademik) {
      promises.push(
        fetch("/api/dashboard-akademik" + query)
          .then(r => r.json())
          .then(d => setAkademikData(d))
      );
    }
    
    if (canViewFinance) {
      promises.push(
        fetch("/api/dashboard" + query)
          .then(r => r.json())
          .then(d => setData(d))
      );
    }

    if (promises.length > 0) {
      Promise.all(promises).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [canViewAkademik, canViewFinance, period, customRange]);

  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Selamat Pagi" : hour < 15 ? "Selamat Siang" : hour < 18 ? "Selamat Sore" : "Selamat Malam";

  if (loading) {
    return (
      <div className="page-container">
        <div className="kpi-grid">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 24 }} />)}
        </div>
      </div>
    );
  }

  const pemasukanChange = data?.kpi ? percentageChange(data.kpi.pemasukanHariIni, data.kpi.pemasukanKemarin) : 0;
  const adsChange = data?.kpi ? percentageChange(data.kpi.adsHariIni, data.kpi.adsKemarin || 0) : 0;
  const pengeluaranChange = data?.kpi ? percentageChange(data.kpi.pengeluaranHariIni, data.kpi.pengeluaranKemarin || 0) : 0;
  
  if (!canViewAkademik && !canViewFinance) {
    return (
      <div className="page-container">
        <h1 className="text-gradient">{greeting}, {userName}!</h1>
        <p className="text-muted">Gunakan menu di samping untuk mulai bekerja.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--brand-primary-light)", marginBottom: 8 }}>
          <Clock size={16} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            {formatDate(today, "EEEE, dd MMMM")}
          </span>
        </div>
        <h1 className="text-gradient" style={{ fontSize: 32, fontWeight: 800 }}>{greeting}, {userName}!</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
           {canViewFinance ? "Berikut adalah ringkasan operasional bisnis kamu." : "Pantau perkembangan akademik siswa."}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)', padding: '10px 16px', borderRadius: 'var(--radius-full)', marginBottom: 32, border: '1px solid var(--ghost-border)' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {["TODAY", "YESTERDAY", "WEEK", "MONTH", "CUSTOM"].map(p => (
            <button 
              key={p} 
              className={`btn ${period === p ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: '6px 20px', fontSize: 13, borderRadius: 'var(--radius-full)' }}
              onClick={() => setPeriod(p)}
            >
              {p === "TODAY" ? "Hari Ini" : p === "YESTERDAY" ? "Kemarin" : p === "WEEK" ? "Minggu Ini" : p === "MONTH" ? "Bulan Ini" : "Custom"}
            </button>
          ))}
        </div>
        {period === "CUSTOM" && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="date" className="form-control" style={{ padding: '4px 12px', fontSize: 13, width: 150 }} value={customRange.from} onChange={e => setCustomRange({...customRange, from: e.target.value})} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>s/d</span>
            <input type="date" className="form-control" style={{ padding: '4px 12px', fontSize: 13, width: 150 }} value={customRange.to} onChange={e => setCustomRange({...customRange, to: e.target.value})} />
          </div>
        )}
      </div>

      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
         <div className="kpi-card">
           <div className="kpi-icon" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}><Wallet size={20} /></div>
           <div className="kpi-label">Pemasukan</div>
           <div className="kpi-value">{data?.kpi ? formatCurrency(data.kpi.pemasukanHariIni) : "Rp 0"}</div>
           {data?.kpi && (
             <div className={`kpi-change ${pemasukanChange >= 0 ? "up" : "down"}`}>
               {pemasukanChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
               {Math.abs(pemasukanChange).toFixed(1)}%
             </div>
           )}
         </div>

         <div className="kpi-card">
           <div className="kpi-icon" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}><ArrowUpRight size={20} /></div>
           <div className="kpi-label">Pengeluaran Ops.</div>
           <div className="kpi-value">{data?.kpi ? formatCurrency(data.kpi.pengeluaranHariIni) : "Rp 0"}</div>
           {data?.kpi && pengeluaranChange !== 0 && (
             <div className={`kpi-change ${pengeluaranChange <= 0 ? "up" : "down"}`}>
               {pengeluaranChange <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
               {Math.abs(pengeluaranChange).toFixed(1)}%
             </div>
           )}
         </div>

         <div className="kpi-card">
           <div className="kpi-icon" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}><Megaphone size={20} /></div>
           <div className="kpi-label">Spent Ads</div>
           <div className="kpi-value">{data?.kpi ? formatCurrency(data.kpi.adsHariIni) : "Rp 0"}</div>
           {data?.kpi && adsChange !== 0 && (
             <div className={`kpi-change ${adsChange <= 0 ? "up" : "down"}`}>
               {adsChange <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
               {Math.abs(adsChange).toFixed(1)}%
             </div>
           )}
         </div>

         <div className="kpi-card">
           <div className="kpi-icon" style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed" }}><TrendingUp size={20} /></div>
           <div className="kpi-label">Laba Bersih</div>
           <div className="kpi-value">{data?.kpi ? formatCurrency(data.kpi.labaHariIni) : "Rp 0"}</div>
         </div>

         <div className="kpi-card">
           <div className="kpi-icon" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}><Users size={20} /></div>
           <div className="kpi-label">Siswa Aktif</div>
           <div className="kpi-value">{(data?.kpi?.siswAktif || akademikData?.kpi?.siswaAktif || 0).toLocaleString("id-ID")}</div>
         </div>

         <div className="kpi-card">
           <div className="kpi-icon" style={{ background: "rgba(129,140,248,0.1)", color: "#818cf8" }}><Users size={24} /></div>
           <div className="kpi-label">Siswa Baru Hari Ini</div>
           <div className="kpi-value">{akademikData?.kpi?.muridBariIni || 0}</div>
         </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr", gap: 24, marginBottom: 24 }}>
        <div className="card">
           <div className="card-header">
              <div>
                 <div className="card-title">Performa Keuangan</div>
                 <div className="card-subtitle">Periode terpilih</div>
              </div>
           </div>
           <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={(data?.trendData || []).map(d => ({ ...d, date: formatDate(d.date, "dd/MM") }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<PremiumTooltip />} />
                    <Line type="monotone" dataKey="pemasukan" stroke="#10b981" strokeWidth={3} dot={false} name="Pemasukan" />
                    {canViewAds && <Line type="monotone" dataKey="ads" stroke="#f59e0b" strokeWidth={2} dot={false} name="Spent Ads" />}
                    {canViewFinance && <Line type="monotone" dataKey="pengeluaran" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Pengeluaran" />}
                 </LineChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="card shadow-glow">
           <div className="card-header">
              <div className="card-title">Tren Murid Baru</div>
              <TrendingUp size={18} style={{ color: "var(--brand-primary-light)" }} />
           </div>
           <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={(akademikData?.trendData || []).map(d => ({ ...d, date: formatDate(d.date, "dd/MM") }))}>
                    <Tooltip content={<PremiumTooltip />} />
                    <Area type="monotone" dataKey="murid" stroke="#818cf8" fill="#818cf8" fillOpacity={0.1} name="Murid Baru" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Transaksi Terkini</div>
          <div className="table-wrapper" style={{ maxHeight: 310, overflowY: "auto", overflowX: "hidden" }}>
             <table style={{ fontSize: 12, minWidth: "auto", width: "100%" }}>
                <thead>
                   <tr>
                      <th>Siswa</th>
                      <th style={{ textAlign: "right" }}>Nominal</th>
                   </tr>
                </thead>
                <tbody>
                   {(data?.transaksiTerkini || []).slice(0, 8).map(t => (
                     <tr key={t.id}>
                        <td style={{ paddingRight: 8 }}>
                          <div style={{ fontWeight: 600, color: "var(--on-surface)" }}>{t.siswa?.nama}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{t.program?.nama}</div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "var(--success)", whiteSpace: "nowrap" }}>{formatCurrency(t.hargaFinal)}</td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Pemasukan Per Program</div>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.pemasukanPerProgram || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" hide />
                <YAxis dataKey="programName" type="category" width={120} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<PremiumTooltip />} />
                <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} name="Total Pemasukan" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Pengeluaran Per Kategori</div>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.pengeluaranPerKategori || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" hide />
                <YAxis dataKey="kategori" type="category" width={120} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<PremiumTooltip />} />
                <Bar dataKey="total" fill="#ef4444" radius={[0, 4, 4, 0]} name="Total Pengeluaran" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
