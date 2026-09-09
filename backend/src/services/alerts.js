const { randomUUID } = require('crypto');
const db = require('../database/db');

const TYPES = {
  price_above:  (price, val)      => price >= val,
  price_below:  (price, val)      => price <= val,
  rsi_above:    (price, val, ind) => (ind?.oscillators?.rsi ?? 0)   >= val,
  rsi_below:    (price, val, ind) => (ind?.oscillators?.rsi ?? 100) <= val,
  macd_bullish: (price, val, ind) => (ind?.oscillators?.macd?.histogram ?? -1) > 0,
  macd_bearish: (price, val, ind) => (ind?.oscillators?.macd?.histogram ?? 1)  < 0,
  signal_buy:   (price, val, ind) => ind?.signal?.action === 'ACHETER',
  signal_sell:  (price, val, ind) => ind?.signal?.action === 'VENDRE',
};

function labelFor(type, symbol, value) {
  const coin = symbol.replace('USDT', '');
  const map = {
    price_above:  `${coin} passe au-dessus de $${value}`,
    price_below:  `${coin} passe en dessous de $${value}`,
    rsi_above:    `RSI ${coin} > ${value} (suracheté)`,
    rsi_below:    `RSI ${coin} < ${value} (survendu)`,
    macd_bullish: `MACD ${coin} croise haussier`,
    macd_bearish: `MACD ${coin} croise baissier`,
    signal_buy:   `Signal IA ACHETER sur ${coin}`,
    signal_sell:  `Signal IA VENDRE sur ${coin}`,
  };
  return map[type] ?? `Alerte ${type} sur ${coin}`;
}

let triggerCallback = null;
function setTriggerCallback(cb) { triggerCallback = cb; }

function rowToAlert(row) {
  return { ...row, active: !!row.active, repeat: !!row.repeat, value: row.value ?? null };
}

function getAlerts() {
  return db.prepare('SELECT * FROM alerts ORDER BY created_at DESC').all().map(rowToAlert);
}

function getHistory() {
  return db.prepare('SELECT * FROM alert_history ORDER BY triggered_at DESC LIMIT 100').all();
}

function createAlert({ symbol, type, value, label, repeat = false }) {
  if (!TYPES[type]) throw Object.assign(new Error(`Type inconnu : ${type}`), { status: 400 });
  const id = randomUUID();
  db.prepare(
    'INSERT INTO alerts (id, symbol, type, value, label, active, repeat) VALUES (?, ?, ?, ?, ?, 1, ?)'
  ).run(id, symbol, type, value != null ? parseFloat(value) : null, label || labelFor(type, symbol, value), repeat ? 1 : 0);
  return rowToAlert(db.prepare('SELECT * FROM alerts WHERE id = ?').get(id));
}

function deleteAlert(id) {
  const { changes } = db.prepare('DELETE FROM alerts WHERE id = ?').run(id);
  return changes > 0;
}

function toggleAlert(id) {
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  if (!alert) return null;
  db.prepare('UPDATE alerts SET active = ? WHERE id = ?').run(alert.active ? 0 : 1, id);
  return rowToAlert(db.prepare('SELECT * FROM alerts WHERE id = ?').get(id));
}

function checkAlerts(symbol, price, indicators) {
  const active = db.prepare('SELECT * FROM alerts WHERE symbol = ? AND active = 1').all();
  for (const alert of active) {
    const fn = TYPES[alert.type];
    if (!fn) continue;
    if (fn(price, alert.value, indicators)) {
      // Enregistrer dans l'historique
      db.prepare(
        'INSERT INTO alert_history (alert_id, symbol, alert_type, label) VALUES (?, ?, ?, ?)'
      ).run(alert.id, alert.symbol, alert.type, alert.label);

      // Désactiver si non répétable
      if (!alert.repeat) {
        db.prepare('UPDATE alerts SET active = 0 WHERE id = ?').run(alert.id);
      }

      const record = { ...rowToAlert(alert), triggeredAt: new Date().toISOString() };
      if (triggerCallback) triggerCallback(record);
    }
  }
}

module.exports = { setTriggerCallback, getAlerts, getHistory, createAlert, deleteAlert, toggleAlert, checkAlerts };
