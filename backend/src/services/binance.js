const axios = require('axios');
const WebSocket = require('ws');

const BINANCE_REST = 'https://api.binance.com/api/v3';
const BINANCE_FUTURES_REST = 'https://fapi.binance.com/fapi/v1';
const BINANCE_WS = 'wss://stream.binance.com:9443/stream';

class BinanceService {
  constructor() {
    this.activeStreams = new Map();
    this.callbacks = new Map();
  }

  async get(url, params = {}) {
    const res = await axios.get(url, { params, timeout: 8000 });
    return res.data;
  }

  // ─── OHLCV ────────────────────────────────────────────────────────────────

  async getKlines(symbol, interval, limit = 500) {
    const mapKline = k => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: k[6],
      quoteVolume: parseFloat(k[7]),
      trades: k[8]
    });

    const MAX = 1000;

    if (limit <= MAX) {
      const raw = await this.get(`${BINANCE_REST}/klines`, {
        symbol: symbol.toUpperCase(), interval, limit
      });
      return raw.map(mapKline);
    }

    // Paginate backwards in time for large requests
    const all = [];
    let endTime = Date.now();
    let remaining = limit;

    while (remaining > 0) {
      const batchSize = Math.min(remaining, MAX);
      const raw = await this.get(`${BINANCE_REST}/klines`, {
        symbol: symbol.toUpperCase(), interval, limit: batchSize, endTime
      });
      if (!raw.length) break;
      const batch = raw.map(mapKline);
      all.unshift(...batch);
      endTime = batch[0].openTime - 1;
      remaining -= batch.length;
      if (batch.length < batchSize) break;
    }

    return all.slice(-limit);
  }

  // ─── Orderbook ────────────────────────────────────────────────────────────

  async getOrderBook(symbol, limit = 20) {
    const raw = await this.get(`${BINANCE_REST}/depth`, {
      symbol: symbol.toUpperCase(),
      limit
    });
    return {
      lastUpdateId: raw.lastUpdateId,
      bids: raw.bids.map(([price, qty]) => ({
        price: parseFloat(price),
        qty: parseFloat(qty)
      })),
      asks: raw.asks.map(([price, qty]) => ({
        price: parseFloat(price),
        qty: parseFloat(qty)
      }))
    };
  }

  // ─── Trades récents ───────────────────────────────────────────────────────

  async getRecentTrades(symbol, limit = 50) {
    const raw = await this.get(`${BINANCE_REST}/trades`, {
      symbol: symbol.toUpperCase(),
      limit
    });
    return raw.map(t => ({
      id: t.id,
      price: parseFloat(t.price),
      qty: parseFloat(t.qty),
      time: t.time,
      isBuyerMaker: t.isBuyerMaker
    }));
  }

  // ─── Ticker 24h ───────────────────────────────────────────────────────────

  async getTicker(symbol) {
    return await this.get(`${BINANCE_REST}/ticker/24hr`, {
      symbol: symbol.toUpperCase()
    });
  }

  async getTickers(symbols) {
    const results = await Promise.allSettled(
      symbols.map(s => this.get(`${BINANCE_REST}/ticker/24hr`, { symbol: s.toUpperCase() }))
    );
    return results.map((r, i) => {
      if (r.status === 'fulfilled') {
        const d = r.value;
        return {
          symbol: symbols[i],
          price: parseFloat(d.lastPrice),
          change: parseFloat(d.priceChangePercent),
          volume: parseFloat(d.quoteVolume),
          high: parseFloat(d.highPrice),
          low: parseFloat(d.lowPrice),
          open: parseFloat(d.openPrice)
        };
      }
      return { symbol: symbols[i], error: r.reason?.message };
    });
  }

  // ─── Futures : Funding Rate ───────────────────────────────────────────────

  async getFundingRate(symbol) {
    try {
      const data = await this.get(`${BINANCE_FUTURES_REST}/fundingRate`, {
        symbol: symbol.toUpperCase().replace('USDT', '') + 'USDT',
        limit: 1
      });
      if (data && data.length > 0) {
        return {
          symbol,
          fundingRate: parseFloat(data[0].fundingRate),
          fundingTime: data[0].fundingTime
        };
      }
      return { symbol, fundingRate: null, note: 'Pas de données futures' };
    } catch (e) {
      return { symbol, fundingRate: null, error: e.message };
    }
  }

  // ─── Futures : Open Interest ──────────────────────────────────────────────

  async getOpenInterest(symbol) {
    try {
      const data = await this.get(`${BINANCE_FUTURES_REST}/openInterest`, {
        symbol: symbol.toUpperCase()
      });
      return {
        symbol,
        openInterest: parseFloat(data.openInterest),
        time: data.time
      };
    } catch (e) {
      return { symbol, openInterest: null, error: e.message };
    }
  }

  // ─── WebSocket Streams ────────────────────────────────────────────────────

  subscribeStreams(symbol, streams, callback) {
    const sym = symbol.toLowerCase();
    const streamNames = streams.map(s => {
      switch (s) {
        case 'ticker': return `${sym}@ticker`;
        case 'kline_1m': return `${sym}@kline_1m`;
        case 'kline_5m': return `${sym}@kline_5m`;
        case 'depth': return `${sym}@depth20@100ms`;
        case 'trades': return `${sym}@trade`;
        case 'aggTrades': return `${sym}@aggTrade`;
        default: return `${sym}@${s}`;
      }
    });

    const key = `${symbol}_${streams.join('_')}`;
    if (this.activeStreams.has(key)) {
      this.activeStreams.get(key).close();
    }

    const url = `${BINANCE_WS}?streams=${streamNames.join('/')}`;
    const ws = new WebSocket(url);

    ws.on('open', () => console.log(`[Binance WS] Connecté: ${streamNames.join(', ')}`));
    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw);
        const stream = data.stream || '';
        const payload = data.data || data;

        let formatted = null;

        if (stream.includes('@ticker')) {
          formatted = {
            type: 'ticker',
            symbol,
            price: parseFloat(payload.c),
            change: parseFloat(payload.P),
            volume: parseFloat(payload.q),
            high: parseFloat(payload.h),
            low: parseFloat(payload.l),
            ts: payload.T
          };
        } else if (stream.includes('@kline')) {
          const k = payload.k;
          formatted = {
            type: 'kline',
            symbol,
            interval: k.i,
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
            isFinal: k.x,
            openTime: k.t,
            closeTime: k.T
          };
        } else if (stream.includes('@depth')) {
          formatted = {
            type: 'depth',
            symbol,
            bids: (payload.bids || []).map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) })),
            asks: (payload.asks || []).map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) }))
          };
        } else if (stream.includes('@trade') || stream.includes('@aggTrade')) {
          formatted = {
            type: 'trade',
            symbol,
            price: parseFloat(payload.p),
            qty: parseFloat(payload.q),
            isBuyerMaker: payload.m,
            time: payload.T || payload.t
          };
        }

        if (formatted) callback(formatted);
      } catch (e) {
        console.error('[Binance WS] Parse error:', e.message);
      }
    });

    ws.on('error', (e) => console.error('[Binance WS] Erreur:', e.message));
    ws.on('close', () => console.log(`[Binance WS] Fermé: ${key}`));

    this.activeStreams.set(key, ws);
    this.callbacks.set(key, callback);
  }

  unsubscribeAll() {
    this.activeStreams.forEach(ws => ws.close());
    this.activeStreams.clear();
    this.callbacks.clear();
  }
}

module.exports = { BinanceService };
