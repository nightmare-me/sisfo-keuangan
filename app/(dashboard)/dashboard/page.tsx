"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from "recharts";
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

const FinanceTooltip = ({ active, payload, label }: any) => {
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

const AkademikTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 10, padding: "12px 16px" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4 }}>{label}</p>
        <p style={{ color: "#818cf8", fontSize: 13, fontWeight: 600 }}>{payload[0].value} murid baru</p>
      </div>
    );
  }
  return null;
};

// ── KPI Config ──────────────────────────────────────────────

const KPI_FINANCE = [
  { key: "pemasukanHariIni", label: "Pemasukan Hari Ini", icon: "💰", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  { key: "pengeluaranHariIni", label: "Pengeluaran Hari Ini", icon: "💸", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  { key: "adsHariIni", label: "Spent Ads Hari Ini", icon: "📣", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  { key: "labaHariIni", label: "Laba Bersih Hari Ini", icon: "📈", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  { key: "siswAktif", label: "Siswa Aktif", icon: "👨‍🎓", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", isCurrency: false },
];

const TIPE_BADGE: Record<string, string> = {
  REGULAR: "badge-info", PRIVATE: "badge-primary", SEMI_PRIVATE: "badge-warning",
};

// ── Main Component ──────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
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

  if (loading) {
    return (
      <div className="page-container">
        <div className="kpi-grid">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
        </div>
      </div>
    );
  }

  // ── AKADEMIK View ─────────────────────────────────────────
  if (isAkademik && akademikData) {
    const kpi = akademikData.kpi;
    const muridChange = percentageChange(kpi.muridBariIni, kpi.muridKemarin);

    return (
      <div>
        <div className="topbar">
          <div>
            <div className="topbar-title">Dashboard Akademik</div>
            <div className="topbar-subtitle">{formatDate(today, "EEEE, dd MMMM yyyy")}</div>
          </div>
          <div className="topbar-actions">
            <span className="badge badge-primary">📚 AKADEMIK</span>
            <span className="badge badge-success">● Live</span>
          </div>
        </div>

        <div className="page-container">
          {/* KPI Cards */}
          <div className="kpi-grid">
            {/* 1. Penambahan Murid Hari Ini */}
            <div className="kpi-card" style={{ "--kpi-color": "#818cf8", "--kpi-bg": "rgba(129,140,248,0.1)" } as any}>
              <div className="kpi-icon">👨‍🎓</div>
              <div className="kpi-label">Murid Baru Hari Ini</div>
              <div className="kpi-value">{kpi.muridBariIni.toLocaleString("id-ID")}</div>
              <div className={`kpi-change ${muridChange >= 0 ? "up" : "down"}`}>
                {muridChange >= 0 ? "↑" : "↓"} {Math.abs(muridChange).toFixed(0)}% vs kemarin ({kpi.muridKemarin})
              </div>
            </div>

            {/* 2. Kelas Aktif */}
            <div className="kpi-card" style={{ "--kpi-color": "#10b981", "--kpi-bg": "rgba(16,185,129,0.1)" } as any}>
              <div className="kpi-icon">📚</div>
              <div className="kpi-label">Jumlah Kelas Aktif</div>
              <div className="kpi-value">{kpi.kelasAktif.toLocaleString("id-ID")}</div>
            </div>

            {/* 3. Siswa Aktif */}
            <div className="kpi-card" style={{ "--kpi-color": "#3b82f6", "--kpi-bg": "rgba(59,130,246,0.1)" } as any}>
              <div className="kpi-icon">🎓</div>
              <div className="kpi-label">Jumlah Siswa Aktif</div>
              <div className="kpi-value">{kpi.siswaAktif.toLocaleString("id-ID")}</div>
            </div>

            {/* 4. Pengajar Aktif */}
            <div className="kpi-card" style={{ "--kpi-color": "#f59e0b", "--kpi-bg": "rgba(245,158,11,0.1)" } as any}>
              <div className="kpi-icon">👨‍🏫</div>
              <div className="kpi-label">Pengajar Aktif</div>
              <div className="kpi-value">{kpi.pengajarAktif.toLocaleString("id-ID")}</div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, marginBottom: 16 }}>
            {/* Tren 30 Hari Penambahan Murid */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Tren 30 Hari Penambahan Murid</div>
                  <div className="card-subtitle">Jumlah siswa baru per hari</div>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={akademikData.trendData.map(d => ({
                    ...d,
                    date: formatDate(d.date, "dd/MM"),
                  }))}>
                    <defs>
                      <linearGradient id="muridGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<AkademikTooltip />} />
                    <Area type="monotone" dataKey="murid" stroke="#818cf8" strokeWidth={2} fill="url(#muridGrad)" name="Murid Baru" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Jumlah Murid Per Program */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Murid per Produk / Program</div>
                  <div className="card-subtitle">Berdasarkan pendaftaran aktif</div>
                </div>
              </div>
              {akademikData.siswaPerProgram.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {akademikData.siswaPerProgram.slice(0, 6).map((p, i) => {
                    const maxVal = akademikData.siswaPerProgram[0]?.jumlahSiswa ?? 1;
                    const pct = (p.jumlahSiswa / maxVal) * 100;
                    return (
                      <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border-default)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{p.nama}</span>
                            <span className={`badge ${TIPE_BADGE[p.tipe] ?? "badge-muted"}`} style={{ marginLeft: 6, fontSize: 9 }}>{p.tipe}</span>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#818cf8" }}>{p.jumlahSiswa} siswa</span>
                        </div>
                        <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#818cf8", borderRadius: 2, transition: "width 0.5s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: "24px 0" }}>
                  <p>Belum ada data pendaftaran</p>
                </div>
              )}
            </div>
          </div>

          {/* Murid Terkini */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">👨‍🎓 Murid Terkini</div>
              <div className="card-subtitle">Siswa yang baru saja mendaftar</div>
            </div>
            {akademikData.muridTerkini.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
                {akademikData.muridTerkini.map((s: any) => {
                  const program = s.pendaftaran?.[0]?.kelas?.program?.nama;
                  const kelas = s.pendaftaran?.[0]?.kelas?.namaKelas;
                  return (
                    <div key={s.id} style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(129,140,248,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                        🎓
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.nama}</div>
                        {program ? (
                          <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 600, marginTop: 2 }}>{program}</div>
                        ) : (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Belum masuk kelas</div>
                        )}
                        {kelas && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{kelas}</div>}
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{formatDate(s.createdAt, "dd/MM/yyyy HH:mm")}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "24px 0" }}>
                <div className="empty-state-icon">👨‍🎓</div>
                <p>Belum ada data murid</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── DEFAULT Finance/Admin/CS View ─────────────────────────
  const pemasukanChange = data ? percentageChange(data.kpi.pemasukanHariIni, data.kpi.pemasukanKemarin) : 0;

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-subtitle">{formatDate(today, "EEEE, dd MMMM yyyy")}</div>
        </div>
        <div className="topbar-actions">
          <span className="badge badge-success">● Live</span>
        </div>
      </div>

      <div className="page-container">
        {/* KPI Cards */}
        <div className="kpi-grid">
          {KPI_FINANCE.map((cfg) => {
            const value = data?.kpi[cfg.key as keyof typeof data.kpi] ?? 0;
            const isCurrency = cfg.isCurrency !== false;
            const isLaba = cfg.key === "labaHariIni";

            return (
              <div
                key={cfg.key}
                className="kpi-card"
                style={{ "--kpi-color": cfg.color, "--kpi-bg": cfg.bg } as any}
              >
                <div className="kpi-icon">{cfg.icon}</div>
                <div className="kpi-label">{cfg.label}</div>
                <div className="kpi-value" style={{ color: isLaba ? (value >= 0 ? "var(--success)" : "var(--danger)") : "var(--text-primary)" }}>
                  {isCurrency ? formatCurrency(value) : value.toLocaleString("id-ID")}
                </div>
                {cfg.key === "pemasukanHariIni" && (
                  <div className={`kpi-change ${pemasukanChange >= 0 ? "up" : "down"}`}>
                    {pemasukanChange >= 0 ? "↑" : "↓"} {Math.abs(pemasukanChange).toFixed(1)}% vs kemarin
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Tren 30 Hari</div>
                <div className="card-subtitle">Pemasukan vs Pengeluaran + Ads</div>
              </div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.trendData?.map(d => ({ ...d, date: formatDate(d.date, "dd/MM") }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                  <Tooltip content={<FinanceTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="pemasukan" stroke="#10b981" strokeWidth={2} dot={false} name="Pemasukan" />
                  <Line type="monotone" dataKey="pengeluaran" stroke="#ef4444" strokeWidth={2} dot={false} name="Pengeluaran" />
                  <Line type="monotone" dataKey="ads" stroke="#f59e0b" strokeWidth={2} dot={false} name="Ads" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Pemasukan per CS</div>
                <div className="card-subtitle">Hari ini</div>
              </div>
            </div>
            {data?.pemasukanPerCS && data.pemasukanPerCS.length > 0 ? (
              <div className="chart-container" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.pemasukanPerCS} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                    <YAxis dataKey="csName" type="category" tick={{ fill: "#94a3b8", fontSize: 12 }} width={90} />
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} name="Total" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "32px 0" }}>
                <div className="empty-state-icon">📊</div>
                <p>Belum ada data hari ini</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Per Program */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Pemasukan per Produk</div>
                <div className="card-subtitle">Hari ini</div>
              </div>
            </div>
            {data?.pemasukanPerProgram && data.pemasukanPerProgram.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.pemasukanPerProgram.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border-default)" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{p.programName}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.count} transaksi</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--success)" }}>{formatCurrency(p.total)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "24px 0" }}><p>Belum ada data hari ini</p></div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Transaksi Terkini</div>
            </div>
            {data?.transaksiTerkini && data.transaksiTerkini.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.transaksiTerkini.slice(0, 7).map((t: any) => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border-default)" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t.siswa?.nama ?? "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.program?.nama ?? "—"} · {t.cs?.name ?? "—"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>{formatCurrency(t.hargaFinal)}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDate(t.tanggal, "dd/MM HH:mm")}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "24px 0" }}>
                <div className="empty-state-icon">🧾</div>
                <p>Belum ada transaksi</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
