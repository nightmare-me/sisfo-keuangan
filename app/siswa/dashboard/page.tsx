import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  MessageCircle, 
  Download, 
  GraduationCap, 
  Calendar,
  User,
  Star
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function SiswaDashboard() {
  const session = await auth();
  if (!session || (session?.user as any)?.roleSlug !== "siswa") {
    redirect("/login");
  }

  const siswaId = (session?.user as any)?.id;

  // 1. Ambil Data Murid & Pendaftaran
  const siswa = await prisma.siswa.findUnique({
    where: { id: siswaId },
    include: {
      pendaftaran: {
        include: {
          kelas: {
            include: {
              program: true,
              pengajar: true,
              sesiKelas: {
                include: { absensi: { where: { siswaId } } }
              }
            }
          }
        }
      }
    }
  });

  if (!siswa) return <div>Data tidak ditemukan</div>;

  const kelasAktif = siswa.pendaftaran.filter(p => p.aktif);
  const riwayatKelas = siswa.pendaftaran.filter(p => !p.aktif);

  // 2. Cari CS yang menangani siswa ini (Via Pembayaran terakhir atau Lead)
  const lastPayment = await prisma.pemasukan.findFirst({
    where: { siswaId },
    orderBy: { tanggal: 'desc' },
    include: { cs: true }
  });

  let assignedCS = lastPayment?.cs;
  
  // Jika tidak ada data pembayaran, coba cari via Lead (berdasarkan nomor HP)
  if (!assignedCS && siswa.telepon) {
    const lead = await prisma.lead.findFirst({
      where: { telepon: siswa.telepon },
      include: { cs: true }
    });
    assignedCS = lead?.cs;
  }

  // --- LOGIKA PERHITUNGAN STATS ---
  let totalHadir = 0;
  let totalSesi = 0;
  let totalPoints = 0;
  let gradedSesi = 0;

  siswa.pendaftaran.forEach(p => {
    p.kelas.sesiKelas.forEach(s => {
      const abs = s.absensi[0]; // Karena sudah difilter where siswaId
      if (abs) {
        totalSesi++;
        if (abs.status === "HADIR") totalHadir++;
        
        if (abs.nilaiHuruf) {
          const points: Record<string, number> = { "A": 4, "B": 3, "C": 2, "D": 1, "E": 0 };
          totalPoints += points[abs.nilaiHuruf] ?? 0;
          gradedSesi++;
        }
      }
    });
  });

  const attendanceRate = totalSesi > 0 ? Math.round((totalHadir / totalSesi) * 100) : 0;
  const avgGpa = gradedSesi > 0 ? (totalPoints / gradedSesi) : 0;
  const gpaLabel = avgGpa >= 3.5 ? "A" : avgGpa >= 3 ? "B" : avgGpa >= 2 ? "C" : avgGpa >= 1 ? "D" : gradedSesi > 0 ? "E" : "—";

  return (
    <div className="page-container">
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
        <div>
          <h1 className="headline-lg" style={{ marginBottom: 8, fontSize: '2.5rem' }}>Halo, {siswa.nama}! ✨</h1>
          <p className="body-lg" style={{ opacity: 0.7 }}>Siap untuk melanjutkan petualangan belajarmu hari ini?</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32, alignItems: 'start' }}>
        {/* Main Content */}
        <div>
          {/* Kelas Aktif */}
          <section style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <Clock size={20} style={{ color: 'var(--brand-primary)' }} />
              <h2 className="headline-sm" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Kelas Aktif Kamu</h2>
            </div>
            
            {kelasAktif.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px', border: '1px dashed var(--ghost-border)', background: 'transparent' }}>
                <BookOpen size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                <p style={{ opacity: 0.6, marginBottom: 24 }}>Kamu belum memiliki kelas aktif saat ini.</p>
                
                {assignedCS ? (
                  <div style={{ maxWidth: 400, margin: '0 auto', padding: '24px', background: 'var(--surface-container-high)', borderRadius: 20, border: '1px solid var(--ghost-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, textAlign: 'left' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                        {assignedCS.nama?.charAt(0)}
                      </div>
                      <div>
                        <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>CS Penanggung Jawab:</p>
                        <p style={{ fontWeight: 800, margin: 0 }}>{assignedCS.nama}</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, textAlign: 'left', marginBottom: 20, lineHeight: 1.5 }}>
                      Sudah mendaftar tapi kelas belum muncul? Silakan hubungi CS kamu untuk konfirmasi jadwal.
                    </p>
                    <a 
                      href={`https://wa.me/${assignedCS.noHp?.replace(/\D/g, '')}?text=Halo%20${assignedCS.nama},%20saya%20${siswa.nama}.%20Saya%20sudah%20mendaftar%20tapi%20belum%20dimasukkan%20ke%20kelas%20aktif%20di%20portal.%20Mohon%20bantuannya%20untuk%20cek%20jadwal%20saya.`}
                      target="_blank"
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', borderRadius: 12, padding: '12px' }}
                    >
                      <MessageCircle size={18} /> Chat {assignedCS.nama}
                    </a>
                  </div>
                ) : (
                  <Link href="/program" className="text-primary" style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>Cari Program Baru →</Link>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {kelasAktif.map(p => (
                  <div key={p.id} className="card hover-card" style={{ padding: '24px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className="badge badge-primary" style={{ marginBottom: 12 }}>{p.kelas.program.nama}</span>
                        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{p.kelas.namaKelas}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, opacity: 0.7 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={14} /> {p.kelas.pengajar?.name || "TBA"}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={14} /> {p.kelas.hari}, {p.kelas.jam}</span>
                        </div>
                      </div>
                      <Link href={`/siswa/kelas/${p.id}`} className="btn btn-secondary">
                        Detail Kelas
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Riwayat Belajar */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
              <h2 className="headline-sm" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Riwayat Belajar</h2>
            </div>
            <div className="card">
              <div className="table-wrapper">
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ color: 'var(--on-surface)', fontWeight: 800, opacity: 0.8 }}>Program & Kelas</th>
                      <th style={{ color: 'var(--on-surface)', fontWeight: 800, opacity: 0.8 }}>Periode</th>
                      <th style={{ textAlign: 'center', color: 'var(--on-surface)', fontWeight: 800, opacity: 0.8 }}>Sertifikat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riwayatKelas.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, opacity: 0.5 }}>Belum ada riwayat kelas</td></tr>
                    ) : riwayatKelas.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{p.kelas.program.nama}</div>
                          <div style={{ fontSize: 12, opacity: 0.6 }}>{p.kelas.namaKelas}</div>
                        </td>
                        <td>{p.tanggalMulai ? new Date(p.tanggalMulai).toLocaleDateString("id-ID") : "-"}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="icon-btn" title="Download Sertifikat"><Download size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar Murid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 44 }}>
          {/* My Stats Card */}
          <div className="card" style={{ background: 'var(--surface-container-high)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Performa Belajar</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={16} />
                  </div>
                  <span style={{ fontSize: 14 }}>Rata-rata Nilai</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: 18 }}>{gpaLabel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <span style={{ fontSize: 14 }}>Kehadiran</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: 18 }}>{attendanceRate}%</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
