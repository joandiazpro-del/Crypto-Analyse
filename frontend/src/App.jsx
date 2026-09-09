import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import SettingsPage from './pages/SettingsPage';
import { BarChart2, Activity, Brain, Newspaper, Bell, History, CandlestickChart, LineChart, Menu, X, Scan, BookOpen } from 'lucide-react';
import Header from './components/Header';
import SignalMode from './pages/SignalMode';
import WatchList from './components/WatchList';
import TradingTab from './components/tabs/TradingTab';
import IndicatorsTab from './components/tabs/IndicatorsTab';
import AITab from './components/tabs/AITab';
import NewsTab from './components/tabs/NewsTab';
import AlertsTab from './components/tabs/AlertsTab';
import BacktestTab from './components/tabs/BacktestTab';
import ScanTab from './components/tabs/ScanTab';
import GlossaryTab from './components/tabs/GlossaryTab';
import useWebSocket from './hooks/useWebSocket';
import { api } from './utils/api';
import './styles/App.css';

const COINS = [
  { id: 'DOGEUSDT',  name: 'Dogecoin',    symbol: 'DOGE', color: '#c2a633' },
  { id: 'HYPEUSDT',  name: 'Hyperliquid', symbol: 'HYPE', color: '#00d4ff', fallback: true },
  { id: 'ADAUSDT',   name: 'Cardano',     symbol: 'ADA',  color: '#0033ad' },
  { id: 'ETHUSDT',   name: 'Ethereum',    symbol: 'ETH',  color: '#627eea' },
  { id: 'SOLUSDT',   name: 'Solana',      symbol: 'SOL',  color: '#9945ff' },
  { id: 'BTCUSDT',   name: 'Bitcoin',     symbol: 'BTC',  color: '#f7931a' },
  { id: 'XRPUSDT',   name: 'XRP',         symbol: 'XRP',  color: '#346aa9' },
  { id: 'SUIUSDT',   name: 'SUI',         symbol: 'SUI',  color: '#4da2ff' },
  { id: 'PAXGUSDT',  name: 'PAX Gold',    symbol: 'PAXG', color: '#c9ae61' },
  { id: 'AVAXUSDT',  name: 'Avalanche',   symbol: 'AVAX', color: '#e84142' },
];

const INTERVALS = ['1m','5m','15m','1h','4h','1d'];

// Candles à charger par intervalle pour avoir un historique significatif
const INTERVAL_LIMITS = {
  '1m':  300,   // ~5h
  '5m':  500,   // ~1.7 jours
  '15m': 1000,  // ~10 jours
  '1h':  2160,  // ~3 mois
  '4h':  1460,  // ~8 mois
  '1d':  1095,  // ~3 ans
};

const TABS = [
  { id: 'trading',     label: 'Trading',      Icon: BarChart2   },
  { id: 'indicators',  label: 'Indicateurs',  Icon: Activity    },
  { id: 'scan',        label: 'Scanner',      Icon: Scan        },
  { id: 'ai',          label: 'IA & Signaux', Icon: Brain       },
  { id: 'news',        label: 'News',         Icon: Newspaper   },
  { id: 'alerts',      label: 'Alertes',      Icon: Bell        },
  { id: 'backtesting', label: 'Backtest',     Icon: History     },
  { id: 'glossary',   label: 'Glossaire',    Icon: BookOpen    },
];

export default function App() {
  const { user, loading: authLoading } = useAuth();

  // Écran de chargement pendant la vérification de session
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#080b0f', color: '#7a92a8', fontFamily: 'monospace', gap: 12 }}>
        <div className="spinner" /> Chargement...
      </div>
    );
  }

  // Page auth si non connecté
  if (!user) return <AuthPage />;

  return <Terminal />;
}

function Terminal() {
  const { logout, user } = useAuth();
  const [interfaceMode, setInterfaceMode] = useState(() => localStorage.getItem('interfaceMode') ?? 'signal');
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(COINS[5]);
  const [interval, setTimeframe] = useState('1h');
  const [chartType, setChartType] = useState('candle');
  const [activeTab, setActiveTab] = useState('trading');
  const [tickers, setTickers] = useState({});
  const [klines, setKlines] = useState([]);
  const [indicators, setIndicators] = useState(null);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [trades, setTrades] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [riskProfile, setRiskProfile] = useState('moderate');
  const [sentiment, setSentiment] = useState(null);
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liveKline, setLiveKline] = useState(null);

  const { lastMessage, sendMessage, connected } = useWebSocket(process.env.REACT_APP_WS_URL || 'ws://localhost:3001');

  const toggleMode = () => {
    setInterfaceMode(prev => {
      const next = prev === 'signal' ? 'pro' : 'signal';
      localStorage.setItem('interfaceMode', next);
      return next;
    });
  };

  // ─── Tickers en live ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const data = await api.get('/tickers');
        const map = {};
        data.forEach(t => { map[t.symbol] = t; });
        setTickers(map);
      } catch (e) { console.error('Tickers error:', e); }
    };
    fetchTickers();
    const id = setInterval(fetchTickers, 30000);
    return () => clearInterval(id);
  }, []);

  // ─── Charger les données du coin sélectionné ──────────────────────────────
  const loadCoinData = useCallback(async () => {
    setLoading(true);
    setAiAnalysis(null);
    setLiveKline(null);
    try {
      const limit = INTERVAL_LIMITS[interval] ?? 500;
      const [klineData, indicData, bookData, tradesData] = await Promise.all([
        api.get(`/klines/${selectedCoin.id}?interval=${interval}&limit=${limit}`),
        api.get(`/indicators/${selectedCoin.id}?interval=${interval}`),
        api.get(`/depth/${selectedCoin.id}?limit=20`),
        api.get(`/trades/${selectedCoin.id}`)
      ]);
      setKlines(klineData);
      setIndicators(indicData);
      setOrderBook(bookData);
      setTrades(tradesData);
    } catch (e) {
      toast.error('Erreur de chargement: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCoin, interval]);

  useEffect(() => { loadCoinData(); }, [loadCoinData]);

  // ─── Subscribe WebSocket ──────────────────────────────────────────────────
  useEffect(() => {
    if (!connected) return;
    sendMessage({ type: 'subscribe', symbol: selectedCoin.id, streams: ['ticker', `kline_${interval}`, 'depth', 'aggTrades'] });
    return () => sendMessage({ type: 'unsubscribe' });
  }, [connected, selectedCoin, interval, sendMessage]);

  // ─── Messages WebSocket ───────────────────────────────────────────────────
  useEffect(() => {
    if (!lastMessage) return;
    const msg = lastMessage;

    if (msg.type === 'ticker' && msg.symbol === selectedCoin.id) {
      setTickers(prev => ({ ...prev, [msg.symbol]: { ...prev[msg.symbol], ...msg } }));
      if (selectedCoin.fallback && msg.price != null) {
        const t = Math.floor(Date.now() / 60000) * 60000;
        setLiveKline(prev => ({
          openTime: t,
          open:  prev?.openTime === t ? (prev?.open  ?? msg.price) : msg.price,
          high:  prev?.openTime === t ? Math.max(prev?.high ?? msg.price, msg.price) : msg.price,
          low:   prev?.openTime === t ? Math.min(prev?.low  ?? msg.price, msg.price) : msg.price,
          close: msg.price,
          volume: 0
        }));
      }
    }
    if (msg.type === 'depth' && msg.symbol === selectedCoin.id) setOrderBook({ bids: msg.bids, asks: msg.asks });
    if (msg.type === 'trade' && msg.symbol === selectedCoin.id) setTrades(prev => [msg, ...prev.slice(0, 49)]);
    if (msg.type === 'kline' && msg.symbol === selectedCoin.id) {
      setLiveKline(msg);
      if (msg.isFinal) { loadCoinData(); setLiveKline(null); }
    }
    if (msg.type === 'alert_triggered') {
      const a = msg.alert;
      toast(a.label, { duration: 6000, style: { background: '#111820', color: '#e8f0f8', border: '1px solid #ff4757' } });
      setTriggeredAlerts(prev => [a, ...prev.slice(0, 19)]);
      setUnreadAlerts(prev => prev + 1);
      // Notification navigateur (fonctionne même si l'onglet est en arrière-plan)
      if (Notification.permission === 'granted') {
        new Notification('Alerte Crypto Terminal', {
          body: a.label,
          icon: '/favicon.ico',
          tag:  a.id,
        });
      }
      // Son de notification via Web Audio API
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [880, 1100, 1320].forEach((freq, i) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = freq; osc.type = 'sine';
          gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.2);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.2);
        });
      } catch (_) {}
    }
  }, [lastMessage, selectedCoin, loadCoinData]);

  // ─── Analyse IA ───────────────────────────────────────────────────────────
  const runAIAnalysis = async (capitalData = null) => {
    setAiLoading(true);
    try {
      const [freshIndicators, fundingRate, openInterest] = await Promise.all([
        indicators ? Promise.resolve(indicators) : api.get(`/indicators/${selectedCoin.id}?interval=${interval}`),
        api.get(`/funding/${selectedCoin.id}`).catch(() => ({})),
        api.get(`/openinterest/${selectedCoin.id}`).catch(() => ({}))
      ]);
      const body = {
        symbol: selectedCoin.id, interval, riskProfile,
        marketData: { indicators: freshIndicators, ticker: tickers[selectedCoin.id], fundingRate, openInterest }
      };
      if (capitalData?.capital > 0) body.capitalData = capitalData;
      const result = await api.post('/ai/analyze', body);
      setAiAnalysis(result);
      toast.success('Analyse IA terminée');
    } catch (e) {
      toast.error('Erreur IA: ' + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const currentTicker = tickers[selectedCoin.id];

  return (
    <div className="terminal">
      <Toaster position="top-right" toastOptions={{
        style: { background: '#111820', color: '#e8f0f8', border: '1px solid #1e2d3d', fontSize: '12px' }
      }} />

      {settingsOpen && <SettingsPage onClose={() => setSettingsOpen(false)} />}
      <Header connected={connected} tickers={tickers} sentiment={sentiment} selectedCoin={selectedCoin} user={user} onLogout={logout} onSettings={() => setSettingsOpen(true)} interfaceMode={interfaceMode} onToggleMode={toggleMode} />

      {interfaceMode === 'signal' && (
        <SignalMode
          selectedCoin={selectedCoin}
          riskProfile={riskProfile}
          onSwitchPro={(coin) => {
            if (coin) setSelectedCoin(COINS.find(c => c.id === coin.id) ?? selectedCoin);
            setInterfaceMode('pro');
            localStorage.setItem('interfaceMode', 'pro');
          }}
        />
      )}

      <div className="terminal-body" style={{ display: interfaceMode === 'signal' ? 'none' : undefined }}>
        {/* Overlay mobile */}
        <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />

        {/* Watchlist */}
        <aside className={`sidebar-left ${drawerOpen ? 'open' : ''}`}>
          <WatchList coins={COINS} tickers={tickers} selected={selectedCoin} onSelect={(c) => { setSelectedCoin(c); setDrawerOpen(false); }} />
        </aside>

        {/* Zone principale avec onglets */}
        <main className="main-content">

          {/* Barre : coin info + intervalles + onglets */}
          <div className="top-bar">
            <div className="symbol-bar">
              <div className="symbol-info">
                <button className="mobile-menu-btn" onClick={() => setDrawerOpen(v => !v)}>
                  {drawerOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
                <span className="symbol-icon" style={{ background: (selectedCoin.color ?? '#7a92a8') + '22', color: selectedCoin.color ?? '#7a92a8', border: `1px solid ${selectedCoin.color ?? '#7a92a8'}44` }}>{selectedCoin.symbol.slice(0, 2)}</span>
                <div>
                  <span className="symbol-name">{selectedCoin.id}</span>
                  <span className="symbol-full">{selectedCoin.name}</span>
                </div>
                {currentTicker?.price != null && (
                  <span className={`symbol-price mono ${(currentTicker.change ?? 0) >= 0 ? 'pos' : 'neg'}`}>
                    ${currentTicker.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: currentTicker.price < 1 ? 6 : 2 })}
                  </span>
                )}
                {currentTicker?.change != null && (
                  <span className={`symbol-change ${currentTicker.change >= 0 ? 'pos' : 'neg'}`}>
                    {currentTicker.change >= 0 ? '+' : ''}{currentTicker.change.toFixed(2)}%
                  </span>
                )}
              </div>

              {/* Intervalles + toggle chart — visibles uniquement sur Trading */}
              {activeTab === 'trading' && (
                <div className="interval-btns">
                  {INTERVALS.map(iv => (
                    <button key={iv} className={`interval-btn ${interval === iv ? 'active' : ''}`} onClick={() => setTimeframe(iv)}>{iv}</button>
                  ))}
                  <div className="chart-type-toggle">
                    <button className={`interval-btn ${chartType === 'candle' ? 'active' : ''}`} onClick={() => setChartType('candle')} title="Bougies"><CandlestickChart size={13} /></button>
                    <button className={`interval-btn ${chartType === 'line'   ? 'active' : ''}`} onClick={() => setChartType('line')}   title="Courbe"><LineChart size={13} /></button>
                  </div>
                </div>
              )}
            </div>

            {/* Tab bar */}
            <nav className="tab-bar">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`tab-btn ${activeTab === id ? 'active' : ''}`}
                  onClick={() => { setActiveTab(id); if (id === 'alerts') setUnreadAlerts(0); setDrawerOpen(false); }}
                >
                  <Icon size={12} />
                  {label}
                  {id === 'alerts' && unreadAlerts > 0 && (
                    <span className="tab-badge">{unreadAlerts}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Contenu des onglets */}
          <div className="tab-content">
            {activeTab === 'trading' && (
              <TradingTab
                klines={klines} selectedCoin={selectedCoin} loading={loading}
                indicators={indicators} liveKline={liveKline} chartType={chartType}
                orderBook={orderBook} trades={trades} currentTicker={currentTicker}
              />
            )}
            {activeTab === 'indicators' && (
              <IndicatorsTab klines={klines} indicators={indicators} loading={loading} />
            )}
            {activeTab === 'scan' && (
              <ScanTab onCoinSelect={(coin) => { setSelectedCoin(coin); setActiveTab('trading'); }} coins={COINS} />
            )}
            {activeTab === 'ai' && (
              <AITab
                analysis={aiAnalysis} loading={aiLoading} onAnalyze={runAIAnalysis}
                coin={selectedCoin} interval={interval} indicators={indicators} tickers={tickers}
                riskProfile={riskProfile} onRiskProfileChange={setRiskProfile}
              />
            )}
            {activeTab === 'news' && (
              <NewsTab selectedCoin={selectedCoin} onSentimentChange={setSentiment} />
            )}
            {activeTab === 'alerts' && (
              <AlertsTab
                selectedCoin={selectedCoin}
                triggeredAlerts={triggeredAlerts}
              />
            )}
            {activeTab === 'backtesting' && (
              <BacktestTab selectedCoin={selectedCoin} />
            )}
            {activeTab === 'glossary' && (
              <GlossaryTab />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

