import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const ASSETS = {
  BTC: { symbol: "BTCUSDT", name: "Bitcoin",  color: "#F7931A", decimals: 2 },
  ETH: { symbol: "ETHUSDT", name: "Ethereum", color: "#627EEA", decimals: 2 },
  SOL: { symbol: "SOLUSDT", name: "Solana",   color: "#9945FF", decimals: 3 },
  XRP: { symbol: "XRPUSDT", name: "XRP",      color: "#00AAE4", decimals: 4 },
};
const INTERVAL = "3m";
const CANDLE_LIMIT = 350;
const BINANCE_REST = "https://api.binance.com/api/v3";
const BINANCE_WS   = "wss://stream.binance.com:9443/ws";

// ═══════════════════════════════════════════════════════════════
// MATH ENGINE — Score Maestro
// ═══════════════════════════════════════════════════════════════
const calcMA = (arr, p) =>
  arr.length < p ? null : arr.slice(-p).reduce((s, v) => s + v, 0) / p;

const calcRSI = (closes, p = 14) => {
  if (closes.length <= p) return null;
  const diffs = closes.slice(-(p + 1)).map((v, i, a) => (i > 0 ? v - a[i - 1] : 0)).slice(1);
  const gains = diffs.filter((d) => d > 0).reduce((s, v) => s + v, 0) / p;
  const losses = diffs.filter((d) => d < 0).reduce((s, v) => s + Math.abs(v), 0) / p;
  if (losses === 0) return 100;
  return +(100 - 100 / (1 + gains / losses)).toFixed(2);
};

const calcBB = (closes, p = 20, mult = 2) => {
  if (closes.length < p) return null;
  const sl = closes.slice(-p);
  const ma = sl.reduce((s, v) => s + v, 0) / p;
  const std = Math.sqrt(sl.reduce((s, v) => s + (v - ma) ** 2, 0) / p);
  return { upper: ma + mult * std, middle: ma, lower: ma - mult * std, std, pct: std / ma };
};

const calcATR = (candles, p = 14) => {
  if (candles.length < p + 1) return null;
  const trs = candles.slice(-(p + 1)).map((c, i, a) =>
    i === 0 ? c.high - c.low
    : Math.max(c.high - c.low, Math.abs(c.high - a[i - 1].close), Math.abs(c.low - a[i - 1].close))
  ).slice(1);
  return trs.reduce((s, v) => s + v, 0) / p;
};

const calcADX = (candles, p = 14) => {
  if (candles.length < p * 2) return null;
  const sl = candles.slice(-(p * 2));
  let dmP = 0, dmM = 0, tr = 0;
  for (let i = 1; i < sl.length; i++) {
    const c = sl[i], pv = sl[i - 1];
    const up = c.high - pv.high, dn = pv.low - c.low;
    dmP += up > dn && up > 0 ? up : 0;
    dmM += dn > up && dn > 0 ? dn : 0;
    tr += Math.max(c.high - c.low, Math.abs(c.high - pv.close), Math.abs(c.low - pv.close));
  }
  if (tr === 0) return 0;
  const diP = (dmP / tr) * 100, diM = (dmM / tr) * 100;
  return +((Math.abs(diP - diM) / (diP + diM + 0.001)) * 100).toFixed(1);
};

/*
  SCORE MAESTRO FORMULA
  ─────────────────────
  Pilar 1 — Cruces MA      (0–35 pts)
    MA6  > MA40  → 12 pts   (señal rápida de impulso)
    MA6  > MA70  → 10 pts   (tendencia corto plazo)
    MA40 > MA200 → 13 pts   (tendencia macro)

  Pilar 2 — Momentum/Fuerza (0–35 pts)
    ADX  > 35 → 15 | > 25 → 10 | ≤ 25 → 3   (fuerza de tendencia)
    RSI 50–70 → 12 | 35–50 → 7  | extremos → 2 (momentum)
    Precio > MA200 → 8 pts   (contexto macro)

  Pilar 3 — Bollinger Rev.  (0–30 pts)
    %B < 0.15 → 28 | < 0.35 → 20 | < 0.65 → 14 | < 0.85 → 7 | ≥ 0.85 → 2

  Total = P1 + P2 + P3  (capped 100)
  Umbral COMPRA FUERTE: ≥ 75
  Umbral COMPRA:        ≥ 60
  Umbral VENTA:         ≤ 40
  Umbral VENTA FUERTE:  ≤ 25
*/
const computeScore = (candles) => {
  if (!candles || candles.length < 210) return null;
  const closes = candles.map((c) => c.close);
  const price   = closes.at(-1);

  const ma6   = calcMA(closes, 6);
  const ma40  = calcMA(closes, 40);
  const ma70  = calcMA(closes, 70);
  const ma200 = calcMA(closes, 200);
  const bb    = calcBB(closes, 20);
  const adx   = calcADX(candles, 14);
  const rsi   = calcRSI(closes, 14);
  const atr   = calcATR(candles, 14);

  // ── Pilar 1 ──────────────────────────────────────────────────
  let p1 = 0;
  const p1d = [];
  if (ma6 && ma40)  { const ok = ma6  > ma40;  p1 += ok ? 12 : 0; p1d.push({ l: "MA6 > MA40",   pts: ok ? 12 : 0, max: 12, up: ok }); }
  if (ma6 && ma70)  { const ok = ma6  > ma70;  p1 += ok ? 10 : 0; p1d.push({ l: "MA6 > MA70",   pts: ok ? 10 : 0, max: 10, up: ok }); }
  if (ma40 && ma200){ const ok = ma40 > ma200; p1 += ok ? 13 : 0; p1d.push({ l: "MA40 > MA200", pts: ok ? 13 : 0, max: 13, up: ok }); }

  // ── Pilar 2 ──────────────────────────────────────────────────
  let p2 = 0;
  const p2d = [];
  if (adx !== null) {
    const pts = adx > 35 ? 15 : adx > 25 ? 10 : 3;
    p2 += pts;
    p2d.push({ l: `ADX ${adx.toFixed(1)}`, pts, max: 15, up: adx > 25 });
  }
  if (rsi !== null) {
    const pts = rsi > 50 && rsi < 70 ? 12 : rsi >= 35 ? 7 : 2;
    p2 += pts;
    p2d.push({ l: `RSI ${rsi.toFixed(1)}`, pts, max: 12, up: rsi > 50 && rsi < 70 });
  }
  if (ma200) {
    const ok = price > ma200;
    p2 += ok ? 8 : 0;
    p2d.push({ l: "Precio > MA200", pts: ok ? 8 : 0, max: 8, up: ok });
  }

  // ── Pilar 3 ──────────────────────────────────────────────────
  let p3 = 0;
  const p3d = [];
  if (bb) {
    const range = bb.upper - bb.lower;
    const pctB  = range > 0 ? (price - bb.lower) / range : 0.5;
    const pts   = pctB < 0.15 ? 28 : pctB < 0.35 ? 20 : pctB < 0.65 ? 14 : pctB < 0.85 ? 7 : 2;
    const lbl   = pctB < 0.15 ? "Zona Sobreventa ↑" : pctB < 0.35 ? "Zona Baja-Media" : pctB < 0.65 ? "Banda Media" : pctB < 0.85 ? "Zona Alta-Media" : "Sobrecompra ↓";
    p3 += pts;
    p3d.push({ l: lbl, pts, max: 28, up: pctB < 0.5 });
    p3d.push({ l: `%B: ${(pctB * 100).toFixed(0)}%`, pts: 0, max: 0, info: true });
  }

  const total = Math.min(100, Math.round(p1 + p2 + p3));

  let signal, decision, zone;
  if      (total >= 78) { signal = "COMPRA FUERTE";  decision = "LONG";          zone = "Euforia";    }
  else if (total >= 62) { signal = "COMPRA";          decision = "LONG PRUDENTE"; zone = "Optimismo";  }
  else if (total >= 52) { signal = "ACUMULAR";        decision = "ESPERAR";       zone = "Neutral+";   }
  else if (total >= 42) { signal = "NEUTRAL";         decision = "ESPERAR";       zone = "Neutral";    }
  else if (total >= 30) { signal = "VENTA";           decision = "SHORT PRUDENTE";zone = "Miedo";      }
  else if (total >= 18) { signal = "VENTA FUERTE";    decision = "SHORT";         zone = "Acumulación";}
  else                  { signal = "CAPITULACIÓN";    decision = "CASH/FUERA";    zone = "Pánico";     }

  return { total, p1, p2, p3, p1d, p2d, p3d, signal, decision, zone,
           ma6, ma40, ma70, ma200, bb, adx, rsi, atr, price };
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const fmt = (n, d = 2) => {
  if (n == null || isNaN(n)) return "--";
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
};
const fmtPrice = (n, asset = "BTC") =>
  n == null ? "--" : `$${fmt(n, ASSETS[asset]?.decimals ?? 2)}`;

const scoreColor = (s) =>
  s == null ? "#4a5a7a"
  : s >= 70  ? "#00e676"
  : s >= 50  ? "#ffab00"
  : s >= 30  ? "#ff6d00"
  :             "#ff1744";

// ═══════════════════════════════════════════════════════════════
// CANDLESTICK CHART  (pure SVG, no external lib)
// ═══════════════════════════════════════════════════════════════
function CandlestickChart({ candles, score }) {
  const W = 760, H = 190,
        PR = 52, PT = 8, PB = 22, PL = 0;
  const display = candles.slice(-100);
  if (display.length < 5)
    return <div style={S.chartEmpty}>Cargando velas {candles.length}/{CANDLE_LIMIT}…</div>;

  const prices = display.flatMap((c) => [c.high, c.low]);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const pad  = (maxP - minP) * 0.08;
  const pY   = (p) => PT + (1 - (p - (minP - pad)) / (maxP + pad - minP + pad)) * (H - PT - PB);
  const cw   = Math.max(1.5, ((W - PR) / display.length) * 0.62);
  const gap  = (W - PR) / display.length;
  const cX   = (i) => PL + i * gap + gap / 2;

  // MA paths computed per display candle
  const closes = candles.map((c) => c.close);
  const maLines = [
    { p: 6,   color: "#FFD600", w: 0.8 },
    { p: 40,  color: "#00BCD4", w: 1 },
    { p: 200, color: "#FF6D00", w: 1.2 },
  ].map(({ p, color, w }) => {
    const pts = display.map((_, di) => {
      const ci = candles.length - display.length + di;
      const v  = calcMA(closes.slice(0, ci + 1), p);
      return v ? `${di === 0 ? "M" : "L"}${cX(di).toFixed(1)},${pY(v).toFixed(1)}` : null;
    }).filter(Boolean);
    return { path: pts.join(" "), color, w };
  });

  // Price grid
  const gridRows = 5;
  const grids = Array.from({ length: gridRows + 1 }, (_, i) => {
    const p = minP - pad + ((maxP + pad - (minP - pad)) * i) / gridRows;
    return { p, y: pY(p) };
  });

  const lastClose = candles.at(-1)?.close;

  // BB bands
  const bbLines = [];
  if (score?.bb) {
    ["upper", "middle", "lower"].forEach((k, ki) => {
      const col = ["#ff1744", "#ffab00", "#00e676"][ki];
      const pts = display.map((_, di) => {
        const ci  = candles.length - display.length + di;
        const sl  = closes.slice(0, ci + 1);
        const bbv = calcBB(sl, 20);
        if (!bbv) return null;
        return `${di === 0 ? "M" : "L"}${cX(di).toFixed(1)},${pY(bbv[k]).toFixed(1)}`;
      }).filter(Boolean);
      bbLines.push({ path: pts.join(" "), col });
    });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }} preserveAspectRatio="none">
      {/* Grid */}
      {grids.map(({ p, y }, i) => (
        <g key={i}>
          <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#1a2744" strokeWidth="0.4" strokeDasharray="3,8" />
          <text x={W - PR + 4} y={y + 3} fill="#3a4a6a" fontSize="8" fontFamily="monospace">
            {p > 100 ? (p / 1000).toFixed(1) + "k" : p.toFixed(2)}
          </text>
        </g>
      ))}
      {/* BB bands */}
      {bbLines.map(({ path, col }, i) => (
        <path key={i} d={path} fill="none" stroke={col} strokeWidth="0.6" opacity="0.35" strokeDasharray={i === 1 ? "4,4" : "0"} />
      ))}
      {/* MA lines */}
      {maLines.map(({ path, color, w }, i) => (
        path && <path key={i} d={path} fill="none" stroke={color} strokeWidth={w} opacity="0.75" />
      ))}
      {/* Candles */}
      {display.map((c, i) => {
        const x = cX(i), isG = c.close >= c.open;
        const col = isG ? "#00e676" : "#ff1744";
        const bT  = pY(Math.max(c.open, c.close));
        const bB  = pY(Math.min(c.open, c.close));
        const bH  = Math.max(0.8, bB - bT);
        return (
          <g key={i}>
            <line x1={x} y1={pY(c.high)} x2={x} y2={pY(c.low)} stroke={col} strokeWidth="0.7" opacity="0.65" />
            <rect x={x - cw / 2} y={bT} width={cw} height={bH} fill={col} opacity="0.88" />
          </g>
        );
      })}
      {/* Last price line */}
      {lastClose && (
        <line x1={PL} y1={pY(lastClose)} x2={W - PR} y2={pY(lastClose)}
          stroke="#ffffff" strokeWidth="0.4" strokeDasharray="4,6" opacity="0.3" />
      )}
      {/* Legend */}
      <g transform={`translate(6,${H - 10})`}>
        {[["MA6", "#FFD600"], ["MA40", "#00BCD4"], ["MA200", "#FF6D00"]].map(([lbl, col], i) => (
          <g key={i} transform={`translate(${i * 52},0)`}>
            <rect x={0} y={-5} width={14} height={2} fill={col} />
            <text x={18} y={0} fill="#3a4a6a" fontSize="8" fontFamily="monospace">{lbl}</text>
          </g>
        ))}
        <g transform="translate(168,0)">
          <rect x={0} y={-5} width={14} height={2} fill="#ff1744" opacity="0.5" />
          <text x={18} y={0} fill="#3a4a6a" fontSize="8" fontFamily="monospace">BB</text>
        </g>
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCORE RADIAL GAUGE
// ═══════════════════════════════════════════════════════════════
function RadialGauge({ score }) {
  const val = score?.total ?? 0;
  const col = scoreColor(val);
  const cx = 75, cy = 78, r = 58;
  const startDeg = -215, sweep = 250;
  const polar = (deg, radius) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };
  const arc = (s, e, rv) => {
    const a = polar(s, rv), b = polar(e, rv);
    return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} A${rv} ${rv} 0 ${e - s > 180 ? 1 : 0} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  };
  const scoreEnd = startDeg + (sweep * val) / 100;

  const zones = [
    { pct: 0,  col: "#ff1744" }, { pct: 18, col: "#ff6d00" }, { pct: 30, col: "#ffab00" },
    { pct: 45, col: "#ffd600" }, { pct: 60, col: "#76ff03" }, { pct: 78, col: "#00e676" },
  ];

  return (
    <svg viewBox="0 0 150 120" style={{ width: "100%", height: "100%" }}>
      <path d={arc(startDeg, startDeg + sweep, r)} fill="none" stroke="#1a2744" strokeWidth="14" strokeLinecap="round" />
      {val > 0 && (
        <path d={arc(startDeg, scoreEnd, r)} fill="none" stroke={col} strokeWidth="14" strokeLinecap="round" />
      )}
      {zones.map(({ pct, col: zc }, i) => {
        const deg = startDeg + (sweep * pct) / 100;
        const inner = polar(deg, r - 9), outer = polar(deg, r + 2);
        return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={zc} strokeWidth="1.5" opacity="0.6" />;
      })}
      <text x={cx} y={cy - 10} textAnchor="middle" fill={col} fontSize="30" fontFamily="'Courier New',monospace" fontWeight="bold">
        {val}
      </text>
      <text x={cx} y={cy + 8}  textAnchor="middle" fill="#3a4a6a" fontSize="10" fontFamily="monospace">/100</text>
      <text x={cx} y={cy + 24} textAnchor="middle" fill={col} fontSize="8.5" fontFamily="monospace" fontWeight="bold">
        {score?.signal ?? "CARGANDO"}
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// SIGNAL BADGE
// ═══════════════════════════════════════════════════════════════
function SignalBadge({ sig }) {
  const col = !sig ? "#4a5a7a" : sig.includes("COMPRA") ? "#00e676" : sig.includes("VENTA") || sig.includes("CAPIT") ? "#ff1744" : "#ffab00";
  return (
    <span style={{ fontFamily: "monospace", color: col, fontWeight: "bold", fontSize: "11px",
      padding: "2px 8px", border: `1px solid ${col}44`, borderRadius: "3px", background: `${col}11` }}>
      {sig ?? "---"}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// PILAR BAR
// ═══════════════════════════════════════════════════════════════
function PilarBar({ label, pts, max }) {
  const pct = max > 0 ? (pts / max) * 100 : 0;
  const col = pct >= 70 ? "#00e676" : pct >= 40 ? "#ffab00" : "#ff1744";
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
        <span style={S.dimTxt}>{label}</span>
        <span style={{ fontFamily: "monospace", fontSize: "11px", color: col }}>{pts ?? "--"}/{max}</span>
      </div>
      <div style={{ height: "3px", background: "#1a2744", borderRadius: "2px" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: "2px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function SonoProTerminal() {
  const [activeAsset, setActiveAsset] = useState("BTC");
  const [candles, setCandles]         = useState({});
  const [ticker, setTicker]           = useState({});
  const [wsStatus, setWsStatus]       = useState("connecting");
  const [latency, setLatency]         = useState(null);
  const [signals, setSignals]         = useState([]);
  const [alertsOn, setAlertsOn]       = useState(true);
  const [lastUpdate, setLastUpdate]   = useState(null);
  const [apiOk, setApiOk]             = useState(false);
  const [now, setNow]                 = useState(Date.now());

  // Calculator
  const [calc, setCalc] = useState({ capital: "", entry: "", sl: "", risk: "2" });

  const wsRef        = useRef(null);
  const pingRef      = useRef(null);
  const reconnRef    = useRef(null);
  const staleRef     = useRef(null);
  const prevSigRef   = useRef(null);
  const mountedRef   = useRef(true);

  const asset       = ASSETS[activeAsset];
  const assetCandles = candles[activeAsset] || [];
  const assetTicker  = ticker[activeAsset] || {};

  const score = useMemo(() => computeScore(assetCandles), [assetCandles]);
  const livePrice = assetTicker.close ?? assetCandles.at(-1)?.close;
  const col = scoreColor(score?.total);

  // ── Clock ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Load REST candles ───────────────────────────────────────
  const loadCandles = useCallback(async (ak) => {
    const sym = ASSETS[ak].symbol;
    try {
      const t0  = Date.now();
      const res = await fetch(`${BINANCE_REST}/klines?symbol=${sym}&interval=${INTERVAL}&limit=${CANDLE_LIMIT}`);
      const raw = await res.json();
      if (!mountedRef.current) return;
      setLatency(Date.now() - t0);
      setApiOk(true);
      const parsed = raw.map((k) => ({
        time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5],
      }));
      setCandles((prev) => ({ ...prev, [ak]: parsed }));
    } catch {
      if (mountedRef.current) setApiOk(false);
    }
  }, []);

  // ── Load 24h ticker ─────────────────────────────────────────
  const loadTicker = useCallback(async (ak) => {
    try {
      const res = await fetch(`${BINANCE_REST}/ticker/24hr?symbol=${ASSETS[ak].symbol}`);
      const d   = await res.json();
      if (!mountedRef.current) return;
      setTicker((prev) => ({
        ...prev,
        [ak]: { close: +d.lastPrice, high: +d.highPrice, low: +d.lowPrice, change: +d.priceChangePercent, volume: +d.quoteVolume },
      }));
    } catch {}
  }, []);

  // ── WebSocket ───────────────────────────────────────────────
  const connectWS = useCallback((ak) => {
    if (wsRef.current) wsRef.current.close();
    clearInterval(pingRef.current);
    clearTimeout(reconnRef.current);
    clearTimeout(staleRef.current);

    const sym = ASSETS[ak].symbol.toLowerCase();
    const ws  = new WebSocket(`${BINANCE_WS}/${sym}@kline_${INTERVAL}`);
    wsRef.current = ws;
    setWsStatus("connecting");

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setWsStatus("live");
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ method: "ping" }));
      }, 20000);
    };

    ws.onmessage = ({ data }) => {
      if (!mountedRef.current) return;
      const msg = JSON.parse(data);
      if (!msg.k) return;
      const k = msg.k;
      const candle = { time: k.t, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v };
      setLastUpdate(Date.now());
      clearTimeout(staleRef.current);
      staleRef.current = setTimeout(() => setWsStatus("stalled"), 60000);

      setCandles((prev) => {
        const cur  = [...(prev[ak] || [])];
        const last = cur.at(-1);
        if (last && last.time === candle.time) cur[cur.length - 1] = candle;
        else if (candle.time > (last?.time ?? 0)) { cur.push(candle); if (cur.length > CANDLE_LIMIT) cur.shift(); }
        return { ...prev, [ak]: cur };
      });

      setTicker((prev) => ({ ...prev, [ak]: { ...prev[ak], close: +k.c } }));
    };

    ws.onerror = () => { if (mountedRef.current) setWsStatus("error"); };
    ws.onclose = () => {
      if (!mountedRef.current) return;
      setWsStatus("stalled");
      clearInterval(pingRef.current);
      reconnRef.current = setTimeout(() => connectWS(ak), 4000);
    };
  }, []);

  // ── Init on asset change ────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    loadCandles(activeAsset);
    loadTicker(activeAsset);
    connectWS(activeAsset);
    const tickerInt = setInterval(() => loadTicker(activeAsset), 12000);
    return () => {
      clearInterval(tickerInt);
      clearInterval(pingRef.current);
      clearTimeout(reconnRef.current);
      clearTimeout(staleRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [activeAsset]);

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  // ── Signal tracker + audio ──────────────────────────────────
  useEffect(() => {
    if (!score) return;
    if (score.signal !== prevSigRef.current) {
      prevSigRef.current = score.signal;
      setSignals((prev) => [{
        time: new Date(), asset: activeAsset, signal: score.signal,
        score: score.total, price: livePrice, decision: score.decision,
      }, ...prev].slice(0, 25));

      if (alertsOn && (score.signal.includes("FUERTE") || score.signal.includes("CAPIT"))) {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator(), g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.frequency.value = score.signal.includes("COMPRA") ? 880 : 440;
          g.gain.value = 0.08;
          osc.start(); osc.stop(ctx.currentTime + 0.25);
        } catch {}
      }
    }
  }, [score?.signal]);

  // ── Calculator ──────────────────────────────────────────────
  const calcResult = useMemo(() => {
    const cap   = parseFloat(calc.capital);
    const entry = parseFloat(calc.entry) || livePrice;
    const sl    = parseFloat(calc.sl);
    const risk  = parseFloat(calc.risk) / 100;
    if (!cap || !entry || !sl || !risk || sl === entry) return null;
    const riskAmt = cap * risk;
    const slPct   = Math.abs(entry - sl) / entry;
    const posSize = riskAmt / (entry * slPct);
    const posVal  = posSize * entry;
    return { posSize, posVal, leverage: posVal / cap, riskAmt, slPct: slPct * 100 };
  }, [calc, livePrice]);

  // ── Status helpers ──────────────────────────────────────────
  const wsColors = { live: "#00e676", connecting: "#ffab00", stalled: "#ff6d00", error: "#ff1744" };
  const wsc   = wsColors[wsStatus] ?? "#4a5a7a";
  const secAgo = lastUpdate ? Math.round((now - lastUpdate) / 1000) : null;
  const stale  = secAgo != null && secAgo > 30;

  const fmtSec = (s) => s == null ? "--" : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`;

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={S.root}>
      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <span style={{ color: "#00e676", fontSize: 16, fontWeight: "bold", letterSpacing: 3 }}>SONO</span>
            <span style={{ color: "#3a4a6a", fontSize: 10, marginLeft: 8 }}>PRO TERMINAL v2.1 │ {INTERVAL} CHART</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {Object.entries(ASSETS).map(([k, a]) => (
              <button key={k} onClick={() => setActiveAsset(k)} style={{
                ...S.assetBtn,
                borderColor: activeAsset === k ? a.color : "#1a2744",
                color: activeAsset === k ? a.color : "#4a5a7a",
                background: activeAsset === k ? `${a.color}18` : "transparent",
              }}>{k}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {latency && (
            <span style={{ ...S.dimTxt, color: latency < 300 ? "#00e676" : "#ffab00" }}>
              ⚡ {latency}ms
            </span>
          )}
          <span style={{ ...S.dimTxt, color: stale ? "#ff1744" : "#4a5a7a" }}>
            🕐 {fmtSec(secAgo)}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: wsc,
              animation: wsStatus === "live" ? "blink 2s infinite" : "none" }} />
            <span style={{ ...S.dimTxt, color: wsc }}>{wsStatus.toUpperCase()}</span>
          </div>
          <span style={{ ...S.dimTxt }}>
            API <span style={{ color: apiOk ? "#00e676" : "#ff1744" }}>●</span>
          </span>
          <button onClick={() => setAlertsOn((a) => !a)} style={S.iconBtn}>
            {alertsOn ? "🔔" : "🔕"}
          </button>
        </div>
      </div>

      {/* ── PRICE BAR ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5, marginBottom: 6 }}>
        {[
          { lbl: `${activeAsset} / USD`,  val: fmtPrice(livePrice, activeAsset), big: true, col: asset.color },
          { lbl: "24H CAMBIO",             val: assetTicker.change != null ? `${assetTicker.change >= 0 ? "+" : ""}${assetTicker.change?.toFixed(2)}%` : "--",
            col: (assetTicker.change ?? 0) >= 0 ? "#00e676" : "#ff1744" },
          { lbl: "24H HIGH",               val: fmtPrice(assetTicker.high, activeAsset),   col: "#00e676" },
          { lbl: "24H LOW",                val: fmtPrice(assetTicker.low, activeAsset),    col: "#ff1744" },
          { lbl: "VELAS CARGADAS",         val: `${assetCandles.length} / ${CANDLE_LIMIT}`, col: "#4a5a7a" },
        ].map(({ lbl, val, big, col: c }) => (
          <div key={lbl} style={S.panel}>
            <div style={S.dimTxt}>{lbl}</div>
            <div style={{ fontFamily: "monospace", fontWeight: "bold", color: c ?? "#cdd8ef",
              fontSize: big ? 20 : 14, marginTop: 3 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* ── CHART + GAUGE ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 210px", gap: 6, marginBottom: 6 }}>
        <div style={{ ...S.panel, height: 230, padding: "8px 10px" }}>
          <div style={{ ...S.dimTxt, marginBottom: 5 }}>
            📊 GRÁFICO SONO — {activeAsset}/USD — Intervalo {INTERVAL}
          </div>
          <div style={{ height: 195 }}>
            <CandlestickChart candles={assetCandles} score={score} />
          </div>
        </div>
        <div style={{ ...S.panel, padding: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={S.dimTxt}>🎯 SCORE MAESTRO</div>
          <div style={{ width: 150, height: 110 }}>
            <RadialGauge score={score} />
          </div>
          <div style={{ width: "100%", marginTop: 4 }}>
            <PilarBar label="P1 CRUCES"    pts={score?.p1} max={35} />
            <PilarBar label="P2 MOMENTUM"  pts={score?.p2} max={35} />
            <PilarBar label="P3 BOLLINGER" pts={score?.p3} max={30} />
          </div>
        </div>
      </div>

      {/* ── MAs + PILARES + DECISIÓN ────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>

        {/* MAs */}
        <div style={{ ...S.panel, padding: 10 }}>
          <div style={{ ...S.dimTxt, marginBottom: 8 }}>📏 MEDIAS MÓVILES</div>
          {[
            { lbl: "MA6  (Ultra Corta)", val: score?.ma6,   col: "#FFD600" },
            { lbl: "MA40  (Soporte)",    val: score?.ma40,  col: "#00BCD4" },
            { lbl: "MA70  (Cruce)",      val: score?.ma70,  col: "#B0BEC5" },
            { lbl: "MA200 (Tendencia)",  val: score?.ma200, col: "#FF6D00" },
          ].map(({ lbl, val, col: c }) => {
            const above = livePrice && val ? livePrice > val : null;
            return (
              <div key={lbl} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <span style={{ ...S.dimTxt, color: c }}>{lbl}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {above != null && <span style={{ color: above ? "#00e676" : "#ff1744", fontSize: 10 }}>{above ? "▲" : "▼"}</span>}
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "#cdd8ef" }}>
                    {val ? fmtPrice(val, activeAsset) : "--"}
                  </span>
                </div>
              </div>
            );
          })}
          <div style={{ borderTop: "1px solid #1a2744", paddingTop: 6, marginTop: 2 }}>
            {[
              { lbl: "ADX (14)", val: score?.adx?.toFixed(1), col: score?.adx > 25 ? "#00e676" : "#ffab00" },
              { lbl: "RSI (14)", val: score?.rsi?.toFixed(1), col: score?.rsi > 70 ? "#ff1744" : score?.rsi < 30 ? "#00e676" : "#cdd8ef" },
              { lbl: "ATR (14)", val: score?.atr ? fmtPrice(score.atr, activeAsset) : "--", col: "#cdd8ef" },
            ].map(({ lbl, val, col: c }) => (
              <div key={lbl} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={S.dimTxt}>{lbl}</span>
                <span style={{ fontFamily: "monospace", fontSize: 12, color: c }}>{val ?? "--"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pilar desglose */}
        <div style={{ ...S.panel, padding: 10 }}>
          <div style={{ ...S.dimTxt, marginBottom: 8 }}>🔬 DESGLOSE PILARES</div>
          {score ? (
            [
              { title: "PILAR 1 — CRUCES MA",       items: score.p1d, total: score.p1, max: 35 },
              { title: "PILAR 2 — MOMENTUM/ADX",    items: score.p2d, total: score.p2, max: 35 },
              { title: "PILAR 3 — BOLLINGER REV.",   items: score.p3d, total: score.p3, max: 30 },
            ].map(({ title, items, total, max }) => (
              <div key={title} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ ...S.dimTxt, fontSize: 9, color: "#5a6a8a" }}>{title}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "#cdd8ef" }}>{total}/{max}</span>
                </div>
                <div style={{ height: 3, background: "#1a2744", borderRadius: 2, marginBottom: 4 }}>
                  <div style={{ height: "100%", width: `${(total / max) * 100}%`,
                    background: total / max > 0.65 ? "#00e676" : total / max > 0.4 ? "#ffab00" : "#ff1744",
                    borderRadius: 2, transition: "width 0.5s" }} />
                </div>
                {items.filter((it) => !it.info).map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between",
                    fontSize: 9, fontFamily: "monospace", marginBottom: 2,
                    color: it.up ? "#00b860" : "#cc2233" }}>
                    <span>{it.up ? "▲" : "▼"} {it.l}</span>
                    <span>+{it.pts}</span>
                  </div>
                ))}
                {items.filter((it) => it.info).map((it, i) => (
                  <div key={`info-${i}`} style={{ fontSize: 8, color: "#3a4a6a", fontFamily: "monospace" }}>
                    {it.l}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div style={{ color: "#4a5a7a", fontSize: 11, textAlign: "center", paddingTop: 20 }}>
              {assetCandles.length < 210
                ? `Acumulando velas: ${assetCandles.length}/210`
                : "Calculando…"}
            </div>
          )}
        </div>

        {/* Decisión + Sentimiento + BB */}
        <div style={{ ...S.panel, padding: 10 }}>
          <div style={{ ...S.dimTxt, marginBottom: 8 }}>⚡ DECISIÓN HÍBRIDA</div>
          <div style={{ textAlign: "center", padding: "14px 0 10px" }}>
            <div style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: 20, color: col, letterSpacing: 2 }}>
              {score?.decision ?? "CARGANDO"}
            </div>
            <div style={{ fontSize: 11, color: "#4a5a7a", marginTop: 4 }}>
              <SignalBadge sig={score?.signal} />
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: score ? col : "#4a5a7a",
              border: `1px solid ${score ? col + "44" : "#1a2744"}`,
              borderRadius: 3, padding: "3px 10px", display: "inline-block" }}>
              ZONA: {score?.zone ?? "---"}
            </div>
          </div>
          {/* Sentiment bar */}
          <div style={{ marginTop: 8 }}>
            <div style={{ ...S.dimTxt, marginBottom: 4 }}>SENTIMIENTO SONO</div>
            <div style={{ position: "relative", height: 10, borderRadius: 5,
              background: "linear-gradient(to right,#ff1744,#ff6d00,#ffab00,#ffd600,#76ff03,#00e676)", marginBottom: 4 }}>
              {score && (
                <div style={{ position: "absolute", left: `${score.total}%`, top: -3,
                  transform: "translateX(-50%)", width: 4, height: 16, background: "#fff",
                  borderRadius: 2, transition: "left 0.5s ease" }} />
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#3a4a6a", fontFamily: "monospace" }}>
              {["PÁNICO", "MIEDO", "NEUTRO", "OPTIM", "BURBUJA"].map((z) => <span key={z}>{z}</span>)}
            </div>
          </div>
          {/* BB values */}
          {score?.bb && (
            <div style={{ marginTop: 10, fontSize: 9, fontFamily: "monospace" }}>
              <div style={{ ...S.dimTxt, marginBottom: 4 }}>BOLLINGER BANDS (20,2)</div>
              {[
                { lbl: "Upper", val: score.bb.upper, col: "#ff1744" },
                { lbl: "Middle", val: score.bb.middle, col: "#ffab00" },
                { lbl: "Lower", val: score.bb.lower, col: "#00e676" },
              ].map(({ lbl, val, col: c }) => (
                <div key={lbl} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ color: "#3a4a6a" }}>BB {lbl}</span>
                  <span style={{ color: c }}>{fmtPrice(val, activeAsset)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CALCULADORA + TIMELINE ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>

        {/* Calculator */}
        <div style={{ ...S.panel, padding: 10 }}>
          <div style={{ ...S.dimTxt, marginBottom: 8 }}>💰 CALCULADORA PRO — GESTIÓN DE RIESGO</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {[
              { lbl: "CAPITAL ($)",    key: "capital", ph: "10000" },
              { lbl: livePrice ? `ENTRADA ($) ← LIVE` : "ENTRADA ($)",
                key: "entry",   ph: livePrice ? fmt(livePrice, asset.decimals) : "0", live: true },
              { lbl: "STOP LOSS ($)",  key: "sl",      ph: "0" },
              { lbl: "RIESGO (%)",     key: "risk",    ph: "2" },
            ].map(({ lbl, key, ph, live }) => (
              <div key={key}>
                <div style={{ ...S.dimTxt, marginBottom: 3, color: live ? "#00e676" : "#4a5a7a" }}>{lbl}</div>
                <input type="number" value={calc[key]}
                  onChange={(e) => setCalc((c) => ({ ...c, [key]: e.target.value }))}
                  placeholder={ph}
                  style={{ width: "100%", background: "#070b14", border: `1px solid ${live && !calc[key] ? "#00e67644" : "#1a2744"}`,
                    borderRadius: 3, padding: "6px 8px", color: "#cdd8ef", fontFamily: "monospace",
                    fontSize: 12, boxSizing: "border-box", outline: "none" }} />
              </div>
            ))}
          </div>
          {livePrice && (
            <button onClick={() => setCalc((c) => ({ ...c, entry: fmt(livePrice, asset.decimals) }))}
              style={S.liveBtn}>
              ⚡ Usar precio actual {fmtPrice(livePrice, activeAsset)}
            </button>
          )}
          {calcResult ? (
            <div style={{ borderTop: "1px solid #1a2744", paddingTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { lbl: "CANTIDAD",       val: `${calcResult.posSize.toFixed(6)} ${activeAsset}` },
                { lbl: "TAMAÑO",         val: `$${fmt(calcResult.posVal, 0)}` },
                { lbl: "APALANCAMIENTO", val: `${calcResult.leverage.toFixed(2)}x`,
                  col: calcResult.leverage > 10 ? "#ff1744" : calcResult.leverage > 5 ? "#ffab00" : "#00e676" },
                { lbl: "PÉRDIDA MÁX",   val: `-$${fmt(calcResult.riskAmt, 0)}`, col: "#ff1744" },
              ].map(({ lbl, val, col: c }) => (
                <div key={lbl}>
                  <div style={S.dimTxt}>{lbl}</div>
                  <div style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: 13, color: c ?? "#cdd8ef" }}>{val}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...S.dimTxt, borderTop: "1px solid #1a2744", paddingTop: 8 }}>
              Introduce capital, entrada y stop loss para calcular
            </div>
          )}
        </div>

        {/* Signal Timeline */}
        <div style={{ ...S.panel, padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={S.dimTxt}>📜 TIMELINE DE SEÑALES</span>
            {signals.length > 0 && (
              <button onClick={() => setSignals([])} style={{ ...S.dimTxt, background: "none", border: "none", cursor: "pointer", fontSize: 9 }}>
                LIMPIAR
              </button>
            )}
          </div>
          {signals.length === 0 ? (
            <div style={{ color: "#3a4a6a", fontSize: 10, fontFamily: "monospace", textAlign: "center", paddingTop: 30 }}>
              Esperando primera señal…<br />
              <span style={{ fontSize: 9 }}>Se registra cuando cambia el Score Maestro</span>
            </div>
          ) : (
            <div style={{ overflowY: "auto", maxHeight: 200 }}>
              {signals.map((s, i) => {
                const sc = s.signal.includes("COMPRA") ? "#00e676" : s.signal.includes("VENTA") || s.signal.includes("CAPIT") ? "#ff1744" : "#ffab00";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
                    padding: "4px 6px", marginBottom: 2, borderRadius: 3,
                    background: i === 0 ? "#1a2744" : "transparent", borderLeft: `2px solid ${sc}` }}>
                    <span style={{ fontSize: 8, color: "#3a4a6a", fontFamily: "monospace", minWidth: 50 }}>
                      {s.time.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span style={{ fontSize: 9, color: "#5a6a8a", minWidth: 28 }}>{s.asset}</span>
                    <span style={{ fontSize: 10, color: sc, fontFamily: "monospace", fontWeight: "bold", flex: 1 }}>{s.signal}</span>
                    <span style={{ fontSize: 9, color: sc }}>{s.score}</span>
                    <span style={{ fontSize: 8, color: "#3a4a6a" }}>{s.price ? fmtPrice(s.price, s.asset) : ""}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── REGLAS + STATUS BAR ────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
        {[
          { icon: "⏰", title: "SOLO INTRADÍA",   desc: "Cierra posiciones antes del cierre. Sin overnight.", warn: false },
          { icon: "🧠", title: "SCORE MANDA",      desc: "No comprar en distribución. No vender en acumulación.", warn: false },
          { icon: "🎯", title: "VIX DINÁMICO",    desc: `ATR actual: ${score?.atr ? fmtPrice(score.atr, activeAsset) : "--"} | Stops dinámicos basados en volatilidad.`, warn: score?.atr != null && score.atr / (livePrice ?? 1) > 0.025 },
        ].map(({ icon, title, desc, warn }) => (
          <div key={title} style={{ ...S.panel, padding: 10, borderColor: warn ? "#ff6d0044" : "#1a2744" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <div>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: warn ? "#ff6d00" : "#5a6a8a", fontWeight: "bold", marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: 10, color: "#3a4a6a", fontFamily: "monospace", lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* STATUS BAR */}
      <div style={{ ...S.panel, padding: "5px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            `SONO PRO v2.1`,
            `BINANCE WS: ${wsStatus.toUpperCase()}`,
            `INTERVALO: ${INTERVAL}`,
            `VELAS: ${assetCandles.length}/${CANDLE_LIMIT}`,
            `SEÑALES HOY: ${signals.length}`,
          ].map((t) => <span key={t} style={S.dimTxt}>{t}</span>)}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <span style={S.dimTxt}>{new Date(now).toLocaleTimeString("es")}</span>
          <span style={{ ...S.dimTxt, color: "#3a4a6a" }}>Madrid, España</span>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        input:focus { border-color:#00e67666 !important; }
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#0d1421}
        ::-webkit-scrollbar-thumb{background:#1a2744;border-radius:2px}
        button:hover{opacity:0.8}
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const S = {
  root: {
    background: "#070b14", minHeight: "100vh", color: "#cdd8ef",
    fontFamily: "'Courier New',monospace", padding: 8, boxSizing: "border-box",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 8, padding: "7px 12px",
    background: "#0d1421", border: "1px solid #1a2744", borderRadius: 4,
  },
  panel: {
    background: "#0d1421", border: "1px solid #1a2744", borderRadius: 4, padding: 10,
  },
  dimTxt: {
    color: "#4a5a7a", fontSize: 10, fontFamily: "monospace",
    textTransform: "uppercase", letterSpacing: 1,
  },
  assetBtn: {
    padding: "4px 12px", fontSize: 11, fontFamily: "monospace", fontWeight: "bold",
    borderRadius: 3, cursor: "pointer", transition: "all 0.15s", border: "1px solid",
  },
  iconBtn: {
    background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 0,
  },
  liveBtn: {
    padding: "4px 10px", fontSize: 10, fontFamily: "monospace",
    background: "#00e67611", border: "1px solid #00e67644",
    borderRadius: 3, color: "#00e676", cursor: "pointer", marginBottom: 8,
  },
  chartEmpty: {
    height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
    color: "#3a4a6a", fontSize: 12, fontFamily: "monospace",
  },
};
