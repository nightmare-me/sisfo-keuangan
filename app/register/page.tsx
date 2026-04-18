"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { 
  CheckCircle2, 
  ArrowLeft, 
  Sparkles, 
  Rocket, 
  User, 
  Mail, 
  MessageCircle, 
  Calendar,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import "./register.css";

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
    
    let wa = form.whatsapp.replace(/\D/g, "");
    if (wa.startsWith("0")) wa = "62" + wa.substring(1);

    const res = await fetch("/api/public/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, whatsapp: wa }),
    });

    if (res.ok) {
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert("Terjadi kesalahan. Silakan coba lagi.");
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="register-container">
        <div className="register-card success-card">
          <div className="success-icon">🚀</div>
          <h2 style={{ fontSize: '3rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, color: 'var(--on-surface)' }}>Pendaftaran Berhasil!</h2>
          <div style={{ color: "var(--secondary)", fontSize: '1.25rem', lineHeight: 1.6, maxWidth: 500, margin: "0 auto 40px" }}>
            Halo <strong>{form.nama}</strong>, data kamu sudah kami terima dengan aman.
          </div>
          
          <div className="glass" style={{ padding: 32, borderRadius: 'var(--radius-xl)', textAlign: 'left', marginBottom: 40, background: 'var(--surface-container-low)', border: 'none' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--on-surface)', marginBottom: 16 }}>
                <ShieldCheck size={24} color="var(--success)" />
                <span style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>Langkah Selanjutnya</span>
             </div>
             <p style={{ fontSize: '1.1rem', color: 'var(--on-secondary)' }}>
                Tim Customer Service kami akan segera menghubungimu melalui <strong>WhatsApp</strong> untuk konfirmasi jadwal dan instruksi pembayaran. Pastikan nomormu selalu aktif ya!
             </p>
          </div>

          <a href="https://speakingpartner.id" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-block', width: '100%', maxWidth: 300, padding: '16px', borderRadius: '100px', fontSize: '1.1rem' }}>
             Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <a href="https://speakingpartner.id" className="back-home">
          <ArrowLeft size={16} /> Kembali ke Beranda
        </a>

        <div className="register-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface-container-low)', padding: '8px 16px', borderRadius: '100px', color: 'var(--on-surface)', marginBottom: 24 }}>
             <Sparkles size={16} color="var(--primary)" />
             <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>New Registration</span>
          </div>
          <h1>Mulai Belajar Hari Ini!</h1>
          <p>Tingkatkan rasa percaya diri bicaramu dengan kurikulum terbaik di Speaking Partner.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--secondary)" }}>
             <div className="loading-pulse">Sedang menyiapkan program terbaik untukmu...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label><User size={14} style={{ marginRight: 6 }} /> Nama Lengkap <span className="req">*</span></label>
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
                <label><MessageCircle size={14} style={{ marginRight: 6 }} /> No. WhatsApp <span className="req">*</span></label>
                <input 
                  type="tel" 
                  required 
                  placeholder="0812xxxxxx"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label><Mail size={14} style={{ marginRight: 6 }} /> Email (Opsional)</label>
                <input 
                  type="email" 
                  placeholder="budi@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ marginBottom: 12 }}><Sparkles size={14} style={{ marginRight: 6 }} /> Pilih Program Belajarmu <span className="req">*</span></label>
              <select 
                className="form-control" 
                style={{ padding: '16px 20px', fontSize: '1.1rem', borderRadius: '16px', background: 'var(--surface-container-low)', width: '100%' }}
                required
                value={form.programId}
                onChange={(e) => setForm({ ...form, programId: e.target.value })}
              >
                <option value="">-- Pilih Program --</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} - {formatCurrency(p.harga)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label><Calendar size={14} style={{ marginRight: 6 }} /> Preferensi Jadwal</label>
              <textarea 
                placeholder="Misal: Saya ingin kelas malam hari sepulang kerja, sekitar jam 19:00"
                value={form.preferensiJadwal}
                onChange={(e) => setForm({ ...form, preferensiJadwal: e.target.value })}
                rows={3}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '18px', borderRadius: '100px', fontSize: '1.15rem' }} disabled={submitting}>
              {submitting ? "Tunggu sebentar..." : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  Daftar Sekarang <ChevronRight size={18} />
                </span>
              )}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--secondary)', marginTop: 24 }}>
               Data pribadimu aman bersama kami.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
