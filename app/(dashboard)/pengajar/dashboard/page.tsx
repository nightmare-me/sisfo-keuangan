"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { GraduationCap, Users, BookOpen, Clock, ArrowRight } from "lucide-react";
import PayrollEstimate from "@/components/dashboard/PayrollEstimate";

export default function PengajarDashboard() {
  const { data: session } = useSession();
  const userName = session?.user?.name?.split(' ')[0] ?? "Tutor";
  const [kelasData, setKelasData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pengajar/kelas-saya")
      .then((res) => res.json())
      .then((data) => {
        setKelasData(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalSiswa = kelasData.reduce((acc, k) => acc + (k._count?.pendaftaran || 0), 0);
  const totalSesi = kelasData.reduce((acc, k) => acc + (k._count?.sesiKelas || 0), 0);

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="headline-lg" style={{ marginBottom: 8 }}>Halo, {userName}! 👋</h1>
        <p className="body-lg" style={{ color: "var(--text-muted)" }}>Berikut adalah ringkasan kelas dan performa mengajar Anda.</p>
      </div>

      {/* Payroll Transparency */}
      <div style={{ marginBottom: 32 }}>
        <PayrollEstimate />
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 32 }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}><BookOpen size={20} /></div>
          <div className="kpi-label">Kelas Aktif</div>
          <div className="kpi-value">{kelasData.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}><Users size={20} /></div>
          <div className="kpi-label">Total Murid</div>
          <div className="kpi-value">{totalSiswa}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}><Clock size={20} /></div>
          <div className="kpi-label">Total Sesi Selesai</div>
          <div className="kpi-value">{totalSesi}</div>
        </div>
      </div>

      {/* Daftar Kelas */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Kelas Saya</h2>
      </div>
      
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 24 }} />)}
        </div>
      ) : kelasData.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Belum Ada Kelas</h3>
          <p style={{ color: 'var(--text-muted)' }}>Anda belum di-assign ke kelas aktif manapun saat ini.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 20 }}>
          {kelasData.map(kelas => (
            <div key={kelas.id} className="card shadow-hover" style={{ display: "flex", flexDirection: "column", transition: 'all 0.3s' }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: "var(--on-surface)" }}>{kelas.namaKelas}</div>
                  <div style={{ fontSize: 13, color: "var(--brand-primary-light)", fontWeight: 600, marginTop: 2 }}>{kelas.program?.nama ?? "General Program"}</div>
                </div>
                <span className="badge badge-success" style={{ padding: '4px 12px', borderRadius: 8 }}>AKTIF</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CalendarIcon size={16} /> 
                  <span>{kelas.hari ? `${kelas.hari}, ${kelas.jam}` : kelas.jadwal || "Belum ada jadwal"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Users size={16} /> 
                  <span>{kelas._count?.pendaftaran ?? 0} Siswa Terdaftar</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <GraduationCap size={16} /> 
                  <span>{kelas._count?.sesiKelas ?? 0} Sesi Selesai</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Link href={`/pengajar/kelas/${kelas.id}`} style={{ flex: 1 }}>
                  <button className="btn btn-primary" style={{ width: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    Masuk Kelas <ArrowRight size={16} />
                  </button>
                </Link>
                {kelas.linkGrup && (
                  <a href={kelas.linkGrup.startsWith('http') ? kelas.linkGrup : `https://${kelas.linkGrup}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-icon" title="Grup WhatsApp">
                    📱
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
  );
}
