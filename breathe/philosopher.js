const { useState: usePState } = React;

// Turns {totalTimeSeconds, stages, restBetweenStages} into a flat, finite phase list.
// Total time is split evenly across stages (including the rests between them), so the
// whole session -- breathing plus rests -- adds up to exactly totalTimeSeconds. Each
// stage repeats its own in/hold_in/out/hold_out cycle to fill its allotted time,
// cutting off immediately (not waiting for a full cycle) once that time is used.
window.resolvePhilosopherPhases = function resolvePhilosopherPhases(config) {
  const { totalTimeSeconds, stages, restBetweenStages } = config;
  const numStages = stages.length;
  const totalRest = restBetweenStages * Math.max(0, numStages - 1);
  const perStageTime = Math.max(1, (totalTimeSeconds - totalRest) / numStages);

  const flat = [];
  stages.forEach((stg, stageIndex) => {
    const cycle = [{ type: 'in', seconds: stg.x }];
    if (stg.holdInEnabled) cycle.push({ type: 'hold_in', seconds: stg.x1 });
    cycle.push({ type: 'out', seconds: stg.y });
    if (stg.holdOutEnabled) cycle.push({ type: 'hold_out', seconds: stg.y1 });

    let elapsedInStage = 0;
    let safety = 0;
    while (elapsedInStage < perStageTime && safety < 2000) {
      for (const phase of cycle) {
        if (elapsedInStage >= perStageTime) break;
        const remaining = perStageTime - elapsedInStage;
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

function defaultStage() {
  return { x: 4, x1: 4, y: 4, y1: 4, holdInEnabled: true, holdOutEnabled: true };
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
        <NumberField label="Breathe in (x)" value={stage.x} min={1} max={60} suffix="sec"
          onChange={v => set('x', v)} />
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            <input type="checkbox" checked={stage.holdInEnabled} onChange={e => set('holdInEnabled', e.target.checked)} />
            Hold (x1)
          </label>
          <NumberField label="" value={stage.x1} min={1} max={60} suffix="sec"
            disabled={!stage.holdInEnabled} onChange={v => set('x1', v)} />
        </div>
        <NumberField label="Breathe out (y)" value={stage.y} min={1} max={60} suffix="sec"
          onChange={v => set('y', v)} />
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            <input type="checkbox" checked={stage.holdOutEnabled} onChange={e => set('holdOutEnabled', e.target.checked)} />
            Hold (y1)
          </label>
          <NumberField label="" value={stage.y1} min={1} max={60} suffix="sec"
            disabled={!stage.holdOutEnabled} onChange={v => set('y1', v)} />
        </div>
      </div>
    </div>
  );
}

window.PhilosopherBuilder = function PhilosopherBuilder({ onStart, onBack }) {
  const [totalMinutes, setTotalMinutes] = usePState(5);
  const [stages, setStages] = usePState([defaultStage()]);
  const [restBetweenStages, setRestBetweenStages] = usePState(5);
  const [soundMode, setSoundMode] = usePState('tick');

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

  const totalTimeSeconds = totalMinutes * 60;
  const perStageSeconds = Math.max(1, (totalTimeSeconds - restBetweenStages * Math.max(0, stages.length - 1)) / stages.length);

  function handleStart() {
    const phases = window.resolvePhilosopherPhases({ totalTimeSeconds, stages, restBetweenStages });
    onStart({ phases, soundMode });
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <window.GhostButton onClick={onBack}>&larr; Back</window.GhostButton>
      <p className="eyebrow" style={{ marginTop: '1.5rem' }}>Breathwork Assistant</p>
      <h1>Philosopher</h1>
      <p>Build your own session: any number of stages, each with its own breathing rhythm.</p>

      <div style={{ margin: '1.5rem 0' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
          Total session time: {totalMinutes} min
        </label>
        <input type="range" min={1} max={60} value={totalMinutes}
          onChange={e => setTotalMinutes(Number(e.target.value))} style={{ width: '100%' }} />
        <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: '0.4rem' }}>
          Split evenly across {stages.length} stage{stages.length > 1 ? 's' : ''} (including rest between them) &mdash;
          about {Math.round(perStageSeconds)}s of breathing per stage.
        </p>
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

      <div style={{ margin: '1.5rem 0' }}>
        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Sound</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {window.SOUND_OPTIONS.map(opt => (
            <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
              <input type="radio" name="philosopher-sound" checked={soundMode === opt.id} onChange={() => setSoundMode(opt.id)} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <window.PrimaryButton onClick={handleStart}>Begin</window.PrimaryButton>
    </div>
  );
};
