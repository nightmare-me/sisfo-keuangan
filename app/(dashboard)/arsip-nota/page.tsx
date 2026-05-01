"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  FileText,
  Calendar,
  RefreshCw,
  Printer,
  Table as TableIcon
} from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function ArsipNotaPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ startDate: "", endDate: "" });
  const [printDate, setPrintDate] = useState("");
  
  const [exporting, setExporting] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: () => {}, type: "danger" as "danger" | "warning" | "info" | "success" });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchData();
  }, [filter, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  function fetchData() {
    const p = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });
    if (filter.startDate) p.set("startDate", filter.startDate);
    if (filter.endDate) p.set("endDate", filter.endDate);
    
    setLoading(true);
    fetch(`/api/arsip-nota?${p}`).then(r => r.json()).then(d => {
      setData(d.data || []);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || 1);
      setLoading(false);
    }).catch(() => {
      setData([]);
      setLoading(false);
    });
  }

  function handlePrint() {
    if (data.length === 0) {
      setConfirmModal({
        show: true,
        title: "Data Kosong",
        message: "⚠️ Tidak ada data untuk dicetak pada periode ini.",
        type: "warning",
        onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
      });
      return;
    }
    
    setPrintDate(new Date().toLocaleString('id-ID'));
    
    // We'll print the current page data
    window.print();
  }

  async function exportExcel() {
    if (data.length === 0) return;
    setExporting(true);
    try {
      const xlsxModule = await import("xlsx");
      // Handle both ESM and CJS import patterns
      const XLSX = (xlsxModule as any).utils ? xlsxModule : (xlsxModule as any).default;
      
      if (!XLSX || !XLSX.utils) {
        throw new Error("Library Excel tidak termuat dengan benar.");
      }

      const wb = XLSX.utils.book_new();
      
      const exportData = [
        ["Tanggal", "Kategori", "Keterangan", "Dibuat Oleh", "Jumlah", "Total Lampiran", "Link Nota", "Link Bukti Transfer"],
        ...data.map(item => [
          formatDateTime(item.tanggal),
          item.kategori,
          item.keterangan || "",
          item.user?.name || "Sistem",
          item.jumlah,
          item.arsipNota?.length || 0,
          item.arsipNota?.filter((n: any) => n.tipe === "NOTA").map((n: any) => n.urlFile).join(", ") || "",
          item.arsipNota?.filter((n: any) => n.tipe === "BUKTI_TRANSFER").map((n: any) => n.urlFile).join(", ") || ""
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Arsip Nota");
      
      let filename = "Arsip_Nota";
      if (filter.startDate && filter.endDate) {
        filename += `_${filter.startDate}_sd_${filter.endDate}`;
      }
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e: any) {
      console.error(e);
      setConfirmModal({
        show: true,
        title: "Ekspor Gagal",
        message: `❌ Gagal mengekspor file excel: ${e.message}`,
        type: "danger",
        onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>
      {/* Header Ala Dashboard */}
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 48, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", marginBottom: 8 }}>
             <FileText size={18} />
             <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Arsip Dokumen</span>
          </div>
          <h1 className="headline-lg" style={{ marginBottom: 4, fontSize: '2.5rem' }}>Arsip Nota</h1>
          <p className="body-lg" style={{ margin: 0 }}>Digitalisasi nota dan struk pengeluaran</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button className="btn btn-secondary" style={{ borderRadius: 'var(--radius-full)' }} onClick={exportExcel} disabled={exporting || loading}>
            <TableIcon size={18} /> Export Excel
          </button>
          <button className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)' }} onClick={handlePrint}>
            <Printer size={18} /> Cetak Dokumen (PDF)
          </button>
        </div>
      </div>

      <div className="no-print" style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {/* Filter Section */}
        <div className="card" style={{ padding: '24px 32px', marginBottom: 32 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Calendar size={18} style={{ color: "var(--primary)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="date" className="form-control" value={filter.startDate} onChange={e => setFilter(f => ({ ...f, startDate: e.target.value }))} style={{ maxWidth: 150, padding: '8px 12px' }} />
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>s/d</span>
                <input type="date" className="form-control" value={filter.endDate} onChange={e => setFilter(f => ({ ...f, endDate: e.target.value }))} style={{ maxWidth: 150, padding: '8px 12px' }} />
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setFilter({ startDate: "", endDate: "" })} style={{ borderRadius: 'var(--radius-full)' }}>
              <RefreshCw size={14} /> Reset
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th>Dibuat Oleh</th>
                <th className="text-right">Jumlah</th>
                <th className="text-center">Lampiran Nota</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><FileText size={48} /></div>
                    <h3 className="title-lg">Belum ada arsip nota</h3>
                    <p>Input pengeluaran beserta foto nota melalui modul Pengeluaran</p>
                  </div>
                </td></tr>
              ) : data.map(item => (
                <tr key={item.id}>
                  <td style={{ fontSize: 14, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDateTime(item.tanggal)}</td>
                  <td>
                    <span className="badge badge-danger" style={{ padding: '6px 14px', borderRadius: 100 }}>
                      {item.kategori}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: 14 }}>{item.keterangan || "—"}</td>
                  <td style={{ fontSize: 14, color: "var(--text-muted)" }}>{item.user?.name ?? "—"}</td>
                  <td className="text-right" style={{ fontWeight: 800, color: "var(--danger)", fontSize: 16 }}>{formatCurrency(item.jumlah)}</td>
                  <td className="text-center">
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {item.arsipNota.map((nota: any) => (
                        <a key={nota.id} href={nota.urlFile} target="_blank" rel="noreferrer" 
                           style={{ 
                             display: 'block', 
                             border: `2px solid ${nota.tipe === "BUKTI_TRANSFER" ? "var(--info)" : "var(--ghost-border)"}`, 
                             borderRadius: 4, 
                             overflow: 'hidden',
                             position: 'relative'
                           }}>
                          <img src={nota.urlFile} alt="nota" style={{ width: 40, height: 40, objectFit: 'cover' }} />
                          {nota.tipe === "BUKTI_TRANSFER" && (
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--info)', color: 'white', fontSize: 6, fontWeight: 800, textAlign: 'center', padding: '1px 0' }}>TRF</div>
                          )}
                        </a>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination Footer */}
          <div className="no-print" style={{ padding: '12px 24px', borderTop: '1px solid var(--ghost-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Baris per halaman:</span>
                <select 
                  className="form-control form-control-sm" 
                  style={{ width: 80 }}
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                   Halaman <span style={{ fontWeight: 800, color: 'var(--on-surface)' }}>{page}</span> dari <span style={{ fontWeight: 800, color: 'var(--on-surface)' }}>{totalPages}</span>
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                   <button 
                     className="btn btn-secondary btn-sm" 
                     disabled={page <= 1 || loading}
                     onClick={() => setPage(prev => prev - 1)}
                     style={{ padding: '4px 12px' }}
                   >
                     Sebelumnya
                   </button>
                   <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2))
                      .map((p, i, arr) => (
                        <div key={p} style={{ display: 'flex', gap: 4 }}>
                          {i > 0 && arr[i-1] !== p - 1 && <span style={{ padding: '0 4px', alignSelf: 'center' }}>...</span>}
                          <button 
                            className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ minWidth: 32 }}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        </div>
                      ))}
                   </div>
                   <button 
                     className="btn btn-secondary btn-sm" 
                     disabled={page >= totalPages || loading}
                     onClick={() => setPage(prev => prev + 1)}
                     style={{ padding: '4px 12px' }}
                   >
                     Selanjutnya
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Area Khusus Print */}
      <div className="print-only">
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ margin: '0 0 5px 0', fontSize: 24 }}>LAPORAN ARSIP NOTA</h1>
          <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
            {filter.startDate && filter.endDate 
              ? `Periode: ${new Date(filter.startDate).toLocaleDateString('id-ID')} s/d ${new Date(filter.endDate).toLocaleDateString('id-ID')}`
              : `Dicetak pada: ${printDate}`}
          </p>
        </div>

        {/* Ringkasan Tabel di Print */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40, fontSize: 12 }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Tanggal</th>
              <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Kategori</th>
              <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Keterangan</th>
              <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{formatDateTime(item.tanggal)}</td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{item.kategori}</td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{item.keterangan || "—"}</td>
                <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.jumlah)}</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
              <td colSpan={3} style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>TOTAL</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>
                {formatCurrency(data.reduce((acc, curr) => acc + curr.jumlah, 0))}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Lampiran Gambar */}
        <div style={{ pageBreakBefore: 'always' }}>
          <h2 style={{ fontSize: 16, borderBottom: '1px solid #333', paddingBottom: 5, marginBottom: 15 }}>LAMPIRAN DOKUMEN</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 15 }}>
            {data.flatMap(item => item.arsipNota).map((nota: any, idx) => (
              <div key={idx} style={{ breakInside: 'avoid', border: '1px solid #eee', padding: 5, position: 'relative', marginBottom: 10 }}>
                <div style={{ 
                  position: 'absolute', top: 5, left: 5, 
                  background: nota.tipe === "BUKTI_TRANSFER" ? '#3b82f6' : '#6b7280', 
                  color: 'white', padding: '1px 6px', borderRadius: 3, fontSize: 8, fontWeight: 'bold' 
                }}>
                  {nota.tipe === "BUKTI_TRANSFER" ? "TRF" : "NOTA"}
                </div>
                <img 
                  src={nota.urlFile} 
                  alt="lampiran" 
                  style={{ width: '100%', height: 'auto', display: 'block', marginTop: 15, borderRadius: 2 }} 
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <ConfirmModal 
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() => setConfirmModal({ ...confirmModal, show: false })}
        onConfirm={confirmModal.onConfirm}
        type={confirmModal.type}
        loading={loading || exporting}
      />
    </div>
  );
}
