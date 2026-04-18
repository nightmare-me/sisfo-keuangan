"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { getInitials, hasPermission } from "@/lib/utils";
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
  Briefcase, 
  TrendingUp, 
  Clock 
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  permission?: string; // Hak akses yang dibutuhkan
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const navItems: NavGroup[] = [
  { group: "UTAMA", items: [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} />, permission: "dashboard:view" },
    { href: "/crm", label: "CRM / Leads", icon: <History size={16} />, permission: "crm:view" },
  ]},
  { group: "KEUANGAN", items: [
    { href: "/pemasukan", label: "Pemasukan", icon: <Wallet size={16} />, permission: "finance:view" },
    { href: "/pengeluaran", label: "Pengeluaran", icon: <FileText size={16} />, permission: "finance:edit" },
    { href: "/ads", label: "Spent Ads", icon: <Megaphone size={16} />, permission: "finance:view" },
    { href: "/ads/performance", label: "Performa Iklan", icon: <TrendingUp size={16} />, permission: "ads:manage" },
    { href: "/laporan-keuangan", label: "Laporan Keuangan", icon: <PieChart size={16} />, permission: "report:view" },
    { href: "/refund", label: "Manajemen Refund", icon: <History size={16} />, permission: "refund:approve" },
    { href: "/payroll/staff", label: "Payroll Staf", icon: <Briefcase size={16} />, permission: "payroll:view" },
  ]},
  { group: "AKADEMIK", items: [
    { href: "/siswa", label: "Siswa", icon: <Users size={16} />, permission: "siswa:view" },
    { href: "/kelas", label: "Manajemen Kelas", icon: <BookOpen size={16} />, permission: "kelas:manage" },
    { href: "/program", label: "Produk / Program", icon: <Target size={16} />, permission: "kelas:manage" },
    { href: "/gaji", label: "Payroll Pengajar", icon: <Wallet size={16} />, permission: "payroll:manage" },
  ]},
  { group: "PENGAJAR", items: [
    { href: "/pengajar/dashboard", label: "Kelas Saya", icon: <GraduationCap size={16} />, permission: "pengajar:view" },
  ]},
  { group: "OPERASIONAL", items: [
    { href: "/invoice", label: "Invoice", icon: <FileText size={16} />, permission: "finance:view" },
    { href: "/inventaris", label: "Inventaris", icon: <Package size={16} />, permission: "finance:view" },
    { href: "/staff/live", label: "Input Jam Live", icon: <Clock size={16} />, permission: "payroll:manage" },
  ]},
  { group: "SISTEM", items: [
    { href: "/users", label: "Manajemen User", icon: <UserCog size={16} />, permission: "user:manage" },
    { href: "/settings/roles", label: "Pengaturan Role", icon: <Package size={16} />, permission: "settings:manage" },
    { href: "/logs", label: "Audit Log", icon: <History size={16} />, permission: "user:manage" },
    { href: "/admin/archive", label: "Backup & Arsip", icon: <Download size={16} />, permission: "user:manage" },
    { href: "/settings/wa", label: "Template WhatsApp", icon: <MessageCircle size={16} />, permission: "user:manage" },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const name = session?.user?.name ?? "User";

  const getRoleBadgeClass = (r: string) => {
    switch(r) {
      case 'admin': return 'badge-danger';
      case 'finance': return 'badge-success';
      case 'cs': return 'badge-info';
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
            // Pengecekan via permission
            if (item.permission) {
              return hasPermission(session, item.permission);
            }
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
            <span className={`badge ${getRoleBadgeClass(role)}`} style={{ marginTop: 4, textTransform: 'uppercase' }}>
              {role}
            </span>
          </div>
          <LogOut size={16} className="text-muted" />
        </div>
      </div>
    </aside>
  );
}
