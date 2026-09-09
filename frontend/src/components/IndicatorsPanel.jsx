import React from 'react';
import { CheckCircle, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function IndicatorsPanel({ indicators, loading }) {
  if (loading || !indicators) {
    return (
      <div style={{ padding: '12px 16px', display: 'flex', gap: '16px', overflowX: 'auto' }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ minWidth: 90, height: 48, background: 'var(--bg-card)', borderRadius: 6, opacity: 0.4 }} />
        ))}
      </div>
    );
  }

  const { oscillators, movingAverages, bands, trend, volume, volatility, signal } = indicators;
  const rsi = oscillators?.rsi;
  const macd = oscillators?.macd;
  const stoch = oscillators?.stoch;
  const adx = trend?.adx;
  const bb = bands?.bollinger;

  const rsiColor = (v) => v < 30 ? 'var(--green)' : v > 70 ? 'var(--red)' : 'var(--accent)';

  return (
    <div className="indicators-panel">
      <div className="ind-group">
        <span className="ind-label">RSI 14</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RsiBar value={rsi} />
          <span className="ind-val mono" style={{ color: rsiColor(rsi) }}>{rsi?.toFixed(1)}</span>
        </div>
        <span className="ind-hint">{rsi < 30 ? 'Survendu' : rsi > 70 ? 'Suracheté' : 'Neutre'}</span>
      </div>

      <div className="ind-sep" />

      <div className="ind-group">
        <span className="ind-label">MACD</span>
        <span className={`ind-val mono ${macd?.histogram >= 0 ? 'pos' : 'neg'}`}>
          {macd?.macd?.toFixed(4)}
        </span>
        <span className="ind-hint">Histo: {macd?.histogram?.toFixed(4)}</span>
      </div>

      <div className="ind-sep" />

      <div className="ind-group">
        <span className="ind-label">Stoch K/D</span>
        <span className={`ind-val mono ${stoch?.k < 20 ? 'pos' : stoch?.k > 80 ? 'neg' : 'neutral'}`}>
          {stoch?.k?.toFixed(1)} / {stoch?.d?.toFixed(1)}
        </span>
        <span className="ind-hint">{stoch?.k < 20 ? 'Survendu' : stoch?.k > 80 ? 'Suracheté' : 'Neutre'}</span>
      </div>

      <div className="ind-sep" />

      <div className="ind-group">
        <span className="ind-label">ADX</span>
        <span className="ind-val mono" style={{ color: adx?.adx > 25 ? 'var(--accent)' : 'var(--text-secondary)' }}>
          {adx?.adx?.toFixed(1)}
        </span>
        <span className="ind-hint">
          <span className="pos">+DI {adx?.pdi?.toFixed(1)}</span>
          {' / '}
          <span className="neg">-DI {adx?.mdi?.toFixed(1)}</span>
        </span>
      </div>

      <div className="ind-sep" />

      <div className="ind-group">
        <span className="ind-label">Bollinger</span>
        <span className="ind-val mono">{bb?.position?.toFixed(0)}%</span>
        <span className="ind-hint">Width: {bb?.width?.toFixed(1)}%</span>
      </div>

      <div className="ind-sep" />

      <div className="ind-group">
        <span className="ind-label">MA Trend</span>
        <span className={`ind-val mono ${movingAverages?.goldenCross ? 'pos' : 'neg'}`} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {movingAverages?.goldenCross ? <><CheckCircle size={10} /> Golden</> : <><XCircle size={10} /> Death</>}
        </span>
        <span className="ind-hint">SMA50 vs SMA200</span>
      </div>

      <div className="ind-sep" />

      <div className="ind-group">
        <span className="ind-label">Ichimoku</span>
        <span className={`ind-val mono ${trend?.ichimoku?.aboveCloud ? 'pos' : 'neg'}`}>
          {trend?.ichimoku?.aboveCloud ? 'Au-dessus' : 'En dessous'}
        </span>
        <span className="ind-hint">du nuage</span>
      </div>

      <div className="ind-sep" />

      <div className="ind-group">
        <span className="ind-label">VWAP</span>
        <span className={`ind-val mono ${indicators.price >= volume?.vwap ? 'pos' : 'neg'}`}>
          ${volume?.vwap?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </span>
        <span className="ind-hint">Prix {indicators.price >= volume?.vwap ? 'au-dessus' : 'en dessous'}</span>
      </div>

      <div className="ind-sep" />

      <div className="ind-group">
        <span className="ind-label">OBV</span>
        <span className={`ind-val mono ${volume?.obvTrend === 'up' ? 'pos' : 'neg'}`} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {volume?.obvTrend === 'up' ? <><TrendingUp size={10} /> Haussier</> : <><TrendingDown size={10} /> Baissier</>}
        </span>
        <span className="ind-hint">Vol ×{volume?.volumeRatio}</span>
      </div>

      <div className="ind-sep" />

      <div className="ind-group">
        <span className="ind-label">ATR</span>
        <span className="ind-val mono" style={{ color: 'var(--yellow)' }}>
          {volatility?.atrPct?.toFixed(2)}%
        </span>
        <span className="ind-hint">Volatilité</span>
      </div>

      <div className="ind-sep" />

      <div className="ind-group" style={{ minWidth: 110 }}>
        <span className="ind-label">Signal Algo</span>
        <span className={`signal-badge ${signal?.action === 'ACHETER' ? 'buy' : signal?.action === 'VENDRE' ? 'sell' : 'neutral'}`} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          {signal?.action === 'ACHETER' ? <TrendingUp size={10} /> : signal?.action === 'VENDRE' ? <TrendingDown size={10} /> : <Minus size={10} />}
          {signal?.action}
        </span>
        <span className="ind-hint">{signal?.strength}</span>
      </div>

      <style>{`
        .indicators-panel {
          display: flex; align-items: stretch; gap: 0;
          padding: 0 8px; min-height: 60px;
          overflow-x: auto; width: 100%;
        }
        .ind-group {
          display: flex; flex-direction: column; justify-content: center;
          padding: 8px 12px; min-width: 80px; flex-shrink: 0;
          gap: 2px;
        }
        .ind-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; }
        .ind-val { font-size: 13px; font-weight: 700; }
        .ind-hint { font-size: 10px; color: var(--text-muted); }
        .ind-sep { width: 1px; background: var(--border); margin: 8px 0; flex-shrink: 0; }
      `}</style>
    </div>
  );
}

function RsiBar({ value }) {
  const pct = Math.min(100, Math.max(0, value || 50));
  const color = value < 30 ? 'var(--green)' : value > 70 ? 'var(--red)' : 'var(--accent)';
  return (
    <div style={{ width: 50, height: 4, background: 'var(--bg-card)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
    </div>
  );
}
