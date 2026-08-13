const { useState } = React;

const SOUND_OPTIONS = [
  { id: 'tick', label: 'Soft tick / tock' },
  { id: 'chime', label: 'Gentle tone / chime' },
  { id: 'breath', label: 'Real breath in / out' },
];

function App() {
  const [view, setView] = useState('select'); // 'select' | 'configure' | 'session'
  const [technique, setTechnique] = useState(null);
  const [duration, setDuration] = useState(null);
  const [soundMode, setSoundMode] = useState('tick');

  function chooseTechnique(t) {
    setTechnique(t);
    setDuration(t.durationMode === 'selectable' ? t.default : null);
    setView('configure');
  }

  function startSession() {
    setView('session');
  }

  function exitSession() {
    setView('select');
    setTechnique(null);
  }

  if (view === 'session') {
    return (
      <window.SessionView
        technique={technique}
        chosenDuration={duration}
        soundMode={soundMode}
        onExit={exitSession}
      />
    );
  }

  if (view === 'configure' && technique) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <window.GhostButton onClick={() => setView('select')}>&larr; Back</window.GhostButton>
        <p className="eyebrow" style={{ marginTop: '1.5rem' }}>Breathwork Assistant</p>
        <h1>{technique.name}</h1>
        <p>{technique.description}</p>

        {technique.durationMode === 'selectable' && (
          <div style={{ margin: '1.5rem 0' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              Duration per phase: {duration}s
            </label>
            <input
              type="range"
              min={technique.min}
              max={technique.max}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
              <span>{technique.min}s</span>
              <span>{technique.max}s</span>
            </div>
          </div>
        )}

        {technique.durationMode === 'fixed' && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
            Fixed pattern: {technique.durations.join('s — ')}s
          </p>
        )}

        <div style={{ margin: '1.5rem 0' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Sound</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {SOUND_OPTIONS.map(opt => (
              <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="sound"
                  checked={soundMode === opt.id}
                  onChange={() => setSoundMode(opt.id)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <window.PrimaryButton onClick={startSession}>Begin</window.PrimaryButton>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <p className="eyebrow">Breathwork Assistant</p>
      <h1>Choose a breathing pattern</h1>
      <p>Each pattern paces itself visually and with sound — pick one, set it up, and follow along.</p>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem', marginTop: '2rem',
      }}>
        {window.TECHNIQUES.map(t => (
          <window.Card key={t.id} onClick={() => chooseTechnique(t)}>
            <h3 style={{ color: 'var(--breathe-color)' }}>{t.name}</h3>
            <p style={{ marginBottom: 0 }}>{t.description}</p>
          </window.Card>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
