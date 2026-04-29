/**
 * Helper functions untuk multi-role support.
 * Gunakan ini di semua komponen/API yang butuh cek hak akses.
 */

/**
 * Cek apakah user memiliki role tertentu (primary ATAU secondary)
 * @param session - NextAuth session object
 * @param slug - Role slug yang ingin dicek (misal: "cs", "advertiser", "spv_adv")
 */
export function hasRole(session: any, slug: string): boolean {
  if (!session?.user) return false;
  const user = session.user as any;
  const primarySlug = user.roleSlug?.toLowerCase() || "";
  const secondaryRoles: string[] = user.secondaryRoles || [];
  return primarySlug === slug.toLowerCase() || secondaryRoles.map(r => r.toLowerCase()).includes(slug.toLowerCase());
}

/**
 * Ambil semua role yang dimiliki user (primary + secondary)
 */
export function getAllRoles(session: any): string[] {
  if (!session?.user) return [];
  const user = session.user as any;
  const primary = user.roleSlug?.toLowerCase() || "";
  const secondary: string[] = (user.secondaryRoles || []).map((r: string) => r.toLowerCase());
  return Array.from(new Set([primary, ...secondary].filter(Boolean)));
}

/**
 * Cek apakah user adalah supervisor dari departemen tertentu
 */
export function isSPV(session: any, dept: "cs" | "adv" | "multimedia"): boolean {
  return hasRole(session, `spv_${dept}`);
}

/**
 * Daftar semua role yang tersedia di sistem beserta label dan akses yang diberikan
 */
export const ROLE_CONFIG: Record<string, { label: string; color: string; canAccess: string[] }> = {
  admin:           { label: "Admin",           color: "#ef4444", canAccess: ["*"] },
  ceo:             { label: "CEO",             color: "#dc2626", canAccess: ["*"] },
  coo:             { label: "COO",             color: "#b91c1c", canAccess: ["*"] },
  finance:         { label: "Finance",         color: "#f59e0b", canAccess: ["dashboard", "finance_in", "finance_out", "report", "refund", "payroll_staff", "payroll_tutor"] },
  cs:              { label: "CS",              color: "#3b82f6", canAccess: ["dashboard", "crm", "finance_in"] },
  advertiser:      { label: "Advertiser",      color: "#8b5cf6", canAccess: ["dashboard", "ads_spent", "ads_performance"] },
  pengajar:        { label: "Pengajar",        color: "#10b981", canAccess: ["dashboard", "kelas", "siswa"] },
  akademik:        { label: "Akademik",        color: "#06b6d4", canAccess: ["dashboard", "kelas", "siswa", "pengajar", "program"] },
  talent:          { label: "Talent",          color: "#f97316", canAccess: ["dashboard", "live_tracking"] },
  multimedia:      { label: "Multimedia",      color: "#f59e0b", canAccess: ["dashboard", "live_tracking"] },
  spv_cs:          { label: "SPV CS",          color: "#2563eb", canAccess: ["dashboard", "crm", "report"] },
  spv_adv:         { label: "SPV ADV",         color: "#7c3aed", canAccess: ["dashboard", "ads_spent", "ads_performance", "report"] },
  spv_multimedia:  { label: "SPV Multimedia",  color: "#ea580c", canAccess: ["dashboard", "live_tracking", "report"] },
  siswa:           { label: "Siswa",           color: "#64748b", canAccess: ["siswa:dashboard"] },
};
