import React from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend
} from 'recharts';

const CHART_STYLE = {
  background: 'transparent',
  fontSize: 10,
  fontFamily: "'Space Mono', monospace"
};

const TOOLTIP_STYLE = {
  contentStyle: { background: '#0d1821', border: '1px solid #1e2d3d', fontSize: 10, fontFamily: "'Space Mono', monospace" },
  labelStyle: { color: '#7a92a8' },
};

function Panel({ title, children, height = 180 }) {
  return (
    <div className="ind-panel">
      <div className="ind-panel-title">{title}</div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

export default function IndicatorsTab({ klines, indicators, loading }) {
  if (loading || !klines.length) {
    return <div className="tab-empty"><div className="spinner" /><span>Chargement des indicateurs...</span></div>;
  }

  // Calculer les séries pour chaque graphique
  const closes = klines.map(k => k.close);
  const times  = klines.map(k => Math.floor(k.openTime / 1000));

  // RSI (14)
  const rsiData = computeRSI(closes, 14).map((v, i) => ({
    time: formatTime(times[i + 14]),
    rsi: +v.toFixed(2)
  }));

  // MACD
  const macdData = computeMACD(closes).map((v, i) => ({
    time: formatTime(times[i + 33]),
    macd: +v.macd.toFixed(4),
    signal: +v.signal.toFixed(4),
    histo: +v.histo.toFixed(4)
  }));

  // Volume
  const volData = klines.slice(-100).map((k, i) => ({
    time: formatTime(Math.floor(k.openTime / 1000)),
    volume: +(k.volume / 1000).toFixed(1),
    color: k.close >= k.open ? '#00e676' : '#ff4757'
  }));

  // Stochastique
  const stochData = computeStoch(klines, 14, 3).map((v, i) => ({
    time: formatTime(times[i + 14]),
    k: +v.k.toFixed(2),
    d: +v.d.toFixed(2)
  }));

  // Bollinger %B
  const bbData = computeBBPct(closes, 20).map((v, i) => ({
    time: formatTime(times[i + 20]),
    pct: +v.toFixed(2)
  }));

  return (
    <div className="indicators-tab">

      <div className="ind-grid">
        <Panel title={`RSI (14) — ${indicators?.oscillators?.rsi?.toFixed(1) ?? '—'}`} height={160}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rsiData.slice(-100)} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0e1318" />
              <XAxis dataKey="time" tick={{ fill: '#7a92a8', fontSize: 9 }} interval={19} />
              <YAxis domain={[0, 100]} tick={{ fill: '#7a92a8', fontSize: 9 }} width={28} />
              <Tooltip {...TOOLTIP_STYLE} />
              <ReferenceLine y={70} stroke="#ff4757" strokeDasharray="4 2" strokeOpacity={0.6} />
              <ReferenceLine y={30} stroke="#00e676" strokeDasharray="4 2" strokeOpacity={0.6} />
              <ReferenceLine y={50} stroke="#7a92a8" strokeDasharray="2 4" strokeOpacity={0.4} />
              <Line type="monotone" dataKey="rsi" stroke="#00d4ff" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={`MACD (12,26,9) — ${indicators?.oscillators?.macd?.macd?.toFixed(4) ?? '—'}`} height={160}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={macdData.slice(-100)} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0e1318" />
              <XAxis dataKey="time" tick={{ fill: '#7a92a8', fontSize: 9 }} interval={19} />
              <YAxis tick={{ fill: '#7a92a8', fontSize: 9 }} width={40} />
              <Tooltip {...TOOLTIP_STYLE} />
              <ReferenceLine y={0} stroke="#7a92a8" strokeOpacity={0.5} />
              <Line type="monotone" dataKey="macd"   stroke="#00d4ff" dot={false} strokeWidth={1.5} name="MACD" />
              <Line type="monotone" dataKey="signal" stroke="#ff9f43" dot={false} strokeWidth={1.5} name="Signal" />
              <Legend wrapperStyle={{ fontSize: 9, color: '#7a92a8' }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Histogramme MACD" height={160}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={macdData.slice(-60)} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0e1318" />
              <XAxis dataKey="time" tick={{ fill: '#7a92a8', fontSize: 9 }} interval={11} />
              <YAxis tick={{ fill: '#7a92a8', fontSize: 9 }} width={40} />
              <Tooltip {...TOOLTIP_STYLE} />
              <ReferenceLine y={0} stroke="#7a92a8" strokeOpacity={0.5} />
              <Bar dataKey="histo" fill="#00d4ff"
                label={false}
                shape={(props) => {
                  const fill = props.histo >= 0 ? 'rgba(0,230,118,0.7)' : 'rgba(255,71,87,0.7)';
                  return <rect x={props.x} y={props.y} width={props.width} height={props.height} fill={fill} />;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={`Stochastique (14,3) — K:${indicators?.oscillators?.stoch?.k?.toFixed(1) ?? '—'} D:${indicators?.oscillators?.stoch?.d?.toFixed(1) ?? '—'}`} height={160}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stochData.slice(-100)} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0e1318" />
              <XAxis dataKey="time" tick={{ fill: '#7a92a8', fontSize: 9 }} interval={19} />
              <YAxis domain={[0, 100]} tick={{ fill: '#7a92a8', fontSize: 9 }} width={28} />
              <Tooltip {...TOOLTIP_STYLE} />
              <ReferenceLine y={80} stroke="#ff4757" strokeDasharray="4 2" strokeOpacity={0.6} />
              <ReferenceLine y={20} stroke="#00e676" strokeDasharray="4 2" strokeOpacity={0.6} />
              <Line type="monotone" dataKey="k" stroke="#00d4ff" dot={false} strokeWidth={1.5} name="%K" />
              <Line type="monotone" dataKey="d" stroke="#ff9f43" dot={false} strokeWidth={1.5} name="%D" />
              <Legend wrapperStyle={{ fontSize: 9, color: '#7a92a8' }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Volume" height={160}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volData} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0e1318" />
              <XAxis dataKey="time" tick={{ fill: '#7a92a8', fontSize: 9 }} interval={19} />
              <YAxis tick={{ fill: '#7a92a8', fontSize: 9 }} width={40} tickFormatter={v => `${v}K`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}K`, 'Volume']} />
              <Bar dataKey="volume"
                shape={(props) => <rect x={props.x} y={props.y} width={props.width} height={props.height} fill={props.color} fillOpacity={0.7} />}
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={`Bollinger %B — ${indicators?.bands?.bollinger?.position?.toFixed(1) ?? '—'}%`} height={160}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bbData.slice(-100)} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0e1318" />
              <XAxis dataKey="time" tick={{ fill: '#7a92a8', fontSize: 9 }} interval={19} />
              <YAxis domain={[0, 100]} tick={{ fill: '#7a92a8', fontSize: 9 }} width={28} />
              <Tooltip {...TOOLTIP_STYLE} />
              <ReferenceLine y={100} stroke="#ff4757" strokeDasharray="4 2" strokeOpacity={0.6} />
              <ReferenceLine y={0}   stroke="#00e676" strokeDasharray="4 2" strokeOpacity={0.6} />
              <ReferenceLine y={50}  stroke="#7a92a8" strokeDasharray="2 4" strokeOpacity={0.4} />
              <Line type="monotone" dataKey="pct" stroke="#a29bfe" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <style>{`
        .indicators-tab { height: 100%; overflow-y: auto; padding: 12px; background: var(--bg-primary); }
        .ind-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ind-panel { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px; }
        .ind-panel-title { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
        @media (max-width: 900px) { .ind-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

// ─── Calculs ───────────────────────────────────────────────────────────────────

function computeRSI(closes, period) {
  const result = [];
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

function computeMACD(closes, fast = 12, slow = 26, signal = 9) {
  const ema = (arr, p) => {
    const k = 2 / (p + 1);
    let e = arr.slice(0, p).reduce((a, b) => a + b, 0) / p;
    const res = [];
    for (let i = p; i < arr.length; i++) { e = arr[i] * k + e * (1 - k); res.push(e); }
    return res;
  };
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const offset = slow - fast;
  const macdLine = slowEma.map((v, i) => fastEma[i + offset] - v);
  const k = 2 / (signal + 1);
  let sig = macdLine.slice(0, signal).reduce((a, b) => a + b, 0) / signal;
  const result = [];
  for (let i = signal; i < macdLine.length; i++) {
    sig = macdLine[i] * k + sig * (1 - k);
    result.push({ macd: macdLine[i], signal: sig, histo: macdLine[i] - sig });
  }
  return result;
}

function computeStoch(klines, kPeriod = 14, dPeriod = 3) {
  const result = [];
  for (let i = kPeriod - 1; i < klines.length; i++) {
    const slice = klines.slice(i - kPeriod + 1, i + 1);
    const high = Math.max(...slice.map(k => k.high));
    const low  = Math.min(...slice.map(k => k.low));
    result.push(low === high ? 50 : ((klines[i].close - low) / (high - low)) * 100);
  }
  const kLine = result;
  const dLine = [];
  for (let i = dPeriod - 1; i < kLine.length; i++) {
    dLine.push({ k: kLine[i], d: kLine.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / dPeriod });
  }
  return dLine;
}

function computeBBPct(closes, period = 20) {
  const result = [];
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const std  = Math.sqrt(slice.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / period);
    const upper = mean + 2 * std, lower = mean - 2 * std;
    result.push(upper === lower ? 50 : ((closes[i] - lower) / (upper - lower)) * 100);
  }
  return result;
}
