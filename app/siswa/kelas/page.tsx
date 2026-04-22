import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookOpen, User, Calendar, MapPin } from "lucide-react";
import Link from "next/link";

export default async function SiswaKelas() {
  const session = await auth();
  if (!session || (session.user as any).roleSlug !== "siswa") {
    redirect("/login");
  }

  const siswaId = (session.user as any).id;

  const pendaftarans = await prisma.pendaftaran.findMany({
    where: { 
      siswaId,
      aktif: true 
    },
    include: {
      kelas: {
        include: { 
          program: true,
          pengajar: true
        }
      }
    }
  });

  return (
    <div className="page-container">
      <div style={{ marginBottom: 32 }}>
        <h1 className="headline-lg">Kelas Saya</h1>
        <p className="body-md">Daftar kelas yang sedang kamu ikuti saat ini.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
        {pendaftarans.length === 0 ? (
          <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '64px' }}>
            <BookOpen size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
            <p className="body-lg">Kamu belum terdaftar di kelas aktif mana pun.</p>
          </div>
        ) : pendaftarans.map(p => (
          <div key={p.id} className="card hover-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <span className="badge badge-primary">{p.kelas.program.nama}</span>
              <span className="badge badge-success">AKTIF</span>
            </div>
            
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{p.kelas.namaKelas}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, opacity: 0.8 }}>
                <User size={16} /> Tutor: {p.kelas.pengajar?.name || "TBA"}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, opacity: 0.8 }}>
                <Calendar size={16} /> {p.kelas.hari || "Jadwal Belum Diatur"}, {p.kelas.jam || ""}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, opacity: 0.8 }}>
                <MapPin size={16} /> Link Zoom / Ruangan (Lihat Detail)
              </div>
            </div>

            <Link href={`/siswa/kelas/${p.id}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Masuk Kelas
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
