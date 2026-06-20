import React from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginGate() {
  const { showLoginGate, setShowLoginGate, handleLogin, FREE_DOWNLOAD_LIMIT } = useAuth();

  if (!showLoginGate) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowLoginGate(false)}>
      <div
        className="modal-content animate-fade-in"
        style={{ maxWidth: "480px", textAlign: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "48px 32px 24px" }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>🔒</div>
          <h2 style={{
            fontFamily: "var(--font-heading)",
            fontSize: "24px",
            fontWeight: 900,
            color: "var(--text-primary)",
            margin: "0 0 12px"
          }}>
            Descargas gratuitas agotadas
          </h2>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "15px",
            lineHeight: "1.6",
            margin: "0 0 32px"
          }}>
            Has usado tus <strong style={{ color: "var(--accent-color)" }}>{FREE_DOWNLOAD_LIMIT} exportaciones gratis</strong>. 
            Inicia sesión con Google para desbloquear descargas ilimitadas.
          </p>

          <button
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "14px 24px",
              borderRadius: "12px",
              background: "#ffffff",
              color: "#1f2937",
              border: "1px solid #e5e7eb",
              fontWeight: 700,
              fontSize: "15px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          <button
            onClick={() => setShowLoginGate(false)}
            style={{
              width: "100%",
              marginTop: "12px",
              padding: "10px",
              borderRadius: "8px",
              background: "transparent",
              color: "var(--text-muted)",
              border: "none",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            Quizás después
          </button>
        </div>
      </div>
    </div>
  );
}
