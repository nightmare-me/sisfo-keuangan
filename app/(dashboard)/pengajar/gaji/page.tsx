"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Wallet, 
  Calendar, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Award
} from "lucide-react";
import Link from "next/link";

export default function RiwayatHonorPage() {
  const [data, setData] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ totalDiterima: 0, totalSesi: 0, totalBonus: 0 });

  const currentYear = new Date().getFullYear();
  const [filter, setFilter] = useState({
    bulan: String(new Date().getMonth() + 1),
    tahun: String(currentYear)
  });

  useEffect(() => {
    fetchData();
  }, [page, filter]);

  async function fetchData() {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        page: String(page),
        bulan: filter.bulan,
        tahun: filter.tahun,
        limit: "10"
      });
      const res = await fetch(`/api/gaji?${p}`);
      const d = await res.json();
      setData(d.data || []);
      setStaffData(d.staffData || []);
      setTotalPages(d.totalPages || 1);
      
      // Calculate totals
      const totalHonor = (d.data || []).reduce((acc: number, curr: any) => acc + curr.totalGaji, 0);
      const totalStaff = (d.staffData || []).reduce((acc: number, curr: any) => acc + curr.total, 0);
      const sesi = (d.data || []).reduce((acc: number, curr: any) => acc + curr.jumlahSesi, 0);
      
      setSummary({ 
        totalDiterima: totalHonor + totalStaff, 
        totalSesi: sesi,
        totalBonus: totalStaff
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--brand-primary-light)", marginBottom: 12 }}>
           <Wallet size={20} />
           <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Portal Finansial</span>
        </div>
        <h1 className="headline-lg" style={{ marginBottom: 8, fontSize: '2.5rem' }}>Riwayat Honor</h1>
        <p className="body-lg" style={{ color: "var(--text-muted)", margin: 0 }}>Pantau riwayat pembayaran dan performa mengajar Anda.</p>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid" style={{ marginBottom: 40 }}>
        <div className="kpi-card shadow-glow" style={{ background: 'linear-gradient(135deg, var(--brand-primary) 0%, #4338ca 100%)', color: 'white', border: 'none' }}>
          <div className="kpi-icon" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}><TrendingUp size={22} /></div>
          <div className="kpi-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Pendapatan {new Date(0, parseInt(filter.bulan)-1).toLocaleString('id-ID', {month:'long'})}</div>
          <div className="kpi-value" style={{ fontSize: 28 }}>{formatCurrency(summary.totalDiterima)}</div>
          <div style={{ fontSize: 11, marginTop: 8, opacity: 0.8, fontWeight: 600 }}>Total Bersih (Honor + Tunjangan)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}><CheckCircle2 size={22} /></div>
          <div className="kpi-label">Sesi Mengajar</div>
          <div className="kpi-value">{summary.totalSesi} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>Sesi</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: "rgba(99,102,241,0.1)", color: "var(--brand-primary-light)" }}><Award size={22} /></div>
          <div className="kpi-label">Tunjangan & Bonus</div>
          <div className="kpi-value" style={{ color: 'var(--brand-primary-light)' }}>{formatCurrency(summary.totalBonus)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card shadow-sm" style={{ padding: '24px 32px', marginBottom: 32, borderRadius: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Calendar size={18} style={{ color: 'var(--brand-primary-light)' }} />
            <select 
              className="form-control" 
              style={{ width: 160, borderRadius: 12, fontWeight: 600 }}
              value={filter.bulan}
              onChange={e => setFilter({...filter, bulan: e.target.value})}
            >
              {Array.from({length:12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('id-ID', {month:'long'})}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select 
              className="form-control" 
              style={{ width: 120, borderRadius: 12, fontWeight: 600 }}
              value={filter.tahun}
              onChange={e => setFilter({...filter, tahun: e.target.value})}
            >
              {[currentYear, currentYear-1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-secondary" onClick={fetchData} style={{ borderRadius: 12, padding: '10px 20px' }}>
            <Search size={18} /> Tampilkan
          </button>
        </div>
      </div>

      {/* Staff Salary Section (If exists) */}
      {staffData.length > 0 && (
        <div style={{ marginBottom: 40 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand-primary-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Award size={18} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Tunjangan & Bonus Role</h2>
           </div>
           <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 16 }}>
              {staffData.map(item => (
                 <div key={item.id} className="card shadow-sm" style={{ padding: 24, borderLeft: '4px solid var(--brand-primary-light)', borderRadius: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                       <div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Pembayaran Bulanan</div>
                          <div style={{ fontWeight: 800, fontSize: 16 }}>Gaji & Tunjangan Staf</div>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--brand-primary-light)' }}>{formatCurrency(item.total)}</div>
                          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ TERBAYAR</div>
                       </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 16px', background: 'var(--surface-container-low)', borderRadius: 12 }}>
                       <div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Gaji Pokok</div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{formatCurrency(item.gapok)}</div>
                       </div>
                       <div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tunjangan</div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{formatCurrency(item.tunjangan)}</div>
                       </div>
                       <div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Bonus</div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{formatCurrency(item.bonus)}</div>
                       </div>
                       <div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Fee Closing</div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{formatCurrency(item.fee)}</div>
                       </div>
                    </div>
                    {item.keterangan && (
                      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Note: {item.keterangan}
                      </div>
                    )}
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* Teaching Honor Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Calendar size={18} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Honor Mengajar Sesi</h2>
      </div>

      {/* Table Section */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 20 }}>
        <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead style={{ background: 'var(--surface-container-low)' }}>
              <tr>
                <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: 13, fontWeight: 800, color: 'var(--text-muted)' }}>TANGGAL BAYAR</th>
                <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: 13, fontWeight: 800, color: 'var(--text-muted)' }}>KELAS / PROGRAM</th>
                <th style={{ padding: '20px 24px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: 'var(--text-muted)' }}>SESI</th>
                <th style={{ padding: '20px 24px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: 'var(--text-muted)' }}>HONOR PER SESI</th>
                <th style={{ padding: '20px 24px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: 'var(--text-muted)' }}>TOTAL DITERIMA</th>
                <th style={{ padding: '20px 24px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: 'var(--text-muted)' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 80 }}>
                    <div className="animate-pulse" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Memuat data honor...</div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
                      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Belum Ada Data</h3>
                      <p style={{ color: 'var(--text-muted)' }}>Tidak ada riwayat honor untuk periode yang dipilih.</p>
                    </div>
                  </td>
                </tr>
              ) : data.map((item) => (
                <tr key={item.id} className="row-hover">
                  <td style={{ padding: '20px 24px', fontSize: 14 }}>
                    <div style={{ fontWeight: 700 }}>{formatDate(item.tanggalBayar || item.createdAt)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>REF: {item.id.slice(-8).toUpperCase()}</div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--on-surface)' }}>{item.kelas?.namaKelas || "Bonus / Insentif"}</div>
                    <div style={{ fontSize: 12, color: 'var(--brand-primary-light)', fontWeight: 600 }}>{item.kelas?.program?.nama || "Umum"}</div>
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{item.jumlahSesi}</span>
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right', color: 'var(--text-muted)' }}>
                    {formatCurrency(item.tarifPerSesi)}
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--success)' }}>{formatCurrency(item.totalGaji)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{item.metodeBayar}</div>
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '6px 12px', borderRadius: 100, fontSize: 11, fontWeight: 800 }}>
                      <CheckCircle2 size={12} /> LUNAS
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '24px', background: 'var(--surface-container-low)', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
            Halaman <span style={{ color: 'var(--on-surface)' }}>{page}</span> dari {totalPages}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="btn btn-secondary btn-sm" 
              disabled={page === 1 || loading}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className="btn btn-secondary btn-sm" 
              disabled={page === totalPages || loading}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 16, padding: '24px', background: 'rgba(59,130,246,0.05)', borderRadius: 20, border: '1px solid rgba(59,130,246,0.1)' }}>
         <div style={{ width: 44, height: 44, borderRadius: 14, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary-light)', boxShadow: 'var(--shadow-sm)' }}>
            <Receipt size={22} />
         </div>
         <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 800 }}>Butuh rincian slip gaji?</h4>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Silakan hubungi tim Finance untuk permintaan cetak slip gaji fisik atau digital.</p>
         </div>
         <button className="btn btn-primary" style={{ borderRadius: 12 }}>
            Chat Admin Finance
         </button>
      </div>
    </div>
  );
}
