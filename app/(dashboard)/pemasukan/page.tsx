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
  RefreshCw
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

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
  invoice?: { noInvoice: string };
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
  const [filter, setFilter] = useState({ from: "", to: "", csId: "", programId: "", metodeBayar: "" });
  const [form, setForm] = useState({
    siswaId: "", programId: "", csId: "", hargaNormal: "", diskon: "0",
    hargaFinal: "", metodeBayar: "CASH", keterangan: "", tanggal: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const emptyForm = { siswaId: "", programId: "", csId: "", hargaNormal: "", diskon: "0", hargaFinal: "", metodeBayar: "CASH", keterangan: "", tanggal: new Date().toISOString().slice(0, 10) };

  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const isCS = role === "CS";

  function fetchData() {
    if (sessionStatus === "loading") return; // Tunggu session siap
    
    const params = new URLSearchParams();
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to + "T23:59:59");
    
    // Prioritas: Jika CS, kunci csId. Jika Admin, biarkan filter csId bekerja.
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
      .then((d) => { setData(d.data ?? []); setSummary(d.summary ?? {}); setLoading(false); });
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
    }
  }

  // ── CSV & Bulk Operations ──
  function downloadCsvTemplate() {
    const header = "Tanggal(YYYY-MM-DD),Nama Siswa,Nama Program,Harga Normal,Diskon,Metode(CASH/TRANSFER/QRIS),Keterangan\n";
    const examples = "2024-01-20,Budi Sudarsono,TOEFL Preparation,1500000,100000,TRANSFER,Lunas\n2024-01-21,Siti Aminah,General English,800000,0,CASH,DP Awal\n";
    const notes = "\n# Catatan:\n# 1. Tanggal format YYYY-MM-DD\n# 2. Jika Siswa belum ada di database, sistem akan otomatis membuatnya\n# 3. Nama Program harus mirip dengan yang ada di sistem\n# 4. Metode pilih salah satu: CASH, TRANSFER, atau QRIS";
    
    const blob = new Blob([header + examples + notes], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_pemasukan.csv";
    a.click();
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim() && !l.startsWith("#"));
      const dataRows = lines.slice(1); // skip header

      let successCount = 0;
      for (const row of dataRows) {
        const [tanggal, namaSiswa, namaProgram, hargaNormal, diskon, metode, keterangan] = row.split(",").map(s => s.trim());
        if (!namaSiswa) continue;

        // Cari programId berdasarkan nama (opsional, jika tidak ketemu biarkan null)
        const prog = programs.find((p: any) => p.nama.toLowerCase() === namaProgram.toLowerCase());

        try {
          await fetch("/api/pemasukan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tanggal,
              namaSiswa,
              programId: prog?.id || "",
              csId: isCS ? (userId ?? "") : "",
              hargaNormal: parseFloat(hargaNormal) || 0,
              diskon: parseFloat(diskon) || 0,
              metodeBayar: ["CASH", "TRANSFER", "QRIS"].includes(metode?.toUpperCase()) ? metode.toUpperCase() : "CASH",
              keterangan: keterangan || "Import CSV"
            })
          });
          successCount++;
        } catch (err) {
          console.error("Failed to import row:", row);
        }
      }

      alert(`Berhasil mengimpor ${successCount} data pemasukan.`);
      setCsvLoading(false);
      fetchData();
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsText(file);
  }

  async function handleDeleteAll() {
    if (role !== "ADMIN") return;
    if (!confirm("⚠️ PERINGATAN KRITIS: Anda akan menghapus SELURUH data pemasukan dan invoice terkait. Tindakan ini tidak dapat dibatalkan. Lanjutkan?")) return;
    if (!confirm("Konfirmasi sekali lagi: Hapus SEMUA data?")) return;

    setLoading(true);
    const res = await fetch("/api/pemasukan/delete-all", { method: "DELETE" });
    if (res.ok) {
      alert("Seluruh data telah dibersihkan.");
      fetchData();
    } else {
      alert("Gagal menghapus data.");
    }
    setLoading(false);
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "TRANSFER":
        return <CreditCard size={14} />;
      case "QRIS":
        return <QrCode size={14} />;
      default:
        return <Banknote size={14} />;
    }
  };

  return (
    <div className="page-container" style={{ display: "flex", flexDirection: "column", height: "100vh", paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <Wallet size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Financial Management</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Data Pemasukan</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
           {role !== "PENGAJAR" && (
             <>
               <button className="btn btn-secondary btn-sm" onClick={downloadCsvTemplate} title="Download Template CSV" style={{ borderRadius: 'var(--radius-full)' }}>
                 <Download size={14} /> Template
               </button>
               
               <button 
                 className="btn btn-secondary btn-sm" 
                 onClick={() => fileRef.current?.click()} 
                 disabled={csvLoading}
                 style={{ borderRadius: 'var(--radius-full)' }}
               >
                 <Upload size={14} /> {csvLoading ? "Importing..." : "Import CSV"}
               </button>
               <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCsvImport} />

               {role === "ADMIN" && data.length > 0 && (
                 <button className="btn btn-sm" onClick={handleDeleteAll} style={{ borderRadius: 'var(--radius-full)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                   <Trash2 size={14} /> Hapus Semua
                 </button>
               )}

               <div style={{ width: 1, height: 24, background: 'var(--border-default)', margin: '0 4px' }} />

               <button className="btn btn-primary" onClick={openAddModal} style={{ borderRadius: 'var(--radius-full)' }}>
                 <Plus size={18} /> Tambah Transaksi
               </button>
             </>
           )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
      {/* Summary Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card" style={{ "--kpi-color": "#10b981", "--kpi-bg": "rgba(16,185,129,0.1)" } as any}>
          <div className="kpi-icon" style={{ color: "#10b981" }}><TrendingUp size={24} /></div>
          <div className="kpi-label">Total Pemasukan</div>
          <div className="kpi-value">{formatCurrency(summary.totalPemasukan)}</div>
        </div>
        <div className="kpi-card" style={{ "--kpi-color": "#f59e0b", "--kpi-bg": "rgba(245,158,11,0.1)" } as any}>
          <div className="kpi-icon" style={{ color: "#f59e0b" }}><FileText size={24} /></div>
          <div className="kpi-label">Potongan & Diskon</div>
          <div className="kpi-value">{formatCurrency(summary.totalDiskon)}</div>
        </div>
        <div className="kpi-card" style={{ "--kpi-color": "#3b82f6", "--kpi-bg": "rgba(59,130,246,0.1)" } as any}>
          <div className="kpi-icon" style={{ color: "#3b82f6" }}><History size={24} /></div>
          <div className="kpi-label">Volume Transaksi</div>
          <div className="kpi-value">{summary.jumlahTransaksi} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>trx</span></div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card glass" style={{ marginBottom: 24, padding: '16px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
             <Filter size={16} className="text-muted" />
             <input type="date" className="form-control" value={filter.from} onChange={e => setFilter(f => ({ ...f, from: e.target.value }))} placeholder="Dari Tanggal" />
             <span className="text-muted">→</span>
             <input type="date" className="form-control" value={filter.to} onChange={e => setFilter(f => ({ ...f, to: e.target.value }))} placeholder="Sampai Tanggal" />
          </div>
          
          <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 300 }}>
            <select className="form-control" value={filter.programId} onChange={e => setFilter(f => ({ ...f, programId: e.target.value }))}>
              <option value="">Semua Program</option>
              {programs.map((p: any) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
            
            <select className="form-control" value={filter.metodeBayar} onChange={e => setFilter(f => ({ ...f, metodeBayar: e.target.value }))}>
              <option value="">Metode Bayar</option>
              {METODE_BAYAR.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            {!isCS && (
              <select className="form-control" value={filter.csId} onChange={e => setFilter(f => ({ ...f, csId: e.target.value }))}>
                <option value="">Tampilkan CS</option>
                {csList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            
            <button className="btn btn-secondary btn-sm" onClick={() => setFilter({ from: "", to: "", csId: "", programId: "", metodeBayar: "" })} style={{ borderRadius: 'var(--radius-full)' }}>
              <RefreshCw size={14} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-wrapper">
        <table>
          <thead>
              <tr>
                <th>TANGGAL</th>
                <th>SISWA</th>
                <th>PROGRAM</th>
                <th>PETUGAS (CS)</th>
                <th>METODE</th>
                <th style={{ textAlign: 'right' }}>NOMINAL</th>
                <th style={{ textAlign: 'center' }}>NO. INVOICE</th>
                {role !== "PENGAJAR" && <th style={{ textAlign: 'right' }}>OPSI</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 [1, 2, 3].map(i => <tr key={i}><td colSpan={8}><div className="skeleton" style={{ height: 40, margin: '10px 0' }} /></td></tr>)
              ) : data.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state">Belum ada transaksi</div></td></tr>
              ) : data.map(item => (
                <tr key={item.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(item.tanggal, "dd MMM yyyy")}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{item.siswa?.nama ?? "Umum"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.siswa?.noSiswa}</div>
                  </td>
                  <td><span className="badge badge-muted">{item.program?.nama ?? "—"}</span></td>
                  <td style={{ fontWeight: 500 }}>{item.cs?.name ?? "—"}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {getMethodIcon(item.metodeBayar)}
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{item.metodeBayar}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(item.hargaFinal)}</div>
                    {item.diskon > 0 && <div style={{ fontSize: 10, color: 'var(--danger)' }}>Disc: -{formatCurrency(item.diskon)}</div>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                     <code style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 4 }}>{item.invoice?.noInvoice ?? "—"}</code>
                  </td>
                  {role !== "PENGAJAR" && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-icon" onClick={() => openEditModal(item)}><Edit3 size={14} /></button>
                        {role === "ADMIN" && (
                          <button className="btn btn-secondary btn-icon" onClick={() => handleDelete(item)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
        </table>
      </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal" style={{ width: 600 }}>
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
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                    {saving ? "Menyimpan..." : (editId ? "🔄 Perbarui Data" : "💰 Simpan & Buat Invoice")}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
