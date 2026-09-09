import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Plus, Trash2, ToggleLeft, ToggleRight, Clock, CheckCircle, AlertTriangle, BellRing } from 'lucide-react';
import { api } from '../../utils/api';

const COINS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','DOGEUSDT','ADAUSDT',
  'XRPUSDT','SUIUSDT','AVAXUSDT','PAXGUSDT','HYPEUSDT'
];

const ALERT_TYPES = [
  { value: 'price_above',  label: 'Prix au-dessus de',  needsValue: true,  unit: '$' },
  { value: 'price_below',  label: 'Prix en dessous de', needsValue: true,  unit: '$' },
  { value: 'rsi_above',    label: 'RSI au-dessus de',   needsValue: true,  unit: '' },
  { value: 'rsi_below',    label: 'RSI en dessous de',  needsValue: true,  unit: '' },
  { value: 'macd_bullish', label: 'MACD croise haussier', needsValue: false, unit: '' },
  { value: 'macd_bearish', label: 'MACD croise baissier', needsValue: false, unit: '' },
  { value: 'signal_buy',   label: 'Signal IA : ACHETER', needsValue: false, unit: '' },
  { value: 'signal_sell',  label: 'Signal IA : VENDRE',  needsValue: false, unit: '' },
];

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60)   return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s/60)}min`;
  if (s < 86400)return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}j`;
}

export default function AlertsTab({ selectedCoin, triggeredAlerts }) {
  const [alerts,  setAlerts]  = useState([]);
  const [history, setHistory] = useState([]);
  const [view,    setView]    = useState('active'); // 'active' | 'history'
  const [form, setForm] = useState({
    symbol:  selectedCoin?.id ?? 'BTCUSDT',
    type:    'price_above',
    value:   '',
    repeat:  false,
  });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const [a, h] = await Promise.all([
      api.get('/alerts'),
      api.get('/alerts/history')
    ]);
    setAlerts(a);
    setHistory(h);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Rafraîchir quand une alerte se déclenche
  useEffect(() => {
    if (triggeredAlerts?.length) load();
  }, [triggeredAlerts, load]);

  const selectedType = ALERT_TYPES.find(t => t.value === form.type);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    // Demander la permission de notification au premier create
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    try {
      await api.post('/alerts', {
        symbol: form.symbol,
        type:   form.type,
        value:  selectedType?.needsValue ? parseFloat(form.value) : null,
        repeat: form.repeat,
      });
      setForm(f => ({ ...f, value: '', repeat: false }));
      setShowForm(false);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    await api.del(`/alerts/${id}`);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleToggle = async (id) => {
    const updated = await api.patch(`/alerts/${id}/toggle`);
    setAlerts(prev => prev.map(a => a.id === id ? updated : a));
  };

  const activeAlerts   = alerts.filter(a => a.active);
  const inactiveAlerts = alerts.filter(a => !a.active);

  return (
    <div className="alerts-tab">

      {/* Header */}
      <div className="alerts-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={14} color="var(--accent)" />
          <span className="alerts-title">Alertes</span>
          {activeAlerts.length > 0 && (
            <span className="alerts-count">{activeAlerts.length} active{activeAlerts.length > 1 ? 's' : ''}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="alerts-view-btns">
            <button className={`alerts-view-btn ${view === 'active' ? 'active' : ''}`} onClick={() => setView('active')}>Actives</button>
            <button className={`alerts-view-btn ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>
              Historique {history.length > 0 && <span className="history-badge">{history.length}</span>}
            </button>
          </div>
          <button className="alerts-add-btn" onClick={() => setShowForm(v => !v)}>
            <Plus size={12} /> Nouvelle
          </button>
        </div>
      </div>

      <div className="alerts-body">

        {/* Formulaire de création */}
        {showForm && (
          <form className="alert-form" onSubmit={handleCreate}>
            <div className="alert-form-title"><Plus size={12} color="var(--accent)" /> Nouvelle alerte</div>
            <div className="alert-form-row">
              <label>Coin</label>
              <select value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}>
                {COINS.map(c => <option key={c} value={c}>{c.replace('USDT', '')}</option>)}
              </select>
            </div>
            <div className="alert-form-row">
              <label>Condition</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {ALERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {selectedType?.needsValue && (
              <div className="alert-form-row">
                <label>Valeur {selectedType.unit}</label>
                <input
                  type="number" step="any" required
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder={form.type.includes('rsi') ? '70' : '80000'}
                />
              </div>
            )}
            <div className="alert-form-row">
              <label>Répéter</label>
              <label className="toggle-label">
                <input type="checkbox" checked={form.repeat} onChange={e => setForm(f => ({ ...f, repeat: e.target.checked }))} />
                <span>{form.repeat ? 'Oui — se redéclenche' : 'Non — une seule fois'}</span>
              </label>
            </div>
            <div className="alert-form-actions">
              <button type="button" className="alert-btn-cancel" onClick={() => setShowForm(false)}>Annuler</button>
              <button type="submit" className="alert-btn-create" disabled={creating}>
                {creating ? 'Création...' : <><Plus size={11} /> Créer l'alerte</>}
              </button>
            </div>
          </form>
        )}

        {/* Bannière permission notification */}
        {'Notification' in window && Notification.permission === 'denied' && (
          <div className="notif-banner denied">
            <AlertTriangle size={13} /> Notifications bloquées par le navigateur. Active-les dans Réglages → Safari/Chrome → Notifications.
          </div>
        )}
        {'Notification' in window && Notification.permission === 'default' && (
          <div className="notif-banner default">
            <BellRing size={13} /> Crée une alerte pour activer les notifications navigateur (sonnent même onglet en arrière-plan).
          </div>
        )}
        {'Notification' in window && Notification.permission === 'granted' && (
          <div className="notif-banner granted">
            <CheckCircle size={13} /> Notifications navigateur actives ✓
          </div>
        )}

        {/* Vue Actives */}
        {view === 'active' && (
          <div className="alerts-list">
            {alerts.length === 0 && (
              <div className="alerts-empty">
                <BellOff size={28} color="var(--text-muted)" />
                <p>Aucune alerte configurée</p>
                <button className="alerts-add-btn" onClick={() => setShowForm(true)}><Plus size={12} /> Créer une alerte</button>
              </div>
            )}

            {activeAlerts.length > 0 && (
              <div className="alerts-section">
                <div className="alerts-section-title"><Bell size={11} color="var(--green)" /> Actives ({activeAlerts.length})</div>
                {activeAlerts.map(alert => <AlertRow key={alert.id} alert={alert} onToggle={handleToggle} onDelete={handleDelete} />)}
              </div>
            )}

            {inactiveAlerts.length > 0 && (
              <div className="alerts-section">
                <div className="alerts-section-title"><BellOff size={11} color="var(--text-muted)" /> Désactivées ({inactiveAlerts.length})</div>
                {inactiveAlerts.map(alert => <AlertRow key={alert.id} alert={alert} onToggle={handleToggle} onDelete={handleDelete} />)}
              </div>
            )}
          </div>
        )}

        {/* Vue Historique */}
        {view === 'history' && (
          <div className="alerts-list">
            {history.length === 0 ? (
              <div className="alerts-empty">
                <Clock size={28} color="var(--text-muted)" />
                <p>Aucune alerte déclenchée</p>
              </div>
            ) : (
              <div className="alerts-section">
                <div className="alerts-section-title"><CheckCircle size={11} color="var(--accent)" /> Historique ({history.length})</div>
                {history.map((record, i) => (
                  <div key={i} className="alert-row history-row">
                    <CheckCircle size={13} color="var(--accent)" style={{ flexShrink: 0 }} />
                    <div className="alert-info">
                      <span className="alert-label">{record.label}</span>
                      <span className="alert-meta">{record.symbol.replace('USDT','')} · déclenchée {timeAgo(record.triggeredAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .alerts-tab { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: var(--bg-primary); }

        .alerts-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px; border-bottom: 1px solid var(--border);
          background: var(--bg-secondary); flex-shrink: 0;
        }
        .alerts-title { font-size: 12px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
        .alerts-count { font-size: 10px; background: var(--green-dim); color: var(--green); padding: 1px 6px; border-radius: 10px; font-weight: 700; }
        .alerts-view-btns { display: flex; gap: 2px; }
        .alerts-view-btn { padding: 4px 10px; font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); border: 1px solid var(--border); border-radius: 4px; background: transparent; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 4px; }
        .alerts-view-btn.active { color: var(--accent); border-color: rgba(0,212,255,0.4); background: var(--accent-dim); }
        .history-badge { background: var(--accent-dim); color: var(--accent); font-size: 9px; padding: 0 4px; border-radius: 8px; }
        .alerts-add-btn { display: flex; align-items: center; gap: 5px; padding: 4px 10px; font-size: 11px; font-weight: 600; color: var(--accent); border: 1px solid rgba(0,212,255,0.35); border-radius: var(--radius); background: var(--accent-dim); cursor: pointer; transition: all 0.15s; }
        .alerts-add-btn:hover { background: rgba(0,212,255,0.2); }

        .alerts-body { flex: 1; min-height: 0; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px; }

        /* Formulaire */
        .alert-form { background: var(--bg-secondary); border: 1px solid rgba(0,212,255,0.3); border-radius: var(--radius); padding: 14px; display: flex; flex-direction: column; gap: 10px; }
        .alert-form-title { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.06em; }
        .alert-form-row { display: grid; grid-template-columns: 100px 1fr; align-items: center; gap: 8px; }
        .alert-form-row label { font-size: 11px; color: var(--text-muted); }
        .alert-form-row select, .alert-form-row input {
          padding: 5px 8px; background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 4px; color: var(--text-primary); font-size: 11px;
          font-family: var(--font-mono); outline: none; width: 100%;
        }
        .alert-form-row select:focus, .alert-form-row input:focus { border-color: var(--accent); }
        .toggle-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 11px; color: var(--text-secondary); }
        .toggle-label input { accent-color: var(--accent); }
        .alert-form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
        .alert-btn-cancel { padding: 5px 12px; font-size: 11px; color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius); background: transparent; cursor: pointer; }
        .alert-btn-create { display: flex; align-items: center; gap: 5px; padding: 5px 14px; font-size: 11px; font-weight: 600; color: var(--accent); border: 1px solid rgba(0,212,255,0.4); border-radius: var(--radius); background: var(--accent-dim); cursor: pointer; transition: all 0.15s; }
        .alert-btn-create:hover:not(:disabled) { background: rgba(0,212,255,0.2); }
        .alert-btn-create:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Listes */
        .alerts-list { display: flex; flex-direction: column; gap: 10px; }
        .alerts-section { display: flex; flex-direction: column; gap: 6px; }
        .alerts-section-title { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); padding: 4px 0; }
        .notif-banner { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius); font-size: 11px; border: 1px solid; }
        .notif-banner.denied  { color: var(--red);    border-color: rgba(255,71,87,0.3);   background: rgba(255,71,87,0.07);  }
        .notif-banner.default { color: var(--yellow); border-color: rgba(255,193,7,0.3);   background: rgba(255,193,7,0.07);  }
        .notif-banner.granted { color: var(--green);  border-color: rgba(0,230,118,0.3);   background: rgba(0,230,118,0.07);  }
        .alerts-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 50px 0; color: var(--text-muted); font-size: 12px; }

        /* Ligne alerte */
        .alert-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius); transition: all 0.15s; }
        .alert-row:hover { border-color: rgba(0,212,255,0.2); }
        .alert-row.inactive { opacity: 0.5; }
        .history-row { border-color: rgba(0,212,255,0.15); background: rgba(0,212,255,0.03); }
        .alert-info { flex: 1; min-width: 0; }
        .alert-label { display: block; font-size: 12px; color: var(--text-primary); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .alert-meta { display: block; font-size: 10px; color: var(--text-muted); margin-top: 2px; font-family: var(--font-mono); }
        .alert-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .alert-action-btn { display: flex; align-items: center; padding: 4px; border-radius: 4px; color: var(--text-muted); transition: all 0.15s; cursor: pointer; }
        .alert-action-btn:hover { background: var(--bg-hover); }
        .alert-action-btn.toggle { color: var(--green); }
        .alert-action-btn.toggle.off { color: var(--text-muted); }
        .alert-action-btn.delete:hover { color: var(--red); }
        .alert-active-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 6px var(--green); animation: pulse 2s infinite; flex-shrink: 0; }
        .alert-inactive-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border); flex-shrink: 0; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

function AlertRow({ alert, onToggle, onDelete }) {
  return (
    <div className={`alert-row ${!alert.active ? 'inactive' : ''}`}>
      <div className={alert.active ? 'alert-active-dot' : 'alert-inactive-dot'} />
      <div className="alert-info">
        <span className="alert-label">{alert.label}</span>
        <span className="alert-meta">
          {alert.symbol.replace('USDT','')} · {alert.type} · créée {timeAgo(alert.createdAt)}
          {alert.repeat ? ' · répète' : ''}
        </span>
      </div>
      <div className="alert-actions">
        <button
          className={`alert-action-btn toggle ${!alert.active ? 'off' : ''}`}
          onClick={() => onToggle(alert.id)}
          title={alert.active ? 'Désactiver' : 'Activer'}
        >
          {alert.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
        </button>
        <button className="alert-action-btn delete" onClick={() => onDelete(alert.id)} title="Supprimer">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
