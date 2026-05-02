import { format, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { id } from "date-fns/locale";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string | null | undefined, fmt = "dd MMM yyyy"): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (isNaN(d.getTime())) return "-";
    return format(d, fmt, { locale: id });
  } catch (e) {
    return "-";
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (isNaN(d.getTime())) return "-";
    return format(d, "dd MMM yyyy HH:mm", { locale: id });
  } catch (e) {
    return "-";
  }
}

export function getDateRange(type: "today" | "week" | "month" | "custom", from?: string, to?: string) {
  const now = new Date();
  switch (type) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "custom":
      return {
        from: from ? startOfDay(parseISO(from)) : startOfMonth(now),
        to: to ? endOfDay(parseISO(to)) : endOfMonth(now),
      };
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${year}${month}${day}-${random}`;
}

export function generateSiswaNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `SP-${year}-${random}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function calculateLaba(pemasukan: number, pengeluaran: number, ads: number): number {
  return pemasukan - pengeluaran - ads;
}

export function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export const SUPER_ROLES = ["ADMIN", "CEO", "COO", "FINANCE"];

export function hasPermission(session: any, permissionSlug: string): boolean {
  if (!session?.user) return false;
  
  const userRole = (session.user as any).role?.toUpperCase();
  const userPermissions = (session.user as any).permissions || [];
  
  // Superuser bypass: Certain roles have full access automatically
  if (SUPER_ROLES.includes(userRole)) return true;
  
  // Fallback for roles that might not have DB permissions seeded properly
  const primaryRole = (session.user as any).roleSlug?.toLowerCase() || "";
  const secondaryRoles = ((session.user as any).secondaryRoles || []).map((r: string) => r.toLowerCase());
  const allRoles = [primaryRole, ...secondaryRoles];

  if (allRoles.includes("pengajar") && ["pengajar:view"].includes(permissionSlug)) return true;
  if (allRoles.includes("siswa") && permissionSlug === "siswa:dashboard") return true;
  if (allRoles.includes("talent") && ["dashboard:view", "live_tracking:view", "multimedia:view"].includes(permissionSlug)) return true;
  if (allRoles.includes("multimedia") && ["dashboard:view", "live_tracking:view", "multimedia:view", "multimedia:metrics"].includes(permissionSlug)) return true;
  if (allRoles.includes("spv_multimedia")) {
    if (permissionSlug === "report:view") return false; // Force hide Keuangan
    if (["dashboard:view", "live_tracking:view", "multimedia:view", "multimedia:metrics"].includes(permissionSlug)) return true;
  }
  if (allRoles.includes("spv_cs") && ["dashboard:view", "crm:view", "report:view"].includes(permissionSlug)) return true;
  if (allRoles.includes("spv_adv") && ["dashboard:view", "ads_spent:view", "report:view"].includes(permissionSlug)) return true;
  if (allRoles.includes("advertiser") && ["dashboard:view", "ads_spent:view"].includes(permissionSlug)) return true;

  return userPermissions.includes(permissionSlug);
}
