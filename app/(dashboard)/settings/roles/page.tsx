"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, Shield, Save, Plus, Info } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Permission {
  id: string;
  name: string;
  slug: string;
}

interface Role {
  id: string;
  name: string;
  slug: string;
  description: string;
  permissions: Permission[];
}

export default function RolesPage() {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: () => {}, type: "danger" as "danger" | "warning" | "info" });

  const modules = [
    { name: 'Dashboard', slug: 'dashboard' },
    { name: 'CRM / Lead', slug: 'crm' },
    { name: 'Pemasukan', slug: 'finance_in' },
    { name: 'Pengeluaran', slug: 'finance_out' },
    { name: 'Spent Ads', slug: 'ads_spent' },
    { name: 'Performa Iklan', slug: 'ads_performance' },
    { name: 'Laporan Keuangan', slug: 'report' },
    { name: 'Manajemen Refund', slug: 'refund' },
    { name: 'Payroll Staff', slug: 'payroll_staff' },
    { name: 'Siswa', slug: 'siswa' },
    { name: 'Manajemen kelas', slug: 'kelas' },
    { name: 'Produk / Program', slug: 'program' },
    { name: 'Payroll Pengajar', slug: 'payroll_tutor' },
    { name: 'Kelas Saya', slug: 'pengajar' },
    { name: 'Invoice', slug: 'invoice' },
    { name: 'Inventaris', slug: 'inventaris' },
    { name: 'Input Jam Live', slug: 'live_tracking' },
    { name: 'Manajemen User', slug: 'user' },
    { name: 'Pengaturan Role', slug: 'settings' },
    { name: 'Audit Log', slug: 'audit' },
    { name: 'Backup & Arsip', slug: 'archive' },
    { name: 'Template Whatsapp', slug: 'wa_template' },
  ];

  const actions = [
    { label: 'View', slug: 'view' },
    { label: 'Edit', slug: 'edit' },
    { label: 'Delete', slug: 'delete' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch("/api/roles"),
        fetch("/api/roles?type=permissions")
      ]);
      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();
      
      const rolesArr = Array.isArray(rolesData) ? rolesData : [];
      setRoles(rolesArr);
      setPermissions(Array.isArray(permsData) ? permsData : []);
      
      if (rolesArr.length > 0 && !selectedRole) {
        handleSelectRole(rolesArr[0]);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
    setLoading(false);
  }

  function handleSelectRole(role: Role) {
    setSelectedRole(role);
    setRolePermissions(role.permissions.map(p => p.id));
  }

  function togglePermission(permId: string) {
    setRolePermissions(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  }

  function getPermIdByModuleAction(modSlug: string, actSlug: string): string | null {
    const combinedSlug = `${modSlug}:${actSlug}`;
    const p = permissions.find(p => p.slug === combinedSlug);
    return p ? p.id : null;
  }

  async function handleSave() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRole.id,
          name: selectedRole.name,
          slug: selectedRole.slug,
          permissionIds: rolePermissions
        })
      });
      if (res.ok) {
        setConfirmModal({
          show: true,
          title: "Berhasil Update",
          message: "✅ Matriks akses berhasil diperbarui dan diterapkan ke sistem.",
          type: "success" as any,
          onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
        });
        fetchData();
      }
    } catch (error) {
      setConfirmModal({
        show: true,
        title: "Gagal Update",
        message: "❌ Terjadi kesalahan server saat menyimpan perubahan matriks.",
        type: "danger",
        onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
      });
    }
    setSaving(false);
  }

  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName) return;
    setSaving(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName, permissionIds: [] })
      });
      if (res.ok) {
        setNewRoleName("");
        setShowAddModal(false);
        fetchData();
      }
    } catch (error) {
      setConfirmModal({
        show: true,
        title: "Gagal Tambah Role",
        message: "❌ Gagal membuat role baru di database.",
        type: "danger",
        onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
      });
    }
    setSaving(false);
  }

  if (loading) return <div className="p-12 text-center">Memuat Matriks Keamanan...</div>;

  return (
    <div className="page-container">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
            <Shield size={18} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Master Controls</span>
          </div>
          <h1 className="headline-lg">Role & Permission Matrix</h1>
        </div>
        
        {selectedRole && (
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 28px', borderRadius: 12, boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}
          >
            {saving ? "Menyimpan..." : <><Save size={18} /> Simpan Matriks Akses</>}
          </button>
        )}
      </div>

      <div className="panel-grid-2" style={{ alignItems: 'start' }}>
        <div className="card glass" style={{ padding: 0, position: 'sticky', top: 24 }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.6 }}>DAFTAR ROLE</span>
            <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setShowAddModal(true)}><Plus size={14} /></button>
          </div>
          <div style={{ padding: '8px' }}>
            {roles.map(role => (
              <div 
                key={role.id}
                onClick={() => handleSelectRole(role)}
                className={`nav-item ${selectedRole?.id === role.id ? 'active' : ''}`}
                style={{ cursor: 'pointer', marginBottom: 4, borderRadius: 10, height: 52, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}
              >
                <Shield size={18} />
                <span style={{ fontWeight: 600 }}>{role.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Tambah Role */}
        {showAddModal && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 400 }}>
              <div className="modal-header">
                <div className="modal-title">Tambah Role Baru</div>
                <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
              </div>
              <form onSubmit={handleAddRole}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label required">Nama Role</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Contoh: CEO, Marketing Staff..." 
                      value={newRoleName} 
                      onChange={e => setNewRoleName(e.target.value)} 
                      required 
                      autoFocus
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "..." : "Tambah Role"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {selectedRole ? (
            <div className="card glass" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid var(--border-default)' }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Konfigurasi Akses: {selectedRole.name}</h2>
                <p className="text-muted" style={{ fontSize: 13 }}>Centang kotak di bawah modul untuk memberikan izin spesifik.</p>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ textAlign: 'left', padding: '16px 32px', fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>NAMA MODUL</th>
                      {actions.map(act => (
                        <th key={act.slug} style={{ textAlign: 'center', padding: '16px', fontSize: 12, fontWeight: 800, width: 120 }}>
                          {act.label.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((mod) => (
                      <tr key={mod.slug} style={{ borderTop: '1px solid var(--border-default)' }}>
                        <td style={{ padding: '16px 32px' }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{mod.name}</span>
                        </td>
                        {actions.map(act => {
                          const permId = getPermIdByModuleAction(mod.slug, act.slug);
                          const isChecked = permId ? rolePermissions.includes(permId) : false;
                          
                          return (
                            <td key={act.slug} style={{ textAlign: 'center', padding: '12px' }}>
                              {permId ? (
                                <div 
                                  onClick={() => togglePermission(permId)}
                                  style={{ 
                                    width: 24, 
                                    height: 24, 
                                    margin: '0 auto',
                                    borderRadius: 7, 
                                    border: '2px solid var(--border-active)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    background: isChecked ? 'var(--primary)' : 'transparent',
                                    borderColor: isChecked ? 'var(--primary)' : 'var(--border-active)',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                  }}
                                >
                                  {isChecked && <Check size={14} color="white" strokeWidth={4} />}
                                </div>
                              ) : (
                                <span style={{ opacity: 0.2 }}>—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: 16, background: 'rgba(245,158,11,0.05)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.2)' }}>
                   <Info size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
                   <div style={{ fontSize: 13, color: '#b45309', lineHeight: 1.6 }}>
                       User dengan role <strong>Admin</strong> akan memiliki akses penuh bypass. Untuk role lain, perubahan tombol <strong>Delete</strong> dapat menghapus data permanen.
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card glass" style={{ padding: 80, textAlign: 'center' }}>
              <Shield size={64} className="text-muted" style={{ marginBottom: 24, opacity: 0.2 }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Belum Ada Role Terpilih</h3>
              <p className="text-muted">Klik salah satu nama role di panel kiri untuk mulai mengatur konfigurasi hak akses matriks.</p>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal 
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() => setConfirmModal({ ...confirmModal, show: false })}
        onConfirm={confirmModal.onConfirm}
        type={confirmModal.type}
        loading={saving}
      />
    </div>
  );
}
