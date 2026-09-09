const Parser = require('rss-parser');
const Anthropic = require('@anthropic-ai/sdk');

const parser = new Parser({ timeout: 10000, headers: { 'User-Agent': 'CryptoTerminal/1.0' } });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FEEDS = [
  { name: 'CoinDesk',      url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss' },
  { name: 'Decrypt',       url: 'https://decrypt.co/feed' },
  { name: 'Bitcoinist',    url: 'https://bitcoinist.com/feed/' },
  { name: 'NewsBTC',       url: 'https://www.newsbtc.com/feed/' },
  { name: 'CryptoSlate',   url: 'https://cryptoslate.com/feed/' },
];

// Mots-clés par symbole pour le filtrage
const COIN_KEYWORDS = {
  BTCUSDT:  ['bitcoin', 'btc'],
  ETHUSDT:  ['ethereum', 'eth', 'ether'],
  SOLUSDT:  ['solana', 'sol'],
  DOGEUSDT: ['dogecoin', 'doge'],
  ADAUSDT:  ['cardano', 'ada'],
  XRPUSDT:  ['ripple', 'xrp'],
  SUIUSDT:  ['sui'],
  AVAXUSDT: ['avalanche', 'avax'],
  PAXGUSDT: ['paxos', 'paxg', 'gold'],
  HYPEUSDT: ['hyperliquid', 'hype'],
};

// Cache en mémoire : { symbol -> { items, fetchedAt } }
const newsCache = new Map();
// Cache sentiment : { cacheKey -> { result, generatedAt } }
const sentimentCache = new Map();

const NEWS_TTL    = 5 * 60 * 1000;  // 5 min
const SENT_TTL    = 10 * 60 * 1000; // 10 min

async function fetchFeed(feed) {
  try {
    const data = await parser.parseURL(feed.url);
    return (data.items ?? []).slice(0, 30).map(item => ({
      source: feed.name,
      title:  item.title?.trim() ?? '',
      url:    item.link ?? item.guid ?? '',
      date:   item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      summary: item.contentSnippet?.slice(0, 200) ?? ''
    }));
  } catch (e) {
    console.error(`[News] Erreur ${feed.name}: ${e.message}`);
    return [];
  }
}

function matchesCoin(item, keywords) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  return keywords.some(kw => text.includes(kw));
}

async function getNews(symbol) {
  const keywords = COIN_KEYWORDS[symbol] ?? [symbol.replace('USDT', '').toLowerCase()];

  const cached = newsCache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < NEWS_TTL) {
    return cached.items;
  }

  // Récupérer tous les feeds en parallèle
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const all = results.flat();

  // Filtrer par coin + dédupliquer par URL
  const seen = new Set();
  const filtered = all
    .filter(item => {
      if (!item.title || seen.has(item.url)) return false;
      seen.add(item.url);
      return matchesCoin(item, keywords);
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);

  newsCache.set(symbol, { items: filtered, fetchedAt: Date.now() });
  return filtered;
}

async function analyzeSentiment(symbol, newsItems) {
  if (!newsItems.length) {
    return { score: 0, label: 'neutral', summary: 'Aucune news récente disponible.', generatedAt: Date.now() };
  }

  const cacheKey = `${symbol}_${newsItems.slice(0, 5).map(n => n.url).join('|')}`;
  const cached = sentimentCache.get(cacheKey);
  if (cached && Date.now() - cached.generatedAt < SENT_TTL) {
    return cached;
  }

  const headlines = newsItems.slice(0, 10)
    .map((n, i) => `${i + 1}. [${n.source}] ${n.title}`)
    .join('\n');

  const prompt = `Tu es un expert en analyse de sentiment crypto. Analyse ces ${Math.min(newsItems.length, 10)} headlines récentes sur ${symbol.replace('USDT', '')} et génère une évaluation du sentiment du marché.

HEADLINES :
${headlines}

Réponds UNIQUEMENT en JSON valide :
{
  "score": -100 à 100 (négatif=bearish, positif=bullish, 0=neutre),
  "label": "very_bullish" | "bullish" | "neutral" | "bearish" | "very_bearish",
  "summary": "Résumé en 2-3 phrases du sentiment général basé sur ces news",
  "keyTheme": "Le thème dominant de l'actualité en 5-8 mots",
  "topBullish": "La news la plus bullish (titre court)",
  "topBearish": "La news la plus bearish (titre court) ou null"
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Réponse invalide');

    const result = { ...JSON.parse(match[0]), generatedAt: Date.now() };
    sentimentCache.set(cacheKey, result);
    return result;
  } catch (e) {
    console.error('[News] Sentiment error:', e.message);
    return { score: 0, label: 'neutral', summary: 'Analyse indisponible.', generatedAt: Date.now() };
  }
}

module.exports = { getNews, analyzeSentiment };
