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
