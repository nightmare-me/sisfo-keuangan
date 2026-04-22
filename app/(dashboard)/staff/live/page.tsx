"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Plus, 
  Trash2, 
  Calendar,
  Clock,
  User,
  Save,
  ChevronLeft,
  ChevronRight,
  History
} from "lucide-react";
import { formatDate, SUPER_ROLES } from "@/lib/utils";
import { startOfDay, addDays, subDays } from "date-fns";

export default function StaffLivePage() {
  const { data: session } = useSession();
  const [talents, setTalents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    userId: "",
    durasi: "1",
    keterangan: ""
  });

  const role = (session?.user as any)?.role?.toUpperCase();
  const isAdmin = SUPER_ROLES.includes(role);

  useEffect(() => {
    fetch("/api/users")
      .then(r => r.json())
      .then(d => {
        const users = Array.isArray(d) ? d : (d.data || []);
        setTalents(users.filter((u: any) => u.role !== "PENGAJAR"));
      })
      .catch(() => setTalents([]));
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [date]);

  function fetchSessions() {
    setLoading(true);
    fetch(`/api/staff/live?date=${date}`)
      .then(r => r.json())
      .then(d => {
        setSessions(d.sessions || []);
        setPerformance(d.performance || []);
        setLoading(false);
      })
      .catch(() => {
        setSessions([]);
        setPerformance([]);
        setLoading(false);
      });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.userId) return;
    setSaving(true);
    const res = await fetch("/api/staff/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, date })
    });
    if (res.ok) {
      setForm({ userId: "", durasi: "1", keterangan: "" });
      fetchSessions();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus catatan jam live ini?")) return;
    const res = await fetch(`/api/staff/live?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchSessions();
  }

  return (
    <div className="page-container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      {/* HEADER MINIMALIS */}
      <div style={{ marginBottom: 40, borderLeft: '4px solid var(--primary)', paddingLeft: 20 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--on-surface)', marginBottom: 4 }}>Input Jam Live Staf</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manajemen aktivitas live harian dan performa talent secara real-time.</p>
      </div>

      {/* 1. KOTAK ATAS: DAFTAR TALENT LIVE HARIAN */}
      <section className="card" style={{ 
        marginBottom: 32, 
        padding: 32, 
        borderRadius: 32,
        background: 'var(--surface-container-lowest)',
        border: '1px solid var(--ghost-border)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
           <h3 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 0, fontSize: 20, fontWeight: 700 }}>
             <div style={{ padding: 10, background: 'var(--primary-container)', borderRadius: 12, color: 'var(--primary)' }}>
               <History size={20} />
             </div>
             Daftar Talent Live Harian
           </h3>
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, background: 'var(--surface-container-low)', padding: 8, borderRadius: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn btn-secondary btn-icon" style={{ borderRadius: 12 }} onClick={() => setDate(subDays(new Date(date), 1).toISOString().slice(0, 10))}>
                  <ChevronLeft size={16} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, padding: '0 8px', fontSize: 13, whiteSpace: 'nowrap' }}>
                  <Calendar size={16} className="text-primary" />
                  {formatDate(date, "eeee, dd MMMM yyyy")}
                </div>
                <button className="btn btn-secondary btn-icon" style={{ borderRadius: 12 }} onClick={() => setDate(addDays(new Date(date), 1).toISOString().slice(0, 10))}>
                  <ChevronRight size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 0 auto', justifyContent: 'flex-end' }}>
                <div style={{ width: 1, height: 20, background: 'var(--ghost-border)', margin: '0 4px' }} className="mobile-hide" />
                <button className="btn btn-secondary btn-sm" style={{ borderRadius: 10 }} onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Hari Ini</button>
              </div>
           </div>
        </div>

        <div className="table-wrapper" style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--ghost-border)' }}>
          <table style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: 'var(--surface-container-low)' }}>
                <th style={{ padding: '16px 24px' }}>STAF / TALENT</th>
                <th style={{ padding: '16px 24px' }}>DURASI (JAM)</th>
                <th style={{ padding: '16px 24px' }}>KETERANGAN</th>
                <th style={{ textAlign: 'right', padding: '16px 24px' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 60 }}>
                  <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                  <div style={{ color: 'var(--text-muted)' }}>Memuat data...</div>
                </td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 60 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 15 }}>Belum ada catatan live untuk tanggal ini.</div>
                </td></tr>
              ) : sessions.map(s => (
                <tr key={s.id} className="table-row-hover">
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{s.user.name}</div>
                    <div className="badge" style={{ marginTop: 4, background: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}>{s.user.role}</div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ background: 'var(--primary-container)', color: 'var(--primary)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900 }}>
                        {s.durasi}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Jam Live</span>
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px', fontSize: 14, color: 'var(--text-muted)', maxWidth: 300 }}>{s.keterangan || "—"}</td>
                  <td style={{ textAlign: 'right', padding: '20px 24px' }}>
                    <button className="btn btn-secondary btn-icon" style={{ color: 'var(--danger)', borderRadius: 10 }} onClick={() => handleDelete(s.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* BAGIAN BAWAH: DUA KOLOM */}
      <div className="panel-grid-2" style={{ alignItems: 'stretch', gap: 24 }}>
        
        {/* 2. KOTAK KIRI: TAMBAH RECORD */}
        <aside className="card" style={{ 
          padding: '20px', 
          borderRadius: 24,
          background: 'var(--surface-container-lowest)',
          border: '1px solid var(--ghost-border)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <h3 style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, margin: 0, fontSize: 20, fontWeight: 700 }}>
             <div style={{ padding: 10, background: 'var(--primary-container)', borderRadius: 12, color: 'var(--primary)' }}>
               <Plus size={20} />
             </div>
             Tambah Record
          </h3>
          
          <form onSubmit={handleAdd} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Pilih Staf</label>
              <select 
                className="form-control hover-lift" 
                style={{ padding: '12px 16px', borderRadius: 12, height: 50 }}
                value={form.userId} 
                onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                required
              >
                <option value="">Pilih Karyawan</option>
                {talents.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Durasi (Jam)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" 
                  step="0.5" 
                  className="form-control hover-lift" 
                  style={{ padding: '12px 16px', borderRadius: 12, height: 50 }}
                  value={form.durasi} 
                  onChange={e => setForm(f => ({ ...f, durasi: e.target.value }))}
                  required
                />
                <span style={{ position: 'absolute', right: 16, top: 14, fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>JAM</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Keterangan</label>
              <textarea 
                className="form-control hover-lift" 
                style={{ padding: '12px 16px', borderRadius: 12 }}
                rows={3}
                value={form.keterangan}
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                placeholder="Opsional..."
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving || !isAdmin}
              style={{ 
                height: 54, 
                borderRadius: 16, 
                fontSize: 15, 
                fontWeight: 700,
                boxShadow: '0 8px 20px rgba(var(--primary-rgb), 0.3)',
                marginTop: 'auto'
              }}
            >
              {saving ? "Menyimpan..." : "Simpan Aktivitas"}
            </button>
            
            {!isAdmin && (
              <div style={{ 
                padding: 12, 
                background: 'rgba(var(--danger-rgb), 0.1)', 
                color: 'var(--danger)', 
                borderRadius: 12, 
                fontSize: 11, 
                marginTop: 16, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8 
              }}>
                <Clock size={14} /> Hanya Admin yang dapat menginput jam live harian.
              </div>
            )}
          </form>
        </aside>

        {/* 3. KOTAK KANAN: OMSET YANG DIHASILKAN TALENT */}
        <section className="card" style={{ 
          padding: '20px', 
          borderRadius: 24,
          background: 'var(--surface-container-lowest)',
          border: '1px solid var(--ghost-border)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 0, fontSize: 20, fontWeight: 700 }}>
               <div style={{ padding: 10, background: 'var(--success-container)', borderRadius: 12, color: 'var(--success)' }}>
                 <Save size={20} />
               </div>
               Omset yang Dihasilkan Talent
            </h3>
            <div className="badge" style={{ padding: '6px 12px', fontSize: 13, background: 'var(--primary-container)', color: 'var(--on-primary-container)', borderRadius: 10 }}>
              {performance.length} Talent Bertugas
            </div>
          </div>

          <div className="table-wrapper" style={{ borderRadius: 20, overflowX: 'auto', border: '1px solid var(--ghost-border)' }}>
            <table style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: 'var(--surface-container-low)' }}>
                  <th style={{ padding: '12px' }}>TALENT</th>
                  <th style={{ textAlign: 'center', padding: '12px' }}>CLOSING</th>
                  <th style={{ textAlign: 'right', padding: '12px' }}>OMSET</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: 60 }}>Menghitung omset...</td></tr>
                ) : performance.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: 60 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 15 }}>Tidak ada data omset pada tanggal ini.</div>
                  </td></tr>
                ) : performance.map((p: any) => (
                  <tr key={p.id} className="table-row-hover">
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{p.name}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '20px 24px' }}>
                      <div style={{ 
                        background: 'var(--surface-container-high)', 
                        display: 'inline-flex', 
                        padding: '4px 12px', 
                        borderRadius: 10, 
                        fontWeight: 800,
                        fontSize: 15
                      }}>{p.count}</div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '20px 24px' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--success)' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, marginRight: 4, opacity: 0.7 }}>Rp</span>
                        {p.total.toLocaleString("id-ID")}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {performance.length > 0 && (
                  <tfoot>
                    <tr style={{ background: 'var(--surface-container-low)' }}>
                      <td colSpan={2} style={{ padding: '16px 12px', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: 'var(--text-muted)' }}>Grand Total</td>
                      <td style={{ textAlign: 'right', padding: '16px 12px' }}>
                        <div style={{ fontSize: 'clamp(16px, 4vw, 24px)', fontWeight: 950, color: 'var(--primary)' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, marginRight: 4 }}>Rp</span>
                          {performance.reduce((acc: number, curr: any) => acc + curr.total, 0).toLocaleString("id-ID")}
                        </div>
                      </td>
                    </tr>
                  </tfoot>
              )}
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
