import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { User, Mail, Phone, MapPin, Calendar, Shield, Save } from "lucide-react";

export default async function SiswaProfil() {
  const session = await auth();
  if (!session || (session.user as any).roleSlug !== "siswa") {
    redirect("/login");
  }

  const siswaId = (session.user as any).id;

  const siswa = await prisma.siswa.findUnique({
    where: { id: siswaId }
  });

  if (!siswa) return <div>Data tidak ditemukan</div>;

  return (
    <div className="page-container">
      <div style={{ marginBottom: 32 }}>
        <h1 className="headline-lg">Profil Saya</h1>
        <p className="body-md">Kelola informasi data dirimu di Speaking Partner.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 32 }}>
        {/* Profile Card */}
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ 
            width: 100, height: 100, borderRadius: '50%', background: 'var(--brand-primary)', 
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, fontWeight: 800, margin: '0 auto 24px'
          }}>
            {siswa.nama.charAt(0)}
          </div>
          <h2 className="headline-sm" style={{ marginBottom: 4 }}>{siswa.nama}</h2>
          <p style={{ color: 'var(--brand-primary)', fontWeight: 700, fontSize: 14 }}>{siswa.noSiswa}</p>
          <div style={{ marginTop: 24, padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, fontSize: 13, opacity: 0.7 }}>
            Terdaftar sejak {new Date(siswa.tanggalDaftar).toLocaleDateString("id-ID", { month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Details Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <User size={20} style={{ color: 'var(--brand-primary)' }} /> Informasi Dasar
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mail size={14} /> Email
                </label>
                <input type="text" className="form-control" value={siswa.email || "-"} disabled />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={14} /> WhatsApp
                </label>
                <input type="text" className="form-control" value={siswa.telepon || "-"} disabled />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={14} /> Tanggal Lahir
                </label>
                <input type="text" className="form-control" value={siswa.tanggalLahir ? new Date(siswa.tanggalLahir).toLocaleDateString("id-ID") : "-"} disabled />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={14} /> Alamat
                </label>
                <input type="text" className="form-control" value={siswa.alamat || "-"} disabled />
              </div>
            </div>
            <p style={{ fontSize: 12, opacity: 0.5, marginTop: 20 }}>* Untuk perubahan data di atas, silakan hubungi Customer Care.</p>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={20} style={{ color: 'var(--brand-primary)' }} /> Keamanan Akun
            </h3>
            <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Password Saat Ini</label>
                <input type="password" placeholder="••••••••" className="form-control" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Password Baru</label>
                  <input type="password" placeholder="••••••••" className="form-control" />
                </div>
                <div className="form-group">
                  <label className="form-label">Konfirmasi Password Baru</label>
                  <input type="password" placeholder="••••••••" className="form-control" />
                </div>
              </div>
              <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 10, gap: 8 }}>
                <Save size={18} /> Simpan Password Baru
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
