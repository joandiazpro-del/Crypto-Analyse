import React, { useState, useEffect, useRef } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { History, Play, TrendingUp, TrendingDown, Target, AlertTriangle, Download } from 'lucide-react';
import { api } from '../../utils/api';

const PERIODS   = [{ v:'1w',label:'1 Sem'},{v:'1m',label:'1 Mois'},{v:'3m',label:'3 Mois'},{v:'6m',label:'6 Mois'}];
const INTERVALS = [{ v:'1h',label:'1H'},{v:'4h',label:'4H'},{v:'1d',label:'1J'}];
const COINS     = ['BTCUSDT','ETHUSDT','SOLUSDT','DOGEUSDT','ADAUSDT','XRPUSDT','SUIUSDT','AVAXUSDT','HYPEUSDT'];

function MetricCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="bt-metric">
      <div className="bt-metric-label">{Icon && <Icon size={10} />}{label}</div>
      <div className="bt-metric-value" style={{ color: color ?? 'var(--text-primary)' }}>{value}</div>
      {sub && <div className="bt-metric-sub">{sub}</div>}
    </div>
  );
}

function fmt(n, decimals = 2) {
  if (n == null) return '—';
  return Number(n).toFixed(decimals);
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Chart avec marqueurs d'entrée/sortie
function BacktestChart({ klines, trades }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !klines?.length) return;
    const chart = createChart(containerRef.current, {
      layout:    { background: { color: '#080b0f' }, textColor: '#7a92a8', fontSize: 10, fontFamily: "'Space Mono', monospace" },
      grid:      { vertLines: { color: '#0e1318' }, horzLines: { color: '#0e1318' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#1e2d3d' },
      timeScale: { borderColor: '#1e2d3d', timeVisible: true },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const candles = chart.addCandlestickSeries({
      upColor: '#00e676', downColor: '#ff4757',
      borderUpColor: '#00e676', borderDownColor: '#ff4757',
      wickUpColor: '#00a854', wickDownColor: '#cc2233',
    });
    candles.setData(klines.map(k => ({ time: k.time, open: k.open, high: k.high, low: k.low, close: k.close })));

    // Marqueurs entrées/sorties
    const markers = [];
    trades?.forEach(t => {
      markers.push({
        time:     Math.floor(t.entryTime / 1000),
        position: 'belowBar', color: '#00d4ff',
        shape:    'arrowUp', text: `IN $${Number(t.entryPrice).toFixed(2)}`
      });
      markers.push({
        time:     Math.floor(t.exitTime / 1000),
        position: 'aboveBar',
        color:    t.isWin ? '#00e676' : '#ff4757',
        shape:    'arrowDown',
        text:     `OUT ${t.pnl >= 0 ? '+' : ''}${t.pnl}%`
      });
    });
    markers.sort((a, b) => a.time - b.time);
    candles.setMarkers(markers);

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); chart.remove(); };
  }, [klines, trades]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

export default function BacktestTab({ selectedCoin }) {
  const [symbol,   setSymbol]   = useState(selectedCoin?.id ?? 'BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [period,   setPeriod]   = useState('1m');
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Met à jour le symbole quand on change de coin dans la watchlist
  useEffect(() => { if (selectedCoin?.id) setSymbol(selectedCoin.id); }, [selectedCoin]);

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await api.post('/backtest', { symbol, interval, period });
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.error ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!result?.trades?.length) return;
    const header = 'Entrée,Prix entrée,Sortie,Prix sortie,P&L %,P&L USD,Durée,Résultat';
    const rows   = result.trades.map(t =>
      `${fmtDate(t.entryTime)},${t.entryPrice},${fmtDate(t.exitTime)},${t.exitPrice},${t.pnl},${t.pnlUSD},${t.duration},${t.isWin?'Gain':'Perte'}`
    );
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `backtest_${symbol}_${period}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const m = result?.metrics;

  return (
    <div className="bt-tab">

      {/* Contrôles */}
      <div className="bt-controls">
        <div className="bt-controls-left">
          <div className="bt-select-group">
            <label>Coin</label>
            <select value={symbol} onChange={e => setSymbol(e.target.value)}>
              {COINS.map(c => <option key={c} value={c}>{c.replace('USDT','')}</option>)}
            </select>
          </div>
          <div className="bt-select-group">
            <label>Intervalle</label>
            <div className="bt-btn-group">
              {INTERVALS.map(i => (
                <button key={i.v} className={`bt-period-btn ${interval===i.v?'active':''}`} onClick={() => setInterval(i.v)}>{i.label}</button>
              ))}
            </div>
          </div>
          <div className="bt-select-group">
            <label>Période</label>
            <div className="bt-btn-group">
              {PERIODS.map(p => (
                <button key={p.v} className={`bt-period-btn ${period===p.v?'active':''}`} onClick={() => setPeriod(p.v)}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="bt-controls-right">
          <div className="bt-strategy-info">
            <span>Stratégie : </span>
            <span style={{ color: 'var(--accent)' }}>EMA 9/21 crossover + RSI filter</span>
          </div>
          <button className="bt-run-btn" onClick={run} disabled={loading}>
            {loading ? <><div className="spinner" style={{width:12,height:12,borderWidth:1.5}}/> Calcul...</>
                     : <><Play size={12}/> Lancer le backtest</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="bt-error"><AlertTriangle size={13} /> {error}</div>
      )}

      {/* État initial */}
      {!result && !loading && !error && (
        <div className="bt-empty">
          <History size={36} color="var(--accent)" strokeWidth={1.5} />
          <p>Configure les paramètres et lance le backtest</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Stratégie EMA 9/21 — capital simulé $10 000</p>
        </div>
      )}

      {result && m && (
        <div className="bt-results">

          {/* Métriques */}
          <div className="bt-metrics">
            <MetricCard label="Rendement total" icon={TrendingUp}
              value={`${m.totalReturn >= 0 ? '+' : ''}${m.totalReturn}%`}
              sub={`${m.totalReturn >= 0 ? '+' : ''}$${m.totalReturnUSD}`}
              color={m.totalReturn >= 0 ? 'var(--green)' : 'var(--red)'}
            />
            <MetricCard label="Win Rate"
              value={`${m.winRate}%`}
              sub={`${m.wins}W / ${m.losses}L sur ${m.totalTrades} trades`}
              color={m.winRate >= 50 ? 'var(--green)' : 'var(--red)'}
            />
            <MetricCard label="Max Drawdown" icon={TrendingDown}
              value={`-${m.maxDrawdown}%`}
              color={m.maxDrawdown > 15 ? 'var(--red)' : m.maxDrawdown > 8 ? 'var(--yellow)' : 'var(--green)'}
            />
            <MetricCard label="Profit Factor" icon={Target}
              value={m.profitFactor === Infinity ? '∞' : m.profitFactor}
              sub={m.profitFactor >= 1.5 ? 'Bon' : m.profitFactor >= 1 ? 'Neutre' : 'Négatif'}
              color={m.profitFactor >= 1.5 ? 'var(--green)' : m.profitFactor >= 1 ? 'var(--yellow)' : 'var(--red)'}
            />
            <MetricCard label="Sharpe Ratio"
              value={m.sharpe}
              sub={m.sharpe >= 1 ? 'Bon' : m.sharpe >= 0 ? 'Faible' : 'Négatif'}
              color={m.sharpe >= 1 ? 'var(--green)' : m.sharpe >= 0 ? 'var(--yellow)' : 'var(--red)'}
            />
            <MetricCard label="vs Buy & Hold"
              value={`${m.buyHoldReturn >= 0 ? '+' : ''}${m.buyHoldReturn}%`}
              sub={m.totalReturn > m.buyHoldReturn ? '✓ Stratégie gagne' : '✗ Buy&Hold gagne'}
              color={m.totalReturn > m.buyHoldReturn ? 'var(--green)' : 'var(--red)'}
            />
            <MetricCard label="Meilleur trade"
              value={`+${m.bestTrade}%`} color="var(--green)"
            />
            <MetricCard label="Pire trade"
              value={`${m.worstTrade}%`} color="var(--red)"
            />
          </div>

          {/* Chart + Table */}
          <div className="bt-body">
            <div className="bt-chart-wrap">
              <BacktestChart klines={result.klines} trades={result.trades} />
            </div>

            <div className="bt-trades-panel">
              <div className="bt-trades-header">
                <span>Trades ({result.trades.length})</span>
                <button className="bt-export-btn" onClick={exportCSV} title="Exporter CSV">
                  <Download size={12} /> CSV
                </button>
              </div>
              <div className="bt-trades-list">
                {result.trades.length === 0 && (
                  <div className="bt-no-trades">Aucun trade généré sur cette période</div>
                )}
                {result.trades.map((t, i) => (
                  <div key={i} className={`bt-trade-row ${t.isWin ? 'win' : 'loss'}`}>
                    <div className="bt-trade-num">#{i + 1}</div>
                    <div className="bt-trade-info">
                      <div className="bt-trade-prices">
                        <span className="bt-trade-entry">IN ${Number(t.entryPrice).toFixed(2)}</span>
                        <span className="bt-trade-arrow">→</span>
                        <span className="bt-trade-exit">OUT ${Number(t.exitPrice).toFixed(2)}</span>
                      </div>
                      <div className="bt-trade-meta">{t.duration} · {fmtDate(t.entryTime)}</div>
                    </div>
                    <div className={`bt-trade-pnl ${t.isWin ? 'pos' : 'neg'}`}>
                      {t.pnl >= 0 ? '+' : ''}{t.pnl}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .bt-tab { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: var(--bg-primary); }

        /* Contrôles */
        .bt-controls {
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
          padding: 10px 14px; border-bottom: 1px solid var(--border);
          background: var(--bg-secondary); flex-shrink: 0;
        }
        .bt-controls-left  { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .bt-controls-right { display: flex; align-items: center; gap: 12px; }
        .bt-select-group { display: flex; align-items: center; gap: 6px; }
        .bt-select-group label { font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; white-space: nowrap; }
        .bt-select-group select {
          padding: 4px 8px; background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 4px; color: var(--text-primary); font-size: 11px; font-family: var(--font-mono);
        }
        .bt-btn-group { display: flex; gap: 2px; }
        .bt-period-btn {
          padding: 4px 9px; font-size: 10px; font-family: var(--font-mono); font-weight: 600;
          color: var(--text-muted); border: 1px solid var(--border); border-radius: 4px;
          background: transparent; cursor: pointer; transition: all 0.15s;
        }
        .bt-period-btn.active { color: var(--accent); background: var(--accent-dim); border-color: rgba(0,212,255,0.4); }
        .bt-period-btn:hover:not(.active) { color: var(--text-primary); background: var(--bg-hover); }
        .bt-strategy-info { font-size: 10px; color: var(--text-muted); white-space: nowrap; }
        .bt-run-btn {
          display: flex; align-items: center; gap: 6px; padding: 7px 16px;
          font-size: 12px; font-weight: 700; font-family: var(--font-mono);
          color: var(--bg-primary); background: var(--accent); border-radius: var(--radius);
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .bt-run-btn:hover:not(:disabled) { background: #00bcd4; }
        .bt-run-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .bt-error { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(255,71,87,0.1); border-bottom: 1px solid rgba(255,71,87,0.3); color: var(--red); font-size: 12px; }
        .bt-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; color: var(--text-secondary); font-size: 13px; }

        /* Résultats */
        .bt-results { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }

        /* Métriques */
        .bt-metrics {
          display: grid; grid-template-columns: repeat(8, 1fr); gap: 0;
          border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
        .bt-metric {
          padding: 10px 12px; border-right: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 3px;
        }
        .bt-metric:last-child { border-right: none; }
        .bt-metric-label { display: flex; align-items: center; gap: 4px; font-size: 9px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .bt-metric-value { font-size: 16px; font-weight: 700; font-family: var(--font-mono); }
        .bt-metric-sub { font-size: 9px; color: var(--text-muted); }

        /* Corps */
        .bt-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 280px; }
        .bt-chart-wrap { position: relative; overflow: hidden; }

        /* Trades */
        .bt-trades-panel { display: flex; flex-direction: column; border-left: 1px solid var(--border); overflow: hidden; background: var(--bg-secondary); }
        .bt-trades-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid var(--border); font-size: 11px; font-weight: 600; color: var(--text-muted); flex-shrink: 0; }
        .bt-export-btn { display: flex; align-items: center; gap: 4px; padding: 3px 8px; font-size: 10px; color: var(--accent); border: 1px solid rgba(0,212,255,0.3); border-radius: 4px; background: var(--accent-dim); cursor: pointer; transition: all 0.15s; }
        .bt-export-btn:hover { background: rgba(0,212,255,0.2); }
        .bt-trades-list { overflow-y: auto; flex: 1; }
        .bt-no-trades { padding: 20px; text-align: center; color: var(--text-muted); font-size: 12px; }
        .bt-trade-row {
          display: flex; align-items: center; gap: 8px; padding: 7px 10px;
          border-bottom: 1px solid var(--border); transition: background 0.1s;
        }
        .bt-trade-row:hover { background: var(--bg-hover); }
        .bt-trade-row.win  { border-left: 2px solid var(--green); }
        .bt-trade-row.loss { border-left: 2px solid var(--red); }
        .bt-trade-num { font-size: 9px; color: var(--text-muted); font-family: var(--font-mono); min-width: 20px; }
        .bt-trade-info { flex: 1; min-width: 0; }
        .bt-trade-prices { display: flex; align-items: center; gap: 4px; font-size: 10px; font-family: var(--font-mono); }
        .bt-trade-entry { color: var(--accent); }
        .bt-trade-arrow { color: var(--text-muted); }
        .bt-trade-exit  { color: var(--text-primary); }
        .bt-trade-meta  { font-size: 9px; color: var(--text-muted); margin-top: 1px; }
        .bt-trade-pnl   { font-size: 12px; font-weight: 700; font-family: var(--font-mono); min-width: 50px; text-align: right; }

        /* Responsive */
        @media (max-width: 900px) {
          .bt-metrics { grid-template-columns: repeat(4, 1fr); }
          .bt-body { grid-template-columns: 1fr; }
          .bt-trades-panel { border-left: none; border-top: 1px solid var(--border); max-height: 280px; }
          .bt-chart-wrap { min-height: 300px; }
        }
        @media (max-width: 600px) {
          .bt-metrics { grid-template-columns: repeat(2, 1fr); }
          .bt-controls { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
