import React, { useState } from 'react';
import { Settings, User, Lock, Trash2, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="settings-section">
      <div className="settings-section-title">
        <Icon size={13} color="var(--accent)" />
        {title}
      </div>
      {children}
    </div>
  );
}

function StatusMsg({ type, msg }) {
  if (!msg) return null;
  return (
    <div className={`settings-status ${type}`}>
      {type === 'success' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
      {msg}
    </div>
  );
}

export default function SettingsPage({ onClose }) {
  const { user, logout } = useAuth();

  // Profile
  const [name,        setName]        = useState(user?.name ?? '');
  const [profileMsg,  setProfileMsg]  = useState({ type: '', msg: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' });
  const [showPwd,   setShowPwd]   = useState(false);
  const [pwdMsg,    setPwdMsg]    = useState({ type: '', msg: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePwd,     setDeletePwd]     = useState('');
  const [deleteMsg,     setDeleteMsg]     = useState({ type: '', msg: '' });
  const [deleting,      setDeleting]      = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg({ type: '', msg: '' });
    try {
      await api.patch('/auth/profile', { name });
      setProfileMsg({ type: 'success', msg: 'Nom mis à jour ✓' });
    } catch (err) {
      setProfileMsg({ type: 'error', msg: err?.response?.data?.error ?? 'Erreur' });
    } finally { setSavingProfile(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.new !== pwd.confirm) { setPwdMsg({ type: 'error', msg: 'Les mots de passe ne correspondent pas' }); return; }
    if (pwd.new.length < 8) { setPwdMsg({ type: 'error', msg: '8 caractères minimum' }); return; }
    setSavingPwd(true); setPwdMsg({ type: '', msg: '' });
    try {
      await api.patch('/auth/password', { currentPassword: pwd.current, newPassword: pwd.new });
      setPwdMsg({ type: 'success', msg: 'Mot de passe modifié ✓' });
      setPwd({ current: '', new: '', confirm: '' });
    } catch (err) {
      setPwdMsg({ type: 'error', msg: err?.response?.data?.error ?? 'Erreur' });
    } finally { setSavingPwd(false); }
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    if (deleteConfirm !== 'SUPPRIMER') { setDeleteMsg({ type: 'error', msg: 'Tape exactement SUPPRIMER pour confirmer' }); return; }
    setDeleting(true); setDeleteMsg({ type: '', msg: '' });
    try {
      await api.del('/auth/account', { data: { password: deletePwd } });
      logout();
    } catch (err) {
      setDeleteMsg({ type: 'error', msg: err?.response?.data?.error ?? 'Erreur' });
      setDeleting(false);
    }
  };

  return (
    <div className="settings-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="settings-modal">

        {/* Header */}
        <div className="settings-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={15} color="var(--accent)" />
            <span className="settings-title">Paramètres</span>
          </div>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        {/* Infos compte */}
        <div className="settings-account-info">
          <div className="settings-avatar">{(user?.name || user?.email || '?')[0].toUpperCase()}</div>
          <div>
            <div className="settings-account-name">{user?.name || 'Sans nom'}</div>
            <div className="settings-account-email">{user?.email}</div>
            <span className="settings-account-plan">{user?.plan?.toUpperCase() ?? 'FREE'}</span>
          </div>
        </div>

        <div className="settings-body">

          {/* Profil */}
          <Section title="Profil" icon={User}>
            <form onSubmit={saveProfile} className="settings-form">
              <div className="settings-field">
                <label>Nom affiché</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ton nom" />
              </div>
              <div className="settings-field">
                <label>Email</label>
                <input value={user?.email ?? ''} disabled className="disabled" />
              </div>
              <StatusMsg {...profileMsg} />
              <button type="submit" className="settings-btn primary" disabled={savingProfile}>
                {savingProfile ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </form>
          </Section>

          {/* Mot de passe */}
          <Section title="Mot de passe" icon={Lock}>
            <form onSubmit={changePassword} className="settings-form">
              <div className="settings-field">
                <label>Mot de passe actuel</label>
                <div className="pwd-wrap">
                  <input type={showPwd ? 'text' : 'password'} value={pwd.current} onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}>{showPwd ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                </div>
              </div>
              <div className="settings-field">
                <label>Nouveau mot de passe</label>
                <input type={showPwd ? 'text' : 'password'} value={pwd.new} onChange={e => setPwd(p => ({ ...p, new: e.target.value }))} placeholder="8 caractères minimum" />
              </div>
              <div className="settings-field">
                <label>Confirmer le nouveau</label>
                <input type={showPwd ? 'text' : 'password'} value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              <StatusMsg {...pwdMsg} />
              <button type="submit" className="settings-btn primary" disabled={savingPwd}>
                {savingPwd ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </form>
          </Section>

          {/* Supprimer le compte */}
          <Section title="Zone de danger" icon={Trash2}>
            <form onSubmit={deleteAccount} className="settings-form danger-zone">
              <p className="danger-warning">
                <AlertTriangle size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                Cette action est irréversible. Toutes tes alertes et données seront supprimées définitivement.
              </p>
              <div className="settings-field">
                <label>Mot de passe pour confirmer</label>
                <input type="password" value={deletePwd} onChange={e => setDeletePwd(e.target.value)} />
              </div>
              <div className="settings-field">
                <label>Tape <strong>SUPPRIMER</strong> pour confirmer</label>
                <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="SUPPRIMER" />
              </div>
              <StatusMsg {...deleteMsg} />
              <button type="submit" className="settings-btn danger" disabled={deleting}>
                {deleting ? 'Suppression...' : <><Trash2 size={12} /> Supprimer mon compte</>}
              </button>
            </form>
          </Section>

        </div>
      </div>

      <style>{`
        .settings-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.7);
          z-index: 1000; display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .settings-modal {
          width: 100%; max-width: 480px; max-height: 90vh;
          background: var(--bg-secondary); border: 1px solid var(--border);
          border-radius: 12px; display: flex; flex-direction: column; overflow: hidden;
        }
        .settings-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px; border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
        .settings-title { font-size: 13px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
        .settings-close { font-size: 16px; color: var(--text-muted); cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: all 0.15s; }
        .settings-close:hover { color: var(--red); background: rgba(255,71,87,0.1); }

        .settings-account-info {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 18px; border-bottom: 1px solid var(--border);
          background: var(--bg-card); flex-shrink: 0;
        }
        .settings-avatar {
          width: 42px; height: 42px; border-radius: 50%;
          background: var(--accent-dim); border: 2px solid var(--accent);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 700; color: var(--accent); font-family: var(--font-mono);
          flex-shrink: 0;
        }
        .settings-account-name  { font-size: 13px; font-weight: 700; color: var(--text-primary); }
        .settings-account-email { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
        .settings-account-plan  { font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 1px 6px; border-radius: 6px; background: var(--accent-dim); color: var(--accent); margin-top: 4px; display: inline-block; }

        .settings-body { overflow-y: auto; flex: 1; padding: 16px 18px; display: flex; flex-direction: column; gap: 20px; }

        .settings-section { display: flex; flex-direction: column; gap: 12px; }
        .settings-section-title { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); padding-bottom: 8px; border-bottom: 1px solid var(--border); }

        .settings-form { display: flex; flex-direction: column; gap: 10px; }
        .settings-field { display: flex; flex-direction: column; gap: 4px; }
        .settings-field label { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .settings-field input {
          padding: 8px 10px; background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 6px; color: var(--text-primary); font-size: 12px;
          font-family: var(--font-mono); outline: none; transition: border-color 0.15s;
        }
        .settings-field input:focus { border-color: var(--accent); }
        .settings-field input.disabled { opacity: 0.4; cursor: not-allowed; }
        .pwd-wrap { position: relative; }
        .pwd-wrap input { width: 100%; padding-right: 32px; }
        .pwd-wrap button { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; }

        .settings-btn {
          padding: 9px 16px; border-radius: var(--radius); font-size: 12px; font-weight: 600;
          font-family: var(--font-mono); cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .settings-btn.primary { background: var(--accent); color: var(--bg-primary); }
        .settings-btn.primary:hover:not(:disabled) { background: #00bcd4; }
        .settings-btn.danger  { background: rgba(255,71,87,0.15); color: var(--red); border: 1px solid rgba(255,71,87,0.35); }
        .settings-btn.danger:hover:not(:disabled) { background: rgba(255,71,87,0.25); }
        .settings-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .settings-status { display: flex; align-items: center; gap: 6px; padding: 7px 10px; border-radius: 6px; font-size: 11px; border: 1px solid; }
        .settings-status.success { color: var(--green); border-color: rgba(0,230,118,0.3); background: rgba(0,230,118,0.08); }
        .settings-status.error   { color: var(--red);   border-color: rgba(255,71,87,0.3); background: rgba(255,71,87,0.08); }

        .danger-zone { border: 1px solid rgba(255,71,87,0.2); border-radius: var(--radius); padding: 12px; background: rgba(255,71,87,0.04); }
        .danger-warning { font-size: 11px; color: var(--red); line-height: 1.5; }
      `}</style>
    </div>
  );
}
