"use client";
import { Trash2, AlertTriangle, Info, X } from "lucide-react";

interface ConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  loading?: boolean;
}

export default function ConfirmModal({
  show,
  onClose,
  onConfirm,
  title = "Apakah Anda yakin?",
  message = "Tindakan ini tidak dapat dibatalkan.",
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  type = "danger",
  loading = false
}: ConfirmModalProps) {
  if (!show) return null;

  const colors = {
    danger: { bg: "rgba(239, 68, 68, 0.1)", text: "#ef4444", btn: "#ef4444" },
    warning: { bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b", btn: "#f59e0b" },
    info: { bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6", btn: "#3b82f6" },
  };

  const activeColor = colors[type];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
      <div className="card" style={{ maxWidth: 400, width: "100%", padding: 32, borderRadius: 32, textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", border: "1px solid rgba(255,255,255,0.1)", position: "relative", animation: "modalScale 0.3s ease-out" }}>
        
        <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }}>
          <X size={20} />
        </button>

        <div style={{ width: 72, height: 72, background: activeColor.bg, color: activeColor.text, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          {type === 'danger' && <Trash2 size={36} />}
          {type === 'warning' && <AlertTriangle size={36} />}
          {type === 'info' && <Info size={36} />}
        </div>

        <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: "var(--text-primary)" }}>{title}</h3>
        <p style={{ color: "var(--text-muted)", marginBottom: 32, lineHeight: 1.6, fontSize: 15 }}>{message}</p>
        
        <div style={{ display: "flex", gap: 12 }}>
          <button 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ flex: 1, height: 54, borderRadius: 16, fontWeight: 700, fontSize: 15 }}
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className="btn" 
            disabled={loading}
            style={{ flex: 1, height: 54, borderRadius: 16, fontWeight: 700, fontSize: 15, background: activeColor.btn, color: "#fff" }}
          >
            {loading ? "Memproses..." : confirmText}
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes modalScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
