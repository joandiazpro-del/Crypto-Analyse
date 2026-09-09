import React, { useState } from 'react';
import { BookOpen, Search, ChevronDown, ChevronRight, Activity, TrendingUp, BarChart2, Compass, DollarSign, Brain, AlertTriangle } from 'lucide-react';

const GLOSSARY = [
  {
    category: 'Indicateurs de momentum',
    Icon: Activity,
    color: '#00d4ff',
    items: [
      {
        term: 'RSI — Relative Strength Index',
        short: 'Mesure si un actif est suracheté ou survendu.',
        detail: `Le RSI oscille entre 0 et 100.
• > 70 → Suracheté : le prix a trop monté trop vite, risque de correction.
• < 30 → Survendu : le prix a trop baissé, possible rebond.
• Entre 30 et 70 → Zone neutre.

Comment l'utiliser : attends que le RSI sorte des zones extrêmes pour confirmer un signal. Un RSI qui revient sous 70 après l'avoir dépassé peut signaler une vente. Un RSI qui repasse au-dessus de 30 peut signaler un achat.

⚠️ Le RSI peut rester en zone surachetée longtemps en tendance forte. Ne pas vendre uniquement parce que le RSI est > 70.`,
      },
      {
        term: 'MACD — Moving Average Convergence Divergence',
        short: 'Mesure la relation entre deux moyennes mobiles pour détecter les changements de tendance.',
        detail: `Le MACD se compose de 3 éléments :
• Ligne MACD : différence entre EMA12 et EMA26.
• Ligne Signal : EMA9 de la ligne MACD.
• Histogramme : différence entre MACD et Signal.

Signaux :
• Croisement haussier : MACD passe au-dessus de la ligne Signal → achat potentiel.
• Croisement baissier : MACD passe en dessous de la ligne Signal → vente potentielle.
• Histogramme positif et croissant → momentum haussier fort.
• Histogramme négatif et décroissant → momentum baissier fort.

⚠️ Le MACD est un indicateur retardé — il confirme une tendance plutôt que de la prédire.`,
      },
      {
        term: 'Stochastique %K / %D',
        short: 'Compare le prix de clôture à sa fourchette récente pour détecter les extrêmes.',
        detail: `Le Stochastique oscille entre 0 et 100.
• %K : ligne rapide (stochastique brut sur 14 périodes).
• %D : moyenne lissée de %K sur 3 périodes.

Signaux :
• > 80 → Suracheté.
• < 20 → Survendu.
• %K croise %D par le haut en zone survendue → signal d'achat.
• %K croise %D par le bas en zone surachetée → signal de vente.

⚠️ Très sensible aux fluctuations. Utilise-le avec d'autres indicateurs pour filtrer les faux signaux.`,
      },
      {
        term: 'Williams %R',
        short: 'Variante inverse du Stochastique, mesure les niveaux extrêmes de prix.',
        detail: `Oscille entre -100 et 0.
• > -20 → Suracheté (proche de 0).
• < -80 → Survendu (proche de -100).

Inverse du Stochastique : une valeur proche de 0 signifie que le cours est proche de son plus haut récent.`,
      },
      {
        term: 'CCI — Commodity Channel Index',
        short: 'Mesure l\'écart du prix par rapport à sa moyenne statistique.',
        detail: `Oscille généralement entre -100 et +100 (peut aller plus loin).
• > +100 → Suracheté ou tendance forte haussière.
• < -100 → Survendu ou tendance forte baissière.
• Croisement de +100 à la hausse → entrée en tendance haussière.
• Croisement de -100 à la baisse → entrée en tendance baissière.`,
      },
    ],
  },
  {
    category: 'Moyennes mobiles',
    Icon: TrendingUp,
    color: '#a29bfe',
    items: [
      {
        term: 'EMA — Exponential Moving Average (Moyenne Mobile Exponentielle)',
        short: 'Moyenne qui donne plus de poids aux prix récents. Réagit plus vite que la SMA.',
        detail: `L'EMA est plus réactive que la SMA car elle pondère les données récentes plus fortement.

Dans l'app :
• EMA9 (cyan) : très rapide, suit le prix de près.
• EMA21 (orange) : moyen terme.

Golden Cross EMA9/EMA21 → EMA9 passe au-dessus de EMA21 → signal haussier.
Death Cross EMA9/EMA21 → EMA9 passe en dessous de EMA21 → signal baissier.

⚠️ Plus la période est courte, plus l'EMA génère de faux signaux. Utilise des periodes plus longues pour les tendances de fond.`,
      },
      {
        term: 'SMA — Simple Moving Average (Moyenne Mobile Simple)',
        short: 'Moyenne arithmétique des N derniers prix de clôture.',
        detail: `La SMA lisse le bruit de marché et aide à identifier la direction de la tendance.

Dans l'app :
• SMA50 (violet) : tendance à moyen terme.
• SMA200 : tendance à long terme (utilisée pour Golden/Death Cross majeur).

• Prix > SMA50 → tendance haussière à moyen terme.
• Prix < SMA50 → tendance baissière à moyen terme.

Golden Cross : SMA50 passe au-dessus de SMA200 → signal très haussier (long terme).
Death Cross : SMA50 passe en dessous de SMA200 → signal très baissier (long terme).`,
      },
      {
        term: 'VWAP — Volume Weighted Average Price',
        short: 'Prix moyen pondéré par les volumes. Référence institutionnelle.',
        detail: `Le VWAP est le prix moyen auquel un actif a été échangé sur la journée, en tenant compte des volumes.

• Prix au-dessus du VWAP → les acheteurs ont le contrôle de la journée.
• Prix en dessous du VWAP → les vendeurs ont le contrôle.

Les traders institutionnels utilisent le VWAP comme benchmark : ils achètent en dessous et vendent au-dessus pour "battre le VWAP".

⚠️ Le VWAP se remet à zéro chaque jour. Il perd de sa pertinence sur des timeframes plus longs.`,
      },
    ],
  },
  {
    category: 'Bandes et volatilité',
    Icon: BarChart2,
    color: '#00e676',
    items: [
      {
        term: 'Bollinger Bands (Bandes de Bollinger)',
        short: 'Enveloppe de prix basée sur la volatilité statistique.',
        detail: `Les Bandes de Bollinger se composent de :
• Bande du milieu (BB Mid) : SMA20.
• Bande supérieure (BB+) : SMA20 + 2 écarts-types.
• Bande inférieure (BB-) : SMA20 - 2 écarts-types.

Les prix restent dans les bandes 95% du temps.

Signaux :
• Prix touche BB+ → suracheté à court terme, possible retournement.
• Prix touche BB- → survendu à court terme, possible rebond.
• Bandes qui se resserrent (BB Width faible) → faible volatilité, breakout imminent.
• Bandes qui s'élargissent → forte volatilité en cours.

Bollinger %B : indique où se situe le prix dans les bandes (0% = BB-, 100% = BB+).`,
      },
      {
        term: 'ATR — Average True Range',
        short: 'Mesure la volatilité moyenne du marché. Utile pour placer les stop-loss.',
        detail: `L'ATR mesure l'amplitude moyenne des mouvements de prix sur N périodes (généralement 14).

Dans l'app, il est exprimé en % du prix pour faciliter les comparaisons entre coins.

Comment l'utiliser :
• ATR élevé → forte volatilité, stop-loss plus large nécessaire.
• ATR faible → faible volatilité, stop-loss plus serré possible.
• Règle pratique : place ton stop-loss à 1.5× ou 2× l'ATR sous le point d'entrée.

Exemple : BTC à $77,000 avec ATR à 0.5% → amplitude moyenne de $385. Stop-loss à -$770 (2× ATR).`,
      },
    ],
  },
  {
    category: 'Tendance et structure',
    Icon: Compass,
    color: '#ff9f43',
    items: [
      {
        term: 'ADX — Average Directional Index',
        short: 'Mesure la force d\'une tendance, sans indiquer sa direction.',
        detail: `L'ADX oscille entre 0 et 100 et mesure UNIQUEMENT la force de la tendance, pas sa direction.

• ADX < 20 → Pas de tendance claire, marché en range. Évite les stratégies de suivi de tendance.
• ADX 20-40 → Tendance modérée. Les signaux directionnels sont plus fiables.
• ADX > 40 → Tendance forte. Momentum important dans une direction.
• ADX > 60 → Tendance exceptionnellement forte (rare).

Indicateurs complémentaires :
• +DI > -DI → La pression haussière domine.
• -DI > +DI → La pression baissière domine.

Croisement +DI/-DI combiné à ADX > 20 → signal d'entrée dans la tendance.`,
      },
      {
        term: 'Ichimoku Kinko Hyo',
        short: 'Système complet d\'analyse visuelle de la tendance, du support et du momentum.',
        detail: `L'Ichimoku est un système japonais qui affiche plusieurs informations simultanément.

Composants clés (dans l'app, on utilise la position par rapport au nuage) :
• Prix au-dessus du nuage (Kumo) → tendance haussière. Supports forts.
• Prix en dessous du nuage → tendance baissière. Résistances fortes.
• Prix dans le nuage → zone de consolidation, éviter les trades.

Règle simplifiée de l'app :
• "Au-dessus du nuage" = tendance haussière confirmée par Ichimoku.
• "En dessous du nuage" = tendance baissière confirmée.

⚠️ L'Ichimoku fonctionne mieux sur des timeframes élevés (4h, 1j). Sur 1m, les signaux sont peu fiables.`,
      },
      {
        term: 'OBV — On-Balance Volume',
        short: 'Confirme la tendance des prix grâce aux volumes.',
        detail: `L'OBV accumule les volumes selon la direction du prix :
• Jour haussier (close > open) → on ajoute le volume.
• Jour baissier (close < open) → on soustrait le volume.

Signaux :
• OBV haussier + prix haussier → tendance confirmée par les volumes. ✅
• OBV baissier + prix haussier → divergence baissière. Le rallye n'est pas soutenu par les volumes. ⚠️
• OBV haussier + prix baissier → divergence haussière. La baisse n'est pas confirmée. ⚠️

Dans l'app : "up" = l'OBV est en tendance haussière, "down" = tendance baissière.`,
      },
      {
        term: 'Golden Cross / Death Cross',
        short: 'Croisements de moyennes mobiles longues termes. Signaux majeurs.',
        detail: `Ces croisements se produisent entre la SMA50 et la SMA200.

Golden Cross (Croix d'Or) :
• SMA50 passe au-dessus de la SMA200.
• Signal très haussier, considéré comme un changement de tendance majeur.
• Historiquement associé à de longues périodes de hausse.

Death Cross (Croix de la Mort) :
• SMA50 passe en dessous de la SMA200.
• Signal très baissier.

⚠️ Ces signaux sont très retardés (lagging). Le croisement se produit souvent après que le gros du mouvement a déjà eu lieu. Utilise-les pour confirmer une tendance, pas pour timer l'entrée précise.`,
      },
    ],
  },
  {
    category: 'Données de marché',
    Icon: DollarSign,
    color: '#ffc107',
    items: [
      {
        term: 'Order Book (Carnet d\'ordres)',
        short: 'Liste de tous les ordres d\'achat et de vente en attente.',
        detail: `Le carnet d'ordres montre la liquidité disponible à chaque niveau de prix.

• BIDS (vert) : ordres d'achat. Les acheteurs attendent à ces prix.
• ASKS (rouge) : ordres de vente. Les vendeurs attendent à ces prix.
• Spread : écart entre le meilleur bid et le meilleur ask. Un spread faible = marché liquide.

Comment lire les barres de profondeur :
• Une barre épaisse à un niveau de prix → gros order (mur d'achat ou de vente).
• Mur d'achat fort (bid) → support potentiel.
• Mur de vente fort (ask) → résistance potentielle.

⚠️ Les order books peuvent être manipulés (spoofing) : des gros ordres sont placés puis annulés pour donner une fausse impression de support/résistance.`,
      },
      {
        term: 'Funding Rate',
        short: 'Taux échangé entre acheteurs et vendeurs sur les marchés futures perpétuels.',
        detail: `Le Funding Rate est un mécanisme propre aux futures perpétuels (sans date d'expiration).

Principe : pour maintenir le prix du future proche du prix spot, les longs payent les shorts (ou inversement) toutes les 8 heures.

• Funding Rate positif → Les longs payent les shorts. Le marché est haussier (plus de longs que de shorts).
• Funding Rate négatif → Les shorts payent les longs. Le marché est baissier.

Interprétation :
• Funding très élevé (> 0.1%) → Marché suracheté, risque de liquidation des longs → correction possible.
• Funding très négatif (< -0.05%) → Marché survendu → rebond possible.`,
      },
      {
        term: 'Open Interest',
        short: 'Nombre total de contrats futures ouverts (non clôturés).',
        detail: `L'Open Interest mesure combien de contrats futures sont actuellement ouverts.

Interprétations :
• Prix ↑ + OI ↑ → Tendance haussière forte, de nouveaux capitaux entrent. ✅
• Prix ↑ + OI ↓ → La hausse est due à des shorts qui ferment, pas de nouveaux acheteurs. ⚠️
• Prix ↓ + OI ↑ → Tendance baissière forte, nouveaux vendeurs entrent.
• Prix ↓ + OI ↓ → Les longs se débouclent (stop-loss), mouvement baissier probablement terminé. ⚠️`,
      },
      {
        term: 'Spread',
        short: 'Écart entre le meilleur prix d\'achat et le meilleur prix de vente.',
        detail: `Le spread est le coût implicite de chaque transaction sur un marché.

• Spread faible (ex: $0.01 sur BTC) → marché très liquide, peu de coût de transaction.
• Spread élevé → marché peu liquide, transactions plus coûteuses.

En crypto, les spreads sont généralement très faibles sur les grandes paires (BTC, ETH) et plus larges sur les altcoins.

Pour un trader actif, le spread s'accumule : si tu ouvres et fermes 100 positions par mois avec un spread de $5 sur BTC, c'est $500 de coût caché.`,
      },
    ],
  },
  {
    category: 'Analyse IA & Profils de risque',
    Icon: Brain,
    color: '#00d4ff',
    items: [
      {
        term: 'Profil Conservateur — Stan Weinstein',
        short: 'Ne trader que les tendances confirmées. Stage 2 uniquement.',
        detail: `Stan Weinstein divise le cycle d'un actif en 4 stages :
• Stage 1 : Accumulation (range horizontal). Éviter.
• Stage 2 : Tendance haussière. C'est ICI qu'on achète.
• Stage 3 : Distribution (range après hausse). Prendre ses gains.
• Stage 4 : Déclin. Ne JAMAIS acheter.

Critères d'entrée en Stage 2 :
• Prix au-dessus de la SMA30 semaine.
• Volume croissant sur la sortie de base.
• Relative Strength positive vs Bitcoin.

Risk/Reward minimum : 1:1.5. Position : 1-2% du capital.`,
      },
      {
        term: 'Profil Modéré — Mark Minervini (SEPA)',
        short: 'Stratégie SEPA : tendance + contraction de volatilité + breakout sur volume.',
        detail: `SEPA = Specific Entry Point Analysis.

Les 8 critères de Minervini :
1. Tendance haussière sur 4 timeframes.
2. RS (Relative Strength) > 90ème percentile.
3. Prix au-dessus de ses moyennes mobiles clés.
4. Contraction de volatilité avant le breakout (VCP pattern).
5. Catalyseur fondamental (earnings, news, adoption).
6. Volume x2 minimum sur le breakout.
7. Biais sectoriel positif.
8. Pattern chartiste propre (VCP, flat base, cup & handle).

Stop-loss sous le pivot. Risk/Reward minimum : 1:2.5. Position : 5-8%.`,
      },
      {
        term: 'Profil Agressif — Paul Tudor Jones & Jesse Livermore',
        short: 'Suivre le momentum sans hésiter. Pyramider les gagnants, couper vite les perdants.',
        detail: `Paul Tudor Jones : gestion du risque rigoureuse + suivi de momentum. Célèbre pour avoir shorté le krach de 1987.
Jesse Livermore : "suivre la ligne de moindre résistance". Trader la psychologie de masse.

Principes clés :
• Entrer en force sur les breakouts à fort momentum.
• Pyramider agressivement sur les positions gagnantes.
• Couper IMMÉDIATEMENT si le prix revient au point d'entrée.
• Chercher des moves de 20-50%+ minimum.
• Ne jamais lutter contre la tendance.

Risk/Reward minimum : 1:5. Position : 8-15%.`,
      },
      {
        term: 'Profil Extrême — Larry Williams & Michael Burry',
        short: 'Setups asymétriques rares. Potentiel x5 à x20. Conviction totale.',
        detail: `Larry Williams : champion de trading, spécialiste des cycles et des données COT (Commitments of Traders).
Michael Burry : a parié $1 milliard contre les subprimes en 2008 (The Big Short). Conviction absolue sur une thèse que personne d'autre ne voyait.

Principes :
• Chercher 1-2 setups par mois maximum.
• La thèse doit être claire et que le marché n'a pas encore pricée.
• Catalyseur fort identifié (cycle, données on-chain, régulation).
• Accepter un SL total sur une petite partie du capital si la thèse est solide.
• Tenir la position face à la pression (comme Burry qui a tenu pendant 2 ans avant d'avoir raison).

Risk/Reward minimum : 1:10. Position : 10-20% max.`,
      },
      {
        term: 'Stratégie de Backtesting — EMA9/21 Crossover + RSI Filter',
        short: 'Stratégie utilisée par le backtesteur intégré à l\'app.',
        detail: `La stratégie simulée dans l'onglet Backtest combine deux indicateurs :

Signal d'ACHAT (BUY) — toutes ces conditions doivent être vraies :
1. L'EMA9 croise l'EMA21 à la hausse (croisement haussier).
2. Le RSI est inférieur à 68 (pas suracheté).
3. L'histogramme MACD est positif (momentum haussier).

Signal de VENTE (SELL) — l'une de ces conditions suffit :
1. L'EMA9 croise l'EMA21 à la baisse (croisement baissier).
2. Le RSI dépasse 78 (fortement suracheté).

Paramètres :
• Capital de départ simulé : $10,000.
• Frais : 0.1% par transaction (maker/taker Binance).
• Stratégie long only (pas de short).

⚠️ Les performances passées ne garantissent pas les performances futures.`,
      },
    ],
  },
  {
    category: 'Avertissements importants',
    Icon: AlertTriangle,
    color: '#ff4757',
    items: [
      {
        term: 'Les indicateurs techniques ne prédisent pas l\'avenir',
        short: 'Ils analysent le passé pour identifier des probabilités, pas des certitudes.',
        detail: `Tous les indicateurs techniques sont calculés à partir de données historiques de prix et de volume. Ils identifient des patterns récurrents et calculent des probabilités statistiques — ils ne prédisent pas le futur avec certitude.

Un signal "ACHETER" avec une confiance de 85% ne signifie pas que le prix MONTERA. Cela signifie que dans des configurations similaires par le passé, le prix a monté 85% du temps.

Facteurs que les indicateurs ignorent :
• News soudaines (hack, régulation, tweet de Musk).
• Manipulation de marché (whales, wash trading).
• Corrélation avec d'autres marchés (actions, macro-économie).
• Sentiment irrationnel (FOMO, panique).`,
      },
      {
        term: 'Gestion du risque avant tout',
        short: 'Ne jamais risquer plus de 1-2% du capital total sur un seul trade.',
        detail: `La règle d'or des traders professionnels : survivre assez longtemps pour être rentable sur la durée.

Principes fondamentaux :
• 1-2% max par trade : même avec 10 pertes consécutives, tu perds seulement 10-20% du capital.
• Toujours définir son stop-loss AVANT d'entrer dans un trade.
• Le ratio Risk/Reward doit être favorable : au minimum 1:2 (risquer $1 pour en gagner $2).
• Ne jamais moyenner à la baisse ("doubler sur un perdant") — c'est le meilleur moyen de ruiner un compte.
• Diversifier : ne jamais mettre plus de 20-30% du capital sur un seul actif.

Exemple avec $10,000 et règle des 2% :
• Risk max par trade : $200.
• Si SL est à 5% sous l'entrée → taille de position = $200 / 5% = $4,000 (40% du capital).`,
      },
      {
        term: 'Pas un conseil financier',
        short: 'Cette application est un outil d\'analyse. Toute décision de trading vous appartient.',
        detail: `CRYPTO TERMINAL est un outil d'analyse technique et de visualisation de données de marché.

Les analyses générées par l'IA (Claude), les signaux algorithmiques, les résultats de backtesting et toutes les informations affichées dans cette application sont fournis à titre informatif uniquement.

Ils ne constituent pas :
• Un conseil financier ou d'investissement.
• Une recommandation d'achat ou de vente.
• Une garantie de performance.

Le trading de cryptomonnaies est hautement spéculatif et risqué. Vous pouvez perdre tout votre capital investi.

Consultez un conseiller financier agréé avant de prendre des décisions d'investissement importantes.`,
      },
    ],
  },
];

export default function GlossaryTab() {
  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState({});

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const filterGlossary = () => {
    const q = search.toLowerCase().trim();
    if (!q) return GLOSSARY;
    return GLOSSARY.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        item.term.toLowerCase().includes(q) ||
        item.short.toLowerCase().includes(q) ||
        item.detail.toLowerCase().includes(q)
      )
    })).filter(cat => cat.items.length > 0);
  };

  const filtered = filterGlossary();
  const totalItems = filtered.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="glossary-tab">

      {/* Header */}
      <div className="glossary-header">
        <div className="glossary-header-left">
          <BookOpen size={14} color="var(--accent)" />
          <span className="glossary-title">Glossaire</span>
          <span className="glossary-count">{totalItems} termes</span>
        </div>
        <div className="glossary-search-wrap">
          <Search size={12} color="var(--text-muted)" />
          <input
            className="glossary-search"
            placeholder="Rechercher un terme..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      {/* Contenu */}
      <div className="glossary-body">
        {filtered.length === 0 && (
          <div className="glossary-empty">
            <Search size={24} color="var(--text-muted)" />
            <span>Aucun résultat pour "{search}"</span>
          </div>
        )}

        {filtered.map((cat) => (
          <div key={cat.category} className="glossary-category">
            <div className="glossary-cat-title" style={{ color: cat.color }}>
              {cat.Icon && <cat.Icon size={13} />}
              {cat.category}
            </div>

            <div className="glossary-items">
              {cat.items.map((item) => {
                const key  = item.term;
                const open = expanded[key];
                return (
                  <div key={key} className={`glossary-item ${open ? 'open' : ''}`}>
                    <button className="glossary-item-header" onClick={() => toggle(key)}>
                      <div className="glossary-item-left">
                        <span className="glossary-term">{item.term}</span>
                        <span className="glossary-short">{item.short}</span>
                      </div>
                      <div className="glossary-chevron">
                        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </button>

                    {open && (
                      <div className="glossary-detail">
                        {item.detail.split('\n').map((line, i) => {
                          if (!line.trim()) return <br key={i} />;
                          // Lignes commençant par • → bullet formaté
                          if (line.startsWith('•')) {
                            return (
                              <div key={i} className="glossary-bullet">
                                <span className="glossary-bullet-dot" style={{ color: cat.color }}>•</span>
                                <span>{line.slice(1).trim()}</span>
                              </div>
                            );
                          }
                          // Lignes avec ✅ ⚠️ → highlight
                          if (line.includes('✅') || line.includes('⚠️') || line.includes('❌')) {
                            return <p key={i} className="glossary-highlight">{line}</p>;
                          }
                          return <p key={i}>{line}</p>;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .glossary-tab { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: var(--bg-primary); }

        .glossary-header {
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
          padding: 10px 16px; border-bottom: 1px solid var(--border);
          background: var(--bg-secondary); flex-shrink: 0;
        }
        .glossary-header-left { display: flex; align-items: center; gap: 8px; }
        .glossary-title { font-size: 12px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
        .glossary-count { font-size: 10px; color: var(--text-muted); background: var(--bg-card); padding: 1px 6px; border-radius: 8px; }
        .glossary-search-wrap { display: flex; align-items: center; gap: 6px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 5px 10px; }
        .glossary-search { background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 12px; font-family: var(--font-mono); width: 220px; }
        .glossary-search::placeholder { color: var(--text-muted); }

        .glossary-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 24px; }

        .glossary-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 60px 0; color: var(--text-muted); font-size: 13px; }

        .glossary-category {}
        .glossary-cat-title { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }

        .glossary-items { display: flex; flex-direction: column; gap: 4px; }

        .glossary-item { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; transition: border-color 0.15s; }
        .glossary-item.open { border-color: rgba(0,212,255,0.25); }
        .glossary-item:hover { border-color: rgba(0,212,255,0.2); }

        .glossary-item-header {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
          padding: 10px 14px; width: 100%; text-align: left; cursor: pointer;
          background: var(--bg-secondary); transition: background 0.15s;
        }
        .glossary-item-header:hover { background: var(--bg-hover); }
        .glossary-item.open .glossary-item-header { background: var(--bg-hover); }

        .glossary-item-left { flex: 1; min-width: 0; }
        .glossary-term { display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px; }
        .glossary-short { display: block; font-size: 11px; color: var(--text-muted); line-height: 1.4; }
        .glossary-chevron { color: var(--text-muted); flex-shrink: 0; margin-top: 2px; }

        .glossary-detail {
          padding: 14px 16px; background: var(--bg-card); border-top: 1px solid var(--border);
          font-size: 12px; color: var(--text-secondary); line-height: 1.7;
          display: flex; flex-direction: column; gap: 4px;
        }
        .glossary-detail p { margin: 0; }
        .glossary-detail br { display: block; content: ''; margin: 4px 0; }

        .glossary-bullet { display: flex; align-items: flex-start; gap: 8px; }
        .glossary-bullet-dot { font-size: 14px; flex-shrink: 0; line-height: 1.5; }

        .glossary-highlight {
          background: rgba(0,212,255,0.05); border-left: 2px solid var(--accent);
          padding: 4px 8px; border-radius: 0 4px 4px 0; margin: 2px 0;
        }

        @media (max-width: 600px) {
          .glossary-search { width: 140px; }
        }
      `}</style>
    </div>
  );
}
