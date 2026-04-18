"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { 
  FileText, 
  Search, 
  RefreshCw, 
  Download, 
  Share2, 
  Eye, 
  Printer, 
  ChevronRight,
  User,
  Hash,
  Clock,
  CheckCircle,
  Trash2
} from "lucide-react";
import { useSession } from "next-auth/react";

export default function InvoicePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role?.toUpperCase();
  const isAdmin = role === "ADMIN";
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [printing, setPrinting] = useState(false);

  function fetchData() {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    setLoading(true);
    fetch(`/api/invoice?${p}`).then(r=>r.json()).then(d=>{ setData(d.data??[]); setLoading(false); });
  }

  useEffect(()=>{ fetchData(); },[search]);

  const totalInvoice = data.length;
  const totalAmount = data.reduce((acc, inv) => acc + (inv.total || 0), 0);
  const pendingCount = data.filter(inv => inv.status === 'BELUM_LUNAS').length;

  async function printInvoice(inv: any) {
    setPrinting(true);
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ unit:"mm", format:"a5" });

    doc.setFontSize(16); doc.setFont("helvetica","bold");
    doc.text("SPEAKING PARTNER", 74, 15, { align:"center" });
    doc.setFontSize(9); doc.setFont("helvetica","normal");
    doc.text("by Kampung Inggris", 74, 21, { align:"center" });
    doc.setFontSize(8);
    doc.text("Jl. Kampung Inggris, Pare, Kediri, Jawa Timur", 74, 26, { align:"center" });
    doc.line(10, 30, 138, 30);

    doc.setFontSize(14); doc.setFont("helvetica","bold");
    doc.text("INVOICE", 74, 38, { align:"center" });
    doc.setFontSize(9); doc.setFont("helvetica","normal");
    doc.text(`No: ${inv.noInvoice}`, 74, 44, { align:"center" });

    doc.setFontSize(9);
    doc.text(`Tanggal: ${formatDate(inv.tanggal, "dd MMMM yyyy")}`, 10, 54);
    doc.text(`Kepada: ${inv.siswa?.nama??"—"}`, 10, 60);
    doc.text(`No Siswa: ${inv.siswa?.noSiswa??"—"}`, 10, 66);

    autoTable(doc, {
      startY: 72,
      head:[["Keterangan","Jumlah"]],
      body:[
        [inv.pemasukan?.program?.nama??"Kursus Bahasa", formatCurrency(inv.total)],
        ...(inv.diskon>0 ? [["Diskon", `- ${formatCurrency(inv.diskon)}`]] : []),
        ["TOTAL BAYAR", formatCurrency(inv.totalFinal)],
      ],
      styles:{ fontSize:9 },
      headStyles:{ fillColor:[99,102,241] },
      foot:[["Metode Bayar", inv.pemasukan?.metodeBayar??"—"]],
      footStyles:{ fontStyle:"italic", textColor:[100,100,100] },
    });

    const yEnd = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(8); doc.setFont("helvetica","italic");
    doc.text("Terima kasih telah mempercayakan pendidikan bahasa Anda kepada kami.", 74, yEnd, { align:"center" });
    doc.text("Invoice ini merupakan bukti pembayaran yang sah.", 74, yEnd+5, { align:"center" });

    doc.setFontSize(8); doc.setFont("helvetica","normal");
    doc.text(`Dikeluarkan oleh: ${inv.pemasukan?.cs?.name??"Admin"}`, 10, yEnd+14);
    doc.text("Status: LUNAS ✓", 138, yEnd+14, { align:"right" });

    doc.save(`invoice_${inv.noInvoice}.pdf`);
    setPrinting(false);
  }

  function shareWhatsapp(inv: any) {
    const msg = encodeURIComponent(
      `*INVOICE SPEAKING PARTNER*\n` +
      `No: ${inv.noInvoice}\n` +
      `Tanggal: ${formatDate(inv.tanggal)}\n` +
      `Kepada: ${inv.siswa?.nama??"—"}\n\n` +
      `Program: ${inv.pemasukan?.program?.nama??"Kursus Bahasa"}\n` +
      `Total: *${formatCurrency(inv.totalFinal)}*\n` +
      `Metode: ${inv.pemasukan?.metodeBayar??"—"}\n\n` +
      `Status: ✅ LUNAS\n\n` +
      `Terima kasih sudah bergabung bersama Speaking Partner by Kampung Inggris! 🎓`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  async function handleDeleteAll() {
    if (!isAdmin) return;
    const conf = prompt("⚠️ PERINGATAN KERAS: Seluruh data INVOICE akan dihapus permanen.\n\nKetik 'HAPUS' (huruf besar) untuk mengonfirmasi:");
    if (conf === "HAPUS") {
      setLoading(true);
      const res = await fetch("/api/invoice?all=true", { method: "DELETE" });
      if (res.ok) fetchData();
      else alert("Gagal menghapus.");
    }
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <FileText size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Financial Documentation</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>E-Invoice Siswa</h1>
          <p className="body-lg" style={{ margin: 0 }}>Arsip bukti pembayaran dan penagihan resmi lembaga</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {isAdmin && (
            <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleDeleteAll}>
              <Trash2 size={16} /> Hapus Semua
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {/* KPI Grid */}
        <div className="kpi-grid" style={{ marginBottom: 48 }}>
          <div className="kpi-card" style={{ "--kpi-color": "var(--primary)", "--kpi-bg": "var(--primary-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--primary)" }}><FileText size={24} /></div>
            <div className="kpi-label">Volume Invoice</div>
            <div className="kpi-value">{totalInvoice} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>Dokumen</span></div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--warning)", "--kpi-bg": "var(--warning-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--warning)" }}><Clock size={24} /></div>
            <div className="kpi-label">Menunggu Pelunasan</div>
            <div className="kpi-value">{pendingCount}</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--success)", "--kpi-bg": "var(--success-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--success)" }}><CheckCircle size={24} /></div>
            <div className="kpi-label">Total Omzet (Invoice)</div>
            <div className="kpi-value">{formatCurrency(totalAmount)}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '24px 32px', marginBottom: 32 }}>
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:16, flex:1, minWidth:300 }}>
              <Search size={20} style={{ color:'var(--secondary)' }} />
              <input type="text" className="form-control" placeholder="Cari nomor invoice atau nama siswa..." value={search} onChange={e=>setSearch(e.target.value)} style={{ border:'none', borderBottom:'1px solid var(--ghost-border)', background:'transparent', borderRadius:0 }} />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={()=>setSearch("")} style={{ borderRadius:'var(--radius-full)' }}>
              <RefreshCw size={14} /> Reset
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>No Invoice</th>
                <th>Tanggal</th>
                <th>Siswa</th>
                <th>Program</th>
                <th>CS</th>
                <th>Harga Normal</th>
                <th>Diskon</th>
                <th className="text-right">Total Bayar</th>
                <th>Metode</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign:"center",padding:32,color:"var(--text-muted)" }}>Loading...</td></tr>
              ) : data.length===0 ? (
                <tr><td colSpan={10}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🧾</div>
                    <h3>Belum ada invoice</h3>
                    <p>Invoice dibuat otomatis saat menginput pemasukan</p>
                  </div>
                </td></tr>
              ) : data.map(inv=>(
                <tr key={inv.id}>
                  <td style={{ fontFamily:"monospace",fontSize:12,color:"var(--brand-primary-light)",fontWeight:700 }}>{inv.noInvoice}</td>
                  <td style={{ fontSize:12,color:"var(--text-muted)",whiteSpace:"nowrap" }}>{formatDate(inv.tanggal)}</td>
                  <td>
                    <div style={{ fontWeight:600 }}>{inv.siswa?.nama??"—"}</div>
                    <div style={{ fontSize:11,color:"var(--text-muted)" }}>{inv.siswa?.noSiswa}</div>
                  </td>
                  <td style={{ fontSize:13 }}>{inv.pemasukan?.program?.nama??"—"}</td>
                  <td style={{ fontSize:12,color:"var(--text-muted)" }}>{inv.pemasukan?.cs?.name??"—"}</td>
                  <td style={{ fontSize:13 }}>{formatCurrency(inv.total)}</td>
                  <td style={{ color:"var(--danger)",fontSize:13 }}>{inv.diskon>0?`-${formatCurrency(inv.diskon)}`:"—"}</td>
                  <td className="text-right" style={{ fontWeight:700,color:"var(--success)" }}>{formatCurrency(inv.totalFinal)}</td>
                  <td><span className={`badge ${inv.pemasukan?.metodeBayar==="CASH"?"badge-warning":inv.pemasukan?.metodeBayar==="QRIS"?"badge-success":"badge-info"}`}>{inv.pemasukan?.metodeBayar??"—"}</span></td>
                  <td>
                    <div style={{ display:"flex",gap:6 }}>
                      <button className="btn btn-primary btn-sm" title="Download PDF" onClick={()=>printInvoice(inv)} disabled={printing}>
                        {printing?"...":"📄"}
                      </button>
                      <button className="btn btn-success btn-sm" title="Share WhatsApp" onClick={()=>shareWhatsapp(inv)}>
                        💬
                      </button>
                      <button className="btn btn-secondary btn-sm" title="Preview" onClick={()=>setSelectedInvoice(inv)}>👁</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) setSelectedInvoice(null); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Preview Invoice</div>
              <button className="modal-close" onClick={()=>setSelectedInvoice(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background:"white",color:"#111",borderRadius:12,padding:24,fontFamily:"serif" }}>
                <div style={{ textAlign:"center",borderBottom:"2px solid #6366f1",paddingBottom:12,marginBottom:16 }}>
                  <div style={{ fontWeight:800,fontSize:18,color:"#6366f1" }}>SPEAKING PARTNER</div>
                  <div style={{ fontSize:11,color:"#555" }}>by Kampung Inggris</div>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:11,color:"#888" }}>No Invoice</div>
                    <div style={{ fontWeight:700,fontFamily:"monospace",fontSize:13 }}>{selectedInvoice.noInvoice}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11,color:"#888" }}>Tanggal</div>
                    <div style={{ fontWeight:600,fontSize:13 }}>{formatDate(selectedInvoice.tanggal)}</div>
                  </div>
                </div>
                <div style={{ background:"#f8f9ff",borderRadius:8,padding:12,marginBottom:16 }}>
                  <div style={{ fontSize:11,color:"#888",marginBottom:4 }}>Kepada</div>
                  <div style={{ fontWeight:700 }}>{selectedInvoice.siswa?.nama??"—"}</div>
                  <div style={{ fontSize:12,color:"#555" }}>{selectedInvoice.siswa?.noSiswa}</div>
                </div>
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                  <thead>
                    <tr style={{ background:"#6366f1",color:"white" }}>
                      <th style={{ padding:"8px 12px",textAlign:"left" }}>Keterangan</th>
                      <th style={{ padding:"8px 12px",textAlign:"right" }}>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style={{ padding:"8px 12px",borderBottom:"1px solid #eee" }}>{selectedInvoice.pemasukan?.program?.nama??"Kursus Bahasa"}</td><td style={{ padding:"8px 12px",textAlign:"right",borderBottom:"1px solid #eee" }}>{formatCurrency(selectedInvoice.total)}</td></tr>
                    {selectedInvoice.diskon > 0 && <tr><td style={{ padding:"8px 12px",borderBottom:"1px solid #eee",color:"red" }}>Diskon</td><td style={{ padding:"8px 12px",textAlign:"right",borderBottom:"1px solid #eee",color:"red" }}>-{formatCurrency(selectedInvoice.diskon)}</td></tr>}
                    <tr style={{ fontWeight:800,background:"#f0fdf4" }}><td style={{ padding:"10px 12px" }}>TOTAL BAYAR</td><td style={{ padding:"10px 12px",textAlign:"right",color:"#10b981",fontSize:16 }}>{formatCurrency(selectedInvoice.totalFinal)}</td></tr>
                  </tbody>
                </table>
                <div style={{ marginTop:12,fontSize:11,color:"#888",textAlign:"center" }}>
                  <span className="badge badge-success" style={{ color:"#10b981" }}>✓ LUNAS</span> · Metode: {selectedInvoice.pemasukan?.metodeBayar??"—"}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setSelectedInvoice(null)}>Tutup</button>
              <button className="btn btn-success" onClick={()=>shareWhatsapp(selectedInvoice)}>💬 Kirim WA</button>
              <button className="btn btn-primary" onClick={()=>printInvoice(selectedInvoice)} disabled={printing}>📄 Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
