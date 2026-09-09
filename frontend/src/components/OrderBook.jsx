import React, { useMemo } from 'react';

export default function OrderBook({ orderBook, price }) {
  const { bids = [], asks = [] } = orderBook;

  const maxQty = useMemo(() => {
    const allQty = [...bids, ...asks].map(o => o.qty);
    return Math.max(...allQty, 1);
  }, [bids, asks]);

  const spread = useMemo(() => {
    if (!asks[0] || !bids[0]) return null;
    const s = asks[0].price - bids[0].price;
    const pct = (s / asks[0].price) * 100;
    return { value: s, pct };
  }, [bids, asks]);

  const fmt = (p) => {
    if (!p) return '—';
    if (p > 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (p > 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  const fmtQty = (q) => {
    if (q >= 1000) return `${(q / 1000).toFixed(1)}K`;
    return q.toFixed(2);
  };

  return (
    <div className="panel orderbook">
      <div className="panel-header">
        <span className="panel-title">Order Book</span>
        {spread && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Spread: {spread.pct.toFixed(3)}%
          </span>
        )}
      </div>

      <div style={{ padding: '0' }}>
        <div className="ob-header">
          <span>Prix (USDT)</span>
          <span>Quantité</span>
          <span>Total</span>
        </div>

        {/* ASKS (rouge) - inversé */}
        <div>
          {[...asks].reverse().slice(0, 10).map((ask, i) => (
            <div key={i} className="ob-row ask">
              <div
                className="ob-depth-bar"
                style={{ width: `${(ask.qty / maxQty) * 100}%`, background: 'rgba(255,71,87,0.15)' }}
              />
              <span className="ob-price neg mono">{fmt(ask.price)}</span>
              <span className="ob-qty mono">{fmtQty(ask.qty)}</span>
              <span className="ob-total mono">{fmtQty(ask.qty * ask.price)}</span>
            </div>
          ))}
        </div>

        {/* Spread / Prix actuel */}
        <div className="ob-mid">
          <span className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
            {price ? `$${fmt(price)}` : '—'}
          </span>
          {spread && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{spread.value.toFixed(4)}</span>}
        </div>

        {/* BIDS (vert) */}
        <div>
          {bids.slice(0, 10).map((bid, i) => (
            <div key={i} className="ob-row bid">
              <div
                className="ob-depth-bar"
                style={{ width: `${(bid.qty / maxQty) * 100}%`, background: 'rgba(0,230,118,0.12)' }}
              />
              <span className="ob-price pos mono">{fmt(bid.price)}</span>
              <span className="ob-qty mono">{fmtQty(bid.qty)}</span>
              <span className="ob-total mono">{fmtQty(bid.qty * bid.price)}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .orderbook { flex: 0 0 auto; overflow: hidden; }
        .ob-header {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          padding: 4px 8px; font-size: 10px;
          color: var(--text-muted); text-align: right;
          border-bottom: 1px solid var(--border);
        }
        .ob-header span:first-child { text-align: left; }
        .ob-row {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          padding: 2px 8px; font-size: 11px; position: relative;
          text-align: right; cursor: default;
          transition: background 0.1s;
        }
        .ob-row:hover { background: var(--bg-hover); }
        .ob-depth-bar { position: absolute; right: 0; top: 0; height: 100%; z-index: 0; }
        .ob-price, .ob-qty, .ob-total { position: relative; z-index: 1; }
        .ob-price { text-align: left; }
        .ob-qty { color: var(--text-secondary); }
        .ob-total { color: var(--text-muted); }
        .ob-mid {
          display: flex; align-items: center; justify-content: space-between;
          padding: 6px 10px; background: var(--bg-card);
          border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
        }
      `}</style>
    </div>
  );
}
