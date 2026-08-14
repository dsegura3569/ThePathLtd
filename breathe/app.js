const { useState } = React;

window.SOUND_OPTIONS = [
  { id: 'tick', label: 'Soft tick / tock' },
  { id: 'chime', label: 'Gentle tone / chime' },
  { id: 'breath', label: 'Real breath in / out' },
];

function SecondsControl({ technique, duration, setDuration }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
        Duration per phase: {duration}s
      </label>
      <input
        type="range"
        min={technique.min}
        max={technique.max}
        step={technique.step || 1}
        value={duration}
        onChange={e => setDuration(Number(e.target.value))}
        style={{ width: '100%' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
        <span>{technique.min}s</span>
        <span>{technique.max}s</span>
      </div>
    </div>
  );
}

function BpmOrSecondsControl({ technique, duration, setDuration }) {
  const [mode, setMode] = useState('seconds'); // 'seconds' | 'bpm'
  const bpm = Math.round(window.secondsToBpm(duration) * 10) / 10;
  // Clean, round bounds (not derived from a rounded seconds conversion, which
  // previously produced an odd starting point like 0.9 and made every
  // subsequent 0.5 step land on .4/.9 endings instead of whole/half numbers).
  const minBpm = 1;
  const maxBpm = 15; // exactly secondsToBpm(technique.min=2), already clean

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => setMode('seconds')} style={{
          padding: '0.3rem 0.8rem', borderRadius: 6, fontSize: '0.8rem',
          border: `1px solid ${mode === 'seconds' ? 'var(--breathe-color)' : 'var(--line)'}`,
          background: mode === 'seconds' ? 'var(--breathe-color)' : 'transparent',
          color: mode === 'seconds' ? '#fff' : 'var(--ink)',
        }}>Seconds per phase</button>
        <button onClick={() => setMode('bpm')} style={{
          padding: '0.3rem 0.8rem', borderRadius: 6, fontSize: '0.8rem',
          border: `1px solid ${mode === 'bpm' ? 'var(--breathe-color)' : 'var(--line)'}`,
          background: mode === 'bpm' ? 'var(--breathe-color)' : 'transparent',
          color: mode === 'bpm' ? '#fff' : 'var(--ink)',
        }}>Breaths per minute</button>
      </div>

      {mode === 'seconds' ? (
        <SecondsControl technique={technique} duration={duration} setDuration={setDuration} />
      ) : (
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            {bpm} breaths / min
          </label>
          <input
            type="range"
            min={minBpm}
            max={maxBpm}
            step={0.5}
            value={bpm}
            onChange={e => setDuration(window.bpmToSeconds(Number(e.target.value)))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
            <span>{minBpm}/min</span>
            <span>{maxBpm}/min</span>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [view, setView] = useState('select'); // 'select' | 'configure' | 'session' | 'philosopher' | 'finite-session'
  const [technique, setTechnique] = useState(null);
  const [duration, setDuration] = useState(null);
  const [soundMode, setSoundMode] = useState('tick');
  const [holdWalkSeconds, setHoldWalkSeconds] = useState(null);
  const [restSeconds, setRestSeconds] = useState(null);
  const [customPhases, setCustomPhases] = useState(null);
  const [customSoundMode, setCustomSoundMode] = useState('tick');
  const [customTitle, setCustomTitle] = useState('');
  const [customCue, setCustomCue] = useState('');
  const [customStageLabelFor, setCustomStageLabelFor] = useState(null);

  function chooseTechnique(t) {
    setTechnique(t);
    if (t.finite) {
      setHoldWalkSeconds(t.holdWalk.default);
      setRestSeconds(t.rest.default);
    } else {
      setDuration(t.durationMode === 'selectable' ? t.default : null);
    }
    setView('configure');
  }

  function startSession() {
    if (technique && technique.finite) {
      const phases = window.resolveRecoveryWalkingPhases(holdWalkSeconds, restSeconds);
      launchFiniteSession({
        phases, soundMode, title: technique.name, cue: technique.cue,
        stageLabelFor: phase => phase.stageIndex != null ? `Rep ${phase.stageIndex + 1} of 5` : null,
      });
      return;
    }
    setView('session');
  }

  function exitSession() {
    setView('select');
    setTechnique(null);
  }

  function launchFiniteSession({ phases, soundMode: sm, title, stageLabelFor, cue }) {
    setCustomPhases(phases);
    setCustomSoundMode(sm);
    setCustomTitle(title);
    setCustomCue(cue || '');
    setCustomStageLabelFor(() => stageLabelFor);
    setView('finite-session');
  }

  function startPhilosopherSession({ phases, soundMode: sm }) {
    launchFiniteSession({
      phases, soundMode: sm, title: 'Philosopher',
      stageLabelFor: phase => phase.stageIndex != null ? `Stage ${phase.stageIndex + 1}` : 'Rest',
    });
  }

  function exitFiniteSession() {
    setView('select');
    setCustomPhases(null);
    setTechnique(null);
  }

  if (view === 'finite-session' && customPhases) {
    return (
      <window.SessionView
        phases={customPhases}
        loop={false}
        soundMode={customSoundMode}
        title={customTitle}
        stageLabelFor={customStageLabelFor}
        cue={customCue}
        onExit={exitFiniteSession}
        onComplete={exitFiniteSession}
      />
    );
  }

  if (view === 'philosopher') {
    return <window.PhilosopherBuilder onStart={startPhilosopherSession} onBack={() => setView('select')} />;
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

        {technique.finite && (
          <div style={{ margin: '1.5rem 0' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Hold &amp; walk: {holdWalkSeconds}s (roughly 10&ndash;15 paces)
              </label>
              <input type="range" min={technique.holdWalk.min} max={technique.holdWalk.max}
                value={holdWalkSeconds} onChange={e => setHoldWalkSeconds(Number(e.target.value))}
                style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Rest between reps: {restSeconds}s
              </label>
              <input type="range" min={technique.rest.min} max={technique.rest.max}
                value={restSeconds} onChange={e => setRestSeconds(Number(e.target.value))}
                style={{ width: '100%' }} />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: '0.75rem' }}>
              Repeats 5 times, then ends.
            </p>
          </div>
        )}

        {technique.durationMode === 'selectable' && (
          <div style={{ margin: '1.5rem 0' }}>
            {technique.supportsBpm ? (
              <BpmOrSecondsControl technique={technique} duration={duration} setDuration={setDuration} />
            ) : (
              <SecondsControl technique={technique} duration={duration} setDuration={setDuration} />
            )}
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
            {window.SOUND_OPTIONS.map(opt => (
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
        <window.Card onClick={() => setView('philosopher')}>
          <h3 style={{ color: 'var(--clay)' }}>Philosopher</h3>
          <p style={{ marginBottom: 0 }}>Build your own: any number of stages, each with its own breathing rhythm.</p>
        </window.Card>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
