require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { CoinGeckoService } = require('./services/coingecko');
const { BinanceService } = require('./services/binance');
const { HyperLiquidService } = require('./services/hyperliquid');
const { IndicatorService } = require('./services/indicators');
const { AIService } = require('./services/ai');
const { CacheService } = require('./services/cache');
const { getNews, analyzeSentiment } = require('./services/news');
const alertsService = require('./services/alerts');
const { runBacktest } = require('./services/backtest');
const authService   = require('./services/authService');
const { requireAuth } = require('./middleware/auth');
const cookieParser  = require('cookie-parser');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

const binance = new BinanceService();
const hyperliquid = new HyperLiquidService();
const indicators = new IndicatorService();
const ai = new AIService();
const cache = new CacheService();
const coingecko = new CoinGeckoService();

// ─── REST Routes ───────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));
app.get('/api/cache/flush', (req, res) => { cache.flush(); res.json({ ok: true }); });

// ─── Auth ───────────────────────────────────────────────────────────────────────

const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' };

app.post('/api/auth/register', async (req, res) => {
  try {
    const user         = await authService.register(req.body);
    const accessToken  = authService.signAccess(user);
    const refreshToken = authService.signRefresh(user);
    res.cookie('access_token',  accessToken,  { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan } });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const user         = await authService.login(req.body);
    const accessToken  = authService.signAccess(user);
    const refreshToken = authService.signRefresh(user);
    res.cookie('access_token',  accessToken,  { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan } });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  authService.logout(req.cookies?.refresh_token);
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.json({ ok: true });
});

app.post('/api/auth/refresh', (req, res) => {
  try {
    const user         = authService.refresh(req.cookies?.refresh_token);
    const accessToken  = authService.signAccess(user);
    const refreshToken = authService.signRefresh(user);
    res.cookie('access_token',  accessToken,  { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan } });
  } catch (e) {
    res.status(e.status || 401).json({ error: e.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = authService.getUser(req.user.userId);
  user ? res.json(user) : res.status(404).json({ error: 'Utilisateur introuvable' });
});

app.patch('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });
    const db = require('./database/db');
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), req.user.userId);
    res.json(authService.getUser(req.user.userId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/auth/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Champs requis' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Nouveau mot de passe trop court (8 min)' });
    const bcrypt = require('bcrypt');
    const db = require('./database/db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.userId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/auth/account', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    const bcrypt = require('bcrypt');
    const db = require('./database/db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.userId);
    res.clearCookie('access_token'); res.clearCookie('refresh_token');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// OHLCV historique
const KLINE_TTL = { '1m': 10, '5m': 30, '15m': 60, '1h': 120, '4h': 300, '1d': 600 };

app.get('/api/klines/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h', limit = 500 } = req.query;
    const cacheKey = `klines_${symbol}_${interval}_${limit}`;
    let data = cache.get(cacheKey);
    if (!data) {
      if (symbol === 'HYPEUSDT') {
        data = await hyperliquid.getKlines('HYPE', interval, parseInt(limit));
      } else if (coingecko.isFallback(symbol)) {
        data = await coingecko.getKlines(symbol, interval, parseInt(limit));
      } else {
        data = await binance.getKlines(symbol, interval, parseInt(limit));
      }
      cache.set(cacheKey, data, KLINE_TTL[interval] ?? 60);
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Orderbook (depth)
app.get('/api/depth/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    if (symbol === 'HYPEUSDT') return res.json(await hyperliquid.getOrderBook('HYPE'));
    if (coingecko.isFallback(symbol)) return res.json({ bids: [], asks: [] });
    const { limit = 20 } = req.query;
    const data = await binance.getOrderBook(symbol, parseInt(limit));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Trades récents
app.get('/api/trades/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    if (symbol === 'HYPEUSDT') return res.json(await hyperliquid.getRecentTrades('HYPE'));
    if (coingecko.isFallback(symbol)) return res.json([]);
    const data = await binance.getRecentTrades(symbol, 50);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Funding rate (futures)
app.get('/api/funding/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await binance.getFundingRate(symbol);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Open Interest (futures)
app.get('/api/openinterest/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await binance.getOpenInterest(symbol);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Indicateurs techniques complets
app.get('/api/indicators/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h' } = req.query;
    const cacheKey = `indicators_${symbol}_${interval}`;
    let data = cache.get(cacheKey);
    if (!data) {
      let klines;
      if (symbol === 'HYPEUSDT') {
        klines = await hyperliquid.getKlines('HYPE', interval, 300);
      } else if (coingecko.isFallback(symbol)) {
        klines = await coingecko.getKlines(symbol, interval, 300);
      } else {
        klines = await binance.getKlines(symbol, interval, 300);
      }
      data = indicators.computeAll(klines);
      cache.set(cacheKey, data, 60);
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Stats 24h pour tous les symboles
app.get('/api/tickers', async (req, res) => {
  try {
    const symbols = [
      'DOGEUSDT','HYPEUSDT','ADAUSDT','ETHUSDT','SOLUSDT',
      'BTCUSDT','XRPUSDT','SUIUSDT','PAXGUSDT','AVAXUSDT'
    ];
    const cacheKey = 'tickers_all';
    let data = cache.get(cacheKey);
    if (!data) {
      // Séparer les symbols Binance des fallbacks CoinGecko
      const binanceSymbols = symbols.filter(s => !coingecko.isFallback(s));
      const fallbackSymbols = symbols.filter(s => coingecko.isFallback(s));

      const binanceData = await binance.getTickers(binanceSymbols);

      const fallbackData = await Promise.all(
        fallbackSymbols.map(s => coingecko.getTicker(s).catch(() => ({ symbol: s, error: 'CoinGecko unavailable' })))
      );

      // Reconstruire dans l'ordre original
      data = symbols.map(s => {
        const bd = binanceData.find(d => d.symbol === s);
        const fd = fallbackData.find(d => d && d.symbol === s);
        return bd || fd || { symbol: s, error: 'unavailable' };
      });

      // Succès: cache 15s. Erreur (ex: 429): cache 60s pour ne pas marteler l'API
      cache.set(cacheKey, data, data.some(d => d.error) ? 60 : 15);
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Alertes ───────────────────────────────────────────────────────────────────

app.get('/api/alerts', (req, res) => res.json(alertsService.getAlerts()));
app.get('/api/alerts/history', (req, res) => res.json(alertsService.getHistory()));

app.post('/api/alerts', (req, res) => {
  try {
    const alert = alertsService.createAlert(req.body);
    res.json(alert);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/alerts/:id', (req, res) => {
  const ok = alertsService.deleteAlert(req.params.id);
  res.json({ ok });
});

app.patch('/api/alerts/:id/toggle', (req, res) => {
  const alert = alertsService.toggleAlert(req.params.id);
  alert ? res.json(alert) : res.status(404).json({ error: 'Alerte introuvable' });
});

// News & Sentiment
app.get('/api/news/:symbol', async (req, res) => {
  try {
    const items = await getNews(req.params.symbol);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/news/sentiment', async (req, res) => {
  try {
    const { symbol, newsItems } = req.body;
    if (!symbol) return res.status(400).json({ error: 'symbol requis' });
    const items = newsItems ?? await getNews(symbol);
    const result = await analyzeSentiment(symbol, items);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Scan de marché ────────────────────────────────────────────────────────────

const SCAN_SYMBOLS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','DOGEUSDT','ADAUSDT',
  'XRPUSDT','SUIUSDT','AVAXUSDT','PAXGUSDT','HYPEUSDT'
];

app.get('/api/scan', requireAuth, async (req, res) => {
  try {
    const { interval = '1h' } = req.query;

    // Récupérer tickers (prix live) + indicateurs pour chaque coin en parallèle
    const tickersCached = cache.get('tickers_all') ?? [];

    const results = await Promise.allSettled(
      SCAN_SYMBOLS.map(async (symbol) => {
        const cacheKey = `indicators_${symbol}_${interval}`;
        let ind = cache.get(cacheKey);

        if (!ind) {
          let klines;
          if (symbol === 'HYPEUSDT') {
            klines = await hyperliquid.getKlines('HYPE', interval, 200);
          } else if (coingecko.isFallback(symbol)) {
            klines = await coingecko.getKlines(symbol, interval, 200);
          } else {
            klines = await binance.getKlines(symbol, interval, 200);
          }
          ind = indicators.computeAll(klines);
          cache.set(cacheKey, ind, 60);
        }

        const ticker = tickersCached.find(t => t.symbol === symbol) ?? {};
        return {
          symbol,
          price:       ticker.price    ?? ind.price,
          change:      ticker.change   ?? null,
          volume:      ticker.volume   ?? null,
          signal:      ind.signal?.action     ?? 'NEUTRE',
          strength:    ind.signal?.strength   ?? 'Faible',
          netScore:    ind.signal?.netScore   ?? 0,
          bullish:     ind.signal?.bullish    ?? 0,
          bearish:     ind.signal?.bearish    ?? 0,
          rsi:         ind.oscillators?.rsi   ?? null,
          macdHisto:   ind.oscillators?.macd?.histogram ?? null,
          adx:         ind.trend?.adx?.adx    ?? null,
          volumeRatio: ind.volume?.volumeRatio ?? null,
          obvTrend:    ind.volume?.obvTrend   ?? null,
          goldenCross: ind.movingAverages?.goldenCross ?? false,
          aboveCloud:  ind.trend?.ichimoku?.aboveCloud ?? false,
        };
      })
    );

    const rows = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .sort((a, b) => Math.abs(b.netScore) - Math.abs(a.netScore));

    res.json({ rows, scannedAt: Date.now(), interval });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Backtesting
app.post('/api/backtest', requireAuth, async (req, res) => {
  try {
    const { symbol, interval, period } = req.body;
    if (!symbol) return res.status(400).json({ error: 'symbol requis' });
    const result = await runBacktest({ symbol, interval, period });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Analyse IA Claude
app.post('/api/ai/analyze', requireAuth, async (req, res) => {
  try {
    const { symbol, interval, marketData, riskProfile = 'moderate', capitalData } = req.body;
    if (!marketData) return res.status(400).json({ error: 'marketData requis' });
    const validProfiles = ['conservative', 'moderate', 'aggressive', 'extreme'];
    const profile = validProfiles.includes(riskProfile) ? riskProfile : 'moderate';
    const capital = capitalData && capitalData.capital > 0 ? capitalData : null;
    const analysis = await ai.analyze(symbol, interval, marketData, profile, capital);
    res.json(analysis);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Scanner IA global ────────────────────────────────────────────────────────

const SCAN_COINS = [
  { id: 'BTCUSDT',  hl: false }, { id: 'ETHUSDT',  hl: false },
  { id: 'SOLUSDT',  hl: false }, { id: 'HYPEUSDT', hl: true  },
  { id: 'DOGEUSDT', hl: false }, { id: 'ADAUSDT',  hl: false },
  { id: 'XRPUSDT',  hl: false }, { id: 'SUIUSDT',  hl: false },
  { id: 'PAXGUSDT', hl: false }, { id: 'AVAXUSDT', hl: false },
];

app.post('/api/ai/scan', requireAuth, async (req, res) => {
  try {
    const { riskProfile = 'moderate', capitalAvailable, objectiveGain } = req.body;
    const validProfiles = ['conservative', 'moderate', 'aggressive', 'extreme'];
    const profile = validProfiles.includes(riskProfile) ? riskProfile : 'moderate';

    // Fetch tickers + klines/indicators for all coins in parallel
    const [tickersMap, klineResults] = await Promise.all([
      Promise.all([
        binance.getTickers(SCAN_COINS.filter(c => !c.hl).map(c => c.id)).catch(() => []),
        hyperliquid.getTicker('HYPE').catch(() => null)
      ]).then(([binData, hypeData]) => {
        const map = {};
        (binData || []).forEach(t => { if (t?.symbol) map[t.symbol] = t; });
        if (hypeData) map['HYPEUSDT'] = { ...hypeData, symbol: 'HYPEUSDT' };
        return map;
      }),
      Promise.all(SCAN_COINS.map(({ id, hl }) =>
        (hl
          ? hyperliquid.getKlines('HYPE', '1h', 300)
          : binance.getKlines(id, '1h', 300)
        ).then(klines => ({ symbol: id, ind: indicators.computeAll(klines) }))
         .catch(() => ({ symbol: id, ind: null }))
      ))
    ]);

    const coinsData = klineResults
      .filter(r => r.ind != null)
      .map(r => ({ symbol: r.symbol, ticker: tickersMap[r.symbol] ?? null, indicators: r.ind }));

    const result = await ai.scanMarket(coinsData, profile, {
      capitalAvailable: capitalAvailable > 0 ? Number(capitalAvailable) : null,
      objectiveGain:    objectiveGain    > 0 ? Number(objectiveGain)    : null,
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── WebSocket ─────────────────────────────────────────────────────────────────

const clientSubscriptions = new Map();

wss.on('connection', (ws) => {
  console.log('[WS] Client connecté');
  const subscriptions = new Set();
  const pollingIntervals = new Map();
  clientSubscriptions.set(ws, subscriptions);

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'subscribe') {
        const { symbol, streams } = msg;
        streams.forEach(stream => subscriptions.add(`${symbol}_${stream}`));

        if (symbol === 'HYPEUSDT') {
          // Streams temps réel via HyperLiquid WebSocket
          const send = (data) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); };
          hyperliquid.subscribe('allMids', 'HYPE', send);
          hyperliquid.subscribe('trades',  'HYPE', send);
          hyperliquid.subscribe('l2Book',  'HYPE', send);
        } else if (coingecko.isFallback(symbol)) {
          if (!pollingIntervals.has(symbol)) {
            const poll = async () => {
              const ticker = await coingecko.getTicker(symbol);
              if (ticker && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ticker', symbol, price: ticker.price, change: ticker.change, volume: ticker.volume, high: ticker.high, low: ticker.low, ts: Date.now() }));
              }
            };
            poll();
            pollingIntervals.set(symbol, setInterval(poll, 15000));
          }
        } else {
          binance.subscribeStreams(symbol, streams, (data) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(data));
            }
          });
        }
      }
      if (msg.type === 'unsubscribe') {
        subscriptions.clear();
        binance.unsubscribeAll();
        hyperliquid.unsubscribeAll();
        pollingIntervals.forEach(id => clearInterval(id));
        pollingIntervals.clear();
      }
    } catch (e) {
      console.error('[WS] Erreur message:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client déconnecté');
    clientSubscriptions.delete(ws);
    pollingIntervals.forEach(id => clearInterval(id));
  });

  ws.send(JSON.stringify({ type: 'connected', ts: Date.now() }));
});

// ─── Alert checker ─────────────────────────────────────────────────────────────

// Broadcast une alerte déclenchée à tous les clients WS connectés
alertsService.setTriggerCallback((record) => {
  console.log(`[Alert] Déclenchée : ${record.label}`);
  const msg = JSON.stringify({ type: 'alert_triggered', alert: record });
  wss.clients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
});

// Vérification toutes les 15 secondes
setInterval(async () => {
  const active = alertsService.getAlerts().filter(a => a.active);
  if (!active.length) return;

  const symbols = [...new Set(active.map(a => a.symbol))];
  for (const symbol of symbols) {
    try {
      const tickerKey = `tickers_all`;
      const tickers  = cache.get(tickerKey);
      const ticker   = tickers?.find(t => t.symbol === symbol);
      if (!ticker?.price) continue;

      const indicKey  = `indicators_${symbol}_1h`;
      const indicators = cache.get(indicKey);

      alertsService.checkAlerts(symbol, ticker.price, indicators);
    } catch (e) {
      console.error(`[Alert checker] ${symbol}:`, e.message);
    }
  }
}, 15000);

// ─── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Crypto Terminal Backend démarré`);
  console.log(`   REST API : http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log(`   Env      : ${process.env.NODE_ENV || 'development'}\n`);
});
