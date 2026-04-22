import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { History, Download, Award } from "lucide-react";

export default async function SiswaRiwayat() {
  const session = await auth();
  if (!session || (session.user as any).roleSlug !== "siswa") {
    redirect("/login");
  }

  const siswaId = (session.user as any).id;

  const riwayat = await prisma.pendaftaran.findMany({
    where: { 
      siswaId,
      aktif: false 
    },
    include: {
      kelas: {
        include: { program: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="page-container">
      <div style={{ marginBottom: 32 }}>
        <h1 className="headline-lg">Riwayat Belajar</h1>
        <p className="body-md">Arsip perjalanan belajarmu di Speaking Partner.</p>
      </div>

      <div className="card">
        {riwayat.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px' }}>
            <History size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
            <p className="body-lg">Kamu belum memiliki riwayat kelas yang selesai.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Nama Program</th>
                  <th>Nama Kelas</th>
                  <th>Tanggal Selesai</th>
                  <th style={{ textAlign: 'center' }}>Sertifikat</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map(p => (
                  <tr key={p.id}>
                    <td><div style={{ fontWeight: 700 }}>{p.kelas.program.nama}</div></td>
                    <td>{p.kelas.namaKelas}</td>
                    <td>{p.tanggalSelesai ? new Date(p.tanggalSelesai).toLocaleDateString("id-ID") : "-"}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-secondary btn-icon" title="Lihat Sertifikat">
                        <Award size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
