"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import "./register.css"; // We will create this

export default function RegisterPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    nama: "",
    whatsapp: "",
    email: "",
    programId: "",
    preferensiJadwal: "",
  });

  useEffect(() => {
    fetch("/api/public/programs")
      .then((res) => res.json())
      .then((data) => {
        setPrograms(data);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Auto format whatsapp
    let wa = form.whatsapp.replace(/\D/g, "");
    if (wa.startsWith("0")) wa = "62" + wa.substring(1);

    const res = await fetch("/api/public/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, whatsapp: wa }),
    });

    if (res.ok) {
      setSuccess(true);
    } else {
      alert("Terjadi kesalahan. Silakan coba lagi.");
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="register-container">
        <div className="register-card success-card">
          <div className="success-icon">🎉</div>
          <h2>Pendaftaran Berhasil!</h2>
          <p>Terima kasih telah mendaftar, <b>{form.nama}</b>.</p>
          <p>Tim Customer Service kami akan segera menghubungi Anda melalui WhatsApp untuk informasi jadwal dan instruksi selanjutnya.</p>
          <button className="btn-primary" onClick={() => window.location.href = "https://speakingpartner.id"}>
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>Gabung Kelas Sekarang! 🌟</h1>
          <p>Daftarkan dirimu dan tingkatkan kemampuan bahasa Inggrismu bersama Speaking Partner.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>Memuat program...</div>
        ) : (
          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label>Nama Lengkap <span className="req">*</span></label>
              <input 
                type="text" 
                required 
                placeholder="Misal: Budi Santoso"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>No. WhatsApp <span className="req">*</span></label>
                <input 
                  type="tel" 
                  required 
                  placeholder="08123456789"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
                <small>Pastikan nomor terhubung dengan WA.</small>
              </div>
              <div className="form-group">
                <label>Email Utama</label>
                <input 
                  type="email" 
                  placeholder="budi@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Pilihan Program <span className="req">*</span></label>
              <div className="program-list">
                {programs.map((p) => (
                  <label key={p.id} className={`program-item ${form.programId === p.id ? "selected" : ""}`}>
                    <input 
                      type="radio" 
                      name="program" 
                      value={p.id}
                      checked={form.programId === p.id}
                      onChange={(e) => setForm({ ...form, programId: e.target.value })}
                      required
                    />
                    <div className="program-info">
                      <div className="program-name">{p.nama}</div>
                      <div className="program-price">{formatCurrency(p.harga)}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Preferensi Jadwal (Tuliskan harapanmu)</label>
              <textarea 
                placeholder="Misal: Saya ingin kelas malam hari sepulang kerja, sekitar jam 19:00"
                value={form.preferensiJadwal}
                onChange={(e) => setForm({ ...form, preferensiJadwal: e.target.value })}
                rows={3}
              />
            </div>

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? "Memproses..." : "Kirim Formulir Pendaftaran"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
