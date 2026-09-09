import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, RefreshCw, TrendingUp, TrendingDown, Minus, Zap, ChevronUp, ChevronDown, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { api } from '../../utils/api';

const INTERVALS = [{ v: '1h', l: '1H' }, { v: '4h', l: '4H' }, { v: '1d', l: '1J' }];
const FILTERS = [
  { v: 'all',      l: 'Tous',     Icon: null },
  { v: 'buy',      l: 'Acheter',  Icon: TrendingUp },
  { v: 'sell',     l: 'Vendre',   Icon: TrendingDown },
  { v: 'rsi_low',  l: 'RSI < 35', Icon: ArrowDownCircle },
  { v: 'rsi_high', l: 'RSI > 65', Icon: ArrowUpCircle },
];

const COIN_META = {
  BTCUSDT:  { name: 'Bitcoin',     color: '#f7931a' },
  ETHUSDT:  { name: 'Ethereum',    color: '#627eea' },
  SOLUSDT:  { name: 'Solana',      color: '#9945ff' },
  DOGEUSDT: { name: 'Dogecoin',    color: '#c2a633' },
  ADAUSDT:  { name: 'Cardano',     color: '#0033ad' },
  XRPUSDT:  { name: 'XRP',        color: '#346aa9' },
  SUIUSDT:  { name: 'SUI',        color: '#4da2ff' },
  AVAXUSDT: { name: 'Avalanche',   color: '#e84142' },
  PAXGUSDT: { name: 'PAX Gold',    color: '#c9ae61' },
  HYPEUSDT: { name: 'Hyperliquid', color: '#00d4ff' },
};

const REFRESH_INTERVAL = 60; // secondes

function signalColor(signal) {
  if (signal === 'ACHETER') return 'var(--green)';
  if (signal === 'VENDRE')  return 'var(--red)';
  return 'var(--text-muted)';
}

function ScoreBar({ score }) {
  const max = 15;
  const pct = Math.min(Math.abs(score) / max * 100, 100);
  const color = score > 3 ? 'var(--green)' : score < -3 ? 'var(--red)' : 'var(--text-muted)';
  return (
    <div className="score-bar-wrap">
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color, marginLeft: score < 0 ? `${50 - pct/2}%` : '50%' }} />
        <div className="score-bar-mid" />
      </div>
      <span className="score-bar-val" style={{ color }}>{score > 0 ? '+' : ''}{score}</span>
    </div>
  );
}

export default function ScanTab({ onCoinSelect, coins }) {
  const [interval, setInterval] = useState('1h');
  const [filter,   setFilter]   = useState('all');
  const [sortCol,  setSortCol]  = useState('netScore');
  const [sortDir,  setSortDir]  = useState('desc');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const timerRef = useRef(null);

  const scan = useCallback(async (iv = interval) => {
    setLoading(true);
    try {
      const res = await api.get(`/scan?interval=${iv}`);
      setData(res);
      setCountdown(REFRESH_INTERVAL);
    } catch (e) {
      console.error('Scan error:', e);
    } finally {
      setLoading(false);
    }
  }, [interval]);

  // Scan au chargement + quand l'intervalle change
  useEffect(() => { scan(); }, [scan]);

  // Countdown + auto-refresh
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { scan(); return REFRESH_INTERVAL; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [scan]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const applyFilter = (rows) => {
    switch (filter) {
      case 'buy':      return rows.filter(r => r.signal === 'ACHETER');
      case 'sell':     return rows.filter(r => r.signal === 'VENDRE');
      case 'rsi_low':  return rows.filter(r => r.rsi != null && r.rsi < 35);
      case 'rsi_high': return rows.filter(r => r.rsi != null && r.rsi > 65);
      default:         return rows;
    }
  };

  const applySort = (rows) => {
    return [...rows].sort((a, b) => {
      let av = a[sortCol], bv = b[sortCol];
      if (sortCol === 'netScore') { av = Math.abs(av); bv = Math.abs(bv); }
      if (av == null) return 1; if (bv == null) return -1;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  };

  const rows = data ? applySort(applyFilter(data.rows)) : [];

  const SortIcon = ({ col }) => sortCol === col
    ? (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)
    : null;

  const handleRowClick = (symbol) => {
    const coin = coins?.find(c => c.id === symbol);
    if (coin) onCoinSelect(coin);
  };

  return (
    <div className="scan-tab">

      {/* Header */}
      <div className="scan-header">
        <div className="scan-header-left">
          <Search size={13} color="var(--accent)" />
          <span className="scan-title">Scan de marché</span>
          {data && (
            <span className="scan-subtitle">
              {data.rows.length} coins · mis à jour {new Date(data.scannedAt).toLocaleTimeString('fr-FR')}
            </span>
          )}
        </div>
        <div className="scan-header-right">
          {/* Filtre */}
          <div className="scan-filters">
            {FILTERS.map(f => (
              <button key={f.v} className={`scan-filter-btn ${filter === f.v ? 'active' : ''}`} onClick={() => setFilter(f.v)}>
                {f.Icon && <f.Icon size={10} />}{f.l}
              </button>
            ))}
          </div>
          {/* Intervalle */}
          <div className="scan-intervals">
            {INTERVALS.map(i => (
              <button key={i.v} className={`scan-interval-btn ${interval === i.v ? 'active' : ''}`} onClick={() => setInterval(i.v)}>{i.l}</button>
            ))}
          </div>
          {/* Refresh */}
          <button className="scan-refresh-btn" onClick={() => scan()} disabled={loading} title="Rafraîchir">
            <RefreshCw size={12} className={loading ? 'spin' : ''} />
            <span className="scan-countdown">{countdown}s</span>
          </button>
        </div>
      </div>

      {/* Loading initial */}
      {!data && loading && (
        <div className="scan-loading"><div className="spinner" /><span>Analyse de {10} coins en cours...</span></div>
      )}

      {/* Tableau */}
      {rows.length > 0 && (
        <div className="scan-table-wrap">
          <table className="scan-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Coin</th>
                <th className="sortable" onClick={() => handleSort('price')}>Prix <SortIcon col="price" /></th>
                <th className="sortable" onClick={() => handleSort('change')}>24h% <SortIcon col="change" /></th>
                <th>Signal</th>
                <th className="sortable" onClick={() => handleSort('netScore')}>Score <SortIcon col="netScore" /></th>
                <th className="sortable" onClick={() => handleSort('rsi')}>RSI <SortIcon col="rsi" /></th>
                <th className="sortable" onClick={() => handleSort('macdHisto')}>MACD <SortIcon col="macdHisto" /></th>
                <th className="sortable" onClick={() => handleSort('adx')}>ADX <SortIcon col="adx" /></th>
                <th>OBV</th>
                <th>Tendance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const meta = COIN_META[r.symbol] ?? {};
                const signCol = signalColor(r.signal);
                const rsiCol  = r.rsi > 70 ? 'var(--red)' : r.rsi < 30 ? 'var(--green)' : 'var(--text-primary)';
                return (
                  <tr key={r.symbol} className="scan-row" onClick={() => handleRowClick(r.symbol)}>
                    <td className="scan-rank">{i + 1}</td>
                    <td className="scan-coin">
                      <span className="scan-coin-icon" style={{ background: (meta.color ?? '#7a92a8') + '22', color: meta.color ?? '#7a92a8', border: `1px solid ${meta.color ?? '#7a92a8'}44` }}>{r.symbol.replace('USDT','').slice(0,2)}</span>
                      <div>
                        <span className="scan-coin-sym">{r.symbol.replace('USDT', '')}</span>
                        <span className="scan-coin-name">{meta.name}</span>
                      </div>
                    </td>
                    <td className="mono scan-price">
                      {r.price != null ? `$${Number(r.price).toLocaleString('en-US', { maximumFractionDigits: r.price < 1 ? 4 : 2 })}` : '—'}
                    </td>
                    <td className={r.change >= 0 ? 'pos mono' : 'neg mono'}>
                      {r.change != null ? `${r.change >= 0 ? '+' : ''}${Number(r.change).toFixed(2)}%` : '—'}
                    </td>
                    <td>
                      <span className="scan-signal-badge" style={{ color: signCol, borderColor: signCol + '50', background: signCol + '15' }}>
                        {r.signal === 'ACHETER' ? <TrendingUp size={10} /> : r.signal === 'VENDRE' ? <TrendingDown size={10} /> : <Minus size={10} />}
                        {r.signal}
                      </span>
                    </td>
                    <td><ScoreBar score={r.netScore} /></td>
                    <td style={{ color: rsiCol }} className="mono">{r.rsi != null ? Number(r.rsi).toFixed(1) : '—'}</td>
                    <td className={r.macdHisto > 0 ? 'pos mono' : r.macdHisto < 0 ? 'neg mono' : 'mono'}>
                      {r.macdHisto != null ? (r.macdHisto >= 0 ? '+' : '') + Number(r.macdHisto).toFixed(4) : '—'}
                    </td>
                    <td className="mono" style={{ color: r.adx > 25 ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {r.adx != null ? Number(r.adx).toFixed(1) : '—'}
                    </td>
                    <td className={r.obvTrend === 'up' ? 'pos' : 'neg'} style={{ fontSize: 11 }}>
                      {r.obvTrend === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    </td>
                    <td style={{ fontSize: 10 }}>
                      <span style={{ color: r.goldenCross ? 'var(--green)' : 'var(--red)', marginRight: 4 }}>
                        {r.goldenCross ? 'Golden' : 'Death'}
                      </span>
                      <span style={{ color: r.aboveCloud ? 'var(--green)' : 'var(--red)' }}>
                        {r.aboveCloud ? '☁️↑' : '☁️↓'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && rows.length === 0 && (
        <div className="scan-loading">
          <Zap size={24} color="var(--text-muted)" />
          <span>Aucun coin ne correspond au filtre</span>
        </div>
      )}

      <style>{`
        .scan-tab { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: var(--bg-primary); }

        .scan-header {
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;
          padding: 10px 14px; border-bottom: 1px solid var(--border);
          background: var(--bg-secondary); flex-shrink: 0;
        }
        .scan-header-left { display: flex; align-items: center; gap: 8px; }
        .scan-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .scan-title { font-size: 12px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
        .scan-subtitle { font-size: 10px; color: var(--text-muted); }

        .scan-filters { display: flex; gap: 2px; }
        .scan-filter-btn { padding: 3px 8px; font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); border: 1px solid var(--border); border-radius: 4px; background: transparent; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .scan-filter-btn.active { color: var(--accent); border-color: rgba(0,212,255,0.4); background: var(--accent-dim); }
        .scan-filter-btn:hover:not(.active) { color: var(--text-primary); background: var(--bg-hover); }

        .scan-intervals { display: flex; gap: 2px; }
        .scan-interval-btn { padding: 3px 7px; font-size: 10px; font-family: var(--font-mono); font-weight: 600; color: var(--text-muted); border: 1px solid var(--border); border-radius: 4px; background: transparent; cursor: pointer; transition: all 0.15s; }
        .scan-interval-btn.active { color: var(--accent); border-color: rgba(0,212,255,0.4); background: var(--accent-dim); }

        .scan-refresh-btn { display: flex; align-items: center; gap: 5px; padding: 4px 8px; font-size: 10px; color: var(--text-muted); border: 1px solid var(--border); border-radius: 4px; background: transparent; cursor: pointer; transition: all 0.15s; }
        .scan-refresh-btn:hover:not(:disabled) { color: var(--accent); }
        .scan-refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .scan-countdown { font-family: var(--font-mono); font-size: 10px; }
        .spin { animation: spin 1s linear infinite; }

        .scan-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; color: var(--text-muted); font-size: 13px; }

        .scan-table-wrap { flex: 1; overflow: auto; }
        .scan-table { width: 100%; border-collapse: collapse; }
        .scan-table thead { position: sticky; top: 0; background: var(--bg-secondary); z-index: 10; }
        .scan-table th { padding: 8px 12px; font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
        .scan-table th.sortable { cursor: pointer; user-select: none; display: flex; align-items: center; gap: 3px; }
        .scan-table th.sortable:hover { color: var(--accent); }
        .scan-table td { padding: 9px 12px; font-size: 11px; border-bottom: 1px solid rgba(30,45,61,0.5); vertical-align: middle; }
        .scan-row { cursor: pointer; transition: background 0.12s; }
        .scan-row:hover { background: var(--bg-hover); }
        .scan-row:hover .scan-coin-sym { color: var(--accent); }

        .scan-rank { color: var(--text-muted); font-size: 10px; font-family: var(--font-mono); width: 28px; }
        .scan-coin { display: flex; align-items: center; gap: 8px; }
        .scan-coin-icon { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; font-family: var(--font-mono); flex-shrink: 0; }
        .scan-coin-sym { display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); transition: color 0.15s; }
        .scan-coin-name { display: block; font-size: 9px; color: var(--text-muted); }
        .scan-price { font-weight: 600; }

        .scan-signal-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 10px; border: 1px solid; font-size: 10px; font-weight: 700; font-family: var(--font-mono); white-space: nowrap; }

        .score-bar-wrap { display: flex; align-items: center; gap: 6px; min-width: 100px; }
        .score-bar-track { flex: 1; height: 4px; background: var(--bg-card); border-radius: 2px; position: relative; overflow: hidden; }
        .score-bar-fill { height: 100%; border-radius: 2px; }
        .score-bar-mid { position: absolute; left: 50%; top: 0; width: 1px; height: 100%; background: var(--border); }
        .score-bar-val { font-size: 10px; font-family: var(--font-mono); font-weight: 700; min-width: 24px; text-align: right; }

        @media (max-width: 900px) {
          .scan-table th:nth-child(n+8), .scan-table td:nth-child(n+8) { display: none; }
          .scan-filters { display: none; }
        }
        @media (max-width: 600px) {
          .scan-table th:nth-child(n+6), .scan-table td:nth-child(n+6) { display: none; }
        }
      `}</style>
    </div>
  );
}
