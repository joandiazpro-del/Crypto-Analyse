const ti = require('technicalindicators');

class IndicatorService {
  computeAll(klines) {
    if (!klines || klines.length < 50) {
      return { error: 'Données insuffisantes (min 50 bougies)' };
    }

    const closes = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);
    const volumes = klines.map(k => k.volume);
    const opens = klines.map(k => k.open);

    const last = closes[closes.length - 1];

    // ─── Moyennes mobiles ───────────────────────────────────────────────────
    const sma20 = this.sma(closes, 20);
    const sma50 = this.sma(closes, 50);
    const sma200 = this.sma(closes, Math.min(200, closes.length));
    const ema9 = this.ema(closes, 9);
    const ema21 = this.ema(closes, 21);
    const ema55 = this.ema(closes, 55);

    // ─── RSI ────────────────────────────────────────────────────────────────
    const rsiValues = ti.RSI.calculate({ values: closes, period: 14 });
    const rsi = this.last(rsiValues);
    const rsi7 = this.last(ti.RSI.calculate({ values: closes, period: 7 }));

    // ─── MACD ───────────────────────────────────────────────────────────────
    const macdData = ti.MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    const macd = this.last(macdData);

    // ─── Bollinger Bands ─────────────────────────────────────────────────────
    const bbData = ti.BollingerBands.calculate({
      period: 20,
      values: closes,
      stdDev: 2
    });
    const bb = this.last(bbData);
    const bbWidth = bb ? ((bb.upper - bb.lower) / bb.middle) * 100 : null;
    const bbPos = bb ? ((last - bb.lower) / (bb.upper - bb.lower)) * 100 : null;

    // ─── Stochastique ────────────────────────────────────────────────────────
    const stochData = ti.Stochastic.calculate({
      high: highs, low: lows, close: closes,
      period: 14, signalPeriod: 3
    });
    const stoch = this.last(stochData);

    // ─── ATR ────────────────────────────────────────────────────────────────
    const atrData = ti.ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
    const atr = this.last(atrData);
    const atrPct = atr ? (atr / last) * 100 : null;

    // ─── Ichimoku ────────────────────────────────────────────────────────────
    const ichimokuData = ti.IchimokuCloud.calculate({
      high: highs, low: lows,
      conversionPeriod: 9,
      basePeriod: 26,
      spanPeriod: 52,
      displacement: 26
    });
    const ichimoku = this.last(ichimokuData);

    // ─── OBV ────────────────────────────────────────────────────────────────
    const obvData = ti.OBV.calculate({ close: closes, volume: volumes });
    const obv = this.last(obvData);
    const obvPrev = obvData.length > 1 ? obvData[obvData.length - 2] : null;
    const obvTrend = obvPrev ? (obv > obvPrev ? 'up' : 'down') : 'neutral';

    // ─── VWAP (simplifié sur la session disponible) ──────────────────────────
    const vwap = this.computeVWAP(klines);

    // ─── ADX ────────────────────────────────────────────────────────────────
    const adxData = ti.ADX.calculate({ high: highs, low: lows, close: closes, period: 14 });
    const adx = this.last(adxData);

    // ─── Williams %R ─────────────────────────────────────────────────────────
    const wrData = ti.WilliamsR.calculate({ high: highs, low: lows, close: closes, period: 14 });
    const wr = this.last(wrData);

    // ─── CCI ────────────────────────────────────────────────────────────────
    const cciData = ti.CCI.calculate({ high: highs, low: lows, close: closes, period: 20 });
    const cci = this.last(cciData);

    // ─── Volume analyse ──────────────────────────────────────────────────────
    const avgVolume20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const lastVolume = volumes[volumes.length - 1];
    const volumeRatio = avgVolume20 ? lastVolume / avgVolume20 : 1;

    // ─── Signal global ────────────────────────────────────────────────────────
    const signal = this.computeSignal({
      rsi, macd, bb, stoch, adx, ema9, ema21, ema55, sma50,
      last, ichimoku, wr, cci, obvTrend, volumeRatio
    });

    return {
      timestamp: Date.now(),
      price: last,
      movingAverages: {
        sma20, sma50, sma200, ema9, ema21, ema55,
        priceVsSma20: sma20 ? ((last - sma20) / sma20) * 100 : null,
        priceVsSma50: sma50 ? ((last - sma50) / sma50) * 100 : null,
        goldenCross: sma50 && sma200 ? sma50 > sma200 : null
      },
      oscillators: {
        rsi, rsi7, stoch,
        macd: macd ? {
          macd: macd.MACD,
          signal: macd.signal,
          histogram: macd.histogram
        } : null,
        wr, cci
      },
      bands: {
        bollinger: bb ? { upper: bb.upper, middle: bb.middle, lower: bb.lower, width: bbWidth, position: bbPos } : null
      },
      trend: {
        adx: adx ? { adx: adx.adx, pdi: adx.pdi, mdi: adx.mdi } : null,
        ichimoku: ichimoku ? {
          conversion: ichimoku.conversion,
          base: ichimoku.base,
          spanA: ichimoku.spanA,
          spanB: ichimoku.spanB,
          aboveCloud: last > Math.max(ichimoku.spanA || 0, ichimoku.spanB || 0)
        } : null
      },
      volume: {
        obv, obvTrend, vwap, volumeRatio: Math.round(volumeRatio * 100) / 100,
        avgVolume20: Math.round(avgVolume20)
      },
      volatility: {
        atr, atrPct
      },
      signal
    };
  }

  computeSignal({ rsi, macd, bb, stoch, adx, ema9, ema21, ema55, last, ichimoku, wr, cci, obvTrend, volumeRatio }) {
    let bullish = 0;
    let bearish = 0;
    const reasons = [];

    // RSI
    if (rsi !== null) {
      if (rsi < 30) { bullish += 2; reasons.push({ label: 'RSI survendu', type: 'bull' }); }
      else if (rsi < 45) { bullish += 1; reasons.push({ label: 'RSI zone achat', type: 'bull' }); }
      else if (rsi > 70) { bearish += 2; reasons.push({ label: 'RSI suracheté', type: 'bear' }); }
      else if (rsi > 55) { bearish += 1; reasons.push({ label: 'RSI zone vente', type: 'bear' }); }
    }

    // MACD
    if (macd) {
      if (macd.MACD > macd.signal && macd.histogram > 0) { bullish += 2; reasons.push({ label: 'MACD croisement haussier', type: 'bull' }); }
      else if (macd.MACD < macd.signal && macd.histogram < 0) { bearish += 2; reasons.push({ label: 'MACD croisement baissier', type: 'bear' }); }
    }

    // EMA
    if (ema9 && ema21) {
      if (ema9 > ema21 && last > ema9) { bullish += 2; reasons.push({ label: 'EMA9 > EMA21 + prix au-dessus', type: 'bull' }); }
      else if (ema9 < ema21 && last < ema9) { bearish += 2; reasons.push({ label: 'EMA9 < EMA21 + prix en dessous', type: 'bear' }); }
    }

    // Bollinger
    if (bb) {
      if (last <= bb.lower) { bullish += 1; reasons.push({ label: 'Prix sur bande Bollinger basse', type: 'bull' }); }
      else if (last >= bb.upper) { bearish += 1; reasons.push({ label: 'Prix sur bande Bollinger haute', type: 'bear' }); }
    }

    // Stoch
    if (stoch) {
      if (stoch.k < 20 && stoch.d < 20) { bullish += 1; reasons.push({ label: 'Stoch survendu', type: 'bull' }); }
      else if (stoch.k > 80 && stoch.d > 80) { bearish += 1; reasons.push({ label: 'Stoch suracheté', type: 'bear' }); }
    }

    // Ichimoku
    if (ichimoku) {
      const cloudTop = Math.max(ichimoku.spanA || 0, ichimoku.spanB || 0);
      const cloudBot = Math.min(ichimoku.spanA || 0, ichimoku.spanB || 0);
      if (last > cloudTop) { bullish += 2; reasons.push({ label: 'Prix au-dessus du nuage Ichimoku', type: 'bull' }); }
      else if (last < cloudBot) { bearish += 2; reasons.push({ label: 'Prix sous le nuage Ichimoku', type: 'bear' }); }
    }

    // Williams %R
    if (wr !== null) {
      if (wr < -80) { bullish += 1; reasons.push({ label: 'Williams %R survendu', type: 'bull' }); }
      else if (wr > -20) { bearish += 1; reasons.push({ label: 'Williams %R suracheté', type: 'bear' }); }
    }

    // OBV
    if (obvTrend === 'up') { bullish += 1; reasons.push({ label: 'OBV haussier', type: 'bull' }); }
    else if (obvTrend === 'down') { bearish += 1; reasons.push({ label: 'OBV baissier', type: 'bear' }); }

    // Volume
    if (volumeRatio > 1.5) { reasons.push({ label: `Volume élevé (×${volumeRatio.toFixed(1)})`, type: 'neutral' }); }

    const total = bullish + bearish;
    const score = total > 0 ? Math.round(((bullish - bearish) / total) * 100) : 0;
    const netScore = bullish - bearish;

    let action, strength;
    if (netScore >= 5) { action = 'ACHETER'; strength = 'Fort'; }
    else if (netScore >= 2) { action = 'ACHETER'; strength = 'Modéré'; }
    else if (netScore <= -5) { action = 'VENDRE'; strength = 'Fort'; }
    else if (netScore <= -2) { action = 'VENDRE'; strength = 'Modéré'; }
    else { action = 'NEUTRE'; strength = 'Faible'; }

    return { action, strength, bullish, bearish, score, netScore, reasons };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  sma(values, period) {
    if (values.length < period) return null;
    const slice = values.slice(-period);
    return Math.round((slice.reduce((a, b) => a + b, 0) / period) * 100) / 100;
  }

  ema(values, period) {
    const data = ti.EMA.calculate({ values, period });
    return this.last(data);
  }

  last(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[arr.length - 1];
  }

  computeVWAP(klines) {
    let cumTP = 0, cumVol = 0;
    klines.forEach(k => {
      const tp = (k.high + k.low + k.close) / 3;
      cumTP += tp * k.volume;
      cumVol += k.volume;
    });
    return cumVol > 0 ? Math.round((cumTP / cumVol) * 100) / 100 : null;
  }
}

module.exports = { IndicatorService };
