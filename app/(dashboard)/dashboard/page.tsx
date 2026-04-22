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
  Activity,
  Trophy,
  CheckCircle2,
  FileText,
  ClipboardCheck
} from "lucide-react";
import { formatCurrency, formatDate, percentageChange, hasPermission } from "@/lib/utils";
import Link from "next/link";
import PayrollEstimate from "@/components/dashboard/PayrollEstimate";

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

interface CSData {
  personal: {
    revenueToday: number;
    leads30Days: number;
    closing30Days: number;
    conversionRate: number;
  };
  leaderboard: { name: string; totalRevenue: number; closingCount: number }[];
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
              {p.name}: {typeof p.value === 'number' && p.name !== "Murid Baru" && p.name !== "Closing" ? formatCurrency(p.value) : p.value}
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
  
  // Role & Permissions
  const roleFromSession = (session?.user as any)?.roleSlug || (session?.user as any)?.role || "user";
  const roleSlug = roleFromSession.toLowerCase();
  
  const isAdmin = roleSlug === "admin" || roleSlug === "ceo" || roleSlug === "coo";
  const isFinance = roleSlug === "finance" || isAdmin;
  const isAkademik = roleSlug === "akademik" || isAdmin;
  const isCS = roleSlug === "cs" || isAdmin;
  const isPengajar = roleSlug === "pengajar" || isAdmin;

  // Granular Matrix Permissions
  const canViewAkademik = hasPermission(session, "kelas:view");
  const canViewFinance = hasPermission(session, "pemasukan:view");
  const canViewAds = hasPermission(session, "ads:view");
  
  const userName = session?.user?.name?.split(' ')[0] ?? "User";

  const [data, setData] = useState<DashboardData | null>(null);
  const [akademikData, setAkademikData] = useState<AkademikData | null>(null);
  const [csData, setCsData] = useState<CSData | null>(null);
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

    if (isCS) {
      promises.push(
        fetch("/api/dashboard-cs")
          .then(r => r.json())
          .then(d => setCsData(d))
      );
    }

    if (promises.length > 0) {
      Promise.all(promises).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [canViewAkademik, canViewFinance, isCS, period, customRange]);

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
  
  return (
    <div className="page-container">
      {/* Header Section */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--brand-primary-light)", marginBottom: 8 }}>
          <Clock size={16} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            {formatDate(today, "EEEE, dd MMMM")}
          </span>
        </div>
        <h1 className="text-gradient" style={{ fontSize: 32, fontWeight: 800 }}>{greeting}, {userName}!</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
           {isAdmin ? "Ini adalah ringkasan seluruh operasional hari ini." : `Dashboard ${roleSlug.toUpperCase()} - Selamat bekerja!`}
        </p>
      </div>

      {/* ── SECTION: PAYROLL TRANSPARENCY (Non-Admin) ── */}
      {!isAdmin && (
        <div style={{ marginBottom: 32 }}>
          <PayrollEstimate />
        </div>
      )}

      {/* Period Selector (Only for Admin/Finance/Academic) */}
      {(isFinance || isAkademik) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)', padding: '10px 16px', borderRadius: 'var(--radius-full)', marginBottom: 32, border: '1px solid var(--ghost-border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
      )}

      {/* ── SECTION: EXECUTIVE SUMMARY (Admin Only) ── */}
      {isAdmin && (
        <div className="card shadow-glow" style={{ marginBottom: 32, background: 'linear-gradient(135deg, var(--surface-container-high) 0%, var(--surface-container-low) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand-primary-light)' }}>Executive Summary</h3>
            <Sparkles size={20} className="animate-pulse" style={{ color: 'var(--warning)' }} />
          </div>
          <div className="executive-grid">
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Laba Bersih</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{data?.kpi ? formatCurrency(data.kpi.labaHariIni) : "Rp 0"}</div>
              <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>Sehat & Stabil</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Konversi Closing</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{(csData?.personal?.conversionRate || 0).toFixed(1)}%</div>
              <div style={{ fontSize: 11, color: 'var(--brand-primary-light)', marginTop: 4 }}>Average Team</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Siswa Baru (30 Hari)</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{akademikData?.trendData.reduce((acc, curr) => acc + curr.murid, 0) || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>Bertumbuh</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Retention Rate</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>88%</div>
              <div style={{ fontSize: 11, color: 'var(--brand-primary-light)', marginTop: 4 }}>Target: 90%</div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: FINANCE (Admin & Finance) ── */}
      {isFinance && (
        <div style={{ marginBottom: 48 }}>
          <div className="section-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 700 }}>
            <Wallet size={20} /> Metrik Keuangan
          </div>
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
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
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}><Megaphone size={20} /></div>
              <div className="kpi-label">Spent Ads</div>
              <div className="kpi-value">{data?.kpi ? formatCurrency(data.kpi.adsHariIni) : "Rp 0"}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed" }}><TrendingUp size={20} /></div>
              <div className="kpi-label">Laba Bersih</div>
              <div className="kpi-value">{data?.kpi ? formatCurrency(data.kpi.labaHariIni) : "Rp 0"}</div>
            </div>
          </div>
          
          <div className="panel-grid-2">
            <div className="card">
              <div className="card-header"><div className="card-title">Performa Keuangan</div></div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={(data?.trendData || []).map(d => ({ ...d, date: formatDate(d.date, "dd/MM") }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<PremiumTooltip />} />
                      <Line type="monotone" dataKey="pemasukan" stroke="#10b981" strokeWidth={3} dot={false} name="Pemasukan" />
                      {canViewAds && <Line type="monotone" dataKey="ads" stroke="#f59e0b" strokeWidth={2} dot={false} name="Spent Ads" />}
                   </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-title" style={{ marginBottom: 16 }}>Transaksi Terkini</div>
              <div className="table-wrapper" style={{ maxHeight: 280, overflowY: "auto", overflowX: 'hidden' }}>
                <table style={{ fontSize: 12, width: "100%" }}>
                  <tbody>
                    {(data?.transaksiTerkini || []).slice(0, 6).map(t => (
                      <tr key={t.id}>
                        <td style={{ padding: '10px 0' }}>
                          <div style={{ fontWeight: 600 }}>{t.siswa?.nama}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{t.program?.nama}</div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "var(--success)" }}>{formatCurrency(t.hargaFinal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: CS & SALES (Admin & CS) ── */}
      {isCS && (
        <div style={{ marginBottom: 48 }}>
          <div className="section-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 700 }}>
            <Users size={20} /> Performa Customer Service
          </div>
          <div className="panel-grid-2-reverse">
            {/* Personal CS Stats */}
            <div className="card shadow-glow" style={{ borderLeft: '4px solid var(--brand-primary-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--brand-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                   <Activity size={20} />
                </div>
                <div>
                   <div style={{ fontSize: 14, fontWeight: 700 }}>Performa Saya</div>
                   <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hari ini & 30 Hari Terakhir</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                   <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Pemasukan Saya Hari Ini</div>
                   <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(csData?.personal?.revenueToday || 0)}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                   <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Leads (30 Hari)</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{csData?.personal?.leads30Days || 0}</div>
                   </div>
                   <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Closing (30 Hari)</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand-primary-light)' }}>{csData?.personal?.closing30Days || 0}</div>
                   </div>
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                 <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trophy size={18} style={{ color: 'var(--warning)' }} /> Leaderboard CS
                 </div>
                 <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>30 Hari Terakhir</span>
              </div>
              <div className="table-wrapper">
                 <table style={{ width: "100%", fontSize: 13 }}>
                    <thead>
                       <tr>
                          <th>Rank</th>
                          <th>Nama CS</th>
                          <th style={{ textAlign: 'center' }}>Closing</th>
                          <th style={{ textAlign: 'right' }}>Total Revenue</th>
                       </tr>
                    </thead>
                    <tbody>
                       {(csData?.leaderboard || []).map((item, idx) => (
                          <tr key={idx} style={idx === 0 ? { background: 'rgba(245,158,11,0.05)' } : {}}>
                             <td style={{ width: 50, padding: '12px 8px' }}>
                                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                             </td>
                             <td style={{ fontWeight: idx === 0 ? 700 : 500 }}>{item.name}</td>
                             <td style={{ textAlign: 'center' }}>{item.closingCount}</td>
                             <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--on-surface)' }}>{formatCurrency(item.totalRevenue)}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: ACADEMIC (Admin & Akademik & Pengajar) ── */}
      {(isAkademik || isPengajar) && (
        <div style={{ marginBottom: 48 }}>
          <div className="section-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 700 }}>
            <GraduationCap size={20} /> Metrik Akademik & Pengajar
          </div>
          
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}><Users size={20} /></div>
              <div className="kpi-label">Siswa Aktif</div>
              <div className="kpi-value">{(akademikData?.kpi?.siswaAktif || 0).toLocaleString("id-ID")}</div>
            </div>
            <div className="kpi-card">
               <div className="kpi-icon" style={{ background: "rgba(129,140,248,0.1)", color: "#818cf8" }}><Sparkles size={20} /></div>
               <div className="kpi-label">Siswa Baru</div>
               <div className="kpi-value">{akademikData?.kpi?.muridBariIni || 0}</div>
            </div>
            <div className="kpi-card">
               <div className="kpi-icon" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}><BookOpen size={20} /></div>
               <div className="kpi-label">Kelas Aktif</div>
               <div className="kpi-value">{akademikData?.kpi?.kelasAktif || 0}</div>
            </div>
            <div className="kpi-card">
               <div className="kpi-icon" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}><User size={20} /></div>
               <div className="kpi-label">Pengajar Aktif</div>
               <div className="kpi-value">{akademikData?.kpi?.pengajarAktif || 0}</div>
            </div>
          </div>

          <div className="panel-grid-2">
             <div className="card">
               <div className="card-header"><div className="card-title">Tren Murid Baru</div></div>
               <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={(akademikData?.trendData || []).map(d => ({ ...d, date: formatDate(d.date, "dd/MM") }))}>
                        <Tooltip content={<PremiumTooltip />} />
                        <Area type="monotone" dataKey="murid" stroke="#818cf8" fill="#818cf8" fillOpacity={0.1} name="Murid Baru" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
             </div>

             {/* Quick Actions for Teachers */}
             {isPengajar && (
               <div className="card" style={{ background: 'var(--surface-container-high)' }}>
                 <div className="card-title" style={{ marginBottom: 20 }}>Aksi Cepat Pengajar</div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Link href="/pengajar/dashboard" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', width: '100%' }}>
                       <ClipboardCheck size={18} /> Isi Absensi Hari Ini
                    </Link>
                    <Link href="/pengajar/dashboard" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', width: '100%' }}>
                       <FileText size={18} /> Input Nilai Sertifikat
                    </Link>
                    <Link href="/pengajar/dashboard" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', width: '100%' }}>
                       <Calendar size={18} /> Lihat Jadwal Mengajar
                    </Link>
                 </div>
                 <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.03)', fontSize: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--brand-primary-light)' }}>Tips:</div>
                    Pastikan absensi diisi maksimal 1 jam setelah kelas selesai agar honor terhitung otomatis.
                 </div>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
