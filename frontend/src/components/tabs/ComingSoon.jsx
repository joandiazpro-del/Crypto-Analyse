import React from 'react';

export default function ComingSoon({ Icon, title, description, features }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon-icon">{Icon && <Icon size={44} color="var(--accent)" strokeWidth={1.5} />}</div>
      <h2 className="coming-soon-title">{title}</h2>
      <p className="coming-soon-desc">{description}</p>
      {features && (
        <ul className="coming-soon-features">
          {features.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      )}
      <div className="coming-soon-badge">En développement</div>

      <style>{`
        .coming-soon {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          height: 100%; gap: 16px; padding: 40px; text-align: center;
        }
        .coming-soon-icon { display: flex; align-items: center; justify-content: center; }
        .coming-soon-title { font-size: 20px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
        .coming-soon-desc { font-size: 13px; color: var(--text-secondary); max-width: 480px; line-height: 1.6; }
        .coming-soon-features { list-style: none; display: flex; flex-direction: column; gap: 6px; }
        .coming-soon-features li { font-size: 12px; color: var(--text-muted); }
        .coming-soon-features li::before { content: '→ '; color: var(--accent); }
        .coming-soon-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 12px; border-radius: 12px; background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(0,212,255,0.3); }
      `}</style>
    </div>
  );
}
