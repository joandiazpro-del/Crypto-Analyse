const axios = require('axios');

const COINGECKO_REST = 'https://api.coingecko.com/api/v3';

const COINGECKO_FALLBACK = {
  'HYPEUSDT': 'hyperliquid'
};

class CoinGeckoService {
  async getTicker(binanceSymbol) {
    const cgId = COINGECKO_FALLBACK[binanceSymbol];
    if (!cgId) return null;

    try {
      const res = await axios.get(`${COINGECKO_REST}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          ids: cgId
        },
        timeout: 10000
      });

      if (!res.data || res.data.length === 0) return null;
      const d = res.data[0];

      return {
        symbol: binanceSymbol,
        price: d.current_price,
        change: d.price_change_percentage_24h,
        volume: d.total_volume,
        high: d.high_24h,
        low: d.low_24h,
        open: d.current_price - (d.price_change_24h || 0),
        source: 'coingecko'
      };
    } catch (e) {
      const status = e.response?.status;
      const body = e.response?.data;
      console.error(`[CoinGecko] getTicker error for ${binanceSymbol}: HTTP ${status ?? 'N/A'} — ${e.message}`, body ?? '');
      return null;
    }
  }

  async getKlines(binanceSymbol, interval, limit = 200) {
    const cgId = COINGECKO_FALLBACK[binanceSymbol];
    if (!cgId) return null;

    try {
      const days = intervalToDays(interval);

      const res = await axios.get(`${COINGECKO_REST}/coins/${cgId}/market_chart`, {
        params: { vs_currency: 'usd', days },
        timeout: 10000
      });

      if (!res.data || !res.data.prices) return [];

      const prices = res.data.prices;
      const volumes = res.data.total_volumes || [];

      return prices.slice(-limit).map((p, i) => {
        const vol = volumes[i] ? volumes[i][1] : 0;
        const price = p[1];
        return {
          openTime: p[0],
          open: price,
          high: price * 1.001,
          low: price * 0.999,
          close: price,
          volume: vol,
          closeTime: p[0] + 60000,
          quoteVolume: vol,
          trades: 0
        };
      });
    } catch (e) {
      console.error('[CoinGecko] getKlines error:', e.message);
      return [];
    }
  }

  isFallback(symbol) {
    return !!COINGECKO_FALLBACK[symbol];
  }
}

function intervalToDays(interval) {
  const map = { '1m': 1, '5m': 1, '15m': 1, '1h': 7, '4h': 30, '1d': 90 };
  return map[interval] || 7;
}

module.exports = { CoinGeckoService };