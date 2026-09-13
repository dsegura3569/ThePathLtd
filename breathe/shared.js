window.GearIcon = function GearIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 17.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 13 1.65 1.65 0 0 0 3.17 12H3.09a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.68 7a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3.09a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.68a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9c.13.62.63 1.09 1.26 1.24l.42.09a2 2 0 1 1 0 3.9l-.42.09a1.65 1.65 0 0 0-1.18 1.24z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

window.SettingsModal = function SettingsModal({ soundMode, setSoundMode, animationStyle, setAnimationStyle, excludeSoundModes, onClose }) {
  const excluded = excludeSoundModes || [];
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(43,27,16,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', zIndex: 100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card-bg, #fff)', borderRadius: 12, padding: '1.75rem',
          maxWidth: 400, width: '100%', maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Sound &amp; Animation</h2>
          <button onClick={onClose} aria-label="Close" style={{
            background: 'none', border: 'none', fontSize: '1.4rem', lineHeight: 1, cursor: 'pointer', color: 'var(--ink-soft)',
          }}>&times;</button>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: 0 }}>
          Applies to every pattern. Saved on this device.
        </p>

        <div style={{ margin: '1.25rem 0' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Sound</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {window.SOUND_OPTIONS.filter(opt => !excluded.includes(opt.id)).map(opt => (
              <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                <input type="radio" name="sound" checked={soundMode === opt.id} onChange={() => setSoundMode(opt.id)} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ margin: '1.25rem 0' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Animation</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {window.ANIMATION_OPTIONS.map(opt => (
              <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                <input type="radio" name="animation" checked={animationStyle === opt.id} onChange={() => setAnimationStyle(opt.id)} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <window.PrimaryButton onClick={onClose}>Done</window.PrimaryButton>
      </div>
    </div>
  );
};

window.Card = function Card({ children, onClick, active }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--sand-pale)',
        border: `1px solid ${active ? 'var(--breathe-color)' : 'var(--line)'}`,
        borderRadius: 12,
        padding: '1.5rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s ease, transform 0.2s ease',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = 'var(--breathe-color)'; }}
      onMouseLeave={e => { if (onClick && !active) e.currentTarget.style.borderColor = 'var(--line)'; }}
    >
      {children}
    </div>
  );
};

window.PrimaryButton = function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '0.8rem 1.6rem', borderRadius: 8, border: 'none',
        background: disabled ? 'var(--line)' : 'var(--breathe-color)',
        color: '#fff', fontSize: '1rem', fontWeight: 600,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
};

window.GhostButton = function GhostButton({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.6rem 1.2rem', borderRadius: 8, border: '1px solid var(--line)',
      background: 'transparent', color: 'var(--ink)', fontSize: '0.9rem',
    }}>
      {children}
    </button>
  );
};
