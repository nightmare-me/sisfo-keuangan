"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatDate } from "@/lib/utils";

const TIPE = ["REGULAR", "PRIVATE", "SEMI_PRIVATE"];
const STATUS_KELAS = ["AKTIF", "SELESAI", "DIJADWALKAN"];
const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const TIPE_BADGE: Record<string, string> = { REGULAR: "badge-info", PRIVATE: "badge-primary", SEMI_PRIVATE: "badge-warning" };
const STATUS_BADGE: Record<string, string> = { AKTIF: "badge-success", SELESAI: "badge-muted", DIJADWALKAN: "badge-warning" };
const STATUS_SISWA_BADGE: Record<string, string> = { AKTIF: "badge-success", TIDAK_AKTIF: "badge-danger", ALUMNI: "badge-muted" };

const emptyForm = { namaKelas: "", programId: "", pengajarId: "", jadwal: "", hari: "", jam: "", kapasitas: "10", durasi: "", tanggalMulai: "", tanggalSelesai: "" };

export default function KelasPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";
  const canManage = ["ADMIN", "FINANCE", "AKADEMIK"].includes(role);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<any[]>([]);
  const [pengajarList, setPengajarList] = useState<any[]>([]);
  const [siswaDrop, setSiswaDrop] = useState<any[]>([]);
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
    fetch("/api/siswa?limit=200").then(r => r.json()).then(d => setSiswaDrop(d.data ?? [])).catch(() => {});
  }, []);

  // ── Load detail kelas ──
  async function loadDetail(kelas: any) {
    setSelectedKelas(kelas);
    setLoadingDetail(true);
    const res = await fetch(`/api/kelas/${kelas.id}`);
    const detail = await res.json();
    setSelectedKelas(detail);
    setPendaftaranList(detail.pendaftaran ?? []);
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

  // ── Siswa yang belum di kelas ini ──
  const siswaInKelas = new Set(pendaftaranList.map((p: any) => p.siswa.id));
  const siswaAvailable = siswaDrop.filter(s =>
    !siswaInKelas.has(s.id) &&
    (searchSiswa === "" || s.nama.toLowerCase().includes(searchSiswa.toLowerCase()) || s.noSiswa.toLowerCase().includes(searchSiswa.toLowerCase()))
  );

  const isFull = selectedKelas && (pendaftaranList.length >= selectedKelas.kapasitas);

  return (
    <div style={{ display: "flex", height: "100%", gap: 0 }}>
      {/* ── Kolom kiri: Daftar Kelas ── */}
      <div style={{ flex: selectedKelas ? "0 0 420px" : "1", transition: "flex 0.3s", overflow: "auto" }}>
        <div className="topbar">
          <div>
            <div className="topbar-title">Manajemen Kelas</div>
            <div className="topbar-subtitle">{data.length} kelas tersedia</div>
          </div>
          <div className="topbar-actions">
            {canManage && (
              <button id="btn-tambah-kelas" className="btn btn-primary" onClick={openAdd}>+ Tambah Kelas</button>
            )}
          </div>
        </div>

        <div className="page-container">
          {/* Filter */}
          <div className="filter-bar">
            <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              {STATUS_KELAS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="form-control" value={filterTipe} onChange={e => setFilterTipe(e.target.value)}>
              <option value="">Semua Tipe</option>
              {TIPE.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={() => { setFilterStatus(""); setFilterTipe(""); }}>Reset</button>
          </div>

          {/* Grid Cards */}
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}
            </div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <h3>Belum ada kelas</h3>
              <p>Klik "+ Tambah Kelas" untuk membuat kelas baru</p>
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
                    className="card"
                    style={{ cursor: "pointer", border: isSelected ? "2px solid var(--brand-primary)" : "1px solid var(--border-default)", transition: "all 0.2s", position: "relative" }}
                    onClick={() => { if (isSelected) { setSelectedKelas(null); } else { loadDetail(kelas); } }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{kelas.namaKelas}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{kelas.program?.nama ?? "—"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <span className={`badge ${TIPE_BADGE[kelas.program?.tipe] ?? "badge-muted"}`}>{kelas.program?.tipe ?? "—"}</span>
                        <span className={`badge ${STATUS_BADGE[kelas.status] ?? "badge-muted"}`}>{kelas.status}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, color: "var(--text-secondary)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>👨‍🏫 Pengajar</span>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{kelas.pengajar?.name ?? "Belum ditentukan"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>📅 Jadwal</span>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{kelas.hari ? `${kelas.hari}, ${kelas.jam}` : kelas.jadwal || "—"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>👥 Siswa</span>
                        <span style={{ fontWeight: 700, color: full ? "var(--danger)" : "var(--success)" }}>
                          {kelas._count?.pendaftaran ?? 0} / {kelas.kapasitas}
                          {full && <span style={{ fontSize: 10, marginLeft: 4 }}>PENUH</span>}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar kapasitas */}
                    <div style={{ marginTop: 10, height: 5, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, background: full ? "var(--danger)" : "var(--success)", width: `${pct}%`, transition: "width 0.5s" }} />
                    </div>

                    {/* Action buttons (hanya saat tidak dipilih) */}
                    {canManage && !isSelected && (
                      <div style={{ display: "flex", gap: 6, marginTop: 12 }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openEdit(kelas)}
                          style={{ flex: 1, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8", borderRadius: 6, padding: "5px 0", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                        >✏️ Edit</button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteKelas(kelas)}
                            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}
                          >🗑️</button>
                        )}
                      </div>
                    )}
                    {isSelected && (
                      <div style={{ marginTop: 8, fontSize: 12, color: "var(--brand-primary)", fontWeight: 600, textAlign: "center" }}>
                        ← Klik untuk tutup detail
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
        <div style={{ flex: 1, borderLeft: "1px solid var(--border-default)", overflowY: "auto", background: "var(--bg-secondary)" }}>
          <div style={{ padding: "24px 24px 0" }}>
            {/* Header detail */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20, color: "var(--text-primary)" }}>{selectedKelas.namaKelas}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{selectedKelas.program?.nama} · {selectedKelas.program?.tipe}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {canManage && (
                  <select
                    className="form-control"
                    style={{ fontSize: 12, padding: "4px 8px" }}
                    value={selectedKelas.status}
                    onChange={e => updateStatus(selectedKelas, e.target.value)}
                    onClick={e => e.stopPropagation()}
                  >
                    {STATUS_KELAS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
                <button onClick={() => setSelectedKelas(null)} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
              </div>
            </div>

            {/* Info kelas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Pengajar", value: selectedKelas.pengajar?.name ?? "Belum ditentukan" },
                { label: "Jadwal", value: selectedKelas.hari ? `${selectedKelas.hari}, ${selectedKelas.jam || "—"}` : selectedKelas.jadwal || "—" },
                { label: "Kapasitas", value: `${pendaftaranList.length} / ${selectedKelas.kapasitas} siswa` },
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
