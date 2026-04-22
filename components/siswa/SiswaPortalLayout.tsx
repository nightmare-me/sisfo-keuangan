"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { 
  LayoutDashboard, 
  BookOpen, 
  History, 
  User, 
  LogOut, 
  GraduationCap,
  MessageCircle
} from "lucide-react";
import { getInitials } from "@/lib/utils";

export default function SiswaPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") return <div className="flex items-center justify-center h-screen">Memuat...</div>;
  if (!session || (session.user as any).roleSlug !== "siswa") {
    router.push("/login");
    return null;
  }

  const name = session.user?.name ?? "Siswa";

  const navItems = [
    { href: "/siswa/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/siswa/kelas", label: "Kelas Saya", icon: <BookOpen size={18} /> },
    { href: "/siswa/riwayat", label: "Riwayat Belajar", icon: <History size={18} /> },
    { href: "/siswa/profil", label: "Profil Saya", icon: <User size={18} /> },
  ];

  return (
    <div className="layout">
      {/* Sidebar Siswa */}
      <aside className="sidebar" style={{ width: 'var(--sidebar-width)', borderRight: '1px solid var(--ghost-border)', background: 'var(--surface-container-low)' }}>
        <div className="sidebar-brand" style={{ padding: '32px 24px' }}>
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <GraduationCap size={24} />
            </div>
            <div>
              <strong style={{ fontSize: 18, display: 'block' }}>SP Portal</strong>
              <span style={{ fontSize: 12, opacity: 0.6 }}>Student Access</span>
            </div>
          </div>
        </div>

        <nav style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? "active" : ""}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12,
                  textDecoration: 'none', color: isActive ? 'var(--brand-primary)' : 'var(--on-surface-variant)',
                  background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent', fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.2s'
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', padding: '24px', borderTop: '1px solid var(--ghost-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div className="user-avatar" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {getInitials(name)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>Siswa Aktif</div>
            </div>
          </div>
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Floating Chat Button */}
      <a 
        href="https://wa.me/6281234567890?text=Halo%20Admin%20Customer%20Care%2C%20saya%20ingin%20bertanya..." 
        target="_blank"
        style={{ 
          position: 'fixed', 
          bottom: '32px', 
          right: '32px', 
          zIndex: 100,
          background: '#25D366', 
          color: 'white', 
          padding: '16px 28px', 
          borderRadius: 'var(--radius-full)',
          display: 'flex', 
          alignItems: 'center', 
          gap: 10,
          fontWeight: 700,
          boxShadow: '0 8px 24px rgba(37, 211, 102, 0.3)',
          textDecoration: 'none',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageCircle size={22} /> Chat Customer Care
      </a>
    </div>
  );
}
