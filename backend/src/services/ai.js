const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROFILES = {
  conservative: {
    trader: 'Stan Weinstein',
    rrMin: '1:1.5',
    positionSize: '1-2%',
    philosophy: `Tu analyses les marchés comme Stan Weinstein. Tu ne trades QUE en Stage 2 (tendance haussière confirmée).
Tu exiges : cours au-dessus de la SMA30 semaine, volume croissant sur la sortie de base, RS relative positive.
Tu refuses tout trade en Stage 1 (accumulation), Stage 3 (distribution) ou Stage 4 (déclin).
Tu cherches des breakouts de bases de 3 semaines minimum avec volume x1.5 au moins.
Le SL est TOUJOURS placé sous le bas de la base. Tu ne pyramides jamais un trade perdant.
Sur un SHORT : tu ne shortes que les actifs en Stage 4 clair (tendance baissière établie), jamais contre une tendance haussière.`,
    rules: [
      'Stage 2 uniquement pour les LONG — cours au-dessus de la MA30W',
      'Stage 4 uniquement pour les SHORT — cours sous la MA30W avec volume de distribution',
      'Volume croissant obligatoire sur la sortie de base',
      'RS (Relative Strength) positive vs Bitcoin pour LONG, négative pour SHORT',
      'SL sous le bas de la base (LONG) ou au-dessus de la résistance (SHORT)',
      'Ne jamais moyenner à la baisse',
    ]
  },
  moderate: {
    trader: 'Mark Minervini',
    rrMin: '1:2.5',
    positionSize: '5-8%',
    philosophy: `Tu analyses les marchés avec la stratégie SEPA de Mark Minervini (Specific Entry Point Analysis).
Tu exiges les 8 critères : tendance haussière sur 4 timeframes, RS > 90, prix au-dessus des MA,
contraction de volatilité avant breakout, catalyseur fondamental, volume x2 sur le breakout,
biais sectoriel positif, pattern chartiste propre (VCP, flat base, cup & handle).
Tu places le SL sous le pivot ou sous la MA10J. Tu vises des moves de 20-40%.
Pour un SHORT : tu identifies les pattern de distribution (head & shoulders, double top, dead cat bounce) avec volume de distribution.`,
    rules: [
      'Contraction de volatilité (VCP) avant l\'entrée LONG',
      'Volume x2 minimum sur le breakout',
      'Tendance confirmée sur 4 timeframes',
      'RS > 90ème percentile vs le marché pour LONG, < 10ème pour SHORT',
      'SL sous le pivot (LONG) ou au-dessus de la résistance (SHORT)',
    ]
  },
  aggressive: {
    trader: 'Paul Tudor Jones & Jesse Livermore',
    rrMin: '1:5',
    positionSize: '8-15%',
    philosophy: `Tu combines la discipline de Paul Tudor Jones (suivre le momentum avec une gestion du risque rigoureuse)
et l'instinct de Jesse Livermore (identifier les points pivots, lire le tape, sentir les mouvements avant qu'ils n'arrivent).
Tu cherches des moves de 20-50%+. Tu entres en force sur les breakouts avec momentum, tu pyramides agressivement
sur les gagnants, et tu coupes IMMÉDIATEMENT les perdants sans hésitation.
Tu trades dans LES DEUX DIRECTIONS. Livermore shortait agressivement les marchés en baisse.
Tu identifies la ligne de moindre résistance — si le marché veut baisser, tu shortes sans hésitation.`,
    rules: [
      'Momentum fort et accéléré dans la direction du trade',
      'Pyramider sur les positions gagnantes uniquement',
      'Couper immédiatement si le prix revient sur le point d\'entrée',
      'Chercher les moves de 20-50% minimum, dans les deux directions',
      'Identifier la ligne de moindre résistance : haussière ou baissière',
    ]
  },
  extreme: {
    trader: 'Larry Williams & Michael Burry',
    rrMin: '1:10',
    positionSize: '10-20%',
    philosophy: `Tu combines la recherche de setups asymétriques de Larry Williams (cycles, COT, timing précis)
et la conviction absolue de Michael Burry (thèse d'investissement profonde, position concentrée, tenir face à la pression).
Tu cherches des setups RARES — peut-être 1 ou 2 par mois — avec un potentiel de x5 à x20.
Michael Burry est célèbre pour ses shorts massifs (Big Short). Tu n'hésites pas à shorter quand la thèse est béton.
Tu accepts un SL total sur une petite partie du portfolio si la thèse est solide.
Si le setup n'est pas EXCEPTIONNEL dans une direction, tu dis ATTENDRE et tu attends.`,
    rules: [
      'Setup asymétrique rare : potentiel x5 minimum, LONG ou SHORT',
      'Thèse claire que le marché n\'a pas encore pricée',
      'Burry shorted quand tout le monde était long — cherche les excès de conviction',
      'Accepter SL total sur la position si la thèse est bonne',
      'Patience absolue — attendre le setup parfait, dans les deux sens',
    ]
  }
};

async function analyze(symbol, interval, marketData, riskProfile = 'moderate', capitalData = null) {
  const profile = PROFILES[riskProfile] ?? PROFILES.moderate;
  const { indicators, ticker, fundingRate, openInterest } = marketData;
  const isHYPE = symbol === 'HYPEUSDT';

  // Pré-calculs capital pour alléger la charge cognitive de Claude
  let capitalSection = '';
  if (capitalData?.capital > 0) {
    const cap = Number(capitalData.capital);
    const obj = capitalData.objective > 0 ? Number(capitalData.objective) : null;
    const objRatioPct = obj ? ((obj / cap) * 100).toFixed(1) : null;
    const isRevenge = obj ? (obj / cap) > 0.15 : false;

    capitalSection = `
═══════════════════════════════════════════
OBJECTIF FINANCIER DU TRADER
═══════════════════════════════════════════

Capital disponible : ${cap}€
${obj ? `Objectif de bénéfice : ${obj}€ (${objRatioPct}% du capital en un seul trade)` : 'Objectif de bénéfice : non spécifié — calcule les gains réalistes'}
${isRevenge ? `⚠️  ATTENTION : L'objectif représente ${objRatioPct}% du capital en un seul trade — dépasse le seuil de 15% qui est statistiquement un signe de revenge trading ou de sur-exposition.` : ''}

Tu dois calculer et inclure dans le JSON le champ "capitalAnalysis" avec :

1. Les gains attendus avec ${cap}€ investi sur ce trade (sans levier) :
   - Pour un LONG  : gain_TP = capital × (TP_price − entry_price) / entry_price
   - Pour un SHORT : gain_TP = capital × (entry_price − TP_price) / entry_price
   Formater chaque gain : "X€ (+Y%)" où Y% = variation entre entry et TP

2. ${obj ? `La taille de position nécessaire pour atteindre ${obj}€ sur TP1 :
   position_nécessaire = ${obj} / ((|TP1 - entry|) / entry)
   Si cette taille dépasse ${cap}€, l'objectif est irréaliste sans levier.` : 'La taille de position recommandée (maximum = capital disponible).'}

3. ${isRevenge ? `revengeTradingWarning = true avec un message personnalisé mentionnant que viser ${obj}€ (${objRatioPct}% du capital) en un trade est risqué.` : 'revengeTradingWarning = false'}

4. objectiveRealistic : ${obj ? `true si la taille de position nécessaire ≤ ${cap}€, false sinon` : 'true (pas d\'objectif spécifié)'}`;
  }

  const fundingPct = fundingRate?.fundingRate != null ? (fundingRate.fundingRate * 100).toFixed(4) : null;
  const fundingOverheated = fundingRate?.fundingRate != null && Math.abs(fundingRate.fundingRate) > 0.001;

  const prompt = `Tu es un analyste crypto expert qui raisonne exactement comme ${profile.trader}.

═══════════════════════════════════════════
PROFIL DE RISQUE : ${riskProfile.toUpperCase()}
TRADER DE RÉFÉRENCE : ${profile.trader}
RISK/REWARD MINIMUM : ${profile.rrMin}
TAILLE DE POSITION : ${profile.positionSize} du portfolio
═══════════════════════════════════════════

PHILOSOPHIE DE ${profile.trader.toUpperCase()} :
${profile.philosophy}

RÈGLES ABSOLUES pour ce profil :
${profile.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

═══════════════════════════════════════════
DONNÉES DE MARCHÉ — ${symbol} (${interval})
═══════════════════════════════════════════

PRIX & VOLUMES
Prix actuel     : ${ticker?.price} USDT
Variation 24h   : ${ticker?.change?.toFixed(2)}%
Volume 24h      : $${ticker?.volume?.toLocaleString()}
Haut 24h        : ${ticker?.high} | Bas 24h : ${ticker?.low}
${fundingPct != null ? `Funding Rate    : ${fundingPct}% ${fundingOverheated ? '⚠️ ÉLEVÉ — marché sur-leveragé' : ''}` : ''}
${openInterest?.openInterest ? `Open Interest   : ${openInterest.openInterest.toLocaleString()}` : ''}

OSCILLATEURS
RSI 14          : ${indicators?.oscillators?.rsi?.toFixed(2)} | RSI 7 : ${indicators?.oscillators?.rsi7?.toFixed(2)}
MACD            : ${indicators?.oscillators?.macd?.macd?.toFixed(4)} | Signal : ${indicators?.oscillators?.macd?.signal?.toFixed(4)} | Histo : ${indicators?.oscillators?.macd?.histogram?.toFixed(4)}
Stoch %K        : ${indicators?.oscillators?.stoch?.k?.toFixed(2)} | %D : ${indicators?.oscillators?.stoch?.d?.toFixed(2)}
Williams %R     : ${indicators?.oscillators?.wr?.toFixed(2)}
CCI             : ${indicators?.oscillators?.cci?.toFixed(2)}

MOYENNES MOBILES
SMA 20          : ${indicators?.movingAverages?.sma20} | SMA 50 : ${indicators?.movingAverages?.sma50} | SMA 200 : ${indicators?.movingAverages?.sma200}
EMA 9           : ${indicators?.movingAverages?.ema9} | EMA 21 : ${indicators?.movingAverages?.ema21}
Prix vs SMA20   : ${indicators?.movingAverages?.priceVsSma20?.toFixed(2)}%
MA Trend        : ${indicators?.movingAverages?.goldenCross ? 'Golden Cross (SMA50 > SMA200)' : 'Death Cross (SMA50 < SMA200)'}

STRUCTURE & VOLATILITÉ
Bollinger Width : ${indicators?.bands?.bollinger?.width?.toFixed(2)}% | Position : ${indicators?.bands?.bollinger?.position?.toFixed(1)}%
ADX             : ${indicators?.trend?.adx?.adx?.toFixed(2)} | +DI : ${indicators?.trend?.adx?.pdi?.toFixed(2)} | -DI : ${indicators?.trend?.adx?.mdi?.toFixed(2)}
Ichimoku        : ${indicators?.trend?.ichimoku?.aboveCloud ? 'Au-dessus du nuage' : 'En dessous du nuage'}
ATR             : ${indicators?.volatility?.atr?.toFixed(4)} (${indicators?.volatility?.atrPct?.toFixed(2)}% du prix)

VOLUME & MOMENTUM
OBV Tendance    : ${indicators?.volume?.obvTrend} | VWAP : $${indicators?.volume?.vwap}
Ratio Volume    : ${indicators?.volume?.volumeRatio}× la moyenne 20 bougies

SIGNAL ALGORITHMIQUE
Signal          : ${indicators?.signal?.action} (${indicators?.signal?.strength}) | Score : ${indicators?.signal?.netScore}
Raisons :
${indicators?.signal?.reasons?.map(r => `  [${r.type === 'bull' ? 'BULL' : r.type === 'bear' ? 'BEAR' : 'NEUTRAL'}] ${r.label}`).join('\n') ?? '  Aucune'}
${capitalSection}
${isHYPE ? `
AVERTISSEMENT HYPE : Token très volatil avec une liquidité moindre que BTC/ETH.
Les shorts sur HYPE peuvent se faire liquider très rapidement sur des spikes.
Le risque de short squeeze est structurellement plus élevé sur HYPE que sur d'autres cryptos.
Mentionne ce risque explicitement si tu identifies un setup SHORT.` : ''}

═══════════════════════════════════════════
PROCESSUS D'ANALYSE OBLIGATOIRE — LES DEUX DIRECTIONS
═══════════════════════════════════════════

Tu dois obligatoirement évaluer les deux directions avant de conclure.

ÉTAPE 1 — SETUP LONG : Est-ce que ${profile.trader} prendrait un long ici ?
- La structure de marché est-elle haussière (higher highs, higher lows) ?
- Le prix est-il au-dessus de ses MAs clés ?
- Y a-t-il un pattern chartiste d'achat valable ?
- Quels supports soutiennent un long ? Où placer le SL sous un support ?

ÉTAPE 2 — SETUP SHORT : Est-ce qu'un short est viable ?
- Y a-t-il une structure baissière (lower highs, distribution, rejection de résistance) ?
- Le funding rate est-il très positif → marché sur-leveragé en long → opportunité short ?
- Y a-t-il des longs à liquider sous une zone de support clé ?
- RISQUE DE SHORT SQUEEZE : si beaucoup de positions short ouvertes et prix qui monte, le short peut être douloureux
- Pour le SHORT : SL au-dessus d'une résistance clé (SL > entryPrice), TP vers le bas (TP < entryPrice)
  Si entryPrice = 100 : TP1 = 95, TP2 = 88, TP3 = 78 (chaque TP est plus bas que le précédent)

ÉTAPE 3 — SIGNAL FINAL selon ${profile.trader} :
- LONG_FORT  : Setup haussier exceptionnel, haute conviction, RR exceptionnel. Maximum 1-2 fois par semaine.
- LONG       : Setup haussier valable selon la philosophie de ${profile.trader}
- ATTENDRE   : Aucun setup clair, ou risque trop élevé dans les deux directions
- SHORT      : Setup baissier valable, avec résistance claire et momentum négatif
- SHORT_FORT : Setup baissier exceptionnel, opportunité rare en haute conviction

Les TP doivent être cohérents avec le profil :
- Conservative : TP réaliste, ±5% à ±15%
- Moderate : TP significatif, ±15% à ±40%
- Aggressive : TP fort, ±30% à ±80%
- Extreme : TP asymétrique, ±100% à ±500%

═══════════════════════════════════════════
RÉPONSE JSON REQUISE
═══════════════════════════════════════════

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "signal": "LONG" | "SHORT" | "ATTENDRE" | "LONG_FORT" | "SHORT_FORT",
  "direction": "bullish" | "bearish" | "neutral",
  "entryPrice": number,
  "confidence": 0-100,
  "riskProfile": "${riskProfile}",
  "traderStyle": "${profile.trader}",
  "setupType": "breakout" | "retracement" | "reversal" | "trend_follow" | "distribution" | "short_squeeze_setup" | "liquidation_chasse" | "none",
  "timeHorizon": "Court terme (1-4h)" | "Moyen terme (1-3j)" | "Long terme (1-2s)",
  "summary": "Résumé en 2-3 phrases précises avec la direction et le raisonnement",
  "philosophy": "En 2 phrases : pourquoi ${profile.trader} prendrait ou refuserait ce trade spécifiquement",
  "bullishPoints": ["point 1", "point 2", "point 3"],
  "bearishPoints": ["point 1", "point 2", "point 3"],
  "catalyst": "Quel niveau ou événement déclencherait le move",
  "liquidityTarget": "Zone de liquidité visée par les market makers",
  "keyLevels": {
    "support1": number,
    "support2": number,
    "resistance1": number,
    "resistance2": number
  },
  "longSetup": {
    "viable": true | false,
    "reason": "Explication courte pourquoi le long est viable ou pas en ce moment"
  },
  "shortSetup": {
    "viable": true | false,
    "reason": "Explication courte pourquoi le short est viable ou pas — mentionner résistance, momentum, structure",
    "squeezeRisk": "élevé" | "moyen" | "faible"
  },
  "positionSize": "${profile.positionSize} du portfolio",
  "riskReward": "1:X",
  "stopLoss": number,
  "takeProfit1": number,
  "takeProfit2": number,
  "takeProfit3": number,
  "warning": "Avertissement critique si applicable (squeeze, liquidité, événement macro)" | null${capitalData?.capital > 0 ? `,
  "capitalAnalysis": {
    "capitalAvailable": ${Number(capitalData.capital)},
    "objectiveRequested": ${capitalData.objective > 0 ? Number(capitalData.objective) : null},
    "objectiveRealistic": true | false,
    "realisticGain": {
      "tp1": "X€ (+Y%)",
      "tp2": "X€ (+Y%)",
      "tp3": "X€ (+Y%)"
    },
    "positionSizeNeeded": "Xeur pour atteindre l'objectif sur TP1" | null,
    "positionSizeRecommended": "Xeur max (100% du capital disponible)",
    "revengeTradingWarning": true | false,
    "revengeTradingMessage": "Message personnalisé si warning" | null
  }` : ''}
}

${capitalData?.capital > 0 ? 'IMPORTANT : Tu DOIS inclure le champ capitalAnalysis dans ta réponse JSON avec les calculs demandés.' : ''}
RAPPEL ÉTHIQUE : Dans capitalAnalysis, ne jamais encourager à investir plus que le capital disponible. Toujours rappeler que ces calculs sont indicatifs.

RAPPEL CRITIQUE pour les niveaux SHORT :
- stopLoss DOIT être SUPÉRIEUR à entryPrice (ex: entrée à 100, SL à 105)
- takeProfit1 DOIT être INFÉRIEUR à entryPrice (ex: entrée à 100, TP1 à 95)
- takeProfit2 < takeProfit1 (encore plus bas)
- takeProfit3 < takeProfit2 (objectif maximum vers le bas)`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1800,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Réponse IA invalide');

  return {
    analysis: JSON.parse(jsonMatch[0]),
    generatedAt: Date.now(),
    model: 'claude-sonnet-4-6'
  };
}

// ─── Scanner global ────────────────────────────────────────────────────────────

async function scanMarket(coinsData, riskProfile = 'moderate', options = {}) {
  const profile = PROFILES[riskProfile] ?? PROFILES.moderate;
  const { capitalAvailable, objectiveGain } = options;

  const coinSummaries = coinsData.map(({ symbol, ticker, indicators: ind }) => {
    const name = symbol.replace('USDT', '');
    if (!ind || ticker?.price == null) return `${name}: données indisponibles`;
    const rsi     = ind.oscillators?.rsi?.toFixed(1);
    const macdH   = ind.oscillators?.macd?.histogram?.toFixed(5);
    const ema9    = ind.movingAverages?.ema9;
    const ema21   = ind.movingAverages?.ema21;
    const emaSig  = ema9 && ema21 ? (ema9 > ema21 ? 'EMA9>EMA21' : 'EMA9<EMA21') : '';
    const adx     = ind.trend?.adx?.adx?.toFixed(1);
    const pdi     = ind.trend?.adx?.pdi?.toFixed(1);
    const mdi     = ind.trend?.adx?.mdi?.toFixed(1);
    const bbPos   = ind.bands?.bollinger?.position?.toFixed(1);
    const atrPct  = ind.volatility?.atrPct?.toFixed(2);
    const sig     = ind.signal;
    const vwap    = ind.volume?.vwap;
    return `${name} | $${ticker.price} (${ticker.change?.toFixed(2) ?? 0}% 24h) | Vol:$${((ticker.volume ?? 0)/1e6).toFixed(1)}M
  RSI:${rsi} MACD_h:${macdH} ${emaSig} | ADX:${adx}(+${pdi}/-${mdi}) | BB:${bbPos}% ATR:${atrPct}% | VWAP:$${vwap}
  Signal:${sig?.action}(${sig?.strength}) score:${sig?.netScore}`;
  }).join('\n\n');

  const capLine = capitalAvailable
    ? `\nCapital: ${capitalAvailable}€ | Objectif: ${objectiveGain ? objectiveGain + '€' : 'non spécifié'}`
    : '';

  const prompt = `Tu es un trader professionnel qui scanne le marché crypto.
Profil: ${riskProfile.toUpperCase()} — ${profile.trader}${capLine}
Philosophie: ${profile.philosophy.split('\n')[0]}

═══ DONNÉES 10 COINS — Timeframe 1h ═══

${coinSummaries}

═══ TA MISSION ═══

1. Identifier les 1 à 3 meilleurs setups RIGHT NOW (long ou short) selon ${profile.trader}
2. Lister les coins à surveiller dans les prochaines heures
3. Lister les coins à ignorer aujourd'hui
4. Pour chaque opportunité : direction, raison, entry/SL/TP1/2/3
5. Conclusion en une phrase directe et actionnable

RÈGLES :
- Si rien ne vaut le coup, dis-le : bestTrade = null, conclusion = "Aucune opportunité"
- Ne force aucun setup médiocre
- SHORT : SL > entry, TP1 < entry, TP2 < TP1, TP3 < TP2
- LONG  : SL < entry, TP1 > entry, TP2 > TP1, TP3 > TP2
- urgency: "now" (trade immédiat), "watch" (attendre confirmation), "wait" (pas encore)
- marketMood: "bullish" / "bearish" / "uncertain"${capitalAvailable ? `
- gainEstimate: calculer les gains sur TP1 avec ${capitalAvailable}€ investi (ex: "+23€ sur TP1")` : ''}

Réponds UNIQUEMENT en JSON valide :
{
  "marketMood": "bullish" | "bearish" | "uncertain",
  "marketSummary": "Une phrase sur l'état général du marché",
  "bestTrade": {
    "symbol": "BTCUSDT",
    "direction": "LONG" | "SHORT",
    "conviction": 0-100,
    "reason": "2-3 phrases max",
    "entry": number,
    "sl": number,
    "tp1": number,
    "tp2": number,
    "tp3": number,
    "riskReward": "1:X",
    "urgency": "now" | "watch" | "wait",
    "gainEstimate": ${capitalAvailable ? '"Ex: +23€ sur TP1"' : 'null'}
  } | null,
  "opportunities": [
    { "symbol": "ETHUSDT", "direction": "LONG" | "SHORT", "conviction": 0-100, "reason": "1-2 phrases", "entry": number, "sl": number, "tp1": number, "urgency": "now" | "watch" | "wait" }
  ],
  "watchlist": [
    { "symbol": "SOLUSDT", "reason": "Pourquoi surveiller", "triggerLevel": number, "triggerCondition": "Si prix fait X → opportunité Y" }
  ],
  "avoid": ["DOGEUSDT"],
  "avoidReason": "Raison courte",
  "conclusion": "Le meilleur trade disponible right now est... (ou aucune opportunité si c'est le cas)"
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Réponse scanner invalide');

  return {
    scan:       JSON.parse(jsonMatch[0]),
    scannedAt:  Date.now(),
    profile:    riskProfile,
    model:      'claude-sonnet-4-6'
  };
}

class AIService {
  analyze(symbol, interval, marketData, riskProfile, capitalData) {
    return analyze(symbol, interval, marketData, riskProfile, capitalData);
  }
  scanMarket(coinsData, riskProfile, options) {
    return scanMarket(coinsData, riskProfile, options);
  }
}

module.exports = { AIService };
