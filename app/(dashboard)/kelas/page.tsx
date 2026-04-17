"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { formatDate } from "@/lib/utils";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  User, 
  Calendar, 
  Users, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Edit2,
  Trash2,
  Clock,
  Layers,
  MoreVertical,
  ChevronLeft,
  X,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const TIPE = ["REGULAR", "PRIVATE", "SEMI_PRIVATE"];
const STATUS_KELAS = ["AKTIF", "SELESAI", "DIJADWALKAN"];
const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const TIPE_BADGE: Record<string, string> = { REGULAR: "badge-info", PRIVATE: "badge-primary", SEMI_PRIVATE: "badge-warning" };
const STATUS_BADGE: Record<string, string> = { AKTIF: "badge-success", SELESAI: "badge-muted", DIJADWALKAN: "badge-warning" };
const STATUS_SISWA_BADGE: Record<string, string> = { AKTIF: "badge-success", TIDAK_AKTIF: "badge-danger", ALUMNI: "badge-muted" };

const emptyForm = { namaKelas: "", programId: "", pengajarId: "", jadwal: "", hari: "", jam: "", kapasitas: "10", durasi: "", tanggalMulai: "", tanggalSelesai: "", linkGrup: "" };

export default function KelasPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";
  const canManage = ["ADMIN", "FINANCE", "AKADEMIK"].includes(role);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<any[]>([]);
  const [pengajarList, setPengajarList] = useState<any[]>([]);
  const [siswaEligible, setSiswaEligible] = useState<any[]>([]); // Khusus plotting murid cerdas
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTipe, setFilterTipe] = useState("");

  // Tambah/Edit kelas
  const [showModal, setShowModal] = useState(false);
  const [editKelas, setEditKelas] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  // Detail kelas (side panel)
  const [selectedKelas, setSelectedKelas] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pendaftaranList, setPendaftaranList] = useState<any[]>([]);

  // Tambah siswa ke kelas
  const [showTambahSiswa, setShowTambahSiswa] = useState(false);
  const [selectedSiswaId, setSelectedSiswaId] = useState("");
  const [addingSiswa, setAddingSiswa] = useState(false);
  const [searchSiswa, setSearchSiswa] = useState("");

  function fetchData() {
    const p = new URLSearchParams();
    if (filterStatus) p.set("status", filterStatus);
    if (filterTipe) p.set("tipe", filterTipe);
    setLoading(true);
    fetch(`/api/kelas?${p}`).then(r => r.json()).then(d => { setData(d ?? []); setLoading(false); });
  }

  useEffect(() => { fetchData(); }, [filterStatus, filterTipe]);
  useEffect(() => {
    fetch("/api/program").then(r => r.json()).then(d => setPrograms(d ?? [])).catch(() => {});
    fetch("/api/users?role=PENGAJAR").then(r => r.json()).then(d => setPengajarList(d ?? [])).catch(() => {});
  }, []);

  // ── Load detail kelas ──
  async function loadDetail(kelas: any) {
    setSelectedKelas(kelas);
    setLoadingDetail(true);
    
    // Fetch detail & siswa eligible paralel
    const [resDetail, resEligible] = await Promise.all([
      fetch(`/api/kelas/${kelas.id}`),
      fetch(`/api/kelas/${kelas.id}/eligible-siswa`)
    ]);

    const detail = await resDetail.json();
    const eligible = await resEligible.json();

    setSelectedKelas(detail);
    setPendaftaranList(detail.pendaftaran ?? []);
    setSiswaEligible(Array.isArray(eligible) ? eligible : []);
    setLoadingDetail(false);
  }

  // ── Open modals ──
  function openAdd() {
    setEditKelas(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  }

  function openEdit(kelas: any) {
    setEditKelas(kelas);
    setForm({
      namaKelas: kelas.namaKelas,
      programId: kelas.programId ?? "",
      pengajarId: kelas.pengajarId ?? "",
      jadwal: kelas.jadwal ?? "",
      hari: kelas.hari ?? "",
      jam: kelas.jam ?? "",
      kapasitas: String(kelas.kapasitas),
      durasi: kelas.durasi ?? "",
      linkGrup: kelas.linkGrup ?? "",
      tanggalMulai: kelas.tanggalMulai ? kelas.tanggalMulai.slice(0, 10) : "",
      tanggalSelesai: kelas.tanggalSelesai ? kelas.tanggalSelesai.slice(0, 10) : "",
    });
    setShowModal(true);
  }

  // ── Submit kelas ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, kapasitas: parseInt(form.kapasitas) };
    if (editKelas) {
      await fetch(`/api/kelas/${editKelas.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (selectedKelas?.id === editKelas.id) await loadDetail(editKelas);
    } else {
      await fetch("/api/kelas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setSaving(false); setShowModal(false); setEditKelas(null);
    fetchData();
  }

  // ── Update status kelas ──
  async function updateStatus(kelas: any, status: string) {
    await fetch(`/api/kelas/${kelas.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    fetchData();
    if (selectedKelas?.id === kelas.id) setSelectedKelas((k: any) => ({ ...k, status }));
  }

  // ── Hapus kelas ──
  async function handleDeleteKelas(kelas: any) {
    if (!confirm(`Hapus kelas "${kelas.namaKelas}"?\n\nSemua data pendaftaran akan hilang.`)) return;
    await fetch(`/api/kelas/${kelas.id}`, { method: "DELETE" });
    if (selectedKelas?.id === kelas.id) setSelectedKelas(null);
    fetchData();
  }

  // ── Daftarkan siswa ──
  async function handleTambahSiswa() {
    if (!selectedSiswaId) return;
    setAddingSiswa(true);
    const res = await fetch("/api/pendaftaran", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siswaId: selectedSiswaId, kelasId: selectedKelas.id }),
    });
    const result = await res.json();
    setAddingSiswa(false);
    if (!res.ok) { alert("Gagal: " + result.error); return; }
    setSelectedSiswaId(""); setShowTambahSiswa(false); setSearchSiswa("");
    await loadDetail(selectedKelas);
    fetchData();
  }

  // ── Keluarkan siswa ──
  async function handleKeluarkanSiswa(pendaftaran: any) {
    if (!confirm(`Keluarkan "${pendaftaran.siswa.nama}" dari kelas ini?`)) return;
    await fetch(`/api/pendaftaran?id=${pendaftaran.id}`, { method: "DELETE" });
    await loadDetail(selectedKelas);
    fetchData();
  }

  // ── Siswa yang belum di kelas ini (Smart Plotting) ──
  const siswaInKelas = new Set(pendaftaranList.map((p: any) => p.siswa.id));
  const siswaAvailable = siswaEligible.filter(s =>
    !siswaInKelas.has(s.id) &&
    (searchSiswa === "" || s.nama.toLowerCase().includes(searchSiswa.toLowerCase()) || s.noSiswa.toLowerCase().includes(searchSiswa.toLowerCase()))
  );

  const isFull = selectedKelas && (pendaftaranList.length >= selectedKelas.kapasitas);

  return (
    <div style={{ display: "flex", height: "100%", gap: 0 }}>
      {/* ── Kolom kiri: Daftar Kelas ── */}
      <div className="page-container" style={{ flex: selectedKelas ? "0 0 450px" : "1", transition: "flex 0.4s cubic-bezier(0.4, 0, 0.2, 1)", display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0, borderRight: selectedKelas ? '1px solid var(--ghost-border)' : 'none' }}>
        {/* Header Ala Dashboard */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
               <BookOpen size={18} />
               <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Academic Management</span>
            </div>
            <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Manajemen Kelas</h1>
            <p className="body-lg" style={{ margin: 0 }}>Kelola alokasi {data.length} kelas dan tutor pengajar</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {canManage && (
              <button id="btn-tambah-kelas" className="btn btn-primary" onClick={openAdd} style={{ borderRadius: 'var(--radius-full)' }}>
                <Plus size={18} /> Buat Kelas
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64, paddingRight: 8 }}>
          {/* Filter Section */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: 32 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <Filter size={16} style={{ color: "var(--primary)" }} />
              <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ flex: 1, minWidth: 120, padding: '6px 10px' }}>
                <option value="">Semua Status</option>
                {STATUS_KELAS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="form-control" value={filterTipe} onChange={e => setFilterTipe(e.target.value)} style={{ flex: 1, minWidth: 120, padding: '6px 10px' }}>
                <option value="">Semua Tipe</option>
                {TIPE.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={() => { setFilterStatus(""); setFilterTipe(""); }} style={{ borderRadius: 'var(--radius-full)' }}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Grid Cards */}
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}
            </div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><BookOpen size={48} /></div>
              <h3 className="title-lg">Belum ada kelas</h3>
              <p>Mulai dengan membuat kelas baru di periode ini</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: selectedKelas ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
              {data.map(kelas => {
                const isSelected = selectedKelas?.id === kelas.id;
                const pct = Math.min(100, ((kelas._count?.pendaftaran ?? 0) / kelas.kapasitas) * 100);
                const full = (kelas._count?.pendaftaran ?? 0) >= kelas.kapasitas;
                return (
                  <div
                    key={kelas.id}
                    className={`card ${isSelected ? 'active' : ''}`}
                    style={{ cursor: "pointer", padding: '20px', border: isSelected ? "2px solid var(--primary)" : "1px solid var(--ghost-border)", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", position: "relative", transform: isSelected ? 'scale(1.02)' : 'none', boxShadow: isSelected ? 'var(--shadow-lg)' : 'none', background: isSelected ? 'white' : 'transparent' }}
                    onClick={() => { if (isSelected) { setSelectedKelas(null); } else { loadDetail(kelas); } }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: "var(--on-surface)", marginBottom: 4 }}>{kelas.namaKelas}</div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{kelas.program?.nama ?? "—"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <span className={`badge ${TIPE_BADGE[kelas.program?.tipe] ?? "badge-muted"}`} style={{ fontSize: 10, padding: '4px 8px' }}>{kelas.program?.tipe ?? "—"}</span>
                        <span className={`badge ${STATUS_BADGE[kelas.status] ?? "badge-muted"}`} style={{ fontSize: 10, padding: '4px 8px' }}>{kelas.status}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "var(--text-secondary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <User size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: "var(--on-surface)", fontSize: 13 }}>{kelas.pengajar?.name ?? "Belum ada pengajar"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Clock size={14} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13 }}>{kelas.hari ? `${kelas.hari}, ${kelas.jam}` : kelas.jadwal || "Jadwal belum set"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <Users size={14} style={{ color: 'var(--info)' }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: full ? "var(--danger)" : "var(--on-surface)" }}>
                            {kelas._count?.pendaftaran ?? 0} / {kelas.kapasitas}
                          </span>
                        </div>
                        {full && <span className="badge badge-danger" style={{ fontSize: 9 }}>PENUH</span>}
                      </div>
                    </div>

                    {/* Progress bar kapasitas */}
                    <div style={{ marginTop: 16, height: 6, background: "var(--surface-container-low)", borderRadius: 100, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 100, background: full ? "var(--danger)" : "var(--primary)", width: `${pct}%`, transition: "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
                    </div>

                    {!isSelected && (
                      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <ChevronRight size={18} style={{ color: 'var(--ghost-border)' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Panel Kanan: Detail + Daftar Siswa ── */}
      {selectedKelas && (
        <div style={{ flex: 1, overflowY: "auto", background: "var(--surface-container-lowest)", transition: "all 0.4s ease" }}>
          <div style={{ padding: "48px 48px 0" }}>
            {/* Header detail */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
              <div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={() => setSelectedKelas(null)} className="btn btn-secondary btn-icon" style={{ borderRadius: '50%' }}><ChevronLeft size={18} /></button>
                  <div>
                    <h2 style={{ fontWeight: 800, fontSize: 24, color: "var(--on-surface)", margin: 0 }}>{selectedKelas.namaKelas}</h2>
                    <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                       <Layers size={14} /> {selectedKelas.program?.nama} · {selectedKelas.program?.tipe}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {canManage && (
                   <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-icon" onClick={() => openEdit(selectedKelas)} title="Edit Kelas"><Edit2 size={16} /></button>
                      <select
                        className="form-control"
                        style={{ fontSize: 12, padding: "8px 16px", borderRadius: 100, border: '1px solid var(--ghost-border)' }}
                        value={selectedKelas.status}
                        onChange={e => updateStatus(selectedKelas, e.target.value)}
                      >
                        {STATUS_KELAS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                   </div>
                )}
                <button onClick={() => setSelectedKelas(null)} className="btn btn-secondary btn-icon" style={{ borderRadius: '50%' }}><X size={18} /></button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="card" style={{ padding: '32px', marginBottom: 48, background: 'white' }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
                {[
                  { label: "Pengajar / Tutor", value: selectedKelas.pengajar?.name ?? "Belum ditentukan", icon: <User size={16} /> },
                  { label: "Jadwal Belajar", value: selectedKelas.hari ? `${selectedKelas.hari}, ${selectedKelas.jam || "—"}` : selectedKelas.jadwal || "—", icon: <Clock size={16} /> },
                  { label: "Kapasitas", value: `${pendaftaranList.length} / ${selectedKelas.kapasitas} siswa`, icon: <Users size={16} /> },
                  { label: "WA Group", value: selectedKelas.linkGrup ? <a href={selectedKelas.linkGrup.startsWith('http') ? selectedKelas.linkGrup : `https://${selectedKelas.linkGrup}`} target="_blank" rel="noreferrer" style={{color: "var(--primary)", textDecoration: "underline", display: 'flex', alignItems: 'center', gap: 6}}>Join 🚀</a> : "—", icon: <LinkIcon size={16} /> },
                  { label: "Waktu Mulai", value: selectedKelas.tanggalMulai ? formatDate(selectedKelas.tanggalMulai) : "—", icon: <Calendar size={16} /> },
                  { label: "Durasi Program", value: { "2_MINGGU": "2 Minggu", "1_BULAN": "1 Bulan", "3_BULAN": "3 Bulan", "6_BULAN": "6 Bulan" }[selectedKelas.durasi as string] ?? selectedKelas.durasi ?? "—", icon: <Layers size={16} /> },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
                      {item.icon} {item.label}
                    </div>
                    <div style={{ fontWeight: 800, color: "var(--on-surface)", fontSize: 15 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info kelas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Pengajar", value: selectedKelas.pengajar?.name ?? "Belum ditentukan" },
                { label: "Jadwal", value: selectedKelas.hari ? `${selectedKelas.hari}, ${selectedKelas.jam || "—"}` : selectedKelas.jadwal || "—" },
                { label: "Kapasitas", value: `${pendaftaranList.length} / ${selectedKelas.kapasitas} siswa` },
                { label: "Link Grup WA", value: selectedKelas.linkGrup ? <a href={selectedKelas.linkGrup.startsWith('http') ? selectedKelas.linkGrup : `https://${selectedKelas.linkGrup}`} target="_blank" rel="noreferrer" style={{color: "#3b82f6", textDecoration: "none"}}>Buka Grup 🔗</a> : "—" },
                { label: "Durasi", value: { "2_MINGGU": "2 Minggu", "1_BULAN": "1 Bulan", "3_BULAN": "3 Bulan", "6_BULAN": "6 Bulan" }[selectedKelas.durasi as string] ?? selectedKelas.durasi ?? "—" },
                { label: "Tanggal Mulai", value: selectedKelas.tanggalMulai ? formatDate(selectedKelas.tanggalMulai) : "—" },
                { label: "Tanggal Selesai", value: selectedKelas.tanggalSelesai ? formatDate(selectedKelas.tanggalSelesai) : "—" },
              ].map(item => (
                <div key={item.label} style={{ background: "var(--bg-card)", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-default)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Edit kapasitas cepat */}
            {canManage && (
              <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>⚡ Edit kapasitas cepat:</span>
                <input
                  type="number"
                  min={pendaftaranList.length}
                  max={100}
                  defaultValue={selectedKelas.kapasitas}
                  style={{ width: 80, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: 14, fontWeight: 700 }}
                  onBlur={async e => {
                    const val = parseInt(e.target.value);
                    if (val && val !== selectedKelas.kapasitas && val >= pendaftaranList.length) {
                      await fetch(`/api/kelas/${selectedKelas.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kapasitas: val }) });
                      setSelectedKelas((k: any) => ({ ...k, kapasitas: val }));
                      fetchData();
                    }
                  }}
                />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>siswa (klik di luar untuk simpan)</span>
              </div>
            )}

            {/* Header daftar siswa */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                👥 Daftar Siswa ({pendaftaranList.length}/{selectedKelas.kapasitas})
              </div>
              {canManage && !showTambahSiswa && (
                <button
                  onClick={() => setShowTambahSiswa(true)}
                  disabled={isFull}
                  style={{
                    background: isFull ? "var(--bg-elevated)" : "var(--brand-primary)",
                    color: isFull ? "var(--text-muted)" : "white",
                    border: "none", borderRadius: 8, padding: "6px 14px",
                    cursor: isFull ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600
                  }}
                >
                  {isFull ? "🔒 Kelas Penuh" : "+ Daftarkan Siswa"}
                </button>
              )}
            </div>

            {/* Form tambah siswa */}
            {showTambahSiswa && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Daftarkan Siswa ke Kelas Ini</div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="🔍 Cari nama atau nomor siswa..."
                  value={searchSiswa}
                  onChange={e => setSearchSiswa(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <select
                  className="form-control"
                  value={selectedSiswaId}
                  onChange={e => setSelectedSiswaId(e.target.value)}
                  style={{ marginBottom: 10 }}
                  size={Math.min(6, siswaAvailable.length + 1)}
                >
                  <option value="">-- Pilih siswa --</option>
                  {siswaAvailable.map((s: any) => (
                    <option key={s.id} value={s.id}>[{s.noSiswa}] {s.nama}</option>
                  ))}
                </select>
                {siswaAvailable.length === 0 && searchSiswa && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Tidak ada siswa cocok dengan pencarian</div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleTambahSiswa} disabled={!selectedSiswaId || addingSiswa}>
                    {addingSiswa ? "Mendaftarkan..." : "✅ Daftarkan"}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setShowTambahSiswa(false); setSelectedSiswaId(""); setSearchSiswa(""); }}>
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tabel daftar siswa */}
          <div style={{ padding: "0 24px 24px" }}>
            {loadingDetail ? (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Memuat data siswa...</div>
            ) : pendaftaranList.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👨‍🎓</div>
                <div>Belum ada siswa di kelas ini</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Klik "+ Daftarkan Siswa" untuk menambahkan</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>No Siswa</th>
                      <th>Nama</th>
                      <th>Telepon</th>
                      <th>Status</th>
                      <th>Tgl Daftar</th>
                      {canManage && <th style={{ width: 70 }}>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pendaftaranList.map((p: any, idx: number) => (
                      <tr key={p.id}>
                        <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{idx + 1}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>{p.siswa.noSiswa}</td>
                        <td style={{ fontWeight: 600 }}>{p.siswa.nama}</td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.siswa.telepon || "—"}</td>
                        <td><span className={`badge ${STATUS_SISWA_BADGE[p.siswa.status] ?? "badge-muted"}`} style={{ fontSize: 10 }}>{p.siswa.status}</span></td>
                        <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDate(p.tanggalDaftar)}</td>
                        {canManage && (
                          <td>
                            <button
                              onClick={() => handleKeluarkanSiswa(p)}
                              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                              title="Keluarkan dari kelas"
                            >✕ Keluar</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Tambah/Edit Kelas ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setEditKelas(null); } }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">{editKelas ? "✏️ Edit Kelas" : "📚 Tambah Kelas Baru"}</div>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditKelas(null); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Nama Kelas</label>
                    <input id="inp-nama-kelas" type="text" className="form-control" placeholder="Cth: Speaking A1 - Pagi" value={form.namaKelas} onChange={e => setForm(f => ({ ...f, namaKelas: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Program / Produk</label>
                    <select id="sel-program-kelas" className="form-control" value={form.programId} onChange={e => setForm(f => ({ ...f, programId: e.target.value }))} required>
                      <option value="">Pilih Program</option>
                      {programs.map((p: any) => <option key={p.id} value={p.id}>{p.nama} ({p.tipe})</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Pengajar</label>
                    <select id="sel-pengajar" className="form-control" value={form.pengajarId} onChange={e => setForm(f => ({ ...f, pengajarId: e.target.value }))}>
                      <option value="">Pilih Pengajar</option>
                      {pengajarList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kapasitas Siswa (maks)</label>
                    <input type="number" className="form-control" value={form.kapasitas} onChange={e => setForm(f => ({ ...f, kapasitas: e.target.value }))} min={1} max={100} />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Durasi Kelas</label>
                    <select className="form-control" value={form.durasi} onChange={e => setForm(f => ({ ...f, durasi: e.target.value }))}>
                      <option value="">Pilih Durasi</option>
                      <option value="2_MINGGU">2 Minggu</option>
                      <option value="1_BULAN">1 Bulan</option>
                      <option value="3_BULAN">3 Bulan</option>
                      <option value="6_BULAN">6 Bulan</option>
                      <option value="LAINNYA">Lainnya / Kustom</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Link Grup WhatsApp</label>
                    <input type="url" className="form-control" placeholder="https://chat.whatsapp.com/..." value={form.linkGrup} onChange={e => setForm(f => ({ ...f, linkGrup: e.target.value }))} />
                  </div>
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Hari</label>
                    <select className="form-control" value={form.hari} onChange={e => setForm(f => ({ ...f, hari: e.target.value }))}>
                      <option value="">Pilih Hari</option>
                      {HARI.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jam</label>
                    <input type="time" className="form-control" value={form.jam} onChange={e => setForm(f => ({ ...f, jam: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jadwal (teks bebas)</label>
                    <input type="text" className="form-control" placeholder="Cth: 2x seminggu" value={form.jadwal} onChange={e => setForm(f => ({ ...f, jadwal: e.target.value }))} />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Tanggal Mulai</label>
                    <input type="date" className="form-control" value={form.tanggalMulai} onChange={e => setForm(f => ({ ...f, tanggalMulai: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Selesai</label>
                    <input type="date" className="form-control" value={form.tanggalSelesai} onChange={e => setForm(f => ({ ...f, tanggalSelesai: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditKelas(null); }}>Batal</button>
                <button id="btn-simpan-kelas" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Menyimpan..." : editKelas ? "💾 Simpan Perubahan" : "📚 Buat Kelas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
