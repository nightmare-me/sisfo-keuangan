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
        // Handle both direct array or wrapped data object
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
        setSessions(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => {
        setSessions([]);
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
    <div className="page-container">
      <header style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--primary)", marginBottom: 8 }}>
           <Clock size={16} />
           <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Activity Tracking</span>
        </div>
        <h1 className="headline-lg">Input Jam Live Staf</h1>
        <p className="text-muted">Pencatatan durasi live harian untuk perhitungan gaji variabel.</p>
      </header>

      <div className="grid" style={{ gridTemplateColumns: '1fr 350px', gap: 24, alignItems: 'start' }}>
        
        {/* Main Content: List for Selected Date */}
        <section>
          <div className="card glass" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button className="btn btn-secondary btn-icon" onClick={() => setDate(subDays(new Date(date), 1).toISOString().slice(0, 10))}>
                    <ChevronLeft size={16} />
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                    <Calendar size={18} className="text-primary" />
                    {formatDate(date, "eeee, dd MMMM yyyy")}
                  </div>
                  <button className="btn btn-secondary btn-icon" onClick={() => setDate(addDays(new Date(date), 1).toISOString().slice(0, 10))}>
                    <ChevronRight size={16} />
                  </button>
               </div>
               <button className="btn btn-secondary btn-sm" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Hari Ini</button>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>STAF / TALENT</th>
                    <th>DURASI (JAM)</th>
                    <th>KETERANGAN</th>
                    <th style={{ textAlign: 'right' }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>Memuat data...</td></tr>
                  ) : sessions.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Belum ada catatan live untuk tanggal ini.</td></tr>
                  ) : sessions.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{s.user.name}</div>
                        <div className="badge">{s.user.role}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>{s.durasi}</span>
                          <span className="text-muted">jam</span>
                        </div>
                      </td>
                      <td className="text-muted" style={{ fontSize: 13 }}>{s.keterangan || "—"}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(s.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Sidebar: Add New Input */}
        <aside>
          <div className="card glass sticky" style={{ top: 24 }}>
            <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={18} className="text-primary" />
              Tambah Record
            </h3>
            
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label">Pilih Staf</label>
                <select 
                  className="form-control" 
                  value={form.userId} 
                  onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                  required
                >
                  <option value="">Pilih Karyawan</option>
                  {talents.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Durasi (Jam)</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" 
                    step="0.5" 
                    className="form-control" 
                    value={form.durasi} 
                    onChange={e => setForm(f => ({ ...f, durasi: e.target.value }))}
                    required
                  />
                  <span style={{ position: 'absolute', right: 12, top: 12, fontSize: 12, color: 'var(--text-muted)' }}>JAM</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Keterangan</label>
                <textarea 
                  className="form-control" 
                  rows={2}
                  value={form.keterangan}
                  onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Opsional..."
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary w-full" 
                disabled={saving || !isAdmin}
                style={{ marginTop: 8 }}
              >
                {saving ? "Menyimpan..." : "Simpan Aktivitas"}
              </button>
              
              {!isAdmin && (
                <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 8, textAlign: 'center' }}>
                  Hanya Admin yang dapat menginput jam live harian.
                </p>
              )}
            </form>
          </div>
        </aside>

      </div>
    </div>
  );
}
