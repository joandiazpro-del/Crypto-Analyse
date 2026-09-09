import React from 'react';

export default function WatchList({ coins, tickers, selected, onSelect }) {
  return (
    <div className="watchlist">
      <div className="watchlist-header">
        <span className="panel-title">Watchlist</span>
      </div>
      <div className="watchlist-items">
        {coins.map(coin => {
          const ticker = tickers[coin.id];
          const isSelected = selected.id === coin.id;
          const pos = ticker?.change >= 0;
          return (
            <button
              key={coin.id}
              className={`watchlist-item ${isSelected ? 'active' : ''}`}
              onClick={() => onSelect(coin)}
            >
              <div className="wl-icon" style={{ background: (coin.color ?? '#7a92a8') + '22', color: coin.color ?? '#7a92a8', border: `1px solid ${coin.color ?? '#7a92a8'}44` }}>{coin.symbol.slice(0, 2)}</div>
              <div className="wl-info">
                <span className="wl-symbol">{coin.symbol}</span>
                <span className="wl-name">{coin.name}</span>
              </div>
              <div className="wl-price">
                <span className={`wl-val mono ${pos ? 'pos' : 'neg'}`}>
                  {ticker ? formatPrice(ticker.price) : '—'}
                </span>
                <span className={`wl-change ${pos ? 'pos' : 'neg'}`}>
                  {ticker ? (ticker.change != null ? `${pos ? '+' : ''}${ticker.change.toFixed(2)}%` : '—') : ''}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <style>{`
        .watchlist { display: flex; flex-direction: column; height: 100%; }
        .watchlist-header { padding: 8px 12px; border-bottom: 1px solid var(--border); }
        .watchlist-items { flex: 1; overflow-y: auto; }
        .watchlist-item {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; width: 100%; text-align: left;
          border-bottom: 1px solid transparent;
          transition: background 0.12s;
          border-radius: 0;
        }
        .watchlist-item:hover { background: var(--bg-hover); }
        .watchlist-item.active { background: var(--accent-glow); border-left: 2px solid var(--accent); }
        .wl-icon { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; font-family: var(--font-mono); flex-shrink: 0; }
        .wl-info { flex: 1; min-width: 0; }
        .wl-symbol { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); }
        .wl-name { display: block; font-size: 10px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wl-price { text-align: right; }
        .wl-val { display: block; font-size: 11px; }
        .wl-change { display: block; font-size: 10px; }
      `}</style>
    </div>
  );
}

function formatPrice(p) {
  if (!p) return '—';
  if (p < 0.01) return `$${p.toFixed(6)}`;
  if (p < 1) return `$${p.toFixed(4)}`;
  if (p < 100) return `$${p.toFixed(3)}`;
  return `$${p.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}
