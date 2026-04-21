"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer, ArrowLeft } from "lucide-react";

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leads/${params.id}/invoice`)
      .then(r => r.json())
      .then(d => { setLead(d); setLoading(false); });
  }, [params.id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Memuat data invoice...</div>;
  if (!lead) return <div style={{ padding: 40, textAlign: 'center' }}>Data tidak ditemukan</div>;

  return (
    <div className="invoice-outer-container">
       {/* UI Tools (Hidden on print) */}
       <div className="no-print" style={{ maxWidth: '800px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => router.back()}>
             <ArrowLeft size={16} /> Kembali
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
             <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                <Printer size={16} /> Cetak Invoice
             </button>
          </div>
       </div>

       {/* The Real Invoice Template */}
       <div className="invoice-paper">
          {/* Header Section */}
          <div className="invoice-header">
             <div className="header-yellow-box">
                <div className="invoice-logo-container">
                   <div className="invoice-logo">
                      <div className="logo-bubble">
                         <div className="wave-icon"></div>
                      </div>
                   </div>
                   <div className="invoice-brand">
                      <div className="main-name">SPEAKING PARTNER</div>
                      <div className="tagline">Teman Terhebat Belajar Bahasa Inggris</div>
                   </div>
                </div>
             </div>
             <div className="header-dark-box">
                <div className="company-details">
                   <p>Jalan Brawijaya 13A, Pare, Kediri - Kode Pos 64213</p>
                   <p>Email: speakingpartnerku@gmail.com</p>
                   <p>Telp: 0877 6263 0406</p>
                   <div className="website">WWW.SPEAKINGPARTNER.ID</div>
                </div>
             </div>
          </div>

          {/* Meta Info */}
          <div className="invoice-meta">
             <div className="meta-right">
                <div className="meta-row">
                   <span className="meta-label">No. INVOICE</span>
                   <span className="meta-value">{lead.id.slice(-7).toUpperCase()}</span>
                </div>
                <div className="meta-row">
                   <span className="meta-label">Tgl Pendaftaran:</span>
                   <span className="meta-value">{formatDate(lead.tanggalLead || lead.createdAt, "d/MM/yyyy")}</span>
                </div>
             </div>
          </div>

          {/* Recipient */}
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
                <span className="recipient-value">-</span>
             </div>
          </div>

          {/* Table */}
          <table className="invoice-table">
             <thead>
                <tr>
                   <th style={{ width: '50%' }}>Keterangan</th>
                   <th style={{ width: '10%' }} className="text-center">Jumlah</th>
                   <th style={{ width: '20%' }} className="text-right">Harga</th>
                   <th style={{ width: '20%' }} className="text-right">Sub Total</th>
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
                {/* Fixed empty rows for look */}
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <tr key={i} className="empty-row"><td></td><td></td><td></td><td></td></tr>
                ))}
             </tbody>
          </table>

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
                <div className="total-box">
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
                   <div className="total-row grand-total">
                      <span className="total-label">GRAND TOTAL</span>
                      <span className="total-symbol">Rp</span>
                      <span className="total-value">{formatCurrency(lead.nominalTagihan || lead.program?.harga || 0).replace('Rp', '').trim()}</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Footer Bottom */}
          <div className="invoice-footer-bottom">
             <div className="signature-container">
                <div>Dikeluarkan oleh</div>
                <div className="signature-space"></div>
                <div className="signature-name">{lead.cs?.name || 'Administrator'}</div>
             </div>
          </div>
       </div>

       {/* INVOICE CSS */}
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
             box-shadow: 0 20px 50px rgba(0,0,0,0.1);
             position: relative;
             display: flex;
             flex-direction: column;
             color: #1e293b;
          }
          
          /* Header Layout */
          .invoice-header {
             display: flex;
             height: 160px;
             position: relative;
             margin-bottom: 20px;
          }
          .header-yellow-box {
             background: #ffcc00;
             flex: 4.5;
             display: flex;
             align-items: center;
             padding-left: 50px;
             clip-path: polygon(0 0, 100% 0, 85% 100%, 0% 100%);
             z-index: 2;
          }
          .header-dark-box {
             background: #232833;
             flex: 5.5;
             display: flex;
             align-items: center;
             justify-content: flex-end;
             padding: 0 40px 0 0;
             margin-left: -60px;
          }
          
          /* Branding */
          .invoice-logo-container {
             display: flex;
             align-items: center;
             gap: 15px;
             color: #232833;
          }
          .invoice-logo {
             width: 65px;
             height: 65px;
             background: #232833;
             border-radius: 50%;
             display: flex;
             align-items: center;
             justify-content: center;
             position: relative;
          }
          .logo-bubble {
             width: 45px;
             height: 45px;
             background: #ffcc00;
             border-radius: 50%;
             clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
             transform: rotate(15deg);
          }
          .main-name {
             font-size: 24px;
             font-weight: 900;
             letter-spacing: -0.5px;
             line-height: 1;
          }
          .tagline {
             font-size: 11px;
             font-weight: 600;
             margin-top: 4px;
          }
          .company-details {
             color: white;
             text-align: right;
             font-size: 10px;
             line-height: 1.5;
          }
          .company-details p { margin: 0; }
          .website {
             margin-top: 8px;
             font-weight: 800;
             color: #ffcc00;
             letter-spacing: 1.5px;
             font-size: 11px;
          }
          
          /* Meta Info */
          .invoice-meta {
             display: flex;
             justify-content: flex-end;
             padding: 0 40px 10px 40px;
          }
          .meta-right {
             width: 280px;
             border: 1px solid #000;
          }
          .meta-row {
             display: flex;
          }
          .meta-row:first-child { border-bottom: 1px solid #000; }
          .meta-label {
             flex: 1.5;
             padding: 8px 12px;
             font-size: 12px;
             font-weight: 700;
             border-right: 1px solid #000;
             background: #fff;
          }
          .meta-value {
             flex: 1;
             padding: 8px 12px;
             font-size: 12px;
             text-align: right;
             font-weight: 600;
          }
          
          /* Recipient */
          .invoice-recipient {
             padding: 10px 40px 30px 40px;
          }
          .recipient-row {
             display: flex;
             margin-bottom: 5px;
             font-size: 13px;
          }
          .recipient-label {
             width: 80px;
             font-weight: 500;
          }
          .recipient-value {
             border-bottom: 1px solid #000;
             flex: 1;
             max-width: 350px;
             font-weight: 600;
          }
          
          /* Table Style */
          .invoice-table {
             width: calc(100% - 80px);
             margin: 0 40px;
             border-collapse: collapse;
             border: 1px solid #000;
          }
          .invoice-table th {
             background: #ffcc00;
             color: #000;
             padding: 10px 12px;
             text-align: left;
             font-size: 13px;
             font-weight: 800;
             border: 1px solid #000;
          }
          .invoice-table td {
             padding: 12px;
             font-size: 12px;
             border-left: 1px solid #000;
             border-right: 1px solid #000;
             background: #fff;
          }
          .item-name { font-weight: 800; margin-bottom: 3px; }
          .item-desc { font-size: 10px; color: #475569; }
          .empty-row td { height: 35px; border-bottom: none; border-top: none; }
          .invoice-table tbody tr:last-child td { border-bottom: 1px solid #000; }
          
          /* Summary Section */
          .invoice-summary-grid {
             display: flex;
             padding: 30px 40px;
          }
          .summary-left { flex: 1.2; }
          .payment-title {
             font-size: 12px;
             font-weight: 800;
             text-decoration: underline;
             margin-bottom: 8px;
          }
          .bank-list { font-size: 11px; line-height: 1.7; }
          .bank-row span { font-weight: 700; display: inline-block; width: 60px; }
          .acct-name { margin-top: 5px; font-size: 12px; }
          
          .summary-right { flex: 0.8; }
          .total-box {
             border: 1px solid #000;
             width: 100%;
          }
          .total-row {
             display: flex;
             padding: 6px 12px;
             font-size: 12px;
          }
          .total-label { flex: 1; font-weight: 700; }
          .total-symbol { width: 30px; font-weight: 600; }
          .total-value { width: 80px; text-align: right; font-weight: 600; }
          .grand-total {
             border-top: 1px solid #000;
             font-weight: 900;
             font-size: 13px;
             background: #fff;
          }
          
          /* Signature */
          .invoice-footer-bottom {
             margin-top: auto;
             padding: 40px;
             display: flex;
             justify-content: flex-end;
          }
          .signature-container {
             text-align: center;
             min-width: 150px;
             font-size: 12px;
          }
          .signature-space { height: 70px; }
          .signature-name { font-weight: 800; text-decoration: underline; }
          
          .text-center { text-align: center; }
          .text-right { text-align: right; }

          @media print {
             .no-print { display: none !important; }
             body { background: white !important; margin: 0 !important; padding: 0 !important; }
             .invoice-outer-container { padding: 0 !important; background: white !important; }
             .invoice-paper { box-shadow: none !important; width: 100% !important; border: none !important; }
             @page { size: A4; margin: 0; }
          }
       `}</style>
    </div>
  );
}
