"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer, ArrowLeft, Layout } from "lucide-react";

// Version 3.3 - Final Polish
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
    const cleanUrl = url.trim();
    if (cleanUrl.includes('drive.google.com')) {
      const idMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
      const idSearch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
      const finalId = (idMatch && idMatch[1]) || (idSearch && idSearch[1]);
      if (finalId) {
        return `https://drive.google.com/uc?id=${finalId}&export=download`;
      }
    }
    return cleanUrl;
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
       <div className="no-print" style={{ maxWidth: '800px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

       <div className="invoice-paper" id="invoice-paper">
          {/* Header Section */}
          {useCustomHeaderImage ? (
             <div className="custom-header-image-container">
                {headerInfo.fullHeaderImageUrl ? (
                   <img src={getDirectLogoUrl(headerInfo.fullHeaderImageUrl)} alt="Kop Surat" style={{ width: '100%', height: 'auto', display: 'block' }} />
                ) : (
                   <div style={{ height: 180, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '2px solid #000' }}>
                      Pilih Gambar Kop Surat di Menu Edit
                   </div>
                )}
                {isEditingHeader && (
                   <div style={{ padding: 15, background: '#FFF7ED', borderBottom: '1px solid #FF8000' }}>
                      <input className="header-input" value={headerInfo.fullHeaderImageUrl} placeholder="Link Gambar Kop Surat (Gdrive)..." onChange={e => setHeaderInfo({...headerInfo, fullHeaderImageUrl: e.target.value})} />
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
                               <input className="header-input" value={headerInfo.name} onChange={e => setHeaderInfo({...headerInfo, name: e.target.value})} style={{ fontSize: 18, fontWeight: 900 }} />
                               <input className="header-input" value={headerInfo.logoUrl} placeholder="Link Logo GDrive" onChange={e => setHeaderInfo({...headerInfo, logoUrl: e.target.value})} style={{ fontSize: 9 }} />
                            </div>
                         ) : (
                            <div className="main-name">{headerInfo.name}</div>
                         )}
                         {isEditingHeader ? (
                            <input className="header-input" value={headerInfo.tagline} onChange={e => setHeaderInfo({...headerInfo, tagline: e.target.value})} style={{ fontSize: 9, width: '100%' }} />
                         ) : (
                            <div className="tagline">{headerInfo.tagline}</div>
                         )}
                      </div>
                   </div>
                </div>
                <div className="header-dark-box">
                   <div className="company-details">
                      {isEditingHeader ? (
                         <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 220 }}>
                            <input className="header-input dark" value={headerInfo.address} onChange={e => setHeaderInfo({...headerInfo, address: e.target.value})} />
                            <input className="header-input dark" value={headerInfo.email} onChange={e => setHeaderInfo({...headerInfo, email: e.target.value})} />
                            <input className="header-input dark" value={headerInfo.telp} onChange={e => setHeaderInfo({...headerInfo, telp: e.target.value})} />
                            <input className="header-input dark" value={headerInfo.website} onChange={e => setHeaderInfo({...headerInfo, website: e.target.value})} />
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

          {/* Meta Info */}
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

          {/* Recipient */}
          <div className="invoice-recipient">
             <div className="recipient-row">
                <span className="recipient-label">Kepada :</span>
                <span className="recipient-value" style={{ fontWeight: 800 }}>{lead.nama}</span>
             </div>
             <div className="recipient-row">
                <span className="recipient-label">Alamat :</span>
                <span className="recipient-value">{lead.email || '-'}</span>
             </div>
             <div className="recipient-row">
                <span className="recipient-label">No. Siswa</span>
                <span className="recipient-value" style={{ fontWeight: 800 }}>{siswaNumber}</span>
             </div>
          </div>

          {/* TABLE SECTION - STRICT WIDTH */}
          <div className="table-print-container">
            <table className="invoice-table">
               <thead>
                  <tr>
                     <th className="th-ket" style={{ width: '55%' }}>KETERANGAN</th>
                     <th className="th-jml text-center" style={{ width: '10%' }}>JML</th>
                     <th className="th-harga text-right" style={{ width: '17%' }}>HARGA</th>
                     <th className="th-total text-right" style={{ width: '18%' }}>TOTAL</th>
                  </tr>
               </thead>
               <tbody>
                  <tr>
                     <td>
                        <div className="item-name">PENDAFTARAN PROGRAM {lead.program?.nama?.toUpperCase()}</div>
                        <div className="item-desc">{lead.program?.tipe || 'Standard'} Class - Speaking Partner</div>
                     </td>
                     <td className="text-center" style={{ fontWeight: 600 }}>1</td>
                     <td className="text-right">{formatCurrency(lead.program?.harga || 0).replace('Rp', '').trim()}</td>
                     <td className="text-right">{formatCurrency(lead.program?.harga || 0).replace('Rp', '').trim()}</td>
                  </tr>
                  <tr className="empty-row"><td></td><td></td><td></td><td></td></tr>
                  <tr className="empty-row"><td></td><td></td><td></td><td></td></tr>
                  <tr className="empty-row"><td></td><td></td><td></td><td></td></tr>
               </tbody>
            </table>
          </div>

          {/* Totals Section */}
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

          {/* Signature */}
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
             background: #f8fafc;
             min-height: 100vh;
             font-family: 'Inter', 'Helvetica', sans-serif;
          }
          .invoice-paper {
             width: 210mm;
             min-height: 297mm;
             margin: 0 auto;
             background: white;
             box-shadow: 0 10px 40px rgba(0,0,0,0.1);
             display: flex;
             flex-direction: column;
             color: #000;
             position: relative;
             overflow: hidden;
             box-sizing: border-box;
             padding: 0;
          }
          
          .custom-header-image-container {
             width: 210mm;
             margin: 0;
          }

          .invoice-header {
             width: 210mm;
             height: 160px;
             display: flex;
             position: relative;
             margin: 0;
          }
          .header-yellow-box { 
             background: #facd00; flex: 4; display: flex; align-items: center; 
             padding-left: 45px; clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%); z-index: 2; 
          }
          .header-dark-box { 
             background: #1e293b; flex: 6; display: flex; align-items: center; 
             justify-content: flex-end; padding-right: 40px; margin-left: -60px; 
          }
          
          .invoice-logo { width: 55px; height: 55px; border-radius: 50%; background: #1e293b; overflow: hidden; flex-shrink: 0; }
          .logo-bubble { width: 100%; height: 100%; background: #facd00; transform: scale(0.6) rotate(15deg); clip-path: polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%); }
          .invoice-brand { margin-left: 15px; color: #1e293b; }
          .main-name { font-size: 18px; font-weight: 900; line-height: 1; margin-bottom: 2px; }
          .tagline { font-size: 9px; font-weight: 700; }
          
          .company-details { color: white; text-align: right; font-size: 10px; line-height: 1.5; }
          .company-details p { margin: 0; }
          .website { margin-top: 5px; color: #facd00; font-weight: 900; font-size: 10px; }

          .header-input { border: 1px dashed #000; padding: 2px; width: 100%; font-size: 10px; }
          .header-input.dark { background: rgba(0,0,0,0.3); color: white; border: 1px dashed #777; }

          /* Meta */
          .invoice-meta { display: flex; justify-content: flex-end; padding: 20px 45px 5px 45px; width: 210mm; box-sizing: border-box; }
          .meta-right-clean { width: 280px; }
          .meta-row-clean { display: flex; justify-content: flex-end; gap: 15px; margin-bottom: 3px; }
          .meta-label { font-size: 10px; font-weight: 500; color: #64748b; }
          .meta-value { font-size: 10px; font-weight: 700; width: 140px; text-align: right; }

          /* Recipient */
          .invoice-recipient { padding: 5px 45px 30px 45px; width: 210mm; box-sizing: border-box; }
          .recipient-row { display: flex; margin-bottom: 5px; font-size: 12px; align-items: center; }
          .recipient-label { width: 80px; font-weight: 500; }
          .recipient-value { border-bottom: 1px solid #ddd; flex: 1; max-width: 320px; font-weight: 500; }

          /* TABLE STABILITY - ABSOLUTE CONSTRAINT */
          .table-print-container { 
             padding: 0 15mm; 
             width: 210mm; 
             box-sizing: border-box; 
          }
          .invoice-table { 
             width: 180mm; 
             border-collapse: collapse; 
             border: 1.5px solid #000; 
             table-layout: fixed; 
             margin: 0;
          }
          .invoice-table th { 
             background: #facd00; 
             color: #000; 
             border: 1.5px solid #000; 
             padding: 8px 10px; 
             font-size: 11px; 
             font-weight: 900; 
             text-align: left; 
          }
          .invoice-table td { 
             padding: 8px 10px; 
             font-size: 10px; 
             border-left: 1.5px solid #000; 
             border-right: 1.5px solid #000; 
             border-bottom: 0;
             line-height: 1.4;
          }
          .item-name { font-weight: 800; margin-bottom: 2px; }
          .item-desc { font-size: 9px; color: #475569; }
          .empty-row td { height: 30px; }
          .invoice-table tbody tr:last-child td { border-bottom: 1.5px solid #000; }

          /* Summary */
          .invoice-summary-grid { display: flex; padding: 30px 15mm; width: 210mm; box-sizing: border-box; gap: 20px; }
          .summary-left { flex: 1.3; }
          .payment-title { font-size: 11px; font-weight: 900; text-decoration: underline; margin-bottom: 8px; }
          .bank-list { font-size: 10px; line-height: 1.7; }
          .bank-row span { font-weight: 800; width: 55px; display: inline-block; }
          .acct-name { margin-top: 5px; font-size: 11px; }

          .summary-right { flex: 0.7; }
          .total-box-clean { border: 1.5px solid #000; width: 100%; }
          .total-row { display: flex; padding: 5px 12px; font-size: 10px; }
          .total-label { flex: 1; font-weight: 700; }
          .total-symbol { width: 25px; }
          .total-value { width: 70px; text-align: right; font-weight: 600; }
          .grand-total-clean { border-top: 1.5px solid #000; background: #f8fafc; font-weight: 900; font-size: 11px; }

          /* Bottom */
          .invoice-footer-bottom { margin-top: auto; padding: 40px 15mm; width: 210mm; box-sizing: border-box; display: flex; justify-content: flex-end; }
          .signature-container { text-align: center; min-width: 150px; font-size: 11px; }
          .signature-space { height: 65px; }
          .signature-name { font-weight: 800; text-decoration: underline; }

          .text-center { text-align: center; }
          .text-right { text-align: right; }

          @media print {
             .no-print { display: none !important; }
             body { background: white !important; margin: 0 !important; }
             .invoice-outer-container { padding: 0 !important; background: white !important; min-height: 297mm; }
             .invoice-paper { box-shadow: none !important; width: 210mm !important; height: 297mm !important; border: none !important; position: absolute; top: 0; left: 0; }
             @page { size: A4; margin: 0; }
          }
       `}</style>
    </div>
  );
}
