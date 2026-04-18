"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { 
  Users, 
  Clock, 
  MessageCircle, 
  ArrowRight, 
  CheckCircle2, 
  Wallet,
  MoreVertical,
  Plus,
  BookOpen,
  Calendar,
  CreditCard,
  UserPlus
} from "lucide-react";

const COLUMNS = [
  { id: "NEW", title: "Baru Masuk", color: "#6366f1", icon: <UserPlus size={18} /> },
  { id: "FOLLOW_UP", title: "Follow Up", color: "#fbbf24", icon: <MessageCircle size={18} /> },
  { id: "PENDING", title: "Menunggu Bayar", color: "#f97316", icon: <Clock size={18} /> },
  { id: "PAID", title: "Lunas (Selesai)", color: "#10b981", icon: <CheckCircle2 size={18} /> },
];

export default function CRMPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isReadOnly = !["ADMIN", "CS"].includes(role);

  const [leads, setLeads] = useState<any[]>([]);
  const [csStats, setCsStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [waTemplates, setWaTemplates] = useState<any[]>([]);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const [convertForm, setConvertForm] = useState({
    hargaFinal: "",
    metodeBayar: "TRANSFER",
    tanggalLunas: new Date().toISOString().slice(0, 10),
  });

  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedChatLead, setSelectedChatLead] = useState<any>(null);

  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    nama: "",
    whatsapp: "",
    programId: "",
    preferensiJadwal: "",
  });
  const [programs, setPrograms] = useState<any[]>([]);

  function fetchData() {
    fetch("/api/crm")
      .then(r => r.json())
      .then(d => { setLeads(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));

    fetch(`/api/crm/stats?t=${Date.now()}`)
      .then(r => r.json())
      .then(d => setCsStats(Array.isArray(d) ? d : []));
  }

  useEffect(() => { 
    fetchData(); 
    fetch("/api/public/programs").then(r => r.json()).then(d => setPrograms(Array.isArray(d) ? d : []));
    fetch("/api/settings/wa-templates")
      .then(async r => {
        if (!r.ok) return [];
        const text = await r.text();
        return text ? JSON.parse(text) : [];
      })
      .then(d => setWaTemplates(Array.isArray(d) ? d : []))
      .catch((err) => {
        console.error("Fetch WA Templates error:", err);
        setWaTemplates([]);
      });
  }, []);

  async function ubahStatus(id: string, status: string) {
    if (isReadOnly) return;
    await fetch("/api/crm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchData();
  }

  async function submitNewLead(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly) return;
    setSubmittingLead(true);
    let wa = newLeadForm.whatsapp.replace(/\D/g, "");
    if (wa.startsWith("0")) wa = "62" + wa.substring(1);

    const res = await fetch("/api/public/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        ...newLeadForm, 
        whatsapp: wa, 
        csId: role === "CS" ? (session?.user as any)?.id : undefined 
      }),
    });

    if (res.ok) {
      setShowNewLeadModal(false);
      setNewLeadForm({ nama: "", whatsapp: "", programId: "", preferensiJadwal: "" });
      fetchData();
    } else {
      alert("Gagal menyimpan lead baru.");
    }
    setSubmittingLead(false);
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
      setShowConvertModal(false);
      fetchData();
    } else {
      const err = await res.json();
      alert("❌ Gagal convert: " + err.error);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', flexShrink: 0, borderBottom: '1px solid var(--ghost-border)', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)' }}>
        <div>
          <h1 className="display-title" style={{ margin: 0 }}>CRM Board</h1>
          <p className="text-secondary" style={{ margin: '4px 0 0 0' }}>Kelola alur pendaftaran calon siswa</p>
        </div>
        {!isReadOnly && (
          <button className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)' }} onClick={() => setShowNewLeadModal(true)}>
             <Plus size={16} /> Lead Baru
          </button>
        )}
      </div>

      {/* Executive Summary Strip */}
      {!isReadOnly && (
        <div style={{ display: 'flex', gap: 12, padding: '12px 24px', flexShrink: 0, borderBottom: '1px solid var(--ghost-border)', overflowX: 'auto' }}>
          {/* User Performance Card (Always First) */}
          {(() => {
            const myId = (session?.user as any)?.id;
            const myName = session?.user?.name;
            const myStat = csStats.find(s => s.csId === myId || s.name === myName) || { cr: '0%', fee: 0, omset: 0 };
            return (
              <div style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)', borderRadius: 'var(--radius-lg)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--primary)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Performa Anda</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.8 }}>Closing Rate</div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{myStat.cr}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.8 }}>Fee Estimasi</div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{formatCurrency(myStat.fee)}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Admin Performance Overview (Shows All CS CR) */}
          {role === "ADMIN" && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ background: 'var(--surface-container-high)', borderRadius: 'var(--radius-lg)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--secondary)' }}>CR TIM CS</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {csStats.map(s => (
                    <div key={s.csId} style={{ background: 'var(--surface)', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                      {s.name.split(' ')[0]}: <span style={{ color: 'var(--primary)' }}>{s.cr}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {[
            { label: 'Total Prospek', value: leads.length, unit: 'siswa', color: 'var(--on-surface)' },
            { label: 'Menunggu Bayar', value: leads.filter(l => l.status === 'PENDING').length, color: 'var(--warning)' },
            { 
              label: role === "ADMIN" ? 'Total Omset' : 'Omset Saya', 
              value: formatCurrency(role === "ADMIN" 
                ? csStats.reduce((a, b) => a + b.omset, 0) 
                : (csStats.find(s => s.csId === (session?.user as any)?.id)?.omset || 0)
              ), 
              color: 'var(--success)' 
            },
          ].map((stat, i) => (
            <div key={i} style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{stat.label}</span>
              <span style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: stat.color }}>{stat.value}{stat.unit ? ` ${stat.unit}` : ''}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '12px 16px 12px' }}>
        {/* MAIN KANBAN BOARD */}
        <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", display: 'flex' }}>
          <div style={{ display: "flex", gap: 12, flex: 1, minWidth: "min-content" }}>
            {COLUMNS.map(col => {
              const colLeads = leads.filter(l => l.status === col.id);
              return (
                <div key={col.id} style={{ flex: '1 1 200px', minWidth: 200, display: "flex", flexDirection: "column", background: 'var(--surface-container-low)', padding: '14px 12px', borderRadius: 'var(--radius-xl)' }}>
                  
                  {/* Column Header */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    borderBottom: `2px solid ${col.color}`,
                    paddingBottom: 10,
                    marginBottom: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ color: col.color }}>{col.icon}</div>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface)' }}>
                        {col.title}
                      </span>
                    </div>
                    <span className="badge" style={{ background: 'var(--surface)', color: 'var(--secondary)' }}>{colLeads.length}</span>
                  </div>
                  
                  {/* Cards Container */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", paddingRight: 4 }}>
                    {loading ? (
                      [1, 2].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-xl)' }} />)
                    ) : colLeads.map(lead => (
                      <div key={lead.id} className="card" style={{ padding: '14px 16px', cursor: 'default', margin: 0, boxShadow: 'var(--shadow-sm)', transition: 'box-shadow var(--transition)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: "var(--on-surface)", maxWidth: '85%', lineHeight: 1.2 }}>
                            {lead.nama}
                          </div>
                          <MoreVertical size={16} color="var(--secondary)" style={{ cursor: 'pointer' }} />
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.95rem' }}>
                             <MessageCircle size={16} color="var(--success)" />
                             <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                               <a href={`https://wa.me/${lead.whatsapp}`} target="_blank" rel="noreferrer" style={{ color: "var(--secondary)", textDecoration: "none", fontWeight: 600 }}>{lead.whatsapp}</a>
                               <button 
                                 className="btn btn-secondary btn-icon" 
                                 style={{ width: 24, height: 24, padding: 0 }} 
                                 onClick={() => { setSelectedChatLead(lead); setShowChatModal(true); }}
                                 title="Quick Chat Templates"
                               >
                                 <MessageCircle size={12} />
                               </button>
                             </div>
                          </div>

                          {lead.program && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', background: "var(--surface)", padding: "6px 12px", borderRadius: 'var(--radius-full)', width: 'fit-content' }}>
                              <BookOpen size={14} color="var(--primary)" />
                              <span style={{ fontWeight: 700, color: "var(--on-surface)" }}>{lead.program.nama}</span>
                            </div>
                          )}

                          {lead.nominalTagihan && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                              <Wallet size={16} color="var(--primary)" />
                              <span style={{ fontSize: '1rem', fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(lead.nominalTagihan)}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Action & Date Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--ghost-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: "var(--secondary)", fontWeight: 700 }}>
                             <Clock size={12} />
                             {formatDate(lead.createdAt, "dd MMM")}
                          </div>

                          {!isReadOnly && (
                            <div style={{ display: 'flex', gap: 8 }}>
                               {col.id === "NEW" && (
                                 <button className="btn btn-secondary btn-icon" onClick={() => ubahStatus(lead.id, "FOLLOW_UP")} title="Follow Up">
                                   <ArrowRight size={14} />
                                 </button>
                               )}
                               {col.id === "FOLLOW_UP" && (
                                 <button className="btn btn-secondary btn-icon" onClick={() => ubahStatus(lead.id, "PENDING")} title="Tunggu Bayar">
                                    <Clock size={14} />
                                 </button>
                               )}
                               {col.id === "PENDING" && (
                                 <button className="btn btn-primary btn-sm" style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)' }} onClick={() => handleLunasClick(lead)}>
                                   Lunas
                                 </button>
                               )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {!loading && colLeads.length === 0 && (
                      <div className="empty-state" style={{ padding: '40px 20px', border: '1px dashed var(--ghost-border)', borderRadius: 'var(--radius-xl)' }}>
                         <Users size={32} className="empty-state-icon" />
                         <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Kosong</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* NEW LEAD NATIVE MODAL */}
      {showNewLeadModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowNewLeadModal(false); }}>
          <div className="modal" style={{ width: 440 }}>
             <div className="modal-header">
                <div>
                   <div className="modal-title">Tambah Lead Baru</div>
                   <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Input data prospek secara manual.</div>
                </div>
                <button className="modal-close" onClick={() => setShowNewLeadModal(false)}>✕</button>
             </div>
             <form onSubmit={submitNewLead}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                   <div className="form-group">
                      <label className="form-label required">Nama Siswa</label>
                      <input type="text" className="form-control" placeholder="Cth: Anggi Setiawan" value={newLeadForm.nama} onChange={(e) => setNewLeadForm({ ...newLeadForm, nama: e.target.value })} required />
                   </div>
                   <div className="form-group">
                      <label className="form-label required">No. WhatsApp</label>
                      <input type="tel" className="form-control" placeholder="08123xxxx" value={newLeadForm.whatsapp} onChange={(e) => setNewLeadForm({ ...newLeadForm, whatsapp: e.target.value })} required />
                   </div>
                   <div className="form-group">
                      <label className="form-label required">Program Diminati</label>
                      <select className="form-control" value={newLeadForm.programId} onChange={(e) => setNewLeadForm({ ...newLeadForm, programId: e.target.value })} required>
                        <option value="">-- Pilih Program --</option>
                        {programs.map(p => (
                          <option key={p.id} value={p.id}>{p.nama}</option>
                        ))}
                      </select>
                   </div>
                   <div className="form-group">
                      <label className="form-label">Preferensi Jadwal (Opsional)</label>
                      <input type="text" className="form-control" placeholder="Cth: Malam hari jam 19.00" value={newLeadForm.preferensiJadwal} onChange={(e) => setNewLeadForm({ ...newLeadForm, preferensiJadwal: e.target.value })} />
                   </div>
                </div>
                <div className="modal-footer" style={{ borderTop: '1px solid var(--border-default)', paddingTop: 24 }}>
                   <button type="button" className="btn btn-secondary" onClick={() => setShowNewLeadModal(false)}>Batal</button>
                   <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submittingLead}>
                     {submittingLead ? "Menyimpan..." : "Simpan Lead"}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* CONVERT TO SISWA LUNAS MODAL */}
      {showConvertModal && selectedLead && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowConvertModal(false); }}>
          <div className="modal" style={{ width: 440 }}>
             <div className="modal-header">
                <div>
                   <div className="modal-title">Konfirmasi Pembayaran</div>
                   <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Konversi lead <strong>{selectedLead.nama}</strong> ke Siswa aktif</div>
                </div>
                <button className="modal-close" onClick={() => setShowConvertModal(false)}>✕</button>
             </div>
             <form onSubmit={submitConvert}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                   <div className="glass" style={{ padding: 16, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--ghost-border)' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                         <Wallet size={20} />
                      </div>
                      <div>
                         <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--secondary)' }}>Tagihan Terdaftar</div>
                         <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(selectedLead.nominalTagihan)}</div>
                      </div>
                   </div>

                   <div className="form-group">
                      <label className="form-label required">Total Transfer Actual</label>
                      <div style={{ position: 'relative' }}>
                         <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 14 }}>Rp</div>
                         <input type="number" className="form-control" style={{ paddingLeft: 44 }} value={convertForm.hargaFinal} onChange={(e) => setConvertForm({ ...convertForm, hargaFinal: e.target.value })} required />
                      </div>
                   </div>

                   <div className="form-grid-2">
                       <div className="form-group">
                          <label className="form-label required">Metode</label>
                          <select className="form-control" value={convertForm.metodeBayar} onChange={(e) => setConvertForm({ ...convertForm, metodeBayar: e.target.value })}>
                            <option value="TRANSFER">Bank Transfer</option>
                            <option value="CASH">Tunai / Cash</option>
                            <option value="QRIS">QRIS / E-Wallet</option>
                          </select>
                       </div>
                       <div className="form-group">
                          <label className="form-label required">Tgl Bayar</label>
                          <input type="date" className="form-control" value={convertForm.tanggalLunas} onChange={(e) => setConvertForm({ ...convertForm, tanggalLunas: e.target.value })} required />
                       </div>
                   </div>
                </div>
                <div className="modal-footer" style={{ borderTop: '1px solid var(--ghost-border)', paddingTop: 24 }}>
                   <button type="button" className="btn btn-secondary" onClick={() => setShowConvertModal(false)}>Batal</button>
                   <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Sudah Bayar & Jadikan Siswa</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* QUICK CHAT MODAL */}
      {showChatModal && selectedChatLead && (
        <div className="modal-overlay" onClick={() => setShowChatModal(false)}>
          <div className="modal" style={{ width: 440 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Quick Chat: {selectedChatLead.nama}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pilih template pesan WhatsApp</div>
              </div>
              <button className="modal-close" onClick={() => setShowChatModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {waTemplates.length === 0 && <div style={{ textAlign: "center", padding: 20 }}>Belum ada template. Atur di menu Pengaturan.</div>}
                {waTemplates.map(t => {
                  const message = t.text
                    .replace("[nama]", selectedChatLead.nama)
                    .replace("[program]", selectedChatLead.program?.nama || "Program")
                    .replace("[nominal]", formatCurrency(selectedChatLead.nominalTagihan || 0));
                  
                  return (
                    <div key={t.id} className="card" style={{ padding: 16, margin: 0, cursor: 'default' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--primary)', display: 'flex', justifyContent: 'space-between' }}>
                        {t.label}
                        <button className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => {
                          window.open(`https://wa.me/${selectedChatLead.whatsapp}?text=${encodeURIComponent(message)}`, "_blank");
                          // AUTO MOVE LOGIC
                          if (selectedChatLead.status === "NEW") {
                            ubahStatus(selectedChatLead.id, "FOLLOW_UP");
                          }
                          setShowChatModal(false);
                        }}>Kirim 🚀</button>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--surface)', padding: 12, borderRadius: 8 }}>
                        {message}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
