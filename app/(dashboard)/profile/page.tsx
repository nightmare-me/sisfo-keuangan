"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Shield, Key, User, Mail, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showPass, setShowPass] = useState({ old: false, new: false, confirm: false });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (form.newPassword !== form.confirmPassword) {
      return setMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok' });
    }

    if (form.newPassword.length < 6) {
      return setMessage({ type: 'error', text: 'Password baru minimal 6 karakter' });
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
        setMessage({ type: 'success', text: 'Password Anda berhasil diperbarui!' });
        setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal mengubah password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan sistem' });
    }
    setLoading(false);
  }

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 className="headline-lg" style={{ marginBottom: 8 }}>Profil & Keamanan</h1>
        <p className="text-secondary">Kelola informasi akun dan amankan akses masuk Anda</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1.5fr', gap: 32 }}>
        {/* User Info Card */}
        <div className="card glass" style={{ padding: 32, height: 'fit-content' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              background: 'var(--primary-container)', 
              color: 'var(--on-primary-container)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 800,
              marginBottom: 20,
              boxShadow: 'var(--ambient-shadow)'
            }}>
              {session?.user?.name?.charAt(0).toUpperCase()}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{session?.user?.name}</h2>
            <div className="badge badge-info" style={{ marginBottom: 24, textTransform: 'uppercase' }}>
               {(session?.user as any)?.role}
            </div>

            <div style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Mail size={16} className="text-muted" />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{session?.user?.email}</div>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Shield size={16} className="text-muted" />
                  <div style={{ fontSize: 13, color: 'var(--secondary)' }}>Akun Terverifikasi</div>
               </div>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="card" style={{ padding: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
             <Key size={24} color="var(--primary)" />
             <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Ganti Password</h3>
          </div>

          {message && (
             <div style={{ 
               padding: '12px 16px', 
               borderRadius: 12, 
               background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
               color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
               display: 'flex',
               alignItems: 'center',
               gap: 12,
               marginBottom: 24,
               fontSize: 14,
               fontWeight: 600
             }}>
               {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
               {message.text}
             </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Password Saat Ini</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPass.old ? "text" : "password"} 
                  className="form-control" 
                  autoComplete="current-password"
                  value={form.oldPassword}
                  onChange={e => setForm({ ...form, oldPassword: e.target.value })}
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass({ ...showPass, old: !showPass.old })}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer' }}
                >
                  {showPass.old ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Password Baru</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPass.new ? "text" : "password"} 
                  className="form-control" 
                  autoComplete="new-password"
                  value={form.newPassword}
                  onChange={e => setForm({ ...form, newPassword: e.target.value })}
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass({ ...showPass, new: !showPass.new })}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer' }}
                >
                  {showPass.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--secondary)', marginTop: 6 }}>Minimal 6 karakter, gunakan kombinasi huruf dan angka.</p>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Konfirmasi Password Baru</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPass.confirm ? "text" : "password"} 
                  className="form-control" 
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer' }}
                >
                  {showPass.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '14px', borderRadius: 14, fontWeight: 700, marginTop: 12 }}
              disabled={loading}
            >
              {loading ? "Memproses..." : "Simpan Perubahan Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
