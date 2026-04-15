"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { getInitials } from "@/lib/utils";

const navItems = [
  { group: "UTAMA", items: [
    { href: "/dashboard", label: "Dashboard", icon: "⚡" },
  ]},
  { group: "KEUANGAN", items: [
    { href: "/pemasukan", label: "Pemasukan", icon: "💰", hideFor: ["AKADEMIK"] },
    { href: "/pengeluaran", label: "Pengeluaran", icon: "💸", hideFor: ["CS", "PENGAJAR", "AKADEMIK"] },
    { href: "/ads", label: "Spent Ads", icon: "📣", hideFor: ["CS", "PENGAJAR", "AKADEMIK"] },
    { href: "/laporan", label: "Laporan Keuangan", icon: "📊", hideFor: ["CS", "PENGAJAR", "AKADEMIK"] },
  ]},
  { group: "AKADEMIK", items: [
    { href: "/siswa", label: "Siswa", icon: "👨‍🎓" },
    { href: "/kelas", label: "Kelas", icon: "📚" },
    { href: "/program", label: "Produk / Program", icon: "🎯" },
    { href: "/gaji", label: "Gaji Pengajar", icon: "👨‍🏫", hideFor: ["CS", "PENGAJAR"] },
  ]},
  { group: "OPERASIONAL", items: [
    { href: "/invoice", label: "Invoice", icon: "🧾", hideFor: ["AKADEMIK"] },
    { href: "/inventaris", label: "Inventaris", icon: "📦", hideFor: ["CS", "PENGAJAR", "AKADEMIK"] },
  ]},
  { group: "SISTEM", items: [
    { href: "/users", label: "Manajemen User", icon: "👤", adminOnly: true },
    { href: "/users", label: "Manajemen Pengajar", icon: "👨‍🏫", akademikOnly: true },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const name = session?.user?.name ?? "User";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🎓</div>
          <div className="sidebar-brand-text">
            <strong>Speaking Partner</strong>
            <span>by Kampung Inggris</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((group) => (
          <div key={group.group}>
            <div className="nav-section-label">{group.group}</div>
            {group.items
              .filter((item) => {
                if ((item as any).adminOnly && role !== "ADMIN") return false;
                if ((item as any).akademikOnly && role !== "AKADEMIK") return false;
                if (!(item as any).akademikOnly && role === "AKADEMIK" && (item as any).adminOnly === undefined && false) return false;
                if ((item as any).hideFor?.includes(role)) return false;
                return true;
              })
              .map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${isActive ? "active" : ""}`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info" onClick={() => signOut({ callbackUrl: "/login" })}>
          <div className="user-avatar">
            {getInitials(name)}
          </div>
          <div className="user-details" style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
              {name}
            </strong>
            <span>{role}</span>
          </div>
          <span style={{ fontSize: 14, color: "var(--text-muted)" }}>→</span>
        </div>
      </div>
    </aside>
  );
}
