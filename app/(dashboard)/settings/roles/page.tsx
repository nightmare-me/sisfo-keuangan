"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, Shield, Save, Plus, Trash2, Info } from "lucide-react";

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

  // Form State for editing
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [rolesRes, permsRes] = await Promise.all([
      fetch("/api/roles"),
      fetch("/api/roles?type=permissions")
    ]);
    const rolesData = await rolesRes.json();
    const permsData = await permsRes.json();
    
    setRoles(rolesData);
    setPermissions(permsData);
    
    if (rolesData.length > 0 && !selectedRole) {
      handleSelectRole(rolesData[0]);
    }
    setLoading(true); // Wait, should be false
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

  async function handleSave() {
    if (!selectedRole) return;
    setSaving(true);
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
      alert("Role berhasil diperbarui!");
      fetchData();
    }
    setSaving(false);
  }

  if (loading) return <div className="p-8">Memuat data akses...</div>;

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
            <Shield size={18} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Sistem Keamanan</span>
          </div>
          <h1 className="headline-lg">Pengaturan Role & Hak Akses</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24 }}>
        {/* Sidebar Role List */}
        <div className="card glass" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 14 }}>Daftar Role</strong>
            <button className="btn btn-secondary btn-icon btn-sm"><Plus size={14} /></button>
          </div>
          <div style={{ padding: '8px' }}>
            {roles.map(role => (
              <div 
                key={role.id}
                onClick={() => handleSelectRole(role)}
                className={`nav-item ${selectedRole?.id === role.id ? 'active' : ''}`}
                style={{ cursor: 'pointer', marginBottom: 4, borderRadius: 8 }}
              >
                <Shield size={16} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{role.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{role.slug}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permission Grid */}
        <div className="card glass">
          {selectedRole ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Akses untuk: {selectedRole.name}</h2>
                  <p className="text-muted" style={{ fontSize: 13 }}>Centang modul yang diizinkan untuk role ini.</p>
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSave} 
                  disabled={saving}
                  style={{ padding: '10px 24px', borderRadius: 12 }}
                >
                  <Save size={18} /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {permissions.map(perm => (
                  <div 
                    key={perm.id}
                    onClick={() => togglePermission(perm.id)}
                    style={{ 
                      padding: '16px', 
                      borderRadius: 12, 
                      background: rolePermissions.includes(perm.id) ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${rolePermissions.includes(perm.id) ? 'var(--primary)' : 'transparent'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: 6, 
                      border: '2px solid var(--border-active)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: rolePermissions.includes(perm.id) ? 'var(--primary)' : 'transparent',
                      borderColor: rolePermissions.includes(perm.id) ? 'var(--primary)' : 'var(--border-active)'
                    }}>
                      {rolePermissions.includes(perm.id) && <Check size={14} color="white" strokeWidth={4} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{perm.name}</div>
                      <code style={{ fontSize: 10, opacity: 0.6 }}>{perm.slug}</code>
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: 32, padding: 16, background: 'rgba(245,158,11,0.1)', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                 <Info size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                 <div style={{ fontSize: 13, color: '#d97706' }}>
                    <strong>Penting:</strong> Perubahan hak akses akan berlaku saat user login kembali atau setelah sesi mereka diperbarui. Khusus untuk Role <strong>Administrator</strong>, hak akses tetap terbuka penuh terlepas dari pengaturan ini.
                 </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 64, textAlign: 'center' }}>
              <Shield size={48} className="text-muted" style={{ marginBottom: 16 }} />
              <p>Pilih role di sebelah kiri untuk mengatur hak akses.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
