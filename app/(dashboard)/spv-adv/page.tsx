"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { hasRole } from "@/lib/roles";
import { formatCurrency } from "@/lib/utils";
import { Megaphone, TrendingUp, Wallet, Target, RefreshCw, Calendar, Search, PlusCircle } from "lucide-react";
import Link from "next/link";

export default function SPVADVPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [search, setSearch] = useState("");

  function fetchData() {
    setLoading(true);
    fetch(`/api/spv/adv?period=${period}&search=${search}`)
      .then(r => r.json())
      .then(d => {
        setStats(d.advStats ?? []);
        setSummary(d.summary ?? {});
        setLoading(false);
      }).catch(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, [period]);
  useEffect(() => {
    const t = setTimeout(() => fetchData(), 400);
    return () => clearTimeout(t);
  }, [search]);

  if (!hasRole(session, "spv_adv") && !hasRole(session, "admin") && !hasRole(session, "finance")) {
    return <div className="page-container"><div style={{ padding: 64, textAlign: "center", color: "var(--text-muted)" }}>Akses ditolak.</div></div>;
  }

  const totalSpent = summary.totalSpent ?? 0;
  const totalLeads = summary.totalLeads ?? 0;
  const avgCPL = totalLeads > 0 ? totalSpent / totalLeads : 0;
  const totalFee = summary.totalFee ?? 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
            <Megaphone size={18} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Supervisor Mode</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: "2.5rem" }}>Dashboard SPV ADV</h1>
          <p className="body-lg" style={{ margin: 0 }}>Pantau performa iklan & tim Advertiser, serta kelola iklan Anda sendiri</p>
        </div>
        {/* SPV ADV juga bisa input iklan */}
        <Link href="/ads" className="btn btn-primary" style={{ borderRadius: "var(--radius-full)", textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <PlusCircle size={16} /> Input Iklan Saya
        </Link>
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
          <input className="form-control form-control-sm" placeholder="Cari Advertiser..." style={{ paddingLeft: 36, width: 220 }} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-secondary btn-icon btn-sm" onClick={fetchData}><RefreshCw size={15} /></button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 40 }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ color: "var(--danger)" }}><Wallet size={24} /></div>
          <div className="kpi-label">Total Spent Tim</div>
          <div className="kpi-value">{formatCurrency(totalSpent)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ color: "var(--success)" }}><Target size={24} /></div>
          <div className="kpi-label">Total Leads Tim</div>
          <div className="kpi-value">{totalLeads} <span style={{ fontSize: 14, color: "var(--text-muted)" }}>leads</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ color: "var(--warning)" }}><TrendingUp size={24} /></div>
          <div className="kpi-label">Rata-rata CPL</div>
          <div className="kpi-value">{formatCurrency(avgCPL)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ color: "var(--primary)" }}><Megaphone size={24} /></div>
          <div className="kpi-label">Total Fee Tim ADV</div>
          <div className="kpi-value">{formatCurrency(totalFee)}</div>
        </div>
      </div>

      {/* Per-ADV Performance Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--ghost-border)", fontWeight: 700, fontSize: 15 }}>
          📊 Performa Per Advertiser
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nama Advertiser</th>
                <th>Kategori</th>
                <th style={{ textAlign: "right" }}>Spent</th>
                <th style={{ textAlign: "right" }}>Leads</th>
                <th style={{ textAlign: "right" }}>CPL</th>
                <th style={{ textAlign: "right" }}>Fee ADV</th>
                <th style={{ textAlign: "right" }}>Efisiensi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Memuat data...</td></tr>
              ) : stats.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Tidak ada data ADV ditemukan</td></tr>
              ) : stats.map((adv: any) => {
                const cpl = adv.totalLeads > 0 ? adv.totalSpent / adv.totalLeads : 0;
                const efisiensi = cpl < 10000 ? "🟢 Efisien" : cpl < 15000 ? "🟡 Normal" : "🔴 Tinggi";
                return (
                  <tr key={adv.advId}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(139,92,246,0.1)", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>
                          {adv.name?.[0] ?? "?"}
                        </div>
                        <div style={{ fontWeight: 700 }}>{adv.name}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(adv.teamTypes || ["ADV"]).map((t: string) => (
                          <span key={t} style={{ 
                            fontSize: 9, 
                            fontWeight: 800, 
                            padding: '1px 6px', 
                            borderRadius: 4, 
                            background: 'rgba(99,102,241,0.1)', 
                            color: 'var(--primary)', 
                            border: '1px solid rgba(99,102,241,0.2)',
                            textTransform: 'uppercase' 
                          }}>
                            {t.replace('ADV_', '')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--danger)", fontWeight: 600 }}>{formatCurrency(adv.totalSpent)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--success)" }}>{adv.totalLeads}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{formatCurrency(cpl)}</td>
                    <td style={{ textAlign: "right", color: "var(--primary)", fontWeight: 700 }}>{formatCurrency(adv.totalFee)}</td>
                    <td style={{ textAlign: "right", fontSize: 12 }}>{efisiensi}</td>
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
                  <td colSpan={2} style={{ padding: "12px 16px" }}>TOTAL TIM</td>
                  <td style={{ textAlign: "right", color: "var(--danger)", padding: "12px 16px" }}>{formatCurrency(totalSpent)}</td>
                  <td style={{ textAlign: "right", color: "var(--success)", padding: "12px 16px" }}>{totalLeads}</td>
                  <td style={{ textAlign: "right", padding: "12px 16px" }}>
                    <span style={{ color: "var(--on-surface)", fontWeight: 800 }}>
                      {formatCurrency(avgCPL)}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", color: "var(--primary)", padding: "12px 16px" }}>{formatCurrency(totalFee)}</td>
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
