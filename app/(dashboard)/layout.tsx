import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Providers from "@/components/Providers";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="layout">
        <Sidebar />
        <div className="main-content">
          {children}
        </div>
      </div>
    </Providers>
  );
}
