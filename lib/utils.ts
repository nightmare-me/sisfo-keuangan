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

export function formatDate(date: Date | string, fmt = "dd MMM yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt, { locale: id });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy HH:mm", { locale: id });
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

export function hasPermission(session: any, permissionSlug: string): boolean {
  if (!session?.user) return false;
  
  const userRole = (session.user as any).role;
  const userPermissions = (session.user as any).permissions || [];
  
  // Administrator bypass: has all permissions
  if (userRole === 'ADMIN' || userRole === 'admin') return true;
  
  return userPermissions.includes(permissionSlug);
}
