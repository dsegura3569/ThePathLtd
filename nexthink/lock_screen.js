function NexthinkLockScreen({ onUnlock, accentColor, displayFont, bodyFont, monoFont }) {
  const [showPassphrase, setShowPassphrase] = React.useState(false);
  const [passphraseInput, setPassphraseInput] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const supported = window.NexthinkGate.webAuthnSupported();
  const enrolled = window.NexthinkGate.hasEnrolledCredential();

  async function handleFaceId() {
    setError(''); setBusy(true);
    try {
      await window.NexthinkGate.unlockFaceId();
      onUnlock();
    } catch (e) {
      setError('Face ID was cancelled or failed. Try again, or use the passphrase.');
    } finally {
      setBusy(false);
    }
  }

  function handlePassphrase(e) {
    e.preventDefault();
    if (window.NexthinkGate.unlockPassphrase(passphraseInput)) {
      onUnlock();
    } else {
      setError('That passphrase is not right.');
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: bodyFont || 'sans-serif',
    }}>
      <div style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <div style={{
          fontFamily: monoFont || 'monospace', fontSize: 11.5, letterSpacing: '0.12em',
          color: accentColor || '#555', textTransform: 'uppercase', marginBottom: 10,
        }}>Locked</div>
        <div style={{
          fontFamily: displayFont || 'sans-serif', fontWeight: 800, fontSize: 24, marginBottom: 24,
        }}>This section is private</div>

        {!showPassphrase && (
          <React.Fragment>
            {supported ? (
              <button onClick={handleFaceId} disabled={busy} style={{
                width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                background: accentColor || '#333', color: '#fff', fontWeight: 700, fontSize: 15,
                cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, marginBottom: 14,
              }}>{busy ? 'Waiting\u2026' : enrolled ? '\u{1F513} Unlock with Face ID' : '\u{1F510} Set up Face ID'}</button>
            ) : (
              <div style={{ fontSize: 13, color: '#888', marginBottom: 14 }}>
                Face ID isn't available in this browser.
              </div>
            )}
            <button onClick={() => setShowPassphrase(true)} style={{
              background: 'none', border: 'none', color: accentColor || '#555', fontSize: 13,
              textDecoration: 'underline', cursor: 'pointer',
            }}>Use passphrase instead</button>
          </React.Fragment>
        )}

        {showPassphrase && (
          <form onSubmit={handlePassphrase}>
            <input
              type="password" value={passphraseInput} onChange={e => setPassphraseInput(e.target.value)}
              placeholder="Passphrase" autoFocus
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #ccc',
                fontSize: 15, marginBottom: 12, boxSizing: 'border-box',
              }}
            />
            <button type="submit" style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: accentColor || '#333', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 10,
            }}>Unlock</button>
            {supported && (
              <button type="button" onClick={() => { setShowPassphrase(false); setError(''); }} style={{
                background: 'none', border: 'none', color: '#888', fontSize: 13, textDecoration: 'underline', cursor: 'pointer',
              }}>Back to Face ID</button>
            )}
          </form>
        )}

        {error && <div style={{ color: '#B23A3A', fontSize: 13, marginTop: 14 }}>{error}</div>}
      </div>
    </div>
  );
}

function NexthinkGated({ children, accentColor, displayFont, bodyFont, monoFont }) {
  const [unlocked, setUnlocked] = React.useState(() => window.NexthinkGate.isUnlocked());
  if (!unlocked) {
    return (
      <NexthinkLockScreen
        onUnlock={() => setUnlocked(true)}
        accentColor={accentColor} displayFont={displayFont} bodyFont={bodyFont} monoFont={monoFont}
      />
    );
  }
  return children;
}

window.NexthinkGated = NexthinkGated;
