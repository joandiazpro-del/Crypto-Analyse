import React, { useState } from 'react';
import { Search, TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle, XCircle, Target, Zap, Eye, LayoutDashboard } from 'lucide-react';
import { api } from '../utils/api';

const COIN_META = {
  BTCUSDT:  { symbol: 'BTC',  name: 'Bitcoin',     color: '#f7931a' },
  ETHUSDT:  { symbol: 'ETH',  name: 'Ethereum',    color: '#627eea' },
  SOLUSDT:  { symbol: 'SOL',  name: 'Solana',      color: '#9945ff' },
  HYPEUSDT: { symbol: 'HYPE', name: 'Hyperliquid', color: '#00d4ff' },
  DOGEUSDT: { symbol: 'DOGE', name: 'Dogecoin',    color: '#c2a633' },
  ADAUSDT:  { symbol: 'ADA',  name: 'Cardano',     color: '#0033ad' },
  XRPUSDT:  { symbol: 'XRP',  name: 'XRP',         color: '#346aa9' },
  SUIUSDT:  { symbol: 'SUI',  name: 'SUI',         color: '#4da2ff' },
  PAXGUSDT: { symbol: 'PAXG', name: 'PAX Gold',    color: '#c9ae61' },
  AVAXUSDT: { symbol: 'AVAX', name: 'Avalanche',   color: '#e84142' },
};

const MOOD_META = {
  bullish:   { label: 'BULLISH',   color: '#00e676', Icon: TrendingUp   },
  bearish:   { label: 'BEARISH',   color: '#ff4757', Icon: TrendingDown },
  uncertain: { label: 'INCERTAIN', color: '#ffc107', Icon: Minus        },
};

const URGENCY_META = {
  now:   { label: 'NOW',     color: '#ff4757', bg: 'rgba(255,71,87,0.12)'    },
  watch: { label: 'WATCH',   color: '#ffc107', bg: 'rgba(255,193,7,0.12)'   },
  wait:  { label: 'BIENTÔT', color: '#7a92a8', bg: 'rgba(122,146,168,0.10)' },
};

function fmt(n) {
  if (n == null) return '—';
  const v = Number(n);
  if (v >= 1000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (v >= 1)    return `$${v.toFixed(3)}`;
  return `$${v.toFixed(6)}`;
}

function CoinBadge({ symbol, size = 'sm' }) {
  const meta = COIN_META[symbol] ?? { symbol: symbol.replace('USDT', ''), color: '#7a92a8' };
  const dim = size === 'lg' ? 40 : 24;
  const fs  = size === 'lg' ? 13 : 8;
  return (
    <div style={{
      width: dim, height: dim, borderRadius: 7, flexShrink: 0,
      background: meta.color + '22', color: meta.color,
      border: `1px solid ${meta.color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: fs, fontWeight: 700, fontFamily: 'var(--font-mono)',
    }}>
      {meta.symbol.slice(0, 2)}
    </div>
  );
}

function UrgencyBadge({ urgency, small }) {
  const u = URGENCY_META[urgency] ?? URGENCY_META.watch;
  return (
    <span className={`sc-urgency ${small ? 'small' : ''}`} style={{ color: u.color, background: u.bg, borderColor: u.color + '50' }}>
      {u.label}
    </span>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function MarketScanner({ riskProfile, profileLabel, onSelectCoin }) {
  const [status,    setStatus]    = useState('idle');
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState('');
  const [capital,   setCapital]   = useState('');
  const [objective, setObjective] = useState('');

  const runScan = async () => {
    setStatus('loading'); setError('');
    try {
      const body = { riskProfile };
      if (parseFloat(capital)   > 0) body.capitalAvailable = parseFloat(capital);
      if (parseFloat(objective) > 0) body.objectiveGain    = parseFloat(objective);
      const data = await api.post('/ai/scan', body);
      setResult(data);
      setStatus('result');
    } catch (e) {
      setError(e?.response?.data?.error ?? e.message ?? 'Erreur scan');
      setStatus('error');
    }
  };

  // ── IDLE / ERROR ─────────────────────────────────────────────────────────────
  if (status === 'idle' || status === 'error') {
    return (
      <div className="sc-idle">
        <div className="sc-idle-icon"><Search size={40} color="var(--accent)" /></div>
        <div className="sc-idle-title">Scanner le marché</div>
        <div className="sc-idle-sub">
          Claude analyse les 10 coins simultanément et identifie les meilleures
          opportunités right now selon le profil <strong>{profileLabel}</strong>.
        </div>

        <div className="sc-cap-row">
          <div className="sc-cap-field">
            <label>Capital (optionnel)</label>
            <div className="sc-cap-wrap">
              <input type="number" placeholder="500" min="0" value={capital} onChange={e => setCapital(e.target.value)} />
              <span className="sc-cap-unit">€/$</span>
            </div>
          </div>
          <div className="sc-cap-field">
            <label>Objectif (optionnel)</label>
            <div className="sc-cap-wrap">
              <input type="number" placeholder="50" min="0" value={objective} onChange={e => setObjective(e.target.value)} />
              <span className="sc-cap-unit">€/$</span>
            </div>
          </div>
        </div>

        {error && <div className="sc-error"><AlertTriangle size={13} />{error}</div>}

        <button className="sc-launch-btn" onClick={runScan}>
          <Search size={16} />
          Scanner les 10 coins — {profileLabel}
        </button>
        <p className="sc-disclaimer">Analyse indicative · 10 à 20 secondes · Pas un conseil financier</p>
      </div>
    );
  }

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="sc-loading">
        <div className="spinner" style={{ width: 52, height: 52, borderWidth: 4 }} />
        <div className="sc-loading-title">Claude scanne le marché...</div>
        <div className="sc-loading-sub">Analyse de 10 coins en parallèle · 10 à 20 secondes</div>
        <div className="sc-loading-coins">
          {Object.entries(COIN_META).map(([id, meta]) => (
            <div key={id} className="sc-loading-chip" style={{ color: meta.color, borderColor: meta.color + '50', background: meta.color + '10' }}>
              {meta.symbol}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────────────────────
  const s    = result?.scan;
  const mood = s ? (MOOD_META[s.marketMood] ?? MOOD_META.uncertain) : null;

  return (
    <div className="sc-result">

      {/* Barre contrôle */}
      <div className="sc-result-bar">
        <span className="sc-result-meta">
          Scan du {new Date(result.scannedAt).toLocaleTimeString('fr-FR')} · profil {result.profile}
        </span>
        <button className="sc-rescan-btn" onClick={runScan}>
          <RefreshCw size={12} /> Rescanner
        </button>
      </div>

      {/* Mood marché */}
      {mood && (
        <div className="sc-mood" style={{ borderColor: mood.color + '50', background: mood.color + '0C' }}>
          <div className="sc-mood-badge" style={{ color: mood.color }}>
            <mood.Icon size={20} strokeWidth={2.5} />
            <span>{mood.label}</span>
          </div>
          <p className="sc-mood-summary">{s.marketSummary}</p>
        </div>
      )}

      {/* Meilleur trade */}
      {s.bestTrade ? (
        <BestTradeCard trade={s.bestTrade} onSelect={coinId => { onSelectCoin(coinId); }} />
      ) : (
        <div className="sc-no-trade">
          <XCircle size={28} color="var(--text-muted)" />
          <div>
            <div className="sc-no-trade-title">AUCUNE OPPORTUNITÉ DÉTECTÉE</div>
            <div className="sc-no-trade-sub">{s.conclusion || 'Le marché ne présente pas de setup valable right now selon ce profil.'}</div>
          </div>
        </div>
      )}

      {/* Opportunités secondaires */}
      {s.opportunities?.length > 0 && (
        <div className="sc-section">
          <div className="sc-section-title"><Target size={12} color="var(--accent)" /> Opportunités secondaires</div>
          <div className="sc-opps">
            {s.opportunities.map((opp, i) => <OpportunityCard key={i} opp={opp} onSelect={onSelectCoin} />)}
          </div>
        </div>
      )}

      {/* Watchlist */}
      {s.watchlist?.length > 0 && (
        <div className="sc-section">
          <div className="sc-section-title"><Eye size={12} color="var(--yellow)" /> À surveiller</div>
          <div className="sc-watchlist">
            {s.watchlist.map((item, i) => <WatchlistItem key={i} item={item} onSelect={onSelectCoin} />)}
          </div>
        </div>
      )}

      {/* À ignorer */}
      {s.avoid?.length > 0 && (
        <div className="sc-section">
          <div className="sc-section-title"><XCircle size={12} color="var(--text-muted)" /> À ignorer aujourd'hui</div>
          <div className="sc-avoid-list">
            {s.avoid.map((sym, i) => (
              <div key={i} className="sc-avoid-chip">
                <CoinBadge symbol={sym} />
                <span>{(COIN_META[sym] ?? { symbol: sym.replace('USDT', '') }).symbol}</span>
              </div>
            ))}
          </div>
          {s.avoidReason && <p className="sc-avoid-reason">{s.avoidReason}</p>}
        </div>
      )}

      {/* Conclusion */}
      {s.bestTrade && s.conclusion && (
        <div className="sc-conclusion">
          <Zap size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
          <p>{s.conclusion}</p>
        </div>
      )}

      <p className="sc-disclaimer sc-disclaimer-bottom">
        Analyse indicative, sans levier, hors frais. Pas un conseil financier — trading à vos risques.
      </p>
    </div>
  );
}

// ─── BestTradeCard ────────────────────────────────────────────────────────────

function BestTradeCard({ trade, onSelect }) {
  const meta     = COIN_META[trade.symbol] ?? { symbol: trade.symbol.replace('USDT',''), name: trade.symbol, color: '#7a92a8' };
  const isShort  = trade.direction === 'SHORT';
  const dc       = isShort ? '#ff4757' : '#00e676';
  const DirIcon  = isShort ? TrendingDown : TrendingUp;

  return (
    <div className="sc-best" style={{ borderColor: dc + '50', background: dc + '07' }}>
      <div className="sc-best-label">Meilleur trade right now</div>

      <div className="sc-best-header">
        <div className="sc-best-coin">
          <CoinBadge symbol={trade.symbol} size="lg" />
          <div>
            <div className="sc-best-name" style={{ color: meta.color }}>{meta.name}</div>
            <div className="sc-best-dir" style={{ color: dc }}>
              <DirIcon size={22} strokeWidth={2.5} /> {trade.direction}
            </div>
          </div>
        </div>
        <div className="sc-best-right">
          <div className="sc-conviction" style={{ color: dc }}>
            <span className="sc-conviction-val">{trade.conviction}%</span>
            <span className="sc-conviction-lbl">conviction</span>
          </div>
          <UrgencyBadge urgency={trade.urgency} />
        </div>
      </div>

      <p className="sc-best-reason">{trade.reason}</p>

      {trade.gainEstimate && (
        <div className="sc-gain-estimate" style={{ color: dc, borderColor: dc + '40', background: dc + '0D' }}>
          <Target size={11} /> {trade.gainEstimate}
        </div>
      )}

      <div className="sc-levels">
        <div className="sc-level-box sl">
          <div className="sc-level-lbl">Stop Loss</div>
          <div className="sc-level-val neg">{fmt(trade.sl)}</div>
        </div>
        <div className="sc-level-box entry">
          <div className="sc-level-lbl">Entrée</div>
          <div className="sc-level-val">{fmt(trade.entry)}</div>
        </div>
        <div className="sc-level-box tp">
          <div className="sc-level-lbl">TP1</div>
          <div className="sc-level-val" style={{ color: dc }}>{fmt(trade.tp1)}</div>
        </div>
        <div className="sc-level-box tp">
          <div className="sc-level-lbl">TP2</div>
          <div className="sc-level-val" style={{ color: dc }}>{fmt(trade.tp2)}</div>
        </div>
        <div className="sc-level-box tp">
          <div className="sc-level-lbl">TP3</div>
          <div className="sc-level-val" style={{ color: dc }}>{fmt(trade.tp3)}</div>
        </div>
        <div className="sc-level-box rr">
          <div className="sc-level-lbl">R/R</div>
          <div className="sc-level-val" style={{ color: dc }}>{trade.riskReward}</div>
        </div>
      </div>

      <button className="sc-detail-btn" onClick={() => onSelect(trade.symbol)} style={{ color: dc, borderColor: dc + '50' }}>
        <LayoutDashboard size={12} /> Analyser en détail dans Mode Signal
      </button>
    </div>
  );
}

// ─── OpportunityCard ──────────────────────────────────────────────────────────

function OpportunityCard({ opp, onSelect }) {
  const meta    = COIN_META[opp.symbol] ?? { symbol: opp.symbol.replace('USDT',''), name: opp.symbol, color: '#7a92a8' };
  const isShort = opp.direction === 'SHORT';
  const dc      = isShort ? '#ff4757' : '#00e676';
  const DirIcon = isShort ? TrendingDown : TrendingUp;

  return (
    <div className="sc-opp" style={{ borderColor: dc + '35' }}>
      <div className="sc-opp-header">
        <CoinBadge symbol={opp.symbol} />
        <span className="sc-opp-name" style={{ color: meta.color }}>{meta.symbol}</span>
        <div className="sc-opp-dir" style={{ color: dc }}><DirIcon size={11} /> {opp.direction}</div>
        <span className="sc-opp-conv" style={{ color: dc }}>{opp.conviction}%</span>
        <UrgencyBadge urgency={opp.urgency} small />
        <button className="sc-mini-btn" onClick={() => onSelect(opp.symbol)} title="Analyser en détail">
          <LayoutDashboard size={11} />
        </button>
      </div>
      <p className="sc-opp-reason">{opp.reason}</p>
      {(opp.entry || opp.sl || opp.tp1) && (
        <div className="sc-opp-levels">
          {opp.entry && <span>Entrée: {fmt(opp.entry)}</span>}
          {opp.sl    && <span style={{ color: 'var(--red)' }}>SL: {fmt(opp.sl)}</span>}
          {opp.tp1   && <span style={{ color: dc }}>TP1: {fmt(opp.tp1)}</span>}
        </div>
      )}
    </div>
  );
}

// ─── WatchlistItem ────────────────────────────────────────────────────────────

function WatchlistItem({ item, onSelect }) {
  const meta = COIN_META[item.symbol] ?? { symbol: item.symbol.replace('USDT',''), name: item.symbol, color: '#7a92a8' };

  return (
    <div className="sc-watch">
      <CoinBadge symbol={item.symbol} />
      <div className="sc-watch-body">
        <div className="sc-watch-name" style={{ color: meta.color }}>{meta.symbol} · {meta.name}</div>
        <div className="sc-watch-trigger">{item.triggerCondition}</div>
        {item.triggerLevel && (
          <div className="sc-watch-level">
            Niveau clé : <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--yellow)', fontWeight: 700 }}>{fmt(item.triggerLevel)}</span>
          </div>
        )}
      </div>
      <button className="sc-mini-btn" onClick={() => onSelect(item.symbol)} title="Analyser en détail">
        <LayoutDashboard size={11} />
      </button>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CSS = `
  /* Idle */
  .sc-idle {
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    padding: 40px 24px; max-width: 500px; width: 100%; text-align: center;
  }
  .sc-idle-icon { width: 80px; height: 80px; border-radius: 20px; background: var(--accent-dim); border: 1px solid rgba(0,212,255,0.25); display: flex; align-items: center; justify-content: center; }
  .sc-idle-title { font-size: 22px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
  .sc-idle-sub { font-size: 13px; color: var(--text-muted); line-height: 1.6; }

  .sc-cap-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
  .sc-cap-field { display: flex; flex-direction: column; gap: 4px; text-align: left; }
  .sc-cap-field label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .sc-cap-wrap { position: relative; }
  .sc-cap-wrap input { width: 100%; padding: 8px 28px 8px 10px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; font-family: var(--font-mono); outline: none; transition: border-color 0.15s; }
  .sc-cap-wrap input:focus { border-color: var(--accent); }
  .sc-cap-unit { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 10px; color: var(--text-muted); pointer-events: none; }

  .sc-error { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--red); background: rgba(255,71,87,0.08); border: 1px solid rgba(255,71,87,0.3); border-radius: var(--radius); padding: 8px 12px; }
  .sc-launch-btn { display: flex; align-items: center; gap: 10px; padding: 13px 32px; background: var(--accent); color: var(--bg-primary); border-radius: var(--radius); font-size: 14px; font-weight: 700; font-family: var(--font-mono); cursor: pointer; transition: all 0.15s; }
  .sc-launch-btn:hover { background: #00bcd4; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,212,255,0.3); }
  .sc-disclaimer { font-size: 10px; color: var(--text-muted); text-align: center; }
  .sc-disclaimer-bottom { padding: 8px 0 4px; border-top: 1px solid var(--border); margin-top: 4px; }

  /* Loading */
  .sc-loading { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 60px 24px; }
  .sc-loading-title { font-size: 20px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
  .sc-loading-sub { font-size: 13px; color: var(--text-muted); }
  .sc-loading-coins { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 380px; }
  .sc-loading-chip { padding: 3px 10px; border-radius: 12px; border: 1px solid; font-size: 11px; font-weight: 700; font-family: var(--font-mono); animation: sc-pulse 1.5s ease-in-out infinite; }
  @keyframes sc-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }

  /* Result */
  .sc-result { display: flex; flex-direction: column; gap: 14px; padding: 14px; overflow-y: auto; }
  .sc-result-bar { display: flex; align-items: center; justify-content: space-between; }
  .sc-result-meta { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); }
  .sc-rescan-btn { display: flex; align-items: center; gap: 5px; padding: 4px 10px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 11px; color: var(--text-muted); cursor: pointer; transition: all 0.15s; }
  .sc-rescan-btn:hover { color: var(--accent); border-color: rgba(0,212,255,0.4); background: var(--accent-dim); }

  /* Mood */
  .sc-mood { border: 1px solid; border-radius: var(--radius); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
  .sc-mood-badge { display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 800; font-family: var(--font-mono); letter-spacing: 0.04em; }
  .sc-mood-summary { font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin: 0; }

  /* Best trade */
  .sc-best { border: 1px solid; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .sc-best-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); }
  .sc-best-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .sc-best-coin { display: flex; align-items: center; gap: 12px; }
  .sc-best-name { font-size: 13px; font-weight: 700; font-family: var(--font-mono); }
  .sc-best-dir { display: flex; align-items: center; gap: 6px; font-size: 22px; font-weight: 800; font-family: var(--font-mono); }
  .sc-best-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
  .sc-conviction { display: flex; flex-direction: column; align-items: flex-end; }
  .sc-conviction-val { font-size: 22px; font-weight: 700; font-family: var(--font-mono); line-height: 1; }
  .sc-conviction-lbl { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; }
  .sc-best-reason { font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin: 0; }
  .sc-gain-estimate { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid; border-radius: var(--radius); font-size: 12px; font-weight: 700; font-family: var(--font-mono); }

  /* Levels grid */
  .sc-levels { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
  .sc-level-box { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 6px 4px; text-align: center; }
  .sc-level-box.sl { border-color: rgba(255,71,87,0.3); background: rgba(255,71,87,0.05); }
  .sc-level-box.entry { border-color: var(--border); }
  .sc-level-box.tp { border-color: rgba(0,230,118,0.15); }
  .sc-level-lbl { font-size: 8px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 3px; }
  .sc-level-val { font-size: 10px; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary); }

  .sc-detail-btn { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 9px; border: 1px solid; border-radius: var(--radius); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; background: transparent; }
  .sc-detail-btn:hover { opacity: 0.8; background: rgba(255,255,255,0.04); }

  /* No trade */
  .sc-no-trade { display: flex; align-items: center; gap: 14px; padding: 20px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; }
  .sc-no-trade-title { font-size: 16px; font-weight: 800; color: var(--text-primary); font-family: var(--font-mono); letter-spacing: 0.03em; }
  .sc-no-trade-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; line-height: 1.5; }

  /* Sections */
  .sc-section { display: flex; flex-direction: column; gap: 8px; }
  .sc-section-title { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); padding-bottom: 6px; border-bottom: 1px solid var(--border); }

  /* Opps */
  .sc-opps { display: flex; flex-direction: column; gap: 6px; }
  .sc-opp { border: 1px solid; border-radius: var(--radius); padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
  .sc-opp-header { display: flex; align-items: center; gap: 8px; }
  .sc-opp-name { font-size: 12px; font-weight: 700; font-family: var(--font-mono); }
  .sc-opp-dir { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; margin-left: auto; }
  .sc-opp-conv { font-size: 11px; font-weight: 700; font-family: var(--font-mono); }
  .sc-opp-reason { font-size: 11px; color: var(--text-secondary); line-height: 1.5; margin: 0; }
  .sc-opp-levels { display: flex; gap: 12px; font-size: 10px; font-family: var(--font-mono); font-weight: 600; }

  /* Urgency badge */
  .sc-urgency { padding: 2px 7px; border-radius: 8px; border: 1px solid; font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; }
  .sc-urgency.small { font-size: 8px; padding: 1px 5px; }

  /* Watchlist */
  .sc-watchlist { display: flex; flex-direction: column; gap: 6px; }
  .sc-watch { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius); }
  .sc-watch-body { flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .sc-watch-name { font-size: 12px; font-weight: 700; font-family: var(--font-mono); }
  .sc-watch-trigger { font-size: 11px; color: var(--text-secondary); line-height: 1.5; }
  .sc-watch-level { font-size: 10px; color: var(--text-muted); }

  /* Avoid */
  .sc-avoid-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .sc-avoid-chip { display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 6px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono); }
  .sc-avoid-reason { font-size: 11px; color: var(--text-muted); line-height: 1.5; padding: 0 2px; }

  /* Mini btn */
  .sc-mini-btn { display: flex; align-items: center; color: var(--text-muted); padding: 4px; border-radius: 4px; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
  .sc-mini-btn:hover { color: var(--accent); background: var(--accent-dim); }

  /* Conclusion */
  .sc-conclusion { display: flex; align-items: flex-start; gap: 8px; padding: 12px 14px; background: var(--accent-dim); border: 1px solid rgba(0,212,255,0.25); border-radius: var(--radius); }
  .sc-conclusion p { font-size: 13px; color: var(--text-primary); font-weight: 600; line-height: 1.6; margin: 0; font-style: italic; }

  /* Responsive */
  @media (max-width: 700px) {
    .sc-levels { grid-template-columns: repeat(3, 1fr); }
    .sc-best-dir { font-size: 18px; }
  }
  @media (max-width: 480px) {
    .sc-cap-row { grid-template-columns: 1fr; }
    .sc-levels { grid-template-columns: repeat(2, 1fr); }
  }
`;

// Injection du CSS une seule fois
if (typeof document !== 'undefined' && !document.getElementById('market-scanner-css')) {
  const style = document.createElement('style');
  style.id = 'market-scanner-css';
  style.textContent = CSS;
  document.head.appendChild(style);
}
