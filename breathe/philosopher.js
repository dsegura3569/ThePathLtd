const { useState: usePState } = React;

// Turns {stages, restBetweenStages} into a flat, finite phase list. Each
// stage now owns its own explicit duration (stage.durationSeconds) rather
// than being handed a slice of some separate "total session time" -- that
// older design let someone configure a stage's breathing rhythm completely
// incompatible with its allotted time (e.g. a 40s cycle squeezed into a 15s
// slice), silently truncating it mid-phase with no warning anywhere in the
// setup screen. Total session time is now purely a computed sum, shown
// read-only in the builder, never an input that overrides what was
// actually configured per stage.
window.resolvePhilosopherPhases = function resolvePhilosopherPhases(config) {
  const { stages, restBetweenStages } = config;
  const numStages = stages.length;

  const flat = [];
  stages.forEach((stg, stageIndex) => {
    const cycle = [{ type: 'in', seconds: stg.x }];
    if (stg.holdInEnabled) cycle.push({ type: 'hold_in', seconds: stg.x1 });
    cycle.push({ type: 'out', seconds: stg.y });
    if (stg.holdOutEnabled) cycle.push({ type: 'hold_out', seconds: stg.y1 });

    const stageTime = stg.durationSeconds;
    let elapsedInStage = 0;
    let safety = 0;
    while (elapsedInStage < stageTime && safety < 2000) {
      for (const phase of cycle) {
        if (elapsedInStage >= stageTime) break;
        const remaining = stageTime - elapsedInStage;
        const seconds = Math.min(phase.seconds, remaining);
        flat.push({ type: phase.type, seconds, stageIndex });
        elapsedInStage += seconds;
      }
      safety++;
    }

    if (stageIndex < numStages - 1 && restBetweenStages > 0) {
      flat.push({ type: 'rest', seconds: restBetweenStages, stageIndex: null });
    }
  });

  return flat;
};

// How many full in/hold/out/hold cycles actually fit in a stage's own
// duration, and what (if anything) is left over -- shown live in the
// builder so a partial/cut-off cycle is a visible, informed choice instead
// of a silent surprise at session time.
function stageCycleInfo(stage) {
  const cycleSeconds = stage.x + (stage.holdInEnabled ? stage.x1 : 0) + stage.y + (stage.holdOutEnabled ? stage.y1 : 0);
  const fullCycles = Math.floor(stage.durationSeconds / cycleSeconds);
  const remainder = Math.round((stage.durationSeconds - fullCycles * cycleSeconds) * 10) / 10;
  return { cycleSeconds, fullCycles, remainder };
}

function defaultStage() {
  return { x: 4, x1: 4, y: 4, y1: 4, holdInEnabled: true, holdOutEnabled: true, durationSeconds: 60 };
}

function NumberField({ label, value, onChange, min, max, disabled, suffix }) {
  return (
    <label style={{ display: 'block', fontSize: '0.85rem', opacity: disabled ? 0.4 : 1 }}>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        style={{
          display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.4rem 0.5rem',
          borderRadius: 6, border: '1px solid var(--line)', background: disabled ? 'var(--line)' : '#fff',
          fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
        }}
      />
      {suffix && <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>{suffix}</span>}
    </label>
  );
}

function StageEditor({ stage, index, onChange, onRemove, canRemove }) {
  function set(key, val) { onChange({ ...stage, [key]: val }); }
  const { cycleSeconds, fullCycles, remainder } = stageCycleInfo(stage);
  return (
    <div style={{
      background: 'var(--sand-pale)', border: '1px solid var(--line)', borderRadius: 10,
      padding: '1.25rem', marginBottom: '1rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <strong style={{ color: 'var(--breathe-color)' }}>Stage {index + 1}</strong>
        {canRemove && (
          <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: '0.85rem' }}>
            Remove
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem' }}>
        <NumberField label="Breathe in" value={stage.x} min={1} max={60} suffix="sec"
          onChange={v => set('x', v)} />
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            <input type="checkbox" checked={stage.holdInEnabled} onChange={e => set('holdInEnabled', e.target.checked)} />
            Hold
          </label>
          <NumberField label="" value={stage.x1} min={1} max={60} suffix="sec"
            disabled={!stage.holdInEnabled} onChange={v => set('x1', v)} />
        </div>
        <NumberField label="Breathe out" value={stage.y} min={1} max={60} suffix="sec"
          onChange={v => set('y', v)} />
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            <input type="checkbox" checked={stage.holdOutEnabled} onChange={e => set('holdOutEnabled', e.target.checked)} />
            Hold
          </label>
          <NumberField label="" value={stage.y1} min={1} max={60} suffix="sec"
            disabled={!stage.holdOutEnabled} onChange={v => set('y1', v)} />
        </div>
      </div>

      <div style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 160 }}>
          <NumberField label="Stage duration" value={stage.durationSeconds} min={cycleSeconds} max={1800} suffix="sec"
            onChange={v => set('durationSeconds', v)} />
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginTop: '0.5rem', marginBottom: 0 }}>
          {remainder === 0
            ? `${fullCycles} full cycle${fullCycles === 1 ? '' : 's'} of ${cycleSeconds}s, ends cleanly.`
            : `${fullCycles} full cycle${fullCycles === 1 ? '' : 's'} of ${cycleSeconds}s, then ${remainder}s left over -- cuts off mid-phase.`}
        </p>
      </div>
    </div>
  );
}

window.PhilosopherBuilder = function PhilosopherBuilder({ onStart, onBack }) {
  const [stages, setStages] = usePState([defaultStage()]);
  const [restBetweenStages, setRestBetweenStages] = usePState(5);
  const initialSettings = window.loadSettings();
  const [soundMode, setSoundModeRaw] = usePState(initialSettings.soundMode);
  const [animationStyle, setAnimationStyleRaw] = usePState(initialSettings.animationStyle);
  const [showSettings, setShowSettings] = usePState(false);

  function setSoundMode(id) {
    setSoundModeRaw(id);
    window.saveSettings(id, animationStyle);
  }
  function setAnimationStyle(id) {
    setAnimationStyleRaw(id);
    window.saveSettings(soundMode, id);
  }

  function addStage() {
    if (stages.length >= 6) return;
    setStages([...stages, defaultStage()]);
  }
  function updateStage(i, next) {
    setStages(stages.map((s, idx) => idx === i ? next : s));
  }
  function removeStage(i) {
    setStages(stages.filter((_, idx) => idx !== i));
  }

  // Total session time is now purely a computed sum of what's actually
  // configured -- each stage's own duration, plus the rest gaps between
  // them -- never a separate input a stage's real content could disagree
  // with.
  const totalTimeSeconds = stages.reduce((sum, s) => sum + s.durationSeconds, 0)
    + restBetweenStages * Math.max(0, stages.length - 1);
  const totalMinutesDisplay = Math.floor(totalTimeSeconds / 60);
  const totalSecondsDisplay = Math.round(totalTimeSeconds % 60);

  function handleStart() {
    const phases = window.resolvePhilosopherPhases({ stages, restBetweenStages });
    onStart({ phases, soundMode, animationStyle });
  }

  return (
    <>
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <window.GhostButton onClick={onBack}>&larr; Back</window.GhostButton>
      <p className="eyebrow" style={{ marginTop: '1.5rem' }}>Breathwork Assistant</p>
      <h1>Philosopher</h1>
      <p>Build your own session: any number of stages, each with its own breathing rhythm and duration.</p>

      <div style={{
        margin: '1.5rem 0', background: 'var(--sand-pale)', border: '1px solid var(--line)',
        borderRadius: 10, padding: '1rem 1.25rem',
      }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Total session time</span>
        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
          {totalMinutesDisplay > 0 ? `${totalMinutesDisplay}m ` : ''}{totalSecondsDisplay}s
        </div>
      </div>

      <div style={{ margin: '1.5rem 0' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
          Rest between stages: {restBetweenStages}s
        </label>
        <input type="range" min={0} max={15} value={restBetweenStages}
          onChange={e => setRestBetweenStages(Number(e.target.value))} style={{ width: '100%' }} />
      </div>

      <div style={{ margin: '1.5rem 0' }}>
        {stages.map((s, i) => (
          <StageEditor key={i} stage={s} index={i} canRemove={stages.length > 1}
            onChange={next => updateStage(i, next)} onRemove={() => removeStage(i)} />
        ))}
        {stages.length < 6 && (
          <window.GhostButton onClick={addStage}>+ Add another stage</window.GhostButton>
        )}
      </div>

      <button
        onClick={() => setShowSettings(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1.5rem 0',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--ink-soft)', fontSize: '0.85rem',
        }}
      >
        <window.GearIcon />
        Sound: {window.SOUND_OPTIONS.find(o => o.id === soundMode)?.label} &middot; Animation: {window.ANIMATION_OPTIONS.find(o => o.id === animationStyle)?.label}
      </button>

      <window.PrimaryButton onClick={handleStart}>Begin</window.PrimaryButton>
    </div>
    {showSettings && (
      <window.SettingsModal
        soundMode={soundMode} setSoundMode={setSoundMode}
        animationStyle={animationStyle} setAnimationStyle={setAnimationStyle}
        onClose={() => setShowSettings(false)}
      />
    )}
    </>
  );
};
