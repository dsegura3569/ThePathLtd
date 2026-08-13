const { useEffect, useRef, useState } = React;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const SCALE_SMALL = 0.55;
const SCALE_LARGE = 1.0;
const PRE_COUNTDOWN_SECONDS = 3;

window.SessionView = function SessionView({ technique, chosenDuration, soundMode, onExit }) {
  const phases = window.resolvePhases(technique, chosenDuration);
  const circleRef = useRef(null);
  const rafRef = useRef(null);

  const [stage, setStage] = useState('countdown'); // 'countdown' | 'running'
  const [preCount, setPreCount] = useState(PRE_COUNTDOWN_SECONDS);

  const runRef = useRef({
    phaseIndex: 0,
    phaseStartTime: null,
    pausedAccum: 0,
    pauseStartedAt: null,
    lastTickedSecond: -1,
    cycleCount: 0,
  });

  const [display, setDisplay] = useState({
    phaseType: phases[0].type,
    count: 0,
    cycleCount: 0,
  });
  const [isPaused, setIsPaused] = useState(false);

  // --- Pre-session 3-2-1 countdown ---
  useEffect(() => {
    window.AudioEngine.resume();
    if (stage !== 'countdown') return;
    if (preCount <= 0) {
      setStage('running');
      return;
    }
    const t = setTimeout(() => setPreCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, preCount]);

  // --- Main breathing session loop ---
  useEffect(() => {
    if (stage !== 'running') return;

    runRef.current.phaseStartTime = performance.now();
    const firstPhase = phases[0];
    window.AudioEngine.onPhaseChange(soundMode, firstPhase.type, firstPhase.seconds);
    window.AudioEngine.onSecondTick(soundMode);
    runRef.current.lastTickedSecond = 0;

    function countFor(phase, elapsed) {
      // Inhale counts up (1, 2, 3...). Exhale and holds count down (time remaining).
      if (phase.type === 'in') {
        return Math.min(phase.seconds, Math.floor(elapsed) + 1);
      }
      return Math.max(0, Math.ceil(phase.seconds - elapsed));
    }

    function frame(now) {
      const run = runRef.current;
      if (!run.pauseStartedAt) {
        const elapsed = (now - run.phaseStartTime - run.pausedAccum) / 1000;
        const phase = phases[run.phaseIndex];
        const clamped = Math.min(elapsed, phase.seconds);
        const progress = phase.seconds > 0 ? clamped / phase.seconds : 1;

        if (circleRef.current) {
          let scale;
          if (phase.type === 'in') scale = SCALE_SMALL + (SCALE_LARGE - SCALE_SMALL) * easeInOutCubic(progress);
          else if (phase.type === 'out') scale = SCALE_LARGE - (SCALE_LARGE - SCALE_SMALL) * easeInOutCubic(progress);
          else if (phase.type === 'hold_in') scale = SCALE_LARGE;
          else scale = SCALE_SMALL;
          circleRef.current.style.transform = `scale(${scale})`;
        }

        const currentSecond = Math.floor(elapsed);
        if (currentSecond > run.lastTickedSecond && currentSecond < phase.seconds) {
          run.lastTickedSecond = currentSecond;
          window.AudioEngine.onSecondTick(soundMode);
        }

        const count = countFor(phase, elapsed);
        setDisplay(d => (d.count === count && d.phaseType === phase.type && d.cycleCount === run.cycleCount)
          ? d
          : { phaseType: phase.type, count, cycleCount: run.cycleCount });

        if (elapsed >= phase.seconds) {
          run.phaseIndex = (run.phaseIndex + 1) % phases.length;
          if (run.phaseIndex === 0) run.cycleCount += 1;
          run.phaseStartTime = now;
          run.pausedAccum = 0;
          run.lastTickedSecond = -1;
          const nextPhase = phases[run.phaseIndex];
          window.AudioEngine.onPhaseChange(soundMode, nextPhase.type, nextPhase.seconds);
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.AudioEngine.stopAll();
    };
  }, [stage]);

  function togglePause() {
    const run = runRef.current;
    if (isPaused) {
      run.pausedAccum += performance.now() - run.pauseStartedAt;
      run.pauseStartedAt = null;
      setIsPaused(false);
    } else {
      run.pauseStartedAt = performance.now();
      window.AudioEngine.stopAll();
      setIsPaused(true);
    }
  }

  if (stage === 'countdown') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--sand)',
      }}>
        <p className="eyebrow">{technique.name}</p>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '5rem', color: 'var(--breathe-color)',
        }}>
          {preCount > 0 ? preCount : 'Begin'}
        </div>
        <p style={{ marginTop: '1rem' }}>Get ready...</p>
      </div>
    );
  }

  const label = window.PHASE_LABELS[display.phaseType];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '2rem',
      background: 'var(--sand)', textAlign: 'center',
    }}>
      <p className="eyebrow">{technique.name} · Cycle {display.cycleCount + 1}</p>

      <div style={{
        width: 260, height: 260, display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '2rem 0', position: 'relative',
      }}>
        <div
          ref={circleRef}
          style={{
            width: 220, height: 220, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #6C9CAA, var(--breathe-color))',
            boxShadow: '0 8px 40px rgba(74,124,140,0.35)',
            transition: 'none',
          }}
        />
        <div style={{ position: 'absolute', color: 'rgba(255,255,255,0.75)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>{display.count}</div>
        </div>
      </div>

      <h2 style={{ color: 'var(--breathe-color)', marginBottom: '2rem' }}>{label}</h2>

      {technique.cue && (
        <p style={{ maxWidth: '32ch', marginBottom: '2rem' }}>{technique.cue}</p>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={togglePause} style={{
          padding: '0.7rem 1.4rem', borderRadius: 8, border: '1px solid var(--line)',
          background: 'var(--sand-pale)', color: 'var(--ink)', fontSize: '0.95rem',
        }}>
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={onExit} style={{
          padding: '0.7rem 1.4rem', borderRadius: 8, border: 'none',
          background: 'var(--breathe-color)', color: '#fff', fontSize: '0.95rem',
        }}>
          End session
        </button>
      </div>
    </div>
  );
};
