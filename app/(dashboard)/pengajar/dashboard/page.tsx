"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PengajarDashboard() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "Tutor";
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

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">Halo, {userName}! 👋</div>
          <div className="topbar-subtitle">Selamat datang di Dashboard Pengajar</div>
        </div>
      </div>

      <div className="page-container">
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Daftar Kelas Aktif (Kelas Saya)</h2>
        
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}
          </div>
        ) : kelasData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>Belum Ada Kelas</h3>
            <p>Anda belum di-assign ke kelas aktif manapun saat ini.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
            {kelasData.map(kelas => (
              <div key={kelas.id} className="card" style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>{kelas.namaKelas}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{kelas.program?.nama ?? "Bebas"}</div>
                  </div>
                  <span className="badge badge-success">AKTIF</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    📅 <span style={{ fontWeight: 600 }}>{kelas.hari ? `${kelas.hari}, ${kelas.jam}` : kelas.jadwal || "Belum ada jadwal"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    👥 <span style={{ fontWeight: 600 }}>{kelas._count?.pendaftaran ?? 0} Siswa Terdaftar</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--brand-primary)" }}>
                    📝 <span style={{ fontWeight: 600 }}>{kelas._count?.sesiKelas ?? 0} Sesi Selesai / Terjadwal</span>
                  </div>
                  {kelas.linkGrup && (
                    <div style={{ marginTop: 4 }}>
                      <a href={kelas.linkGrup.startsWith('http') ? kelas.linkGrup : `https://${kelas.linkGrup}`} target="_blank" rel="noreferrer" style={{color: "#3b82f6", textDecoration: "none", fontSize: 12, fontWeight: 600}}>
                        📱 Buka Grup WhatsApp
                      </a>
                    </div>
                  )}
                </div>

                <Link href={`/pengajar/kelas/${kelas.id}`} style={{ textDecoration: "none" }}>
                  <button className="btn btn-primary" style={{ width: "100%" }}>Masuk ke Kelas ➡️</button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
