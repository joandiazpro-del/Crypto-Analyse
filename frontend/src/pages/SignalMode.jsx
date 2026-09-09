import React, { useState, useEffect } from 'react';
import { Play, Shield, Scale, Flame, Skull, TrendingUp, TrendingDown, Minus, ChevronRight, LayoutDashboard, Users, Zap, AlertTriangle, ArrowDown, ArrowUp, Search } from 'lucide-react';
import { api } from '../utils/api';
import MarketScanner from '../components/MarketScanner';

const COINS = [
  { id: 'BTCUSDT',  name: 'Bitcoin',     symbol: 'BTC',  color: '#f7931a' },
  { id: 'ETHUSDT',  name: 'Ethereum',    symbol: 'ETH',  color: '#627eea' },
  { id: 'SOLUSDT',  name: 'Solana',      symbol: 'SOL',  color: '#9945ff' },
  { id: 'HYPEUSDT', name: 'Hyperliquid', symbol: 'HYPE', color: '#00d4ff' },
  { id: 'DOGEUSDT', name: 'Dogecoin',    symbol: 'DOGE', color: '#c2a633' },
  { id: 'ADAUSDT',  name: 'Cardano',     symbol: 'ADA',  color: '#0033ad' },
  { id: 'XRPUSDT',  name: 'XRP',         symbol: 'XRP',  color: '#346aa9' },
  { id: 'SUIUSDT',  name: 'SUI',         symbol: 'SUI',  color: '#4da2ff' },
  { id: 'AVAXUSDT', name: 'Avalanche',   symbol: 'AVAX', color: '#e84142' },
  { id: 'PAXGUSDT', name: 'PAX Gold',    symbol: 'PAXG', color: '#c9ae61' },
];

const PROFILES = [
  { id: 'conservative', label: 'Conservateur', Icon: Shield, color: '#00d4ff' },
  { id: 'moderate',     label: 'Modéré',       Icon: Scale,  color: '#00e676' },
  { id: 'aggressive',   label: 'Agressif',     Icon: Flame,  color: '#ff9f43' },
  { id: 'extreme',      label: 'Extrême',      Icon: Skull,  color: '#ff4757' },
];

const SIGNAL_CONFIG = {
  LONG:       { word: 'LONG',      color: '#00e676', bg: 'rgba(0,230,118,0.08)', Icon: TrendingUp,   isShort: false, strong: false },
  SHORT:      { word: 'SHORT',     color: '#ff4757', bg: 'rgba(255,71,87,0.08)', Icon: TrendingDown, isShort: true,  strong: false },
  ATTENDRE:   { word: 'ATTENDS',   color: '#ffc107', bg: 'rgba(255,193,7,0.08)', Icon: Minus,        isShort: null,  strong: false },
  LONG_FORT:  { word: 'LONG',      color: '#00ff88', bg: 'rgba(0,255,136,0.10)', Icon: TrendingUp,   isShort: false, strong: true  },
  SHORT_FORT: { word: 'SHORT',     color: '#ff2244', bg: 'rgba(255,34,68,0.10)', Icon: TrendingDown, isShort: true,  strong: true  },
  // rétrocompatibilité
  ACHETER:    { word: 'LONG',      color: '#00e676', bg: 'rgba(0,230,118,0.08)', Icon: TrendingUp,   isShort: false, strong: false },
  VENDRE:     { word: 'SHORT',     color: '#ff4757', bg: 'rgba(255,71,87,0.08)', Icon: TrendingDown, isShort: true,  strong: false },
  NEUTRE:     { word: 'ATTENDS',   color: '#ffc107', bg: 'rgba(255,193,7,0.08)', Icon: Minus,        isShort: null,  strong: false },
};

function fmt(n) {
  if (n == null) return '—';
  const v = Number(n);
  if (v >= 1000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (v >= 1)    return `$${v.toFixed(3)}`;
  return `$${v.toFixed(6)}`;
}

export default function SignalMode({ onSwitchPro, selectedCoin: defaultCoin, riskProfile: defaultProfile }) {
  const [screen,      setScreen]      = useState('signal'); // 'signal' | 'scanner'
  const [coin,        setCoin]        = useState(defaultCoin?.id ?? 'BTCUSDT');
  const [profile,     setProfile]     = useState(defaultProfile ?? 'moderate');
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [tickers,     setTickers]     = useState({});

  // Charger les prix live
  useEffect(() => {
    api.get('/tickers').then(data => {
      const map = {};
      data.forEach(t => { map[t.symbol] = t; });
      setTickers(map);
    }).catch(() => {});
  }, []);

  const analyze = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const [indicators, ticker, fundingRate, openInterest] = await Promise.all([
        api.get(`/indicators/${coin}?interval=1h`),
        Promise.resolve(tickers[coin] ?? {}),
        api.get(`/funding/${coin}`).catch(() => ({})),
        api.get(`/openinterest/${coin}`).catch(() => ({})),
      ]);
      const data = await api.post('/ai/analyze', {
        symbol: coin, interval: '1h', riskProfile: profile,
        marketData: { indicators, ticker, fundingRate, openInterest }
      });
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.error ?? e.message ?? 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const a    = result?.analysis;
  const sc   = a ? (SIGNAL_CONFIG[a.signal] ?? SIGNAL_CONFIG.NEUTRE) : null;
  const prof = PROFILES.find(p => p.id === profile);
  const coinMeta = COINS.find(c => c.id === coin);
  const ticker = tickers[coin];

  // 3 lignes max d'explication
  const lines = a ? [
    a.philosophy,
    a.bullishPoints?.[0] ? `Haussier : ${a.bullishPoints[0]}` : null,
    a.bearishPoints?.[0] ? `Baissier : ${a.bearishPoints[0]}` : null,
  ].filter(Boolean).slice(0, 3) : [];

  return (
    <div className="signal-mode">

      {/* Sélecteurs */}
      <div className="signal-controls">

        {/* Coins */}
        <div className="signal-coins">
          {COINS.map(c => (
            <button
              key={c.id}
              className={`signal-coin-btn ${coin === c.id ? 'active' : ''}`}
              style={coin === c.id ? { borderColor: c.color, color: c.color, background: c.color + '18' } : {}}
              onClick={() => { setCoin(c.id); setResult(null); }}
            >
              <span className="signal-coin-badge" style={{ background: c.color + '22', color: c.color, border: `1px solid ${c.color}44` }}>
                {c.symbol.slice(0, 2)}
              </span>
              <span className="signal-coin-sym">{c.symbol}</span>
              {tickers[c.id]?.price != null && (
                <span className="signal-coin-price" style={{ color: (tickers[c.id]?.change ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {tickers[c.id].change != null ? `${tickers[c.id].change >= 0 ? '+' : ''}${Number(tickers[c.id].change).toFixed(1)}%` : ''}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Profils + Analyser + Scanner */}
        <div className="signal-bottom-controls">
          <div className="signal-profiles">
            {PROFILES.map(p => (
              <button
                key={p.id}
                className={`signal-profile-btn ${profile === p.id ? 'active' : ''}`}
                style={profile === p.id ? { borderColor: p.color, color: p.color, background: p.color + '18' } : {}}
                onClick={() => { setProfile(p.id); setResult(null); }}
              >
                <p.Icon size={14} />
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          <div className="signal-action-btns">
            <button
              className={`signal-screen-toggle-btn ${screen === 'scanner' ? 'active-scan' : ''}`}
              onClick={() => setScreen(s => s === 'scanner' ? 'signal' : 'scanner')}
            >
              <Search size={14} />
              <span>{screen === 'scanner' ? 'Signal' : 'Scanner'}</span>
            </button>
            {screen === 'signal' && (
              <button className="signal-analyze-btn" onClick={analyze} disabled={loading}>
                {loading
                  ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Analyse...</>
                  : <><Play size={16} /> Analyser</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scanner */}
      {screen === 'scanner' && (
        <div className="signal-result-area" style={{ alignItems: 'flex-start', padding: 0 }}>
          <MarketScanner
            riskProfile={profile}
            profileLabel={PROFILES.find(p => p.id === profile)?.label ?? profile}
            onSelectCoin={(coinId) => {
              setCoin(coinId);
              setResult(null);
              setScreen('signal');
            }}
          />
        </div>
      )}

      {/* Résultat Signal */}
      <div className="signal-result-area" style={{ display: screen === 'scanner' ? 'none' : undefined }}>
        {!result && !loading && !error && (
          <div className="signal-empty">
            <div className="signal-empty-coin" style={{ borderColor: coinMeta?.color + '44', color: coinMeta?.color }}>
              {coinMeta?.symbol.slice(0, 2)}
            </div>
            <div className="signal-empty-name">{coinMeta?.name}</div>
            {ticker?.price != null && (
              <div className="signal-empty-price">{fmt(ticker.price)}</div>
            )}
            <div className="signal-empty-hint">Sélectionne un profil et lance l'analyse</div>
          </div>
        )}

        {error && (
          <div className="signal-error">{error}</div>
        )}

        {loading && (
          <div className="signal-loading">
            <div className="signal-loading-spinner">
              <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            </div>
            <div className="signal-loading-text">Claude analyse {coinMeta?.name}...</div>
            <div className="signal-loading-sub">Mode {prof?.label} — {prof?.label === 'Modéré' ? 'Minervini' : prof?.label === 'Conservateur' ? 'Weinstein' : prof?.label === 'Agressif' ? 'Tudor Jones' : 'Burry'}</div>
          </div>
        )}

        {a && sc && (
          <div className="signal-decision" style={{ background: sc.bg, borderColor: sc.color + '40', boxShadow: sc.strong ? `0 0 32px ${sc.color}25` : 'none' }}>

            {/* Alerte SHORT SQUEEZE */}
            {a.shortSetup?.squeezeRisk === 'élevé' && (
              <div className="signal-squeeze-alert">
                <AlertTriangle size={14} />
                <span>Risque de Short Squeeze ÉLEVÉ{coinMeta?.symbol === 'HYPE' ? ' — HYPE très volatil' : ''}</span>
              </div>
            )}

            {/* Signal principal */}
            <div className={`signal-word ${sc.strong ? 'signal-word-strong' : ''}`} style={{ color: sc.color }}>
              <sc.Icon size={48} strokeWidth={2.5} />
              {sc.word}
              {sc.strong && <Zap size={32} style={{ marginLeft: -8 }} />}
            </div>
            {sc.strong && (
              <div className="signal-fort-badge" style={{ color: sc.color, borderColor: sc.color + '60', background: sc.color + '15' }}>
                Setup Exceptionnel — Haute Conviction
              </div>
            )}

            {/* Trader ref */}
            <div className="signal-trader" style={{ borderColor: prof?.color + '40', color: prof?.color }}>
              <Users size={13} />
              Analyse à la {a.traderStyle}
            </div>

            {/* Coin + confiance */}
            <div className="signal-meta">
              <span className="signal-meta-coin" style={{ color: coinMeta?.color }}>{coinMeta?.name}</span>
              <span className="signal-meta-dot" />
              <span className="signal-meta-conf">Confiance <strong style={{ color: sc.color }}>{a.confidence}%</strong></span>
              <span className="signal-meta-dot" />
              <span className="signal-meta-rr" style={{ color: sc.color }}>{a.riskReward}</span>
            </div>

            {/* Niveaux */}
            {(a.stopLoss || a.takeProfit1) && (
              <div className="signal-levels">
                {sc.isShort && (
                  <div className="signal-short-banner">
                    <TrendingDown size={12} /> Position SHORT — TP vers le bas
                  </div>
                )}
                <div className="signal-level-row">
                  <span className="signal-level-label">Entrée</span>
                  <span className="signal-level-val">{ticker?.price != null ? fmt(ticker.price) : '—'}</span>
                </div>
                <div className="signal-level-row">
                  <span className="signal-level-label">
                    Stop Loss {sc.isShort ? <ArrowUp size={10} style={{ display: 'inline' }} /> : ''}
                  </span>
                  <span className="signal-level-val neg">{fmt(a.stopLoss)}</span>
                </div>
                <div className="signal-level-tps">
                  {[a.takeProfit1, a.takeProfit2, a.takeProfit3].map((tp, i) => tp != null && (
                    <div key={i} className="signal-tp">
                      <span className="signal-tp-label">
                        TP{i + 1} · 33% {sc.isShort ? <ArrowDown size={9} style={{ display: 'inline' }} /> : ''}
                      </span>
                      <span className="signal-tp-val" style={{ color: sc.isShort ? (i === 2 ? '#ff4757' : '#ff9f43') : 'var(--green)' }}>
                        {fmt(tp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3 lignes max */}
            <div className="signal-lines">
              {lines.map((line, i) => (
                <div key={i} className="signal-line">
                  <ChevronRight size={12} color={sc.color} style={{ flexShrink: 0 }} />
                  <span>{line}</span>
                </div>
              ))}
            </div>

            {/* Bouton Pro */}
            <button
              className="signal-pro-btn"
              onClick={() => onSwitchPro(COINS.find(c => c.id === coin))}
            >
              <LayoutDashboard size={13} />
              Voir l'analyse complète en Mode Pro
            </button>
          </div>
        )}
      </div>

      <style>{`
        .signal-mode {
          display: flex; flex-direction: column; height: 100%; overflow: hidden;
          background: var(--bg-primary);
        }

        /* Contrôles */
        .signal-controls {
          flex-shrink: 0; border-bottom: 1px solid var(--border);
          background: var(--bg-secondary); padding: 14px 20px; display: flex; flex-direction: column; gap: 12px;
        }

        /* Coins */
        .signal-coins { display: flex; gap: 6px; flex-wrap: wrap; }
        .signal-coin-btn {
          display: flex; align-items: center; gap: 6px; padding: 6px 10px;
          border: 1px solid var(--border); border-radius: var(--radius);
          color: var(--text-muted); background: transparent;
          cursor: pointer; transition: all 0.15s; font-size: 11px;
        }
        .signal-coin-btn:hover { color: var(--text-primary); background: var(--bg-hover); }
        .signal-coin-badge {
          width: 22px; height: 22px; border-radius: 4px; display: flex; align-items: center;
          justify-content: center; font-size: 8px; font-weight: 700; font-family: var(--font-mono);
        }
        .signal-coin-sym { font-weight: 700; font-family: var(--font-mono); font-size: 11px; }
        .signal-coin-price { font-size: 10px; font-family: var(--font-mono); }

        /* Bottom controls */
        .signal-bottom-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .signal-profiles { display: flex; gap: 6px; }
        .signal-profile-btn {
          display: flex; align-items: center; gap: 6px; padding: 7px 14px;
          border: 1px solid var(--border); border-radius: var(--radius);
          color: var(--text-muted); background: transparent;
          cursor: pointer; transition: all 0.15s; font-size: 12px; font-weight: 600;
        }
        .signal-profile-btn:hover { color: var(--text-primary); background: var(--bg-hover); }

        .signal-action-btns { display: flex; gap: 8px; align-items: center; }

        .signal-screen-toggle-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 16px; border: 1px solid var(--border); border-radius: var(--radius);
          color: var(--text-muted); background: transparent;
          font-size: 13px; font-weight: 600; font-family: var(--font-mono);
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .signal-screen-toggle-btn:hover { color: var(--accent); border-color: rgba(0,212,255,0.4); background: var(--accent-dim); }
        .signal-screen-toggle-btn.active-scan { color: var(--accent); border-color: rgba(0,212,255,0.5); background: var(--accent-dim); }

        .signal-analyze-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 28px; background: var(--accent); color: var(--bg-primary);
          border-radius: var(--radius); font-size: 14px; font-weight: 700;
          font-family: var(--font-mono); cursor: pointer; transition: all 0.15s;
          white-space: nowrap;
        }
        .signal-analyze-btn:hover:not(:disabled) { background: #00bcd4; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,212,255,0.3); }
        .signal-analyze-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* Zone résultat */
        .signal-result-area {
          flex: 1; min-height: 0; overflow-y: auto;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }

        /* Empty state */
        .signal-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .signal-empty-coin {
          width: 80px; height: 80px; border-radius: 16px; border: 2px solid;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; font-weight: 700; font-family: var(--font-mono);
        }
        .signal-empty-name  { font-size: 22px; font-weight: 700; color: var(--text-primary); }
        .signal-empty-price { font-size: 28px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
        .signal-empty-hint  { font-size: 13px; color: var(--text-muted); }

        .signal-error { font-size: 13px; color: var(--red); padding: 20px; text-align: center; }

        /* Loading */
        .signal-loading { display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .signal-loading-text { font-size: 18px; font-weight: 700; color: var(--text-primary); }
        .signal-loading-sub  { font-size: 12px; color: var(--text-muted); }

        /* Décision */
        .signal-decision {
          width: 100%; max-width: 600px; border: 1px solid; border-radius: 16px;
          padding: 32px; display: flex; flex-direction: column; align-items: center; gap: 20px;
        }

        .signal-squeeze-alert {
          width: 100%; display: flex; align-items: center; gap: 8px;
          background: rgba(255,71,87,0.12); border: 1px solid rgba(255,71,87,0.5);
          border-radius: var(--radius); padding: 8px 12px;
          color: #ff4757; font-size: 12px; font-weight: 700;
        }

        .signal-fort-badge {
          padding: 4px 14px; border-radius: 20px; border: 1px solid;
          font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .signal-short-banner {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; font-weight: 700; color: var(--red);
          text-transform: uppercase; letter-spacing: 0.05em;
          padding-bottom: 8px; border-bottom: 1px solid rgba(255,71,87,0.2);
          margin-bottom: 2px;
        }

        .signal-word {
          display: flex; align-items: center; gap: 16px;
          font-size: 72px; font-weight: 700; font-family: var(--font-mono); letter-spacing: -2px;
          line-height: 1;
        }
        .signal-word-strong {
          animation: signal-pulse 1.8s ease-in-out infinite;
        }
        @keyframes signal-pulse {
          0%, 100% { opacity: 1; filter: none; }
          50% { opacity: 0.85; filter: brightness(1.15); }
        }

        .signal-trader {
          display: flex; align-items: center; gap: 7px;
          padding: 6px 14px; border: 1px solid; border-radius: 20px;
          font-size: 12px; font-weight: 600;
        }

        .signal-meta {
          display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-muted);
          flex-wrap: wrap; justify-content: center;
        }
        .signal-meta-coin   { font-weight: 700; font-family: var(--font-mono); }
        .signal-meta-dot    { width: 4px; height: 4px; border-radius: 50%; background: var(--border); }
        .signal-meta-conf   { font-size: 13px; }
        .signal-meta-rr     { font-family: var(--font-mono); font-weight: 700; font-size: 13px; }

        /* Niveaux */
        .signal-levels { width: 100%; display: flex; flex-direction: column; gap: 8px; background: var(--bg-card); border-radius: var(--radius); padding: 14px; }
        .signal-level-row { display: flex; justify-content: space-between; align-items: center; }
        .signal-level-label { font-size: 12px; color: var(--text-muted); font-weight: 600; }
        .signal-level-val   { font-size: 14px; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary); }
        .signal-level-tps   { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 4px; border-top: 1px solid var(--border); padding-top: 10px; }
        .signal-tp          { display: flex; flex-direction: column; gap: 2px; }
        .signal-tp-label    { font-size: 10px; color: var(--text-muted); }
        .signal-tp-val      { font-size: 13px; font-weight: 700; font-family: var(--font-mono); }

        /* 3 lignes */
        .signal-lines { width: 100%; display: flex; flex-direction: column; gap: 8px; }
        .signal-line  { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }

        /* Bouton Pro */
        .signal-pro-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 20px; border: 1px solid var(--border); border-radius: var(--radius);
          color: var(--text-muted); background: var(--bg-card);
          cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s;
        }
        .signal-pro-btn:hover { color: var(--accent); border-color: rgba(0,212,255,0.4); background: var(--accent-dim); }

        /* Responsive */
        @media (max-width: 700px) {
          .signal-word { font-size: 52px; gap: 10px; }
          .signal-profiles { flex-wrap: wrap; }
          .signal-level-tps { grid-template-columns: repeat(3, 1fr); }
          .signal-decision { padding: 20px; }
        }
        @media (max-width: 480px) {
          .signal-coins { gap: 4px; }
          .signal-coin-btn { padding: 4px 7px; }
          .signal-word { font-size: 42px; }
          .signal-profile-btn span { display: none; }
          .signal-profile-btn { padding: 7px 10px; }
        }
      `}</style>
    </div>
  );
}
