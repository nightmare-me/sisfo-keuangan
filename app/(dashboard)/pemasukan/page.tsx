"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
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
    const params = new URLSearchParams();
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to + "T23:59:59");
    // CS hanya melihat transaksi miliknya
    if (isCS && userId) {
      params.set("csId", userId);
    } else if (filter.csId) {
      params.set("csId", filter.csId);
    }
    if (filter.programId) params.set("programId", filter.programId);
    if (filter.metodeBayar) params.set("metodeBayar", filter.metodeBayar);
    params.set("limit", "50");

    setLoading(true);
    fetch(`/api/pemasukan?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d.data ?? []); setSummary(d.summary ?? {}); setLoading(false); });
  }

  useEffect(() => { fetchData(); }, [filter]);

  useEffect(() => {
    fetch("/api/program").then(r => r.json()).then(d => setPrograms(d)).catch(() => {});
    fetch("/api/siswa?limit=100").then(r => r.json()).then(d => setSiswaDrop(d.data ?? [])).catch(() => {});
    fetch("/api/users?role=CS").then(r => r.json()).then(d => setCsList(d)).catch(() => {});
  }, []);

  // Auto-calculate hargaFinal
  useEffect(() => {
    const normal = parseFloat(form.hargaNormal) || 0;
    const diskon = parseFloat(form.diskon) || 0;
    setForm(f => ({ ...f, hargaFinal: String(Math.max(0, normal - diskon)) }));
  }, [form.hargaNormal, form.diskon]);

  function openAddModal() {
    setEditId(null);
    // CS otomatis terisi sebagai CS yang handle
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
    if (!confirm(`Hapus transaksi ${item.invoice?.noInvoice ?? ""} senilai ${formatCurrency(item.hargaFinal)}?\n\nData invoice terkait juga akan dihapus.`)) return;
    const res = await fetch(`/api/pemasukan/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      alert("Gagal hapus: " + (err.error ?? "Error"));
    }
  }

  async function handleDeleteAll() {
    if (!confirm(`⚠️ HAPUS SEMUA DATA PEMASUKAN?\n\nSemua transaksi dan invoice akan dihapus permanen.\nAksi ini tidak bisa dibatalkan!`)) return;
    if (!confirm(`Konfirmasi sekali lagi: yakin hapus SEMUA data pemasukan?`)) return;
    const res = await fetch("/api/pemasukan/delete-all", { method: "DELETE" });
    if (res.ok) {
      const d = await res.json();
      alert(`✅ Berhasil menghapus ${d.deleted} transaksi.`);
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      alert("Gagal: " + (err.error ?? "Error"));
    }
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
    if (editId) {
      await fetch(`/api/pemasukan/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/pemasukan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setShowModal(false);
    setEditId(null);
    setForm(emptyForm);
    fetchData();
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);

    // Buat lookup map dari nama ke ID (case-insensitive)
    const siswaMap: Record<string, string> = {};
    siswaDrop.forEach((s: any) => {
      siswaMap[s.nama.toLowerCase()] = s.id;
      if (s.noSiswa) siswaMap[s.noSiswa.toLowerCase()] = s.id;
    });
    const programMap: Record<string, string> = {};
    programs.forEach((p: any) => { programMap[p.nama.toLowerCase()] = p.id; });
    const csMap: Record<string, string> = {};
    csList.forEach((u: any) => { csMap[u.name.toLowerCase()] = u.id; });

    const text = await file.text();
    // Fix Windows \r\n line endings
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n").slice(1).filter(l => l.trim().length > 0);

    let success = 0;
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const delimiter = line.includes(";") ? ";" : ",";
      const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ""));

      if (cols.length < 2) {
        errors.push(`Baris ${i + 2}: kolom tidak cukup`);
        continue;
      }

      // Format baru: tanggal,namaSiswa,namaProgram,namaCS,hargaNormal,diskon,metodeBayar,keterangan
      // Format lama: tanggal,hargaNormal,diskon,metodeBayar,keterangan
      // Deteksi: jika kolom ke-2 berupa angka → format lama
      const isLegacyFormat = !isNaN(parseFloat(cols[1])) && cols[1].trim() !== "";

      let tanggal: string;
      let namaSiswa: string;
      let namaProgram: string;
      let namaCS: string;
      let hargaNormalStr: string;
      let diskonStr: string;
      let metodeBayarRaw: string;
      let keterangan: string;

      if (isLegacyFormat) {
        // Format lama: tanggal,hargaNormal,diskon,metodeBayar,keterangan,...
        tanggal       = cols[0] ?? "";
        hargaNormalStr = cols[1] ?? "0";
        diskonStr      = cols[2] ?? "0";
        metodeBayarRaw = cols[3] ?? "CASH";
        namaSiswa = ""; namaProgram = ""; namaCS = "";
        keterangan = cols.slice(4).join(",").trim();
      } else {
        // Format baru: tanggal,namaSiswa,namaProgram,namaCS,hargaNormal,diskon,metodeBayar,keterangan,...
        tanggal        = cols[0] ?? "";
        namaSiswa      = cols[1] ?? "";
        namaProgram    = cols[2] ?? "";
        namaCS         = cols[3] ?? "";
        hargaNormalStr = cols[4] ?? "0";
        diskonStr      = cols[5] ?? "0";
        metodeBayarRaw = cols[6] ?? "CASH";
        keterangan = cols.slice(7).join(",").trim();
      }

      const hargaNormal = parseFloat(hargaNormalStr) || 0;
      const diskon = parseFloat(diskonStr || "0") || 0;
      const hargaFinal = Math.max(0, hargaNormal - diskon);
      const metodeBayar = ["CASH","TRANSFER","QRIS"].includes((metodeBayarRaw||"CASH").toUpperCase())
        ? (metodeBayarRaw||"CASH").toUpperCase() : "CASH";

      if (hargaNormal <= 0) {
        errors.push(`Baris ${i + 2}: harga normal tidak valid ("${hargaNormalStr}")`);
        continue;
      }

      // Cocokkan nama ke ID
      const siswaId = namaSiswa ? (siswaMap[namaSiswa.toLowerCase()] ?? null) : null;
      const programId = namaProgram ? (programMap[namaProgram.toLowerCase()] ?? null) : null;
      const csId = namaCS ? (csMap[namaCS.toLowerCase()] ?? null) : null;

      // Peringatan jika program/CS tidak ditemukan
      const warns: string[] = [];
      if (namaProgram && !programId) warns.push(`program "${namaProgram}" tidak ditemukan`);
      if (namaCS && !csId) warns.push(`CS "${namaCS}" tidak ditemukan`);

      const res = await fetch("/api/pemasukan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal: tanggal || new Date().toISOString().slice(0, 10),
          siswaId,
          namaSiswa: namaSiswa || undefined, // Kirim nama untuk auto-create jika siswaId kosong
          programId, csId,
          hargaNormal, diskon,
          hargaFinal: hargaFinal || hargaNormal,
          metodeBayar, keterangan,
        }),
      });

      if (res.ok) {
        success++;
        if (warns.length > 0) errors.push(`Baris ${i + 2} ⚠️ berhasil (tapi ${warns.join(", ")})`);
      } else {
        const err = await res.json().catch(() => ({}));
        errors.push(`Baris ${i + 2}: ${err.error ?? res.status}`);
      }
    }

    setCsvLoading(false);
    if (fileRef.current) fileRef.current.value = "";

    let msg = `✅ Import selesai: ${success} dari ${lines.length} transaksi berhasil.`;
    if (errors.length > 0) msg += `\n\n⚠️ Catatan (${errors.length}):\n` + errors.slice(0, 7).join("\n");
    alert(msg);
    fetchData();
  }

  function downloadCsvTemplate() {
    const today = new Date().toISOString().slice(0, 10);
    // Ambil contoh nama dari data yang ada
    const contohSiswa = siswaDrop[0]?.nama ?? "Budi Santoso";
    const contohProgram = programs[0]?.nama ?? "Speaking Regular";
    const contohCS = csList[0]?.name ?? "Rizky Pratama";

    const header = "tanggal,namaSiswa,namaProgram,namaCS,hargaNormal,diskon,metodeBayar,keterangan\n";
    const examples = [
      `${today},${contohSiswa},${contohProgram},${contohCS},1500000,0,CASH,Pembayaran kursus`,
      `${today},Dewi Lestari,Speaking Private,${contohCS},3000000,500000,TRANSFER,Promo member lama`,
      `${today},,Grammar Intensive,,1200000,0,QRIS,Siswa baru (tanpa data siswa)`,
      `${today},,,${contohCS},2500000,0,CASH,Tanpa program spesifik`,
    ].join("\n") + "\n";

    // Tambahkan panduan di bawah
    const notes = [
      "",
      "# PANDUAN:",
      "# - namaSiswa: nama lengkap siswa (harus persis sama dengan data di sistem, boleh kosong)",
      "# - namaProgram: nama program kursus (boleh kosong)",
      "# - namaCS: nama CS yang handle (boleh kosong)",
      "# - metodeBayar: CASH / TRANSFER / QRIS (boleh huruf kecil)",
      "# - diskon: isi 0 jika tidak ada diskon",
    ].join("\n");

    const blob = new Blob([header + examples + notes], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template_pemasukan.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  // role & userId sudah dipindah ke atas (sebelum fetchData)

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">Pemasukan</div>
          <div className="topbar-subtitle">Kelola data pemasukan harian</div>
        </div>
        <div className="topbar-actions">
          {role !== "PENGAJAR" && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={downloadCsvTemplate}>⬇ Template CSV</button>
              <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>
                {csvLoading ? "Importing..." : "📥 Import CSV"}
                <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCsvImport} />
              </label>
              {role === "ADMIN" && (
                <button
                  className="btn btn-sm"
                  onClick={handleDeleteAll}
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
                >
                  🗑️ Hapus Semua
                </button>
              )}
              <button id="btn-tambah-pemasukan" className="btn btn-primary" onClick={openAddModal}>
                + Tambah Pemasukan
              </button>
            </>
          )}
        </div>
      </div>

      <div className="page-container">
        {/* Summary */}
        <div className="summary-grid">
          <div className="summary-card">
            <label>Total Pemasukan</label>
            <div className="value green">{formatCurrency(summary.totalPemasukan)}</div>
          </div>
          <div className="summary-card">
            <label>Total Diskon</label>
            <div className="value yellow">{formatCurrency(summary.totalDiskon)}</div>
          </div>
          <div className="summary-card">
            <label>Jumlah Transaksi</label>
            <div className="value">{summary.jumlahTransaksi}</div>
          </div>
        </div>

        {/* Filter — CS tidak bisa ganti filter CS */}
        <div className="filter-bar">
          <input type="date" className="form-control" value={filter.from} onChange={e => setFilter(f => ({ ...f, from: e.target.value }))} style={{ maxWidth: 160 }} />
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>s/d</span>
          <input type="date" className="form-control" value={filter.to} onChange={e => setFilter(f => ({ ...f, to: e.target.value }))} style={{ maxWidth: 160 }} />
          <select className="form-control" value={filter.programId} onChange={e => setFilter(f => ({ ...f, programId: e.target.value }))}>
            <option value="">Semua Program</option>
            {programs.map((p: any) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
          <select className="form-control" value={filter.metodeBayar} onChange={e => setFilter(f => ({ ...f, metodeBayar: e.target.value }))}>
            <option value="">Semua Metode</option>
            {METODE_BAYAR.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {/* Filter CS hanya tampil untuk ADMIN & KASIR */}
          {!isCS && (
            <select className="form-control" value={filter.csId} onChange={e => setFilter(f => ({ ...f, csId: e.target.value }))}>
              <option value="">Semua CS</option>
              {csList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setFilter({ from: "", to: "", csId: "", programId: "", metodeBayar: "" })}>Reset</button>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Siswa</th>
                <th>Program</th>
                <th>CS</th>
                <th>Metode</th>
                <th>Harga Normal</th>
                <th>Diskon</th>
                <th>Harga Final</th>
                <th>Invoice</th>
                {role !== "PENGAJAR" && <th style={{ width: 90 }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={role !== "PENGAJAR" ? 10 : 9} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={role !== "PENGAJAR" ? 10 : 9}>
                  <div className="empty-state">
                    <div className="empty-state-icon">💰</div>
                    <h3>Belum ada data pemasukan</h3>
                    <p>Klik "+ Tambah Pemasukan" untuk mencatat pemasukan baru</p>
                  </div>
                </td></tr>
              ) : data.map(item => (
                <tr key={item.id}>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: 12 }}>{formatDateTime(item.tanggal)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.siswa?.nama ?? "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.siswa?.noSiswa}</div>
                  </td>
                  <td>{item.program?.nama ?? "—"}</td>
                  <td>{item.cs?.name ?? "—"}</td>
                  <td><span className={`badge ${item.metodeBayar === "CASH" ? "badge-warning" : item.metodeBayar === "TRANSFER" ? "badge-info" : "badge-success"}`}>{item.metodeBayar}</span></td>
                  <td>{formatCurrency(item.hargaNormal)}</td>
                  <td style={{ color: item.diskon > 0 ? "var(--danger)" : "var(--text-muted)" }}>{item.diskon > 0 ? `-${formatCurrency(item.diskon)}` : "—"}</td>
                  <td style={{ fontWeight: 700, color: "var(--success)" }}>{formatCurrency(item.hargaFinal)}</td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.invoice?.noInvoice ?? "—"}</td>
                  {role !== "PENGAJAR" && (
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => openEditModal(item)}
                          style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                          title="Edit"
                        >✏️</button>
                  {role === "ADMIN" && (
                    <button
                      onClick={() => handleDelete(item)}
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                      title="Hapus"
                    >🗑️</button>
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setEditId(null); } }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">{editId ? "✏️ Edit Pemasukan" : "+ Tambah Pemasukan"}</div>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditId(null); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Siswa</label>
                    <select id="sel-siswa" className="form-control" value={form.siswaId} onChange={e => setForm(f => ({ ...f, siswaId: e.target.value }))}>
                      <option value="">Pilih Siswa (opsional)</option>
                      {siswaDrop.map((s: any) => <option key={s.id} value={s.id}>{s.nama} — {s.noSiswa}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Program / Produk</label>
                    <select id="sel-program" className="form-control" value={form.programId} onChange={e => setForm(f => ({ ...f, programId: e.target.value }))}>
                      <option value="">Pilih Program (opsional)</option>
                      {programs.map((p: any) => <option key={p.id} value={p.id}>{p.nama} ({p.tipe})</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">CS yang Handle</label>
                    {isCS ? (
                      // CS hanya bisa memilih dirinya sendiri
                      <input className="form-control" value={session?.user?.name ?? ""} disabled style={{ opacity: 0.7 }} />
                    ) : (
                      <select id="sel-cs" className="form-control" value={form.csId} onChange={e => setForm(f => ({ ...f, csId: e.target.value }))}>
                        <option value="">Pilih CS (opsional)</option>
                        {csList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Tanggal</label>
                    <input type="date" className="form-control" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label required">Harga Normal (Rp)</label>
                    <input id="inp-harga-normal" type="number" className="form-control" placeholder="0" value={form.hargaNormal} onChange={e => setForm(f => ({ ...f, hargaNormal: e.target.value }))} required min={0} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Diskon / Promo (Rp)</label>
                    <input id="inp-diskon" type="number" className="form-control" placeholder="0" value={form.diskon} onChange={e => setForm(f => ({ ...f, diskon: e.target.value }))} min={0} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Harga Final (Rp)</label>
                    <input id="inp-harga-final" type="number" className="form-control" value={form.hargaFinal} onChange={e => setForm(f => ({ ...f, hargaFinal: e.target.value }))} required min={0} style={{ color: "var(--success)", fontWeight: 700 }} />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Metode Bayar</label>
                    <select id="sel-metode" className="form-control" value={form.metodeBayar} onChange={e => setForm(f => ({ ...f, metodeBayar: e.target.value }))}>
                      {METODE_BAYAR.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Keterangan</label>
                    <input type="text" className="form-control" placeholder="Opsional..." value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} />
                  </div>
                </div>

                {form.hargaFinal && (
                  <div style={{ background: "var(--success-bg)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Total yang akan diterima:</span>
                    <span style={{ color: "var(--success)", fontWeight: 800, fontSize: 18 }}>{formatCurrency(parseFloat(form.hargaFinal) || 0)}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditId(null); }}>Batal</button>
                <button id="btn-simpan-pemasukan" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Menyimpan..." : editId ? "💾 Simpan Perubahan" : "💰 Simpan & Buat Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
