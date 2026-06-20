import React, { useMemo, useRef, useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import UserBadge from "./UserBadge";

const DEFAULT_STATE = {
  darkMode: true,
  exaggeration: 2.2,
  smoothing: 7,
  bandWidth: 10,
  fillOpacity: 0.8,
  showGrid: true,
  showLabels: true,
  
  // Professional Grade Thresholds
  palette: "terminal",
  tLight: 1.5,
  tModerate: 3.5,
  tSevere: 5.5,
  tExtreme: 7.5,
  
  // Dynamic Baseline Elevation Offset
  baseThickness: 25,
  
  // Target Distance scaling
  useGpxDistance: false,
  targetDistance: 34.5,
  
  // Contour Styling
  contourColor: "default",
  contourStrokeWidth: 3,
  
  // Label Styling
  labelFontSize: 18,

  // Theme custom options
  themeColor: "green",     // "green" | "cyan" | "amber" | "red" | "purple"
  terminalFont: true,      // true: Monospace terminal, false: Elegant Sans-serif
};

const PALETTES = {
  terminal: [
    { name: "Plano/Desc", color: "#1e293b" },
    { name: "Suave (1-3%)", color: "#00e5ff" },   // Cyan
    { name: "Medio (3-5%)", color: "#00ff66" },   // Neon green
    { name: "Fuerte (5-7%)", color: "#ffaa00" },  // Neon orange
    { name: "Extremo (7-9%)", color: "#ff0055" }, // Neon red
    { name: "Muro (9%+)", color: "#d300ff" }      // Neon purple
  ],
  volcano: [
    { name: "Plano/Desc", color: "#1c1917" },
    { name: "Suave (1-3%)", color: "#fef08a" },   // Yellow
    { name: "Medio (3-5%)", color: "#fdba74" },   // Peach
    { name: "Fuerte (5-7%)", color: "#f87171" },  // Coral red
    { name: "Extremo (7-9%)", color: "#dc2626" }, // Fire red
    { name: "Muro (9%+)", color: "#7f1d1d" }      // Deep lava
  ],
  cyberpunk: [
    { name: "Plano/Desc", color: "#0f172a" },
    { name: "Suave (1-3%)", color: "#38bdf8" },   // Cyber blue
    { name: "Medio (3-5%)", color: "#818cf8" },   // Indigo
    { name: "Fuerte (5-7%)", color: "#c084fc" },  // Electric purple
    { name: "Extremo (7-9%)", color: "#f472b6" }, // Neon pink
    { name: "Muro (9%+)", color: "#f43f5e" }      // Rose red
  ],
  classic: [
    { name: "Plano/Desc", color: "#334155" },
    { name: "Suave (1-3%)", color: "#93c5fd" },   // Ice blue
    { name: "Medio (3-5%)", color: "#60a5fa" },   // Blue Sky
    { name: "Fuerte (5-7%)", color: "#2563eb" },  // Royal blue
    { name: "Extremo (7-9%)", color: "#1d4ed8" }, // Deep blue
    { name: "Muro (9%+)", color: "#1e3a8a" }      // Dark navy
  ],
  uci_official: [
    { name: "Plano/Desc", color: "#475569" },     // Slate
    { name: "Suave (1-3%)", color: "#10b981" },   // Green uci
    { name: "Medio (3-5%)", color: "#3b82f6" },   // Blue uci
    { name: "Fuerte (5-7%)", color: "#eab308" },  // Yellow uci
    { name: "Extremo (7-9%)", color: "#ef4444" }, // Red uci
    { name: "Muro (9%+)", color: "#7c3aed" }      // Purple uci
  ],
  steep_gradient: [
    { name: "Plano/Desc", color: "#64748b" },     // Gray
    { name: "Suave (1-3%)", color: "#86efac" },   // Soft Green
    { name: "Medio (3-5%)", color: "#93c5fd" },   // Soft Blue
    { name: "Fuerte (5-7%)", color: "#ff8b8b" },  // Coral red
    { name: "Extremo (7-9%)", color: "#a855f7" }, // Purple
    { name: "Muro (9%+)", color: "#000000" }      // Pure AMOLED Black
  ]
};

function parseGpxText(text) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "application/xml");
  const pts = Array.from(xml.getElementsByTagName("trkpt"));

  return pts
    .map((pt, idx) => {
      const lat = parseFloat(pt.getAttribute("lat") || "NaN");
      const lon = parseFloat(pt.getAttribute("lon") || "NaN");
      const eleEl = pt.getElementsByTagName("ele")[0];
      const ele = eleEl ? parseFloat(eleEl.textContent || "NaN") : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(ele)) return null;
      return { lat, lon, ele, idx };
    })
    .filter(Boolean);
}

function toRad(v) {
  return (v * Math.PI) / 180;
}

function haversine(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function smooth(values, window = 7) {
  if (values.length < window) return values.slice();
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < values.length) {
        sum += values[j];
        n += 1;
      }
    }
    return sum / n;
  });
}

function getGradeColor(grade, state) {
  const palette = PALETTES[state.palette || "terminal"];
  const t1 = state.tLight ?? 1.5;
  const t2 = state.tModerate ?? 3.5;
  const t3 = state.tSevere ?? 5.5;
  const t4 = state.tExtreme ?? 7.5;

  if (grade < t1) return state.darkMode ? palette[0].color : "#cbd5e1";
  if (grade < t2) return palette[1].color;
  if (grade < t3) return palette[2].color;
  if (grade < t4) return palette[3].color;
  if (grade < 10.0) return palette[4].color;
  return palette[5].color;
}

function computeProfile(rows) {
  if (!rows.length) return null;

  const distM = [0];
  for (let i = 1; i < rows.length; i++) {
    distM.push(distM[i - 1] + haversine(rows[i - 1], rows[i]));
  }

  const rawEle = rows.map((r) => r.ele);
  const total = distM[distM.length - 1];

  const totalAscentRaw = rawEle.reduce((acc, cur, i) => {
    if (i === 0) return acc;
    const diff = cur - rawEle[i - 1];
    return diff > 0 ? acc + diff : acc;
  }, 0);

  const totalDescentRaw = rawEle.reduce((acc, cur, i) => {
    if (i === 0) return acc;
    const diff = cur - rawEle[i - 1];
    return diff < 0 ? acc + Math.abs(diff) : acc;
  }, 0);

  return {
    rows,
    distM,
    rawEle,
    totalDistanceKm: total / 1000,
    statsBase: {
      distanceKm: total / 1000,
      ascent: totalAscentRaw,
      descent: totalDescentRaw,
      minEle: Math.min(...rawEle),
      maxEle: Math.max(...rawEle),
    },
  };
}

function buildSamples(profile, state) {
  if (!profile) return [];
  const { distM, rawEle, totalDistanceKm } = profile;
  const ele = smooth(rawEle, state.smoothing);
  const total = distM[distM.length - 1];
  
  const targetKm = state.useGpxDistance ? totalDistanceKm : (state.targetDistance ?? 34.5);
  const scaleX = (targetKm * 1000) / total;

  const step = 25;
  const sample = [];

  for (let d = 0; d <= total; d += step) {
    let i = 0;
    while (i < distM.length - 1 && distM[i + 1] < d) i++;
    const d0 = distM[i];
    const d1 = distM[i + 1] ?? d0;
    const e0 = ele[i];
    const e1 = ele[i + 1] ?? e0;
    const t = d1 === d0 ? 0 : (d - d0) / (d1 - d0);
    const y = e0 + t * (e1 - e0);
    sample.push({
      distanceKm: (d * scaleX) / 1000,
      elevation: y,
      grade: 0,
    });
  }

  for (let i = 1; i < sample.length; i++) {
    const dx = (sample[i].distanceKm - sample[i - 1].distanceKm) * 1000;
    const dy = sample[i].elevation - sample[i - 1].elevation;
    sample[i].grade = dx > 0 ? (dy / dx) * 100 * state.exaggeration : 0;
  }

  const ascent = sample.reduce((acc, cur, i) => {
    if (i === 0) return acc;
    const diff = cur.elevation - sample[i - 1].elevation;
    return diff > 0 ? acc + diff : acc;
  }, 0);

  const descent = sample.reduce((acc, cur, i) => {
    if (i === 0) return acc;
    const diff = cur.elevation - sample[i - 1].elevation;
    return diff < 0 ? acc + Math.abs(diff) : acc;
  }, 0);

  const minEle = Math.min(...sample.map((s) => s.elevation));
  const maxEle = Math.max(...sample.map((s) => s.elevation));
  const maxGrade = Math.max(...sample.map((s) => s.grade));

  return {
    sample,
    stats: {
      distanceKm: targetKm,
      ascent,
      descent,
      minEle,
      maxEle,
      maxGrade,
    },
  };
}

function buildMap(rows) {
  if (!rows?.length) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const p of rows) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLon = Math.min(minLon, p.lon);
    maxLon = Math.max(maxLon, p.lon);
  }

  const W = 1400;
  const H = 900;
  const pad = 70;
  const scaleX = (lon) => pad + ((lon - minLon) / Math.max(1e-9, maxLon - minLon)) * (W - pad * 2);
  const scaleY = (lat) => H - pad - ((lat - minLat) / Math.max(1e-9, maxLat - minLat)) * (H - pad * 2);
  const points = rows.map((p) => ({ x: scaleX(p.lon), y: scaleY(p.lat) }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  return { path, W, H, points };
}

function pathFromPoints(points) {
  if (!points.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
}

function makeProfileSvg(profile, state, keyPeaks, peakLabels, hoverData = null) {
  const data = profile?.sample || [];
  const stats = profile?.stats || null;

  const W = 2200;
  const H = 860;
  const pad = { top: 70, right: 55, bottom: 120, left: 96 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const rawMinEle = stats ? stats.minEle : 100;
  const rawMaxEle = stats ? stats.maxEle : 300;
  const activeMinEle = Math.max(0, rawMinEle - (state.baseThickness ?? 25));
  const activeMaxEle = rawMaxEle + 8;

  const targetKm = stats ? stats.distanceKm : (state.targetDistance ?? 34.5);

  const xScale = (km) => pad.left + (km / targetKm) * innerW;
  const yScale = (m) => pad.top + (1 - (m - activeMinEle) / (activeMaxEle - activeMinEle)) * innerH;

  const pts = data.map((d) => ({ x: xScale(d.distanceKm), y: yScale(d.elevation), ...d }));
  const ridgePath = pathFromPoints(pts);
  const areaPath = `${ridgePath} L ${xScale(targetKm)},${yScale(activeMinEle)} L ${xScale(0)},${yScale(activeMinEle)} Z`;

  const ySpan = activeMaxEle - activeMinEle;
  const yStep = ySpan / 6;
  const yTicks = Array.from({ length: 7 }).map((_, i) => Math.round(activeMinEle + i * yStep));
  const xTicks = Array.from({ length: 8 }).map((_, i) => (targetKm / 7) * i);

  const baseTopY = H - 146;
  const baseFrontY = H - 58;
  const baseLeftX = pad.left - 18;
  const baseRightX = W - pad.right + 18;

  // Volumetric Slope segments
  const bands = [];
  const floorY = yScale(activeMinEle);

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const grade = curr.grade;
    const isClimb = grade >= (state.tLight ?? 1.5);
    const color = getGradeColor(grade, state);

    const poly = [
      [prev.x, prev.y],
      [prev.x, floorY],
      [curr.x, floorY],
      [curr.x, curr.y]
    ]
      .map((p) => `${p[0]},${p[1]}`)
      .join(" ");

    const defaultMuted = state.darkMode ? "#12141c" : "#cbd5e1";
    bands.push(`<polygon points="${poly}" fill="${isClimb ? color : defaultMuted}" opacity="${state.fillOpacity}" />`);
  }

  const activePalette = PALETTES[state.palette || "terminal"];
  const climbLegend = [
    ["Plano/Desc", state.darkMode ? activePalette[0].color : "#cbd5e1"],
    [`Subida <${state.tModerate}%`, activePalette[1].color],
    [`Media <${state.tSevere}%`, activePalette[2].color],
    [`Dura <${state.tExtreme}%`, activePalette[3].color],
    [`Extrema ${state.tExtreme}%+`, activePalette[4].color],
  ];

  // Contour Stroke color logic
  const getContourHex = () => {
    if (state.contourColor === "cyan") return "#00e5ff";
    if (state.contourColor === "green") return "#00ff66";
    if (state.contourColor === "red") return "#ff0055";
    if (state.contourColor === "magenta") return "#d300ff";
    if (state.contourColor === "gold") return "#ffaa00";
    if (state.contourColor === "black") return "#000000";
    return state.darkMode ? "#ffffff" : "#0f172a";
  };

  const bg = state.darkMode ? "#000000" : "#ffffff";
  const text = state.darkMode ? "#ffffff" : "#0f172a";
  const grid = state.darkMode ? "#14171d" : "#e2e8f0";
  const gridLight = state.darkMode ? "#0a0a0c" : "#f1f5f9";

  const fontName = state.terminalFont ? "Fira Code" : "Plus Jakarta Sans";

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
    <defs>
      <linearGradient id="mountainFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${state.darkMode ? "#080c14" : "#f1f5f9"}" stop-opacity="0.3" />
        <stop offset="100%" stop-color="${state.darkMode ? "#000000" : "#94a3b8"}" stop-opacity="0.05" />
      </linearGradient>
      <linearGradient id="baseFace" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#121620" />
        <stop offset="100%" stop-color="#05070c" />
      </linearGradient>
      <linearGradient id="topBand" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${state.darkMode ? "#00ff66" : "#60a5fa"}" />
        <stop offset="100%" stop-color="${state.darkMode ? "#00e5ff" : "#2563eb"}" />
      </linearGradient>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity="${state.darkMode ? 0.6 : 0.1}" />
      </filter>
      <filter id="tinyShadow" x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.25" />
      </filter>
      <style>
        .small { font: 600 16px '${fontName}', Arial, sans-serif; fill: ${state.darkMode ? "#4b5563" : "#475569"}; }
        .label { font: 800 ${state.labelFontSize ?? 18}px '${fontName}', Arial, sans-serif; fill: ${text}; }
        .title { font: 900 34px '${fontName}', Arial, sans-serif; fill: ${text}; letter-spacing: -0.5px; }
      </style>
    </defs>

    <rect x="0" y="0" width="${W}" height="${H}" fill="${bg}" />
    <text x="78" y="46" class="title">CIRCUITO DE ÉLITE</text>
    <text x="470" y="46" style="font: 900 24px Arial, sans-serif; fill:${text};">🏁🔥</text>

    ${state.showGrid ? yTicks.map((t) => {
      const y = yScale(t);
      return `<g><line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="${grid}" stroke-dasharray="6 8" /><text x="${pad.left - 14}" y="${y + 5}" text-anchor="end" class="small">${t} m</text></g>`;
    }).join("") : ""}

    ${xTicks.map((t) => {
      const x = xScale(t);
      return `<g><line x1="${x}" y1="${pad.top}" x2="${x}" y2="${H - pad.bottom}" stroke="${gridLight}" /><text x="${x}" y="${H - 58}" text-anchor="middle" class="small">${t.toFixed(1)} km</text></g>`;
    }).join("")}

    <text x="28" y="${pad.top + 18}" style="font: 800 16px '${fontName}', Arial, sans-serif; fill:${text};">Altitud (m)</text>

    <g filter="url(#softShadow)">
      <path d="${areaPath}" fill="url(#mountainFill)" />
    </g>

    <g filter="url(#tinyShadow)">
      ${bands.join("")}
    </g>

    <g filter="url(#tinyShadow)">
      <polygon points="${baseLeftX},${baseTopY} ${baseRightX},${baseTopY} ${baseRightX + 24},${baseFrontY} ${baseLeftX - 24},${baseFrontY}" fill="#111" />
      <polygon points="${baseLeftX},${baseTopY} ${baseRightX},${baseTopY} ${baseRightX + 24},${baseFrontY} ${baseLeftX - 24},${baseFrontY}" fill="url(#baseFace)" opacity="0.95" />
      <polygon points="${baseLeftX},${baseTopY} ${baseRightX},${baseTopY} ${baseRightX - 10},${baseTopY - 18} ${baseLeftX - 18},${baseTopY - 18}" fill="#000" />
      <line x1="${baseLeftX}" y1="${baseTopY}" x2="${baseRightX}" y2="${baseTopY}" stroke="#1e293b" stroke-width="2" />
    </g>

    <path d="${ridgePath}" fill="none" stroke="${getContourHex()}" stroke-width="${state.contourStrokeWidth ?? 3}" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" />
    <path d="${ridgePath}" fill="none" stroke="url(#topBand)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.4" />

    {/* Custom peak labels */}
    ${state.showLabels ? keyPeaks.map((p) => {
      const x = xScale(p.distanceKm);
      const y = yScale(p.elevation);
      const labelY = Math.max(66, y - 70);
      const key = p.id ? p.id : `${p.distanceKm.toFixed(2)}-${Math.round(p.elevation)}`;
      const customLabel = peakLabels[key] !== undefined ? peakLabels[key] : (p.name ? p.name : `Puerto`);
      
      return `<g><line x1="${x}" y1="${y - 5}" x2="${x}" y2="${labelY + 18}" stroke="${text}" stroke-dasharray="3 4" /><circle cx="${x}" cy="${y - 5}" r="8" fill="#ef4444" stroke="#fff" stroke-width="3" /><text x="${x}" y="${labelY}" text-anchor="middle" class="label">${customLabel}</text><text x="${x}" y="${labelY + 24}" text-anchor="middle" style="font: 800 15px 'Plus Jakarta Sans', Arial, sans-serif; fill:${text};">${Math.round(p.elevation)} m · ${p.distanceKm.toFixed(2)} km</text><text x="${x}" y="${labelY + 46}" text-anchor="middle" style="font: 900 15px 'Outfit', Arial, sans-serif; fill:#00ff66;">Máx. ${p.grade.toFixed(1)}%</text></g>`;
    }).join("") : ""}

    {/* Interactive laser pointer tracker */}
    ${hoverData ? `
      <g>
        <line x1="${xScale(hoverData.distanceKm)}" y1="${pad.top}" x2="${xScale(hoverData.distanceKm)}" y2="${floorY}" stroke="var(--accent-color)" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.8" />
        <circle cx="${xScale(hoverData.distanceKm)}" cy="${yScale(hoverData.elevation)}" r="8" fill="var(--accent-color)" stroke="#fff" stroke-width="2" />
      </g>
    ` : ""}

    <g>
      <circle cx="${xScale(0)}" cy="${yScale(data[0]?.elevation ?? activeMinEle)}" r="12" fill="#00e5ff" stroke="#fff" stroke-width="4" />
      <circle cx="${xScale(targetKm)}" cy="${yScale(data[data.length - 1]?.elevation ?? activeMinEle)}" r="12" fill="#ef4444" stroke="#fff" stroke-width="4" />
    </g>

    <g transform="translate(${W - 680}, ${H - 98})">
      <rect x="0" y="0" width="620" height="62" rx="14" fill="${bg}" stroke="${grid}" />
      ${climbLegend.map((item, idx) => {
        const x = 12 + idx * 122;
        return `<g transform="translate(${x},20)"><rect width="20" height="20" rx="4" fill="${item[1]}" /><text x="26" y="16" style="font: 600 13px 'Plus Jakarta Sans', Arial, sans-serif; fill:${text};">${item[0]}</text></g>`;
      }).join("")}
    </g>

    <text x="78" y="${H - 22}" style="font: 800 18px '${fontName}', Arial, sans-serif; fill:${state.darkMode ? "#4b5563" : "#475569"};">${stats ? `${stats.distanceKm.toFixed(1)} km · +${Math.round(stats.ascent)} m · Eje Y ${Math.round(activeMinEle)}–${Math.round(activeMaxEle)} m` : "Carga el GPX para generar la etapa"}</text>
  </svg>`;
}

function makeMapSvg(map, darkMode = false) {
  if (!map) return "";
  const { path, W, H, points } = map;
  const bg = darkMode ? "#000000" : "#FFFFFF";
  const grid = darkMode ? "#14171d" : "#e2e8f0";
  const label = darkMode ? "#ffffff" : "#0f172a";
  const route = darkMode ? "#00ff66" : "#2563eb";
  const routeSoft = darkMode ? "rgba(0,255,102,0.12)" : "rgba(37,99,235,0.08)";

  const start = points[0];
  const end = points[points.length - 1];

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
      <rect x="0" y="0" width="${W}" height="${H}" fill="${bg}" />
      <rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="22" fill="none" stroke="${grid}" stroke-width="2" />
      <g opacity="0.35">
        ${Array.from({ length: 8 }).map((_, i) => `<line x1="${40 + ((W - 80) / 7) * i}" y1="40" x2="${40 + ((W - 80) / 7) * i}" y2="${H - 40}" stroke="${grid}" />`).join("")}
        ${Array.from({ length: 6 }).map((_, i) => `<line x1="40" y1="${40 + ((H - 80) / 5) * i}" x2="${W - 40}" y2="${40 + ((H - 80) / 5) * i}" stroke="${grid}" />`).join("")}
      </g>
      <path d="${path}" fill="none" stroke="${routeSoft}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${path}" fill="none" stroke="${route}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${path}" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="20 14" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />
      <circle cx="${start.x}" cy="${start.y}" r="18" fill="#00e5ff" stroke="#fff" stroke-width="6" />
      <circle cx="${end.x}" cy="${end.y}" r="18" fill="#ef4444" stroke="#fff" stroke-width="6" />
      <text x="70" y="96" style="font: 900 30px 'Outfit', Arial, sans-serif; fill:${label};">Mapa del circuito</text>
      <text x="70" y="132" style="font: 700 18px 'Plus Jakarta Sans', Arial, sans-serif; fill:${label}; opacity:0.75;">Recorrido plano exportable en SVG</text>
      <text x="${start.x + 28}" y="${start.y - 18}" style="font: 900 28px 'Outfit', Arial, sans-serif; fill:${label};">Salida</text>
      <text x="${end.x - 16}" y="${end.y - 24}" text-anchor="end" style="font: 900 28px 'Outfit', Arial, sans-serif; fill:${label};">Meta</text>
      <text x="70" y="${H - 74}" style="font: 800 18px 'Plus Jakarta Sans', Arial, sans-serif; fill:${label};">Ruta basada en el GPX cargado</text>
    </svg>`;
}

function downloadText(filename, content, mime = "image/svg+xml") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Control({ label, value, min, max, step, onChange, suffix = "", description = "" }) {
  return (
    <div style={{ padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: "10px", background: "var(--bg-secondary)", display: "flex", flexDirection: "column", gap: "4px", boxShadow: "var(--shadow-sm)", transition: "all var(--transition-fast)" }} className="control-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)" }}>{label}</div>
        <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--accent-color)", fontFamily: "var(--font-mono)" }}>{value}{suffix}</div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      {description && (
        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", lineHeight: "1.3" }} className="mono-terminal">
          &gt; {description}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color = "var(--accent-color)" }) {
  return (
    <div className="glass-panel" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", color: color, fontSize: "14px" }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: "var(--text-muted)", fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</div>
        <div className="mono-terminal" style={{ marginTop: "1px", fontSize: "16px", fontWeight: 900, color: "var(--text-primary)" }}>{value}</div>
      </div>
    </div>
  );
}

export default function StageProfileEditor() {
  const { requestDownload } = useAuth();
  const [fileName, setFileName] = useState("");
  const [profile, setProfile] = useState(null);
  const [state, setState] = useState(DEFAULT_STATE);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Custom Peak labels and trim range states
  const [peakLabels, setPeakLabels] = useState({});
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);

  // Manual added peaks
  const [manualPeaks, setManualPeaks] = useState([]);
  const [newPeakName, setNewPeakName] = useState("");
  const [newPeakKm, setNewPeakKm] = useState(0);

  // History list
  const [history, setHistory] = useState([]);

  // Live Hover Tooltip state
  const [hoverData, setHoverData] = useState(null);

  const [activeTab, setActiveTab] = useState("crop"); // tabs: crop, colors, labels, scale, history
  const fileInputRef = useRef(null);
  const graphContainerRef = useRef(null);

  // Sync Dark/Light Mode state to HTML tag
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [state.darkMode]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("altimetria_gpx_history_v2");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Update theme accent variables on mount or custom color theme changes
  const rootStyle = {
    "--accent-color": 
      state.themeColor === "cyan" ? "#00e5ff" :
      state.themeColor === "amber" ? "#ffaa00" :
      state.themeColor === "red" ? "#ff0055" :
      state.themeColor === "purple" ? "#d300ff" : 
      "#00ff66", // green default
    "--accent-soft": 
      state.themeColor === "cyan" ? "rgba(0, 229, 255, 0.08)" :
      state.themeColor === "amber" ? "rgba(255, 170, 0, 0.08)" :
      state.themeColor === "red" ? "rgba(255, 0, 85, 0.08)" :
      state.themeColor === "purple" ? "rgba(211, 0, 255, 0.08)" : 
      "rgba(0, 255, 102, 0.08)",
  };

  const onFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseGpxText(text);
    const computed = computeProfile(parsed);
    setProfile(computed);
    setFileName(file.name);
    
    // Reset range boundaries
    setTrimStart(0);
    setTrimEnd(computed.totalDistanceKm);
    setNewPeakKm(0);
    setManualPeaks([]);
    setPeakLabels({});
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const resetProfile = () => {
    setProfile(null);
    setFileName("");
    setShowMapModal(false);
    setManualPeaks([]);
    setPeakLabels({});
  };

  // REACTIVE CROP: Trims GPX rows based on trim range Km
  const croppedProfile = useMemo(() => {
    if (!profile) return null;
    const { rows, distM } = profile;
    
    const startIndex = distM.findIndex(d => d >= trimStart * 1000);
    const endIndex = distM.findIndex(d => d >= trimEnd * 1000);
    
    const activeStart = startIndex !== -1 ? startIndex : 0;
    const activeEnd = endIndex !== -1 ? endIndex + 1 : rows.length;
    
    const slicedRows = rows.slice(activeStart, activeEnd);
    if (slicedRows.length < 2) return profile;
    
    return computeProfile(slicedRows);
  }, [profile, trimStart, trimEnd]);

  const rendered = useMemo(() => buildSamples(croppedProfile, state), [croppedProfile, state]);
  const stats = rendered?.stats;

  // DYNAMIC PEAK DETECTION
  const detectedPeaks = useMemo(() => {
    if (!rendered || !rendered.sample) return [];
    const data = rendered.sample;
    const peaks = [];
    for (let i = 2; i < data.length - 2; i++) {
      const a = data[i - 1].elevation;
      const b = data[i].elevation;
      const c = data[i + 1].elevation;
      if (b >= a && b >= c && data[i].grade >= (state.tModerate ?? 3.5)) peaks.push(data[i]);
    }
    const spaced = [];
    for (const p of peaks) {
      const last = spaced[spaced.length - 1];
      if (!last || p.distanceKm - last.distanceKm > 3.5) spaced.push(p);
    }
    return spaced.slice(0, 4); // Limit to 4 key automatic peaks
  }, [rendered, state.tModerate]);

  // COMBINE DETECTED PEAKS AND MANUAL PEAKS
  const combinedPeaks = useMemo(() => {
    const list = [...detectedPeaks];
    // Map manual peaks to list including dynamic elevation find!
    const sampleData = rendered?.sample || [];
    manualPeaks.forEach((p) => {
      // Find nearest elevation and grade
      if (!sampleData.length) return;
      let closest = sampleData[0];
      let minDiff = Math.abs(sampleData[0].distanceKm - p.distanceKm);
      for (const pt of sampleData) {
        const diff = Math.abs(pt.distanceKm - p.distanceKm);
        if (diff < minDiff) {
          minDiff = diff;
          closest = pt;
        }
      }
      list.push({
        id: p.id,
        distanceKm: p.distanceKm,
        elevation: closest.elevation,
        grade: closest.grade,
        name: p.name,
      });
    });
    return list;
  }, [detectedPeaks, manualPeaks, rendered]);

  const map = useMemo(() => buildMap(croppedProfile?.rows || []), [croppedProfile]);
  const profileSvg = useMemo(() => makeProfileSvg(rendered, state, combinedPeaks, peakLabels, hoverData), [rendered, state, combinedPeaks, peakLabels, hoverData]);
  const mapSvg = useMemo(() => makeMapSvg(map, state.darkMode), [map, state.darkMode]);

  // Add Manual peak helper
  const addManualPeak = () => {
    if (!newPeakName.trim()) return;
    const id = `manual-${Date.now()}`;
    const newPeak = {
      id,
      name: newPeakName.trim(),
      distanceKm: newPeakKm,
    };
    setManualPeaks((prev) => [...prev, newPeak]);
    setPeakLabels((prev) => ({ ...prev, [id]: newPeakName.trim() }));
    setNewPeakName("");
  };

  const removeManualPeak = (id) => {
    setManualPeaks((prev) => prev.filter((p) => p.id !== id));
    setPeakLabels((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // HISTORY MANAGEMENT
  const saveToHistory = () => {
    if (!profile) return;
    const newItem = {
      id: Date.now().toString(),
      fileName,
      date: new Date().toLocaleTimeString() + " " + new Date().toLocaleDateString(),
      trimStart,
      trimEnd,
      state,
      peakLabels,
      manualPeaks,
      profileBase: profile // Save raw profile to restore correctly!
    };
    const updated = [newItem, ...history].slice(0, 10); // Keep top 10
    setHistory(updated);
    localStorage.setItem("altimetria_gpx_history_v2", JSON.stringify(updated));
  };

  const loadHistoryItem = (item) => {
    setProfile(item.profileBase);
    setFileName(item.fileName);
    setTrimStart(item.trimStart);
    setTrimEnd(item.trimEnd);
    setState(item.state);
    setPeakLabels(item.peakLabels);
    setManualPeaks(item.manualPeaks);
  };

  const deleteHistoryItem = (id, e) => {
    e.stopPropagation();
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    localStorage.setItem("altimetria_gpx_history_v2", JSON.stringify(updated));
  };

  // INTERACTIVE MOUSE HOVER TRACKER
  const handleMouseMove = (e) => {
    if (!profile || !graphContainerRef.current || !rendered.sample?.length) return;
    const rect = graphContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const pct = mouseX / rect.width;

    const targetKm = stats?.distanceKm ?? TARGET_DISTANCE_KM;
    // SVG padding boundaries translation
    const svgX = pct * 2200;
    const padLeft = 96;
    const padRight = 55;
    const innerW = 2200 - padLeft - padRight;

    let km = ((svgX - padLeft) / innerW) * targetKm;
    if (km < 0) km = 0;
    if (km > targetKm) km = targetKm;

    // Find closest sample
    let closest = rendered.sample[0];
    let minDiff = Math.abs(rendered.sample[0].distanceKm - km);
    for (const pt of rendered.sample) {
      const diff = Math.abs(pt.distanceKm - km);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }

    setHoverData({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      distanceKm: closest.distanceKm,
      elevation: closest.elevation,
      grade: closest.grade,
    });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <div className="animate-fade-in" style={{ minHeight: "100vh", position: "relative", ...rootStyle }}>
      
      {/* Collapsible left sidebar for controllers */}
      <div className={`sidebar-panel ${sidebarOpen ? "" : "collapsed"}`} style={{ padding: "24px 16px" }}>
        
        {/* User Badge */}
        <div style={{ marginBottom: "12px" }}>
          <UserBadge />
        </div>

        {/* Sidebar Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "24px" }}>🏆</span>
            <h1 className="mono-terminal" style={{ fontSize: "18px", fontWeight: 900, margin: 0 }}>
              STAGE_CONSOLE_v7.8
            </h1>
          </div>
          <p className="mono-terminal" style={{ color: "var(--text-secondary)", fontSize: "10px", margin: 0 }}>
            &gt; Volumetric Telemetry Suite
          </p>
        </div>

        {/* Upload Zone inside Sidebar */}
        <div style={{ marginBottom: "14px" }}>
          {!profile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDragOver ? "2px dashed var(--accent-color)" : "2px dashed var(--border-color)",
                borderRadius: "14px",
                padding: "24px 12px",
                textAlign: "center",
                background: isDragOver ? "var(--accent-soft)" : "var(--bg-secondary)",
                cursor: "pointer",
                transition: "all var(--transition-normal)",
                boxShadow: "var(--shadow-sm)"
              }}
            >
              <span style={{ fontSize: "28px" }}>💾</span>
              <div className="mono-terminal" style={{ fontWeight: 800, fontSize: "12px", color: "var(--accent-color)", marginTop: "4px" }}>
                [ CARGAR RUTA GPX ]
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: "10px", background: "var(--bg-secondary)", border: "1px solid var(--accent-color)" }}>
              <div className="mono-terminal" style={{ fontSize: "10px", color: "var(--text-muted)" }}>&gt; GPX_ACTIVO:</div>
              <div className="mono-terminal" style={{ fontSize: "11px", fontWeight: 900, wordBreak: "break-all", color: "var(--accent-color)" }}>
                {fileName}
              </div>
              
              <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                <button
                  onClick={saveToHistory}
                  style={{
                    flex: 1,
                    padding: "6px",
                    borderRadius: "6px",
                    background: "var(--accent-color)",
                    color: "#000",
                    border: "none",
                    fontWeight: 800,
                    fontSize: "10px",
                    cursor: "pointer"
                  }}
                  className="mono-terminal"
                  title="Guardar esta configuración y segmento en tu historial local"
                >
                  Guardar Historial
                </button>
                <button
                  onClick={resetProfile}
                  style={{
                    padding: "6px",
                    borderRadius: "6px",
                    background: "transparent",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                    fontWeight: 700,
                    fontSize: "10px",
                    cursor: "pointer"
                  }}
                  className="mono-terminal"
                >
                  Cargar Otro
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Console Navigation Tabs inside Sidebar */}
        {profile && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "3px", background: "var(--bg-secondary)", padding: "2px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <button 
                onClick={() => setActiveTab("crop")} 
                style={{ padding: "6px 2px", border: "none", borderRadius: "6px", fontSize: "9px", fontWeight: 800, cursor: "pointer", background: activeTab === "crop" ? "var(--accent-color)" : "transparent", color: activeTab === "crop" ? "#000" : "var(--text-secondary)" }}
                className="mono-terminal"
              >
                ✂️ TRAMO
              </button>
              <button 
                onClick={() => setActiveTab("colors")} 
                style={{ padding: "6px 2px", border: "none", borderRadius: "6px", fontSize: "9px", fontWeight: 800, cursor: "pointer", background: activeTab === "colors" ? "var(--accent-color)" : "transparent", color: activeTab === "colors" ? "#000" : "var(--text-secondary)" }}
                className="mono-terminal"
              >
                🎨 PALETA
              </button>
              <button 
                onClick={() => setActiveTab("labels")} 
                style={{ padding: "6px 2px", border: "none", borderRadius: "6px", fontSize: "9px", fontWeight: 800, cursor: "pointer", background: activeTab === "labels" ? "var(--accent-color)" : "transparent", color: activeTab === "labels" ? "#000" : "var(--text-secondary)" }}
                className="mono-terminal"
              >
                🏷️ PUERTOS
              </button>
              <button 
                onClick={() => setActiveTab("scale")} 
                style={{ padding: "6px 2px", border: "none", borderRadius: "6px", fontSize: "9px", fontWeight: 800, cursor: "pointer", background: activeTab === "scale" ? "var(--accent-color)" : "transparent", color: activeTab === "scale" ? "#000" : "var(--text-secondary)" }}
                className="mono-terminal"
              >
                📐 ESCALAS
              </button>
              <button 
                onClick={() => setActiveTab("history")} 
                style={{ gridColumn: "span 2", padding: "6px 2px", border: "none", borderRadius: "6px", fontSize: "9px", fontWeight: 800, cursor: "pointer", background: activeTab === "history" ? "var(--accent-color)" : "transparent", color: activeTab === "history" ? "#000" : "var(--text-secondary)" }}
                className="mono-terminal"
              >
                💾 HISTORIAL
              </button>
            </div>

            {/* Tab 1: GPX Range Selector */}
            {activeTab === "crop" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} className="animate-fade-in">
                <h5 className="mono-terminal" style={{ fontSize: "11px", color: "var(--accent-color)", margin: 0 }}>
                  [ RECORTAR GPX ]
                </h5>
                
                <Control 
                  label="Punto Inicio (Km)" 
                  value={trimStart} 
                  min={0} 
                  max={Math.max(0, trimEnd - 1)} 
                  step={0.1} 
                  suffix=" km" 
                  onChange={(v) => setTrimStart(Math.min(v, trimEnd - 0.5))}
                  description="Fija el punto de partida del segmento altimétrico."
                />
                
                <Control 
                  label="Punto Fin (Km)" 
                  value={trimEnd} 
                  min={trimStart + 1} 
                  max={Math.ceil(profile.totalDistanceKm)} 
                  step={0.1} 
                  suffix=" km" 
                  onChange={(v) => setTrimEnd(Math.max(v, trimStart + 0.5))}
                  description="Fija el punto de llegada final del segmento."
                />

                <button
                  onClick={() => {
                    setTrimStart(0);
                    setTrimEnd(profile.totalDistanceKm);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "6px",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                    fontWeight: 700,
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                  className="mono-terminal"
                >
                  Restaurar Ruta Total
                </button>
              </div>
            )}

            {/* Tab 2: Custom Volumetric Color schemes and Theme selectors */}
            {activeTab === "colors" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }} className="animate-fade-in">
                
                {/* Accent theme color picker */}
                <div style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "10px", background: "var(--bg-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--text-secondary)" }} className="mono-terminal">Color de Consola (Tema):</span>
                  <select 
                    value={state.themeColor} 
                    onChange={(e) => setState(s => ({ ...s, themeColor: e.target.value }))}
                    style={{
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-color)",
                      padding: "6px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                      outline: "none"
                    }}
                  >
                    <option value="green">🟢 Verde Neón</option>
                    <option value="cyan">🔵 Celeste Matrix</option>
                    <option value="amber">🟠 Ámbar Hacker</option>
                    <option value="red">🔴 Crimson Cyber</option>
                    <option value="purple">🟣 Púrpura Fantasma</option>
                  </select>
                </div>

                {/* Font Picker */}
                <div style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "10px", background: "var(--bg-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--text-secondary)" }} className="mono-terminal">Estilo de Fuente:</span>
                  <select 
                    value={state.terminalFont ? "terminal" : "modern"} 
                    onChange={(e) => setState(s => ({ ...s, terminalFont: e.target.value === "terminal" }))}
                    style={{
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-color)",
                      padding: "6px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                      outline: "none"
                    }}
                  >
                    <option value="terminal">📟 Terminal (Fira Code Mono)</option>
                    <option value="modern">🎨 Elegante (Plus Jakarta Sans)</option>
                  </select>
                </div>

                {/* Palette picker */}
                <div style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "10px", background: "var(--bg-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--text-secondary)" }} className="mono-terminal">Paleta Altimétrica:</span>
                  <select 
                    value={state.palette} 
                    onChange={(e) => setState(s => ({ ...s, palette: e.target.value }))}
                    style={{
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-color)",
                      padding: "6px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                      outline: "none"
                    }}
                  >
                    <option value="terminal">📟 Terminal Neon</option>
                    <option value="uci_official">🚴‍♂️ UCI Standard</option>
                    <option value="steep_gradient">🚨 Steep AMOLED (AMOLED-Black)</option>
                    <option value="volcano">🌋 Volcano Heat</option>
                    <option value="cyberpunk">🌌 Cyberpunk Neon</option>
                    <option value="classic">🔵 Classic Blue</option>
                  </select>
                </div>

                <Control label="Opacidad de Volúmen" value={state.fillOpacity} min={0.3} max={1} step={0.05} onChange={(v) => setState((s) => ({ ...s, fillOpacity: v }))} description="Ajusta la transparencia de las rampas." />
              </div>
            )}

            {/* Tab 3: Custom Peak Labels & MANUAL Peak markers */}
            {activeTab === "labels" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }} className="animate-fade-in">
                
                {/* MANUAL PEAK CREATOR */}
                <div style={{ padding: "10px", border: "1px solid var(--border-color)", borderRadius: "10px", background: "var(--bg-secondary)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--accent-color)" }} className="mono-terminal">➕ AGREGAR PUERTO MANUAL</span>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-secondary)" }} className="mono-terminal">Nombre del puerto:</span>
                    <input 
                      type="text" 
                      placeholder="Ej: Alto de Patios"
                      value={newPeakName}
                      onChange={(e) => setNewPeakName(e.target.value)}
                      style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", padding: "6px", borderRadius: "6px", fontSize: "11px", fontFamily: "var(--font-mono)", outline: "none" }}
                    />
                  </div>

                  <Control 
                    label="Ubicación (Km)" 
                    value={newPeakKm} 
                    min={trimStart} 
                    max={trimEnd} 
                    step={0.1} 
                    suffix=" km" 
                    onChange={(v) => setNewPeakKm(v)} 
                  />

                  <button
                    onClick={addManualPeak}
                    disabled={!newPeakName.trim()}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      background: "var(--accent-color)",
                      color: "#000",
                      border: "none",
                      fontWeight: 800,
                      fontSize: "11px",
                      cursor: "pointer",
                      opacity: newPeakName.trim() ? 1 : 0.5
                    }}
                    className="mono-terminal"
                  >
                    Añadir Puerto
                  </button>
                </div>

                {/* PEAKS LABELS LIST */}
                <h5 className="mono-terminal" style={{ fontSize: "11px", color: "var(--accent-color)", margin: "4px 0 0 0" }}>
                  [ CONTEXTO DE ETIQUETAS ]
                </h5>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }}>
                  {combinedPeaks.map((peak, idx) => {
                    const key = peak.id ? peak.id : `${peak.distanceKm.toFixed(2)}-${Math.round(peak.elevation)}`;
                    const currentLabel = peakLabels[key] !== undefined ? peakLabels[key] : (peak.name ? peak.name : `Puerto`);
                    const isManual = peak.id && peak.id.startsWith("manual-");

                    return (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "6px", border: "1px solid var(--border-color)", borderRadius: "6px", background: "var(--bg-secondary)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "9px", color: "var(--text-muted)" }} className="mono-terminal">
                            {isManual ? "Manual" : "Auto"} · Km {peak.distanceKm.toFixed(1)} ({Math.round(peak.elevation)}m)
                          </span>
                          {isManual && (
                            <button onClick={() => removeManualPeak(peak.id)} style={{ background: "transparent", border: "none", color: "#ff0055", cursor: "pointer", fontSize: "10px", fontWeight: "bold" }}>
                              [X]
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={currentLabel}
                          onChange={(e) => setPeakLabels(prev => ({ ...prev, [key]: e.target.value }))}
                          style={{
                            background: "var(--bg-primary)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border-color)",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontFamily: "var(--font-mono)",
                            outline: "none"
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 4: Scaling options */}
            {activeTab === "scale" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }} className="animate-fade-in">
                
                {/* Contour color dropdown selector */}
                <div style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "10px", background: "var(--bg-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--text-secondary)" }} className="mono-terminal">Color del Contorno Cima:</span>
                  <select 
                    value={state.contourColor} 
                    onChange={(e) => setState(s => ({ ...s, contourColor: e.target.value }))}
                    style={{
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-color)",
                      padding: "6px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                      outline: "none"
                    }}
                  >
                    <option value="default">⚪ Estándar (Blanco/Gris)</option>
                    <option value="green">🟢 Verde Neón</option>
                    <option value="cyan">🔵 Celeste Neón</option>
                    <option value="magenta">🟣 Púrpura Neón</option>
                    <option value="red">🔴 Rojo Fuego</option>
                    <option value="gold">🟡 Amarillo Oro</option>
                    <option value="black">⚫ Negro Sólido</option>
                  </select>
                </div>

                <Control label="Exageración Relieve" value={state.exaggeration} min={1.0} max={4.0} step={0.1} suffix="x" onChange={(v) => setState((s) => ({ ...s, exaggeration: v }))} description="Aumenta visualmente la altura de las rampas." />
                <Control label="Suavizado Altura" value={state.smoothing} min={3} max={25} step={1} onChange={(v) => setState((s) => ({ ...s, smoothing: v }))} description="Elimina imperfecciones de altitud GPS." />
                <Control label="Espesor Base 3D" value={state.baseThickness} min={10} max={150} step={5} suffix="m" onChange={(v) => setState((s) => ({ ...s, baseThickness: v }))} description="Modifica el grosor inferior de la montaña." />
                <Control label="Grosor Contorno" value={state.contourStrokeWidth} min={1} max={8} step={1} suffix="px" onChange={(v) => setState((s) => ({ ...s, contourStrokeWidth: v }))} description="Regula el trazo del relieve superior." />

                <div 
                  onClick={() => setState(s => ({ ...s, useGpxDistance: !s.useGpxDistance }))}
                  style={{ padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "10px", background: state.useGpxDistance ? "var(--accent-soft)" : "var(--bg-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "all var(--transition-fast)" }}
                  title="Activar para conservar el kilometraje exacto del GPS. Si se desactiva, la ruta se escala horizontalmente para coincidir con la 'Distancia Escala' (útil para estandarizar perfiles)."
                >
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)" }} className="mono-terminal">Usar km GPX Real</span>
                  <span style={{ fontSize: "11px", fontWeight: 950, color: "var(--accent-color)", fontFamily: "var(--font-mono)" }}>
                    {state.useGpxDistance ? "[SÍ]" : "[NO]"}
                  </span>
                </div>

                {!state.useGpxDistance && (
                  <Control label="Distancia Escala" value={state.targetDistance} min={5.0} max={250.0} step={0.5} suffix=" km" onChange={(v) => setState((s) => ({ ...s, targetDistance: v }))} description="Distancia horizontal simulada de la etapa." />
                )}
              </div>
            )}

            {/* Tab 5: Local Storage History Items */}
            {activeTab === "history" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }} className="animate-fade-in">
                <h5 className="mono-terminal" style={{ fontSize: "11px", color: "var(--accent-color)", margin: 0 }}>
                  [ HISTORIAL LOCAL ]
                </h5>
                <p className="mono-terminal" style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                  Rutas y configuraciones guardadas previamente en este equipo.
                </p>

                {history.length === 0 ? (
                  <div style={{ padding: "12px", border: "1px dashed var(--border-color)", borderRadius: "8px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }} className="mono-terminal">
                    No hay rutas guardadas aún. ¡Haz clic en "Guardar Historial" arriba!
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto" }}>
                    {history.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => loadHistoryItem(item)}
                        style={{ padding: "8px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "var(--bg-secondary)", cursor: "pointer", transition: "all var(--transition-fast)", display: "flex", flexDirection: "column", gap: "2px" }}
                        className="glass-panel"
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", fontWeight: "bold", wordBreak: "break-all", color: "var(--text-primary)" }}>{item.fileName}</span>
                          <button onClick={(e) => deleteHistoryItem(item.id, e)} style={{ background: "transparent", border: "none", color: "#ff0055", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>
                            [X]
                          </button>
                        </div>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{item.date}</span>
                        <span style={{ fontSize: "9px", color: "var(--accent-color)" }} className="mono-terminal">
                          Tramo: {item.trimStart.toFixed(1)} - {item.trimEnd.toFixed(1)} km
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar Toggle handle button */}
      <button 
        className={`sidebar-toggle-btn ${sidebarOpen ? "" : "collapsed"}`} 
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? "[ « PANEL ]" : "[ PANEL » ]"}
      </button>

      {/* Main Content Layout shifting dynamically */}
      <div className={`main-layout-container ${sidebarOpen ? "" : "wide"}`}>
        
        {/* Top Navbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
          <div>
            <h2 className="mono-terminal" style={{ fontSize: "24px", fontWeight: 900, letterSpacing: "-0.5px", margin: 0 }}>
              TELEMETRY_VIEWPORT_v7.8
            </h2>
            <p className="mono-terminal" style={{ color: "var(--text-secondary)", fontSize: "12px", margin: "2px 0 0 0" }}>
              &gt; Professional volumetric climbing console with dynamic range calibration
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => setShowDocModal(true)}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                background: "transparent",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer"
              }}
              className="mono-terminal"
            >
              📖 Guía de Controles
            </button>

            {profile && (
              <button
                onClick={() => setShowMapModal(true)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "transparent",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
                className="mono-terminal"
              >
                🗺️ Ver Mapa Trazado
              </button>
            )}

            {profile && (
              <button
                onClick={() => { if (requestDownload()) downloadText("perfil-altimetria.svg", profileSvg); }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "var(--accent-color)",
                  color: "#000",
                  border: "none",
                  fontWeight: 800,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
                className="mono-terminal"
              >
                ⬇️ Exportar SVG
              </button>
            )}

            <button
              onClick={() => setState((s) => ({ ...s, darkMode: !s.darkMode }))}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "1px solid var(--border-color)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-sm)"
              }}
            >
              {state.darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Dynamic Center Panel */}
        {!profile ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "65vh", gap: "20px" }}>
            
            {/* GPX Drag zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed var(--border-color)",
                borderRadius: "20px",
                padding: "60px 40px",
                textAlign: "center",
                background: "var(--bg-panel)",
                cursor: "pointer",
                maxWidth: "600px",
                width: "100%",
                boxShadow: "var(--shadow-md)"
              }}
            >
              <span style={{ fontSize: "56px" }}>🚴‍♂️</span>
              <div className="mono-terminal" style={{ fontWeight: 800, fontSize: "20px", color: "var(--accent-color)", marginTop: "16px" }}>
                [ CARGAR RUTA GPX ]
              </div>
              <p className="mono-terminal" style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "8px" }}>
                Arrastra tu archivo GPX en esta zona o búscalo en tu ordenador para inicializar el visualizador 3D volumétrico.
              </p>
              <button
                style={{
                  marginTop: "16px",
                  padding: "10px 24px",
                  borderRadius: "10px",
                  background: "var(--accent-color)",
                  color: "#000",
                  border: "none",
                  fontWeight: 800,
                  fontSize: "13px",
                  cursor: "pointer"
                }}
                className="mono-terminal"
              >
                BUSCAR GPX
              </button>
            </div>

            {/* Quick documentation preview under landing area */}
            <div className="glass-panel" style={{ maxWidth: "600px", width: "100%", padding: "20px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold" }} className="mono-terminal">&gt; DOCUMENTACIÓN_RÁPIDA</div>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                <li><strong>Usar km GPX Real:</strong> Mantiene la escala de distancia medida por el GPS. Si se desactiva, puedes estandarizar tu ruta a una distancia horizontal custom (ej: 34.5 Km).</li>
                <li><strong>Exageración Relieve:</strong> Realza las cumbres multiplicando verticalmente la escala del perfil altimétrico.</li>
                <li><strong>Umbrales de Rampa:</strong> Calibra con precisión en qué porcentaje de pendiente cambia el color de las subidas.</li>
                <li><strong>Guardado en Historial:</strong> Preserva localmente tus recortes y configuraciones para cargarlas en un clic sin subir el archivo de nuevo.</li>
              </ul>
            </div>

          </div>
        ) : (
          /* Main Altimetry Volumetric Display Card */
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} className="animate-fade-in">
            
            {/* Visualizer Frame */}
            <div className="glass-panel" style={{ overflow: "hidden", width: "100%", border: "1px solid var(--border-color)", position: "relative" }}>
              
              {/* Floating Live Hover Tooltip overlay styled beautifully */}
              {hoverData && (
                <div style={{
                  position: "absolute",
                  left: `${hoverData.x + 20}px`,
                  top: `${hoverData.y - 80}px`,
                  background: "rgba(0,0,0,0.95)",
                  border: "1.5px solid var(--accent-color)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "#fff",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                  pointerEvents: "none",
                  zIndex: 80,
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px"
                }}>
                  <div style={{ fontWeight: "bold", borderBottom: "1px solid #333", paddingBottom: "3px", color: "var(--accent-color)" }}>
                    &gt; RUTA_LIVE_SCAN:
                  </div>
                  <div>Distancia: <span style={{ fontWeight: "bold" }}>{hoverData.distanceKm.toFixed(2)} km</span></div>
                  <div>Elevación: <span style={{ fontWeight: "bold" }}>{Math.round(hoverData.elevation)} m</span></div>
                  <div>Pendiente: <span style={{ fontWeight: "bold", color: hoverData.grade >= 1.5 ? "var(--accent-color)" : "#94A3B8" }}>{hoverData.grade.toFixed(1)}%</span></div>
                </div>
              )}

              <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)" }}>
                <h3 className="mono-terminal" style={{ fontSize: "14px", fontWeight: 800, margin: 0 }}>
                  📈 RENDER_VOLUMETRIC_PROFILE: <span style={{ color: "var(--accent-color)" }}>{fileName}</span>
                </h3>
                <span className="mono-terminal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Pasa el cursor sobre el relieve para escanear pendientes en vivo
                </span>
              </div>

              {/* Viewport Frame with interactive mouse hover events */}
              <div 
                ref={graphContainerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ width: "100%", padding: "12px", background: state.darkMode ? "#000000" : "#ffffff", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", cursor: "crosshair" }}
              >
                <div style={{ width: "100%", maxWidth: "100%", height: "auto", maxHeight: "68vh", pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: profileSvg }} />
              </div>
            </div>

            {/* Stats row directly underneath */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
              <StatCard label="Distancia Tramo" value={`${stats.distanceKm.toFixed(1)} km`} icon="📏" />
              <StatCard label="Desnivel positivo" value={`+${Math.round(stats.ascent)} m`} icon="📈" color="#00ff66" />
              <StatCard label="Desnivel negativo" value={`-${Math.round(stats.descent)} m`} icon="📉" color="#ff0055" />
              <StatCard label="Pendiente máx." value={`${stats.maxGrade.toFixed(1)}%`} icon="⚡" color="#ffaa00" />
              <StatCard label="Altitud Mínima" value={`${Math.round(stats.minEle)} m`} icon="🏔️" color="#00e5ff" />
              <StatCard label="Altitud Máxima" value={`${Math.round(stats.maxEle)} m`} icon="⛰️" color="#d300ff" />
            </div>

          </div>
        )}

      </div>

      <input ref={fileInputRef} type="file" accept=".gpx,.xml" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0])} />

      {/* Flat Map Modal Popup Overlay */}
      {showMapModal && profile && (
        <div className="modal-overlay" onClick={() => setShowMapModal(false)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>🗺️</span>
                <h3 className="mono-terminal" style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>
                  MAP_TRAZADO_PREVIEW: <span style={{ color: "var(--accent-color)" }}>{fileName}</span>
                </h3>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => { if (requestDownload()) downloadText("mapa-circuito.svg", mapSvg); }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "var(--accent-color)",
                    color: "#000",
                    border: "none",
                    fontWeight: 800,
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                  className="mono-terminal"
                >
                  EXPT_MAP_SVG
                </button>
                <button
                  onClick={() => setShowMapModal(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    background: "transparent",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                  className="mono-terminal"
                >
                  CLOSE_X
                </button>
              </div>
            </div>
            
            <div style={{ padding: "16px", background: state.darkMode ? "#000000" : "#ffffff", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <div style={{ width: "100%", maxWidth: "800px", aspectRatio: "1400 / 900" }} dangerouslySetInnerHTML={{ __html: mapSvg }} />
            </div>
            
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", background: "var(--bg-secondary)" }}>
              <button
                onClick={() => setShowMapModal(false)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  background: "var(--accent-color)",
                  color: "#000",
                  border: "none",
                  fontWeight: 800,
                  fontSize: "13px",
                  cursor: "pointer"
                }}
                className="mono-terminal"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls Documentation Help Modal */}
      {showDocModal && (
        <div className="modal-overlay" onClick={() => setShowDocModal(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: "750px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>📖</span>
                <h3 className="mono-terminal" style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>
                  DOCUMENTACIÓN_Y_CONTROLES:
                </h3>
              </div>
              <button
                onClick={() => setShowDocModal(false)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: "transparent",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
                className="mono-terminal"
              >
                CLOSE_X
              </button>
            </div>

            <div style={{ padding: "24px", maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", fontSize: "13px", lineHeight: "1.6", background: "var(--bg-panel)" }}>
              
              <div>
                <strong style={{ color: "var(--accent-color)" }} className="mono-terminal">&gt; 1. Usar km GPX Real</strong>
                <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
                  Al activar esta opción, la gráfica respeta la escala y longitud exacta medida por el dispositivo GPS durante la ruta original. Si se apaga, puedes introducir una <strong>Distancia Escala</strong> personalizada. Esto estirará o comprimirá horizontalmente la altimetría para simular que la etapa tiene esa longitud fija (ej: 34.5 Km), lo cual es el estándar profesional en ciclismo para comparar perfiles.
                </p>
              </div>

              <div>
                <strong style={{ color: "var(--accent-color)" }} className="mono-terminal">&gt; 2. Exageración Relieve (Vertical)</strong>
                <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
                  Aumenta de forma proporcional el relieve vertical. Útil en circuitos semi-llanos donde las subidas no se aprecian con facilidad, permitiendo destacar desniveles pequeños.
                </p>
              </div>

              <div>
                <strong style={{ color: "var(--accent-color)" }} className="mono-terminal">&gt; 3. Suavizado de Altura GPX</strong>
                <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
                  Aplica un algoritmo de media móvil ponderada sobre los datos brutos del GPX. Filtra las fluctuaciones causadas por fallos de cobertura satelital o errores barométricos, suavizando la línea de relieve final.
                </p>
              </div>

              <div>
                <strong style={{ color: "var(--accent-color)" }} className="mono-terminal">&gt; 4. Calibración de Umbrales (T1 - T4)</strong>
                <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
                  Define con exactitud matemática a qué porcentaje exacto (%) de inclinación el visor volumétrico cambia su tono altimétrico. El color representa la dureza instantánea del terreno.
                </p>
              </div>

              <div>
                <strong style={{ color: "var(--accent-color)" }} className="mono-terminal">&gt; 5. Espesor Base 3D</strong>
                <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
                  Controla la cantidad de masa/bloque gris o negro plano renderizado por debajo de la altitud mínima, regulando el grosor inferior de la representación de la montaña.
                </p>
              </div>

              <div>
                <strong style={{ color: "var(--accent-color)" }} className="mono-terminal">&gt; 6. Historial Local y Etiquetas</strong>
                <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
                  Te permite guardar tus selecciones y personalizaciones directamente en tu navegador (LocalStorage) para reanudarlas cuando quieras. La pestaña de etiquetas te permite nombrar cada cota de altitud a tu gusto.
                </p>
              </div>

            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", background: "var(--bg-secondary)" }}>
              <button
                onClick={() => setShowDocModal(false)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  background: "var(--accent-color)",
                  color: "#000",
                  border: "none",
                  fontWeight: 800,
                  fontSize: "13px",
                  cursor: "pointer"
                }}
                className="mono-terminal"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
