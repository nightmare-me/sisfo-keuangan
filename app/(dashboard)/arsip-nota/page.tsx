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
  
  // Print preview state
  const [printingImages, setPrintingImages] = useState<string[]>([]);
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
    const imagesToPrint: string[] = [];
    data.forEach(item => {
      item.arsipNota.forEach((nota: any) => {
        imagesToPrint.push(nota.urlFile);
      });
    });
    
    if (imagesToPrint.length === 0) {
      setConfirmModal({
        show: true,
        title: "Nota Tidak Ditemukan",
        message: "⚠️ Tidak ada file lampiran nota untuk dicetak pada periode ini.",
        type: "warning",
        onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
      });
      return;
    }
    
    setPrintingImages(imagesToPrint);
    setTimeout(() => {
      window.print();
    }, 500);
  }

  async function exportExcel() {
    if (data.length === 0) return;
    setExporting(true);
    try {
      const xlsxModule = await import("xlsx");
      const XLSX = xlsxModule.default || xlsxModule;
      const wb = XLSX.utils.book_new();
      
      const exportData = [
        ["Tanggal", "Kategori", "Keterangan", "Dibuat Oleh", "Jumlah", "Total Lampiran", "Link Lampiran"],
        ...data.map(item => [
          formatDateTime(item.tanggal),
          item.kategori,
          item.keterangan || "",
          item.user?.name || "Sistem",
          item.jumlah,
          item.arsipNota?.length || 0,
          item.arsipNota?.map((n: any) => n.urlFile).join(", ") || ""
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
                        <a key={nota.id} href={nota.urlFile} target="_blank" rel="noreferrer" style={{ display: 'block', border: '1px solid var(--ghost-border)', borderRadius: 4, overflow: 'hidden' }}>
                          <img src={nota.urlFile} alt="nota" style={{ width: 40, height: 40, objectFit: 'cover' }} />
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
        <h2 style={{ textAlign: 'center', marginBottom: 5 }}>Arsip Nota Pengeluaran</h2>
        <p style={{ textAlign: 'center', marginBottom: 20, color: '#555', fontSize: '14px' }}>
          {filter.startDate && filter.endDate 
            ? `Periode: ${new Date(filter.startDate).toLocaleDateString('id-ID')} - ${new Date(filter.endDate).toLocaleDateString('id-ID')}`
            : `Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {printingImages.map((url, idx) => (
            <div key={idx} style={{ breakInside: 'avoid', border: '1px solid #ccc', padding: 10, background: '#fff' }}>
              <img src={url} alt={`Nota ${idx + 1}`} style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          ))}
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
