"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { hasRole } from "@/lib/roles";
import { formatCurrency } from "@/lib/utils";
import { Video, Users, TrendingUp, Wallet, RefreshCw, Calendar, Clock } from "lucide-react";

export default function SPVMultimediaPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  function fetchData() {
    setLoading(true);
    fetch(`/api/spv/multimedia?period=${period}`)
      .then(r => r.json())
      .then(d => {
        setStats(d.talentStats ?? []);
        setSummary(d.summary ?? {});
        setLoading(false);
      }).catch(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, [period]);

  if (!hasRole(session, "spv_multimedia") && !hasRole(session, "admin") && !hasRole(session, "finance")) {
    return <div className="page-container"><div style={{ padding: 64, textAlign: "center", color: "var(--text-muted)" }}>Akses ditolak.</div></div>;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
          <Video size={18} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Supervisor Mode</span>
        </div>
        <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: "2.5rem" }}>Dashboard SPV Multimedia</h1>
        <p className="body-lg" style={{ margin: 0 }}>Pantau performa tim Talent Live dan aktivitas multimedia</p>
      </div>

      {/* Filter */}
      <div className="card" style={{ padding: "12px 20px", marginBottom: 32, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Calendar size={16} style={{ color: "var(--primary)" }} />
        {[
          { val: "today", label: "Hari Ini" },
          { val: "week", label: "Minggu Ini" },
          { val: "month", label: "Bulan Ini" },
          { val: "year", label: "Tahun Ini" },
        ].map(p => (
          <button key={p.val} onClick={() => setPeriod(p.val)}
            className={`btn btn-sm ${period === p.val ? "btn-primary" : "btn-secondary"}`}
            style={{ borderRadius: "var(--radius-full)" }}>
            {p.label}
          </button>
        ))}
        <button className="btn btn-secondary btn-icon btn-sm" style={{ marginLeft: "auto" }} onClick={fetchData}><RefreshCw size={15} /></button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 40 }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ color: "var(--primary)" }}><Video size={24} /></div>
          <div className="kpi-label">Total Sesi Live</div>
          <div className="kpi-value">{summary.totalSesi ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ color: "var(--success)" }}><Users size={24} /></div>
          <div className="kpi-label">Leads dari Live</div>
          <div className="kpi-value">{summary.totalLeads ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ color: "var(--warning)" }}><Wallet size={24} /></div>
          <div className="kpi-label">Omset dari Talent</div>
          <div className="kpi-value">{formatCurrency(summary.totalOmset ?? 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ color: "var(--info, #06b6d4)" }}><Clock size={24} /></div>
          <div className="kpi-label">Total Jam Live</div>
          <div className="kpi-value">{summary.totalJamLive ?? 0} <span style={{ fontSize: 14, color: "var(--text-muted)" }}>jam</span></div>
        </div>
      </div>

      {/* Per-Talent Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 32 }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--ghost-border)", fontWeight: 700, fontSize: 15 }}>
          🎬 Performa Per Talent Live
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nama Talent</th>
                <th style={{ textAlign: "right" }}>Sesi Live</th>
                <th style={{ textAlign: "right" }}>Jam Live</th>
                <th style={{ textAlign: "right" }}>Leads</th>
                <th style={{ textAlign: "right" }}>Closing</th>
                <th style={{ textAlign: "right" }}>Omset</th>
                <th style={{ textAlign: "right" }}>Fee Talent</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Memuat data...</td></tr>
              ) : stats.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Tidak ada data talent di periode ini</td></tr>
              ) : stats.map((talent: any) => (
                <tr key={talent.talentId}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(249,115,22,0.1)", color: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>
                        {talent.name?.[0] ?? "?"}
                      </div>
                      <div style={{ fontWeight: 700 }}>{talent.name}</div>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{talent.totalSesi}</td>
                  <td style={{ textAlign: "right", color: "var(--text-muted)" }}>{talent.totalJam ?? 0} jam</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{talent.totalLeads}</td>
                  <td style={{ textAlign: "right", color: "var(--success)", fontWeight: 600 }}>{talent.totalClosing}</td>
                  <td style={{ textAlign: "right", color: "var(--primary)", fontWeight: 700 }}>{formatCurrency(talent.totalOmset)}</td>
                  <td style={{ textAlign: "right", color: "var(--success)" }}>{formatCurrency(talent.totalFee ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coming Soon: Social Metrics */}
      <div className="card" style={{ padding: 32, textAlign: "center", border: "2px dashed var(--ghost-border)" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📱</div>
        <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Social Media Metrics</h3>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Modul untuk memantau views, likes, engagement, dan metrik sosial media<br />
          sedang dalam tahap pengembangan.
        </p>
        <div style={{ marginTop: 16 }}>
          <span style={{ background: "var(--warning-bg)", color: "var(--warning)", padding: "4px 14px", borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 700 }}>
            🚧 Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}
