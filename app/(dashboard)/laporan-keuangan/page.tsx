"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { 
  BarChart2, 
  FileText, 
  Table as TableIcon, 
  TrendingUp, 
  Tag, 
  TrendingDown, 
  Megaphone, 
  Award,
  Calendar,
  Layers,
  Search,
  Download,
  Share2,
  RefreshCw
} from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";

const PERIOD_OPTIONS = [
  { value:"today", label:"Hari Ini" },
  { value:"week", label:"Minggu Ini" },
  { value:"month", label:"Bulan Ini" },
  { value:"custom", label:"Custom" },
];

const PIE_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];

const KATEGORI_LABEL: Record<string,string> = {
  GAJI_PENGAJAR:"Gaji Pengajar",GAJI_STAF:"Gaji Staf",SEWA_TEMPAT:"Sewa Tempat",
  UTILITAS:"Utilitas",ATK:"ATK",MARKETING:"Marketing",PERALATAN:"Peralatan",
  PEMELIHARAAN:"Pemeliharaan",LAINNYA:"Lainnya"
};

export default function LaporanPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: () => {}, type: "danger" as "danger" | "warning" | "info" | "success" });

  useEffect(() => { setMounted(true); }, []);

  function fetchData() {
    const p = new URLSearchParams({ type: period });
    if (period==="custom" && from && to) { p.set("from", from); p.set("to", to); }
    setLoading(true);
    fetch(`/api/laporan?${p}`)
      .then(r=>r.json())
      .then(d=>{ 
        setData(d);
        setLoading(false); 
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }

  useEffect(()=>{ fetchData(); },[period, from, to]);

  async function exportExcel() {
    setExporting(true);
    const { default: XLSX } = await import("xlsx");
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan
    const ringkasanData = [
      ["LAPORAN KEUANGAN - SPEAKING PARTNER BY KAMPUNG INGGRIS"],
      [`Periode: ${formatDate(data.periode.from)} - ${formatDate(data.periode.to)}`],
      [],
      ["RINGKASAN"],
      ["Laba Bersih", data.ringkasan.labaBersih],
      [],
      ["BREAKDOWN SUMBER PEMASUKAN"],
      ["Regular (Murid Baru)", data.ringkasan.sourceBreakdown?.REGULAR || 0],
      ["Repeat Order (RO)", data.ringkasan.sourceBreakdown?.RO || 0],
      ["Sosmed (Viral)", data.ringkasan.sourceBreakdown?.SOSMED || 0],
      ["Jalur Affiliate", data.ringkasan.sourceBreakdown?.AFFILIATE || 0],
      ["Produk Live", data.ringkasan.sourceBreakdown?.LIVE || 0],
      ["Produk TOEFL (Shared)", data.ringkasan.sourceBreakdown?.TOEFL || 0],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(ringkasanData);
    XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan");

    // Sheet 2: Per Program
    const progData = [["Program","Tipe","Total","Transaksi"],...(data.pemasukanPerProgram??[]).map((p:any)=>[p.nama,p.tipe,p.total,p.count])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(progData), "Per Program");

    // Sheet 3: Per CS
    const csData = [["CS","Total","Transaksi"],...(data.pemasukanPerCS??[]).map((c:any)=>[c.nama,c.total,c.count])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(csData), "Per CS");

    // Sheet 4: Pengeluaran
    const penData = [["Kategori","Total","Transaksi"],...(data.pengeluaranPerKategori??[]).map((k:any)=>[KATEGORI_LABEL[k.kategori]??k.kategori,k.total,k.count])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(penData), "Pengeluaran");

    XLSX.writeFile(wb, `laporan_keuangan_${period}.xlsx`);
    setExporting(false);
  }

  async function exportPDF() {
    setExporting(true);
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    if (!data) { setExporting(false); return; }

    const doc = new jsPDF();
    const d = data;

    // Header
    doc.setFontSize(14); doc.setFont("helvetica","bold");
    doc.text("SPEAKING PARTNER BY KAMPUNG INGGRIS", 105, 15, { align:"center" });
    doc.setFontSize(11); doc.setFont("helvetica","normal");
    doc.text("LAPORAN KEUANGAN", 105, 22, { align:"center" });
    doc.setFontSize(9);
    doc.text(`Periode: ${formatDate(d.periode.from)} - ${formatDate(d.periode.to)}`, 105, 29, { align:"center" });
    doc.line(15, 33, 195, 33);

    // Ringkasan
    doc.setFontSize(11); doc.setFont("helvetica","bold");
    doc.text("RINGKASAN KEUANGAN", 15, 41);

    autoTable(doc, {
      startY: 45,
      head: [["Keterangan","Jumlah"]],
      body: [
        ["Total Pemasukan", formatCurrency(d.ringkasan.totalPemasukan)],
        ["Total Diskon", `- ${formatCurrency(d.ringkasan.totalDiskon)}`],
        ["Pengeluaran Operasional", `- ${formatCurrency(d.ringkasan.totalPengeluaran)}`],
        ["Spent Ads", `- ${formatCurrency(d.ringkasan.totalAds)}`],
        ["LABA BERSIH", formatCurrency(d.ringkasan.labaBersih)],
        [],
        ["SUMBER: REGULAR", formatCurrency(d.ringkasan.sourceBreakdown?.REGULAR || 0)],
        ["SUMBER: REPEAT ORDER", formatCurrency(d.ringkasan.sourceBreakdown?.RO || 0)],
        ["SUMBER: SOSMED/VIRAL", formatCurrency(d.ringkasan.sourceBreakdown?.SOSMED || 0)],
        ["SUMBER: AFFILIATE", formatCurrency(d.ringkasan.sourceBreakdown?.AFFILIATE || 0)],
        ["SUMBER: PRODUK LIVE", formatCurrency(d.ringkasan.sourceBreakdown?.LIVE || 0)],
        ["SUMBER: PRODUK TOEFL", formatCurrency(d.ringkasan.sourceBreakdown?.TOEFL || 0)],
      ],
      styles: { fontSize:9 },
      headStyles: { fillColor:[99,102,241] },
      bodyStyles: { textColor:[30,30,30] },
      alternateRowStyles: { fillColor:[245,245,255] },
      columns:[{ header:"Keterangan",dataKey:"0" },{ header:"Jumlah",dataKey:"1" }],
    });

    // Per CS
    if (d.pemasukanPerCS?.length > 0) {
      const y = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(11); doc.setFont("helvetica","bold");
      doc.text("PEMASUKAN PER CS", 15, y);
      autoTable(doc, {
        startY: y+4,
        head:[["CS","Total Pemasukan","Jumlah Transaksi"]],
        body: d.pemasukanPerCS.map((c:any)=>[c.nama, formatCurrency(c.total), c.count]),
        styles:{ fontSize:9 }, headStyles:{ fillColor:[16,185,129] },
      });
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i=1;i<=pageCount;i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setFont("helvetica","normal");
      doc.text(`Dicetak: ${formatDate(new Date())} | hal ${i}/${pageCount}`, 105, 290, { align:"center" });
    }

    doc.save(`laporan_keuangan_${period}.pdf`);
    setExporting(false);
  }

  const labaBersih = data?.ringkasan?.labaBersih ?? 0;
  const pieData = data?.pengeluaranPerKategori?.map((k:any,i:number)=>({ name: KATEGORI_LABEL[k.kategori]??k.kategori, value: k.total, color: PIE_COLORS[i%PIE_COLORS.length] })) ?? [];

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <BarChart2 size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Executive Insights</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Laporan Keuangan</h1>
          <p className="body-lg" style={{ margin: 0 }}>Analisis mendalam laba/rugi dan performa bisnis</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" style={{ borderRadius: 'var(--radius-full)' }} onClick={exportExcel} disabled={exporting || loading}>
            <TableIcon size={16} /> Export Excel
          </button>
          <button className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)' }} onClick={exportPDF} disabled={exporting || loading}>
            <FileText size={18} /> Export PDF
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {/* Filter Section */}
        <div style={{ background: 'var(--surface-container-low)', padding: '12px 16px', borderRadius: 'var(--radius-xl)', marginBottom: 32, border: '1px solid var(--ghost-border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: period === 'custom' ? 12 : 0 }}>
            {PERIOD_OPTIONS.map(opt => (
              <button 
                key={opt.value} 
                className={`btn ${period === opt.value ? "btn-primary" : "btn-secondary"}`} 
                onClick={() => setPeriod(opt.value)}
                style={{ 
                  padding: '6px 16px', 
                  borderRadius: 100, 
                  fontSize: 13, 
                  fontWeight: 600,
                  flex: '0 0 auto'
                }}
              >
                {opt.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div className="flex items-center gap-2">
              <button 
                className="btn btn-sm btn-ghost" 
                onClick={async () => {
                  setConfirmModal({
                    show: true,
                    title: "Bersihkan Duplikat?",
                    message: "Apakah Anda yakin ingin menjalankan pembersihan data program yang duplikat? Tindakan ini akan merapikan data produk di database.",
                    type: "warning",
                    onConfirm: async () => {
                      setLoading(true);
                      await fetch('/api/admin/cleanup-programs', { method: 'POST' });
                      fetchData();
                      setConfirmModal(prev => ({ ...prev, show: false }));
                    }
                  });
                }}
                title="Bersihkan duplikat data program"
              >
                <RefreshCw size={16} className="mr-2" /> Sync & Cleanup
              </button>
              <button className="btn btn-sm" onClick={fetchData}>
                <RefreshCw size={16} className="mr-2" /> Refresh Data
              </button>
            </div>
          </div>

          {period === "custom" && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: '1 1 100%' }}>
                <Calendar size={18} style={{ color: "var(--primary)" }} />
                <input type="date" className="form-control" value={from} onChange={e => setFrom(e.target.value)} style={{ padding: '8px 16px', borderRadius: 100, fontSize: 13, flex: 1 }} />
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>to</span>
                <input type="date" className="form-control" value={to} onChange={e => setTo(e.target.value)} style={{ padding: '8px 16px', borderRadius: 100, fontSize: 13, flex: 1 }} />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="form-grid-3">
            {[1,2,3,4,5,6].map(i=><div key={i} className="skeleton" style={{ height:100,borderRadius:16 }} />)}
          </div>
        ) : !data || data.error ? (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Tidak Dapat Menampilkan Laporan</h3>
            <p style={{ color: 'var(--danger)', fontWeight: 600, maxWidth: 400, margin: '0 auto' }}>
              {data?.error || "Pilih periode lain atau pastikan data transaksi sudah benar."}
            </p>
            {data?.details && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>Detail: {data.details}</p>}

          </div>
        ) : (
          <>
            {/* Laba/Rugi Summary */}
            <div className="kpi-grid" style={{ marginBottom: 48 }}>
              {[
                { label:"Total Pemasukan", value: data.ringkasan.totalPemasukan, color:"var(--success)", bg: "var(--success-bg)", icon:<TrendingUp size={24} /> },
                { label:"Total Diskon", value: data.ringkasan.totalDiskon, color:"var(--warning)", bg: "var(--warning-bg)", icon:<Tag size={24} /> },
                { label:"Pengeluaran Ops", value: data.ringkasan.totalPengeluaran, color:"var(--danger)", bg: "var(--danger-bg)", icon:<TrendingDown size={24} /> },
                { label:"Spent Ads", value: data.ringkasan.totalAds, color:"#f59e0b", bg: "rgba(245,158,11,0.1)", icon:<Megaphone size={24} /> },
                { label:"Laba Bersih", value: labaBersih, color: "var(--on-surface)", bg: "var(--primary-container)", icon:<Award size={24} /> },
              ].map(item=>(
                <div key={item.label} className="kpi-card" style={{ "--kpi-color":item.color, "--kpi-bg":item.bg } as any}>
                  <div className="kpi-icon" style={{ color: item.color }}>{item.icon}</div>
                  <div className="kpi-label">{item.label}</div>
                  <div className="kpi-value">{formatCurrency(item.value)}</div>
                </div>
              ))}
            </div>

            {/* Source Breakdown Section */}
            <div className="card" style={{ marginBottom: 48, padding: '24px 32px' }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <Layers size={18} style={{ color: "var(--primary)" }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Breakdown Sumber Pemasukan</h3>
              </div>
              <div className="kpi-grid">
                {[
                  { label: "Regular (Murid Baru)", key: "REGULAR", color: "#6366f1", icon: "🌱" },
                  { label: "Repeat Order (RO)", key: "RO", color: "#10b981", icon: "🔁" },
                  { label: "Sosmed / Viral", key: "SOSMED", color: "#ec4899", icon: "📱" },
                  { label: "Jalur Affiliate", key: "AFFILIATE", color: "#8b5cf6", icon: "🤝" },
                  { label: "Produk Live", key: "LIVE", color: "#f59e0b", icon: "📹" },
                  { label: "Produk TOEFL", key: "TOEFL", color: "#3b82f6", icon: "📝" }
                ].map(s => {
                  const val = data.ringkasan.sourceBreakdown?.[s.key] || 0;
                  const total = data.ringkasan.totalPemasukan || 1;
                  const pct = (val / total) * 100;
                  return (
                    <div key={s.key} style={{ background: 'var(--surface-container-lowest)', padding: 20, borderRadius: 16, border: '1px solid var(--ghost-border)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, height: 4, width: `${pct}%`, background: s.color }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 24 }}>{s.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{formatCurrency(val)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Charts Row */}
            <div className="form-grid-2" style={{ marginBottom:16 }}>
              {/* Pemasukan per Program */}
              <div className="card">
                <div className="card-header"><div className="card-title">💰 Pemasukan per Program</div></div>
                {mounted && data.pemasukanPerProgram?.length > 0 ? (
                  <div style={{ height:240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.pemasukanPerProgram}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="nama" tick={{ fill:"#64748b",fontSize:11 }} />
                        <YAxis tickFormatter={v=>`${(v/1000000).toFixed(1)}jt`} tick={{ fill:"#64748b",fontSize:10 }} />
                        <Tooltip formatter={(v:any)=>formatCurrency(v)} />
                        <Bar dataKey="total" fill="#6366f1" radius={[4,4,0,0]} name="Total" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p style={{ color:"var(--text-muted)",textAlign:"center",padding:32 }}>Tidak ada data</p>}
              </div>

              {/* Pengeluaran Pie */}
              <div className="card">
                <div className="card-header"><div className="card-title">💸 Breakdown Pengeluaran</div></div>
                {mounted && pieData.length > 0 ? (
                  <div style={{ height:240, display:"flex", alignItems:"center" }}>
                    <ResponsiveContainer width="50%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value">
                          {pieData.map((entry:any,i:number)=><Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v:any)=>formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
                      {pieData.map((p:any,i:number)=>(
                        <div key={i} style={{ display:"flex",alignItems:"center",gap:8,fontSize:12 }}>
                          <div style={{ width:10,height:10,borderRadius:"50%",background:p.color,flexShrink:0 }} />
                          <span style={{ color:"var(--text-secondary)" }}>{p.name}</span>
                          <span style={{ marginLeft:"auto",fontWeight:600,color:"var(--text-primary)" }}>{formatCurrency(p.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <p style={{ color:"var(--text-muted)",textAlign:"center",padding:32 }}>Tidak ada data</p>}
              </div>
            </div>

            {/* Per CS Table */}
            {data.pemasukanPerCS?.length > 0 && (
              <div className="card">
                <div className="card-header"><div className="card-title">👨‍💼 Pemasukan per CS</div></div>
                <div className="table-wrapper" style={{ border:"none" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th><th>Nama CS</th><th className="text-right">Total Pemasukan</th><th className="text-right">Jumlah Transaksi</th><th className="text-right">Rata-rata/Transaksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pemasukanPerCS.sort((a:any,b:any)=>b.total-a.total).map((cs:any,i:number)=>(
                        <tr key={cs.csId}>
                          <td style={{ fontWeight:700,color: i===0?"#fbbf24":i===1?"#94a3b8":i===2?"#cd7c2f":"var(--text-muted)" }}>
                            {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
                          </td>
                          <td style={{ fontWeight:600 }}>{cs.nama}</td>
                          <td className="text-right" style={{ fontWeight:700,color:"var(--success)" }}>{formatCurrency(cs.total)}</td>
                          <td className="text-right">{cs.count}</td>
                          <td className="text-right" style={{ color:"var(--text-muted)" }}>{formatCurrency(cs.count>0?cs.total/cs.count:0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
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
