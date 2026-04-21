"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer, ArrowLeft, Layout } from "lucide-react";

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
          <button className="btn btn-secondary btn-sm" onClick={() => router.back()}>
             <ArrowLeft size={16} /> Kembali
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
             <button className="btn btn-secondary btn-sm" onClick={() => setUseCustomHeaderImage(!useCustomHeaderImage)}>
                <Layout size={16} /> {useCustomHeaderImage ? "Pakai Kop Teks" : "Pakai Kop Gambar"}
             </button>
             <button className={`btn btn-sm ${isEditingHeader ? 'btn-success' : 'btn-secondary'}`} onClick={() => setIsEditingHeader(!isEditingHeader)}>
                {isEditingHeader ? "Edit Detail Kop" : "Edit Detail Kop"}
             </button>
             <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                <Printer size={16} /> Cetak Invoice
             </button>
          </div>
       </div>

       <div className="invoice-paper">
          {useCustomHeaderImage ? (
             <div className="custom-header-image-container">
                {headerInfo.fullHeaderImageUrl ? (
                   <img src={getDirectLogoUrl(headerInfo.fullHeaderImageUrl)} alt="Kop Surat" style={{ width: '100%', height: 'auto', display: 'block' }} />
                ) : (
                   <div style={{ height: 160, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #000' }}>
                      Tempel Link Gambar Kop di Menu Edit
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
                      <div className="invoice-logo">
                         {headerInfo.logoUrl ? (
                            <img src={getDirectLogoUrl(headerInfo.logoUrl)} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                         ) : (
                            <div className="logo-bubble"></div>
                         )}
                      </div>
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

          <div className="table-container">
            <table className="invoice-table">
               <thead>
                  <tr>
                     <th style={{ width: '55%' }}>KETERANGAN</th>
                     <th style={{ width: '10%' }} className="text-center">JML</th>
                     <th style={{ width: '17%' }} className="text-right">HARGA</th>
                     <th style={{ width: '18%' }} className="text-right">TOTAL</th>
                  </tr>
               </thead>
               <tbody>
                  <tr>
                     <td>
                        <div className="item-name">{lead.program?.nama?.toUpperCase()}</div>
                        <div className="item-desc">{lead.program?.tipe} Class - Speaking Partner</div>
                     </td>
                     <td className="text-center">1</td>
                     <td className="text-right">{formatCurrency(lead.program?.harga || 0).replace('Rp', '').trim()}</td>
                     <td className="text-right">{formatCurrency(lead.program?.harga || 0).replace('Rp', '').trim()}</td>
                  </tr>
                  <tr className="empty-row"><td></td><td></td><td></td><td></td></tr>
                  <tr className="empty-row"><td></td><td></td><td></td><td></td></tr>
               </tbody>
            </table>
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
          .invoice-outer-container { padding: 40px 20px; background: #f8fafc; min-height: 100vh; font-family: sans-serif; }
          .invoice-paper { 
             width: 100%; max-width: 18cm; min-height: 27cm; margin: 0 auto; background: white; 
             box-shadow: 0 10px 40px rgba(0,0,0,0.1); display: flex; flex-direction: column; color: #000; box-sizing: border-box;
          }
          
          .invoice-header { display: flex; height: 160px; }
          .header-yellow-box { background: #facd00; flex: 4; display: flex; align-items: center; padding-left: 5%; clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%); z-index: 2; }
          .header-dark-box { background: #1e293b; flex: 6; display: flex; align-items: center; justify-content: flex-end; padding-right: 5%; margin-left: -10%; }
          .invoice-logo { width: 50px; height: 50px; border-radius: 50%; background: #1e293b; overflow: hidden; display: flex; align-items: center; justify-content: center; }
          .logo-bubble { width: 80%; height: 80%; background: #facd00; transform: rotate(15deg); clip-path: polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%); }
          .invoice-brand { margin-left: 10px; color: #1e293b; }
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

          .table-container { padding: 0 5%; }
          .invoice-table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; table-layout: fixed; }
          .invoice-table th { background: #facd00; padding: 8px; font-size: 10px; border: 1.5px solid #000; text-align: left; }
          .invoice-table td { padding: 8px; font-size: 10px; border-left: 1.5px solid #000; border-right: 1.5px solid #000; word-break: break-all; }
          .item-name { font-weight: bold; }
          .item-desc { font-size: 8px; color: #666; }
          .empty-row td { height: 30px; }
          .invoice-table tbody tr:last-child td { border-bottom: 1.5px solid #000; }

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

          .text-center { text-align: center; }
          .text-right { text-align: right; }

          @media print {
             .no-print { display: none !important; }
             body { background: white !important; -webkit-print-color-adjust: exact; }
             .invoice-outer-container { padding: 0 !important; }
             .invoice-paper { box-shadow: none !important; max-width: none !important; width: 100% !important; margin: 0 !important; border: none !important; }
             @page { size: A4; margin: 1cm; }
          }
       `}</style>
    </div>
  );
}
