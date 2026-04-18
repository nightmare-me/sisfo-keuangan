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
  Clock,
  Contact
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
    { href: "/pemasukan", label: "Pemasukan", icon: <Wallet size={16} />, permission: "finance_in:view" },
    { href: "/pengeluaran", label: "Pengeluaran", icon: <FileText size={16} />, permission: "finance_out:view" },
    { href: "/ads", label: "Spent Ads", icon: <Megaphone size={16} />, permission: "ads_spent:view" },
    { href: "/ads/performance", label: "Performa Iklan", icon: <TrendingUp size={16} />, permission: "ads_performance:view" },
    { href: "/laporan-keuangan", label: "Laporan Keuangan", icon: <PieChart size={16} />, permission: "report:view" },
    { href: "/refund", label: "Manajemen Refund", icon: <History size={16} />, permission: "refund:view" },
    { href: "/payroll/staff", label: "Payroll Staf", icon: <Briefcase size={16} />, permission: "payroll_staff:view" },
  ]},
  { group: "AKADEMIK", items: [
    { href: "/siswa", label: "Siswa", icon: <Users size={16} />, permission: "siswa:view" },
    { href: "/kelas", label: "Manajemen Kelas", icon: <BookOpen size={16} />, permission: "kelas:view" },
    { href: "/program", label: "Produk / Program", icon: <Target size={16} />, permission: "program:view" },
    { href: "/gaji", label: "Payroll Pengajar", icon: <Wallet size={16} />, permission: "payroll_tutor:view" },
  ]},
  { group: "PENGAJAR", items: [
    { href: "/pengajar/dashboard", label: "Kelas Saya", icon: <GraduationCap size={16} />, permission: "pengajar:view" },
  ]},
  { group: "OPERASIONAL", items: [
    { href: "/invoice", label: "Invoice", icon: <FileText size={16} />, permission: "invoice:view" },
    { href: "/inventaris", label: "Inventaris", icon: <Package size={16} />, permission: "inventaris:view" },
    { href: "/staff/live", label: "Input Jam Live", icon: <Clock size={16} />, permission: "live_tracking:view" },
  ]},
  { group: "SISTEM", items: [
    { href: "/users", label: "Manajemen User", icon: <UserCog size={16} />, permission: "user:view" },
    { href: "/karyawan", label: "Data Karyawan", icon: <Contact size={16} />, permission: "user:view" }, // Use user:view for now to ensure it shows up for admins
    { href: "/settings/roles", label: "Pengaturan Role", icon: <Package size={16} />, permission: "settings:view" },
    { href: "/logs", label: "Audit Log", icon: <History size={16} />, permission: "audit:view" },
    { href: "/admin/archive", label: "Backup & Arsip", icon: <Download size={16} />, permission: "archive:view" },
    { href: "/settings/wa", label: "Template WhatsApp", icon: <MessageCircle size={16} />, permission: "wa_template:view" },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/profile" className="user-info" style={{ flex: 1, textDecoration: 'none' }}>
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
          </Link>
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn btn-secondary btn-icon" 
            style={{ width: 42, height: 42, borderRadius: 12, padding: 0 }}
            title="Keluar dari Sistem"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
