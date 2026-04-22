"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Plus, Trash2, Edit3, Save, X, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SubRolePage() {
  const [subRoles, setSubRoles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    roleId: "",
    description: "",
    permissionIds: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [srRes, rRes, pRes] = await Promise.all([
        fetch("/api/admin/sub-roles"),
        fetch("/api/admin/roles"),
        fetch("/api/admin/permissions")
      ]);
      setSubRoles(await srRes.json());
      setRoles(await rRes.json());
      setPermissions(await pRes.json());
    } catch (error) {
      toast.error("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.roleId) {
      toast.error("Nama dan Role Induk wajib diisi");
      return;
    }

    try {
      const res = await fetch("/api/admin/sub-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success("Sub-Role berhasil dibuat");
        setIsModalOpen(false);
        setFormData({ name: "", roleId: "", description: "", permissionIds: [] });
        fetchData();
      } else {
        toast.error("Gagal membuat Sub-Role");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    }
  };

  const togglePermission = (id: string) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(id)
        ? prev.permissionIds.filter(pid => pid !== id)
        : [...prev.permissionIds, id]
    }));
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 className="headline-lg">Manajemen Sub-Role</h1>
          <p className="body-md">Atur kelompok izin (permissions) kustom untuk karyawan Anda.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Tambah Sub-Role
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Nama Sub-Role</th>
                <th>Role Induk</th>
                <th>Deskripsi</th>
                <th style={{ textAlign: 'center' }}>Jumlah Izin</th>
                <th style={{ textAlign: 'center' }}>User</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Memuat data...</td></tr>
              ) : subRoles.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Belum ada sub-role yang dibuat</td></tr>
              ) : subRoles.map((sr) => (
                <tr key={sr.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--on-surface)' }}>{sr.name}</div>
                  </td>
                  <td>
                    <span className="badge badge-secondary">{sr.role?.name}</span>
                  </td>
                  <td>{sr.description || "-"}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-primary">{sr.permissions?.length || 0} Izin</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{sr._count?.users || 0}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="icon-btn" title="Edit"><Edit3 size={16} /></button>
                      <button className="icon-btn text-danger" title="Hapus"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH SUB-ROLE */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 700, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="headline-sm">Buat Sub-Role Baru</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '24px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="form-group">
                  <label>Nama Sub-Role</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: CS Senior" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Role Induk (Default)</label>
                  <select 
                    value={formData.roleId}
                    onChange={(e) => setFormData({...formData, roleId: e.target.value})}
                  >
                    <option value="">Pilih Role...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label>Deskripsi (Opsional)</label>
                <textarea 
                  placeholder="Jelaskan fungsi sub-role ini..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} style={{ color: 'var(--brand-primary)' }} />
                <div style={{ fontWeight: 700 }}>Checklist Izin (Permissions)</div>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: 12, 
                padding: 16, 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: 12,
                maxHeight: 300,
                overflowY: 'auto',
                marginBottom: 32
              }}>
                {permissions.map(p => (
                  <label key={p.id} style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: 12, 
                    padding: 10, 
                    background: formData.permissionIds.includes(p.id) ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    border: formData.permissionIds.includes(p.id) ? '1px solid var(--brand-primary)' : '1px solid transparent',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={formData.permissionIds.includes(p.id)}
                      onChange={() => togglePermission(p.id)}
                      style={{ marginTop: 4 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>{p.description}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">
                  <Save size={18} /> Simpan Sub-Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        .modal-content {
          background: var(--surface-container-high);
          border: 1px solid var(--ghost-border);
          border-radius: 24px;
          padding: 32px;
          box-shadow: var(--shadow-xl);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
