"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { getInitials } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Target, 
  Wallet, 
  FileText, 
  Megaphone, 
  PieChart, 
  GraduationCap, 
  Package, 
  UserCog, 
  LogOut,
  History,
  Download,
  MessageCircle,
  Briefcase
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  hideFor?: string[];
  adminOnly?: boolean;
  akademikOnly?: boolean;
  pengajarOnly?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const navItems: NavGroup[] = [
  { group: "UTAMA", items: [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { href: "/crm", label: "CRM / Leads", icon: <History size={16} />, hideFor: ["PENGAJAR", "AKADEMIK"] },
  ]},
  { group: "KEUANGAN", items: [
    { href: "/pemasukan", label: "Pemasukan", icon: <Wallet size={16} />, hideFor: ["AKADEMIK"] },
    { href: "/pengeluaran", label: "Pengeluaran", icon: <FileText size={16} />, hideFor: ["CS", "PENGAJAR", "AKADEMIK"] },
    { href: "/ads", label: "Spent Ads", icon: <Megaphone size={16} />, hideFor: ["CS", "PENGAJAR", "AKADEMIK"] },
    { href: "/laporan", label: "Laporan Keuangan", icon: <PieChart size={16} />, hideFor: ["CS", "PENGAJAR", "AKADEMIK"] },
    { href: "/refund", label: "Manajemen Refund", icon: <History size={16} />, hideFor: ["PENGAJAR", "AKADEMIK"] },
  ]},
  { group: "AKADEMIK", items: [
    { href: "/siswa", label: "Siswa", icon: <Users size={16} /> },
    { href: "/kelas", label: "Manajemen Kelas", icon: <BookOpen size={16} /> },
    { href: "/program", label: "Produk / Program", icon: <Target size={16} /> },
    { href: "/gaji", label: "Gaji Pengajar", icon: <Briefcase size={16} />, hideFor: ["CS", "PENGAJAR"] },
  ]},
  { group: "PENGAJAR", items: [
    { href: "/pengajar/dashboard", label: "Kelas Saya", icon: <GraduationCap size={16} />, pengajarOnly: true },
  ]},
  { group: "OPERASIONAL", items: [
    { href: "/invoice", label: "Invoice", icon: <FileText size={16} />, hideFor: ["AKADEMIK"] },
    { href: "/inventaris", label: "Inventaris", icon: <Package size={16} />, hideFor: ["CS", "PENGAJAR", "AKADEMIK"] },
  ]},
  { group: "SISTEM", items: [
    { href: "/users", label: "Manajemen User", icon: <UserCog size={16} />, adminOnly: true },
    { href: "/logs", label: "Audit Log", icon: <History size={16} />, adminOnly: true },
    { href: "/admin/archive", label: "Backup & Arsip", icon: <Download size={16} />, adminOnly: true },
    { href: "/settings/wa", label: "Template WhatsApp", icon: <MessageCircle size={16} />, adminOnly: true },
    { href: "/users", label: "Manajemen Pengajar", icon: <UserCog size={16} />, akademikOnly: true },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const name = session?.user?.name ?? "User";

  const getRoleBadgeClass = (r: string) => {
    switch(r) {
      case 'ADMIN': return 'badge-danger';
      case 'AKADEMIK': return 'badge-info';
      case 'PENGAJAR': return 'badge-primary';
      case 'FINANCE': return 'badge-success';
      default: return 'badge-muted';
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
             <GraduationCap size={24} color="white" />
          </div>
          <div className="sidebar-brand-text">
            <strong>Speaking Partner</strong>
            <span>Dashboard System</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((group) => {
          const filteredItems = group.items.filter((item) => {
            if (item.adminOnly && role !== "ADMIN") return false;
            if (item.akademikOnly && role !== "AKADEMIK") return false;
            if (item.pengajarOnly && role !== "PENGAJAR") return false;
            if (item.hideFor?.includes(role)) return false;
            return true;
          });

          if (filteredItems.length === 0) return null;

          return (
            <div key={group.group}>
              <div className="nav-section-label">{group.group}</div>
              {filteredItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${isActive ? "active" : ""}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info" onClick={() => signOut({ callbackUrl: "/login" })} style={{ cursor: 'pointer' }}>
          <div className="user-avatar">
            {getInitials(name)}
          </div>
          <div className="user-details" style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", fontSize: 13 }}>
              {name}
            </strong>
            <span className={`badge ${getRoleBadgeClass(role)}`} style={{ marginTop: 4 }}>
              {role}
            </span>
          </div>
          <LogOut size={16} className="text-muted" />
        </div>
      </div>
    </aside>
  );
}
