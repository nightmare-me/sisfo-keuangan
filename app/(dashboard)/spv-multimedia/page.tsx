"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { hasRole } from "@/lib/roles";
import { formatCurrency } from "@/lib/utils";
import { 
  Video, Users, TrendingUp, Wallet, RefreshCw, 
  Calendar, Clock, Eye, Heart, MessageSquare, 
  Share2, Film, CheckCircle2, AlertCircle, Plus,
  LayoutGrid, BarChart3, ListTodo, ExternalLink
} from "lucide-react";

export default function SPVMultimediaPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ social: {}, production: {} });
  const [socialMetrics, setSocialMetrics] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [viralContents, setViralContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState("live"); // live, social, production

  function fetchData() {
    setLoading(true);
    fetch(`/api/spv/multimedia?period=${period}`)
      .then(r => r.json())
      .then(d => {
        setStats(d.talentStats ?? []);
        setSummary(d.summary ?? { social: {}, production: {} });
        setSocialMetrics(d.socialMetrics ?? []);
        setContents(d.contents ?? []);
        setViralContents(d.viralContents ?? []);
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20 }}>
          <div>
            <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: "2.5rem" }}>Multimedia Intelligence</h1>
            <p className="body-lg" style={{ margin: 0, color: "var(--text-muted)" }}>Pantau sinergi Talent Live, Metrik Sosmed, dan Alur Produksi Konten</p>
          </div>
          
          {/* Period Filter */}
          <div className="card" style={{ padding: "8px 12px", display: "flex", gap: 8, alignItems: "center", borderRadius: 16 }}>
            {[
              { val: "today", label: "Hari Ini" },
              { val: "week", label: "Minggu" },
              { val: "month", label: "Bulan" },
              { val: "year", label: "Tahun" },
            ].map(p => (
              <button key={p.val} onClick={() => setPeriod(p.val)}
                className={`btn btn-sm ${period === p.val ? "btn-primary" : "btn-ghost"}`}
                style={{ borderRadius: 10, fontSize: 12, padding: "6px 12px" }}>
                {p.label}
              </button>
            ))}
            <button className="btn btn-ghost btn-icon btn-sm" onClick={fetchData}><RefreshCw size={14} /></button>
          </div>
        </div>
      </div>

      {/* KPI Section - Dynamic based on Tab */}
      <div className="kpi-grid" style={{ marginBottom: 32 }}>
        {/* Row 1: Live Stats (Always show or focus based on tab) */}
        <div className="kpi-card" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div className="kpi-icon" style={{ color: "var(--primary)" }}><Video size={20} /></div>
          <div className="kpi-label">Sesi Live</div>
          <div className="kpi-value">{summary.totalSesi ?? 0}</div>
          <div className="kpi-sublabel">{summary.totalJamLive ?? 0} Jam Total</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #ec4899" }}>
          <div className="kpi-icon" style={{ color: "#ec4899" }}><Eye size={20} /></div>
          <div className="kpi-label">Total Views</div>
          <div className="kpi-value">{(summary.social?.views ?? 0).toLocaleString()}</div>
          <div className="kpi-sublabel">Semua Platform</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #8b5cf6" }}>
          <div className="kpi-icon" style={{ color: "#8b5cf6" }}><Film size={20} /></div>
          <div className="kpi-label">Konten Diposting</div>
          <div className="kpi-value">{summary.production?.posted ?? 0}</div>
          <div className="kpi-sublabel">Dari {summary.production?.total ?? 0} Rencana</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #f59e0b" }}>
          <div className="kpi-icon" style={{ color: "#f59e0b" }}><Users size={20} /></div>
          <div className="kpi-label">Total Followers</div>
          <div className="kpi-value">{(summary.social?.followers ?? 0).toLocaleString()}</div>
          <div className="kpi-sublabel" style={{ color: (summary.social?.followerGrowth ?? 0) >= 0 ? "var(--success)" : "var(--danger)" }}>
            {(summary.social?.followerGrowth ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(summary.social?.followerGrowth ?? 0).toLocaleString()} periode ini
          </div>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #ef4444" }}>
          <div className="kpi-icon" style={{ color: "#ef4444" }}><TrendingUp size={20} /></div>
          <div className="kpi-label">Konten Viral</div>
          <div className="kpi-value">{summary.production?.viral ?? 0}</div>
          <div className="kpi-sublabel">Views &gt; Threshold</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, borderBottom: "1px solid var(--ghost-border)", paddingBottom: 16 }}>
        {[
          { id: "live", label: "Talent Performance", icon: <Users size={18} /> },
          { id: "social", label: "Social Media Audit", icon: <BarChart3 size={18} /> },
          { id: "production", label: "Content Tracker", icon: <ListTodo size={18} /> },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 12,
              border: "none",
              background: activeTab === tab.id ? "var(--primary-container)" : "transparent",
              color: activeTab === tab.id ? "var(--primary)" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Areas */}
      {activeTab === "live" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--ghost-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>🎬 Performa Per Talent Live</span>
            <button className="btn btn-ghost btn-sm" onClick={() => window.location.href='/staff/live'}>Input Jam Live</button>
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
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 32 }}>Memuat data...</td></tr>
                ) : (!Array.isArray(stats) || stats.length === 0) ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 48 }}>Tidak ada data talent</td></tr>
                ) : stats.map((talent: any) => (
                  <tr key={talent.talentId}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{talent.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>ID: {talent.talentId.slice(-6)}</div>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{talent.totalSesi}</td>
                    <td style={{ textAlign: "right" }}>{talent.totalJam ?? 0} jam</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{talent.totalLeads}</td>
                    <td style={{ textAlign: "right", color: "var(--success)", fontWeight: 600 }}>{talent.totalClosing}</td>
                    <td style={{ textAlign: "right", color: "var(--primary)", fontWeight: 700 }}>{formatCurrency(talent.totalOmset)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "social" && (
        <div className="panel-grid-2" style={{ gap: 24 }}>
          {/* Social Metrics Table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--ghost-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>📊 Audit Metrik Harian</span>
              <button 
                className="btn btn-primary btn-sm" 
                style={{ borderRadius: 8 }}
                onClick={() => window.location.href='/multimedia/metrics'}
              >
                <Plus size={14} /> Tambah Metrik
              </button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th style={{ textAlign: "right" }}>Followers</th>
                    <th style={{ textAlign: "right" }}>Views</th>
                    <th style={{ textAlign: "right" }}>Likes</th>
                    <th style={{ textAlign: "right" }}>Engagement</th>
                    <th>Update</th>
                  </tr>
                </thead>
                <tbody>
                  {(!Array.isArray(socialMetrics) || socialMetrics.length === 0) ? (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: 48 }}>Belum ada metrik tercatat</td></tr>
                  ) : socialMetrics.map((m: any) => (
                    <tr key={m.id}>
                      <td>
                        <span className="badge" style={{ 
                          background: m.platform === 'TIKTOK' ? '#000' : m.platform === 'INSTAGRAM' ? '#e1306c' : '#ff0000',
                          color: '#fff'
                        }}>{m.platform}</span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{(m.followers || 0).toLocaleString()}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{m.views.toLocaleString()}</td>
                      <td style={{ textAlign: "right" }}>{m.likes.toLocaleString()}</td>
                      <td style={{ textAlign: "right", color: "var(--success)" }}>{m.engagement.toLocaleString()}</td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(m.tanggal).toLocaleDateString("id-ID")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Social Summary Chart Mockup/Preview */}
          <div className="card" style={{ padding: 24 }}>
             <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Platform Breakdown</h3>
             <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
               {['TIKTOK', 'INSTAGRAM', 'YOUTUBE'].map(plat => {
                 const platData = (Array.isArray(socialMetrics) ? socialMetrics : []).filter(m => m.platform === plat);
                 const totalViews = platData.reduce((a,b) => a + b.views, 0);
                 const percentage = summary.social?.views > 0 ? (totalViews / summary.social.views * 100) : 0;
                 return (
                   <div key={plat}>
                     <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
                       <span>{plat}</span>
                       <span>{percentage.toFixed(1)}%</span>
                     </div>
                     <div style={{ height: 8, background: "var(--surface-container-high)", borderRadius: 4, overflow: "hidden" }}>
                       <div style={{ 
                         height: "100%", 
                         width: `${percentage}%`, 
                         background: plat === 'TIKTOK' ? '#000' : plat === 'INSTAGRAM' ? '#e1306c' : '#ff0000' 
                       }} />
                     </div>
                   </div>
                 )
               })}
             </div>
          </div>
        </div>
      )}

      {activeTab === "production" && (
        <div className="panel-grid-2" style={{ gap: 24 }}>
          {/* Main Content Table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--ghost-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>📝 Content Production Tracker</span>
              <button 
                className="btn btn-primary btn-sm" 
                style={{ borderRadius: 8 }}
                onClick={() => window.location.href='/multimedia/content'}
              >
                <Plus size={14} /> Konten Baru
              </button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Judul Konten</th>
                    <th>Tim</th>
                    <th>Status</th>
                    <th>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {(!Array.isArray(contents) || contents.length === 0) ? (
                    <tr><td colSpan={4} style={{ textAlign: "center", padding: 48 }}>Belum ada antrean konten</td></tr>
                  ) : contents.map((c: any) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                          {c.judul}
                          {c.isViral && <span title="Viral">🔥</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.platform}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>
                          <div>✍️ {c.creator?.name || "-"}</div>
                          <div>📹 {c.videographer?.name || "-"}</div>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ 
                          background: c.status === 'POSTED' ? 'var(--success-container)' : c.status === 'EDITING' ? 'var(--warning-container)' : 'var(--secondary-container)',
                          color: c.status === 'POSTED' ? 'var(--success)' : c.status === 'EDITING' ? 'var(--warning)' : 'var(--secondary)'
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {c.deadline ? new Date(c.deadline).toLocaleDateString("id-ID") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Viral Hall of Fame */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <TrendingUp className="text-success" size={18} /> Viral Hall of Fame
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {(!Array.isArray(viralContents) || viralContents.length === 0) ? (
                <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 13 }}>Belum ada konten viral tercatat</div>
              ) : viralContents.map(v => (
                <div key={v.id} style={{ padding: 12, borderRadius: 16, background: "var(--surface-container-low)", border: "1px solid var(--ghost-border)" }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{v.judul}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>by {v.creator?.name || "Team"}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--success)" }}>🔥 {v.views.toLocaleString()} Views</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
