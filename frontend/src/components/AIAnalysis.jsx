import React, { useState } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Play, CheckCircle, XCircle, ChevronRight, Shield, Scale, Flame, Skull, Target, Zap, Users, ArrowDown, ArrowUp, Euro, TrendingUp as ProfitIcon } from 'lucide-react';

const RISK_PROFILES = [
  { id: 'conservative', label: 'Conservateur', Icon: Shield,  color: '#00d4ff', dimColor: 'rgba(0,212,255,0.12)', trader: 'Stan Weinstein',            rr: '1:1.5',  pos: '1-2%'   },
  { id: 'moderate',     label: 'Modéré',       Icon: Scale,   color: '#00e676', dimColor: 'rgba(0,230,118,0.12)', trader: 'Mark Minervini',             rr: '1:2.5',  pos: '5-8%'   },
  { id: 'aggressive',   label: 'Agressif',     Icon: Flame,   color: '#ff9f43', dimColor: 'rgba(255,159,67,0.12)', trader: 'Tudor Jones & Livermore',   rr: '1:5',    pos: '8-15%'  },
  { id: 'extreme',      label: 'Extrême',      Icon: Skull,   color: '#ff4757', dimColor: 'rgba(255,71,87,0.12)', trader: 'Williams & Burry',           rr: '1:10',   pos: '10-20%' },
];

const SIGNAL_META = {
  LONG:       { label: 'LONG',       color: '#00e676', bg: 'rgba(0,230,118,0.12)', Icon: TrendingUp,   isShort: false, strong: false },
  SHORT:      { label: 'SHORT',      color: '#ff4757', bg: 'rgba(255,71,87,0.12)', Icon: TrendingDown, isShort: true,  strong: false },
  ATTENDRE:   { label: 'ATTENDRE',   color: '#ffc107', bg: 'rgba(255,193,7,0.12)', Icon: Minus,        isShort: null,  strong: false },
  LONG_FORT:  { label: 'LONG FORT',  color: '#00e676', bg: 'rgba(0,230,118,0.16)', Icon: TrendingUp,   isShort: false, strong: true  },
  SHORT_FORT: { label: 'SHORT FORT', color: '#ff4757', bg: 'rgba(255,71,87,0.16)', Icon: TrendingDown, isShort: true,  strong: true  },
  // rétrocompatibilité
  ACHETER:    { label: 'LONG',       color: '#00e676', bg: 'rgba(0,230,118,0.12)', Icon: TrendingUp,   isShort: false, strong: false },
  VENDRE:     { label: 'SHORT',      color: '#ff4757', bg: 'rgba(255,71,87,0.12)', Icon: TrendingDown, isShort: true,  strong: false },
  NEUTRE:     { label: 'ATTENDRE',   color: '#ffc107', bg: 'rgba(255,193,7,0.12)', Icon: Minus,        isShort: null,  strong: false },
};

const SQUEEZE_RISK_COLOR = { 'élevé': '#ff4757', 'moyen': '#ff9f43', 'faible': '#00e676' };

export default function AIAnalysis({ analysis, loading, onAnalyze, coin, interval, riskProfile, onRiskProfileChange }) {
  const a = analysis?.analysis;
  const activeProfile = RISK_PROFILES.find(p => p.id === riskProfile) ?? RISK_PROFILES[1];
  const [capital,   setCapital]   = useState('');
  const [objective, setObjective] = useState('');

  const sm = a?.signal ? (SIGNAL_META[a.signal] ?? SIGNAL_META.ATTENDRE) : null;
  const isShort = sm?.isShort === true;

  const fmt = (n) => n != null ? `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 4 })}` : '—';

  return (
    <div className="panel ai-panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Brain size={13} color="var(--accent)" />
          <span className="panel-title">Analyse IA (Claude)</span>
        </div>
        <button className="ai-btn" onClick={() => onAnalyze({ capital: parseFloat(capital) || null, objective: parseFloat(objective) || null })} disabled={loading}>
          {loading
            ? <><div className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} /> Analyse...</>
            : <><Play size={11} /> Analyser</>}
        </button>
      </div>

      <div className="ai-body">

        {/* Sélecteur profil de risque */}
        <div className="risk-selector">
          {RISK_PROFILES.map(p => {
            const isActive = p.id === riskProfile;
            return (
              <button
                key={p.id}
                className={`risk-btn ${isActive ? 'active' : ''}`}
                style={isActive ? { borderColor: p.color, background: p.dimColor, color: p.color } : {}}
                onClick={() => onRiskProfileChange(p.id)}
                title={`${p.trader} — RR min ${p.rr}`}
              >
                <p.Icon size={12} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Info profil actif */}
        <div className="risk-info" style={{ borderColor: activeProfile.color + '40', background: activeProfile.dimColor }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Users size={11} color={activeProfile.color} />
            <span style={{ color: activeProfile.color, fontSize: 10, fontWeight: 700 }}>{activeProfile.trader}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>R/R min <span style={{ color: activeProfile.color, fontFamily: 'var(--font-mono)' }}>{activeProfile.rr}</span></span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Position <span style={{ color: activeProfile.color, fontFamily: 'var(--font-mono)' }}>{activeProfile.pos}</span></span>
          </div>
        </div>

        {/* Champs optionnels capital */}
        <div className="ai-capital-inputs">
          <div className="ai-capital-field">
            <label>Capital disponible</label>
            <div className="ai-capital-input-wrap">
              <input
                type="number" min="0" placeholder="500"
                value={capital} onChange={e => setCapital(e.target.value)}
              />
              <span className="ai-capital-unit">€/$</span>
            </div>
          </div>
          <div className="ai-capital-field">
            <label>Objectif de bénéfice</label>
            <div className="ai-capital-input-wrap">
              <input
                type="number" min="0" placeholder="50"
                value={objective} onChange={e => setObjective(e.target.value)}
              />
              <span className="ai-capital-unit">€/$</span>
            </div>
          </div>
        </div>

        {/* États vide / loading */}
        {!a && !loading && (
          <div className="ai-empty">
            <Brain size={20} color="var(--text-muted)" />
            <p>Lance l'analyse pour obtenir un diagnostic {activeProfile.trader} sur {coin?.symbol} ({interval})</p>
          </div>
        )}
        {loading && (
          <div className="ai-loading">
            <div className="spinner" />
            <p>Claude analyse en mode <span style={{ color: activeProfile.color }}>{activeProfile.label}</span>...</p>
          </div>
        )}

        {/* Résultat */}
        {a && !loading && sm && (
          <div className="ai-result">

            {/* Signal principal */}
            <div className="ai-signal-row">
              <div
                className={`signal-badge-main ${sm.strong ? 'strong' : ''}`}
                style={{ color: sm.color, background: sm.bg, border: `1px solid ${sm.color}50`, boxShadow: sm.strong ? `0 0 16px ${sm.color}40` : 'none' }}
              >
                <sm.Icon size={16} />
                <span>{sm.label}</span>
                {sm.strong && <Zap size={12} />}
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Confiance</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{a.confidence}%</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Horizon</div>
                <div style={{ fontSize: 11, color: 'var(--text-primary)' }}>{String(a.timeHorizon || '')}</div>
              </div>
              {a.setupType && a.setupType !== 'none' && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Setup</div>
                  <div style={{ fontSize: 11, color: activeProfile.color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{a.setupType}</div>
                </div>
              )}
            </div>

            {/* Alerte SHORT SQUEEZE */}
            {a.shortSetup?.squeezeRisk === 'élevé' && (
              <div className="ai-squeeze-alert">
                <AlertTriangle size={13} color="#ff4757" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 11 }}>Risque de Short Squeeze ÉLEVÉ</div>
                  <div style={{ fontSize: 10, marginTop: 2, color: 'var(--text-secondary)' }}>
                    Beaucoup de positions short ouvertes — un mouvement haussier pourrait les liquider en cascade.
                    {coin?.symbol === 'HYPE' && ' HYPE est particulièrement exposé à ce risque.'}
                  </div>
                </div>
              </div>
            )}

            {/* Style trader */}
            <div className="ai-trader-badge" style={{ borderColor: activeProfile.color + '50', background: activeProfile.dimColor }}>
              <activeProfile.Icon size={11} color={activeProfile.color} />
              <span style={{ color: activeProfile.color, fontSize: 10, fontWeight: 700 }}>Analyse à la {a.traderStyle ?? activeProfile.trader}</span>
            </div>

            {/* Philosophie */}
            {a.philosophy && (
              <p className="ai-philosophy">{a.philosophy}</p>
            )}

            {/* Résumé */}
            <p className="ai-summary">{String(a.summary || '')}</p>

            {/* Setups Long / Short */}
            {(a.longSetup || a.shortSetup) && (
              <div className="ai-setups-grid">
                {a.longSetup && (
                  <div className={`ai-setup-card ${a.longSetup.viable ? 'viable-long' : 'not-viable'}`}>
                    <div className="ai-setup-card-header">
                      <TrendingUp size={11} />
                      <span>LONG</span>
                      <span className={`ai-setup-badge ${a.longSetup.viable ? 'yes' : 'no'}`}>
                        {a.longSetup.viable ? 'Viable' : 'Non viable'}
                      </span>
                    </div>
                    <p className="ai-setup-reason">{a.longSetup.reason}</p>
                  </div>
                )}
                {a.shortSetup && (
                  <div className={`ai-setup-card ${a.shortSetup.viable ? 'viable-short' : 'not-viable'}`}>
                    <div className="ai-setup-card-header">
                      <TrendingDown size={11} />
                      <span>SHORT</span>
                      <span className={`ai-setup-badge ${a.shortSetup.viable ? 'yes-short' : 'no'}`}>
                        {a.shortSetup.viable ? 'Viable' : 'Non viable'}
                      </span>
                    </div>
                    <p className="ai-setup-reason">{a.shortSetup.reason}</p>
                    {a.shortSetup.squeezeRisk && (
                      <div className="ai-squeeze-tag" style={{ color: SQUEEZE_RISK_COLOR[a.shortSetup.squeezeRisk] }}>
                        <Zap size={9} />
                        Squeeze : {a.shortSetup.squeezeRisk}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Taille de position */}
            {a.positionSize && (
              <div className="ai-position-size" style={{ borderColor: activeProfile.color + '50' }}>
                <Target size={13} color={activeProfile.color} />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Taille de position suggérée</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: activeProfile.color, fontFamily: 'var(--font-mono)' }}>{a.positionSize}</div>
                </div>
              </div>
            )}

            {/* Catalyseur + Liquidité */}
            <div className="ai-catalyst-grid">
              {a.catalyst && (
                <div className="ai-catalyst-box">
                  <div className="ai-catalyst-label"><Zap size={10} color="var(--yellow)" /> Catalyseur</div>
                  <div className="ai-catalyst-text">{a.catalyst}</div>
                </div>
              )}
              {a.liquidityTarget && (
                <div className="ai-catalyst-box">
                  <div className="ai-catalyst-label"><Target size={10} color="var(--accent)" /> Zone de liquidité</div>
                  <div className="ai-catalyst-text">{a.liquidityTarget}</div>
                </div>
              )}
            </div>

            {/* Points haussiers / baissiers */}
            <div className="ai-points">
              <div>
                <div className="ai-points-title pos"><CheckCircle size={10} /> Haussier</div>
                {a.bullishPoints?.map((p, i) => (
                  <div key={i} className="ai-point"><ChevronRight size={10} />{p}</div>
                ))}
              </div>
              <div>
                <div className="ai-points-title neg"><XCircle size={10} /> Baissier</div>
                {a.bearishPoints?.map((p, i) => (
                  <div key={i} className="ai-point"><ChevronRight size={10} />{p}</div>
                ))}
              </div>
            </div>

            {/* Niveaux clés */}
            {a.keyLevels && (
              <div className="ai-levels">
                <div className="ai-level-row">
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Support 1</span>
                  <span className="mono pos">{fmt(a.keyLevels.support1)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Support 2</span>
                  <span className="mono pos">{fmt(a.keyLevels.support2)}</span>
                </div>
                <div className="ai-level-row">
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Résistance 1</span>
                  <span className="mono neg">{fmt(a.keyLevels.resistance1)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Résistance 2</span>
                  <span className="mono neg">{fmt(a.keyLevels.resistance2)}</span>
                </div>
              </div>
            )}

            {/* SL + 3 TP — inversé visuellement pour les shorts */}
            {(a.stopLoss || a.takeProfit1) && (
              <>
                {isShort && (
                  <div className="ai-direction-banner short">
                    <TrendingDown size={12} />
                    <span>Position SHORT — SL au-dessus, TP vers le bas</span>
                  </div>
                )}
                <div className="ai-sltp-grid">
                  <div className={`ai-sltp-box sl ${isShort ? 'sl-short' : ''}`}>
                    <div className="ai-sltp-label">Stop Loss {isShort ? <ArrowUp size={9} /> : ''}</div>
                    <div className="ai-sltp-value neg">{fmt(a.stopLoss)}</div>
                    <div className="ai-sltp-sub">{isShort ? 'Au-dessus résistance' : 'Sortie immédiate'}</div>
                  </div>
                  <div className={`ai-sltp-box tp ${isShort ? 'tp-short' : ''}`}>
                    <div className="ai-sltp-label">TP1 · 33% {isShort ? <ArrowDown size={9} /> : ''}</div>
                    <div className="ai-sltp-value" style={{ color: isShort ? '#ff9f43' : 'var(--green)' }}>{fmt(a.takeProfit1)}</div>
                    <div className="ai-sltp-sub">Partiel</div>
                  </div>
                  <div className={`ai-sltp-box tp ${isShort ? 'tp-short' : ''}`}>
                    <div className="ai-sltp-label">TP2 · 33% {isShort ? <ArrowDown size={9} /> : ''}</div>
                    <div className="ai-sltp-value" style={{ color: isShort ? '#ff9f43' : 'var(--green)' }}>{fmt(a.takeProfit2)}</div>
                    <div className="ai-sltp-sub">Partiel</div>
                  </div>
                  <div className={`ai-sltp-box tp full ${isShort ? 'tp-short' : ''}`} style={{ borderColor: isShort ? 'rgba(255,71,87,0.4)' : activeProfile.color + '60' }}>
                    <div className="ai-sltp-label">TP3 · 33% {isShort ? <ArrowDown size={9} /> : ''}</div>
                    <div className="ai-sltp-value" style={{ color: isShort ? '#ff4757' : activeProfile.color }}>{fmt(a.takeProfit3)}</div>
                    <div className="ai-sltp-sub">{isShort ? 'Objectif max' : 'Full send'}</div>
                  </div>
                </div>
              </>
            )}

            {/* R/R */}
            {a.riskReward && (
              <div style={{ textAlign: 'center', padding: '6px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Risk/Reward : </span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: activeProfile.color }}>{a.riskReward}</span>
              </div>
            )}

            {/* Analyse du capital */}
            {a.capitalAnalysis && (
              <CapitalAnalysis ca={a.capitalAnalysis} signalColor={sm?.color ?? 'var(--accent)'} />
            )}

            {/* Warning */}
            {a.warning && typeof a.warning === 'string' && (
              <div className="ai-warning">
                <AlertTriangle size={12} color="var(--yellow)" />
                <span>{a.warning}</span>
              </div>
            )}

            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textAlign: 'right' }}>
              {new Date(analysis.generatedAt).toLocaleTimeString('fr-FR')} · {analysis.model}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .ai-panel { flex-shrink: 0; }
        .ai-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: var(--radius);
          background: var(--accent-dim); color: var(--accent);
          border: 1px solid rgba(0,212,255,0.3); font-size: 11px; font-weight: 600;
          transition: all 0.15s; cursor: pointer;
        }
        .ai-btn:hover:not(:disabled) { background: rgba(0,212,255,0.25); }
        .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .risk-selector { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 8px; }
        .risk-btn {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          padding: 6px 4px; border-radius: var(--radius); font-size: 10px; font-weight: 600;
          color: var(--text-muted); border: 1px solid var(--border); transition: all 0.15s; cursor: pointer;
        }
        .risk-btn:hover { color: var(--text-primary); background: var(--bg-hover); }
        .risk-info {
          display: flex; flex-direction: column; gap: 2px;
          padding: 6px 8px; border-radius: var(--radius); border: 1px solid;
          margin-bottom: 8px;
        }

        .ai-body { padding: 10px 12px; }
        .ai-empty, .ai-loading {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 16px 0; text-align: center;
          color: var(--text-muted); font-size: 12px;
        }
        .ai-result { display: flex; flex-direction: column; gap: 10px; }
        .ai-signal-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

        /* Badge signal principal */
        .signal-badge-main {
          display: flex; align-items: center; gap: 7px;
          padding: 6px 14px; border-radius: 8px; font-size: 14px; font-weight: 800;
          font-family: var(--font-mono); letter-spacing: 0.05em; transition: all 0.2s;
        }
        .signal-badge-main.strong {
          animation: pulse-strong 2s ease-in-out infinite;
        }
        @keyframes pulse-strong {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }

        /* Squeeze alert */
        .ai-squeeze-alert {
          display: flex; align-items: flex-start; gap: 8px;
          background: rgba(255,71,87,0.08); border: 1px solid rgba(255,71,87,0.4);
          border-radius: var(--radius); padding: 8px 10px; color: var(--red);
        }
        .ai-squeeze-alert svg { flex-shrink: 0; margin-top: 1px; }

        /* Badge trader */
        .ai-trader-badge {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 8px; border-radius: var(--radius); border: 1px solid;
        }
        .ai-philosophy {
          font-size: 11px; line-height: 1.6; color: var(--text-muted);
          font-style: italic; border-left: 2px solid var(--border); padding-left: 8px; margin: 0;
        }
        .ai-summary { font-size: 12px; line-height: 1.6; color: var(--text-secondary); margin: 0; }

        /* Setups long/short */
        .ai-setups-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .ai-setup-card {
          border: 1px solid var(--border); border-radius: var(--radius);
          padding: 8px 10px; display: flex; flex-direction: column; gap: 5px;
        }
        .ai-setup-card.viable-long  { border-color: rgba(0,230,118,0.3); background: rgba(0,230,118,0.05); }
        .ai-setup-card.viable-short { border-color: rgba(255,71,87,0.3);  background: rgba(255,71,87,0.05);  }
        .ai-setup-card.not-viable   { opacity: 0.6; }
        .ai-setup-card-header { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
        .ai-setup-card.viable-long  .ai-setup-card-header { color: var(--green); }
        .ai-setup-card.viable-short .ai-setup-card-header { color: var(--red); }
        .ai-setup-card.not-viable   .ai-setup-card-header { color: var(--text-muted); }
        .ai-setup-badge { margin-left: auto; padding: 1px 6px; border-radius: 4px; font-size: 9px; }
        .ai-setup-badge.yes       { background: rgba(0,230,118,0.15); color: var(--green); }
        .ai-setup-badge.yes-short { background: rgba(255,71,87,0.15);  color: var(--red); }
        .ai-setup-badge.no        { background: rgba(122,146,168,0.1); color: var(--text-muted); }
        .ai-setup-reason { font-size: 10px; color: var(--text-secondary); line-height: 1.4; margin: 0; }
        .ai-squeeze-tag { display: flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

        /* Position size */
        .ai-position-size {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: var(--radius); border: 1px solid;
          background: var(--bg-card);
        }

        /* Catalyseur */
        .ai-catalyst-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .ai-catalyst-box { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 6px 8px; }
        .ai-catalyst-label { display: flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); margin-bottom: 3px; }
        .ai-catalyst-text { font-size: 10px; color: var(--text-secondary); line-height: 1.4; }

        /* Points */
        .ai-points { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .ai-points-title { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 4px; }
        .ai-point { display: flex; align-items: flex-start; gap: 4px; font-size: 10px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 2px; }
        .ai-point svg { flex-shrink: 0; margin-top: 2px; color: var(--accent); }

        /* Niveaux */
        .ai-levels { background: var(--bg-card); border-radius: var(--radius); padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }
        .ai-level-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px; align-items: center; font-size: 10px; }

        /* Direction banner short */
        .ai-direction-banner.short {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 10px; border-radius: var(--radius);
          background: rgba(255,71,87,0.08); border: 1px solid rgba(255,71,87,0.3);
          color: var(--red); font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
        }

        /* SL/TP */
        .ai-sltp-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px; }
        .ai-sltp-box { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 6px 8px; text-align: center; }
        .ai-sltp-box.sl        { border-color: rgba(255,71,87,0.3); background: rgba(255,71,87,0.05); }
        .ai-sltp-box.sl.sl-short { border-color: rgba(255,71,87,0.5); background: rgba(255,71,87,0.08); }
        .ai-sltp-box.tp        { border-color: rgba(0,230,118,0.2); }
        .ai-sltp-box.tp.tp-short { border-color: rgba(255,159,67,0.25); background: rgba(255,159,67,0.04); }
        .ai-sltp-box.full      { background: rgba(0,0,0,0.2); }
        .ai-sltp-label { font-size: 9px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 2px; display: flex; align-items: center; justify-content: center; gap: 3px; }
        .ai-sltp-value { font-size: 11px; font-family: var(--font-mono); font-weight: 700; }
        .ai-sltp-sub { font-size: 9px; color: var(--text-muted); margin-top: 1px; }

        .ai-warning { display: flex; align-items: flex-start; gap: 6px; background: var(--yellow-dim); border: 1px solid rgba(255,193,7,0.3); border-radius: var(--radius); padding: 6px 10px; font-size: 11px; color: var(--yellow); line-height: 1.5; }

        /* Champs capital */
        .ai-capital-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; }
        .ai-capital-field { display: flex; flex-direction: column; gap: 3px; }
        .ai-capital-field label { font-size: 9px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .ai-capital-input-wrap { position: relative; }
        .ai-capital-input-wrap input {
          width: 100%; padding: 6px 28px 6px 8px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: var(--radius);
          color: var(--text-primary); font-size: 12px; font-family: var(--font-mono);
          outline: none; transition: border-color 0.15s;
        }
        .ai-capital-input-wrap input:focus { border-color: var(--accent); }
        .ai-capital-unit { position: absolute; right: 7px; top: 50%; transform: translateY(-50%); font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); pointer-events: none; }

        /* Section capital analyse */
        .cap-section { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
        .cap-header { display: flex; align-items: center; gap: 6px; padding: 7px 10px; background: var(--bg-card); border-bottom: 1px solid var(--border); font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; }
        .cap-revenge { display: flex; align-items: flex-start; gap: 8px; padding: 10px; background: rgba(255,159,67,0.08); border-bottom: 1px solid rgba(255,159,67,0.25); color: var(--yellow); font-size: 11px; line-height: 1.5; }
        .cap-revenge svg { flex-shrink: 0; margin-top: 1px; }
        .cap-body { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
        .cap-gains { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
        .cap-gain-box { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 6px 8px; text-align: center; }
        .cap-gain-label { font-size: 9px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 2px; }
        .cap-gain-value { font-size: 12px; font-weight: 700; font-family: var(--font-mono); }
        .cap-gain-value.realistic { color: var(--green); }
        .cap-gain-value.unrealistic { color: var(--red); }
        .cap-row { display: flex; justify-content: space-between; align-items: center; font-size: 10px; padding: 3px 0; border-bottom: 1px solid rgba(30,45,61,0.4); }
        .cap-row:last-child { border-bottom: none; }
        .cap-row-label { color: var(--text-muted); }
        .cap-row-value { font-family: var(--font-mono); font-weight: 600; color: var(--text-primary); }
        .cap-unrealistic-banner { display: flex; align-items: center; gap: 6px; padding: 7px 10px; background: rgba(255,71,87,0.08); border: 1px solid rgba(255,71,87,0.25); border-radius: var(--radius); font-size: 11px; color: var(--red); }
        .cap-disclaimer { font-size: 9px; color: var(--text-muted); text-align: center; line-height: 1.4; padding-top: 4px; }
      `}</style>
    </div>
  );
}

function CapitalAnalysis({ ca, signalColor }) {
  if (!ca) return null;
  const isRealistic = ca.objectiveRealistic !== false;

  return (
    <div className="cap-section">
      <div className="cap-header">
        <Target size={11} color="var(--accent)" />
        Analyse du capital — {ca.capitalAvailable}€ disponible
        {ca.objectiveRequested && (
          <span style={{ marginLeft: 'auto', color: isRealistic ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
            Objectif {ca.objectiveRequested}€ : {isRealistic ? 'Réaliste' : 'Irréaliste'}
          </span>
        )}
      </div>

      {ca.revengeTradingWarning && ca.revengeTradingMessage && (
        <div className="cap-revenge">
          <AlertTriangle size={14} color="var(--yellow)" />
          <span>{ca.revengeTradingMessage}</span>
        </div>
      )}

      {!isRealistic && (
        <div className="cap-unrealistic-banner" style={{ margin: '8px 10px 0' }}>
          <AlertTriangle size={12} />
          <span>Objectif irréaliste sans levier avec ce capital. Voir gains réalistes ci-dessous.</span>
        </div>
      )}

      <div className="cap-body">
        {/* Gains TP */}
        {ca.realisticGain && (
          <div className="cap-gains">
            {['tp1', 'tp2', 'tp3'].map((tp, i) => ca.realisticGain[tp] && (
              <div key={tp} className="cap-gain-box">
                <div className="cap-gain-label">TP{i + 1}</div>
                <div className={`cap-gain-value ${isRealistic || !ca.objectiveRequested ? 'realistic' : 'unrealistic'}`}>
                  {ca.realisticGain[tp]}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Infos position */}
        <div>
          {ca.positionSizeNeeded && ca.objectiveRequested && (
            <div className="cap-row">
              <span className="cap-row-label">Position pour atteindre l'objectif</span>
              <span className="cap-row-value" style={{ color: isRealistic ? signalColor : 'var(--red)' }}>{ca.positionSizeNeeded}</span>
            </div>
          )}
          {ca.positionSizeRecommended && (
            <div className="cap-row">
              <span className="cap-row-label">Position recommandée</span>
              <span className="cap-row-value" style={{ color: signalColor }}>{ca.positionSizeRecommended}</span>
            </div>
          )}
        </div>

        <p className="cap-disclaimer">
          Calculs indicatifs, sans levier, hors frais. Pas un conseil financier — trading à vos risques.
        </p>
      </div>
    </div>
  );
}
