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
  Briefcase,
  Banknote,
  Wallet,
  CreditCard,
  Target
} from "lucide-react";


const ROLE_BADGE: Record<string, string> = {
  ADMIN: "badge-danger", FINANCE: "badge-warning", CS: "badge-info", PENGAJAR: "badge-success", AKADEMIK: "badge-primary", ADVERTISER: "badge-warning",
};

export default function UsersPage() {
  const { data: session } = useSession();
  const selfRole = (session?.user as any)?.role;
  const hasUserManage = (session?.user as any)?.permissions?.includes('user:manage');

  const [data, setData] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);

  const [mode, setMode] = useState<"single" | "bulk" | "csv">("single");
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ 
    name: "", namaPanggilan: "", noHp: "", email: "", password: "", roleId: "", 
    teamType: [] as string[], secondaryRoles: [] as string[], aktif: true,
    shiftStart: "08:00", shiftEnd: "16:00", isLeadActive: true
  });

  const emptyRow = { name: "", email: "", password: "", roleSlug: "cs" };
  const [bulkRows, setBulkRows] = useState([{ ...emptyRow }, { ...emptyRow }, { ...emptyRow }]);

  // ── Payroll Profile States ──
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payrollUser, setPayrollUser] = useState<any>(null);
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [payrollForm, setPayrollForm] = useState({
    nik: "", namaPanggilan: "", posisi: "", tempatLahir: "", tanggalLahir: "", jenisKelamin: "", noHp: "", alamat: "", statusPernikahan: "", tanggalMasuk: "", tanggalResign: "", kontakDarurat: "", bankName: "", rekeningNomor: "", rekeningNama: "", gajiPokok: 0, tunjangan: 0, feeClosing: 0, feeLead: 0, bonusTarget: 0, bonusNominal: 0, keterangan: ""
  });

  function fetchData() {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search,
      status: filterStatus,
      role: filterRole.toLowerCase() // Kirim lowercase agar cocok dengan slug di DB
    });

    Promise.all([
      fetch(`/api/users?${params}`).then(r => r.json()),
      fetch("/api/roles").then(r => r.json())
    ]).then(([usersData, rolesData]) => {
      setData(Array.isArray(usersData.data) ? usersData.data : []);
      setTotal(usersData.total || 0);
      setTotalPages(usersData.totalPages || 1);
      // Inject count dari API untuk akurasi (bukan dari paginated data)
      const rolesWithCount = Array.isArray(rolesData) ? rolesData.map((r: any) => ({
        ...r,
        count: usersData.roleCounts?.[r.slug] ?? null
      })) : [];
      setRoles(rolesWithCount);
      setLoading(false);
    });
  }

  useEffect(() => { fetchData(); }, [page, limit, filterRole, filterStatus]);

  // Debounced search — reset ke halaman 1 dulu
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const summary = roles.map(r => ({ 
    role: r.slug.toUpperCase(), 
    name: r.name,
    count: r.count ?? data.filter(u => u.roleId === r.id && u.aktif).length 
  }));

  function openEdit(user: any) {
    setEditUser(user);
    setForm({ 
      name: user.name, 
      namaPanggilan: user.namaPanggilan || "",
      noHp: user.noHp || "",
      email: user.email, 
      password: "", 
      roleId: user.roleId, 
      teamType: Array.isArray(user.teamType) ? user.teamType : (user.teamType ? [user.teamType] : []), 
      secondaryRoles: Array.isArray(user.secondaryRoles) ? user.secondaryRoles : [],
      aktif: user.aktif,
      shiftStart: user.shiftStart || "08:00",
      shiftEnd: user.shiftEnd || "16:00",
      isLeadActive: user.isLeadActive ?? true
    });
    setMode("single");
    setShowModal(true);
  }

  function openAdd() {
    setEditUser(null);
    setForm({ 
      name: "", namaPanggilan: "", noHp: "", email: "", password: "", 
      roleId: roles.find(r => r.slug === 'cs')?.id || "", 
      teamType: [], secondaryRoles: [], aktif: true,
      shiftStart: "08:00", shiftEnd: "16:00", isLeadActive: true
    });
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
    const header = "nama,nama_panggilan,no_hp,email,password,role\n";
    const examples = [
      "Rizky Pratama,Rizky,08123456789,rizky@speakingpartner.id,password123,CS",
      "Sari Dewi,Sari,08123456780,sari@speakingpartner.id,password123,CS",
      "Budi Setiawan,Budi,08123456781,budi@speakingpartner.id,password123,PENGAJAR",
      "Ani Rahayu,Ani,08123456782,ani@speakingpartner.id,password123,PENGAJAR",
      "Kasir Satu,Kasir,08123456783,finance1@speakingpartner.id,password123,FINANCE",
    ].join("\n") + "\n";
    const notes = [
      "",
      "# PANDUAN:",
      "# - nama: nama lengkap user",
      "# - nama_panggilan: panggilan user",
      "# - no_hp: nomor whatsapp",
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
      // Smart Delimiter Detection
      const commaCount = (line.match(/,/g) || []).length;
      const semicolonCount = (line.match(/;/g) || []).length;
      const delimiter = semicolonCount > commaCount ? ";" : ",";

      const [name, nickname, phone, email, password, roleRaw] = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ""));
      // Cari role slug yang cocok, default ke 'cs'
      const matchedRole = roles.find(r => r.slug === (roleRaw || "").toLowerCase());
      const roleSlug = matchedRole ? matchedRole.slug : "cs";
      return { 
        name, 
        namaPanggilan: nickname, 
        noHp: phone, 
        email, 
        password, 
        roleSlug 
      };
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

  // ── Payroll Profile Handlers ──
  async function openPayroll(user: any) {
    setPayrollUser(user);
    setLoadingPayroll(true);
    setShowPayrollModal(true);
    try {
      const res = await fetch(`/api/karyawan?userId=${user.id}`);
      const data = await res.json();
      if (data) {
        setPayrollForm({
          nik: data.nik || "",
          namaPanggilan: data.namaPanggilan || "",
          posisi: data.posisi || "",
          tempatLahir: data.tempatLahir || "",
          tanggalLahir: data.tanggalLahir ? data.tanggalLahir.split("T")[0] : "",
          jenisKelamin: data.jenisKelamin || "",
          noHp: data.noHp || "",
          alamat: data.alamat || "",
          statusPernikahan: data.statusPernikahan || "",
          tanggalMasuk: data.tanggalMasuk ? data.tanggalMasuk.split("T")[0] : "",
          tanggalResign: data.tanggalResign ? data.tanggalResign.split("T")[0] : "",
          kontakDarurat: data.kontakDarurat || "",
          bankName: data.bankName || "",
          rekeningNomor: data.rekeningNomor || "",
          rekeningNama: data.rekeningNama || "",
          gajiPokok: data.gajiPokok || 0,
          tunjangan: data.tunjangan || 0,
          feeClosing: data.feeClosing || 0,
          feeLead: data.feeLead || 0,
          bonusTarget: data.bonusTarget || 0,
          bonusNominal: data.bonusNominal || 0,
          keterangan: data.keterangan || ""
        });
      } else {
        setPayrollForm({
          nik: "", namaPanggilan: "", posisi: "", tempatLahir: "", tanggalLahir: "",
          jenisKelamin: "", noHp: "", alamat: "", statusPernikahan: "", 
          tanggalMasuk: "", tanggalResign: "", kontakDarurat: "",
          bankName: "", rekeningNomor: "", rekeningNama: "",
          gajiPokok: 0, tunjangan: 0, feeClosing: 0, feeLead: 0, bonusTarget: 0, bonusNominal: 0, keterangan: ""
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPayroll(false);
    }
  }

  async function handlePayrollSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/karyawan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: payrollUser.id, ...payrollForm })
      });
      if (res.ok) {
        setShowPayrollModal(false);
        fetchData();
      } else {
        alert("Gagal menyimpan profil payroll");
      }
    } catch (e) {
      alert("Error saving payroll");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <Users size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Security & Access Control</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Manajemen Personil</h1>
          <p className="body-lg" style={{ margin: 0 }}>Otorisasi akun dan pengaturan hak akses tim Speaking Partner</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {selfRole?.toUpperCase() === "ADMIN" && (
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
              <div className="kpi-icon" style={{ color: "var(--primary)" }}><Shield size={24} /></div>
              <div className="kpi-label">{s.name}</div>
              <div className="kpi-value">{s.count} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>Staff</span></div>
            </div>
          ))}
          <div className="kpi-card" onClick={() => setFilterStatus(filterStatus === 'nonaktif' ? '' : 'nonaktif')} style={{ cursor: 'pointer' }}>
            <div className="kpi-icon" style={{ color: 'var(--text-muted)' }}><XCircle size={24} /></div>
            <div className="kpi-label">Disabled</div>
            <div className="kpi-value">{data.filter(u => !u.aktif).length}</div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: 32, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="form-control" placeholder="Cari nama atau email..." style={{ paddingLeft: 44 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Filter size={16} style={{ color: "var(--primary)" }} />
            <select className="form-control" value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ width: 140 }}>
              <option value="">Semua Role</option>
              {roles.map(r => <option key={r.slug} value={r.slug.toUpperCase()}>{r.name}</option>)}
            </select>
            <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 140 }}>
              <option value="">Semua Status</option>
              <option value="aktif">Hanya Aktif</option>
              <option value="nonaktif">Hanya Nonaktif</option>
            </select>
            <button className="btn btn-secondary btn-icon" onClick={() => { setSearch(""); setFilterRole(""); setFilterStatus(""); fetchData(); }}><RefreshCw size={16} /></button>
          </div>
        </div>

        {/* Main Table */}
        <div className="table-wrapper">
          <table id="tbl-users">
            <thead>
              <tr>
                <th>Nama Personil</th>
                <th>Role & Kategori</th>
                <th>Email Login</th>
                <th>Status</th>
                <th>Terdaftar</th>
                <th style={{ width: 100 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Memuat data personil...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 64 }}>
                  <div className="empty-state">
                    <div className="empty-state-icon">👤</div>
                    <h3>Tidak ada user ditemukan</h3>
                    <p>Sesuaikan filter atau tambah user baru</p>
                  </div>
                </td></tr>
              ) : data.map(user => (
                <tr key={user.id} style={{ opacity: user.aktif ? 1 : 0.6 }}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--on-surface)" }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>ID: {user.id.slice(0, 8)}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className={`badge ${ROLE_BADGE[user.role] ?? "badge-muted"}`} title={user.role} style={{ width: 'fit-content' }}>
                        {user.roleName}
                      </span>
                      {user.teamType && user.teamType.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {user.teamType.map((t: string) => (
                            <span key={t} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--primary-bg)', color: 'var(--primary)' }}>
                              {t.replace(/CS_|ADV_/, '').replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{user.email}</td>
                  <td>
                    <span className={`badge ${user.aktif ? "badge-success" : "badge-danger"}`}>
                      {user.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(user.createdAt).toLocaleDateString("id-ID")}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => openEdit(user)}
                        style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                        title="Edit User"
                      >✏️</button>
                      {(selfRole === "admin" || selfRole === "finance") && (
                        <button
                          onClick={() => openPayroll(user)}
                          style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                          title="Payroll Profile"
                        >💳</button>
                      )}
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

      {/* ── Modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay">
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
                      <label className="form-label">Nama Panggilan</label>
                      <input type="text" className="form-control" placeholder="Panggilan..." value={form.namaPanggilan} onChange={e => setForm(f => ({ ...f, namaPanggilan: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label required">Email</label>
                      <input type="email" className="form-control" placeholder="email@speakingpartner.id" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">No. HP / WA</label>
                      <input type="tel" className="form-control" placeholder="0812xxxx" value={form.noHp} onChange={e => setForm(f => ({ ...f, noHp: e.target.value }))} />
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
                      <select id="sel-role-user" className="form-control" value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}>
                        <option value="">Pilih Role...</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    {(() => {
                      const selectedRole = roles.find(r => r.id === form.roleId);
                      return (
                        <>
                          {selectedRole?.slug === 'cs' && (
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                              <label className="form-label">Kategori Tim (Bisa pilih lebih dari satu)</label>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, padding: 12, background: 'var(--surface-container-low)', borderRadius: 8 }}>
                                {[
                                  { val: "CS_REGULAR", label: "CS Regular" },
                                  { val: "CS_SOSMED", label: "CS Sosmed" },
                                  { val: "CS_LIVE", label: "CS Live" },
                                  { val: "CS_TOEFL", label: "CS Test TOEFL" },
                                  { val: "CS_RO", label: "CS Repeat Order" },
                                  { val: "CS_AFFILIATE", label: "CS Affiliate" },
                                ].map(t => (
                                  <label key={t.val} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={form.teamType.includes(t.val)} 
                                      onChange={e => {
                                        const newTeams = e.target.checked 
                                          ? [...form.teamType, t.val] 
                                          : form.teamType.filter(x => x !== t.val);
                                        setForm(f => ({ ...f, teamType: newTeams }));
                                      }}
                                    />
                                    {t.label}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedRole?.slug === 'cs' && (
                             <div className="card" style={{ gridColumn: 'span 2', padding: 12, background: 'rgba(99,102,241,0.05)', border: '1px dashed var(--primary)' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                   ⏰ JADWAL PENERIMAAN LEAD
                                </div>
                                <div className="form-grid-2">
                                   <div className="form-group">
                                      <label className="form-label">Jam Mulai</label>
                                      <input type="time" className="form-control" value={form.shiftStart} onChange={e => setForm(f => ({ ...f, shiftStart: e.target.value }))} />
                                   </div>
                                   <div className="form-group">
                                      <label className="form-label">Jam Selesai</label>
                                      <input type="time" className="form-control" value={form.shiftEnd} onChange={e => setForm(f => ({ ...f, shiftEnd: e.target.value }))} />
                                   </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                                   <input type="checkbox" id="chkLeadActive" checked={form.isLeadActive} onChange={e => setForm(f => ({ ...f, isLeadActive: e.target.checked }))} />
                                   <label htmlFor="chkLeadActive" style={{ fontSize: 13, fontWeight: 600 }}>Siap Menerima Lead</label>
                                 </div>
                             </div>
                          )}
                          {selectedRole?.slug === 'advertiser' && (
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                              <label className="form-label">Kategori Tim</label>
                              <div style={{ display: 'flex', gap: 20, padding: 12, background: 'var(--surface-container-low)', borderRadius: 8 }}>
                                {[
                                  { val: "ADV_REGULAR", label: "Adv Regular" },
                                  { val: "ADV_PART_TIME", label: "Adv Part Time" },
                                  { val: "ADV_PROJECT", label: "Adv Project" },
                                  { val: "ADV_TOEFL", label: "Adv TOEFL" },
                                ].map(t => (
                                  <label key={t.val} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={form.teamType.includes(t.val)} 
                                      onChange={e => {
                                        const newTeams = e.target.checked 
                                          ? [...form.teamType, t.val] 
                                          : form.teamType.filter(x => x !== t.val);
                                        setForm(f => ({ ...f, teamType: newTeams }));
                                      }}
                                    />
                                    {t.label}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
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

                  {/* ── Secondary Roles Section ── */}
                  {(() => {
                    const selectedRole = roles.find(r => r.id === form.roleId);
                    const slug = selectedRole?.slug || "";

                    // Definisi role tambahan yang bisa digabung berdasarkan role utama
                    const secondaryOptions: Record<string, { val: string; label: string; desc: string }[]> = {
                      cs: [
                        { val: "advertiser", label: "Advertiser", desc: "Bisa input & kelola data iklan sendiri" },
                        { val: "talent", label: "Talent Live", desc: "Bisa tampil sebagai Talent di Live Session" },
                      ],
                      advertiser: [
                        { val: "cs", label: "Customer Service", desc: "Bisa input closing & kelola leads" },
                        { val: "spv_adv", label: "SPV Advertiser", desc: "Akses supervisory tim ADV" },
                      ],
                      pengajar: [
                        { val: "talent", label: "Talent Live", desc: "Bisa tampil sebagai Talent di Live Session" },
                      ],
                      spv_multimedia: [
                        { val: "talent", label: "Talent Live", desc: "Bisa tampil sebagai Talent di Live Session" },
                      ],
                      spv_adv: [
                        { val: "advertiser", label: "Advertiser", desc: "Bisa input iklan sendiri (sudah otomatis untuk SPV ADV)" },
                      ],
                    };

                    const options = secondaryOptions[slug] || [];
                    if (options.length === 0) return null;

                    return (
                      <div style={{ margin: '16px 0', padding: '14px 16px', background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          🔀 ROLE TAMBAHAN (Merangkap Jabatan)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {options.map(opt => (
                            <label key={opt.val} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: form.secondaryRoles.includes(opt.val) ? 'rgba(99,102,241,0.12)' : 'transparent', border: form.secondaryRoles.includes(opt.val) ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent', transition: 'all 0.15s' }}>
                              <input
                                type="checkbox"
                                checked={form.secondaryRoles.includes(opt.val)}
                                style={{ marginTop: 2, flexShrink: 0 }}
                                onChange={e => {
                                  const updated = e.target.checked
                                    ? [...form.secondaryRoles, opt.val]
                                    : form.secondaryRoles.filter(x => x !== opt.val);
                                  setForm(f => ({ ...f, secondaryRoles: updated }));
                                }}
                              />
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface)' }}>{opt.label}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                        {form.secondaryRoles.length > 0 && (
                          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', padding: '6px 10px', background: 'rgba(16,185,129,0.08)', borderRadius: 6 }}>
                            ✅ User ini akan memiliki akses dari: <strong>{[selectedRole?.name, ...form.secondaryRoles.map(r => roles.find(x => x.slug === r)?.name || r)].join(" + ")}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
                        <select className="form-control" value={row.roleSlug} onChange={e => updateBulkRow(i, "roleSlug", e.target.value)}>
                          {roles.map(r => <option key={r.slug} value={r.slug}>{r.name}</option>)}
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
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditUser(null); }}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Menyimpan..." : `👥 Simpan ${bulkRows.filter(r => r.name && r.email && r.password).length} User`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Payroll Modal ──────────────────────────────────────── */}
      {showPayrollModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 640, width: "95vw" }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CreditCard size={20} style={{ color: 'var(--success)' }} />
                <span>Payroll Profile: {payrollUser?.name}</span>
              </div>
              <button className="modal-close" onClick={() => setShowPayrollModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handlePayrollSubmit}>
              <div className="modal-body">
                {loadingPayroll ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Mengambil data payroll...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    
                    {/* Seksi Informasi Pribadi */}
                    <div className="card" style={{ background: 'var(--surface-container-lowest)', padding: 16, border: '1px solid var(--ghost-border)', borderRadius: 'var(--radius-lg)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>
                        <Info size={16} /> DATA PRIBADI KARYAWAN
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div className="form-group">
                          <label className="form-label">Nama Panggilan</label>
                          <input type="text" className="form-control" placeholder="Cth: Rara" value={payrollForm.namaPanggilan} onChange={e => setPayrollForm(f => ({ ...f, namaPanggilan: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Jenis Kelamin</label>
                          <select className="form-control" value={payrollForm.jenisKelamin} onChange={e => setPayrollForm(f => ({ ...f, jenisKelamin: e.target.value }))}>
                            <option value="">-- Pilih --</option>
                            <option value="LAKI-LAKI">Laki-laki</option>
                            <option value="PEREMPUAN">Perempuan</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div className="form-group">
                          <label className="form-label">Tempat Lahir</label>
                          <input type="text" className="form-control" placeholder="Kota kelahiran" value={payrollForm.tempatLahir} onChange={e => setPayrollForm(f => ({ ...f, tempatLahir: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Tanggal Lahir</label>
                          <input type="date" className="form-control" value={payrollForm.tanggalLahir} onChange={e => setPayrollForm(f => ({ ...f, tanggalLahir: e.target.value }))} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Status Pernikahan</label>
                        <select className="form-control" value={payrollForm.statusPernikahan} onChange={e => setPayrollForm(f => ({ ...f, statusPernikahan: e.target.value }))}>
                          <option value="">-- Pilih Status --</option>
                          <option value="LAJANG">Lajang</option>
                          <option value="MENIKAH">Menikah</option>
                          <option value="CERAI">Cerai</option>
                        </select>
                      </div>
                    </div>

                    {/* Seksi Kontak & Alamat */}
                    <div className="card" style={{ background: 'var(--surface-container-lowest)', padding: 16, border: '1px solid var(--ghost-border)', borderRadius: 'var(--radius-lg)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>
                        <Search size={16} /> KONTAK & ALAMAT
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div className="form-group">
                          <label className="form-label">Nomor HP / WhatsApp</label>
                          <input type="tel" className="form-control" placeholder="0812xxxx" value={payrollForm.noHp} onChange={e => setPayrollForm(f => ({ ...f, noHp: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Kontak Darurat (Nama & No)</label>
                          <input type="text" className="form-control" placeholder="Cth: Ibu Siti (0813xxxx)" value={payrollForm.kontakDarurat} onChange={e => setPayrollForm(f => ({ ...f, kontakDarurat: e.target.value }))} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Alamat Lengkap (Domisili)</label>
                        <textarea className="form-control" rows={2} placeholder="Jl. Anggrek No. 123..." value={payrollForm.alamat} onChange={e => setPayrollForm(f => ({ ...f, alamat: e.target.value }))}></textarea>
                      </div>
                    </div>

                    {/* Seksi Kepegawaian */}
                    <div className="card" style={{ background: 'var(--surface-container-lowest)', padding: 16, border: '1px solid var(--ghost-border)', borderRadius: 'var(--radius-lg)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>
                        <Briefcase size={16} /> DATA KEPEGAWAIAN
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div className="form-group">
                          <label className="form-label">NIK (Sesuai KTP)</label>
                          <input type="text" className="form-control" placeholder="16 Digit NIK" value={payrollForm.nik} onChange={e => setPayrollForm(f => ({ ...f, nik: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Posisi / Jabatan</label>
                          <input type="text" className="form-control" placeholder="Contoh: Manager, Senior CS..." value={payrollForm.posisi} onChange={e => setPayrollForm(f => ({ ...f, posisi: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                          <label className="form-label">Tanggal Masuk</label>
                          <input type="date" className="form-control" value={payrollForm.tanggalMasuk} onChange={e => setPayrollForm(f => ({ ...f, tanggalMasuk: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Tanggal Resign (Jika Ada)</label>
                          <input type="date" className="form-control" value={payrollForm.tanggalResign} onChange={e => setPayrollForm(f => ({ ...f, tanggalResign: e.target.value }))} />
                        </div>
                      </div>
                    </div>

                    {/* Seksi Perbankan */}
                    <div className="card" style={{ background: 'var(--surface-container-lowest)', padding: 16, border: '1px solid var(--ghost-border)', borderRadius: 'var(--radius-lg)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--on-surface)', fontWeight: 700, fontSize: 13 }}>
                        <Wallet size={16} /> DATA REKENING BANK
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 12, marginBottom: 12 }}>
                        <div className="form-group">
                          <label className="form-label">Nama Bank</label>
                          <input type="text" className="form-control" placeholder="BCA / Mandiri..." value={payrollForm.bankName} onChange={e => setPayrollForm(f => ({ ...f, bankName: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Nomor Rekening</label>
                          <input type="text" className="form-control" placeholder="XXXX-XXXX-XXXX" value={payrollForm.rekeningNomor} onChange={e => setPayrollForm(f => ({ ...f, rekeningNomor: e.target.value }))} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Nama Pemilik Rekening</label>
                        <input type="text" className="form-control" placeholder="Harus sesuai buku tabungan" value={payrollForm.rekeningNama} onChange={e => setPayrollForm(f => ({ ...f, rekeningNama: e.target.value }))} />
                      </div>
                    </div>

                    {/* Seksi Financial Params */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--on-surface)', fontWeight: 700, fontSize: 13 }}>
                        <Banknote size={16} /> KOMPONEN GAJI & FEE
                      </div>
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label className="form-label">Gaji Pokok (Bulanan)</label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Rp</span>
                            <input type="number" className="form-control" style={{ paddingLeft: 44 }} value={payrollForm.gajiPokok} onChange={e => setPayrollForm(f => ({ ...f, gajiPokok: parseFloat(e.target.value) || 0 }))} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Tunjangan Tetap</label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Rp</span>
                            <input type="number" className="form-control" style={{ paddingLeft: 44 }} value={payrollForm.tunjangan} onChange={e => setPayrollForm(f => ({ ...f, tunjangan: parseFloat(e.target.value) || 0 }))} />
                          </div>
                        </div>
                      </div>

                      <div className="form-grid-2" style={{ marginTop: 12 }}>
                        <div className="form-group">
                          <label className="form-label">Fee per Closing (CS)</label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Rp</span>
                            <input type="number" className="form-control" style={{ paddingLeft: 44 }} value={payrollForm.feeClosing} onChange={e => setPayrollForm(f => ({ ...f, feeClosing: parseFloat(e.target.value) || 0 }))} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Fee per Lead (Adv)</label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Rp</span>
                            <input type="number" className="form-control" style={{ paddingLeft: 44 }} value={payrollForm.feeLead} onChange={e => setPayrollForm(f => ({ ...f, feeLead: parseFloat(e.target.value) || 0 }))} />
                          </div>
                        </div>
                      </div>

                      <div className="card" style={{ marginTop: 16, background: 'rgba(99,102,241,0.04)', border: '1px dashed rgba(99,102,241,0.2)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <div className="form-group">
                             <label className="form-label"><Target size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Target Bonus (Unit)</label>
                             <input type="number" className="form-control" value={payrollForm.bonusTarget} onChange={e => setPayrollForm(f => ({ ...f, bonusTarget: parseInt(e.target.value) || 0 }))} />
                          </div>
                          <div className="form-group">
                             <label className="form-label">Nominal Bonus Target</label>
                             <input type="number" className="form-control" value={payrollForm.bonusNominal} onChange={e => setPayrollForm(f => ({ ...f, bonusNominal: parseFloat(e.target.value) || 0 }))} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                       <label className="form-label">Catatan Tambahan</label>
                       <textarea className="form-control" rows={2} value={payrollForm.keterangan} onChange={e => setPayrollForm(f => ({ ...f, keterangan: e.target.value }))}></textarea>
                    </div>

                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayrollModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--success)', border: 'none' }} disabled={saving || loadingPayroll}>
                  {saving ? "Menyimpan..." : "💾 Simpan Profil Payroll"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
