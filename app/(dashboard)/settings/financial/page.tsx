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

  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ label: "", value: 0, description: "" });

  async function handleCreate(category: string) {
    if (!newItem.label) return alert("Label harus diisi");
    
    // Generate key based on category and label
    const prefix = category === "BONUS" ? "BONUS_GROSS_" : (category === "SHARING_DETAIL" ? "RATE_SHARING_" : "VAR_");
    const key = prefix + newItem.label.toUpperCase().replace(/\s+/g, '_');

    try {
      const res = await fetch("/api/settings/financial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...newItem, 
          category, 
          key,
          value: parseFloat(newItem.value.toString())
        })
      });
      if (res.ok) {
        setShowAddModal(null);
        setNewItem({ label: "", value: 0, description: "" });
        fetchData();
      }
    } catch (e) {
      alert("Gagal menambah data");
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
            <div style={{ padding: "16px 24px", background: "var(--surface-container-low)", borderBottom: "1px solid var(--ghost-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {cat === "GAJI" && <Briefcase size={18} style={{ color: "var(--primary)" }} />}
                {cat === "FEE" && <DollarSign size={18} style={{ color: "var(--success)" }} />}
                {cat === "SHARING" || cat === "SHARING_DETAIL" ? <Percent size={18} style={{ color: "var(--warning)" }} /> : null}
                {cat === "BONUS" && <TrendingUp size={18} style={{ color: "var(--info)" }} />}
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{cat.replace("_", " ")} SETTINGS</h3>
              </div>
              {(cat === "BONUS" || cat === "SHARING_DETAIL") && (
                <button 
                  className="btn btn-primary btn-sm" 
                  style={{ borderRadius: 8, padding: "4px 12px" }}
                  onClick={() => setShowAddModal(cat)}
                >
                  + Tambah Posisi
                </button>
              )}
            </div>
            
            <div style={{ padding: "12px 24px" }}>
              {/* SPECIAL SECTION: Tiered Bonus for SPV Akademik */}
              {cat === "BONUS" && (
                <div style={{ marginBottom: 32, paddingBottom: 32, borderBottom: "2px dashed var(--ghost-border)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", marginBottom: 16 }}>💰 TIERED BONUS: SPV AKADEMIK (RO)</div>
                  <div style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 10 }}>
                    {/* TIER 1 */}
                    <div style={{ minWidth: 280, padding: 16, background: "rgba(99,102,241,0.03)", borderRadius: 12, border: "1px solid var(--ghost-border)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>TIER 1 (Omset &lt; L1)</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 2 }}>
                          <label style={{ fontSize: 10, display: "block", marginBottom: 4 }}>Limit 1 (Rp)</label>
                          <input 
                            type="number" className="form-control form-control-sm" 
                            defaultValue={configs.find(c => c.key === "BONUS_AKADEMIK_RO_LIMIT_1")?.value}
                            onBlur={(e) => handleSave(configs.find(c => c.key === "BONUS_AKADEMIK_RO_LIMIT_1")?.id, parseFloat(e.target.value))}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 10, display: "block", marginBottom: 4 }}>Rate (%)</label>
                          <input 
                            type="number" className="form-control form-control-sm" 
                            defaultValue={configs.find(c => c.key === "BONUS_AKADEMIK_RO_RATE_1")?.value}
                            step={0.001}
                            onBlur={(e) => handleSave(configs.find(c => c.key === "BONUS_AKADEMIK_RO_RATE_1")?.id, parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* TIER 2 */}
                    <div style={{ minWidth: 280, padding: 16, background: "rgba(99,102,241,0.03)", borderRadius: 12, border: "1px solid var(--ghost-border)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>TIER 2 (L1 &le; Omset &le; L2)</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 2 }}>
                          <label style={{ fontSize: 10, display: "block", marginBottom: 4 }}>Limit 2 (Rp)</label>
                          <input 
                            type="number" className="form-control form-control-sm" 
                            defaultValue={configs.find(c => c.key === "BONUS_AKADEMIK_RO_LIMIT_2")?.value}
                            onBlur={(e) => handleSave(configs.find(c => c.key === "BONUS_AKADEMIK_RO_LIMIT_2")?.id, parseFloat(e.target.value))}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 10, display: "block", marginBottom: 4 }}>Rate (%)</label>
                          <input 
                            type="number" className="form-control form-control-sm" 
                            defaultValue={configs.find(c => c.key === "BONUS_AKADEMIK_RO_RATE_2")?.value}
                            step={0.001}
                            onBlur={(e) => handleSave(configs.find(c => c.key === "BONUS_AKADEMIK_RO_RATE_2")?.id, parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* TIER 3 */}
                    <div style={{ minWidth: 200, padding: 16, background: "rgba(99,102,241,0.03)", borderRadius: 12, border: "1px solid var(--ghost-border)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>TIER 3 (Omset &gt; L2)</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 10, display: "block", marginBottom: 4 }}>Rate (%)</label>
                          <input 
                            type="number" className="form-control form-control-sm" 
                            defaultValue={configs.find(c => c.key === "BONUS_AKADEMIK_RO_RATE_3")?.value}
                            step={0.001}
                            onBlur={(e) => handleSave(configs.find(c => c.key === "BONUS_AKADEMIK_RO_RATE_3")?.id, parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {configs
                .filter(c => c.category === cat)
                .filter(c => !c.key.startsWith("BONUS_AKADEMIK_RO_")) // Hide tiered keys from general list
                .map(c => (
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
                        step={0.001}
                        style={{ paddingRight: 40, fontWeight: 700, textAlign: "right" }}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val !== c.value) handleSave(c.id, val);
                        }}
                      />
                      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                        {c.key.includes("PERCENT") || c.key.includes("RATE") || c.key.includes("BONUS") ? "%" : "Rp"}
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

      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div className="card" style={{ width: 400, padding: 32 }}>
            <h3 style={{ marginTop: 0 }}>Tambah Posisi Baru ({showAddModal})</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="form-label">Nama Posisi</label>
                <input 
                  className="form-control" 
                  placeholder="Contoh: Manager" 
                  value={newItem.label}
                  onChange={e => setNewItem({...newItem, label: e.target.value})}
                />
              </div>
              <div>
                <label className="form-label">Nilai (Rate/Persentase)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Contoh: 0.05 untuk 5%"
                  value={newItem.value}
                  onChange={e => setNewItem({...newItem, value: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <label className="form-label">Keterangan</label>
                <textarea 
                  className="form-control" 
                  placeholder="Deskripsi singkat..."
                  value={newItem.description}
                  onChange={e => setNewItem({...newItem, description: e.target.value})}
                />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleCreate(showAddModal)}>Simpan</button>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(null)}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
