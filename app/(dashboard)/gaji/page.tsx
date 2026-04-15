"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

const TIPE_BADGE: Record<string,string> = { PRIVATE:"badge-primary", REGULAR:"badge-info", SEMI_PRIVATE:"badge-warning" };
const STATUS_BAYAR_BADGE: Record<string,string> = { LUNAS:"badge-success", BELUM_BAYAR:"badge-danger", BATAL:"badge-muted" };

export default function GajiPage() {
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

  function fetchData() {
    const p = new URLSearchParams({ bulan: filterBulan, tahun: filterTahun });
    setLoading(true);
    fetch(`/api/gaji?${p}`).then(r=>r.json()).then(d=>{ setData(d.data??[]); setLoading(false); });
    fetch("/api/gaji/tarif").then(r=>r.json()).then(d=>setTarif(d??[])).catch(()=>{});
  }

  useEffect(()=>{ fetchData(); },[filterBulan, filterTahun]);
  useEffect(()=>{
    fetch("/api/users?role=PENGAJAR").then(r=>r.json()).then(d=>setPengajarList(d??[])).catch(()=>{});
    fetch("/api/kelas").then(r=>r.json()).then(d=>setKelasList(d??[])).catch(()=>{});
  },[]);

  // Auto-hitung total gaji
  useEffect(()=>{
    const sesi = parseInt(form.jumlahSesi)||0;
    const tarif = parseFloat(form.tarifPerSesi)||0;
    setForm(f=>({...f, totalGaji: String(sesi*tarif)}));
  },[form.jumlahSesi, form.tarifPerSesi]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch("/api/gaji",{ method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...form, bulan:parseInt(form.bulan), tahun:parseInt(form.tahun), jumlahSesi:parseInt(form.jumlahSesi), tarifPerSesi:parseFloat(form.tarifPerSesi), totalGaji:parseFloat(form.totalGaji) }) });
    setSaving(false); setShowModal(false);
    fetchData();
  }

  async function handleBayar(id: string) {
    if (!confirm("Tandai gaji ini sebagai LUNAS?")) return;
    await fetch("/api/gaji",{ method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id, statusBayar:"LUNAS", tanggalBayar: new Date().toISOString() }) });
    fetchData();
  }

  async function handleTarifSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch("/api/gaji/tarif",{ method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...tarifForm, tarif: parseFloat(tarifForm.tarif) }) });
    setSaving(false); setShowTarifModal(false);
    fetchData();
  }

  const totalBelumBayar = data.filter(d=>d.statusBayar==="BELUM_BAYAR").reduce((a,b)=>a+b.totalGaji,0);
  const totalLunas = data.filter(d=>d.statusBayar==="LUNAS").reduce((a,b)=>a+b.totalGaji,0);

  const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">Gaji Pengajar</div>
          <div className="topbar-subtitle">Hitung dan kelola gaji pengajar per kelas</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={()=>setShowTarifModal(true)}>⚙ Atur Tarif</button>
          <button id="btn-tambah-gaji" className="btn btn-primary" onClick={()=>setShowModal(true)}>+ Input Gaji</button>
        </div>
      </div>

      <div className="page-container">
        {/* Summary */}
        <div className="summary-grid">
          <div className="summary-card">
            <label>Belum Dibayar</label>
            <div className="value red">{formatCurrency(totalBelumBayar)}</div>
          </div>
          <div className="summary-card">
            <label>Sudah Dibayar</label>
            <div className="value green">{formatCurrency(totalLunas)}</div>
          </div>
          <div className="summary-card">
            <label>Total Bulan Ini</label>
            <div className="value">{formatCurrency(totalBelumBayar+totalLunas)}</div>
          </div>
        </div>

        {/* Tarif Info */}
        {tarif.length > 0 && (
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

        {/* Filter */}
        <div className="filter-bar">
          <select className="form-control" value={filterBulan} onChange={e=>setFilterBulan(e.target.value)}>
            {BULAN.map((b,i)=><option key={i+1} value={String(i+1)}>{b}</option>)}
          </select>
          <select className="form-control" value={filterTahun} onChange={e=>setFilterTahun(e.target.value)}>
            {[2024,2025,2026].map(y=><option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Pengajar</th>
                <th>Kelas</th>
                <th>Tipe</th>
                <th>Sesi</th>
                <th>Tarif/Sesi</th>
                <th className="text-right">Total Gaji</th>
                <th>Metode</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign:"center",padding:32,color:"var(--text-muted)" }}>Loading...</td></tr>
              ) : data.length===0 ? (
                <tr><td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon">👨‍🏫</div>
                    <h3>Belum ada data gaji bulan ini</h3>
                    <p>Klik "+ Input Gaji" untuk menghitung gaji pengajar</p>
                  </div>
                </td></tr>
              ) : data.map((g:any)=>(
                <tr key={g.id}>
                  <td style={{ fontWeight:600 }}>{g.pengajar?.name??"—"}</td>
                  <td style={{ fontSize:13 }}>{g.kelas?.namaKelas??"—"}</td>
                  <td><span className={`badge ${TIPE_BADGE[g.kelas?.program?.tipe]??""}`}>{g.kelas?.program?.tipe??"—"}</span></td>
                  <td style={{ fontWeight:600 }}>{g.jumlahSesi} sesi</td>
                  <td>{formatCurrency(g.tarifPerSesi)}</td>
                  <td className="text-right" style={{ fontWeight:700 }}>{formatCurrency(g.totalGaji)}</td>
                  <td><span className="badge badge-info">{g.metodeBayar}</span></td>
                  <td><span className={`badge ${STATUS_BAYAR_BADGE[g.statusBayar]??""}`}>{g.statusBayar==="LUNAS"?"✓ Lunas":"Belum Bayar"}</span></td>
                  <td>
                    {g.statusBayar!=="LUNAS" && (
                      <button className="btn btn-success btn-sm" onClick={()=>handleBayar(g.id)}>✓ Bayar</button>
                    )}
                    {g.statusBayar==="LUNAS" && g.tanggalBayar && (
                      <span style={{ fontSize:11, color:"var(--text-muted)" }}>{formatDate(g.tanggalBayar)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Gaji */}
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
                    <input id="inp-jumlah-sesi" type="number" className="form-control" placeholder="0" value={form.jumlahSesi} onChange={e=>setForm(f=>({...f,jumlahSesi:e.target.value}))} required min={0} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Tarif / Sesi (Rp)</label>
                    <input id="inp-tarif-sesi" type="number" className="form-control" placeholder="0" value={form.tarifPerSesi} onChange={e=>setForm(f=>({...f,tarifPerSesi:e.target.value}))} required min={0} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Gaji (Auto)</label>
                    <input type="number" className="form-control" value={form.totalGaji} onChange={e=>setForm(f=>({...f,totalGaji:e.target.value}))} style={{ color:"var(--success)", fontWeight:700 }} />
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

      {/* Modal Atur Tarif */}
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
    </div>
  );
}
