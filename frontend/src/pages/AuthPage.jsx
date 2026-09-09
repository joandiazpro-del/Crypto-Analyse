import React, { useState } from 'react';
import { Activity, Mail, Lock, User, Eye, EyeOff, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode,    setMode]    = useState('login'); // 'login' | 'register'
  const [form,    setForm]    = useState({ email: '', password: '', name: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await register({ email: form.email, password: form.password, name: form.name });
      }
    } catch (err) {
      setError(err?.response?.data?.error ?? err.message ?? 'Erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <Activity size={22} color="#00d4ff" />
          <span className="auth-logo-text">CRYPTO<span style={{ color: '#00d4ff' }}>TERMINAL</span></span>
        </div>

        {/* Toggle */}
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>Connexion</button>
          <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); }}>Inscription</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>

          {mode === 'register' && (
            <div className="auth-field">
              <label><User size={12} /> Nom</label>
              <input type="text" placeholder="Ton nom" value={form.name} onChange={set('name')} autoComplete="name" />
            </div>
          )}

          <div className="auth-field">
            <label><Mail size={12} /> Email</label>
            <input type="email" placeholder="ton@email.com" value={form.email} onChange={set('email')} required autoComplete="email" />
          </div>

          <div className="auth-field">
            <label><Lock size={12} /> Mot de passe</label>
            <div className="auth-pwd-wrap">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder={mode === 'register' ? '8 caractères minimum' : 'Ton mot de passe'}
                value={form.password} onChange={set('password')} required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button type="button" className="auth-pwd-toggle" onClick={() => setShowPwd(v => !v)}>
                {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> Chargement...</>
              : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        {/* Plans */}
        {mode === 'register' && (
          <div className="auth-plans">
            <div className="auth-plans-title">Ce que tu débloques</div>
            <div className="auth-plan-row"><TrendingUp size={11} color="#00d4ff" /> Analyse IA avec 4 profils de risque</div>
            <div className="auth-plan-row"><TrendingUp size={11} color="#00d4ff" /> Alertes prix & indicateurs</div>
            <div className="auth-plan-row"><TrendingUp size={11} color="#00d4ff" /> News & sentiment en temps réel</div>
          </div>
        )}

        <div className="auth-disclaimer"><AlertTriangle size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />Pas un conseil financier — trading à vos risques</div>
      </div>

      <style>{`
        .auth-page {
          display: flex; align-items: center; justify-content: center;
          min-height: 100vh; background: var(--bg-primary);
          font-family: var(--font-mono);
        }
        .auth-card {
          width: 100%; max-width: 380px; padding: 32px;
          background: var(--bg-secondary); border: 1px solid var(--border);
          border-radius: 12px; display: flex; flex-direction: column; gap: 20px;
        }
        .auth-logo { display: flex; align-items: center; gap: 10px; justify-content: center; }
        .auth-logo-text { font-size: 16px; font-weight: 700; letter-spacing: 0.05em; color: var(--text-primary); }
        .auth-tabs { display: flex; background: var(--bg-card); border-radius: 8px; padding: 3px; }
        .auth-tab { flex: 1; padding: 7px; font-size: 12px; font-weight: 600; font-family: var(--font-mono); color: var(--text-muted); border-radius: 6px; transition: all 0.15s; cursor: pointer; }
        .auth-tab.active { background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(0,212,255,0.3); }
        .auth-form { display: flex; flex-direction: column; gap: 14px; }
        .auth-field { display: flex; flex-direction: column; gap: 5px; }
        .auth-field label { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .auth-field input {
          padding: 10px 12px; background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 6px; color: var(--text-primary); font-size: 13px;
          font-family: var(--font-mono); outline: none; transition: border-color 0.15s;
        }
        .auth-field input:focus { border-color: var(--accent); }
        .auth-pwd-wrap { position: relative; }
        .auth-pwd-wrap input { width: 100%; padding-right: 36px; }
        .auth-pwd-toggle { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; }
        .auth-error { font-size: 11px; color: var(--red); background: rgba(255,71,87,0.1); border: 1px solid rgba(255,71,87,0.3); border-radius: 6px; padding: 8px 10px; }
        .auth-submit {
          padding: 11px; font-size: 13px; font-weight: 700; font-family: var(--font-mono);
          color: var(--bg-primary); background: var(--accent); border-radius: 8px;
          cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 4px;
        }
        .auth-submit:hover:not(:disabled) { background: #00bcd4; }
        .auth-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-plans { background: var(--bg-card); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
        .auth-plans-title { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 4px; }
        .auth-plan-row { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-secondary); }
        .auth-disclaimer { font-size: 10px; color: var(--text-muted); text-align: center; line-height: 1.5; }
      `}</style>
    </div>
  );
}
