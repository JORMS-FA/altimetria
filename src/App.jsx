import React, { useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./components/LandingPage";
import StageProfileEditor from "./components/EditorPage";
import LoginGate from "./components/LoginGate";
import "./landing.css";

export default function App() {
  const [view, setView] = useState("landing"); // "landing" | "editor"

  return (
    <AuthProvider>
      {view === "landing" ? (
        <LandingPage onEnterApp={() => setView("editor")} />
      ) : (
        <>
          <StageProfileEditor />
          <button
            onClick={() => setView("landing")}
            style={{
              position: "fixed",
              bottom: "20px",
              right: "20px",
              zIndex: 999,
              padding: "8px 16px",
              borderRadius: "10px",
              background: "var(--bg-panel)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-color)",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}
          >
            ← Inicio
          </button>
        </>
      )}
      <LoginGate />
    </AuthProvider>
  );
}
