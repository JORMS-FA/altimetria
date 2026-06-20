import React from "react";
import { useAuth } from "../context/AuthContext";

export default function UserBadge() {
  const { user, remaining, isUnlimited, handleLogin, handleLogout } = useAuth();

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "8px 12px",
      borderRadius: "10px",
      background: "var(--bg-secondary)",
      border: "1px solid var(--border-color)",
      fontSize: "12px"
    }}>
      {user ? (
        <>
          <img
            src={user.photoURL}
            alt=""
            style={{ width: 24, height: 24, borderRadius: "50%" }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.displayName || user.email}
            </div>
            <div style={{ color: "var(--accent-color)", fontWeight: 800, fontSize: "10px" }} className="mono-terminal">
              ∞ DESCARGAS ILIMITADAS
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              background: "transparent",
              color: "var(--text-muted)",
              border: "1px solid var(--border-color)",
              fontSize: "10px",
              cursor: "pointer"
            }}
          >
            Salir
          </button>
        </>
      ) : (
        <>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Modo gratuito</div>
            <div style={{ color: "var(--accent-color)", fontWeight: 800, fontSize: "10px" }} className="mono-terminal">
              {remaining} exportaciones restantes
            </div>
          </div>
          <button
            onClick={handleLogin}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              background: "var(--accent-color)",
              color: "#000",
              border: "none",
              fontSize: "10px",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            Login
          </button>
        </>
      )}
    </div>
  );
}
