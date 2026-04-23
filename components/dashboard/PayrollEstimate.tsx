"use client";

import { useEffect, useState } from "react";
import { Wallet, Info, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function PayrollEstimate() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payroll/estimate")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="skeleton" style={{ height: 160, borderRadius: 24 }} />;
  if (!data || !Array.isArray(data.items) || data.items.length === 0) return null;

  return (
    <div className="card glass" style={{ 
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Glow */}
      <div style={{ 
        position: 'absolute', top: -20, right: -20, width: 100, height: 100, 
        background: 'var(--brand-primary)', filter: 'blur(60px)', opacity: 0.2, zIndex: 0 
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: 12, background: 'var(--brand-primary)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' 
            }}>
              <Wallet size={20} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Transparency Portal
              </div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Estimasi Take Home Pay</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Bulan Berjalan</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date())}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {data.items.map((item: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
                {item.count && (
                  <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 6, opacity: 0.7 }}>
                    {item.count} Sesi/Unit
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{formatCurrency(item.amount)}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Info size={12} /> Total estimasi sementara sebelum pajak/potongan
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
              {formatCurrency(data.totalEstimasi)}
            </div>
          </div>
          <div style={{ 
            padding: '8px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', 
            fontSize: 12, fontWeight: 600, color: 'var(--brand-primary-light)', display: 'flex', alignItems: 'center', gap: 6 
          }}>
            Real-time <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
