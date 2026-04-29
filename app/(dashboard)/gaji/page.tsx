"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate, hasPermission } from "@/lib/utils";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useSession } from "next-auth/react";
import { 
  Banknote, 
  Settings, 
  Plus, 
  Calendar, 
  Filter, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Wallet, 
  CreditCard,
  History,
  ArrowRight,
  TrendingUp,
  Award,
  Trash2
} from "lucide-react";

const TIPE_BADGE: Record<string,string> = { PRIVATE:"badge-primary", REGULAR:"badge-info", SEMI_PRIVATE:"badge-warning" };
const STATUS_BAYAR_BADGE: Record<string,string> = { LUNAS:"badge-success", BELUM_BAYAR:"badge-danger", BATAL:"badge-muted" };

export default function GajiPage() {
  const { data: session } = useSession();
  const roleSlug = (session?.user as any)?.roleSlug;
  const role = (session?.user as any)?.role?.toUpperCase();
  const isPengajar = roleSlug === "pengajar";
  const canEdit = hasPermission(session, "payroll_tutor:edit");

  const [data, setData] = useState<any[]>([]);
  const [tarif, setTarif] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTarifModal, setShowTarifModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pengajarList, setPengajarList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [filterBulan, setFilterBulan] = useState(String(new Date().getMonth()+1));
  const [filterTahun, setFilterTahun] = useState(String(new Date().getFullYear()));
  const [form, setForm] = useState({ pengajarId:"", kelasId:"", bulan:String(new Date().getMonth()+1), tahun:String(new Date().getFullYear()), jumlahSesi:"0", tarifPerSesi:"", totalGaji:"", metodeBayar:"TRANSFER", keterangan:"" });
  const [tarifForm, setTarifForm] = useState({ tipeKelas:"REGULAR", tarif:"", keterangan:"" });
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: () => {}, type: "danger" as "danger" | "warning" | "info" });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);

  function fetchData() {
    const p = new URLSearchParams({ 
      bulan: filterBulan, 
      tahun: filterTahun,
      page: String(page),
      limit: String(limit)
    });
    setLoading(true);
    fetch(`/api/gaji?${p}`).then(r=>r.json()).then(d=>{ 
      setData(d.data??[]); 
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || 1);
      setLoading(false); 
    });
    fetch("/api/gaji/tarif").then(r=>r.json()).then(d=>setTarif(d??[])).catch(()=>{});
  }

  useEffect(()=>{ if (session) fetchData(); },[page, limit, filterBulan, filterTahun, session]);

  // Reset page when month/year changes
  useEffect(() => {
    setPage(1);
  }, [filterBulan, filterTahun]);
  useEffect(()=>{
    if (canEdit) {
      fetch("/api/users?role=PENGAJAR").then(r=>r.json()).then(d=>setPengajarList(d??[])).catch(()=>{});
      fetch("/api/kelas").then(r=>r.json()).then(d=>setKelasList(d??[])).catch(()=>{});
    }
  },[canEdit]);

  useEffect(()=>{
    const sesi = parseInt(form.jumlahSesi)||0;
    const t = parseFloat(form.tarifPerSesi)||0;
    setForm(f=>({...f, totalGaji: String(sesi*t)}));
  },[form.jumlahSesi, form.tarifPerSesi]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch("/api/gaji",{ method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...form, bulan:parseInt(form.bulan), tahun:parseInt(form.tahun), jumlahSesi:parseInt(form.jumlahSesi), tarifPerSesi:parseFloat(form.tarifPerSesi), totalGaji:parseFloat(form.totalGaji) }) });
    setSaving(false); setShowModal(false);
    fetchData();
  }

  async function handleBayar(id: string) {
    setConfirmModal({
      show: true,
      title: "Konfirmasi Pembayaran?",
      message: "Apakah Anda yakin ingin menandai gaji ini sebagai LUNAS? Data ini akan tercatat di laporan keuangan.",
      type: "success",
      onConfirm: async () => {
        setLoading(true);
        await fetch("/api/gaji",{ method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id, statusBayar:"LUNAS", tanggalBayar: new Date().toISOString() }) });
        fetchData();
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  }

  async function handleDeleteAll() {
    if (role !== "ADMIN") return;
    setConfirmModal({
      show: true,
      title: "HAPUS HISTORI GAJI?",
      message: "⚠️ PERINGATAN KERAS: Seluruh riwayat data PAYROLL PENGAJAR akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.",
      type: "danger",
      onConfirm: async () => {
        setLoading(true);
        const res = await fetch("/api/gaji?all=true", { method: "DELETE" });
        if (res.ok) fetchData();
        else {
          setConfirmModal({
            show: true,
            title: "Gagal Menghapus",
            message: "❌ Terjadi kesalahan server saat mencoba menghapus data.",
            type: "danger",
            onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
          });
        }
        setLoading(false);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  }

  async function handleTarifSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch("/api/gaji/tarif",{ method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...tarifForm, tarif: parseFloat(tarifForm.tarif) }) });
    setSaving(false); setShowTarifModal(false);
    fetchData();
  }

  async function calculateSessions() {
    if (!form.pengajarId) {
      setConfirmModal({
        show: true,
        title: "Pengajar Belum Dipilih",
        message: "⚠️ Silakan pilih nama pengajar terlebih dahulu untuk menghitung sesi otomatis.",
        type: "warning",
        onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
      });
      return;
    }
    const p = new URLSearchParams({ pengajarId: form.pengajarId, bulan: form.bulan, tahun: form.tahun });
    const res = await fetch(`/api/gaji/calculate?${p}`);
    const d = await res.json();
    if (d.count !== undefined) {
      setForm(f => ({ ...f, jumlahSesi: String(d.count) }));
    }
  }

  const totalBelumBayar = data.filter(d=>d.statusBayar==="BELUM_BAYAR").reduce((a,b)=>a+b.totalGaji,0);
  const totalLunas = data.filter(d=>d.statusBayar==="LUNAS").reduce((a,b)=>a+b.totalGaji,0);

  const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--success)", marginBottom: 8 }}>
             <Banknote size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}> {isPengajar ? "My Payroll" : "Payroll Administration"}</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Gaji Pengajar</h1>
          <p className="body-lg" style={{ margin: 0 }}>{isPengajar ? "Riwayat honorarium dan status pembayaran Anda" : "Kalkulasi honorarium dan pengelolaan pembayaran tutor pengajar"}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {role === "ADMIN" && (
            <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: 'var(--radius-full)' }} onClick={handleDeleteAll}>
              <Trash2 size={16} /> Hapus Histori
            </button>
          )}
          {canEdit && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button className="btn btn-secondary" style={{ borderRadius: 'var(--radius-full)' }} onClick={()=>setShowTarifModal(true)}>
                <Settings size={18} /> Atur Tarif
              </button>
              <button id="btn-tambah-gaji" className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)' }} onClick={()=>setShowModal(true)}>
                <Plus size={18} /> Input Gaji
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        <div className="kpi-grid" style={{ marginBottom: 48 }}>
          <div className="kpi-card" style={{ "--kpi-color": "var(--danger)", "--kpi-bg": "var(--danger-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--danger)" }}><AlertCircle size={24} /></div>
            <div className="kpi-label">{isPengajar ? "Menunggu Pembayaran" : "Belum Dibayar"}</div>
            <div className="kpi-value">{formatCurrency(totalBelumBayar)}</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--success)", "--kpi-bg": "var(--success-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--success)" }}><CheckCircle size={24} /></div>
            <div className="kpi-label">{isPengajar ? "Telah Diterima" : "Sudah Dibayar"}</div>
            <div className="kpi-value">{formatCurrency(totalLunas)}</div>
          </div>
          <div className="kpi-card" style={{ "--kpi-color": "var(--primary)", "--kpi-bg": "var(--primary-bg)" } as any}>
            <div className="kpi-icon" style={{ color: "var(--primary)" }}><Banknote size={24} /></div>
            <div className="kpi-label">Total Bulan Ini</div>
            <div className="kpi-value">{formatCurrency(totalBelumBayar+totalLunas)}</div>
          </div>
        </div>

        {!isPengajar && tarif.length > 0 && (
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-header"><div className="card-title">Tarif Per Sesi Aktif</div></div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {tarif.map((t:any)=>(
                <div key={t.id} style={{ background:"var(--bg-elevated)", borderRadius:10, padding:"12px 20px", display:"flex", flexDirection:"column", gap:4 }}>
                  <span className={`badge ${TIPE_BADGE[t.tipeKelas]??""}`} style={{ width:"fit-content" }}>{t.tipeKelas}</span>
                  <span style={{ fontSize:18, fontWeight:800, color:"var(--text-primary)" }}>{formatCurrency(t.tarif)}</span>
                  <span style={{ fontSize:11, color:"var(--text-muted)" }}>per sesi</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: '24px 32px', marginBottom: 32 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Calendar size={18} style={{ color: "var(--primary)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select className="form-control" value={filterBulan} onChange={e=>setFilterBulan(e.target.value)} style={{ padding: '8px 16px', borderRadius: 100 }}>
                  {BULAN.map((b,i)=><option key={i+1} value={String(i+1)}>{b}</option>)}
                </select>
                <select className="form-control" value={filterTahun} onChange={e=>setFilterTahun(e.target.value)} style={{ padding: '8px 16px', borderRadius: 100 }}>
                  {[2024,2025,2026].map(y=><option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
            </div>
            
            <div style={{ flex: 1, textAlign: 'right', fontSize: 13, color: 'var(--text-muted)' }}>
              {isPengajar ? "Menampilkan riwayat gaji pribadi" : `Menampilkan ${data.length} transaksi penggajian`}
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {!isPengajar && <th>Pengajar</th>}
                <th>Kelas</th>
                <th>Tipe</th>
                <th>Sesi</th>
                <th>Tarif/Sesi</th>
                <th className="text-right">Total Gaji</th>
                <th>Metode</th>
                <th>Status</th>
                {canEdit && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign:"center",padding:32,color:"var(--text-muted)" }}>Loading...</td></tr>
              ) : data.length===0 ? (
                <tr><td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon">👨‍🏫</div>
                    <h3>Belum ada data gaji</h3>
                    <p>{isPengajar ? "Data honorarium Anda untuk periode ini belum tersedia." : "Klik '+ Input Gaji' untuk menghitung gaji pengajar"}</p>
                  </div>
                </td></tr>
              ) : data.map((g:any)=>(
                <tr key={g.id}>
                  {!isPengajar && <td style={{ fontWeight:600 }}>{g.pengajar?.name??"—"}</td>}
                  <td style={{ fontSize:13 }}>
                    <div>{g.kelas?.namaKelas??"—"}</div>
                    <div style={{ fontSize:10, opacity:0.6 }}>{g.kelas?.program?.nama}</div>
                  </td>
                  <td><span className={`badge ${TIPE_BADGE[g.kelas?.program?.tipe]??""}`}>{g.kelas?.program?.tipe??"—"}</span></td>
                  <td style={{ fontWeight:600 }}>{g.jumlahSesi} sesi</td>
                  <td>{formatCurrency(g.tarifPerSesi)}</td>
                  <td className="text-right" style={{ fontWeight:700 }}>{formatCurrency(g.totalGaji)}</td>
                  <td><span className="badge badge-info">{g.metodeBayar}</span></td>
                  <td>
                    <span className={`badge ${STATUS_BAYAR_BADGE[g.statusBayar]??""}`}>
                       {g.statusBayar==="LUNAS" ? "✓ Lunas" : (isPengajar ? "⌛ Menunggu" : "Belum Bayar")}
                    </span>
                  </td>
                  {canEdit && (
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {g.statusBayar!=="LUNAS" && (
                          <button className="btn btn-secondary btn-icon" style={{ width: 42, height: 42, borderRadius: 12, color: 'var(--success)' }} onClick={()=>handleBayar(g.id)} title="Bayar Lunas">
                            <CheckCircle size={20} />
                          </button>
                        )}
                        {g.statusBayar==="LUNAS" && g.tanggalBayar && (
                          <span style={{ fontSize:11, color:"var(--text-muted)", fontWeight: 600 }}>✓ {formatDate(g.tanggalBayar)}</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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
                   <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2))
                      .map((p, i, arr) => (
                        <div key={p} style={{ display: 'flex', gap: 4 }}>
                          {i > 0 && arr[i-1] !== p - 1 && <span style={{ padding: '0 4px', alignSelf: 'center' }}>...</span>}
                          <button 
                            className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ minWidth: 32 }}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        </div>
                      ))}
                   </div>
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

      {showModal && (
        <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) setShowModal(false); }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">Input Gaji Pengajar</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Pengajar</label>
                    <select id="sel-pengajar-gaji" className="form-control" value={form.pengajarId} onChange={e=>setForm(f=>({...f,pengajarId:e.target.value}))} required>
                      <option value="">Pilih Pengajar</option>
                      {pengajarList.map((u:any)=><option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kelas</label>
                    <select className="form-control" value={form.kelasId} onChange={e=>setForm(f=>({...f,kelasId:e.target.value}))}>
                      <option value="">Pilih Kelas (opsional)</option>
                      {kelasList.map((k:any)=><option key={k.id} value={k.id}>{k.namaKelas} ({k.program?.tipe})</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Bulan</label>
                    <select className="form-control" value={form.bulan} onChange={e=>setForm(f=>({...f,bulan:e.target.value}))}>
                      {BULAN.map((b,i)=><option key={i+1} value={String(i+1)}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Tahun</label>
                    <select className="form-control" value={form.tahun} onChange={e=>setForm(f=>({...f,tahun:e.target.value}))}>
                      {[2024,2025,2026].map(y=><option key={y} value={String(y)}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label required">Jumlah Sesi</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input id="inp-jumlah-sesi" type="number" className="form-control" placeholder="0" value={form.jumlahSesi} onChange={e=>setForm(f=>({...f,jumlahSesi:e.target.value}))} required min={0} />
                      <button type="button" className="btn btn-secondary btn-icon" onClick={calculateSessions} title="Hitung Otomatis dari Absensi" style={{ height: 44, width: 44 }}>
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Tarif / Sesi (Rp)</label>
                    <input id="inp-tarif-sesi" type="number" className="form-control" placeholder="0" value={form.tarifPerSesi} onChange={e=>setForm(f=>({...f,tarifPerSesi:e.target.value}))} required min={0} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Gaji (Auto)</label>
                    <input type="number" className="form-control" value={form.totalGaji} readOnly style={{ color:"var(--success)", fontWeight:700, background: 'var(--bg-elevated)' }} />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Metode Bayar</label>
                    <select className="form-control" value={form.metodeBayar} onChange={e=>setForm(f=>({...f,metodeBayar:e.target.value}))}>
                      <option value="TRANSFER">TRANSFER</option>
                      <option value="CASH">CASH</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Keterangan</label>
                    <input type="text" className="form-control" placeholder="Opsional..." value={form.keterangan} onChange={e=>setForm(f=>({...f,keterangan:e.target.value}))} />
                  </div>
                </div>
                {form.totalGaji && (
                  <div style={{ background:"var(--success-bg)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <span style={{ color:"var(--text-muted)",fontSize:13 }}>Total Gaji yang akan dibayarkan:</span>
                    <span style={{ color:"var(--success)",fontWeight:800,fontSize:18 }}>{formatCurrency(parseFloat(form.totalGaji)||0)}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Batal</button>
                <button id="btn-simpan-gaji" type="submit" className="btn btn-primary" disabled={saving}>{saving?"Menyimpan...":"👨‍🏫 Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTarifModal && (
        <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) setShowTarifModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">⚙ Atur Tarif Per Sesi</div>
              <button className="modal-close" onClick={()=>setShowTarifModal(false)}>✕</button>
            </div>
            <form onSubmit={handleTarifSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Tipe Kelas</label>
                  <select className="form-control" value={tarifForm.tipeKelas} onChange={e=>setTarifForm(f=>({...f,tipeKelas:e.target.value}))}>
                    <option value="REGULAR">REGULAR</option>
                    <option value="PRIVATE">PRIVATE</option>
                    <option value="SEMI_PRIVATE">SEMI PRIVATE</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Tarif per Sesi (Rp)</label>
                  <input type="number" className="form-control" placeholder="0" value={tarifForm.tarif} onChange={e=>setTarifForm(f=>({...f,tarif:e.target.value}))} required min={0} />
                  <span className="form-hint">Tarif baru akan menggantikan tarif aktif sebelumnya untuk tipe yang sama</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Keterangan</label>
                  <input type="text" className="form-control" placeholder="Berlaku mulai..." value={tarifForm.keterangan} onChange={e=>setTarifForm(f=>({...f,keterangan:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowTarifModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?"Menyimpan...":"Simpan Tarif"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal 
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() => setConfirmModal({ ...confirmModal, show: false })}
        onConfirm={confirmModal.onConfirm}
        type={confirmModal.type}
        loading={loading}
      />
    </div>
  );
}
