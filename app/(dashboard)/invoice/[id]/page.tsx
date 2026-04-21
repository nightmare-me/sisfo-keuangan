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

  // Local Storage Storage
  useEffect(() => {
    const saved = localStorage.getItem("invoice_header_v3");
    if (saved) {
      setHeaderInfo(JSON.parse(saved));
    }
    const savedMode = localStorage.getItem("invoice_custom_mode");
    if (savedMode === "true") {
      setUseCustomHeaderImage(true);
    }
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

       <div className="invoice-paper">
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

          <div className="table-print-container">
            <table className="invoice-table">
               <thead>
                  <tr>
                     <th className="th-ket" style={{ width: '55%' }}>KETERANGAN</th>
                     <th className="th-jml text-center" style={{ width: '8%' }}>JML</th>
                     <th className="th-harga text-right" style={{ width: '18%' }}>HARGA</th>
                     <th className="th-total text-right" style={{ width: '19%' }}>TOTAL</th>
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
             background: #f8fafc;
             min-height: 100vh;
             font-family: 'Inter', 'Helvetica', sans-serif;
          }
          .invoice-paper {
             width: 195mm;
             min-height: 280mm;
             margin: 0 auto;
             background: white;
             box-shadow: 0 10px 40px rgba(0,0,0,0.1);
             display: flex;
             flex-direction: column;
             color: #000;
             position: relative;
             overflow: hidden;
             box-sizing: border-box;
          }
          
          .invoice-header { width: 100%; height: 160px; display: flex; }
          .header-yellow-box { background: #facd00; flex: 4; display: flex; align-items: center; padding-left: 35px; clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%); z-index: 2; }
          .header-dark-box { background: #1e293b; flex: 6; display: flex; align-items: center; justify-content: flex-end; padding-right: 35px; margin-left: -50px; }
          .invoice-logo { width: 50px; height: 50px; border-radius: 50%; background: #1e293b; overflow: hidden; flex-shrink: 0; }
          .logo-bubble { width: 100%; height: 100%; background: #facd00; transform: scale(0.6) rotate(15deg); clip-path: polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%); }
          .invoice-brand { margin-left: 12px; color: #1e293b; }
          .main-name { font-size: 16px; font-weight: 900; line-height: 1; }
          .tagline { font-size: 8px; font-weight: 700; }
          .company-details { color: white; text-align: right; font-size: 9px; line-height: 1.5; }
          .website { margin-top: 5px; color: #facd00; font-weight: 900; font-size: 9px; }
          .header-input { border: 1px dashed #000; padding: 2px; width: 100%; font-size: 10px; }
          .header-input.dark { background: rgba(0,0,0,0.3); color: white; border: 1px dashed #777; }

          .invoice-meta { display: flex; justify-content: flex-end; padding: 20px 35px 5px 35px; }
          .meta-right-clean { width: 250px; }
          .meta-row-clean { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 2px; }
          .meta-label { font-size: 10px; color: #64748b; }
          .meta-value { font-size: 10px; font-weight: 700; width: 130px; text-align: right; }

          .invoice-recipient { padding: 5px 35px 25px 35px; }
          .recipient-row { display: flex; margin-bottom: 4px; font-size: 11px; align-items: center; }
          .recipient-label { width: 70px; font-weight: 500; }
          .recipient-value { border-bottom: 1px solid #eee; flex: 1; max-width: 300px; }

          .table-print-container { padding: 0 35px; width: 100%; box-sizing: border-box; }
          .invoice-table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; table-layout: fixed; }
          .invoice-table th { background: #facd00; color: #000; border: 1.5px solid #000; padding: 6px 10px; font-size: 10px; font-weight: 900; text-align: left; }
          .invoice-table td { padding: 8px 10px; font-size: 10px; border-left: 1.5px solid #000; border-right: 1.5px solid #000; line-height: 1.4; }
          .item-name { font-weight: 800; margin-bottom: 2px; }
          .item-desc { font-size: 8px; color: #475569; }
          .empty-row td { height: 25px; }
          .invoice-table tbody tr:last-child td { border-bottom: 1.5px solid #000; }

          .invoice-summary-grid { display: flex; padding: 20px 35px; gap: 20px; }
          .summary-left { flex: 1.2; }
          .payment-title { font-size: 10px; font-weight: 900; text-decoration: underline; margin-bottom: 6px; }
          .bank-list { font-size: 9px; line-height: 1.5; }
          .bank-row span { font-weight: 800; width: 50px; display: inline-block; }

          .summary-right { flex: 0.8; }
          .total-box-clean { border: 1.5px solid #000; width: 100%; }
          .total-row { display: flex; padding: 4px 10px; font-size: 10px; }
          .total-label { flex: 1; font-weight: 700; }
          .total-value { width: 70px; text-align: right; font-weight: 600; }
          .grand-total-clean { border-top: 1.5px solid #000; background: #f8fafc; font-weight: 900; font-size: 11px; }

          .invoice-footer-bottom { margin-top: auto; padding: 30px 35px; display: flex; justify-content: flex-end; }
          .signature-container { text-align: center; min-width: 140px; font-size: 10px; }
          .signature-space { height: 50px; }
          .signature-name { font-weight: 800; text-decoration: underline; }

          .text-center { text-align: center; }
          .text-right { text-align: right; }

          @media print {
             .no-print { display: none !important; }
             body { background: white !important; margin: 0 !important; }
             .invoice-outer-container { padding: 0 !important; background: white !important; }
             .invoice-paper { box-shadow: none !important; width: 195mm !important; border: none !important; }
             @page { size: A4; margin: 0; }
          }
       `}</style>
    </div>
  );
}
