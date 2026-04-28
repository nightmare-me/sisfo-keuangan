import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { 
  BookOpen, 
  Calendar, 
  User, 
  Clock, 
  FileText, 
  ChevronLeft,
  ExternalLink,
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function SiswaKelasDetail({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).roleSlug !== "siswa") {
    redirect("/login");
  }

  const siswaId = (session.user as any).id;

  // 1. Ambil Data Pendaftaran & Kelas terkait
  const pendaftaran = await prisma.pendaftaran.findUnique({
    where: { id: params.id },
    include: {
      kelas: {
        include: {
          program: true,
          pengajar: true,
          sesiKelas: {
            include: {
              absensi: {
                where: { siswaId }
              }
            },
            orderBy: { tanggal: "desc" }
          },
          materiKelas: {
            orderBy: { createdAt: "desc" }
          }
        }
      }
    }
  });

  if (!pendaftaran || pendaftaran.siswaId !== siswaId) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
           <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: 16 }} />
           <h2 style={{ fontSize: 20, fontWeight: 800 }}>Akses Ditolak</h2>
           <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Kamu tidak terdaftar di kelas ini atau data tidak ditemukan.</p>
           <Link href="/siswa/dashboard" className="btn btn-primary">Kembali ke Dashboard</Link>
        </div>
      </div>
    );
  }

  const { kelas } = pendaftaran;
  const sesiSelesai = kelas.sesiKelas.filter(s => s.status === "SELESAI").length;
  const totalSesiTarget = 24;
  const progressPercent = Math.min(Math.round((sesiSelesai / totalSesiTarget) * 100), 100);

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/siswa/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          <ChevronLeft size={16} /> Kembali ke Dashboard
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="badge badge-primary">{kelas.program.nama}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>ID KELAS: {kelas.id.slice(-6).toUpperCase()}</span>
            </div>
            <h1 className="headline-lg">{kelas.namaKelas}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={16} /> Tutor: {kelas.pengajar?.name || "TBA"}</div>
               <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={16} /> {kelas.hari}, {kelas.jam}</div>
            </div>
          </div>
          {kelas.linkGrup && (
             <a href={kelas.linkGrup.startsWith('http') ? kelas.linkGrup : `https://${kelas.linkGrup}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
                Buka Grup WhatsApp
             </a>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32, alignItems: 'start' }}>
        {/* Main Content: Sesi & Materi */}
        <div>
          {/* Progress Section */}
          <section className="card shadow-glow" style={{ marginBottom: 32, background: 'var(--surface-container-low)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                   <Clock size={18} style={{ color: 'var(--brand-primary)' }} /> Progress Belajar Kamu
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--brand-primary)' }}>{progressPercent}% Terlampaui</span>
             </div>
             <div style={{ width: '100%', height: 10, background: 'var(--surface-container-high)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-primary-light) 100%)', transition: 'width 1s' }} />
             </div>
             <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                Kamu telah menyelesaikan <b>{sesiSelesai}</b> dari estimasi {totalSesiTarget} pertemuan. Terus semangat!
             </p>
          </section>

          {/* Sesi & Nilai Section */}
          <section style={{ marginBottom: 48 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={20} style={{ color: 'var(--brand-primary)' }} /> Riwayat Pertemuan & Nilai
            </h3>
            
            {kelas.sesiKelas.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px', opacity: 0.6 }}>
                 Belum ada riwayat pertemuan untuk kelas ini.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {kelas.sesiKelas.map((s, idx) => {
                  const abs = s.absensi[0];
                  return (
                    <div key={s.id} className="card shadow-hover" style={{ padding: 0, overflow: 'hidden' }}>
                      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-high)' }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-primary-light)', textTransform: 'uppercase' }}>Pertemuan {kelas.sesiKelas.length - idx}</div>
                          <div style={{ fontWeight: 800, fontSize: 16 }}>{s.topik}</div>
                          <div style={{ fontSize: 12, opacity: 0.6 }}>{formatDate(s.tanggal, "dd MMMM yyyy")}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {abs ? (
                            <span className={`badge ${abs.status === 'HADIR' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                               {abs.status}
                            </span>
                          ) : (
                            <span className="badge badge-secondary" style={{ fontSize: 11 }}>BELUM ABSEN</span>
                          )}
                        </div>
                      </div>
                      
                      {abs && (abs.nilaiHuruf || abs.catatan) && (
                        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--ghost-border)', display: 'flex', gap: 16, alignItems: 'center' }}>
                           {abs.nilaiHuruf && (
                             <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, flexShrink: 0 }}>
                               {abs.nilaiHuruf}
                             </div>
                           )}
                           <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Feedback Tutor:</div>
                              <p style={{ fontSize: 14, margin: 0, fontStyle: 'italic', color: 'var(--on-surface)' }}>
                                "{abs.catatan || "Bagus sekali, pertahankan performamu!"}"
                              </p>
                           </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar Murid: Materi & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Materi Section */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
               <BookOpen size={18} style={{ color: 'var(--brand-primary)' }} /> Link Materi & Modul
            </h3>
            {kelas.materiKelas.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Belum ada materi dibagikan.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {kelas.materiKelas.map(m => (
                  <a key={m.id} href={m.urlFile} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    <div className="card shadow-hover" style={{ padding: 12, border: '1px solid var(--ghost-border)', background: 'var(--surface-container-low)' }}>
                       <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{m.judul}</div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontSize: 11, opacity: 0.6 }}>{formatDate(m.createdAt, "dd MMM")}</span>
                         <ExternalLink size={12} style={{ color: 'var(--brand-primary)' }} />
                       </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Info Tutor */}
          <div className="card" style={{ background: 'var(--surface-container-high)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Tentang Tutor</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
               <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--brand-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>
                  {kelas.pengajar?.name?.[0] || "T"}
               </div>
               <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{kelas.pengajar?.name || "Tutor TBA"}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Official Speaking Partner Tutor</div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
