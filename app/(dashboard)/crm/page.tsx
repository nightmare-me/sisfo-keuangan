"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate, hasPermission, SUPER_ROLES } from "@/lib/utils";
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
  UserPlus,
  Trash2,
  Upload,
  Share2,
  FileSpreadsheet,
  TrendingUp,
  Edit,
  RotateCcw,
  Search,
  RefreshCw,
  FileText,
  Printer,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import Papa from "papaparse";

const COLUMNS = [
  { id: "NEW", title: "Baru Masuk", color: "#6366f1", icon: <UserPlus size={18} /> },
  { id: "FOLLOW_UP", title: "Follow Up", color: "#fbbf24", icon: <MessageCircle size={18} /> },
  { id: "PENDING", title: "Menunggu Bayar", color: "#f97316", icon: <Clock size={18} /> },
  { id: "PAID", title: "Lunas (Selesai)", color: "#10b981", icon: <CheckCircle2 size={18} /> },
  { id: "REFUNDED", title: "Refunded", color: "#ef4444", icon: <RotateCcw size={18} /> },
  { id: "CANCELLED", title: "Cancelled", color: "#64748b", icon: <Trash2 size={18} /> },
];

export default function CRMPage() {
  const { data: session } = useSession();
  
  // Granular Matrix Permissions
  const canView = hasPermission(session, "crm:view");
  const canEdit = hasPermission(session, "crm:edit");
  const canDelete = hasPermission(session, "crm:delete");

  const isReadOnly = !canEdit;
  const role = (session?.user as any)?.role?.toUpperCase();
  const isSuper = SUPER_ROLES.includes(role);

  const [leads, setLeads] = useState<any[]>([]);
  const [csStats, setCsStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [metaCounts, setMetaCounts] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

  const [waTemplates, setWaTemplates] = useState<any[]>([]);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingLead, setConvertingLead] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [convertForm, setConvertForm] = useState({
    hargaFinal: "",
    metodeBayar: "TRANSFER",
    tanggalLunas: new Date().toISOString().slice(0, 10),
  });

  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedChatLead, setSelectedChatLead] = useState<any>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEditLead, setSelectedEditLead] = useState<any>(null);

  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showShareLinksModal, setShowShareLinksModal] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    nama: "",
    whatsapp: "",
    programId: "",
    preferensiJadwal: "",
    isRO: false,
    tanggalLead: new Date().toLocaleDateString('sv'),
    sumber: "MANUAL",
  });
  const [programs, setPrograms] = useState<any[]>([]);

  function fetchData(p = page, l = limit, s = searchTerm, st = activeStatus) {
    setLoading(true);
    const params = new URLSearchParams({
      page: p.toString(),
      limit: l.toString(),
      search: s,
      v: Date.now().toString()
    });
    if (st) params.append("status", st);

    fetch(`/api/crm?${params.toString()}`)
      .then(r => r.json())
      .then(d => { 
        setLeads(Array.isArray(d.data) ? d.data : []); 
        setTotalData(d.meta?.total || 0);
        setTotalPages(d.meta?.totalPages || 1);
        setMetaCounts(d.meta?.counts || {});
        setLoading(false); 
      })
      .catch(() => setLoading(false));

    fetch(`/api/crm/stats?t=${Date.now()}`)
      .then(r => r.json())
      .then(d => setCsStats(Array.isArray(d) ? d : []));
  }

  // Debounced Search logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchData(1, limit, searchTerm, activeStatus);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Effect for pagination & status changes
  useEffect(() => {
    fetchData(page, limit, searchTerm, activeStatus);
  }, [page, limit, activeStatus]);
  useEffect(() => {
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
    // Optimistic
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    
    await fetch("/api/crm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchData();
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditLead) return;

    // Optimistic Update 🚀
    const updatedLead = { ...selectedEditLead };
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    
    setShowEditModal(false);

    try {
      const formatToDateString = (val: any) => {
        if (!val) return null;
        if (val instanceof Date) {
          // Format ke local YYYY-MM-DD
          const d = val;
          return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
        }
        if (typeof val === 'string') return val.slice(0, 10);
        return null;
      };

      const res = await fetch("/api/crm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: updatedLead.id,
          nama: updatedLead.nama,
          whatsapp: updatedLead.whatsapp,
          programId: updatedLead.programId,
          keterangan: updatedLead.keterangan,
          status: updatedLead.status,
          isRO: updatedLead.isRO,
          sumber: updatedLead.sumber,
          tanggalLead: formatToDateString(updatedLead.tanggalLead),
          tanggalClosing: formatToDateString(updatedLead.tanggalClosing),
        })
      });
      fetchData();
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Hapus ${selectedIds.length} lead terpilih secara permanen?`)) return;
    
    setLoading(true);
    const res = await fetch("/api/crm", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds })
    });
    
    if (res.ok) {
      alert("Leads terpilih berhasil dihapus.");
      setSelectedIds([]);
      fetchData();
    } else {
      alert("Gagal menghapus beberapa data.");
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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
        isRO: newLeadForm.isRO,
        sumber: newLeadForm.sumber,
        csId: role === "CS" ? (session?.user as any)?.id : undefined 
      }),
    });

    if (res.ok) {
      setShowNewLeadModal(false);
      setNewLeadForm({ nama: "", whatsapp: "", programId: "", preferensiJadwal: "", isRO: false, tanggalLead: new Date().toLocaleDateString('sv'), sumber: "MANUAL" });
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
      tanggalLunas: new Date().toLocaleDateString('sv')
    });
    setShowConvertModal(true);
  }

  async function submitConvert(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly || convertingLead) return;

    setConvertingLead(true);
    try {
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
        alert("❌ Gagal convert: " + (err.details || err.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setConvertingLead(false);
    }
  }

  if (!canView) return <div className="p-12 text-center text-muted">Bapak/Ibu tidak memiliki izin untuk melihat modul ini.</div>;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', paddingBottom: 0 }}>
      {/* Header & New KPI Cards */}
      <div style={{ padding: '24px 32px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 className="headline-lg" style={{ margin: 0, fontSize: '2rem' }}>CRM & Leads</h1>
            <p className="body-md" style={{ color: 'var(--text-muted)' }}>Monitor pendaftaran dan konversi calon siswa secara real-time</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {selectedIds.length > 0 && (
              <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleBulkDelete}>
                <Trash2 size={16} /> Hapus ({selectedIds.length})
              </button>
            )}
            {!isReadOnly && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <button className="btn btn-secondary" style={{ borderRadius: 'var(--radius-full)' }} onClick={() => setShowShareLinksModal(true)}>
                  <Share2 size={16} /> Bagikan Link
                </button>
                <button className="btn btn-secondary" style={{ borderRadius: 'var(--radius-full)' }} onClick={() => setShowImportModal(true)}>
                  <FileSpreadsheet size={16} /> Input Bulk
                </button>
                <button id="btn-tambah-lead" className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)' }} onClick={() => setShowNewLeadModal(true)}>
                  <Plus size={16} /> Input Lead Baru
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Cards (Sesuai Gambar) */}
        <div className="kpi-grid" style={{ gap: 12, marginBottom: 12 }}>
          <div className="kpi-card" style={{ "--kpi-color": "var(--primary)", "--kpi-bg": "var(--primary-bg)", padding: 16 } as any}>
            <div className="kpi-icon" style={{ color: "var(--primary)", marginBottom: 8, width: 40, height: 40 }}><Users size={20} /></div>
            <div className="kpi-label" style={{ fontSize: 10 }}>Total Order / Lead</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{totalData}</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--success)", "--kpi-bg": "var(--success-bg)", padding: 16 } as any}>
            <div className="kpi-icon" style={{ color: "var(--success)", marginBottom: 8, width: 40, height: 40 }}><CheckCircle2 size={20} /></div>
            <div className="kpi-label" style={{ fontSize: 10 }}>Total Terbayar</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{(metaCounts["PAID"] || 0) + (metaCounts["LUNAS"] || 0)}</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--warning)", "--kpi-bg": "var(--warning-bg)", padding: 16 } as any}>
            <div className="kpi-icon" style={{ color: "var(--warning)", marginBottom: 8, width: 40, height: 40 }}><TrendingUp size={20} /></div>
            <div className="kpi-label" style={{ fontSize: 10 }}>Rasio Bayar</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{totalData > 0 ? ((((metaCounts["PAID"] || 0) + (metaCounts["LUNAS"] || 0)) / totalData) * 100).toFixed(0) : 0}%</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--warning)", "--kpi-bg": "var(--warning-bg)", padding: 16 } as any}>
            <div className="kpi-icon" style={{ color: "var(--warning)", marginBottom: 8, width: 40, height: 40 }}><Clock size={20} /></div>
            <div className="kpi-label" style={{ fontSize: 10 }}>Menunggu Bayar</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{metaCounts["PENDING"] || 0}</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "#ef4444", "--kpi-bg": "rgba(239, 68, 68, 0.1)", padding: 16 } as any}>
            <div className="kpi-icon" style={{ color: "#ef4444", marginBottom: 8, width: 40, height: 40 }}><RotateCcw size={20} /></div>
            <div className="kpi-label" style={{ fontSize: 10 }}>Refunded</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{metaCounts["REFUNDED"] || 0}</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "#64748b", "--kpi-bg": "rgba(100, 116, 139, 0.1)", padding: 16 } as any}>
            <div className="kpi-icon" style={{ color: "#64748b", marginBottom: 8, width: 40, height: 40 }}><Trash2 size={20} /></div>
            <div className="kpi-label" style={{ fontSize: 10 }}>Cancelled</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{metaCounts["CANCELLED"] || 0}</div>
          </div>
        </div>
      </div>

      {/* Main Content (Table Style) */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 32px 32px', display: 'flex', flexDirection: 'column' }}>
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Table Toolbar */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ghost-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)' }}>
             <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="form-control form-control-sm" 
                    placeholder="Cari nama atau WA..." 
                    style={{ paddingLeft: 36, width: 240 }} 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* Estimasi Fee & CR untuk CS Login */}
                {!isSuper && (() => {
                  const myId = (session?.user as any)?.id;
                  const myStat = csStats.find(s => s.csId === myId) || { cr: '0%', fee: 0 };
                  return (
                    <div style={{ display: 'flex', gap: 8 }}>
                       <div style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)', padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'var(--shadow-sm)' }}>
                          <Wallet size={14} /> Fee Anda: {formatCurrency(myStat.fee)}
                       </div>
                       <div style={{ background: 'var(--surface-container-highest)', color: 'var(--on-surface)', padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800, border: '1px solid var(--ghost-border)' }}>
                          CR: {myStat.cr}
                       </div>
                    </div>
                  );
                })()}
             </div>
             
             <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <select 
                  className="form-control form-control-sm" 
                  style={{ width: 140, fontSize: 12 }}
                  value={activeStatus || ""}
                  onChange={(e) => {
                    setActiveStatus(e.target.value || null);
                    setPage(1);
                  }}
                >
                  <option value="">Semua Status</option>
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <span className="text-secondary" style={{ fontSize: 13 }}>Tampil <span style={{ fontWeight: 800 }}>{leads.length}</span> dari <span style={{ fontWeight: 800 }}>{totalData}</span> Data</span>
                {isSuper && (
                  <div style={{ background: 'var(--surface)', padding: '6px 14px', borderRadius: 10, fontSize: 11, border: '1px solid var(--ghost-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                     <TrendingUp size={14} color="var(--primary)" />
                     <span style={{ fontWeight: 700 }}>CR TIM:</span> {csStats.map(s => `${s.name.split(' ')[0]}: ${s.cr}`).join(' | ')}
                  </div>
                )}
             </div>
          </div>

          {/* Table Component */}
          <div className="table-wrapper" style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ minWidth: 1000 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? leads.map(l => l.id) : [])} checked={selectedIds.length === leads.length && leads.length > 0} /></th>
                  <th>NAMA SISWA</th>
                  <th>PROGRAM DIMINATI</th>
                  <th>STATUS</th>
                  <th>FOLLOW UP</th>
                  <th>PEMBAYARAN</th>
                  <th>DITUGASKAN</th>
                  <th>TGL LEAD</th>
                  <th>TGL CLOSING</th>
                  <th style={{ textAlign: 'right' }}>NOMINAL</th>
                  <th style={{ width: 80, textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={10}><div className="skeleton" style={{ height: 24 }} /></td></tr>
                  ))
                ) : leads.map(lead => (
                  <tr key={lead.id} className="table-row-hover">
                    <td><input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelect(lead.id)} /></td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--on-surface)' }}>{lead.nama}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MessageCircle size={10} /> {lead.whatsapp}</div>
                        {lead.sumber && (
                          <span style={{ background: 'var(--surface-container-highest)', padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontSize: 9, color: 'var(--primary)' }}>
                            {lead.sumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BookOpen size={14} color="var(--primary)" />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{lead.program?.nama || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                        <span className={`badge ${
                          (lead.status === 'PAID' || lead.status === 'LUNAS') ? 'badge-success' : 
                          lead.status === 'REFUNDED' ? 'badge-danger' :
                          lead.status === 'CANCELLED' ? 'badge-muted' :
                          lead.status === 'PENDING' ? 'badge-warning' : 
                          lead.status === 'FOLLOW_UP' ? 'badge-info' : 
                          'badge-muted'
                        }`}>
                          {
                            (lead.status === 'PAID' || lead.status === 'LUNAS') ? 'Selesai' : 
                            lead.status === 'REFUNDED' ? 'Refunded' :
                            lead.status === 'CANCELLED' ? 'Cancelled' :
                            lead.status === 'PENDING' ? 'Menunggu' : 
                            lead.status === 'FOLLOW_UP' ? 'Follow Up' : 
                            'Baru'
                          }
                        </span>
                    </td>
                    <td>
                       <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {[
                            { label: 'W', color: '#10b981', val: 1, title: 'Kirim Perkenalan', msg: `Halo *${lead.nama}*, perkenalkan kami dari Speaking Partner. Ada yang bisa kami bantu?` },
                            { label: '1', color: '#f59e0b', val: 2, title: 'Follow-up 1', msg: `Halo *${lead.nama}*, hanya mengingatkan kembali terkait program yang kemarin ditanyakan. Apakah sudah sempat dicek?` },
                            { label: '2', color: '#6366f1', val: 3, title: 'Follow-up 2', msg: `Halo *${lead.nama}*, kami masih menanti kabar baiknya ya. Jika ada kendala, jangan sungkan tanya kami.` },
                            { label: '3', color: '#f97316', val: 4, title: 'Follow-up 3', msg: `Kesempatan terakhir nih *${lead.nama}* untuk amankan kursinya sebelum penuh!` },
                            { label: '4', color: '#ef4444', val: 5, title: 'Follow-up 4', msg: `Halo *${lead.nama}*, sepertinya Anda masih sibuk ya. Kami ijin tutup tiket konsultasinya ya, sampai jumpa di lain waktu!` },
                          ].map((b, i) => {
                            const count = lead.followUpCount || 0;
                            const isLit = count >= b.val;
                            return (
                              <button 
                                key={i} 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  window.open(`https://wa.me/${lead.whatsapp}?text=${encodeURIComponent(b.msg)}`, "_blank");
                                  
                                  // Optimistic Set Level 🎯
                                  setLeads(prev => prev.map(l => 
                                    l.id === lead.id 
                                      ? { ...l, followUpCount: b.val, status: l.status === "NEW" ? "FOLLOW_UP" : l.status } 
                                      : l
                                  ));

                                  try {
                                    await fetch("/api/crm", {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ 
                                        id: lead.id, 
                                        setFollowUp: b.val, // Ganti increment jadi set
                                        status: lead.status === "NEW" ? "FOLLOW_UP" : undefined
                                      }),
                                    });
                                  } catch (err) {
                                    fetchData();
                                  }
                                }}
                                title={b.title}
                                style={{ 
                                  width: 26, height: 26, 
                                  borderRadius: 'var(--radius-full)', 
                                  border: isLit ? `2px solid ${b.color}` : '1px solid var(--ghost-border)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 10, fontWeight: 900,
                                  background: isLit ? b.color : 'var(--surface-container-low)',
                                  color: isLit ? 'white' : 'var(--text-muted)',
                                  cursor: 'pointer',
                                  transition: 'all 200ms ease',
                                  transform: isLit ? 'scale(1.15)' : 'scale(1)',
                                  boxShadow: isLit ? `0 4px 12px ${b.color}55` : 'none',
                                  zIndex: isLit ? 2 : 1
                                }}
                              >
                                {b.label}
                              </button>
                            );
                          })}
                       </div>
                    </td>
                    <td>
                        <span className={`badge ${(lead.status === 'PAID' || lead.status === 'LUNAS') ? 'badge-success' : 'badge-danger'}`} style={{ opacity: 0.8 }}>
                          {(lead.status === 'PAID' || lead.status === 'LUNAS') ? 'PAID' : 'UNPAID'}
                        </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 'var(--radius-full)', background: 'var(--primary-bg)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                          {(lead.cs?.name || 'A')[0]}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{lead.cs?.name || 'Admin'}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatDate(lead.tanggalLead ?? lead.createdAt)}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {lead.tanggalClosing
                        ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>{formatDate(lead.tanggalClosing)}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                      {formatCurrency(lead.nominalTagihan || 0)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                         {!isReadOnly && (
                           <div style={{ display: 'flex', gap: 6 }}>
                             {lead.status === "NEW" && (
                               <button className="btn btn-secondary btn-icon" style={{ width: 32, height: 32, padding: 0, color: 'var(--primary)' }} onClick={() => ubahStatus(lead.id, "FOLLOW_UP")} title="Pindahkan ke Follow Up">
                                 <ArrowRight size={14} />
                               </button>
                             )}
                             {lead.status === "FOLLOW_UP" && (
                               <button className="btn btn-secondary btn-icon" style={{ width: 32, height: 32, padding: 0, color: 'var(--warning)' }} onClick={() => ubahStatus(lead.id, "PENDING")} title="Pindahkan ke Menunggu Bayar">
                                 <Clock size={14} />
                               </button>
                             )}
                             {lead.status === "PENDING" && (
                               <button className="btn btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => handleLunasClick(lead)}>Lunas</button>
                             )}
                           </div>
                         )}

                         <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-secondary btn-icon" style={{ width: 30, height: 30, padding: 0, color: 'var(--primary)', marginRight: 6 }} title="Cetak Invoice" onClick={(e) => { e.stopPropagation(); window.open('/invoice/'+lead.id, '_blank'); }}><FileText size={14} /></button><button className="btn btn-secondary btn-icon" style={{ width: 30, height: 30, padding: 0, marginRight: 6 }} onClick={() => { setSelectedEditLead(lead); setShowEditModal(true); }} title="Edit Lead">
                               <Edit size={14} />
                            </button>
                            {canDelete && (
                               <button className="btn btn-secondary btn-icon" style={{ width: 30, height: 30, padding: 0, color: 'var(--danger)' }} onClick={() => {
                                 if(confirm('Hapus lead ini?')) { 
                                    setLoading(true);
                                    fetch("/api/crm", {
                                      method: "DELETE",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ ids: [lead.id] })
                                    }).then(() => fetchData());
                                 }
                               }}><Trash2 size={14} /></button>
                            )}
                         </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && leads.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: 48, textAlign: 'center' }}>
                      <Users size={48} color="var(--ghost-border)" style={{ marginBottom: 12 }} />
                      <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Belum ada data prospect</div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mulai tambahkan atau import lead baru.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--ghost-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Baris per halaman:</span>
                <select 
                  className="form-control form-control-sm" 
                  style={{ width: 80 }}
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                   Halaman <span style={{ fontWeight: 800, color: 'var(--on-surface)' }}>{page}</span> dari <span style={{ fontWeight: 800, color: 'var(--on-surface)' }}>{totalPages}</span>
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                   <button 
                     className="btn btn-secondary btn-sm" 
                     disabled={page <= 1 || loading}
                     onClick={() => setPage(prev => prev - 1)}
                     style={{ padding: '4px 12px' }}
                   >
                     Sebelumnya
                   </button>
                   <button 
                     className="btn btn-secondary btn-sm" 
                     disabled={page >= totalPages || loading}
                     onClick={() => setPage(prev => prev + 1)}
                     style={{ padding: '4px 12px' }}
                   >
                     Selanjutnya
                   </button>
                </div>
             </div>
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
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: -10, marginBottom: 15 }}>
                       <input 
                         type="checkbox" 
                         id="newLeadRO" 
                         style={{ width: 18, height: 18, cursor: 'pointer' }}
                         checked={newLeadForm.isRO}
                         onChange={(e) => setNewLeadForm({ ...newLeadForm, isRO: e.target.checked })}
                       />
                       <label htmlFor="newLeadRO" style={{ fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--primary)' }}>Repeat Order (RO)</label>
                    </div>
                    <div className="form-group">
                       <label className="form-label">Sumber Lead</label>
                       <select className="form-control" value={newLeadForm.sumber} onChange={(e) => setNewLeadForm({ ...newLeadForm, sumber: e.target.value })}>
                         <option value="MANUAL">MANUAL (Input Langsung)</option>
                         <option value="SOSMED">SOSMED</option>
                         <option value="REGULAR">REGULAR</option>
                       </select>
                    </div>
                    <div className="form-group">
                       <label className="form-label">Preferensi Jadwal (Opsional)</label>
                      <input type="text" className="form-control" placeholder="Cth: Malam hari jam 19.00" value={newLeadForm.preferensiJadwal} onChange={(e) => setNewLeadForm({ ...newLeadForm, preferensiJadwal: e.target.value })} />
                   </div>
                   <div className="form-group">
                      <label className="form-label required">Tanggal Lead Masuk</label>
                      <input type="date" className="form-control" value={newLeadForm.tanggalLead} onChange={(e) => setNewLeadForm({ ...newLeadForm, tanggalLead: e.target.value })} required />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Default hari ini. Ubah jika lead masuk di hari sebelumnya.</div>
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
                   <button type="button" className="btn btn-secondary" onClick={() => setShowConvertModal(false)} disabled={convertingLead}>Batal</button>
                   <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={convertingLead}>
                     {convertingLead ? "Memproses..." : "Sudah Bayar & Jadikan Siswa"}
                   </button>
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
                        <button className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: 11 }} onClick={async () => {
                          window.open(`https://wa.me/${selectedChatLead.whatsapp}?text=${encodeURIComponent(message)}`, "_blank");
                          
                          // INCREMENT FOLLOW UP LOGIC 📊
                          await fetch("/api/crm", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ 
                              id: selectedChatLead.id, 
                              incrementFollowUp: true,
                              status: selectedChatLead.status === "NEW" ? "FOLLOW_UP" : undefined
                            }),
                          });

                          fetchData();
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
      {/* Modal Import CSV */}
      {showImportModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowImportModal(false); }}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Upload size={20} style={{ color: 'var(--primary)' }} />
                <span>Import Data Leads via CSV</span>
              </div>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Gunakan format CSV berikut untuk mengimpor data masal calon siswa.
                </p>
                <div style={{ background: 'var(--surface-container-low)', padding: 12, borderRadius: 8, fontSize: 11, fontFamily: 'monospace', overflowX: 'auto', border: '1px solid var(--ghost-border)' }}>
                  nama,whatsapp,program,preferensi,tanggal
                </div>
                <button 
                  className="btn btn-sm" 
                  style={{ marginTop: 8, fontSize: 11, color: 'var(--primary)', textDecoration: 'underline', padding: 0, background: 'none' }}
                  onClick={() => {
                    const csvContent = "nama,whatsapp,program,preferensi,tanggal\n" +
                                     "Ahmad Fauzi,081234567890,REGULAR 1 BULAN,Malam hari,2024-03-20\n" +
                                     "Linda Sari,089988776655,IELTS PREPARATION,Pagi hari,2024-03-21";
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", "template_leads.csv");
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  📥 Download Template CSV
                </button>
              </div>
              
              <div style={{ border: '2px dashed var(--ghost-border)', borderRadius: 12, padding: 32, textAlign: 'center', background: 'var(--surface-container-lowest)' }}>
                <FileSpreadsheet size={32} style={{ color: 'var(--primary)', marginBottom: 12 }} />
                <div style={{ marginBottom: 16 }}>
                  <label className="btn btn-primary" style={{ cursor: 'pointer', borderRadius: 'var(--radius-full)', padding: '10px 24px' }}>
                    <Upload size={16} /> Pilih File CSV
                    <input type="file" accept=".csv" style={{ display: 'none' }} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        const text = event.target?.result as string;
                        Papa.parse(text, {
                          header: true,
                          skipEmptyLines: true,
                          complete: async (results) => {
                            const jsonData = results.data;
                            if (jsonData.length === 0) {
                              alert("File CSV kosong atau tidak valid.");
                              return;
                            }
                            
                            if (confirm(`Impor ${jsonData.length} data calon siswa?`)) {
                              setLoading(true);
                              try {
                                const res = await fetch("/api/crm/import", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(jsonData)
                                });
                                if (res.ok) {
                                  alert("Berhasil mengimpor data leads!");
                                  setShowImportModal(false);
                                  fetchData();
                                } else {
                                  const err = await res.json();
                                  alert("Gagal impor: " + (err.error || "Cek format file"));
                                }
                              } catch (err) {
                                alert("Terjadi kesalahan saat mengunggah.");
                              } finally {
                                setLoading(false);
                              }
                            }
                          }
                        });
                      };
                      reader.readAsText(file);
                    }} />
                  </label>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Maksimal 2MB .csv | Format UTF-8</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
      {/* EDIT LEAD MODAL */}
      {showEditModal && selectedEditLead && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Edit Data Siswa</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleEditSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Siswa</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={selectedEditLead.nama}
                    onChange={(e) => setSelectedEditLead({ ...selectedEditLead, nama: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={selectedEditLead.whatsapp}
                    onChange={(e) => setSelectedEditLead({ ...selectedEditLead, whatsapp: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Program</label>
                  <select 
                    className="form-control"
                    value={selectedEditLead.programId || ""}
                    onChange={(e) => setSelectedEditLead({ ...selectedEditLead, programId: e.target.value })}
                  >
                    <option value="">Pilih Program</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status CRM</label>
                  <select 
                    className="form-control"
                    value={selectedEditLead.status || ""}
                    onChange={(e) => setSelectedEditLead({ ...selectedEditLead, status: e.target.value })}
                  >
                    <option value="NEW">Baru</option>
                    <option value="FOLLOW_UP">Follow Up</option>
                    <option value="PENDING">Menunggu Bayar</option>
                    <option value="PAID">Lunas (Selesai)</option>
                    <option value="REFUNDED">Refunded</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sumber Lead</label>
                  <select 
                    className="form-control"
                    value={selectedEditLead.sumber || ""}
                    onChange={(e) => setSelectedEditLead({ ...selectedEditLead, sumber: e.target.value })}
                  >
                    <option value="">(Tanpa Sumber)</option>
                    <option value="REGULAR">REGULAR</option>
                    <option value="SOSMED">SOSMED</option>
                    <option value="RO">RO</option>
                    <option value="MANUAL">MANUAL</option>
                    <option value="IMPORT">IMPORT</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <input 
                    type="checkbox" 
                    id="editLeadRO" 
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                    checked={selectedEditLead.isRO || false}
                    onChange={(e) => setSelectedEditLead({ ...selectedEditLead, isRO: e.target.checked })}
                  />
                  <label htmlFor="editLeadRO" style={{ fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'var(--primary)' }}>Repeat Order (RO)</label>
                </div>
                <div className="form-group">
                  <label className="form-label">Keterangan / Catatan</label>
                  <textarea 
                    className="form-control" 
                    rows={3}
                    value={selectedEditLead.keterangan || ""}
                    onChange={(e) => setSelectedEditLead({ ...selectedEditLead, keterangan: e.target.value })}
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">📅 Tanggal Lead Masuk</label>
                    <input
                      type="date"
                      className="form-control"
                      value={selectedEditLead.tanggalLead ? selectedEditLead.tanggalLead.slice(0, 10) : ""}
                      onChange={(e) => setSelectedEditLead({ ...selectedEditLead, tanggalLead: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">🏆 Tanggal Closing</label>
                    <input
                      type="date"
                      className="form-control"
                      value={selectedEditLead.tanggalClosing ? selectedEditLead.tanggalClosing.slice(0, 10) : ""}
                      onChange={(e) => setSelectedEditLead({ ...selectedEditLead, tanggalClosing: e.target.value })}
                    />
                    {selectedEditLead.tanggalClosing && (
                      <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>✓ Auto-terisi saat status berubah ke PAID</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL BAGIKAN LINK */}
      {showShareLinksModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowShareLinksModal(false); }}>
          <div className="modal" style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <div className="modal-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Share2 size={20} style={{ color: 'var(--primary)' }} />
                  <span>Salin Link Pendaftaran</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowShareLinksModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                Gunakan link khusus di bawah ini untuk memastikan Lead masuk ke tim CS yang tepat secara otomatis.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: "Link Jalur REGULAR", team: "", color: "var(--primary)" },
                  { label: "Link Jalur SOSMED (Viral)", team: "SOSMED", color: "#ec4899" },
                  { label: "Link Jalur RO (Repeat Order)", team: "RO", color: "#8b5cf6" },
                  { label: "Link Jalur AFFILIATE", team: "AFFILIATE", color: "#10b981" },
                  { label: "Link Jalur TES TOEFL", team: "TOEFL", color: "#f59e0b" },
                  { label: "Link Jalur KELAS LIVE", team: "LIVE", color: "#ef4444" },
                ].map((link, idx) => {
                  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                  const fullUrl = `${baseUrl}/register${link.team ? `?team=${link.team}` : ''}`;
                  
                  return (
                    <div key={idx} className="glass" style={{ padding: 16, borderRadius: 12, border: '1px solid var(--ghost-border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: link.color, textTransform: 'uppercase', marginBottom: 8 }}>{link.label}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input 
                          readOnly 
                          className="form-control" 
                          style={{ fontSize: 12, height: 36, flex: 1, background: 'var(--surface-container-low)' }} 
                           value={fullUrl} 
                        />
                        <button 
                          className="btn btn-sm btn-primary"
                          style={{ padding: '0 12px' }}
                          onClick={() => {
                            navigator.clipboard.writeText(fullUrl);
                            alert(`${link.label} berhasil disalin!`);
                          }}
                        >
                          Salin
                        </button>
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
