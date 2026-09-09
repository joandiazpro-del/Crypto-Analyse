import React from 'react';
import { Activity, Wifi, WifiOff, TrendingUp, TrendingDown, Minus, LogOut, User, Settings, LayoutDashboard, Zap } from 'lucide-react';

const SENTIMENT_META = {
  very_bullish: { color: '#00e676', Icon: TrendingUp,   label: 'Très Bullish' },
  bullish:      { color: '#00d4ff', Icon: TrendingUp,   label: 'Bullish'      },
  neutral:      { color: '#7a92a8', Icon: Minus,        label: 'Neutre'       },
  bearish:      { color: '#ff9f43', Icon: TrendingDown, label: 'Bearish'      },
  very_bearish: { color: '#ff4757', Icon: TrendingDown, label: 'Très Bearish' },
};

export default function Header({ connected, tickers, sentiment, selectedCoin, user, onLogout, onSettings, interfaceMode, onToggleMode }) {
  const btc = tickers['BTCUSDT'];
  const eth = tickers['ETHUSDT'];
  const sm = sentiment ? (SENTIMENT_META[sentiment.label] ?? SENTIMENT_META.neutral) : null;

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <Activity size={16} color="var(--accent)" />
          <span className="logo-text">CRYPTO<span className="logo-accent">TERMINAL</span></span>
        </div>
        <div className="header-stats">
          {btc && (
            <div className="header-stat">
              <span className="header-stat-label">BTC</span>
              <span className={`header-stat-value mono ${btc.change >= 0 ? 'pos' : 'neg'}`}>
                ${btc.price?.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
              <span className={btc.change >= 0 ? 'pos' : 'neg'} style={{ fontSize: '10px' }}>
                {btc.change != null ? `${btc.change >= 0 ? '+' : ''}${btc.change.toFixed(2)}%` : '—'}
              </span>
            </div>
          )}
          {eth && (
            <div className="header-stat">
              <span className="header-stat-label">ETH</span>
              <span className={`header-stat-value mono ${eth.change >= 0 ? 'pos' : 'neg'}`}>
                ${eth.price?.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
              <span className={eth.change >= 0 ? 'pos' : 'neg'} style={{ fontSize: '10px' }}>
                {eth.change != null ? `${eth.change >= 0 ? '+' : ''}${eth.change.toFixed(2)}%` : '—'}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="header-right">
        {onToggleMode && (
          <button className="mode-toggle-btn" onClick={onToggleMode} title={interfaceMode === 'signal' ? 'Passer en Mode Pro' : 'Passer en Mode Signal'}>
            {interfaceMode === 'signal'
              ? <><LayoutDashboard size={12} /><span>Mode Pro</span></>
              : <><Zap size={12} /><span>Mode Signal</span></>
            }
          </button>
        )}
        {sm && sentiment && (
          <div className="sentiment-badge" style={{ borderColor: sm.color + '50', background: sm.color + '15', color: sm.color }}>
            <sm.Icon size={11} />
            <span>{selectedCoin?.symbol} · {sm.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{sentiment.score > 0 ? '+' : ''}{sentiment.score}</span>
          </div>
        )}
        <div className={`ws-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{connected ? 'LIVE' : 'OFFLINE'}</span>
        </div>
        <span className="header-time mono" id="clock"></span>
        {user && (
          <div className="header-user">
            <User size={12} color="var(--text-muted)" />
            <span className="header-user-name">{user.name || user.email.split('@')[0]}</span>
            <span className="header-user-plan">{user.plan}</span>
            <button className="header-logout" onClick={onSettings} title="Paramètres">
              <Settings size={12} />
            </button>
            <button className="header-logout" onClick={onLogout} title="Se déconnecter">
              <LogOut size={12} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 16px; height: 44px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .header-left { display: flex; align-items: center; gap: 20px; }
        .logo { display: flex; align-items: center; gap: 8px; }
        .logo-text { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.05em; }
        .logo-accent { color: var(--accent); }
        .header-stats { display: flex; gap: 16px; }
        .header-stat { display: flex; align-items: center; gap: 6px; }
        .header-stat-label { font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
        .header-stat-value { font-size: 12px; }
        .header-right { display: flex; align-items: center; gap: 12px; }
        .sentiment-badge { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 600; padding: 3px 10px; border-radius: 12px; border: 1px solid; letter-spacing: 0.04em; }
        .header-user { display: flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); }
        .header-user-name { font-size: 11px; color: var(--text-primary); font-weight: 600; }
        .header-user-plan { font-size: 9px; color: var(--accent); background: var(--accent-dim); padding: 1px 5px; border-radius: 4px; font-weight: 700; text-transform: uppercase; }
        .mode-toggle-btn { display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; font-family: var(--font-mono); cursor: pointer; transition: all 0.15s; color: var(--accent); border: 1px solid rgba(0,212,255,0.35); background: var(--accent-dim); letter-spacing: 0.04em; }
        .mode-toggle-btn:hover { background: rgba(0,212,255,0.2); border-color: var(--accent); }
        .header-logout { display: flex; align-items: center; color: var(--text-muted); padding: 2px; border-radius: 3px; cursor: pointer; transition: color 0.15s; }
        .header-logout:hover { color: var(--red); }
        .ws-status { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; padding: 3px 8px; border-radius: 12px; }
        .ws-status.connected { color: var(--green); background: var(--green-dim); }
        .ws-status.disconnected { color: var(--red); background: var(--red-dim); }
        .header-time { font-size: 11px; color: var(--text-muted); }
      `}</style>
      <ClockUpdater />
    </header>
  );
}

function ClockUpdater() {
  React.useEffect(() => {
    const update = () => {
      const el = document.getElementById('clock');
      if (el) el.textContent = new Date().toLocaleTimeString('fr-FR');
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return null;
}
