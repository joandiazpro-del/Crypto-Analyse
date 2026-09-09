import React from 'react';
import AIAnalysis from '../AIAnalysis';

export default function AITab({ analysis, loading, onAnalyze, coin, interval, indicators, tickers, riskProfile, onRiskProfileChange }) {
  const ticker = tickers[coin?.id];

  return (
    <div className="ai-tab">
      <div className="ai-tab-left">
        <AIAnalysis
          analysis={analysis}
          loading={loading}
          onAnalyze={onAnalyze}
          coin={coin}
          interval={interval}
          riskProfile={riskProfile}
          onRiskProfileChange={onRiskProfileChange}
        />
      </div>

      <div className="ai-tab-right">
        <div className="ai-tab-market">
          <div className="ai-section-title">Données de marché</div>
          {ticker && (
            <div className="ai-market-grid">
              <MetricRow label="Prix" value={`$${ticker.price?.toLocaleString('en-US', { maximumFractionDigits: 4 })}`} />
              <MetricRow label="Variation 24h" value={ticker.change != null ? `${ticker.change >= 0 ? '+' : ''}${ticker.change.toFixed(2)}%` : '—'} colored={ticker.change} />
              <MetricRow label="Volume 24h" value={ticker.volume ? `$${(ticker.volume / 1e6).toFixed(1)}M` : '—'} />
              <MetricRow label="Haut 24h" value={ticker.high ? `$${ticker.high.toLocaleString()}` : '—'} />
              <MetricRow label="Bas 24h"  value={ticker.low  ? `$${ticker.low.toLocaleString()}`  : '—'} />
            </div>
          )}
        </div>

        {indicators && (
          <div className="ai-tab-indicators">
            <div className="ai-section-title">Indicateurs clés</div>
            <div className="ai-market-grid">
              <MetricRow label="RSI (14)"   value={indicators.oscillators?.rsi?.toFixed(1)} rsi={indicators.oscillators?.rsi} />
              <MetricRow label="MACD"       value={indicators.oscillators?.macd?.macd?.toFixed(4)} colored={indicators.oscillators?.macd?.macd} />
              <MetricRow label="Stoch %K"   value={indicators.oscillators?.stoch?.k?.toFixed(1)} />
              <MetricRow label="ADX"        value={indicators.trend?.adx?.adx?.toFixed(1)} />
              <MetricRow label="ATR %"      value={indicators.volatility?.atrPct?.toFixed(2) + '%'} />
              <MetricRow label="BB Width"   value={indicators.bands?.bollinger?.width?.toFixed(2) + '%'} />
              <MetricRow label="VWAP"       value={indicators.volume?.vwap ? `$${parseFloat(indicators.volume.vwap).toFixed(2)}` : '—'} />
              <MetricRow label="OBV"        value={indicators.volume?.obvTrend} />
              <MetricRow label="Signal"     value={`${indicators.signal?.action} (${indicators.signal?.strength})`} />
              <MetricRow label="Score net"  value={indicators.signal?.netScore} />
            </div>
          </div>
        )}
      </div>

      <style>{`
        .ai-tab { display: grid; grid-template-columns: 1fr 320px; gap: 0; height: 100%; overflow: hidden; }
        .ai-tab-left { overflow-y: auto; border-right: 1px solid var(--border); }
        .ai-tab-left .ai-panel { border: none; border-bottom: none; }
        .ai-tab-right { overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px; }
        .ai-tab-market, .ai-tab-indicators { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; }
        .ai-section-title { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
        .ai-market-grid { display: flex; flex-direction: column; gap: 4px; }
        .ai-metric-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-bottom: 1px solid rgba(30,45,61,0.5); }
        .ai-metric-row:last-child { border-bottom: none; }
        .ai-metric-label { font-size: 11px; color: var(--text-muted); }
        .ai-metric-value { font-size: 11px; font-family: var(--font-mono); color: var(--text-primary); }
      `}</style>
    </div>
  );
}

function MetricRow({ label, value, colored, rsi }) {
  let color = 'var(--text-primary)';
  if (colored !== undefined && colored !== null) color = colored >= 0 ? 'var(--green)' : 'var(--red)';
  if (rsi !== undefined && rsi !== null) {
    if (rsi > 70) color = 'var(--red)';
    else if (rsi < 30) color = 'var(--green)';
  }
  return (
    <div className="ai-metric-row">
      <span className="ai-metric-label">{label}</span>
      <span className="ai-metric-value" style={{ color }}>{value ?? '—'}</span>
    </div>
  );
}
