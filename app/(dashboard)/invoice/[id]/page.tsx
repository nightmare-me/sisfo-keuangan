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

  const getDirectLogoUrl = (url: string) => {
    if (!url) return "";
    if (url.includes('drive.google.com')) {
      const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        return `https://drive.google.com/uc?id=${idMatch[1]}&export=download`;
      }
    }
    return url;
  };

  useEffect(() => {
    fetch(`/api/leads/${params.id}/invoice`)
      .then(r => r.json())
      .then(d => { setLead(d); setLoading(false); });
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
       <div className="no-print" style={{ maxWidth: '850px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => router.back()}>
             <ArrowLeft size={16} /> Kembali
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
             <button className="btn btn-secondary btn-sm" onClick={() => setUseCustomHeaderImage(!useCustomHeaderImage)}>
                <Layout size={16} /> {useCustomHeaderImage ? "Pakai Kop Teks" : "Pakai Kop Gambar"}
             </button>
             <button className={`btn btn-sm ${isEditingHeader ? 'btn-success' : 'btn-secondary'}`} onClick={() => setIsEditingHeader(!isEditingHeader)}>
                {isEditingHeader ? "Selesai Edit" : "Edit Detail Kop"}
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
                   <div style={{ height: 180, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '2px solid #000' }}>
                      Tempel Link Gambar Kop Surat (Gdrive Support) di Menu Edit
                   </div>
                )}
                {isEditingHeader && (
                   <div style={{ padding: 15, background: '#FFF7ED', borderBottom: '1px solid #FF8000' }}>
                      <input className="header-input" value={headerInfo.fullHeaderImageUrl} placeholder="Paste Link Gambar Kop Surat di sini..." onChange={e => setHeaderInfo({...headerInfo, fullHeaderImageUrl: e.target.value})} />
                   </div>
                )}
             </div>
          ) : (
             <div className="invoice-header">
                <div className="header-yellow-box">
                   <div className="invoice-logo-container">
                      <div className="invoice-logo">
                         {headerInfo.logoUrl ? (
                            <img src={getDirectLogoUrl(headerInfo.logoUrl)} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
                         ) : (
                            <div className="logo-bubble">
                               <div className="wave-icon"></div>
                            </div>
                         )}
                      </div>
                      <div className="invoice-brand">
                         {isEditingHeader ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                               <input className="header-input" value={headerInfo.name} onChange={e => setHeaderInfo({...headerInfo, name: e.target.value})} style={{ fontSize: 20, fontWeight: 900 }} />
                               <input className="header-input" value={headerInfo.logoUrl} placeholder="Link Logo GDrive" onChange={e => setHeaderInfo({...headerInfo, logoUrl: e.target.value})} style={{ fontSize: 9 }} />
                            </div>
                         ) : (
                            <div className="main-name" style={{ fontSize: '20px' }}>{headerInfo.name}</div>
                         )}
                         
                         {isEditingHeader ? (
                            <input className="header-input" value={headerInfo.tagline} onChange={e => setHeaderInfo({...headerInfo, tagline: e.target.value})} style={{ fontSize: 10, width: '100%' }} />
                         ) : (
                            <div className="tagline">{headerInfo.tagline}</div>
                         )}
                      </div>
                   </div>
                </div>
                <div className="header-dark-box">
                   <div className="company-details">
                      {isEditingHeader ? (
                         <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 250 }}>
                            <input className="header-input dark" value={headerInfo.address} onChange={e => setHeaderInfo({...headerInfo, address: e.target.value})} />
                            <input className="header-input dark" value={headerInfo.email} onChange={e => setHeaderInfo({...headerInfo, email: e.target.value})} />
                            <input className="header-input dark" value={headerInfo.telp} onChange={e => setHeaderInfo({...headerInfo, telp: e.target.value})} />
                            <input className="header-input dark" value={headerInfo.website} onChange={e => setHeaderInfo({...headerInfo, website: e.target.value})} style={{ color: '#ffcc00' }} />
                         </div>
                      ) : (
                         <>
                            <p>{headerInfo.address}</p>
                            <p>Email: {headerInfo.email}</p>
                            <p>Telp: {headerInfo.telp}</p>
                            <div className="website">{headerInfo.website}</div>
                         </>
                      )}
                   </div>
                </div>
             </div>
          )}

          <div className="invoice-meta">
             <div className="meta-right-clean">
                <div className="meta-row-clean">
                   <span className="meta-label">No. INVOICE</span>
                   <span className="meta-value">{invNumber}</span>
                </div>
                <div className="meta-row-clean">
                   <span className="meta-label">Tgl Pendaftaran</span>
                   <span className="meta-value">{formatDate(dateObj, "d/MM/yyyy")}</span>
                </div>
             </div>
          </div>

          <div className="invoice-recipient">
             <div className="recipient-row">
                <span className="recipient-label">Kepada :</span>
                <span className="recipient-value">{lead.nama}</span>
             </div>
             <div className="recipient-row">
                <span className="recipient-label">Alamat :</span>
                <span className="recipient-value" style={{ textDecoration: 'none' }}>{lead.email || '-'}</span>
             </div>
             <div className="recipient-row">
                <span className="recipient-label">No. Siswa</span>
                <span className="recipient-value">{siswaNumber}</span>
             </div>
          </div>

          <div className="table-print-container">
            <table className="invoice-table">
               <thead>
                  <tr>
                     <th style={{ width: '70%', background: '#ffcc00' }}>KETERANGAN</th>
                     <th style={{ width: '6%', background: '#ffcc00' }} className="text-center">JML</th>
                     <th style={{ width: '12%', background: '#ffcc00' }} className="text-right">HARGA</th>
                     <th style={{ width: '12%', background: '#ffcc00' }} className="text-right">TOTAL</th>
                  </tr>
               </thead>
               <tbody>
                  <tr>
                     <td style={{ wordBreak: 'break-word' }}>
                        <div className="item-name">PENDAFTARAN PROGRAM {lead.program?.nama?.toUpperCase()}</div>
                        <div className="item-desc">{lead.program?.tipe || 'Standard'} Class - Speaking Partner</div>
                     </td>
                     <td className="text-center" style={{ fontWeight: 600 }}>1</td>
                     <td className="text-right">{formatCurrency(lead.program?.harga || 0).replace('Rp', '').trim()}</td>
                     <td className="text-right">{formatCurrency(lead.program?.harga || 0).replace('Rp', '').trim()}</td>
                  </tr>
                  {[1, 2, 3, 4].map(i => (
                    <tr key={i} className="empty-row"><td></td><td></td><td></td><td></td></tr>
                  ))}
               </tbody>
            </table>
          </div>

          <div className="invoice-summary-grid">
             <div className="summary-left">
                <div className="payment-title">PEMBAYARAN BISA MELALUI</div>
                <div className="bank-list">
                   <div className="bank-row"><span>BRI</span>: 055501001893300</div>
                   <div className="bank-row"><span>MANDIRI</span>: 1710010743550</div>
                   <div className="bank-row"><span>BCA</span>: 1409585858</div>
                   <div className="acct-name">Atas satu nama : <strong>Speaking Partner</strong></div>
                </div>
             </div>
             <div className="summary-right">
                <div className="total-box-clean">
                   <div className="total-row">
                      <span className="total-label">Sub Total</span>
                      <span className="total-symbol">Rp</span>
                      <span className="total-value">{formatCurrency(lead.program?.harga || 0).replace('Rp', '').trim()}</span>
                   </div>
                   <div className="total-row">
                      <span className="total-label">Kode Unik</span>
                      <span className="total-symbol">Rp</span>
                      <span className="total-value">{formatCurrency(lead.kodeUnik || 0).replace('Rp', '').trim()}</span>
                   </div>
                   <div className="total-row grand-total-clean">
                      <span className="total-label">GRAND TOTAL</span>
                      <span className="total-symbol">Rp</span>
                      <span className="total-value">{formatCurrency(lead.nominalTagihan || lead.program?.harga || 0).replace('Rp', '').trim()}</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="invoice-footer-bottom">
             <div className="signature-container">
                <div>Dikeluarkan oleh</div>
                <div className="signature-space"></div>
                <div className="signature-name">{lead.cs?.name || 'Administrator'}</div>
             </div>
          </div>
       </div>

       <style jsx>{`
          .invoice-outer-container {
             padding: 40px 20px;
             background: #f1f5f9;
             min-height: 100vh;
             font-family: 'Helvetica', 'Arial', sans-serif;
          }
          .invoice-paper {
             width: 210mm;
             min-height: 297mm;
             margin: 0 auto;
             background: white;
             padding: 0;
             box-shadow: 0 10px 30px rgba(0,0,0,0.1);
             position: relative;
             display: flex;
             flex-direction: column;
             color: #1e293b;
             overflow: hidden;
          }
          
          .custom-header-image-container {
             width: 100%;
          }

          .invoice-header {
             display: flex;
             height: 160px;
          }
          .header-yellow-box {
             background: #ffcc00;
             flex: 4;
             display: flex;
             align-items: center;
             padding-left: 50px;
             clip-path: polygon(0 0, 100% 0, 85% 100%, 0% 100%);
             z-index: 2;
          }
          .header-dark-box {
             background: #232833;
             flex: 6;
             display: flex;
             align-items: center;
             justify-content: flex-end;
             padding-right: 40px;
             margin-left: -60px;
          }
          
          .header-input {
             border: 1px dashed #000;
             padding: 4px;
             width: 100%;
             font-size: 11px;
          }
          .header-input.dark {
             background: rgba(0,0,0,0.3);
             color: white;
             border: 1px dashed #ccc;
             text-align: right;
          }

          .invoice-logo-container {
             display: flex;
             align-items: center;
             gap: 15px;
          }
          .invoice-logo {
             width: 60px;
             height: 60px;
             background: #232833;
             border-radius: 50%;
             display: flex;
             align-items: center;
             justify-content: center;
             overflow: hidden;
             flex-shrink: 0;
          }
          .logo-bubble {
             width: 100%;
             height: 100%;
             background: #ffcc00;
             border-radius: 50%;
             clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
             transform: rotate(15deg) scale(0.6);
          }
          .main-name { font-weight: 900; letter-spacing: -0.5px; line-height: 1; }
          .tagline { font-size: 10px; font-weight: 600; margin-top: 4px; }
          .company-details { color: white; text-align: right; font-size: 10px; line-height: 1.5; }
          .website { margin-top: 8px; font-weight: 800; color: #ffcc00; font-size: 11px; }
          
          .invoice-meta {
             display: flex;
             justify-content: flex-end;
             padding: 15px 40px 10px 40px;
          }
          .meta-right-clean { width: 300px; }
          .meta-row-clean { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 4px; }
          .meta-label { font-size: 11px; color: #64748b; }
          .meta-value { font-size: 11px; text-align: right; font-weight: 700; width: 150px; }
          
          .invoice-recipient { padding: 10px 40px 25px 40px; }
          .recipient-row { display: flex; margin-bottom: 5px; font-size: 12px; }
          .recipient-label { width: 80px; font-weight: 500; }
          .recipient-value { border-bottom: 1px solid #000; flex: 1; max-width: 350px; font-weight: 600; }
          
          .table-print-container {
             padding: 0 40px;
             width: 100%;
             box-sizing: border-box;
          }
          .invoice-table {
             width: 100%;
             border-collapse: collapse;
             border: 1.5px solid #000;
             table-layout: fixed;
          }
          .invoice-table th {
             color: #000;
             padding: 8px 10px;
             text-align: left;
             font-size: 11px;
             font-weight: 900;
             border: 1.5px solid #000;
          }
          .invoice-table td {
             padding: 10px;
             font-size: 11px;
             border-left: 1.5px solid #000;
             border-right: 1.5px solid #000;
          }
          .item-name { font-weight: 800; }
          .empty-row td { height: 35px; }
          .invoice-table tbody tr:last-child td { border-bottom: 1.5px solid #000; }
          
          .invoice-summary-grid { display: flex; padding: 25px 40px; }
          .summary-left { flex: 1.2; }
          .payment-title { font-size: 11px; font-weight: 800; text-decoration: underline; margin-bottom: 8px; }
          .bank-list { font-size: 10px; line-height: 1.6; }
          .bank-row span { font-weight: 700; width: 55px; display: inline-block; }
          
          .summary-right { flex: 0.8; }
          .total-box-clean { border: 1.5px solid #000; }
          .total-row { display: flex; padding: 5px 10px; font-size: 11px; }
          .total-label { flex: 1; font-weight: 700; }
          .total-value { width: 70px; text-align: right; font-weight: 600; }
          .grand-total-clean { border-top: 1.5px solid #000; font-weight: 900; background: #f8fafc; }
          
          .invoice-footer-bottom { margin-top: auto; padding: 40px; display: flex; justify-content: flex-end; }
          .signature-container { text-align: center; min-width: 150px; font-size: 11px; }
          .signature-space { height: 60px; }
          .signature-name { font-weight: 800; text-decoration: underline; }
          
          .text-center { text-align: center; }
          .text-right { text-align: right; }

          @media print {
             .no-print { display: none !important; }
             body { background: white !important; }
             .invoice-outer-container { padding: 0 !important; background: white !important; }
             .invoice-paper { box-shadow: none !important; width: 210mm !important; border: none !important; }
             @page { size: A4; margin: 0; }
          }
       `}</style>
    </div>
  );
}
