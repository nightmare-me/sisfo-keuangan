"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GraduationCap, LogIn, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email/ID atau password salah.");
      setLoading(false);
    } else {
      // Ambil session untuk cek role
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      
      if (session?.user?.roleSlug === "siswa") {
        router.push("/siswa/dashboard");
      } else if (session?.user?.roleSlug === "pengajar") {
        router.push("/pengajar/dashboard");
      } else {
        router.push("/dashboard");
      }
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-container">
        
        <div className="login-header">
          <div className="brand-logo" style={{ background: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
             <img 
               src="/logo_sp.png?v=1" 
               alt="Speaking Partner Logo" 
               style={{ 
                 width: '100%', 
                 height: '100%', 
                 objectFit: 'contain',
                 padding: '4px'
               }} 
             />
          </div>
          <div>
            <h1 className="headline-lg">Internal Portal</h1>
            <p className="body-lg">
              Speaking Partner 
              <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 8 }}>/ Workspace</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="alert-premium shadow-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Email or Student ID</label>
            <div className="input-with-icon">
              <input
                type="text"
                className="form-control"
                placeholder="Email or SP-202X-XXXXX"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <label className="form-label" style={{ margin: 0 }}>Password</label>
              <a href="#" style={{ fontSize: '0.9rem', color: 'var(--secondary)', textDecoration: 'none', fontWeight: 600 }}>Recovery</a>
            </div>
            <div className="input-with-icon">
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 24, padding: '18px' }} disabled={loading}>
            {loading ? "Authenticating..." : <>Masuk Sistem <LogIn size={18} /></>}
          </button>
        </form>

        <div className="login-footer">
           <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 10 }}>
              <a href="#">Support</a>
              <a href="#">Security</a>
              <a href="#">Privacy</a>
           </div>
           <p style={{ marginTop: 24 }}>© 2024 Kampung Inggris HQ.</p>
        </div>

      </div>

      <style jsx>{`
        .login-wrapper {
          min-height: 100vh;
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .login-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 460px; /* Lebar lebih sempit dan proporsional */
          padding: 64px 48px; 
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: var(--surface-container-lowest);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-sm), var(--ambient-shadow);
        }

        .login-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 40px;
        }

        .brand-logo {
          width: 56px;
          height: 56px;
          flex-shrink: 0;
          background: var(--primary-container);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 30px rgba(116, 91, 0, 0.15);
        }

        .login-header h1 {
          font-family: var(--font-display);
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--on-surface);
          letter-spacing: -0.02em;
          margin-bottom: 4px;
          line-height: 1.1;
        }

        .login-header p {
          color: var(--secondary);
          font-size: 0.95rem;
          line-height: 1.2;
          margin: 0;
        }

        .alert-premium {
          background: var(--surface-container-low);
          color: var(--danger);
          padding: 16px 20px;
          border-radius: var(--radius-default);
          font-family: var(--font-body);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
          border-left: 4px solid var(--danger);
        }

        .login-footer {
          margin-top: 48px;
          text-align: center;
        }

        .login-footer p {
          font-size: 0.85rem;
          color: var(--secondary);
          opacity: 0.6;
        }

        .login-footer a {
          font-size: 0.9rem;
          color: var(--secondary);
          text-decoration: none;
          font-weight: 600;
          transition: color var(--transition);
        }

        .login-footer a:hover {
          color: var(--on-surface);
        }

        /* Autofill highlight fix */
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px var(--surface-container-low) inset !important;
          -webkit-text-fill-color: var(--on-surface) !important;
        }

        @media (max-width: 640px) {
          .login-container {
            width: 90%;
            padding: 40px 24px;
          }
        }
      `}</style>
    </div>
  );
}
