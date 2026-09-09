# 🖥️ Crypto Terminal — Documentation complète

Un terminal de trading crypto professionnel avec données Binance temps réel, indicateurs techniques avancés et analyse IA via Claude.

---

## 📦 Stack technique

| Couche | Technologies |
|--------|-------------|
| Backend | Node.js, Express, WebSocket (ws), Axios |
| Frontend | React 18, lightweight-charts, Recharts |
| Data | API Binance REST + WebSocket Streams |
| IA | Anthropic Claude (claude-sonnet-4) |
| Indicateurs | technicalindicators (RSI, MACD, Bollinger, Ichimoku, ADX, OBV...) |

---

## 🚀 Installation & Lancement

### 1. Cloner / télécharger le projet

```
crypto-terminal/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   └── services/
│   │       ├── binance.js
│   │       ├── indicators.js
│   │       ├── ai.js
│   │       └── cache.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   ├── hooks/
    │   ├── utils/
    │   └── styles/
    ├── public/index.html
    └── package.json
```

### 2. Configurer le backend

```bash
cd backend
cp .env.example .env
# Édite .env avec tes clés API
npm install
npm run dev
```

### 3. Configurer le frontend

```bash
cd frontend
npm install
npm start
```

L'app s'ouvre sur **http://localhost:3000**

---

## 🔑 Clés API nécessaires

### Binance API
- Crée un compte sur [binance.com](https://www.binance.com)
- API > Créer une clé API (lecture seule suffit pour les données de marché)
- Coller `BINANCE_API_KEY` et `BINANCE_API_SECRET` dans `.env`
- ⚠️ Les données publiques (prix, orderbook, klines) **ne nécessitent pas de clé API** — elle n'est utile que pour les endpoints authentifiés (solde, ordres)

### Anthropic API
- Crée un compte sur [console.anthropic.com](https://console.anthropic.com)
- Génère une clé API
- Coller dans `ANTHROPIC_API_KEY` dans `.env`

---

## 📊 Fonctionnalités

### Coins supportés
| Symbol | Nom |
|--------|-----|
| DOGEUSDT | Dogecoin |
| HYPEUSDT | Hyperliquid |
| ADAUSDT | Cardano |
| ETHUSDT | Ethereum |
| SOLUSDT | Solana |
| BTCUSDT | Bitcoin |
| XRPUSDT | XRP |
| SUIUSDT | SUI |
| PAXGUSDT | PAX Gold |
| AVAXUSDT | Avalanche |

### Données temps réel (WebSocket Binance)
- ✅ Prix ticker live
- ✅ Chandeliers OHLCV (klines) toutes les timeframes
- ✅ Orderbook (depth 20 niveaux)
- ✅ Flux de trades agrégés
- ✅ Auto-reconnexion WebSocket

### Indicateurs techniques calculés
| Catégorie | Indicateurs |
|-----------|------------|
| Tendance | EMA 9, EMA 21, EMA 55, SMA 20, SMA 50, SMA 200, Ichimoku Cloud, Golden/Death Cross |
| Momentum | RSI (14 & 7), MACD, Stochastique (K/D), Williams %R, CCI |
| Volatilité | Bollinger Bands (20, 2σ), ATR (14) |
| Volume | OBV, VWAP, Ratio volume/moyenne |
| Force tendance | ADX (+DI/-DI) |

### Analyse IA (Claude)
- Signal : ACHETER / VENDRE / NEUTRE + niveau de confiance
- Résumé contextuel
- Points haussiers et baissiers détaillés
- Niveaux clés : supports et résistances
- Stop Loss et Take Profit suggérés
- Risk/Reward ratio
- Horizon temporel

### Timeframes disponibles
`1m · 5m · 15m · 1h · 4h · 1d`

---

## 🏗️ Architecture

```
Frontend React (3000)
    │
    ├── REST API → Backend Express (3001)
    │       ├── /api/tickers        — Prix 24h tous les coins
    │       ├── /api/klines/:symbol — OHLCV historique
    │       ├── /api/depth/:symbol  — Orderbook
    │       ├── /api/trades/:symbol — Trades récents
    │       ├── /api/funding/:symbol — Funding rate (futures)
    │       ├── /api/openinterest/:symbol — Open Interest
    │       ├── /api/indicators/:symbol  — Indicateurs calculés
    │       └── /api/ai/analyze     — Analyse Claude IA
    │
    └── WebSocket → Backend (3001)
            ├── subscribe/unsubscribe streams
            └── Forward Binance streams → Frontend
```

---

## 🔧 Développement & extension

### Ajouter un coin
Dans `frontend/src/App.jsx`, ajouter dans le tableau `COINS` :
```js
{ id: 'LINKUSDT', name: 'Chainlink', symbol: 'LINK', icon: '🔗' }
```

### Ajouter un indicateur
Dans `backend/src/services/indicators.js`, dans `computeAll()` :
```js
const monIndicateur = ti.MonIndicateur.calculate({ values: closes, period: X });
```
Puis l'exposer dans le return et l'afficher dans `IndicatorsPanel.jsx`.

### Personnaliser l'analyse IA
Modifier le prompt dans `backend/src/services/ai.js` pour adapter le ton, la structure JSON, ou ajouter des éléments.

---

## 🛡️ Note importante

> Cet outil est fourni à titre **éducatif et informatif uniquement**.  
> Les signaux générés (algorithmiques et IA) **ne constituent pas des conseils financiers**.  
> Le trading de cryptomonnaies comporte des risques significatifs de perte en capital.  
> Utilisez cet outil en complément de votre propre analyse et jugement.

---

## 📈 Roadmap (améliorations possibles)

- [ ] Alertes de prix (email / notifications)
- [ ] Backtest des signaux sur données historiques
- [ ] Portfolio tracker avec P&L
- [ ] Passage d'ordres via API Binance (clé avec permissions trading)
- [ ] Export CSV des données et signaux
- [ ] Mode multi-écrans (plusieurs coins simultanément)
- [ ] Scan de marché automatique (chercher les meilleures opportunités)
- [ ] Authentification utilisateur (pour la commercialisation)

---

## 📝 Licence

Projet privé — tous droits réservés.
