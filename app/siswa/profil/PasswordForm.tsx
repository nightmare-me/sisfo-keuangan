"use client";

import { useState } from "react";
import { Shield, Save, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok' });
      return;
    }

    if (form.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password baru minimal 6 karakter' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: form.oldPassword,
          newPassword: form.newPassword
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Password berhasil diperbarui!' });
        setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
        // Optional: logout or redirect
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal memperbarui password' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan koneksi' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Shield size={20} style={{ color: 'var(--brand-primary)' }} /> Keamanan Akun
      </h3>
      
      {message && (
        <div style={{ 
          padding: '12px 16px', 
          borderRadius: 8, 
          marginBottom: 20, 
          fontSize: 14,
          background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: message.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
        }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-group">
          <label className="form-label">Password Saat Ini</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            className="form-control" 
            value={form.oldPassword}
            onChange={e => setForm({ ...form, oldPassword: e.target.value })}
            required 
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="form-group">
            <label className="form-label">Password Baru</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="form-control" 
              value={form.newPassword}
              onChange={e => setForm({ ...form, newPassword: e.target.value })}
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Konfirmasi Password Baru</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="form-control" 
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              required 
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 10, gap: 8 }} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {loading ? "Menyimpan..." : "Simpan Password Baru"}
        </button>
      </form>
    </div>
  );
}
