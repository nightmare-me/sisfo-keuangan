"use client";

import { useEffect, useState } from "react";
import { Settings, Save, RefreshCw, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";

export default function SystemSettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/system");
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string, value: string) {
    setSavingId(id);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/system", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, value })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Pengaturan berhasil diperbarui!' });
      } else {
        setMessage({ type: 'error', text: 'Gagal memperbarui pengaturan' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan koneksi' });
    } finally {
      setSavingId(null);
    }
  }

  if ((session?.user as any)?.role !== "ADMIN") {
    return <div className="page-container">Hanya Admin yang dapat mengakses halaman ini.</div>;
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--brand-primary)", marginBottom: 8 }}>
             <Settings size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>System Config</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Pengaturan Sistem</h1>
          <p className="body-lg" style={{ margin: 0 }}>Kelola konfigurasi global aplikasi secara dinamis</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchSettings} disabled={loading}>
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {message && (
        <div style={{ 
          padding: '16px 24px', 
          borderRadius: 16, 
          marginBottom: 32, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: message.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
        }}>
          <AlertCircle size={20} />
          <span style={{ fontWeight: 600 }}>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {loading ? (
          <div className="card skeleton" style={{ height: 200 }} />
        ) : settings.map((item, idx) => (
          <div key={item.id} className="card" style={{ padding: 32 }}>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{item.label}</h3>
              <p style={{ fontSize: 14, opacity: 0.6 }}>{item.description}</p>
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <textarea 
                className="form-control" 
                rows={3} 
                value={item.value}
                onChange={e => {
                  const newSettings = [...settings];
                  newSettings[idx].value = e.target.value;
                  setSettings(newSettings);
                }}
                placeholder="Contoh: 628123xxx,628123xxx"
                style={{ fontSize: 16, fontWeight: 500, padding: 16 }}
              />
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--brand-primary)', background: 'rgba(99,102,241,0.05)', padding: '8px 16px', borderRadius: 8, display: 'inline-block' }}>
                Key: <code>{item.key}</code>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              onClick={() => handleUpdate(item.id, item.value)}
              disabled={savingId === item.id}
              style={{ padding: '12px 32px', borderRadius: 100 }}
            >
              <Save size={18} /> {savingId === item.id ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
