const axios = require('axios');

const BINANCE_REST = 'https://api.binance.com/api/v3';
const HL_REST      = 'https://api.hyperliquid.xyz/info';

const INTERVAL_MS = { '1h': 3600000, '4h': 14400000, '1d': 86400000 };
const PERIOD_DAYS = { '1w': 7, '1m': 30, '3m': 90, '6m': 180 };
const FEE = 0.001; // 0.1% par trade (maker/taker Binance)

// ─── Fetch klines historiques ──────────────────────────────────────────────────

async function fetchKlines(symbol, interval, days) {
  const ms      = INTERVAL_MS[interval] ?? 3600000;
  const endTime = Date.now();
  const startTime = endTime - days * 86400000;
  const limit   = Math.min(Math.ceil((endTime - startTime) / ms), 1000);

  if (symbol === 'HYPEUSDT') {
    const res = await axios.post(HL_REST, {
      type: 'candleSnapshot',
      req: { coin: 'HYPE', interval, startTime, endTime }
    }, { timeout: 15000 });
    return (res.data ?? []).map(k => ({
      openTime: k.t,
      open:  parseFloat(k.o),
      high:  parseFloat(k.h),
      low:   parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v)
    }));
  }

  const res = await axios.get(`${BINANCE_REST}/klines`, {
    params: { symbol, interval, startTime, endTime, limit },
    timeout: 15000
  });
  return res.data.map(k => ({
    openTime: k[0],
    open:  parseFloat(k[1]),
    high:  parseFloat(k[2]),
    low:   parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5])
  }));
}

// ─── Indicateurs roulants ──────────────────────────────────────────────────────

function ema(values, period) {
  const k = 2 / (period + 1);
  const result = new Array(values.length).fill(null);
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = e;
  for (let i = period; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
    result[i] = e;
  }
  return result;
}

function rsi(closes, period = 14) {
  const result = new Array(closes.length).fill(null);
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgG = gains / period, avgL = losses / period;
  result[period] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (period - 1) + Math.max(d, 0)) / period;
    avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period;
    result[i] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  }
  return result;
}

function macdLine(closes, fast = 12, slow = 26, signal = 9) {
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const macd    = closes.map((_, i) =>
    fastEma[i] != null && slowEma[i] != null ? fastEma[i] - slowEma[i] : null
  );
  const k = 2 / (signal + 1);
  const sigLine = new Array(closes.length).fill(null);
  let firstIdx = macd.findIndex(v => v != null);
  if (firstIdx === -1) return { macd, signal: sigLine, histo: sigLine };
  let s = macd.slice(firstIdx, firstIdx + signal).filter(v => v != null).reduce((a, b) => a + b, 0) / signal;
  sigLine[firstIdx + signal - 1] = s;
  for (let i = firstIdx + signal; i < closes.length; i++) {
    if (macd[i] == null) continue;
    s = macd[i] * k + s * (1 - k);
    sigLine[i] = s;
  }
  const histo = closes.map((_, i) =>
    macd[i] != null && sigLine[i] != null ? macd[i] - sigLine[i] : null
  );
  return { macd, signal: sigLine, histo };
}

// ─── Stratégie : EMA9/21 crossover + RSI filter ────────────────────────────────

function generateSignals(klines) {
  const closes = klines.map(k => k.close);
  const ema9   = ema(closes, 9);
  const ema21  = ema(closes, 21);
  const rsiArr = rsi(closes, 14);
  const { histo } = macdLine(closes);

  return klines.map((k, i) => {
    if (i < 26) return { ...k, signal: 'none', ema9: null, ema21: null, rsi: null };
    const prevCross = ema9[i - 1] != null && ema21[i - 1] != null ? ema9[i - 1] - ema21[i - 1] : 0;
    const currCross = ema9[i]     != null && ema21[i]     != null ? ema9[i]     - ema21[i]     : 0;
    const r = rsiArr[i] ?? 50;
    const h = histo[i];

    let signal = 'none';
    // Croisement haussier EMA9 > EMA21, RSI pas suracheté, MACD positif
    if (prevCross <= 0 && currCross > 0 && r < 68 && (h == null || h > 0)) signal = 'buy';
    // Croisement baissier EMA9 < EMA21, ou RSI suracheté extrême
    else if ((prevCross >= 0 && currCross < 0) || r > 78)                    signal = 'sell';

    return { ...k, signal, ema9: ema9[i], ema21: ema21[i], rsi: r };
  });
}

// ─── Simulation de trades ──────────────────────────────────────────────────────

function simulateTrades(candles, capital = 10000) {
  const trades = [];
  let position = null; // { entryPrice, entryTime, entryIndex, qty }
  let equity   = capital;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (!position && c.signal === 'buy') {
      const qty = (equity * (1 - FEE)) / c.close;
      position = { entryPrice: c.close, entryTime: c.openTime, entryIndex: i, qty };
    } else if (position && (c.signal === 'sell' || i === candles.length - 1)) {
      const gross = position.qty * c.close;
      const net   = gross * (1 - FEE);
      const pnl   = net - (position.qty * position.entryPrice * (1 + FEE)); // approx
      const pnlPct = (c.close - position.entryPrice) / position.entryPrice * 100;
      trades.push({
        entryTime:  position.entryTime,
        exitTime:   c.openTime,
        entryIndex: position.entryIndex,
        exitIndex:  i,
        entryPrice: position.entryPrice,
        exitPrice:  c.close,
        pnl:        +(pnlPct.toFixed(2)),
        pnlUSD:     +(pnl.toFixed(2)),
        duration:   Math.floor((c.openTime - position.entryTime) / 3600000) + 'h',
        isWin:      pnlPct > 0
      });
      equity = equity + pnl;
      position = null;
    }
  }

  return { trades, finalEquity: equity };
}

// ─── Métriques ─────────────────────────────────────────────────────────────────

function computeMetrics(trades, capital, finalEquity, klines) {
  if (!trades.length) return null;

  const wins   = trades.filter(t => t.isWin);
  const losses = trades.filter(t => !t.isWin);
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);

  // Drawdown max
  let peak = capital, maxDD = 0, equity = capital;
  for (const t of trades) {
    equity += t.pnlUSD;
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak * 100;
    if (dd > maxDD) maxDD = dd;
  }

  // Profit factor
  const grossProfit = wins.reduce((s, t) => s + t.pnlUSD, 0);
  const grossLoss   = Math.abs(losses.reduce((s, t) => s + t.pnlUSD, 0));
  const profitFactor = grossLoss === 0 ? Infinity : +(grossProfit / grossLoss).toFixed(2);

  // Sharpe (simplifié sur les retours des trades)
  const returns  = trades.map(t => t.pnl / 100);
  const avgR     = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdR     = Math.sqrt(returns.map(r => (r - avgR) ** 2).reduce((a, b) => a + b, 0) / returns.length);
  const sharpe   = stdR === 0 ? 0 : +((avgR / stdR) * Math.sqrt(252)).toFixed(2);

  // Buy & hold comparison
  const firstClose = klines[0].close;
  const lastClose  = klines[klines.length - 1].close;
  const buyHold    = +((lastClose - firstClose) / firstClose * 100).toFixed(2);

  return {
    totalTrades:   trades.length,
    wins:          wins.length,
    losses:        losses.length,
    winRate:       +((wins.length / trades.length * 100).toFixed(1)),
    totalReturn:   +((finalEquity - capital) / capital * 100).toFixed(2),
    totalReturnUSD: +(finalEquity - capital).toFixed(2),
    maxDrawdown:   +maxDD.toFixed(2),
    profitFactor,
    sharpe,
    avgWin:        wins.length  ? +(wins.reduce((s, t)   => s + t.pnl, 0) / wins.length).toFixed(2)   : 0,
    avgLoss:       losses.length? +(losses.reduce((s, t) => s + t.pnl, 0) / losses.length).toFixed(2) : 0,
    bestTrade:     +Math.max(...trades.map(t => t.pnl)).toFixed(2),
    worstTrade:    +Math.min(...trades.map(t => t.pnl)).toFixed(2),
    buyHoldReturn: buyHold,
    startCapital:  capital,
    finalCapital:  +finalEquity.toFixed(2),
  };
}

// ─── Point d'entrée ────────────────────────────────────────────────────────────

async function runBacktest({ symbol, interval = '1h', period = '1m' }) {
  const days    = PERIOD_DAYS[period] ?? 30;
  const klines  = await fetchKlines(symbol, interval, days);
  if (klines.length < 30) throw new Error('Données insuffisantes pour cette période');

  const candles = generateSignals(klines);
  const { trades, finalEquity } = simulateTrades(candles);
  const metrics = computeMetrics(trades, 10000, finalEquity, klines);

  return {
    symbol, interval, period,
    klines: candles.map(c => ({
      time:   Math.floor(c.openTime / 1000),
      open:   c.open, high: c.high, low: c.low, close: c.close,
      volume: c.volume, signal: c.signal
    })),
    trades,
    metrics
  };
}

module.exports = { runBacktest };
