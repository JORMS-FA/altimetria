import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Plus, Trash2, Map, Mountain, Sparkles, Loader2, Route, Palette, Sun, Moon, Activity, TrendingUp, TrendingDown, Monitor } from 'lucide-react';

// --- Funciones Matemáticas y de GPX ---
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const parseGPX = (xmlString) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const trkpts = Array.from(xmlDoc.getElementsByTagName("trkpt"));
  
  let data = [];
  let totalDistance = 0;
  
  for (let i = 0; i < trkpts.length; i++) {
    const lat = parseFloat(trkpts[i].getAttribute("lat"));
    const lon = parseFloat(trkpts[i].getAttribute("lon"));
    const eleNode = trkpts[i].getElementsByTagName("ele")[0];
    const ele = eleNode ? parseFloat(eleNode.textContent) : 0;
    
    if (i > 0) {
      const prevLat = parseFloat(trkpts[i-1].getAttribute("lat"));
      const prevLon = parseFloat(trkpts[i-1].getAttribute("lon"));
      totalDistance += getDistanceFromLatLonInKm(prevLat, prevLon, lat, lon);
    }
    
    data.push({ distance: totalDistance, elevation: ele, lat, lon });
  }

  // --- NUEVO: Extraer Waypoints del archivo ---
  const wptsNodes = Array.from(xmlDoc.getElementsByTagName("wpt"));
  const wpts = wptsNodes.map(wpt => ({
    lat: parseFloat(wpt.getAttribute("lat")),
    lon: parseFloat(wpt.getAttribute("lon")),
    name: wpt.getElementsByTagName("name")[0]?.textContent || "Punto"
  }));

  return { data, wpts };
};

const smoothData = (data, windowSize) => {
  if (windowSize <= 1 || data.length === 0) return data;
  let smoothed = [];
  for (let i = 0; i < data.length; i++) {
    let start = Math.max(0, i - Math.floor(windowSize / 2));
    let end = Math.min(data.length - 1, i + Math.floor(windowSize / 2));
    let sumEle = 0;
    for (let j = start; j <= end; j++) sumEle += data[j].elevation;
    smoothed.push({ ...data[i], elevation: sumEle / (end - start + 1) });
  }
  return smoothed;
};

const calculateSlopes = (data, stepKm = 0.5) => {
  let result = [...data];
  for (let i = 0; i < result.length; i++) {
    let current = result[i];
    let futurePoint = result.find(p => p.distance >= current.distance + stepKm) || result[result.length - 1];
    let dDist = futurePoint.distance - current.distance;
    let dEle = futurePoint.elevation - current.elevation;
    let slope = dDist > 0 ? (dEle / (dDist * 10)) : 0; 
    result[i].slope = slope;
  }
  return result;
};

export default function App() {
  const [gpxRawData, setGpxRawData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const altimetryCanvasRef = useRef(null);
  const routeCanvasRef = useRef(null); 
  const googleMapRef = useRef(null);   
  
  const [activeTab, setActiveTab] = useState('altimetry'); 
  const [isDarkMode, setIsDarkMode] = useState(true);

  const apiKey = ""; 
  const GOOGLE_MAPS_API_KEY = ""; 

  const [settings, setSettings] = useState({
    smoothing: 20,
    slopeCalcWindow: 0.5,
    minDistance: 0,
    maxDistance: 'auto',
  });

  const [altSettings, setAltSettings] = useState({
    canvasWidth: 1200,
    canvasHeight: 500,
    bgColor: '#ffffff',
    gridColor: '#e5e7eb',
    textColor: '#1f2937',
    minElevation: 'auto',
    maxElevation: 'auto',
    fontSize: 14,
    fontFamily: 'sans-serif',
    lineThickness: 2,
    gridOpacity: 1.0,
    transparentBg: false,
    showGrid: true
  });

  const [mapSettings, setMapSettings] = useState({
    canvasWidth: 800,
    canvasHeight: 800,
    bgColor: '#111827',
    routeColor: '#3b82f6',
    routeWidth: 4,
    showStartEnd: true,
    padding: 50
  });

  const [slopeColors, setSlopeColors] = useState([
    { max: 3, color: '#a3e635' },
    { max: 6, color: '#facc15' },
    { max: 9, color: '#ef4444' },
    { max: 15, color: '#991b1b' },
    { max: 999, color: '#000000' }
  ]);

  const [labels, setLabels] = useState([{ id: 1, km: 0, text: 'Salida', type: 'start' }]);
  const [aiStrategy, setAiStrategy] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [routeStats, setRouteStats] = useState({ gain: 0, loss: 0, max: 0, min: 0, distance: 0 });

  const theme = {
    bgApp: isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900',
    bgCard: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    input: isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300',
    btnGhost: isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700',
    btnTabActive: isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-700',
    btnTabInactive: isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-50',
    aiBox: isDarkMode ? 'bg-indigo-900/30 border-indigo-800 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-900'
  };

  // Resoluciones predefinidas (Extraído de altimetria_pro)
  const PRESETS = [
    ["Estándar Web", 1200, 500],
    ["Impresión A4", 2480, 826],
    ["Full HD", 1920, 640],
    ["4K Ultra", 3840, 1280],
    ["Historia Vertical", 1080, 1920]
  ];

  useEffect(() => {
    if (activeTab === 'map' && gpxRawData.length > 0 && GOOGLE_MAPS_API_KEY) {
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
        script.async = true;
        script.onload = renderGoogleMap;
        document.head.appendChild(script);
      } else {
        renderGoogleMap();
      }
    }
  }, [activeTab, gpxRawData, settings, mapSettings]);

  const renderGoogleMap = () => {
    if (!googleMapRef.current || !window.google) return;
    const plotData = processedData.filter(d => d.distance >= settings.minDistance && (settings.maxDistance === 'auto' || d.distance <= settings.maxDistance));
    if (plotData.length === 0) return;
    const map = new window.google.maps.Map(googleMapRef.current, { mapTypeId: 'terrain', streetViewControl: false });
    const path = plotData.map(d => ({ lat: d.lat, lng: d.lon }));
    const polyline = new window.google.maps.Polyline({ path, geodesic: true, strokeColor: mapSettings.routeColor, strokeOpacity: 1.0, strokeWeight: mapSettings.routeWidth });
    polyline.setMap(map);
    const bounds = new window.google.maps.LatLngBounds();
    path.forEach(p => bounds.extend(p));
    map.fitBounds(bounds);
  };

  const analyzeRouteWithAI = async () => {
    if (processedData.length === 0) return;
    setIsAnalyzing(true);
    const step = Math.max(1, Math.ceil(processedData.length / 50));
    const simplifiedData = processedData.filter((_, i) => i % step === 0).map(d => ({ km: Math.round(d.distance * 10) / 10, elev: Math.round(d.elevation) }));
    const prompt = `Eres un director deportivo experto en ciclismo. Analiza el siguiente perfil de elevación. Datos: ${JSON.stringify(simplifiedData)}. Identifica 2 a 4 puertos clave, indicando kilómetro exacto y nómbralos. Escribe un resumen estratégico. JSON: {"labels": [{"km": num, "text": "Nombre"}], "strategy": "texto"}`;

    const callApi = async (retryCount = 0) => {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" }})
        });
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (resultText) {
          const parsed = JSON.parse(resultText);
          if (parsed.labels) setLabels(prev => [...prev, ...parsed.labels.map((l, i) => ({ id: Date.now() + i, km: l.km, text: `✨ ${l.text}`, type: 'ai' }))]);
          if (parsed.strategy) setAiStrategy(parsed.strategy);
        }
      } catch (error) {
        if (retryCount < 5) return setTimeout(() => callApi(retryCount + 1), Math.pow(2, retryCount) * 1000);
        setAiStrategy("Error IA. Verifica tu API Key.");
      }
    };
    await callApi();
    setIsAnalyzing(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const { data, wpts } = parseGPX(event.target.result);
        setGpxRawData(data);
        setSettings(s => ({ ...s, maxDistance: Math.ceil(data[data.length-1]?.distance || 0) }));

        // --- NUEVO: Mapear Waypoints a sus kilómetros exactos ---
        if (wpts.length > 0 && data.length > 0) {
          const newLabels = wpts.map((wpt, idx) => {
            let closest = data[0];
            let minDist = getDistanceFromLatLonInKm(wpt.lat, wpt.lon, closest.lat, closest.lon);
            for (let i = 1; i < data.length; i++) {
              let d = getDistanceFromLatLonInKm(wpt.lat, wpt.lon, data[i].lat, data[i].lon);
              if (d < minDist) { minDist = d; closest = data[i]; }
            }
            return { id: Date.now() + idx, km: Math.round(closest.distance * 10)/10, text: `📍 ${wpt.name}`, type: 'wpt' };
          });
          setLabels(prev => [...prev.filter(l => l.type === 'start'), ...newLabels]);
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (gpxRawData.length > 0) {
      let data = smoothData(gpxRawData, settings.smoothing);
      let slopedData = calculateSlopes(data, settings.slopeCalcWindow);
      setProcessedData(slopedData);
      
      let gain = 0, loss = 0;
      for (let i = 1; i < slopedData.length; i++) {
        let diff = slopedData[i].elevation - slopedData[i-1].elevation;
        if (diff > 0) gain += diff; else loss += Math.abs(diff);
      }
      let elevations = slopedData.map(d => d.elevation);
      setRouteStats({ gain: Math.round(gain), loss: Math.round(loss), max: Math.round(Math.max(...elevations)), min: Math.round(Math.min(...elevations)), distance: Math.round(slopedData[slopedData.length-1].distance) });
    }
  }, [gpxRawData, settings.smoothing, settings.slopeCalcWindow]);

  useEffect(() => {
    if (activeTab === 'altimetry') drawAltimetry();
  }, [processedData, activeTab, settings, altSettings, slopeColors, labels]);

  const drawAltimetry = () => {
    const canvas = altimetryCanvasRef.current;
    if (!canvas || processedData.length === 0) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = altSettings.canvasWidth * dpr;
    canvas.height = altSettings.canvasHeight * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${altSettings.canvasWidth}px`;
    canvas.style.height = `${altSettings.canvasHeight}px`;

    const W = altSettings.canvasWidth, H = altSettings.canvasHeight;
    const padT = 80, padB = 60, padL = 60, padR = 40;

    const plotData = processedData.filter(d => d.distance >= settings.minDistance && (settings.maxDistance === 'auto' || d.distance <= settings.maxDistance));
    if (plotData.length === 0) return;

    let minE = altSettings.minElevation === 'auto' ? Math.min(...plotData.map(d => d.elevation)) : Number(altSettings.minElevation);
    let maxE = altSettings.maxElevation === 'auto' ? Math.max(...plotData.map(d => d.elevation)) : Number(altSettings.maxElevation);
    if (altSettings.minElevation === 'auto') minE = Math.max(0, minE - 50);
    if (altSettings.maxElevation === 'auto') maxE += (maxE - minE) * 0.2; 

    const getX = (dist) => padL + ((dist - plotData[0].distance) / (plotData[plotData.length-1].distance - plotData[0].distance)) * (W - padL - padR);
    const getY = (ele) => H - padB - ((ele - minE) / (maxE - minE)) * (H - padT - padB);

    if (altSettings.transparentBg) {
      ctx.clearRect(0, 0, W, H);
    } else {
      ctx.fillStyle = altSettings.bgColor;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.font = `${altSettings.fontSize}px ${altSettings.fontFamily}`;
    ctx.fillStyle = altSettings.textColor;
    ctx.strokeStyle = altSettings.gridColor;
    ctx.lineWidth = 1;

    if (altSettings.showGrid) {
      ctx.globalAlpha = altSettings.gridOpacity;
      for (let i = 0; i <= 5; i++) {
        let ele = minE + (maxE - minE) * (i / 5);
        let y = getY(ele);
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(`${Math.round(ele)}m`, padL - 10, y);
      }
      const xRange = plotData[plotData.length-1].distance - plotData[0].distance;
      let stepKm = xRange > 100 ? 20 : xRange > 30 ? 5 : 1;
      for (let km = Math.ceil(plotData[0].distance / stepKm) * stepKm; km <= plotData[plotData.length-1].distance; km += stepKm) {
        let x = getX(km);
        ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`${km} km`, x, H - padB + 10);
      }
      ctx.globalAlpha = 1.0;
    }

    for (let i = 0; i < plotData.length - 1; i++) {
      let x1 = getX(plotData[i].distance), y1 = getY(plotData[i].elevation);
      let x2 = getX(plotData[i+1].distance), y2 = getY(plotData[i+1].elevation);
      ctx.beginPath(); ctx.moveTo(x1, H - padB); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x2, H - padB); ctx.closePath();
      ctx.fillStyle = slopeColors.find(sc => plotData[i].slope <= sc.max)?.color || slopeColors[slopeColors.length-1].color;
      ctx.fill();
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = altSettings.textColor; ctx.lineWidth = altSettings.lineThickness; ctx.stroke();
    }

    labels.forEach(label => {
      if (label.km >= plotData[0].distance && label.km <= plotData[plotData.length-1].distance) {
        let point = plotData.reduce((p, c) => Math.abs(c.distance - label.km) < Math.abs(p.distance - label.km) ? c : p);
        let x = getX(label.km), y = getY(point.elevation);
        ctx.beginPath(); ctx.setLineDash([5, 5]); ctx.moveTo(x, y); ctx.lineTo(x, padT - 20); ctx.strokeStyle = altSettings.textColor; ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = altSettings.textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = `bold ${altSettings.fontSize + 2}px ${altSettings.fontFamily}`; ctx.fillText(label.text, x, padT - 25);
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = altSettings.bgColor; ctx.fill(); ctx.stroke();
      }
    });
  };

  const exportRoutePNG = () => {
    const canvas = routeCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = mapSettings.canvasWidth, H = mapSettings.canvasHeight, pad = mapSettings.padding;
    canvas.width = W; canvas.height = H;
    const plotData = processedData.filter(d => d.distance >= settings.minDistance && (settings.maxDistance === 'auto' || d.distance <= settings.maxDistance));
    if(plotData.length === 0) return '';
    const minLat = Math.min(...plotData.map(d => d.lat)), maxLat = Math.max(...plotData.map(d => d.lat));
    const minLon = Math.min(...plotData.map(d => d.lon)), maxLon = Math.max(...plotData.map(d => d.lon));
    const latDiff = maxLat - minLat, lonDiff = maxLon - minLon;
    const aspect = (lonDiff * Math.cos((minLat + maxLat) / 2 * Math.PI / 180)) / latDiff;
    let scaleX, scaleY;
    const drawW = W - pad * 2, drawH = H - pad * 2;
    if (drawW / drawH > aspect) { scaleY = drawH / latDiff; scaleX = scaleY * Math.cos((minLat + maxLat) / 2 * Math.PI / 180); } else { scaleX = drawW / lonDiff; scaleY = scaleX / Math.cos((minLat + maxLat) / 2 * Math.PI / 180); }
    const xOffset = (W - (maxLon - minLon) * scaleX) / 2, yOffset = (H - (maxLat - minLat) * scaleY) / 2;
    const getX = (lon) => xOffset + (lon - minLon) * scaleX, getY = (lat) => H - yOffset - (lat - minLat) * scaleY;

    ctx.fillStyle = mapSettings.bgColor; ctx.fillRect(0, 0, W, H);
    ctx.beginPath(); ctx.moveTo(getX(plotData[0].lon), getY(plotData[0].lat));
    for (let i = 1; i < plotData.length; i++) ctx.lineTo(getX(plotData[i].lon), getY(plotData[i].lat));
    ctx.strokeStyle = mapSettings.routeColor; ctx.lineWidth = mapSettings.routeWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    return canvas.toDataURL('image/png');
  };

  const handleDownload = () => {
    if (processedData.length === 0) return;
    const link = document.createElement('download');
    if (activeTab === 'altimetry') {
      link.download = `altimetria-v7-${altSettings.canvasWidth}px.png`;
      link.href = altimetryCanvasRef.current.toDataURL('image/png');
    } else {
      link.download = 'ruta-vectorial-v7.png';
      link.href = exportRoutePNG();
    }
    link.click();
  };

  return (
    <div className={`min-h-screen ${theme.bgApp} p-4 font-sans transition-colors duration-200`}>
      <header className={`max-w-7xl mx-auto mb-6 flex justify-between items-center ${theme.bgCard} p-4 rounded-xl shadow-sm border`}>
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white"><Mountain size={24} /></div>
          <h1 className={`text-2xl font-bold ${theme.textMain}`}>Suite Ciclismo Pro 7.0</h1>
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-lg border ${theme.bgCard} ${theme.btnGhost}`}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <label className={`flex items-center gap-2 ${theme.bgCard} ${theme.btnGhost} px-4 py-2 rounded-lg cursor-pointer font-medium border`}>
            <Upload size={18} /> Subir GPX <input type="file" accept=".gpx" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={handleDownload} disabled={processedData.length === 0} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50">
            <Download size={18} /> Exportar {activeTab === 'altimetry' ? 'Perfil' : 'Ruta'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 space-y-4">
          <div className={`flex rounded-xl shadow-sm p-1 border ${theme.bgCard}`}>
            <button onClick={() => setActiveTab('altimetry')} className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'altimetry' ? theme.btnTabActive : theme.btnTabInactive}`}><Mountain size={18} /> Altimetría</button>
            <button onClick={() => setActiveTab('map')} className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'map' ? theme.btnTabActive : theme.btnTabInactive}`}><Map size={18} /> Google Maps</button>
          </div>

          <div className={`${theme.bgCard} p-4 rounded-xl shadow-sm border`}>
            <h2 className={`${theme.textMain} font-bold flex items-center gap-2 mb-3`}><Route size={18}/> Segmento</h2>
            <div className="flex gap-2">
              <div className="flex-1"><label className={`text-xs ${theme.textSub} font-medium`}>Km Inicio</label><input type="number" value={settings.minDistance} onChange={e => setSettings({...settings, minDistance: Number(e.target.value)})} className={`w-full border rounded p-1.5 text-sm ${theme.input}`}/></div>
              <div className="flex-1"><label className={`text-xs ${theme.textSub} font-medium`}>Km Fin</label><input type="text" value={settings.maxDistance} onChange={e => setSettings({...settings, maxDistance: e.target.value})} className={`w-full border rounded p-1.5 text-sm ${theme.input}`}/></div>
            </div>
          </div>

          {processedData.length > 0 && (
            <div className={`${theme.bgCard} p-4 rounded-xl shadow-sm border grid grid-cols-2 gap-2 text-center`}>
              <div className="bg-green-500/10 p-2 rounded-lg border border-green-500/20"><div className={`text-xs ${theme.textSub} flex items-center justify-center gap-1`}><TrendingUp size={12}/> Desnivel +</div><div className="font-bold text-green-500">+{routeStats.gain}m</div></div>
              <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20"><div className={`text-xs ${theme.textSub} flex items-center justify-center gap-1`}><TrendingDown size={12}/> Desnivel -</div><div className="font-bold text-red-500">-{routeStats.loss}m</div></div>
              <div className={`bg-gray-500/10 p-2 rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}><div className={`text-xs ${theme.textSub} flex items-center justify-center gap-1`}><Mountain size={12}/> Alt. Máx</div><div className={`font-bold ${theme.textMain}`}>{routeStats.max}m</div></div>
              <div className={`bg-gray-500/10 p-2 rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}><div className={`text-xs ${theme.textSub} flex items-center justify-center gap-1`}><Activity size={12}/> Distancia</div><div className={`font-bold ${theme.textMain}`}>{routeStats.distance}km</div></div>
            </div>
          )}

          {activeTab === 'altimetry' ? (
            <>
              <div className={`${theme.bgCard} p-4 rounded-xl shadow-sm border`}>
                <h2 className={`${theme.textMain} font-bold mb-3`}>Personalizar Gradientes (%)</h2>
                <div className="space-y-2">
                  {slopeColors.map((sc, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className={`text-sm w-16 text-right ${theme.textSub}`}>Hasta %</span>
                      <input type="number" value={sc.max === 999 ? '' : sc.max} disabled={sc.max === 999} onChange={(e) => { const nsc = [...slopeColors]; nsc[idx].max = Number(e.target.value); setSlopeColors(nsc); }} className={`w-16 border rounded p-1 text-sm ${theme.input} disabled:opacity-50`} />
                      <input type="color" value={sc.color} onChange={(e) => { const nsc = [...slopeColors]; nsc[idx].color = e.target.value; setSlopeColors(nsc); }} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${theme.bgCard} p-4 rounded-xl shadow-sm border`}>
                <button onClick={analyzeRouteWithAI} disabled={isAnalyzing || processedData.length===0} className="w-full py-2 mb-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-bold shadow">
                  {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {isAnalyzing ? 'Analizando...' : '✨ Auto-Puertos IA'}
                </button>
                {aiStrategy && <p className={`text-sm p-3 rounded-lg border mb-4 text-justify font-medium ${theme.aiBox}`}>{aiStrategy}</p>}
                
                <h3 className={`text-sm ${theme.textMain} font-bold mb-2`}>Etiquetas Manuales/GPX</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {labels.map((l, i) => (
                    <div key={l.id} className="flex gap-2">
                      <input type="number" value={l.km} onChange={e => {let n=[...labels]; n[i].km=Number(e.target.value); setLabels(n)}} className={`w-16 border rounded p-1.5 text-sm ${theme.input}`}/>
                      <input type="text" value={l.text} onChange={e => {let n=[...labels]; n[i].text=e.target.value; setLabels(n)}} className={`flex-1 border rounded p-1.5 text-sm ${theme.input}`}/>
                      <button onClick={() => setLabels(labels.filter(x => x.id !== l.id))} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setLabels([...labels, {id: Date.now(), km:0, text:'Nuevo'}])} className={`w-full mt-3 py-1.5 text-sm border border-dashed rounded-lg font-medium ${theme.btnGhost} border-gray-500`}><Plus size={16} className="inline"/> Añadir Etiqueta</button>
              </div>

              <div className={`${theme.bgCard} p-4 rounded-xl shadow-sm border`}>
                <h2 className={`${theme.textMain} font-bold flex items-center gap-2 mb-3`}><Monitor size={18}/> Resolución y Lienzo</h2>
                
                {/* Botones de resoluciones de altimetria_pro.jsx */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {PRESETS.map(([lbl, w, h]) => (
                    <button key={lbl} onClick={() => setAltSettings({...altSettings, canvasWidth: w, canvasHeight: h})} 
                      className={`text-xs p-2 border rounded-lg flex flex-col items-start ${theme.input} hover:bg-blue-600/10 hover:border-blue-500 transition-colors`}>
                      <span className="font-semibold text-blue-500">{lbl}</span>
                      <span className={`opacity-70 mt-0.5`}>{w}×{h}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-500/30 pt-3">
                  <div><label className={`text-xs ${theme.textSub} font-medium`}>Ancho Libre (px)</label><input type="number" value={altSettings.canvasWidth} onChange={e=>setAltSettings({...altSettings, canvasWidth:Number(e.target.value)})} className={`w-full border rounded p-1.5 ${theme.input}`}/></div>
                  <div><label className={`text-xs ${theme.textSub} font-medium`}>Alto Libre (px)</label><input type="number" value={altSettings.canvasHeight} onChange={e=>setAltSettings({...altSettings, canvasHeight:Number(e.target.value)})} className={`w-full border rounded p-1.5 ${theme.input}`}/></div>
                  <div><label className={`text-xs ${theme.textSub} font-medium`}>Alt Mínima (m)</label><input type="text" value={altSettings.minElevation} onChange={e=>setAltSettings({...altSettings, minElevation:e.target.value})} className={`w-full border rounded p-1.5 ${theme.input}`}/></div>
                  <div><label className={`text-xs ${theme.textSub} font-medium`}>Alt Máxima (m)</label><input type="text" value={altSettings.maxElevation} onChange={e=>setAltSettings({...altSettings, maxElevation:e.target.value})} className={`w-full border rounded p-1.5 ${theme.input}`}/></div>
                  
                  <div className="col-span-2 border-t border-gray-500/30 my-1 pt-2"></div>
                  
                  <div><label className={`text-xs ${theme.textSub} font-medium`}>Fuente Textos</label><select value={altSettings.fontFamily} onChange={e=>setAltSettings({...altSettings, fontFamily:e.target.value})} className={`w-full border rounded p-1.5 ${theme.input}`}><option value="sans-serif">Sans-serif</option><option value="serif">Serif</option><option value="monospace">Monospace</option><option value="Impact">Impact</option></select></div>
                  <div><label className={`text-xs ${theme.textSub} font-medium`}>Grosor Línea</label><input type="range" min="1" max="5" value={altSettings.lineThickness} onChange={e=>setAltSettings({...altSettings, lineThickness:Number(e.target.value)})} className="w-full accent-blue-600"/></div>
                  <div><label className={`text-xs ${theme.textSub} font-medium`}>Opacidad Cuadrícula</label><input type="range" min="0" max="1" step="0.1" value={altSettings.gridOpacity} onChange={e=>setAltSettings({...altSettings, gridOpacity:Number(e.target.value)})} className="w-full accent-blue-600"/></div>
                  <div className="flex items-center gap-2 mt-4"><input type="checkbox" id="transBg" checked={altSettings.transparentBg} onChange={e=>setAltSettings({...altSettings, transparentBg:e.target.checked})} className="accent-blue-600 w-4 h-4"/><label htmlFor="transBg" className={`text-xs ${theme.textSub} font-medium cursor-pointer`}>Fondo Transparente</label></div>

                  <div className="col-span-2 flex items-center justify-between border-t border-gray-500/30 pt-2 mt-2">
                    <span className={`text-xs ${theme.textSub} font-medium ${altSettings.transparentBg ? 'opacity-50' : ''}`}>Color Fondo</span><input type="color" value={altSettings.bgColor} disabled={altSettings.transparentBg} onChange={e=>setAltSettings({...altSettings, bgColor:e.target.value})} className={`w-8 h-8 rounded cursor-pointer border-0 ${altSettings.transparentBg ? 'opacity-50 cursor-not-allowed' : ''}`}/>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={`${theme.bgCard} p-4 rounded-xl shadow-sm border`}>
               <h2 className={`${theme.textMain} font-bold flex items-center gap-2 mb-3`}><Palette size={18}/> Estilo Exportación (Ruta)</h2>
               <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center"><span className={`text-xs ${theme.textSub} font-medium`}>Color Fondo Export</span><input type="color" value={mapSettings.bgColor} onChange={e=>setMapSettings({...mapSettings, bgColor:e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0"/></div>
                  <div className="flex justify-between items-center"><span className={`text-xs ${theme.textSub} font-medium`}>Color Ruta Export</span><input type="color" value={mapSettings.routeColor} onChange={e=>setMapSettings({...mapSettings, routeColor:e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0"/></div>
                  <div><label className={`text-xs ${theme.textSub} font-medium`}>Grosor Ruta</label><input type="range" min="1" max="10" value={mapSettings.routeWidth} onChange={e=>setMapSettings({...mapSettings, routeWidth:Number(e.target.value)})} className="w-full accent-blue-600"/></div>
                  <div><label className={`text-xs ${theme.textSub} font-medium`}>Ancho Export (px)</label><input type="number" value={mapSettings.canvasWidth} onChange={e=>setMapSettings({...mapSettings, canvasWidth:Number(e.target.value)})} className={`w-full border rounded p-1.5 ${theme.input}`}/></div>
               </div>
            </div>
          )}
        </aside>

        <section className="lg:col-span-8 flex flex-col gap-6">
          <div className={`${theme.bgCard} p-4 rounded-xl shadow-sm border overflow-x-auto flex justify-center items-center min-h-[500px] relative`}>
            {processedData.length === 0 ? (
               <div className={`text-center ${theme.textSub}`}>
                  <Mountain size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="font-medium">Sube un archivo GPX para visualizar</p>
               </div>
            ) : (
              <>
                <canvas ref={altimetryCanvasRef} className={`shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${activeTab === 'altimetry' ? 'block' : 'hidden'}`} />
                {activeTab === 'map' && !GOOGLE_MAPS_API_KEY && (
                  <div className={`absolute inset-0 flex flex-col items-center justify-center ${theme.bgCard} p-6 text-center z-10 rounded-xl`}>
                    <Map size={48} className={`mb-4 opacity-50 ${theme.textSub}`} />
                    <p className={`font-medium text-lg ${theme.textMain}`}>Se requiere Google Maps API Key</p>
                  </div>
                )}
                <div ref={googleMapRef} className={`w-full h-full min-h-[600px] shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${activeTab === 'map' && GOOGLE_MAPS_API_KEY ? 'block' : 'hidden'}`} />
                <canvas ref={routeCanvasRef} className="hidden" />
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}