"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { hasRole } from "@/lib/roles";
import { formatCurrency } from "@/lib/utils";
import { Users, TrendingUp, Wallet, Target, RefreshCw, Calendar, Search } from "lucide-react";

export default function SPVCSPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [search, setSearch] = useState("");

  function fetchData() {
    setLoading(true);
    Promise.all([
      fetch(`/api/spv/cs?period=${period}&search=${search}`).then(r => r.json()),
    ]).then(([d]) => {
      setStats(d.csStats ?? []);
      setLeads(d.leads ?? []);
      setSummary(d.summary ?? {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, [period]);
  useEffect(() => {
    const t = setTimeout(() => fetchData(), 400);
    return () => clearTimeout(t);
  }, [search]);

  if (!hasRole(session, "spv_cs") && !hasRole(session, "admin") && !hasRole(session, "finance")) {
    return <div className="page-container"><div style={{ padding: 64, textAlign: "center", color: "var(--text-muted)" }}>Akses ditolak.</div></div>;
  }

  const totalOmset = summary.totalOmset ?? 0;
  const totalClosing = summary.totalClosing ?? 0;
  const totalLeads = summary.totalLeads ?? 0;
  const cr = totalLeads > 0 ? ((totalClosing / totalLeads) * 100).toFixed(1) : "0";

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
          <Users size={18} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Supervisor Mode</span>
        </div>
        <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: "2.5rem" }}>Dashboard SPV CS</h1>
        <p className="body-lg" style={{ margin: 0 }}>Pantau performa dan omset seluruh tim Customer Service</p>
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
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input className="form-control form-control-sm" placeholder="Cari CS..." style={{ paddingLeft: 36, width: 200 }} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-secondary btn-icon btn-sm" onClick={fetchData}><RefreshCw size={15} /></button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 40 }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ color: "var(--primary)" }}><Wallet size={24} /></div>
          <div className="kpi-label">Total Omset Tim</div>
          <div className="kpi-value">{formatCurrency(totalOmset)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ color: "var(--success)" }}><Target size={24} /></div>
          <div className="kpi-label">Total Closing</div>
          <div className="kpi-value">{totalClosing} <span style={{ fontSize: 14, color: "var(--text-muted)" }}>transaksi</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ color: "var(--warning)" }}><Users size={24} /></div>
          <div className="kpi-label">Total Leads Masuk</div>
          <div className="kpi-value">{totalLeads}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ color: "var(--danger)" }}><TrendingUp size={24} /></div>
          <div className="kpi-label">Conversion Rate Tim</div>
          <div className="kpi-value">{cr}%</div>
        </div>
      </div>

      {/* Per-CS Performance Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--ghost-border)", fontWeight: 700, fontSize: 15 }}>
          📊 Performa Per CS
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nama CS</th>
                <th style={{ textAlign: "right" }}>Leads</th>
                <th style={{ textAlign: "right" }}>Closing</th>
                <th style={{ textAlign: "right" }}>CR</th>
                <th style={{ textAlign: "right" }}>Omset</th>
                <th style={{ textAlign: "right" }}>Fee CS</th>
                <th style={{ textAlign: "right" }}>Avg Deal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Memuat data...</td></tr>
              ) : stats.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Tidak ada data CS ditemukan</td></tr>
              ) : stats.map((cs: any) => {
                const cr = cs.totalLeads > 0 ? ((cs.totalClosing / cs.totalLeads) * 100).toFixed(1) : "0";
                const avgDeal = cs.totalClosing > 0 ? cs.totalOmset / cs.totalClosing : 0;
                return (
                  <tr key={cs.csId}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary-bg)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>
                          {cs.name?.[0] ?? "?"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{cs.name}</div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                            {(cs.teamTypes || ["REGULAR"]).map((t: string) => (
                              <span key={t} style={{ 
                                fontSize: 9, 
                                fontWeight: 800, 
                                padding: '1px 6px', 
                                borderRadius: 4, 
                                background: t.includes('LIVE') ? 'rgba(99,102,241,0.1)' : 'rgba(107,114,128,0.1)',
                                color: t.includes('LIVE') ? 'var(--primary)' : 'var(--text-muted)',
                                border: t.includes('LIVE') ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(107,114,128,0.2)',
                                textTransform: 'uppercase'
                              }}>
                                {t.replace('CS_', '')}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{cs.totalLeads}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--success)" }}>{cs.totalClosing}</td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{ background: parseFloat(cr) >= 30 ? "var(--success-bg)" : parseFloat(cr) >= 15 ? "var(--warning-bg)" : "rgba(239,68,68,0.1)", color: parseFloat(cr) >= 30 ? "var(--success)" : parseFloat(cr) >= 15 ? "var(--warning)" : "var(--danger)", padding: "2px 8px", borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
                        {cr}%
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--primary)" }}>{formatCurrency(cs.totalOmset)}</td>
                    <td style={{ textAlign: "right", color: "var(--success)" }}>{formatCurrency(cs.totalFee)}</td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)", fontSize: 13 }}>{formatCurrency(avgDeal)}</td>
                  </tr>
                );
              })}
            </tbody>
            {!loading && stats.length > 0 && (
              <tfoot>
                <tr style={{ 
                  background: "var(--surface-container-low)", 
                  fontWeight: 900, 
                  borderTop: "2px solid var(--ghost-border)",
                }}>
                  <td style={{ padding: "12px 16px" }}>TOTAL TIM</td>
                  <td style={{ textAlign: "right", padding: "12px 16px" }}>{totalLeads}</td>
                  <td style={{ textAlign: "right", color: "var(--success)", padding: "12px 16px" }}>{totalClosing}</td>
                  <td style={{ textAlign: "right", padding: "12px 16px" }}>
                     <span style={{ color: "var(--danger)", fontWeight: 800 }}>{cr}%</span>
                  </td>
                  <td style={{ textAlign: "right", color: "var(--primary)", padding: "12px 16px" }}>{formatCurrency(totalOmset)}</td>
                  <td style={{ textAlign: "right", color: "var(--success)", padding: "12px 16px" }}>{formatCurrency(stats.reduce((a, b) => a + (b.totalFee ?? 0), 0))}</td>
                  <td style={{ padding: "12px 16px" }}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
