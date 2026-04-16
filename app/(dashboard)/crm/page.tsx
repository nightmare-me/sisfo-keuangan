"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";

const COLUMNS = [
  { id: "NEW", title: "🔴 Baru Masuk", color: "#f87171" },
  { id: "FOLLOW_UP", title: "🟡 Follow Up", color: "#fbbf24" },
  { id: "PENDING", title: "🟠 Menunggu Bayar", color: "#f97316" },
  { id: "PAID", title: "🟢 Lunas (Selesai)", color: "#10b981" },
];

export default function CRMPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isReadOnly = !["ADMIN", "CS"].includes(role);

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const [convertForm, setConvertForm] = useState({
    hargaFinal: "",
    metodeBayar: "TRANSFER",
    tanggalLunas: new Date().toISOString().slice(0, 10),
  });

  function fetchData() {
    fetch("/api/crm")
      .then(r => r.json())
      .then(d => { setLeads(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  async function ubahStatus(id: string, status: string) {
    if (isReadOnly) return;
    await fetch("/api/crm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchData();
  }

  function handleLunasClick(lead: any) {
    if (isReadOnly) return;
    setSelectedLead(lead);
    setConvertForm({
      ...convertForm,
      hargaFinal: lead.nominalTagihan ? lead.nominalTagihan.toString() : "",
    });
    setShowConvertModal(true);
  }

  async function submitConvert(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly) return;

    const res = await fetch("/api/crm/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: selectedLead.id,
        hargaFinal: parseFloat(convertForm.hargaFinal),
        metodeBayar: convertForm.metodeBayar,
        tanggalLunas: convertForm.tanggalLunas,
      }),
    });

    if (res.ok) {
      alert("✅ Lead berhasil dikonversi ke Siswa dan Pemasukan tercatat!");
      setShowConvertModal(false);
      fetchData();
    } else {
      const err = await res.json();
      alert("❌ Gagal convert: " + err.error);
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">CRM & Leads</div>
          <div className="topbar-subtitle">Pantau progres calon siswa dari pendaftaran hingga lunas</div>
        </div>
      </div>

      <div className="page-container" style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 20, minWidth: 1100, minHeight: "calc(100vh - 160px)" }}>
          {COLUMNS.map(col => {
            const colLeads = leads.filter(l => l.status === col.id);
            return (
              <div key={col.id} style={{ flex: 1, minWidth: 260, background: "var(--bg-elevated)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column" }}>
                <div style={{ paddingBottom: 12, borderBottom: `2px solid ${col.color}`, marginBottom: 16, fontWeight: 700, fontSize: 14, color: "var(--text-primary)", display: "flex", justifyContent: "space-between" }}>
                  <span>{col.title}</span>
                  <span className="badge" style={{ background: "var(--bg-default)" }}>{colLeads.length}</span>
                </div>
                
                {loading ? <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>Loading...</div> : null}
                
                <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, overflowY: "auto" }}>
                  {colLeads.map(lead => (
                    <div key={lead.id} style={{ background: "var(--bg-default)", border: "1px solid var(--border-default)", borderRadius: 8, padding: 12, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>{lead.nama}</div>
                      
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                        📱 <a href={`https://wa.me/${lead.whatsapp}`} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>{lead.whatsapp}</a>
                      </div>
                      
                      {lead.program && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#818cf8", marginTop: 8, padding: "4px 8px", background: "rgba(129,140,248,0.1)", borderRadius: 4, display: "inline-block" }}>
                          📚 {lead.program.nama}
                        </div>
                      )}

                      {lead.nominalTagihan && (
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--warning)", marginTop: 8 }}>
                          Total: {formatCurrency(lead.nominalTagihan)}
                        </div>
                      )}
                      
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 12, display: "flex", justifyContent: "space-between" }}>
                        <span>⏳ {formatDate(lead.createdAt, "dd MMM HH:mm")}</span>
                      </div>

                      {/* Tombol Aksi - Disembunyikan untuk Finance/Read Only */}
                      {!isReadOnly && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--border-default)", display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {col.id === "NEW" && (
                            <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={() => ubahStatus(lead.id, "FOLLOW_UP")}>Mulai Follow Up ➡️</button>
                          )}
                          {col.id === "FOLLOW_UP" && (
                            <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={() => ubahStatus(lead.id, "PENDING")}>Tunggu Transfer ⏳</button>
                          )}
                          {col.id === "PENDING" && (
                            <button className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={() => handleLunasClick(lead)}>✅ Tandai Lunas</button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {colLeads.length === 0 && !loading && <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginTop: 20 }}>Tidak ada data</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showConvertModal && selectedLead && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowConvertModal(false); }}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Konfirmasi Lunas</div>
              <button className="modal-close" onClick={() => setShowConvertModal(false)}>✕</button>
            </div>
            <form onSubmit={submitConvert}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                  Lead <b>{selectedLead?.nama}</b> akan dijadikan Siswa dan tercatat di Pemasukan secara otomatis.
                </p>
                <div className="form-group">
                  <label className="form-label required">Total Transfer (Rp)</label>
                  <input type="number" className="form-control" value={convertForm.hargaFinal} onChange={(e) => setConvertForm({ ...convertForm, hargaFinal: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label required">Metode Bayar</label>
                  <select className="form-control" value={convertForm.metodeBayar} onChange={(e) => setConvertForm({ ...convertForm, metodeBayar: e.target.value })}>
                    <option value="TRANSFER">Transfer Bank</option>
                    <option value="CASH">Tunai / Cash</option>
                    <option value="QRIS">QRIS / E-Wallet</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Tanggal Lunas</label>
                  <input type="date" className="form-control" value={convertForm.tanggalLunas} onChange={(e) => setConvertForm({ ...convertForm, tanggalLunas: e.target.value })} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowConvertModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">✅ Konversi & Lunas</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
