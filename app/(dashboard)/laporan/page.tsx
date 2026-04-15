"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

  function fetchData() {
    const p = new URLSearchParams({ type: period });
    if (period==="custom" && from && to) { p.set("from", from); p.set("to", to); }
    setLoading(true);
    fetch(`/api/laporan?${p}`).then(r=>r.json()).then(d=>{ setData(d); setLoading(false); });
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
      ["Total Pemasukan", data.ringkasan.totalPemasukan],
      ["Total Diskon", data.ringkasan.totalDiskon],
      ["Total Pengeluaran Operasional", data.ringkasan.totalPengeluaran],
      ["Total Spent Ads", data.ringkasan.totalAds],
      ["Laba Kotor", data.ringkasan.labaKotor],
      ["Laba Bersih", data.ringkasan.labaBersih],
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
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">Laporan Keuangan</div>
          <div className="topbar-subtitle">Laba/Rugi, breakdown lengkap</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={exportExcel} disabled={exporting || loading}>📊 Export Excel</button>
          <button className="btn btn-primary" onClick={exportPDF} disabled={exporting || loading}>📄 Export PDF</button>
        </div>
      </div>

      <div className="page-container">
        {/* Period Selector */}
        <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:20, flexWrap:"wrap" }}>
          <div className="tabs">
            {PERIOD_OPTIONS.map(opt=>(
              <button key={opt.value} className={`tab ${period===opt.value?"active":""}`} onClick={()=>setPeriod(opt.value)}>{opt.label}</button>
            ))}
          </div>
          {period==="custom" && (
            <div style={{ display:"flex",gap:8,alignItems:"center" }}>
              <input type="date" className="form-control" value={from} onChange={e=>setFrom(e.target.value)} style={{ maxWidth:160 }} />
              <span style={{ color:"var(--text-muted)" }}>s/d</span>
              <input type="date" className="form-control" value={to} onChange={e=>setTo(e.target.value)} style={{ maxWidth:160 }} />
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {[1,2,3,4,5,6].map(i=><div key={i} className="skeleton" style={{ height:100,borderRadius:16 }} />)}
          </div>
        ) : !data ? null : (
          <>
            {/* Laba/Rugi Summary */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14, marginBottom:20 }}>
              {[
                { label:"Total Pemasukan", value: data.ringkasan.totalPemasukan, color:"var(--success)", icon:"💰" },
                { label:"Total Diskon", value: data.ringkasan.totalDiskon, color:"var(--warning)", icon:"🏷" },
                { label:"Pengeluaran Ops", value: data.ringkasan.totalPengeluaran, color:"var(--danger)", icon:"💸" },
                { label:"Spent Ads", value: data.ringkasan.totalAds, color:"#f59e0b", icon:"📣" },
                { label:"Laba Kotor", value: data.ringkasan.labaKotor, color: data.ringkasan.labaKotor>=0?"var(--success)":"var(--danger)", icon:"📈" },
                { label:"Laba Bersih", value: labaBersih, color: labaBersih>=0?"var(--success)":"var(--danger)", icon:"🏆", big:true },
              ].map(item=>(
                <div key={item.label} className="kpi-card" style={{ "--kpi-color":item.color, "--kpi-bg":`${item.color}18` } as any}>
                  <div className="kpi-icon">{item.icon}</div>
                  <div className="kpi-label">{item.label}</div>
                  <div className="kpi-value" style={{ color:item.color, fontSize: item.big ? 26 : 20 }}>{formatCurrency(item.value)}</div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
              {/* Pemasukan per Program */}
              <div className="card">
                <div className="card-header"><div className="card-title">💰 Pemasukan per Program</div></div>
                {data.pemasukanPerProgram?.length > 0 ? (
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
                {pieData.length > 0 ? (
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
    </div>
  );
}
