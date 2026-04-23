"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { 
  Download, 
  Upload, 
  Trash2, 
  Plus, 
  Filter, 
  Search, 
  Edit3, 
  Wallet, 
  TrendingUp, 
  History,
  FileText,
  X,
  CreditCard,
  Banknote,
  QrCode,
  RefreshCw,
  FileSpreadsheet
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, SUPER_ROLES } from "@/lib/utils";
import Papa from "papaparse";

interface Pemasukan {
  id: string;
  tanggal: string;
  hargaNormal: number;
  diskon: number;
  hargaFinal: number;
  metodeBayar: string;
  keterangan: string;
  siswa?: { nama: string; noSiswa: string };
  program?: { nama: string; tipe: string };
  cs?: { name: string };
  talent?: { name: string };
  invoice?: { noInvoice: string };
  isRO: boolean;
  talentId?: string;
}

const METODE_BAYAR = ["CASH", "TRANSFER", "QRIS"];

export default function PemasukanPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [data, setData] = useState<Pemasukan[]>([]);
  const [summary, setSummary] = useState({ totalPemasukan: 0, totalDiskon: 0, jumlahTransaksi: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [siswaDrop, setSiswaDrop] = useState<any[]>([]);
  const [csList, setCsList] = useState<any[]>([]);
  const [talentList, setTalentList] = useState<any[]>([]);
  const [filter, setFilter] = useState({ from: "", to: "", csId: "", programId: "", metodeBayar: "" });
  const [form, setForm] = useState({
    siswaId: "", programId: "", csId: "", talentId: "", hargaNormal: "", diskon: "0",
    hargaFinal: "", metodeBayar: "CASH", keterangan: "", isRO: false,
    tanggal: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const emptyForm = {
    siswaId: "", programId: "", csId: "", talentId: "", hargaNormal: "",
    diskon: "0", hargaFinal: "", metodeBayar: "CASH", keterangan: "",
    isRO: false, tanggal: new Date().toISOString().slice(0, 10)
  };

  const role = (session?.user as any)?.role?.toUpperCase();
  const isAdmin = SUPER_ROLES.includes(role);
  const userId = (session?.user as any)?.id;
  const isCS = role === "CS";
  const teamType = (session?.user as any)?.teamType || "";
  const isCSLive = isCS && teamType === "CS_LIVE";

  function fetchData() {
    if (sessionStatus === "loading") return;
    
    const params = new URLSearchParams();
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to + "T23:59:59");
    
    if (isCS && userId) {
      params.set("csId", userId);
    } else if (filter.csId) {
      params.set("csId", filter.csId);
    }
    
    if (filter.programId) params.set("programId", filter.programId);
    if (filter.metodeBayar) params.set("metodeBayar", filter.metodeBayar);
    params.set("limit", "100");

    setLoading(true);
    fetch(`/api/pemasukan?${params}`)
      .then((r) => r.json())
      .then((d) => { 
        setData(d.data ?? []); 
        setSummary(d.summary ?? { totalPemasukan: 0, totalDiskon: 0, jumlahTransaksi: 0 }); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { 
    if (sessionStatus !== "loading") {
      fetchData(); 
    }
  }, [filter, sessionStatus, userId]);

  useEffect(() => {
    fetch("/api/program").then(r => r.json()).then(d => setPrograms(d)).catch(() => {});
    fetch("/api/siswa?limit=500").then(r => r.json()).then(d => setSiswaDrop(d.data ?? [])).catch(() => {});
    fetch("/api/users?role=CS").then(r => r.json()).then(d => setCsList(d)).catch(() => {});
    fetch("/api/users").then(r => r.json()).then(d => {
      setTalentList(d.filter((u: any) => u.role !== "CS" && u.role !== "PENGAJAR"));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const normal = parseFloat(form.hargaNormal) || 0;
    const diskon = parseFloat(form.diskon) || 0;
    setForm(f => ({ ...f, hargaFinal: String(Math.max(0, normal - diskon)) }));
  }, [form.hargaNormal, form.diskon]);

  function openAddModal() {
    setEditId(null);
    setForm({ ...emptyForm, csId: isCS ? (userId ?? "") : "" });
    setShowModal(true);
  }

  function openEditModal(item: Pemasukan) {
    setEditId(item.id);
    setForm({
      siswaId: (item as any).siswaId ?? "",
      programId: (item as any).programId ?? "",
      csId: (item as any).csId ?? "",
      hargaNormal: String(item.hargaNormal),
      diskon: String(item.diskon),
      hargaFinal: String(item.hargaFinal),
      metodeBayar: item.metodeBayar,
      keterangan: item.keterangan ?? "",
      isRO: item.isRO || false,
      talentId: item.talentId || "",
      tanggal: item.tanggal.slice(0, 10),
    });
    setShowModal(true);
  }

  async function handleDelete(item: Pemasukan) {
    if (!confirm(`Hapus transaksi ${item.invoice?.noInvoice ?? ""} ?`)) return;
    const res = await fetch(`/api/pemasukan/${item.id}`, { method: "DELETE" });
    if (res.ok) fetchData();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      hargaNormal: parseFloat(form.hargaNormal),
      diskon: parseFloat(form.diskon),
      hargaFinal: parseFloat(form.hargaFinal),
    };
    const res = await fetch(editId ? `/api/pemasukan/${editId}` : "/api/pemasukan", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setSaving(false);
      setShowModal(false);
      fetchData();
    } else {
      setSaving(false);
      alert("Gagal menyimpan data.");
    }
  }


  async function handleDeleteAll() {
    if (role !== "ADMIN") return;
    const conf = prompt("⚠️ PERINGATAN KERAS: Seluruh data PEMASUKAN dan INVOICE akan dihapus permanen.\n\nTindakan ini tidak bisa dibatalkan.\n\nKetik 'HAPUS' (huruf besar) untuk mengonfirmasi:");
    if (conf === "HAPUS") {
      setLoading(true);
      const res = await fetch("/api/pemasukan?all=true", { method: "DELETE" });
      if (res.ok) fetchData();
      else alert("Gagal menghapus.");
      setLoading(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Hapus ${selectedIds.length} pemasukan terpilih beserta invoice terkait secara permanen?`)) return;
    
    setLoading(true);
    const res = await fetch("/api/pemasukan", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds })
    });
    
    if (res.ok) {
      alert("Pemasukan terpilih berhasil dihapus.");
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

  function handleSelectAll() {
    if (selectedIds.length === data.length) setSelectedIds([]);
    else setSelectedIds(data.map(item => item.id));
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "TRANSFER": return <CreditCard size={14} />;
      case "QRIS": return <QrCode size={14} />;
      default: return <Banknote size={14} />;
    }
  };

  return (
    <div className="page-container" style={{ display: "flex", flexDirection: "column", height: "100vh", paddingBottom: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 32, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <Wallet size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Financial Management</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4 }}>Data Pemasukan</h1>
          <p className="text-muted">Kelola seluruh arus kas masuk, invoice, dan bonus tim.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
             {role === "ADMIN" && (
                <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleDeleteAll}>
                  <Trash2 size={14} /> Hapus Semua
                </button>
             )}
             {selectedIds.length > 0 && (
                <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleBulkDelete}>
                  <Trash2 size={14} /> Hapus ({selectedIds.length})
                </button>
             )}
             {role !== "PENGAJAR" && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowImportModal(true)} style={{ borderRadius: 'var(--radius-full)' }}>
                    <FileSpreadsheet size={16} /> Import CSV
                  </button>
                  <button className="btn btn-primary" onClick={openAddModal} style={{ borderRadius: 'var(--radius-full)' }}><Plus size={18} /> Tambah Transaksi</button>
                </div>
             )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {/* Summary Cards */}
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <div className="kpi-card" style={{ "--kpi-color": "#10b981", "--kpi-bg": "rgba(16,185,129,0.1)" } as any}>
            <div className="kpi-label">Total Pemasukan</div>
            <div className="kpi-value">{formatCurrency(summary.totalPemasukan)}</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "#f59e0b", "--kpi-bg": "rgba(245,158,11,0.1)" } as any}>
            <div className="kpi-label">Transaksi</div>
            <div className="kpi-value">{summary.jumlahTransaksi} <span style={{ fontSize: 12 }}>trx</span></div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="card glass" style={{ marginBottom: 24, padding: 16 }}>
           <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                 <Filter size={16} className="text-muted" />
                 <input type="date" className="form-control" value={filter.from} onChange={e => setFilter(f => ({ ...f, from: e.target.value }))} />
                 <span>→</span>
                 <input type="date" className="form-control" value={filter.to} onChange={e => setFilter(f => ({ ...f, to: e.target.value }))} />
              </div>
              <select className="form-control" style={{ width: 200 }} value={filter.programId} onChange={e => setFilter(f => ({ ...f, programId: e.target.value }))}>
                 <option value="">Semua Program</option>
                 {programs.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={() => setFilter({ from: "", to: "", csId: "", programId: "", metodeBayar: "" })}><RefreshCw size={14} /> Reset</button>
           </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table className="table-modern">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                   <input type="checkbox" checked={selectedIds.length === data.length && data.length > 0} onChange={handleSelectAll} />
                </th>
                <th>TANGGAL</th>
                <th>SISWA</th>
                <th>PROGRAM</th>
                <th>TIPE / TALENT</th>
                <th>CS</th>
                <th>METODE</th>
                <th style={{ textAlign: 'right' }}>NOMINAL</th>
                <th style={{ textAlign: 'center' }}>NO. INVOICE</th>
                <th style={{ textAlign: 'right' }}>OPSI</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center" style={{ padding: 40 }}>Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={11} className="text-center" style={{ padding: 40 }}>Belum ada data pemasukan.</td></tr>
              ) : data.map(item => (
                <tr key={item.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(item.tanggal, "dd/MM/yyyy")}</td>
                  <td>
                    <div style={{ fontWeight: 800 }}>{item.siswa?.nama || "Umum"}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.siswa?.noSiswa}</div>
                  </td>
                  <td><span className="badge badge-muted">{item.program?.nama || "—"}</span></td>
                  <td>
                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {item.isRO && <span className="badge badge-success" style={{ fontSize: 9 }}>RO</span>}
                        {item.talent && <span className="badge badge-info" style={{ fontSize: 9 }}>T: {item.talent.name}</span>}
                     </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{item.cs?.name || "—"}</td>
                  <td>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        {getMethodIcon(item.metodeBayar)}
                        {item.metodeBayar}
                     </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(item.hargaFinal)}</td>
                  <td style={{ textAlign: 'center' }}>
                     <code style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>{item.invoice?.noInvoice || "—"}</code>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                       <button className="btn btn-secondary btn-icon" onClick={() => openEditModal(item)}><Edit3 size={14} /></button>
                       {role === "ADMIN" && <button className="btn btn-secondary btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(item)}><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ width: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
               <div className="modal-title">{editId ? "Ubah Data Pemasukan" : "Catat Pemasukan Baru"}</div>
               <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
               <div className="modal-body">
                  <div className="form-grid-2">
                     <div className="form-group">
                        <label className="form-label">Siswa</label>
                        <select className="form-control" value={form.siswaId} onChange={e => setForm(f => ({ ...f, siswaId: e.target.value }))}>
                          <option value="">Pilih Siswa</option>
                          {siswaDrop.map((s: any) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                        </select>
                     </div>
                     <div className="form-group">
                        <label className="form-label">Program</label>
                        <select className="form-control" value={form.programId} onChange={e => setForm(f => ({ ...f, programId: e.target.value }))}>
                          <option value="">Pilih Program</option>
                          {programs.map((p: any) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                        </select>
                     </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                        <input type="checkbox" checked={form.isRO} onChange={e => setForm(f => ({ ...f, isRO: e.target.checked }))} style={{ width: 20, height: 20 }} />
                        Repeat Order (RO)
                      </label>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— Beri tanda jika pendaftaran ulang siswa lama</span>
                  </div>

                  {(isCSLive || role === "ADMIN") && (
                     <div className="form-group" style={{ marginBottom: 20 }}>
                        <label className="form-label required">Penautan Talent</label>
                        <select className="form-control" value={form.talentId} onChange={e => setForm(f => ({ ...f, talentId: e.target.value }))} required={isCSLive}>
                          <option value="">Pilih Talent yang bertugas</option>
                          {talentList.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                     </div>
                  )}

                  <div className="form-grid-3">
                     <div className="form-group">
                        <label className="form-label required">Harga Normal</label>
                        <input type="number" className="form-control" value={form.hargaNormal} onChange={e => setForm(f => ({ ...f, hargaNormal: e.target.value }))} required />
                     </div>
                     <div className="form-group">
                        <label className="form-label">Diskon</label>
                        <input type="number" className="form-control" value={form.diskon} onChange={e => setForm(f => ({ ...f, diskon: e.target.value }))} />
                     </div>
                     <div className="form-group">
                        <label className="form-label">Total Terima</label>
                        <input type="number" className="form-control" value={form.hargaFinal} disabled style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', fontWeight: 800 }} />
                     </div>
                  </div>

                  <div className="form-grid-2">
                     <div className="form-group">
                        <label className="form-label required">Metode</label>
                        <select className="form-control" value={form.metodeBayar} onChange={e => setForm(f => ({ ...f, metodeBayar: e.target.value }))}>
                          {METODE_BAYAR.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                     </div>
                     <div className="form-group">
                        <label className="form-label required">Tanggal</label>
                        <input type="date" className="form-control" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} required />
                     </div>
                  </div>
               </div>
               <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? "Saving..." : "Simpan & Buat Invoice"}</button>
               </div>
            </form>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .table-modern td { padding: 12px 16px; vertical-align: middle; }
        .badge-success { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
        .badge-info { background: rgba(59,130,246,0.1); color: #3b82f6; border: 1px solid rgba(59,130,246,0.2); }
      `}</style>
      {/* Modal Import CSV */}
      {showImportModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowImportModal(false); }}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Upload size={20} style={{ color: 'var(--primary)' }} />
                <span>Import Data Pemasukan via CSV</span>
              </div>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Gunakan format CSV berikut untuk mengimpor transaksi masal.
                </p>
                <div style={{ background: 'var(--surface-container-low)', padding: 12, borderRadius: 8, fontSize: 11, fontFamily: 'monospace', overflowX: 'auto', border: '1px solid var(--ghost-border)' }}>
                  tanggal,nama_siswa,program,harga_normal,diskon,metode,nama_cs,ro,keterangan
                </div>
                <button 
                  className="btn btn-sm" 
                  style={{ marginTop: 8, fontSize: 11, color: 'var(--primary)', textDecoration: 'underline', padding: 0, background: 'none' }}
                  onClick={() => {
                    const csvContent = "tanggal,nama_siswa,program,harga_normal,diskon,metode,nama_cs,ro,keterangan\n" +
                                     "2024-02-15,Budi Santoso,REGULAR 1 BULAN,1500000,100000,TRANSFER,Adinda,0,Bayar Lunas\n" +
                                     "2024-02-16,Siska Putri,IELTS PREPARATION,2500000,0,QRIS,Lisa,1,Pendaftaran Baru";
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", "template_pemasukan.csv");
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
                    <Upload size={16} /> {csvLoading ? "Memproses..." : "Pilih File CSV"}
                    <input type="file" accept=".csv" style={{ display: 'none' }} disabled={csvLoading} onChange={async (e) => {
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

                        if (confirm(`Impor ${jsonData.length} data transaksi?`)) {
                          setCsvLoading(true);
                          try {
                            const res = await fetch("/api/pemasukan/import", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(jsonData)
                            });
                            if (res.ok) {
                              alert("Berhasil mengimpor data pemasukan!");
                              setShowImportModal(false);
                              fetchData();
                            } else {
                              const err = await res.json();
                              alert("Gagal impor: " + err.error);
                            }
                          } catch (err) {
                            alert("Terjadi kesalahan saat mengunggah.");
                          } finally {
                            setCsvLoading(false);
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
    </div>
  );
}
