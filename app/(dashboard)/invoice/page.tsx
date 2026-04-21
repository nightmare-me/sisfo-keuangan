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
    const doc = new jsPDF({ unit:"mm", format:"a4" });

    // Header Backgrounds
    doc.setFillColor(250, 205, 0); // Yellow #facd00
    doc.rect(0, 0, 80, 40, "F");
    doc.setFillColor(30, 41, 59); // Dark #1e293b
    doc.rect(80, 0, 130, 40, "F");

    // Brand Text
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SPEAKING PARTNER", 10, 20);
    doc.setFontSize(8);
    doc.text("Teman Terhebat Belajar Bahasa Inggris", 10, 25);

    // Company Contact (Right Side)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Jalan Brawijaya 13A, Pare, Kediri", 200, 15, { align: "right" });
    doc.text(`Email: speakingpartnerku@gmail.com`, 200, 20, { align: "right" });
    doc.text(`Telp: 0877 6263 0406`, 200, 25, { align: "right" });
    doc.setTextColor(250, 205, 0);
    doc.setFont("helvetica", "bold");
    doc.text("WWW.SPEAKINGPARTNER.ID", 200, 32, { align: "right" });

    // Meta Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("INVOICE", 10, 55);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`No. Invoice: ${inv.noInvoice}`, 200, 55, { align: "right" });
    doc.text(`Tgl Pendaftaran: ${formatDate(inv.tanggal)}`, 200, 60, { align: "right" });

    // Recipient
    doc.setFont("helvetica", "bold");
    doc.text("Kepada:", 10, 75);
    doc.setFont("helvetica", "normal");
    doc.text(inv.siswa?.nama || "—", 30, 75);
    doc.text("Alamat:", 10, 81);
    doc.text("-", 30, 81);
    doc.text("No. Siswa:", 10, 87);
    doc.setFont("helvetica", "bold");
    doc.text(inv.siswa?.noSiswa || "—", 30, 87);

    // Table
    autoTable(doc, {
      startY: 95,
      head: [["KETERANGAN", "JML", "HARGA", "TOTAL"]],
      body: [
        [
          inv.pemasukan?.program?.nama?.toUpperCase() || "PROGRAM KURSUS",
          "1",
          formatCurrency(inv.total).replace("Rp", "").trim(),
          formatCurrency(inv.total).replace("Rp", "").trim()
        ]
      ],
      styles: { fontSize: 9, cellPadding: 5, borderBottomColor: [0, 0, 0], borderBottomWidth: 0.1 },
      headStyles: { fillColor: [250, 205, 0], textColor: [0, 0, 0], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 35, halign: "right" }
      }
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PEMBAYARAN BISA MELALUI", 10, finalY);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("BRI: 055501001893300", 10, finalY + 6);
    doc.text("MANDIRI: 1710010743550", 10, finalY + 11);
    doc.text("BCA: 1409585858", 10, finalY + 16);
    doc.text("Atas satu nama: Speaking Partner", 10, finalY + 22);

    // Summary Box
    doc.rect(140, finalY, 60, 25);
    doc.setFontSize(9);
    doc.text("Sub Total", 143, finalY + 7);
    doc.text(formatCurrency(inv.total).replace("Rp", "").trim(), 197, finalY + 7, { align: "right" });
    doc.text("Kode Unik", 143, finalY + 13);
    doc.text(formatCurrency(inv.diskon || 0).replace("Rp", "").trim(), 197, finalY + 13, { align: "right" });
    doc.line(140, finalY + 16, 200, finalY + 16);
    doc.setFont("helvetica", "bold");
    doc.text("GRAND TOTAL", 143, finalY + 21);
    doc.text(formatCurrency(inv.totalFinal).replace("Rp", "").trim(), 197, finalY + 21, { align: "right" });

    // Footer
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Dikeluarkan oleh", 170, finalY + 50, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(inv.pemasukan?.cs?.name || "Admin", 170, finalY + 75, { align: "center" });

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
            <div className="modal-body" style={{ padding: 0 }}>
              <div style={{ background: "white", color: "#000", minHeight: "22cm", display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
                 {/* Header Mockup */}
                 <div style={{ display: "flex", height: 120, overflow: "hidden" }}>
                    <div style={{ background: "#facd00", flex: 4, display: "flex", alignItems: "center", paddingLeft: "5%", clipPath: "polygon(0 0, 100% 0, 85% 100%, 0 100%)", z-index: 2 }}>
                       <div style={{ color: "#1e293b", fontWeight: "bold", fontSize: 16 }}>SPEAKING PARTNER</div>
                    </div>
                    <div style={{ background: "#1e293b", flex: 6, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "5%", marginLeft: "-10%", color: "white", fontSize: 8 }}>
                       <div style={{ textAlign: "right" }}>
                          <p style={{ margin: 0 }}>Jalan Brawijaya 13A, Pare, Kediri</p>
                          <p style={{ margin: 0 }}>speakingpartnerku@gmail.com</p>
                          <p style={{ margin: 0, fontWeight: "bold", color: "#facd00" }}>WWW.SPEAKINGPARTNER.ID</p>
                       </div>
                    </div>
                 </div>

                 <div style={{ padding: "20px 30px" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                       <div style={{ textAlign: "right", fontSize: 10 }}>
                          <div>No. INVOICE: <strong>{selectedInvoice.noInvoice}</strong></div>
                          <div>Tgl: <strong>{formatDate(selectedInvoice.tanggal)}</strong></div>
                       </div>
                    </div>

                    <div style={{ marginBottom: 20, fontSize: 11 }}>
                       <div style={{ marginBottom: 4 }}>Kepada: <strong>{selectedInvoice.siswa?.nama || "—"}</strong></div>
                       <div style={{ marginBottom: 4 }}>No. Siswa: <strong>{selectedInvoice.siswa?.noSiswa || "—"}</strong></div>
                    </div>

                    <div style={{ border: "1.5px solid #000" }}>
                       <div style={{ display: "flex", background: "#facd00", borderBottom: "1.5px solid #000", fontSize: 10, fontWeight: "bold" }}>
                          <div style={{ flex: 5.5, padding: 8, borderRight: "1.5px solid #000" }}>KETERANGAN</div>
                          <div style={{ flex: 1, padding: 8, borderRight: "1.5px solid #000", textAlign: "center" }}>JML</div>
                          <div style={{ flex: 1.8, padding: 8, textAlign: "right" }}>TOTAL</div>
                       </div>
                       <div style={{ display: "flex", fontSize: 10, minHeight: 60 }}>
                          <div style={{ flex: 5.5, padding: 8, borderRight: "1.5px solid #000" }}>
                             <div style={{ fontWeight: "bold" }}>{selectedInvoice.pemasukan?.program?.nama?.toUpperCase() || "PROGRAM KURSUS"}</div>
                             <div style={{ fontSize: 8, color: "#666" }}>{selectedInvoice.pemasukan.program?.tipe} Class</div>
                          </div>
                          <div style={{ flex: 1, padding: 8, borderRight: "1.5px solid #000", textAlign: "center" }}>1</div>
                          <div style={{ flex: 1.8, padding: 8, textAlign: "right" }}>{formatCurrency(selectedInvoice.total).replace("Rp", "").trim()}</div>
                       </div>
                    </div>

                    <div style={{ display: "flex", marginTop: 20, gap: 20 }}>
                       <div style={{ flex: 1.2, fontSize: 9 }}>
                          <div style={{ fontWeight: "bold", textDecoration: "underline", marginBottom: 5 }}>PEMBAYARAN</div>
                          <div style={{ fontSize: 8 }}>BCA: 1409585858 (Speaking Partner)</div>
                       </div>
                       <div style={{ flex: 0.8, border: "1.5px solid #000" }}>
                          <div style={{ display: "flex", padding: "4px 8px", fontSize: 10 }}>
                             <span style={{ flex: 1, fontWeight: "bold" }}>Sub Total</span>
                             <span>{formatCurrency(selectedInvoice.total).replace("Rp", "").trim()}</span>
                          </div>
                          <div style={{ display: "flex", padding: "4px 8px", fontSize: 10, background: "#f8fafc", borderTop: "1.5px solid #000", fontWeight: "bold" }}>
                             <span style={{ flex: 1 }}>GRAND TOTAL</span>
                             <span>{formatCurrency(selectedInvoice.totalFinal).replace("Rp", "").trim()}</span>
                          </div>
                       </div>
                    </div>
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
