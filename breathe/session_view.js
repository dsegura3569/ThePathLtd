const { useEffect, useRef, useState } = React;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Small color helpers so the circle's gradient/glow can be generated from
// a single phase-category color (window.PHASE_COLORS) instead of hardcoding
// a light/dark pair per phase.
function lightenHex(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}
function hexToRgba(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff},${alpha})`;
}

const SCALE_SMALL = 0.55;
const SCALE_LARGE = 1.0;
const GET_READY_MS = 1400;

// General-purpose breathing session runner. Accepts either:
//   - technique + chosenDuration (presets: resolves an infinite looping cycle)
//   - a pre-resolved `phases` array directly + loop:false (Philosopher: finite, ends naturally)
window.SessionView = function SessionView({ technique, chosenDuration, phases: suppliedPhases, loop, soundMode, animationStyle, countdownSeconds, sessionLengthMinutes, startCue, countDirection, title, onExit, onComplete, stageLabelFor, cue }) {
  const anim = animationStyle || 'arc';
  const phases = suppliedPhases || window.resolvePhases(technique, chosenDuration);
  // A target session length only makes sense as a whole number of complete
  // cycles of THIS pattern -- stopping mid-cycle would cut a breath off
  // partway through. Rounds to the nearest cycle count that lands closest
  // to the requested minutes, rather than always rounding down (which
  // could undershoot a short pattern by nearly a whole cycle) or up.
  const cycleSeconds = phases.reduce((a, p) => a + p.seconds, 0);
  const maxCycles = (sessionLengthMinutes && cycleSeconds > 0)
    ? Math.max(1, Math.round((sessionLengthMinutes * 60) / cycleSeconds))
    : null;
  // Only build a "breathe in X / hold Y / breathe out Z" preview for
  // techniques resolved from a single representative cycle -- suppliedPhases
  // (Philosopher, Breathing Recovery Walking) is a longer, non-repeating
  // finite sequence, and listing the whole thing would be far too long for
  // a quick pre-session caption, so those keep the plain "Get ready..." text.
  const phasePreview = !suppliedPhases
    ? phases.map(p => `${window.PHASE_LABELS[p.type]} ${p.seconds}`).join(' \u00b7 ')
    : null;
  const shouldLoop = loop !== false; // default true for presets
  const circleRef = useRef(null);
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);
  const ring3Ref = useRef(null);
  const arcRef = useRef(null);
  const waveFillRef = useRef(null);
  const rafRef = useRef(null);

  const [stage, setStage] = useState('getready'); // 'getready' | 'countdown' | 'running' | 'complete'
  const [preCount, setPreCount] = useState(countdownSeconds ?? 5);

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

  // Resume the audio context as soon as the session view mounts, regardless
  // of which pre-session stage is showing.
  useEffect(() => {
    window.AudioEngine.resume();
  }, []);

  // --- Pre-session "get ready" beat -- shown before the numeric countdown
  // starts, so there's a distinct moment to read the upcoming pattern
  // before the 3-2-1 begins. ---
  useEffect(() => {
    if (stage !== 'getready') return;
    const t = setTimeout(() => setStage('countdown'), GET_READY_MS);
    return () => clearTimeout(t);
  }, [stage]);

  // --- Pre-session 3-2-1 countdown ---
  useEffect(() => {
    if (stage !== 'countdown') return;
    if (preCount <= 0) {
      setStage('running');
      return;
    }
    window.AudioEngine.playCountdownCue();
    const t = setTimeout(() => setPreCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, preCount]);

  // --- Main breathing session loop ---
  useEffect(() => {
    if (stage !== 'running') return;

    if (startCue) window.AudioEngine.playStartCue(startCue);
    runRef.current.phaseStartTime = performance.now();
    const firstPhase = phases[0];
    window.AudioEngine.onPhaseChange(soundMode, firstPhase.type, firstPhase.seconds);
    window.AudioEngine.onSecondTick(soundMode, firstPhase.type);
    runRef.current.lastTickedSecond = 0;

    function countFor(phase, elapsed) {
      if (countDirection === 'up') {
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

        // Eased 0-1 scale used by circle/ripple/wave -- physically motivated
        // (lungs don't fill/empty at a constant rate), unlike the arc's
        // linear progress below.
        let scale;
        if (phase.type === 'in') scale = SCALE_SMALL + (SCALE_LARGE - SCALE_SMALL) * easeInOutCubic(progress);
        else if (phase.type === 'out') scale = SCALE_LARGE - (SCALE_LARGE - SCALE_SMALL) * easeInOutCubic(progress);
        else if (phase.type === 'hold_in' || phase.type === 'pause_in') scale = SCALE_LARGE; // still, lungs full
        else if (phase.type === 'rest') scale = (SCALE_SMALL + SCALE_LARGE) / 2;
        else scale = SCALE_SMALL; // hold_out, pause_out: still, lungs empty

        if (circleRef.current) circleRef.current.style.transform = `scale(${scale})`;

        // Ripple rings: same eased scale as the circle, applied uniformly
        // to all three rings so they pulse together.
        if (ring1Ref.current) ring1Ref.current.style.transform = `scale(${scale})`;
        if (ring2Ref.current) ring2Ref.current.style.transform = `scale(${scale})`;
        if (ring3Ref.current) ring3Ref.current.style.transform = `scale(${scale})`;

        // Progress arc: fills through *this phase's own* elapsed time,
        // linearly rather than eased -- it's a literal time-remaining
        // indicator, not a physical lung-filling motion, so it's the one
        // style that's equally informative during a hold/pause as it is
        // during an inhale/exhale (the plain circle has nothing to show
        // during a hold; this shows exactly how much longer it lasts).
        if (arcRef.current) {
          const circumference = 2 * Math.PI * 100;
          arcRef.current.style.strokeDashoffset = `${circumference * (1 - progress)}`;
        }

        // Wave bar: height mirrors the same eased scale as the circle.
        if (waveFillRef.current) waveFillRef.current.style.height = `${scale * 100}%`;

        const currentSecond = Math.floor(elapsed);
        // Skip a tick that would land less than ~0.75s before the phase
        // actually ends -- on whole-second phases (the common case) this
        // never matters, but on fractional durations (e.g. Holotropic's
        // 1.5s/2.5s steps) the naive whole-second schedule crams a second
        // tick right up against the boundary, producing an uneven,
        // stumbling rhythm instead of an evenly-paced one.
        if (currentSecond > run.lastTickedSecond && currentSecond < phase.seconds && (phase.seconds - currentSecond) >= 0.75) {
          run.lastTickedSecond = currentSecond;
          window.AudioEngine.onSecondTick(soundMode, phase.type);
        }

        const count = countFor(phase, elapsed);
        setDisplay(d => (d.count === count && d.phaseType === phase.type && d.cycleCount === run.cycleCount)
          ? d
          : { phaseType: phase.type, count, cycleCount: run.cycleCount });

        if (elapsed >= phase.seconds) {
          const atEnd = run.phaseIndex + 1 >= phases.length;
          const cyclesAfterThis = run.cycleCount + (atEnd ? 1 : 0);
          const hitTargetLength = atEnd && maxCycles && cyclesAfterThis >= maxCycles;
          if (atEnd && (!shouldLoop || hitTargetLength)) {
            window.AudioEngine.stopAll();
            setStage('complete');
            return; // stop the rAF loop; don't schedule another frame
          }
          run.phaseIndex = atEnd ? 0 : run.phaseIndex + 1;
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

  const displayTitle = title || (technique && technique.name) || 'Breathing Session';

  if (stage === 'getready') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--sand)', textAlign: 'center', padding: '2rem',
      }}>
        <p className="eyebrow">{displayTitle}</p>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: 'var(--breathe-color)', margin: '1.5rem 0',
        }}>
          Get ready&hellip;
        </div>
        <p style={{ maxWidth: '32ch' }}>{phasePreview}</p>
      </div>
    );
  }

  if (stage === 'countdown') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--sand)',
      }}>
        <p className="eyebrow">{displayTitle}</p>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '5rem', color: 'var(--breathe-color)',
        }}>
          {preCount > 0 ? preCount : 'Begin'}
        </div>
        <p style={{ marginTop: '1rem', maxWidth: '32ch', textAlign: 'center' }}>{phasePreview || 'Get ready...'}</p>
      </div>
    );
  }

  if (stage === 'complete') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--sand)', textAlign: 'center',
      }}>
        <p className="eyebrow">{displayTitle}</p>
        <h1 style={{ marginBottom: '1.5rem' }}>Session complete</h1>
        <window.PrimaryButton onClick={onComplete || onExit}>Done</window.PrimaryButton>
      </div>
    );
  }

  const label = window.PHASE_LABELS[display.phaseType];
  const phaseColor = window.PHASE_COLORS[display.phaseType] || 'var(--breathe-color)';
  const stageNote = stageLabelFor ? stageLabelFor(phases[runRef.current.phaseIndex]) : null;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '2rem',
      background: 'var(--sand)', textAlign: 'center',
    }}>
      <p className="eyebrow">{displayTitle}{shouldLoop ? ` · Cycle ${display.cycleCount + 1}` : (stageNote ? ` · ${stageNote}` : '')}</p>

      <div style={{
        width: 260, height: 260, display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '2rem 0', position: 'relative',
      }}>
        {anim === 'ripple' ? (
          <React.Fragment>
            <div ref={ring1Ref} style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', border: `3px solid ${phaseColor}`, opacity: 0.35 }} />
            <div ref={ring2Ref} style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', border: `3px solid ${phaseColor}`, opacity: 0.6 }} />
            <div ref={ring3Ref} style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: phaseColor, transition: 'background 0.4s ease' }} />
          </React.Fragment>
        ) : anim === 'arc' ? (
          <React.Fragment>
            <svg width={220} height={220} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={110} cy={110} r={100} fill="none" stroke="var(--line)" strokeWidth={12} />
              <circle ref={arcRef} cx={110} cy={110} r={100} fill="none" stroke={phaseColor} strokeWidth={12}
                strokeLinecap="round" strokeDasharray={2 * Math.PI * 100} style={{ transition: 'stroke 0.4s ease' }} />
            </svg>
            <div style={{ position: 'absolute', width: 64, height: 64, borderRadius: '50%', background: phaseColor, transition: 'background 0.4s ease' }} />
          </React.Fragment>
        ) : anim === 'wave' ? (
          <div style={{
            width: 76, height: 220, background: 'var(--sand-pale)', border: '1px solid var(--line)',
            borderRadius: 10, display: 'flex', alignItems: 'flex-end', overflow: 'hidden',
          }}>
            <div ref={waveFillRef} style={{ width: '100%', background: phaseColor, transition: 'background 0.4s ease' }} />
          </div>
        ) : (
          <div
            ref={circleRef}
            style={{
              width: 220, height: 220, borderRadius: '50%',
              // Color-coded by phase category -- inhale, exhale, a real hold,
              // a brief transition pause, and rest are each visually
              // distinct, so which one you're in is legible from color alone,
              // not just position or the text label.
              background: `radial-gradient(circle at 35% 30%, ${lightenHex(phaseColor, 55)}, ${phaseColor})`,
              boxShadow: `0 8px 40px ${hexToRgba(phaseColor, 0.35)}`,
              transition: 'background 0.4s ease',
            }}
          />
        )}
        <div style={{ position: 'absolute', color: anim === 'wave' ? 'var(--ink)' : 'rgba(255,255,255,0.75)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>{display.count}</div>
        </div>
      </div>

      <h2 style={{ color: phaseColor, marginBottom: '2rem' }}>{label}</h2>

      {(cue || (technique && technique.cue && !technique.cueShowsOnSetupOnly)) && (
        <p style={{ maxWidth: '32ch', marginBottom: '2rem' }}>{cue || technique.cue}</p>
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
