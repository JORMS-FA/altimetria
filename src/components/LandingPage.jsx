import React from "react";
import { useAuth } from "../context/AuthContext";

export default function LandingPage({ onEnterApp }) {
  const { user, handleLogin, handleLogout } = useAuth();

  return (
    <div className="landing-root">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <span className="landing-logo-icon">⛰️</span>
            <span className="landing-logo-text">Altimetría</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Funciones</a>
            <a href="#how">Cómo funciona</a>
            <a href="#pricing">Precio</a>
          </div>
          <div className="landing-nav-actions">
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img
                  src={user.photoURL}
                  alt=""
                  style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--accent-color)" }}
                />
                <button className="btn-secondary" onClick={handleLogout}>Salir</button>
                <button className="btn-primary" onClick={onEnterApp}>Abrir Editor</button>
              </div>
            ) : (
              <button className="btn-primary" onClick={onEnterApp}>
                Probar Gratis
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span>🚴</span> Herramienta profesional de ciclismo
          </div>
          <h1 className="hero-title">
            Perfiles altimétricos<br />
            <span className="hero-gradient">de nivel profesional</span>
          </h1>
          <p className="hero-subtitle">
            Sube tu archivo GPX y genera visualizaciones volumétricas de alta calidad
            con paletas de color, etiquetas personalizables y exportación SVG. 
            La herramienta que usan los equipos para analizar etapas.
          </p>
          <div className="hero-actions">
            <button className="btn-primary btn-lg" onClick={onEnterApp}>
              Comenzar Gratis
              <span style={{ marginLeft: "8px" }}>→</span>
            </button>
            <a href="#features" className="btn-ghost btn-lg">Ver funciones</a>
          </div>
          <p className="hero-note">5 exportaciones gratis · Sin tarjeta de crédito</p>
        </div>

        <div className="hero-visual">
          <div className="hero-mockup">
            <svg viewBox="0 0 800 400" width="100%" height="100%">
              <defs>
                <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff66" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#000" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="heroLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00e5ff" />
                  <stop offset="50%" stopColor="#00ff66" />
                  <stop offset="100%" stopColor="#d300ff" />
                </linearGradient>
              </defs>
              <rect width="800" height="400" fill="#000" rx="12" />
              <path d="M 0 350 Q 80 340 120 320 Q 180 280 220 250 Q 280 180 340 160 Q 380 150 420 180 Q 480 240 520 220 Q 560 190 600 140 Q 660 80 720 100 Q 760 120 800 130 L 800 400 L 0 400 Z" fill="url(#heroGrad)" />
              <path d="M 0 350 Q 80 340 120 320 Q 180 280 220 250 Q 280 180 340 160 Q 380 150 420 180 Q 480 240 520 220 Q 560 190 600 140 Q 660 80 720 100 Q 760 120 800 130" fill="none" stroke="url(#heroLine)" strokeWidth="3" />
              <circle cx="340" cy="160" r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
              <circle cx="600" cy="140" r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
              <circle cx="720" cy="100" r="5" fill="#ef4444" stroke="#fff" strokeWidth="2" />
              <text x="340" y="145" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">Alto de Patios</text>
              <text x="600" y="125" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">La Cuchilla</text>
              <text x="720" y="85" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">Cruz Verde</text>
            </svg>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing-section">
        <div className="section-header">
          <h2>Todo lo que necesitas para tus etapas</h2>
          <p>Herramientas pensadas para ciclistas, directores deportivos y creadores de contenido</p>
        </div>
        <div className="features-grid">
          <FeatureCard
            icon="📊"
            title="Perfiles Volumétricos"
            description="Visualización 3D con bandas de color según el porcentaje de pendiente. 6 paletas de color incluidas."
          />
          <FeatureCard
            icon="✂️"
            title="Recorte Inteligente"
            description="Recorta cualquier segmento de tu ruta GPX para enfocarte en la subida o tramo que necesitas."
          />
          <FeatureCard
            icon="🏷️"
            title="Etiquetas Personalizables"
            description="Nombra cada puerto, alto o punto de interés. Detección automática de picos + etiquetas manuales."
          />
          <FeatureCard
            icon="📐"
            title="Escalado Profesional"
            description="Controla la exageración vertical, suavizado GPS y distancia objetivo como en las retransmisiones UCI."
          />
          <FeatureCard
            icon="🗺️"
            title="Mapa del Trazado"
            description="Vista aérea del circuito con puntos de salida y meta. Exportable en SVG de alta resolución."
          />
          <FeatureCard
            icon="💾"
            title="Exportación SVG"
            description="Descarga perfiles en formato vectorial perfecto para imprimir, compartir en redes o usar en diseños."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="landing-section landing-section-alt">
        <div className="section-header">
          <h2>Cómo funciona</h2>
          <p>En 3 pasos tienes tu perfil listo</p>
        </div>
        <div className="steps-grid">
          <StepCard number="1" title="Sube tu GPX" description="Arrastra o selecciona tu archivo GPX grabado con Strava, Garmin, Wahoo o cualquier GPS." />
          <StepCard number="2" title="Personaliza" description="Ajusta colores, recorte, etiquetas y escalas con los controles en tiempo real." />
          <StepCard number="3" title="Exporta" description="Descarga tu perfil en SVG vectorial de alta calidad listo para compartir." />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="landing-section">
        <div className="section-header">
          <h2>Simple y accesible</h2>
          <p>Empieza gratis, sin compromisos</p>
        </div>
        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-badge">Gratis</div>
            <h3>Explorar</h3>
            <div className="pricing-price">$0<span>/siempre</span></div>
            <ul>
              <li>✓ 5 exportaciones SVG</li>
              <li>✓ Todas las paletas de color</li>
              <li>✓ Recorte y etiquetas</li>
              <li>✓ Vista previa ilimitada</li>
            </ul>
            <button className="btn-secondary btn-full" onClick={onEnterApp}>Comenzar</button>
          </div>
          <div className="pricing-card pricing-featured">
            <div className="pricing-badge">Popular</div>
            <h3>Pro</h3>
            <div className="pricing-price">Gratis<span> con Google</span></div>
            <ul>
              <li>✓ Exportaciones ilimitadas</li>
              <li>✓ Todas las funciones</li>
              <li>✓ Historial guardado</li>
              <li>✓ Mapa del trazado</li>
              <li>✓ Soporte prioritario</li>
            </ul>
            <button className="btn-primary btn-full" onClick={user ? onEnterApp : handleLogin}>
              {user ? "Abrir Editor" : "Iniciar con Google"}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-brand">
            <span className="landing-logo-icon">⛰️</span>
            <span className="landing-logo-text">Altimetría</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            © 2025 Altimetría Web App. Hecho con pasión por el ciclismo.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="feature-card glass-panel">
      <div className="feature-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }) {
  return (
    <div className="step-card">
      <div className="step-number">{number}</div>
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  );
}
