"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer, ArrowLeft, Layout } from "lucide-react";
import Link from 'next/link';

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [useCustomHeaderImage, setUseCustomHeaderImage] = useState(false);
  
  const [headerInfo, setHeaderInfo] = useState({
    name: "SPEAKING PARTNER",
    tagline: "Teman Terhebat Belajar Bahasa Inggris",
    address: "Jalan Brawijaya 13A, Pare, Kediri - Kode Pos 64213",
    email: "speakingpartnerku@gmail.com",
    telp: "0877 6263 0406",
    website: "WWW.SPEAKINGPARTNER.ID",
    logoUrl: "",
    fullHeaderImageUrl: "" 
  });

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem("invoice_header_v3");
    if (saved) setHeaderInfo(JSON.parse(saved));
    const savedMode = localStorage.getItem("invoice_custom_mode");
    if (savedMode === "true") setUseCustomHeaderImage(true);
  }, []);

  useEffect(() => {
    if (lead) {
      localStorage.setItem("invoice_header_v3", JSON.stringify(headerInfo));
      localStorage.setItem("invoice_custom_mode", String(useCustomHeaderImage));
    }
  }, [headerInfo, useCustomHeaderImage, lead]);

  const getDirectLogoUrl = (url: string) => {
    if (!url) return "";
    const cleanUrl = url.trim();
    if (cleanUrl.includes('drive.google.com')) {
      const idMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
      const idSearch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
      const finalId = (idMatch && idMatch[1]) || (idSearch && idSearch[1]);
      if (finalId) return `https://drive.google.com/uc?id=${finalId}&export=download`;
    }
    return cleanUrl;
  };

  useEffect(() => {
    fetch(`/api/leads/${params.id}/invoice`).then(r => r.json()).then(d => { setLead(d); setLoading(false); });
  }, [params.id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Memuat data invoice...</div>;
  if (!lead) return <div style={{ padding: 40, textAlign: 'center' }}>Data tidak ditemukan</div>;

  const idHash = lead.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const dateObj = new Date(lead.tanggalLead || lead.createdAt);
  const yearStr = dateObj.getFullYear();
  const dateStr = dateObj.toISOString().slice(0, 10).replace(/-/g, '');
  
  const invNumber = `INV-${dateStr}-${(idHash % 9000) + 1000}`;
  const siswaNumber = `SP-${yearStr}-${(idHash % 90000) + 10000}`;

  return (
    <div className="invoice-outer-container">
       <div className="no-print" style={{ maxWidth: '800px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/leads" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
             <ArrowLeft size={16} /> Kembali ke Leads
          </Link>
          <div style={{ display: 'flex', gap: 12 }}>
             <button className="btn btn-secondary btn-sm" onClick={() => setUseCustomHeaderImage(!useCustomHeaderImage)}>
                <Layout size={16} /> {useCustomHeaderImage ? "Beralih ke Teks" : "Beralih ke Gambar"}
             </button>
             <button className={`btn btn-sm ${isEditingHeader ? 'btn-success' : 'btn-secondary'}`} onClick={() => setIsEditingHeader(!isEditingHeader)}>
                {isEditingHeader ? "Selesai Edit" : "Edit Detail Kop"}
             </button>
             <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ background: '#FFC107', border: 'none', color: '#000', fontWeight: 600 }}>
                <Printer size={16} /> Cetak Invoice
             </button>
          </div>
       </div>

       <div className="invoice-paper">
          {useCustomHeaderImage ? (
             <div className="custom-header-image-container">
                {headerInfo.fullHeaderImageUrl ? (
                   <img src={getDirectLogoUrl(headerInfo.fullHeaderImageUrl)} alt="Kop Surat" style={{ width: '100%', display: 'block' }} />
                ) : (
                   <div style={{ height: 160, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '2px solid #000' }}>
                      Pilih Gambar Kop di Menu Edit
                   </div>
                )}
                {isEditingHeader && (
                   <div style={{ padding: 10, background: '#fff7ed', borderBottom: '1px solid #ffcc00' }}>
                      <input className="header-input" value={headerInfo.fullHeaderImageUrl} placeholder="Paste Link Gambar Kop (Gdrive Support)..." onChange={e => setHeaderInfo({...headerInfo, fullHeaderImageUrl: e.target.value})} />
                   </div>
                )}
             </div>
          ) : (
             <div className="invoice-header">
                <div className="header-yellow-box">
                   <div className="invoice-logo-container">
                      <div className="invoice-brand">
                         <div className="main-name">{headerInfo.name}</div>
                         <div className="tagline">{headerInfo.tagline}</div>
                      </div>
                   </div>
                </div>
                <div className="header-dark-box">
                   <div className="company-details">
                      <p>{headerInfo.address}</p>
                      <p>Email: {headerInfo.email}</p>
                      <p>Telp: {headerInfo.telp}</p>
                      <div className="website">{headerInfo.website}</div>
                   </div>
                </div>
             </div>
          )}

          <div className="invoice-meta">
             <div className="meta-right">
                <div className="meta-row"><span>No. INVOICE</span><strong>{invNumber}</strong></div>
                <div className="meta-row"><span>Tgl Pendaftaran</span><strong>{formatDate(dateObj, "d/MM/yyyy")}</strong></div>
             </div>
          </div>

          <div className="invoice-recipient">
             <div className="recipient-row"><span>Kepada :</span><strong>{lead.nama}</strong></div>
             <div className="recipient-row"><span>Alamat :</span>{lead.email || '-'}</div>
             <div className="recipient-row"><span>No. Siswa</span><strong>{siswaNumber}</strong></div>
          </div>

          {/* REBUILT TABLE USING DIVS & FLEX FOR ABSOLUTE STABILITY */}
          <div className="flex-table-container">
             <div className="flex-table-header">
                <div style={{ flex: '5.5' }}>KETERANGAN</div>
                <div style={{ flex: '1', textAlign: 'center' }}>JML</div>
                <div style={{ flex: '1.7', textAlign: 'right' }}>HARGA</div>
                <div style={{ flex: '1.8', textAlign: 'right' }}>TOTAL</div>
             </div>
             <div className="flex-table-row main">
                <div style={{ flex: '5.5' }}>
                   <div className="item-name">{lead.program?.nama?.toUpperCase()}</div>
                   <div className="item-desc">{lead.program?.tipe} Class - Speaking Partner</div>
                </div>
                <div style={{ flex: '1', textAlign: 'center' }}>1</div>
                <div style={{ flex: '1.7', textAlign: 'right' }}>{formatCurrency(lead.program?.harga || 0).replace('Rp', '').trim()}</div>
                <div style={{ flex: '1.8', textAlign: 'right' }}>{formatCurrency(lead.program?.harga || 0).replace('Rp', '').trim()}</div>
             </div>
             {[1, 2, 3].map(i => (
                <div key={i} className="flex-table-row empty">
                   <div style={{ flex: '5.5' }}></div>
                   <div style={{ flex: '1' }}></div>
                   <div style={{ flex: '1.7' }}></div>
                   <div style={{ flex: '1.8' }}></div>
                </div>
             ))}
          </div>

          <div className="summary-grid">
             <div className="summary-left">
                <div className="payment-title">PEMBAYARAN BISA MELALUI</div>
                <div className="bank-list">
                   <div><span>BRI</span>: 055501001893300</div>
                   <div><span>MANDIRI</span>: 1710010743550</div>
                   <div><span>BCA</span>: 1409585858</div>
                </div>
             </div>
             <div className="summary-right">
                <div className="total-box">
                   <div className="total-row"><span>Sub Total</span><span>Rp</span><strong>{formatCurrency(lead.program?.harga || 0).replace('Rp', '').trim()}</strong></div>
                   <div className="total-row"><span>Kode Unik</span><span>Rp</span><strong>{formatCurrency(lead.kodeUnik || 0).replace('Rp', '').trim()}</strong></div>
                   <div className="total-row grand"><span>GRAND TOTAL</span><span>Rp</span><strong>{formatCurrency(lead.nominalTagihan || 0).replace('Rp', '').trim()}</strong></div>
                </div>
             </div>
          </div>

          <div className="footer">
             <div className="signature">
                <div>Dikeluarkan oleh</div>
                <div className="space"></div>
                <div className="name">{lead.cs?.name || 'Admin'}</div>
             </div>
          </div>
       </div>

       <style jsx>{`
          .invoice-outer-container { padding: 40px 20px; background: #94a3b8; min-height: 100vh; font-family: sans-serif; }
          .invoice-paper { 
             width: 100%; max-width: 18cm; min-height: 27cm; margin: 0 auto; background: white; 
             display: flex; flex-direction: column; color: #000; box-sizing: border-box; overflow: hidden;
          }
          
          .invoice-header { display: flex; height: 160px; overflow: hidden; }
          .header-yellow-box { background: #facd00; flex: 4; display: flex; align-items: center; padding-left: 5%; clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%); z-index: 2; }
          .header-dark-box { background: #1e293b; flex: 6; display: flex; align-items: center; justify-content: flex-end; padding-right: 5%; margin-left: -10%; }
          .invoice-brand { color: #1e293b; }
          .main-name { font-size: 16px; font-weight: bold; }
          .tagline { font-size: 8px; }
          .company-details { color: white; text-align: right; font-size: 9px; line-height: 1.5; }
          .website { color: #facd00; font-weight: bold; margin-top: 5px; }

          .invoice-meta { display: flex; justify-content: flex-end; padding: 20px 5% 10px 5%; }
          .meta-row { display: flex; gap: 10px; font-size: 10px; justify-content: flex-end; margin-bottom: 3px; }
          .meta-row span { color: #666; }

          .invoice-recipient { padding: 10px 5% 20px 5%; font-size: 11px; }
          .recipient-row { display: flex; gap: 10px; margin-bottom: 5px; }
          .recipient-row span { width: 70px; }
          .recipient-row strong { border-bottom: 1px solid #ddd; flex: 1; max-width: 250px; }

          /* FLEX TABLE - THE ULTIMATE OVERFLOW FIX */
          .flex-table-container { padding: 0 5%; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; border: 1.5px solid #000; margin: 0 5%; width: 90%; }
          .flex-table-header { display: flex; background: #facd00; border-bottom: 1.5px solid #000; font-size: 10px; font-weight: bold; }
          .flex-table-header > div { padding: 8px; border-right: 1.5px solid #000; }
          .flex-table-header > div:last-child { border-right: none; }
          
          .flex-table-row { display: flex; border-bottom: none; font-size: 10px; min-height: 30px; }
          .flex-table-row > div { padding: 8px; border-right: 1.5px solid #000; }
          .flex-table-row > div:last-child { border-right: none; }
          .flex-table-row.empty { height: 35px; }
          .flex-table-row:last-child { border-bottom: none; }
          
          .item-name { font-weight: bold; }
          .item-desc { font-size: 8px; color: #666; }

          .summary-grid { display: flex; padding: 20px 5%; gap: 20px; }
          .summary-left { flex: 1; font-size: 10px; }
          .payment-title { font-weight: bold; text-decoration: underline; margin-bottom: 5px; }
          .bank-list span { font-weight: bold; width: 50px; display: inline-block; }
          .summary-right { flex: 1; }
          .total-box { border: 1.5px solid #000; }
          .total-row { display: flex; padding: 5px 10px; font-size: 10px; }
          .total-row span:first-child { flex: 1; font-weight: bold; }
          .total-row span:nth-child(2) { width: 25px; }
          .total-row strong { width: 70px; text-align: right; }
          .total-row.grand { border-top: 1.5px solid #000; background: #f8fafc; font-size: 11px; }

          .footer { margin-top: auto; padding: 40px 5% 50px 5%; display: flex; justify-content: flex-end; }
          .signature { text-align: center; font-size: 11px; }
          .space { height: 60px; }
          .name { font-weight: bold; text-decoration: underline; }

          @media print {
             .no-print { display: none !important; }
             body { background: white !important; }
             .invoice-outer-container { padding: 0 !important; }
             .invoice-paper { box-shadow: none !important; max-width: none !important; width: 100% !important; margin: 0 !important; border: none !important; }
             .flex-table-container { margin: 0 5% !important; width: 90% !important; }
             @page { size: A4 portrait; margin: 1cm; }
          }
       `}</style>
    </div>
  );
}
