"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Settings, 
  DollarSign, 
  Percent, 
  Save, 
  AlertCircle, 
  TrendingUp, 
  Briefcase,
  Users
} from "lucide-react";

export default function FinancialSettingsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role?.toUpperCase();
  
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/financial");
      const json = await res.json();
      setConfigs(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSave(id: string, value: number) {
    setSavingId(id);
    try {
      const res = await fetch("/api/settings/financial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, value })
      });
      if (res.ok) {
        // Show success briefly or just refresh
        fetchData();
      } else {
        alert("Gagal menyimpan pengaturan");
      }
    } catch (e) {
      alert("Terjadi kesalahan koneksi");
    } finally {
      setSavingId(null);
    }
  }

  const categories = Array.from(new Set(configs.map(c => c.category)));

  if (loading) return <div className="page-container"><p>Memuat pengaturan...</p></div>;

  return (
    <div className="page-container">
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
          <Settings size={18} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>System Control</span>
        </div>
        <h1 className="headline-lg" style={{ marginBottom: 4 }}>Pengaturan Keuangan</h1>
        <p className="body-lg">Atur parameter gaji, fee, dan persentase sharing profit secara dinamis</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {categories.map(cat => (
          <div key={cat} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", background: "var(--surface-container-low)", borderBottom: "1px solid var(--ghost-border)", display: "flex", alignItems: "center", gap: 12 }}>
              {cat === "GAJI" && <Briefcase size={18} style={{ color: "var(--primary)" }} />}
              {cat === "FEE" && <DollarSign size={18} style={{ color: "var(--success)" }} />}
              {cat === "SHARING" || cat === "SHARING_DETAIL" ? <Percent size={18} style={{ color: "var(--warning)" }} /> : null}
              {cat === "BONUS" && <TrendingUp size={18} style={{ color: "var(--info)" }} />}
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{cat.replace("_", " ")} SETTINGS</h3>
            </div>
            
            <div style={{ padding: "12px 24px" }}>
              {configs.filter(c => c.category === cat).map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 24, padding: "20px 0", borderBottom: "1px solid var(--ghost-border)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{c.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.description}</div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ position: "relative", width: 140 }}>
                      <input 
                        type="number" 
                        className="form-control" 
                        defaultValue={c.value}
                        step={c.value < 1 ? 0.001 : 1}
                        style={{ paddingRight: 40, fontWeight: 700, textAlign: "right" }}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val !== c.value) handleSave(c.id, val);
                        }}
                      />
                      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                        {c.key.includes("PERCENT") || c.key.includes("RATE") ? "%" : "Rp"}
                      </div>
                    </div>
                    {savingId === c.id ? (
                      <div className="spinner-sm"></div>
                    ) : (
                      <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)" }}>
                        <Save size={16} style={{ opacity: 0.3 }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 48, background: "rgba(99,102,241,0.05)", border: "1px dashed var(--primary)" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <AlertCircle style={{ color: "var(--primary)" }} />
          <div>
            <div style={{ fontWeight: 700 }}>Catatan Penting</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Perubahan angka di sini akan langsung berdampak pada perhitungan Payroll bulan berjalan. 
              Untuk persentase (%), gunakan angka desimal (Contoh: 0.05 untuk 5%, atau 0.825 untuk 82.5%).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
