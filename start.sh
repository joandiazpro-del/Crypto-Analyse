#!/bin/bash
# Script de lancement du Crypto Terminal
# Usage: ./start.sh

echo ""
echo "🚀 Crypto Terminal — Démarrage"
echo "================================"

# Vérifier Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js non trouvé. Installe Node.js v18+ depuis https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js v18+ requis (version actuelle: $(node -v))"
  exit 1
fi

echo "✅ Node.js $(node -v) détecté"

# Backend
echo ""
echo "📦 Installation backend..."
cd backend
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  Fichier .env créé depuis .env.example"
  echo "   👉 Édite backend/.env avec tes clés API avant de continuer"
  echo "   Puis relance ce script."
  exit 0
fi

npm install --silent
echo "✅ Backend prêt"

# Frontend
echo ""
echo "📦 Installation frontend..."
cd ../frontend
npm install --silent
echo "✅ Frontend prêt"

# Lancement en parallèle
echo ""
echo "🟢 Démarrage des serveurs..."
echo "   Backend  → http://localhost:3001"
echo "   Frontend → http://localhost:3000"
echo ""
echo "Ctrl+C pour arrêter"
echo "================================"
echo ""

cd ..
(cd backend && npm run dev) &
(cd frontend && npm start) &

wait
