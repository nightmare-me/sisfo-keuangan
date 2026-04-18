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
    adsHariIni: number;
    labaHariIni: number;
    siswAktif: number;
  };
  pemasukanPerCS: { csName: string; total: number; count: number }[];
  pemasukanPerProgram: { programName: string; total: number; count: number }[];
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

// ── KPI Config ──────────────────────────────────────────────

const KPI_FINANCE = [
  { key: "pemasukanHariIni", label: "Pemasukan", icon: <Wallet size={20} />, color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  { key: "pengeluaranHariIni", label: "Pengeluaran", icon: <ArrowUpRight size={20} />, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  { key: "adsHariIni", label: "Spent Ads", icon: <Megaphone size={20} />, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  { key: "labaHariIni", label: "Laba Bersih", icon: <TrendingUp size={20} />, color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
  { key: "siswAktif", label: "Siswa Aktif", icon: <Users size={20} />, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", isCurrency: false },
];

const TIPE_BADGE: Record<string, string> = {
  REGULAR: "badge-info", PRIVATE: "badge-primary", SEMI_PRIVATE: "badge-warning",
};

// ── Main Component ──────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  
  // Granular Matrix Permissions
  const canViewAkademik = hasPermission(session, "kelas:view");
  const canViewFinance = hasPermission(session, "pemasukan:view");
  const canViewAds = hasPermission(session, "ads:view");
  
  const role = (session?.user as any)?.role;
  const userName = session?.user?.name?.split(' ')[0] ?? "User";

  const [data, setData] = useState<DashboardData | null>(null);
  const [akademikData, setAkademikData] = useState<AkademikData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const promises = [];
    
    if (canViewAkademik) {
      promises.push(
        fetch("/api/dashboard-akademik")
          .then(r => r.json())
          .then(d => setAkademikData(d))
      );
    }
    
    if (canViewFinance) {
      promises.push(
        fetch("/api/dashboard")
          .then(r => r.json())
          .then(d => setData(d))
      );
    }

    if (promises.length > 0) {
      Promise.all(promises).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [canViewAkademik, canViewFinance]);

  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Selamat Pagi" : hour < 15 ? "Selamat Siang" : hour < 18 ? "Selamat Sore" : "Selamat Malam";

  if (loading) {
    return (
      <div className="page-container">
        <div className="kpi-grid">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 24 }} />)}
        </div>
      </div>
    );
  }

  // ── Main Dashboard Combined ─────────────────────────
  const pemasukanChange = data?.kpi ? percentageChange(data.kpi.pemasukanHariIni, data.kpi.pemasukanKemarin) : 0;
  
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
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>{formatDate(today, "EEEE, dd MMMM")}</span>
        </div>
        <h1 className="text-gradient" style={{ fontSize: 32, fontWeight: 800 }}>{greeting}, {userName}!</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
           {canViewFinance ? "Berikut adalah ringkasan operasional bisnis kamu hari ini." : "Pantau perkembangan akademik siswa hari ini."}
        </p>
      </div>

      {/* KPI Section */}
      <div className="kpi-grid" style={{ marginBottom: 32 }}>
         {/* Finance KPIs if permitted */}
         {canViewFinance && data?.kpi && (
           KPI_FINANCE.filter(cfg => {
             // Basic hide logic for CS/restricted roles could go here, but using flags is better
             if (!canViewAds && cfg.key === "adsHariIni") return false;
             if (!canViewFinance && (cfg.key === "pemasukanHariIni" || cfg.key === "pengeluaranHariIni" || cfg.key === "labaHariIni")) return false;
             return true;
           }).map(cfg => {
             const val = data.kpi[cfg.key as keyof typeof data.kpi] ?? 0;
             return (
               <div key={cfg.key} className="kpi-card">
                 <div className="kpi-icon" style={{ background: cfg.bg, color: cfg.color }}>{cfg.icon}</div>
                 <div className="kpi-label">{cfg.label}</div>
                 <div className="kpi-value">{cfg.isCurrency === false ? val.toLocaleString("id-ID") : formatCurrency(val)}</div>
                 {cfg.key === "pemasukanHariIni" && (
                   <div className={`kpi-change ${pemasukanChange >= 0 ? "up" : "down"}`}>
                     {pemasukanChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                     {Math.abs(pemasukanChange).toFixed(1)}%
                   </div>
                 )}
               </div>
             );
           })
         )}

         {/* Akademik KPIs if permitted */}
         {canViewAkademik && akademikData?.kpi && (
           <>
              <div className="kpi-card" style={{ "--kpi-color": "#818cf8", "--kpi-bg": "rgba(129,140,248,0.1)" } as any}>
                <div className="kpi-icon" style={{ color: "#818cf8" }}><Users size={24} /></div>
                <div className="kpi-label">Murid Baru Hari Ini</div>
                <div className="kpi-value">{akademikData.kpi.muridBariIni}</div>
              </div>
              <div className="kpi-card" style={{ "--kpi-color": "#10b981", "--kpi-bg": "rgba(16,185,129,0.1)" } as any}>
                <div className="kpi-icon" style={{ color: "#10b981" }}><BookOpen size={24} /></div>
                <div className="kpi-label">Kelas Aktif</div>
                <div className="kpi-value">{akademikData.kpi.kelasAktif}</div>
              </div>
           </>
         )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: canViewFinance && canViewAkademik ? "1.5fr 1fr" : "1fr", gap: 24, marginBottom: 24 }}>
        {/* TREDS/CHARTS */}
        {canViewFinance && data?.trendData && (
          <div className="card">
             <div className="card-header">
                <div>
                   <div className="card-title">Performa Keuangan</div>
                   <div className="card-subtitle">30 hari terakhir</div>
                </div>
             </div>
             <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={data.trendData.map(d => ({ ...d, date: formatDate(d.date, "dd/MM") }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<PremiumTooltip />} />
                      <Line type="monotone" dataKey="pemasukan" stroke="#10b981" strokeWidth={3} dot={false} />
                      {canViewFinance && <Line type="monotone" dataKey="pengeluaran" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" />}
                   </LineChart>
                </ResponsiveContainer>
             </div>
          </div>
        )}

        {canViewAkademik && akademikData?.trendData && (
          <div className="card shadow-glow">
             <div className="card-header">
                <div className="card-title">Tren Murid Baru</div>
                <TrendingUp size={18} style={{ color: "var(--brand-primary-light)" }} />
             </div>
             <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={akademikData.trendData.map(d => ({ ...d, date: formatDate(d.date, "dd/MM") }))}>
                      <Tooltip content={<PremiumTooltip />} />
                      <Area type="monotone" dataKey="murid" stroke="#818cf8" fill="#818cf8" fillOpacity={0.1} />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        )}
      </div>

      {canViewFinance && data?.transaksiTerkini && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Transaksi Terkini</div>
          <div className="table-wrapper">
             <table>
                <thead>
                   <tr>
                      <th>Siswa</th>
                      <th>Program</th>
                      <th style={{ textAlign: "right" }}>Nominal</th>
                   </tr>
                </thead>
                <tbody>
                   {data.transaksiTerkini.slice(0, 5).map(t => (
                     <tr key={t.id}>
                        <td>{t.siswa?.nama}</td>
                        <td>{t.program?.nama}</td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "var(--success)" }}>{formatCurrency(t.hargaFinal)}</td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
}
