import React from 'react';
import { format } from 'date-fns';

export default function TradesFeed({ trades }) {
  const fmt = (p) => {
    if (!p) return '—';
    if (p > 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (p > 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  return (
    <div className="panel trades-feed">
      <div className="panel-header">
        <span className="panel-title">Trades récents</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{trades.length} trades</span>
      </div>
      <div className="trades-header">
        <span>Prix</span>
        <span>Quantité</span>
        <span>Heure</span>
      </div>
      <div className="trades-list">
        {trades.slice(0, 30).map((t, i) => (
          <div key={i} className={`trade-row ${t.isBuyerMaker ? 'sell' : 'buy'}`}>
            <span className={`mono ${t.isBuyerMaker ? 'neg' : 'pos'}`}>{fmt(t.price)}</span>
            <span className="mono">{t.qty?.toFixed(4)}</span>
            <span className="mono" style={{ color: 'var(--text-muted)' }}>
              {t.time ? format(new Date(t.time), 'HH:mm:ss') : '—'}
            </span>
          </div>
        ))}
        {trades.length === 0 && (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            En attente de trades...
          </div>
        )}
      </div>

      <style>{`
        .trades-feed { max-height: 220px; display: flex; flex-direction: column; overflow: hidden; }
        .trades-header {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          padding: 4px 8px; font-size: 10px; color: var(--text-muted); text-align: right;
          border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
        .trades-header span:first-child { text-align: left; }
        .trades-list { overflow-y: auto; flex: 1; }
        .trade-row {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          padding: 2px 8px; font-size: 11px; text-align: right;
          animation: fadeIn 0.2s ease;
        }
        .trade-row span:first-child { text-align: left; }
        .trade-row.buy { border-left: 2px solid transparent; }
        .trade-row.buy:hover { background: rgba(0,230,118,0.05); }
        .trade-row.sell:hover { background: rgba(255,71,87,0.05); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
