"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Save, Plus, Trash2, Smartphone } from "lucide-react";

import { useSession } from "next-auth/react";

export default function WATemplateSettings() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role?.toUpperCase();
  const isAdmin = ["ADMIN", "CEO"].includes(role);

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/wa-templates")
      .then(async r => {
        if (!r.ok) return [];
        const text = await r.text();
        return text ? JSON.parse(text) : [];
      })
      .then(d => { setTemplates(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleUpdate(id: string, label: string, text: string) {
    setSavingId(id);
    await fetch("/api/settings/wa-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label, text })
    });
    setSavingId(null);
  }

  async function handleAdd() {
    const res = await fetch("/api/settings/wa-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Template Baru", text: "Isi pesan di sini..." })
    });
    const newItem = await res.json();
    setTemplates([...templates, newItem]);
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--success)", marginBottom: 8 }}>
             <MessageCircle size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>CRM Configuration</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>WhatsApp Templates</h1>
          <p className="body-lg" style={{ margin: 0 }}>Kelola pesan otomatis untuk mempermudah CS berinteraksi dengan Lead</p>
        </div>
        <button className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)' }} onClick={handleAdd}>
           <Plus size={18} /> Tambah Template
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        <div style={{ display: 'grid', gap: 24 }}>
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 20 }} />)
          ) : templates.map((template, idx) => (
            <div key={template.id} className="card" style={{ padding: 32, margin: 0 }}>
              <div style={{ display: 'flex', gap: 32 }}>
                 <div style={{ flex: 1 }}>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">Label Template</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={template.label} 
                        onChange={e => {
                          const newT = [...templates];
                          newT[idx].label = e.target.value;
                          setTemplates(newT);
                        }}
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Isi Pesan (WA)</label>
                      <textarea 
                        className="form-control" 
                        rows={4} 
                        value={template.text} 
                        onChange={e => {
                          const newT = [...templates];
                          newT[idx].text = e.target.value;
                          setTemplates(newT);
                        }}
                        style={{ fontSize: 14, lineHeight: 1.6 }}
                      />
                      <div style={{ fontSize: 11, color: 'var(--secondary)', marginTop: 8 }}>
                        Variabel tersedia: <strong>[nama]</strong>, <strong>[program]</strong>, <strong>[nominal]</strong>
                      </div>
                    </div>
                 </div>
                 <div style={{ width: 140, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', borderRadius: 12 }}
                      onClick={() => handleUpdate(template.id, template.label, template.text)}
                      disabled={savingId === template.id}
                    >
                      <Save size={16} /> {savingId === template.id ? "..." : "Simpan"}
                    </button>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--ghost-border)' }}>
                       <Smartphone size={32} color="var(--ghost-border)" />
                    </div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
