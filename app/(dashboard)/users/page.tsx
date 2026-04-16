"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { 
  Users, 
  UserPlus, 
  Download, 
  Upload, 
  Search, 
  Filter, 
  RefreshCw, 
  Shield, 
  CheckCircle, 
  XCircle, 
  MoreVertical,
  Edit2,
  Trash2,
  ChevronRight,
  Info,
  Layers,
  Briefcase
} from "lucide-react";


const ROLES = ["ADMIN", "FINANCE", "CS", "PENGAJAR", "AKADEMIK"];
const ROLES_AKADEMIK = ["PENGAJAR"]; // AKADEMIK hanya bisa tambah PENGAJAR
const ROLE_BADGE: Record<string, string> = {
  ADMIN: "badge-danger", FINANCE: "badge-warning", CS: "badge-info", PENGAJAR: "badge-success", AKADEMIK: "badge-primary",
};
const ROLE_COLORS: Record<string, string> = {
  ADMIN: "#f87171", FINANCE: "#fbbf24", CS: "#60a5fa", PENGAJAR: "#34d399", AKADEMIK: "#a78bfa",
};

const emptyRow = { name: "", email: "", password: "", role: "CS" };

export default function UsersPage() {
  const { data: session } = useSession();
  const selfRole = (session?.user as any)?.role;
  const isAkademik = selfRole === "AKADEMIK";
  // AKADEMIK hanya tampilkan & bisa kelola PENGAJAR
  const allowedRoles = isAkademik ? ROLES_AKADEMIK : ROLES;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  // Mode: "single" | "bulk" | "csv"
  const [mode, setMode] = useState<"single" | "bulk" | "csv">("single");
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Single form
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "CS", aktif: true });

  // Bulk rows
  const [bulkRows, setBulkRows] = useState([{ ...emptyRow }, { ...emptyRow }, { ...emptyRow }]);

  function fetchData() {
    setLoading(true);
    fetch("/api/users").then(r => r.json()).then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); });
  }

  useEffect(() => { fetchData(); }, []);

  // ── Filtered view ────────────────────────────────────────
  const filtered = data.filter(u => {
    if (isAkademik && u.role !== "PENGAJAR") return false; // AKADEMIK hanya lihat PENGAJAR
    if (filterRole && u.role !== filterRole) return false;
    if (filterStatus === "aktif" && !u.aktif) return false;
    if (filterStatus === "nonaktif" && u.aktif) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Summary ──────────────────────────────────────────────
  const summary = (isAkademik ? ["PENGAJAR"] : ROLES).map(r => ({ role: r, count: data.filter(u => u.role === r && u.aktif).length }));

  // ── Single edit ──────────────────────────────────────────
  function openEdit(user: any) {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role, aktif: user.aktif });
    setMode("single");
    setShowModal(true);
  }

  function openAdd() {
    setEditUser(null);
    setForm({ name: "", email: "", password: "", role: isAkademik ? "PENGAJAR" : "CS", aktif: true });
    setMode("single");
    setShowModal(true);
  }

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    let res: Response;
    if (editUser) {
      res = await fetch("/api/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editUser.id, ...form }) });
    } else {
      res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert("❌ Gagal menyimpan: " + (err.error ?? `HTTP ${res.status}`));
      return;
    }
    setShowModal(false); setEditUser(null);
    fetchData();
  }


  async function handleDeactivate(user: any) {
    if (!confirm(`${user.aktif ? "Nonaktifkan" : "Aktifkan kembali"} user "${user.name}"?`)) return;
    await fetch("/api/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id, aktif: !user.aktif }) });
    fetchData();
  }

  // ── Bulk manual ──────────────────────────────────────────
  function addBulkRow() { setBulkRows(r => [...r, { ...emptyRow }]); }
  function removeBulkRow(i: number) { setBulkRows(r => r.filter((_, idx) => idx !== i)); }
  function updateBulkRow(i: number, field: string, value: string) {
    setBulkRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const valid = bulkRows.filter(r => r.name.trim() && r.email.trim() && r.password.trim());
    if (valid.length === 0) { alert("Tidak ada baris yang valid. Isi minimal nama, email, dan password."); setSaving(false); return; }
    const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valid) });
    const result = await res.json();
    setSaving(false); setShowModal(false);
    setBulkRows([{ ...emptyRow }, { ...emptyRow }, { ...emptyRow }]);
    let msg = `✅ Berhasil tambah ${result.success} user.`;
    if (result.failed > 0) msg += `\n\n❌ Gagal (${result.failed}):\n` + result.errors.slice(0, 5).join("\n");
    alert(msg);
    fetchData();
  }

  // ── CSV Import ───────────────────────────────────────────
  function downloadCsvTemplate() {
    const header = "nama,email,password,role\n";
    const examples = [
      "Rizky Pratama,rizky@speakingpartner.id,password123,CS",
      "Sari Dewi,sari@speakingpartner.id,password123,CS",
      "Budi Setiawan,budi@speakingpartner.id,password123,PENGAJAR",
      "Ani Rahayu,ani@speakingpartner.id,password123,PENGAJAR",
      "Kasir Satu,finance1@speakingpartner.id,password123,FINANCE",
    ].join("\n") + "\n";
    const notes = [
      "",
      "# PANDUAN:",
      "# - nama: nama lengkap user",
      "# - email: harus unik, digunakan untuk login",
      "# - password: minimal 6 karakter",
      "# - role: ADMIN / FINANCE / CS / PENGAJAR / AKADEMIK",
    ].join("\n");
    const blob = new Blob([header + examples + notes], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "template_users.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setCsvLoading(true);
    const text = await file.text();
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n")
      .filter(l => l.trim() && !l.trim().startsWith("#"))
      .slice(1); // skip header

    const users = lines.map(line => {
      const delimiter = line.includes(";") ? ";" : ",";
      const [name, email, password, roleRaw] = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ""));
      const role = ROLES.includes((roleRaw || "").toUpperCase()) ? roleRaw.toUpperCase() : "CS";
      return { name, email, password, role };
    }).filter(u => u.name && u.email && u.password);

    if (users.length === 0) { setCsvLoading(false); alert("Tidak ada data valid di CSV."); if (fileRef.current) fileRef.current.value = ""; return; }

    const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(users) });
    const result = await res.json();
    setCsvLoading(false);
    if (fileRef.current) fileRef.current.value = "";
    let msg = `✅ Import selesai: ${result.success} dari ${users.length} user berhasil ditambahkan.`;
    if (result.failed > 0) msg += `\n\n❌ Gagal (${result.failed}):\n` + result.errors.slice(0, 7).join("\n");
    alert(msg);
    fetchData();
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <Users size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Security & Access Control</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Manajemen Personil</h1>
          <p className="body-lg" style={{ margin: 0 }}>Otorisasi akun dan pengaturan hak akses tim Speaking Partner</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {!isAkademik && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={downloadCsvTemplate} style={{ borderRadius: 'var(--radius-full)' }}>
                <Download size={16} /> Template
              </button>
              <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", borderRadius: 'var(--radius-full)', margin: 0, display: 'flex', alignItems: 'center' }}>
                <Upload size={16} style={{ marginRight: 6 }} /> {csvLoading ? "..." : "Import CSV"}
                <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCsvImport} />
              </label>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setMode("bulk"); setEditUser(null); setShowModal(true); }}
                style={{ background: "rgba(99,102,241,0.1)", border: "1px solid var(--ghost-border)", color: "#818cf8", borderRadius: 'var(--radius-full)' }}
              >
                <Layers size={16} /> Bulk Add
              </button>
            </>
          )}
          <button id="btn-tambah-user" className="btn btn-primary" onClick={openAdd} style={{ borderRadius: 'var(--radius-full)' }}>
             <UserPlus size={18} /> Tambah User
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {/* KPI Grid */}
        <div className="kpi-grid" style={{ marginBottom: 48 }}>
          {summary.map(s => (
            <div key={s.role} className="kpi-card" onClick={() => setFilterRole(filterRole === s.role ? "" : s.role)} style={{ cursor: 'pointer', opacity: filterRole && filterRole !== s.role ? 0.5 : 1 }}>
              <div className="kpi-icon" style={{ color: ROLE_COLORS[s.role] }}><Shield size={24} /></div>
              <div className="kpi-label">{s.role}</div>
              <div className="kpi-value">{s.count} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>Staff</span></div>
            </div>
          ))}
          <div className="kpi-card" onClick={() => setFilterStatus(filterStatus === 'nonaktif' ? '' : 'nonaktif')} style={{ cursor: 'pointer' }}>
            <div className="kpi-icon" style={{ color: 'var(--text-muted)' }}><XCircle size={24} /></div>
            <div className="kpi-label">Disabled</div>
            <div className="kpi-value">{data.filter(u => !u.aktif).length}</div>
          </div>
        </div>

        {/* Access Guide Section */}
        {!isAkademik && (
          <div className="card" style={{ padding: '32px', marginBottom: 48, background: 'var(--surface-container-lowest)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
               <Info size={20} style={{ color: 'var(--primary)' }} />
               <h3 style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>Panduan Otoritas Role</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 16 }}>
              {[
                { role: "ADMIN", desc: "Full authority system, audit log, dan pengaturan platform" },
                { role: "FINANCE", desc: "Pencatatan kas, invoice keluar, dan rekapitulasi laporan" },
                { role: "CS", desc: "Manajemen leads, pendaftaran siswa, dan operasional harian" },
                { role: "AKADEMIK", desc: "Manajemen kurikulum, kelas, dan penjadwalan tutor" },
              ].map(r => (
                <div key={r.role} style={{ padding: "16px 20px", background: "white", borderRadius: 12, border: '1px solid var(--ghost-border)' }}>
                  <span className={`badge ${ROLE_BADGE[r.role] ?? ""}`} style={{ fontSize: 10 }}>{r.role}</span>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.5 }}>{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Section */}
        <div className="card" style={{ padding: '24px 32px', marginBottom: 32 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 280 }}>
               <Search size={18} style={{ color: "var(--secondary)" }} />
               <input type="text" className="form-control" placeholder="Cari nama atau email..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', borderBottom: '1px solid var(--ghost-border)', background: 'transparent', borderRadius: 0, width: '100%' }} />
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <select className="form-control" value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ width: 160, padding: '8px 16px', borderRadius: 100 }}>
                <option value="">Semua Role</option>
                {allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 140, padding: '8px 16px', borderRadius: 100 }}>
                <option value="">Semua Status</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(""); setFilterRole(""); setFilterStatus(""); }} style={{ borderRadius: 'var(--radius-full)' }}>
              <RefreshCw size={14} /> Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Dibuat</th>
                <th style={{ width: 130 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">👤</div>
                    <h3>Tidak ada user ditemukan</h3>
                    <p>Ubah filter atau tambah user baru</p>
                  </div>
                </td></tr>
              ) : filtered.map((user, idx) => (
                <tr key={user.id} style={{ opacity: user.aktif ? 1 : 0.5 }}>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{user.name}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{user.email}</td>
                  <td><span className={`badge ${ROLE_BADGE[user.role] ?? ""}`}>{user.role}</span></td>
                  <td><span className={`badge ${user.aktif ? "badge-success" : "badge-danger"}`}>{user.aktif ? "Aktif" : "Nonaktif"}</span></td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(user.createdAt).toLocaleDateString("id-ID")}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => openEdit(user)}
                        style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                      >✏️</button>
                      <button
                        onClick={() => handleDeactivate(user)}
                        style={{ background: user.aktif ? "rgba(239,68,68,0.1)" : "rgba(10,185,129,0.1)", border: user.aktif ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(10,185,129,0.3)", color: user.aktif ? "#f87171" : "#34d399", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                        title={user.aktif ? "Nonaktifkan" : "Aktifkan"}
                      >{user.aktif ? "🚫" : "✅"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && <div style={{ padding: "10px 16px", fontSize: 12, color: "var(--text-muted)", borderTop: "1px solid var(--border-default)" }}>
            Menampilkan {filtered.length} dari {data.length} user
          </div>}
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setEditUser(null); } }}>
          <div className="modal" style={{ maxWidth: mode === "bulk" ? 860 : 520, width: "95vw" }}>
            <div className="modal-header">
              <div className="modal-title">
                {editUser ? "✏️ Edit User" : mode === "bulk" ? "👥 Tambah Banyak User Sekaligus" : "👤 Tambah User Baru"}
              </div>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditUser(null); }}>✕</button>
            </div>

            {/* ── Single Form ── */}
            {(mode === "single") && (
              <form onSubmit={handleSingleSubmit}>
                <div className="modal-body">
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label required">Nama Lengkap</label>
                      <input id="inp-nama-user" type="text" className="form-control" placeholder="Nama user..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label required">Email</label>
                      <input type="email" className="form-control" placeholder="email@speakingpartner.id" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={editUser ? {} : { color: "var(--danger)" }}>
                      Password {editUser ? "(kosongkan jika tidak diubah)" : "*"}
                    </label>
                    <input type="password" className="form-control" placeholder={editUser ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} minLength={editUser ? 0 : 6} required={!editUser} />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label required">Role</label>
                      <select id="sel-role-user" className="form-control" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                        {allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    {editUser && (
                      <div className="form-group">
                        <label className="form-label">Status</label>
                        <select className="form-control" value={form.aktif ? "true" : "false"} onChange={e => setForm(f => ({ ...f, aktif: e.target.value === "true" }))}>
                          <option value="true">Aktif</option>
                          <option value="false">Nonaktif</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditUser(null); }}>Batal</button>
                  <button id="btn-simpan-user" type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "👤 Simpan"}</button>
                </div>
              </form>
            )}

            {/* ── Bulk Form ── */}
            {mode === "bulk" && (
              <form onSubmit={handleBulkSubmit}>
                <div className="modal-body" style={{ padding: 0 }}>
                  {/* Header tabel */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 130px 36px", gap: 8, padding: "12px 20px 8px", borderBottom: "1px solid var(--border-default)", fontSize: 12, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.04em" }}>
                    <span>NAMA LENGKAP *</span>
                    <span>EMAIL (LOGIN) *</span>
                    <span>PASSWORD *</span>
                    <span>ROLE</span>
                    <span></span>
                  </div>
                  <div style={{ maxHeight: 400, overflowY: "auto", padding: "8px 20px" }}>
                    {bulkRows.map((row, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 130px 36px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                        <input
                          type="text" className="form-control" placeholder={`Nama ${i + 1}`}
                          value={row.name} onChange={e => updateBulkRow(i, "name", e.target.value)}
                        />
                        <input
                          type="email" className="form-control" placeholder="email@..."
                          value={row.email} onChange={e => updateBulkRow(i, "email", e.target.value)}
                        />
                        <input
                          type="text" className="form-control" placeholder="password"
                          value={row.password} onChange={e => updateBulkRow(i, "password", e.target.value)}
                        />
                        <select className="form-control" value={row.role} onChange={e => updateBulkRow(i, "role", e.target.value)}>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeBulkRow(i)}
                          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: 6, width: 36, height: 36, cursor: "pointer", fontSize: 14, flexShrink: 0 }}
                        >✕</button>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: "8px 20px 16px", borderTop: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addBulkRow}>+ Tambah Baris</button>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {bulkRows.filter(r => r.name && r.email && r.password).length} baris siap disimpan dari {bulkRows.length} baris
                    </span>
                  </div>

                  {/* Default password tip */}
                  <div style={{ margin: "0 20px 16px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 12, color: "#818cf8", marginBottom: 4, fontWeight: 600 }}>💡 Tips: Atur password default</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="text" className="form-control" placeholder="Isi password default untuk semua baris..."
                        style={{ flex: 1, fontSize: 13 }}
                        onBlur={e => { if (e.target.value) { setBulkRows(r => r.map(row => ({ ...row, password: e.target.value }))); e.target.value = ""; } }}
                      />
                      <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>lalu klik di luar</span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Menyimpan..." : `👥 Simpan ${bulkRows.filter(r => r.name && r.email && r.password).length} User`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
