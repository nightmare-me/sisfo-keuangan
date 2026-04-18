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
import { formatCurrency, formatDate, percentageChange } from "@/lib/utils";

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
  const role = (session?.user as any)?.role;
  const userName = session?.user?.name?.split(' ')[0] ?? "User";
  const isAkademik = role === "AKADEMIK";

  const [data, setData] = useState<DashboardData | null>(null);
  const [akademikData, setAkademikData] = useState<AkademikData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAkademik) {
      fetch("/api/dashboard-akademik")
        .then(r => r.json())
        .then(d => { setAkademikData(d); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      fetch("/api/dashboard")
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [isAkademik]);

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

  // ── AKADEMIK View ─────────────────────────────────────────
  if (isAkademik && akademikData) {
    const kpi = akademikData.kpi;
    const muridChange = percentageChange(kpi.muridBariIni, kpi.muridKemarin);

    return (
      <div className="page-container">
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--brand-primary-light)", marginBottom: 8 }}>
            <Sparkles size={18} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Academic Center</span>
          </div>
          <h1 className="text-gradient" style={{ fontSize: 32, fontWeight: 800 }}>{greeting}, {userName}!</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Pantau perkembangan kelas dan pendaftaran hari ini.</p>
        </div>

        {/* KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi-card" style={{ "--kpi-color": "#818cf8", "--kpi-bg": "rgba(129,140,248,0.1)" } as any}>
            <div className="kpi-icon" style={{ color: "#818cf8" }}><Users size={24} /></div>
            <div className="kpi-label">Murid Baru Hari Ini</div>
            <div className="kpi-value">{kpi.muridBariIni.toLocaleString("id-ID")}</div>
            <div className={`kpi-change ${muridChange >= 0 ? "up" : "down"}`}>
              {muridChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} 
              {Math.abs(muridChange).toFixed(0)}% vs kemarin
            </div>
          </div>

          <div className="kpi-card" style={{ "--kpi-color": "#10b981", "--kpi-bg": "rgba(16,185,129,0.1)" } as any}>
            <div className="kpi-icon" style={{ color: "#10b981" }}><BookOpen size={24} /></div>
            <div className="kpi-label">Kelas Aktif</div>
            <div className="kpi-value">{kpi.kelasAktif.toLocaleString("id-ID")}</div>
          </div>

          <div className="kpi-card" style={{ "--kpi-color": "#3b82f6", "--kpi-bg": "rgba(59,130,246,0.1)" } as any}>
            <div className="kpi-icon" style={{ color: "#3b82f6" }}><GraduationCap size={24} /></div>
            <div className="kpi-label">Total Murid Aktif</div>
            <div className="kpi-value">{kpi.siswaAktif.toLocaleString("id-ID")}</div>
          </div>

          <div className="kpi-card" style={{ "--kpi-color": "#f59e0b", "--kpi-bg": "rgba(245,158,11,0.1)" } as any}>
            <div className="kpi-icon" style={{ color: "#f59e0b" }}><Clock size={24} /></div>
            <div className="kpi-label">Pengajar Aktif</div>
            <div className="kpi-value">{kpi.pengajarAktif.toLocaleString("id-ID")}</div>
          </div>
        </div>

        {/* Charts Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 24, marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Tren Pendaftaran 30 Hari</div>
                <div className="card-subtitle">Frekuensi penambahan murid setiap hari</div>
              </div>
            </div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={akademikData.trendData.map(d => ({ ...d, date: formatDate(d.date, "dd/MM") }))}>
                  <defs>
                    <linearGradient id="muridGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<PremiumTooltip />} />
                  <Area type="monotone" dataKey="murid" stroke="#818cf8" strokeWidth={3} fill="url(#muridGrad)" name="Murid Baru" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card glass">
            <div className="card-header">
              <div>
                <div className="card-title">Murid Per Program</div>
                <div className="card-subtitle">Produk terpopuler</div>
              </div>
              <Activity size={18} className="text-muted" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {akademikData.siswaPerProgram.slice(0, 5).map((p, i) => {
                const maxVal = akademikData.siswaPerProgram[0]?.jumlahSiswa ?? 1;
                const pct = (p.jumlahSiswa / maxVal) * 100;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                       <span style={{ fontSize: 13, fontWeight: 600 }}>{p.nama}</span>
                       <span style={{ fontSize: 13, fontWeight: 800, color: "var(--brand-primary-light)" }}>{p.jumlahSiswa}</span>
                    </div>
                    <div style={{ height: 6, background: "var(--bg-elevated)", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, var(--brand-primary), var(--brand-primary-light))", borderRadius: 10 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Finance/Admin/CS View ─────────────────────────
  const pemasukanChange = data?.kpi ? percentageChange(data.kpi.pemasukanHariIni, data.kpi.pemasukanKemarin) : 0;

  return (
    <div className="page-container">
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--brand-primary-light)", marginBottom: 8 }}>
          <Clock size={16} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>{formatDate(today, "EEEE, dd MMMM")}</span>
        </div>
        <h1 className="text-gradient" style={{ fontSize: 32, fontWeight: 800 }}>{greeting}, {userName}!</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Berikut adalah ringkasan operasional bisnis kamu hari ini.</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {KPI_FINANCE.filter(cfg => {
          if (role === "CS") {
            return cfg.key === "pemasukanHariIni" || cfg.key === "siswAktif";
          }
          return true;
        }).map((cfg) => {
          const value = data?.kpi?.[cfg.key as keyof typeof data.kpi] ?? 0;
          const isCurrency = cfg.isCurrency !== false;
          const isPemasukan = cfg.key === "pemasukanHariIni";

          return (
            <div key={cfg.key} className="kpi-card">
              <div className="kpi-icon" style={{ background: cfg.bg, color: cfg.color }}>{cfg.icon}</div>
              <div className="kpi-label">{cfg.label}</div>
              <div className="kpi-value">
                {isCurrency ? formatCurrency(value) : value.toLocaleString("id-ID")}
              </div>
              {isPemasukan && (
                <div className={`kpi-change ${pemasukanChange >= 0 ? "up" : "down"}`}>
                  {pemasukanChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(pemasukanChange).toFixed(1)}% vs kemarin
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: role === "CS" ? "1fr" : "2fr 1fr", gap: 24, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Grafik Performa Keuangan</div>
              <div className="card-subtitle">
                {role === "CS" ? "Tren pemasukan 30 hari terakhir" : "Tren pemasukan dan pengeluaran 30 hari terakhir"}
              </div>
            </div>
            <Calendar size={20} className="text-muted" />
          </div>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.trendData?.map(d => ({ ...d, date: formatDate(d.date, "dd/MM") }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                <Tooltip content={<PremiumTooltip />} />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="pemasukan" stroke="#10b981" strokeWidth={4} dot={false} name="Pemasukan" animationDuration={1000} />
                {role !== "CS" && (
                  <>
                    <Line type="monotone" dataKey="pengeluaran" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Operasional" />
                    <Line type="monotone" dataKey="ads" stroke="#f59e0b" strokeWidth={2} dot={false} name="Ads" />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {role !== "CS" && (
          <div className="card glass shadow-glow">
             <div className="card-header">
               <div className="card-title">Top CS Performance</div>
               <TrendingUp size={18} style={{ color: "var(--brand-primary-light)" }} />
             </div>
             {data?.pemasukanPerCS && data.pemasukanPerCS.length > 0 ? (
               <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                 {data.pemasukanPerCS.slice(0, 5).map((cs, i) => (
                   <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                     <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border-default)", display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--brand-primary-light)' }}>
                       {cs.csName.charAt(0)}
                     </div>
                     <div style={{ flex: 1 }}>
                       <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                         <span style={{ fontWeight: 700, fontSize: 13 }}>{cs.csName}</span>
                         <span style={{ fontWeight: 800, color: "var(--success)" }}>{formatCurrency(cs.total)}</span>
                       </div>
                       <div style={{ height: 4, background: "var(--bg-base)", borderRadius: 10 }}>
                          <div style={{ height: "100%", width: `${(cs.total / (data.pemasukanPerCS[0]?.total || 1)) * 100}%`, background: "var(--brand-primary)", borderRadius: 10 }} />
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="empty-state">Belum ada aktivitas</div>
             )}
          </div>
        )}
      </div>

      {/* Bottom List Row */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
             <Activity size={20} className="text-primary" />
             <div className="card-title">Transaksi Terkini</div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ padding: '6px 14px' }}>Lihat Semua <ArrowRight size={14} /></button>
        </div>
        <div className="table-wrapper">
          <table className="glass">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Program</th>
                <th>CS</th>
                <th>Tanggal</th>
                <th style={{ textAlign: "right" }}>Nominal</th>
              </tr>
            </thead>
            <tbody>
              {data?.transaksiTerkini.slice(0, 6).map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                       <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                          <User size={14} />
                       </div>
                       <div>
                          <div style={{ fontWeight: 700 }}>{t.siswa?.nama}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.noSiswa}</div>
                       </div>
                    </div>
                  </td>
                  <td><span className={`badge ${TIPE_BADGE[t.program?.tipe]}`}>{t.program?.nama}</span></td>
                  <td>{t.cs?.name}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{formatDate(t.tanggal, "dd MMM, HH:mm")}</td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "var(--success)" }}>{formatCurrency(t.hargaFinal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
