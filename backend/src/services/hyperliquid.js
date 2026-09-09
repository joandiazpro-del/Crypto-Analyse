const axios = require('axios');
const WebSocket = require('ws');

const HL_REST = 'https://api.hyperliquid.xyz/info';
const HL_WS   = 'wss://api.hyperliquid.xyz/ws';

const INTERVAL_MS = { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1d': 86400000 };

async function post(body) {
  const res = await axios.post(HL_REST, body, { timeout: 10000 });
  return res.data;
}

class HyperLiquidService {
  constructor() {
    this.ws = null;
    this.callbacks = new Map(); // type -> callback
    this.reconnectTimer = null;
  }

  // ─── REST ──────────────────────────────────────────────────────────────────

  async getTicker(coin = 'HYPE') {
    const [mids, ctxs] = await Promise.all([
      post({ type: 'allMids' }),
      post({ type: 'metaAndAssetCtxs' })
    ]);

    const price = parseFloat(mids[coin] ?? 0);
    const meta  = ctxs[0]?.universe ?? [];
    const ctx   = (ctxs[1] ?? [])[meta.findIndex(m => m.name === coin)] ?? {};

    return {
      symbol: `${coin}USDT`,
      price,
      change: parseFloat(ctx.dayNtlVlm ? 0 : 0), // pas dispo directement
      volume: parseFloat(ctx.dayNtlVlm ?? 0),
      high:   price,
      low:    price,
      open:   price,
      fundingRate: parseFloat(ctx.funding ?? 0),
      openInterest: parseFloat(ctx.openInterest ?? 0),
      source: 'hyperliquid'
    };
  }

  async getKlines(coin = 'HYPE', interval = '1h', limit = 500) {
    const ms = INTERVAL_MS[interval] ?? 3600000;
    const endTime   = Date.now();
    const startTime = endTime - ms * limit;

    const data = await post({
      type: 'candleSnapshot',
      req: { coin, interval, startTime, endTime }
    });

    return (data ?? []).slice(-limit).map(k => ({
      openTime:    k.t,
      open:        parseFloat(k.o),
      high:        parseFloat(k.h),
      low:         parseFloat(k.l),
      close:       parseFloat(k.c),
      volume:      parseFloat(k.v),
      closeTime:   k.T,
      quoteVolume: parseFloat(k.v) * parseFloat(k.c),
      trades:      k.n ?? 0
    }));
  }

  async getRecentTrades(coin = 'HYPE', limit = 50) {
    const data = await post({ type: 'recentTrades', coin });
    return (data ?? []).slice(0, limit).map(t => ({
      id:           t.hash,
      price:        parseFloat(t.px),
      qty:          parseFloat(t.sz),
      time:         t.time,
      isBuyerMaker: t.side === 'A' // Ask = seller initiated = buyer maker
    }));
  }

  async getOrderBook(coin = 'HYPE', depth = 20) {
    const data = await post({ type: 'l2Book', coin, nSigFigs: 5 });
    const [bids, asks] = data?.levels ?? [[], []];
    return {
      bids: bids.slice(0, depth).map(l => ({ price: parseFloat(l.px), qty: parseFloat(l.sz) })),
      asks: asks.slice(0, depth).map(l => ({ price: parseFloat(l.px), qty: parseFloat(l.sz) }))
    };
  }

  // ─── WebSocket ─────────────────────────────────────────────────────────────

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(HL_WS);

    this.ws.on('open', () => {
      console.log('[HyperLiquid WS] Connecté');
      clearTimeout(this.reconnectTimer);
      // Re-subscribe to all active subscriptions
      for (const type of this.callbacks.keys()) {
        this._send(this._subMsg(type));
      }
    });

    this.ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.channel === 'trades') {
          const cb = this.callbacks.get('trades');
          if (cb) msg.data?.forEach(t => cb({
            type:         'trade',
            symbol:       'HYPEUSDT',
            price:        parseFloat(t.px),
            qty:          parseFloat(t.sz),
            isBuyerMaker: t.side === 'A',
            time:         t.time
          }));
        }
        if (msg.channel === 'l2Book') {
          const cb = this.callbacks.get('l2Book');
          if (cb) {
            const [bids, asks] = msg.data?.levels ?? [[], []];
            cb({
              type:   'depth',
              symbol: 'HYPEUSDT',
              bids:   bids.slice(0, 20).map(l => ({ price: parseFloat(l.px), qty: parseFloat(l.sz) })),
              asks:   asks.slice(0, 20).map(l => ({ price: parseFloat(l.px), qty: parseFloat(l.sz) }))
            });
          }
        }
        if (msg.channel === 'allMids') {
          const cb = this.callbacks.get('allMids');
          if (cb && msg.data?.mids?.HYPE) cb({
            type:   'ticker',
            symbol: 'HYPEUSDT',
            price:  parseFloat(msg.data.mids.HYPE),
            ts:     Date.now()
          });
        }
      } catch (e) {
        console.error('[HyperLiquid WS] Parse error:', e.message);
      }
    });

    this.ws.on('close', () => {
      console.log('[HyperLiquid WS] Déconnecté — reconnexion dans 3s');
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    });

    this.ws.on('error', () => this.ws.close());
  }

  subscribe(type, coin, callback) {
    this.callbacks.set(type, callback);
    this.connect();
    if (this.ws?.readyState === WebSocket.OPEN) {
      this._send(this._subMsg(type, coin));
    }
  }

  unsubscribeAll() {
    this.callbacks.clear();
    this.ws?.close();
    this.ws = null;
  }

  _subMsg(type, coin = 'HYPE') {
    if (type === 'trades')  return { method: 'subscribe', subscription: { type: 'trades',  coin } };
    if (type === 'l2Book')  return { method: 'subscribe', subscription: { type: 'l2Book',  coin } };
    if (type === 'allMids') return { method: 'subscribe', subscription: { type: 'allMids' } };
    return null;
  }

  _send(msg) {
    if (msg && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}

module.exports = { HyperLiquidService };
