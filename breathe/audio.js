window.AudioEngine = (function () {
  let ctx = null;
  let noiseBuffer = null;
  let breathSource = null;
  let tickCountInPhase = 0;

  // Persistent tone-glide engine for 'chime' mode
  let toneOsc = null;
  let toneGain = null;
  const TONE_BASE = 220;       // A3 - baseline (bottom of inhale / bottom of exhale)
  const TONE_PEAK = 330;       // E4 - a perfect fifth up (top of inhale), not a full octave
  const TONE_HOLD = 261.63;    // C4 - sits between base/peak; base-hold-peak forms an A minor triad

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function resume() {
    const c = getCtx();
    if (c.state === 'suspended') c.resume();
  }

  function getNoiseBuffer() {
    const c = getCtx();
    if (!noiseBuffer) {
      const bufferSize = c.sampleRate * 2;
      noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  // --- Mode: soft tick/tock click ---
  // Pitch pattern depends on which phase is actually happening, so the
  // sound alone tells a person whether they're breathing in, breathing
  // out, or holding -- previously every tick alternated the same two
  // pitches purely off a running counter, identical regardless of phase,
  // so there was no way to tell from sound alone how far into a phase you
  // were or when it would end without silently counting.
  function playTick(phaseType) {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';

    let freq;
    if (phaseType === 'hold_in' || phaseType === 'hold_out' || phaseType === 'pause_in' || phaseType === 'pause_out') {
      // Holding/pausing: one steady pitch, no alternation -- stillness, not rhythm.
      freq = 523.25; // C5
    } else {
      const isDownbeat = tickCountInPhase % 2 === 0;
      if (phaseType === 'in') {
        freq = isDownbeat ? 660 : 880; // brighter pair -- same as the original tick tone
      } else {
        freq = isDownbeat ? 440 : 587.33; // a step lower -- settling, distinct from inhale
      }
    }
    tickCountInPhase++;

    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, c.currentTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.07);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.08);
  }

  // --- Mode: gentle tone, continuous pitch glide through each phase ---
  // Rises on inhale, falls on exhale, holds a distinct steady pitch during holds.
  // One persistent oscillator for the whole session (not recreated per phase)
  // so pitch changes are a smooth glide rather than discrete clicks.
  function ensureToneEngine() {
    if (toneOsc) return;
    const c = getCtx();
    toneOsc = c.createOscillator();
    toneGain = c.createGain();
    toneOsc.type = 'sine';
    toneOsc.frequency.value = TONE_BASE;
    toneGain.gain.value = 0.0001;
    toneOsc.connect(toneGain).connect(c.destination);
    toneOsc.start();
  }

  function toneOnPhaseChange(phaseType, phaseSeconds) {
    ensureToneEngine();
    const c = getCtx();
    const now = c.currentTime;
    toneGain.gain.cancelScheduledValues(now);
    toneGain.gain.setValueAtTime(Math.max(toneGain.gain.value, 0.0001), now);

    if (phaseType === 'rest') {
      // Rest between Philosopher stages: silence, not a hold tone.
      toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      return;
    }

    toneGain.gain.linearRampToValueAtTime(0.07, now + 0.15);
    toneOsc.frequency.cancelScheduledValues(now);
    toneOsc.frequency.setValueAtTime(Math.max(toneOsc.frequency.value, 1), now);
    if (phaseType === 'in') {
      toneOsc.frequency.exponentialRampToValueAtTime(TONE_PEAK, now + phaseSeconds);
    } else if (phaseType === 'out') {
      toneOsc.frequency.exponentialRampToValueAtTime(TONE_BASE, now + phaseSeconds);
    } else {
      // hold_in/hold_out or pause_in/pause_out: distinct steady tone, quick glide to it and sustain
      toneOsc.frequency.exponentialRampToValueAtTime(TONE_HOLD, now + Math.min(0.3, phaseSeconds));
    }
  }

  function stopToneEngine() {
    if (!toneOsc) return;
    const c = getCtx();
    const now = c.currentTime;
    toneGain.gain.cancelScheduledValues(now);
    toneGain.gain.setValueAtTime(Math.max(toneGain.gain.value, 0.0001), now);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    const osc = toneOsc, gain = toneGain;
    setTimeout(() => { try { osc.stop(); } catch (e) {} }, 300);
    toneOsc = null;
    toneGain = null;
  }

  // --- Mode: real breath in/out (filtered noise, whoosh envelope) ---
  function stopBreathSound() {
    if (breathSource) {
      try { breathSource.stop(); } catch (e) {}
      breathSource = null;
    }
  }

  function startBreathSound(direction, durationSec) {
    stopBreathSound();
    const c = getCtx();
    const src = c.createBufferSource();
    src.buffer = getNoiseBuffer();
    src.loop = true;

    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.7;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, c.currentTime);

    src.connect(filter).connect(gain).connect(c.destination);

    const now = c.currentTime;

    if (durationSec < 2) {
      // Fast phases (e.g. Holotropic, 1-3s): there's no room for an
      // attack/sustain/decay envelope to read as a "wave" -- it just
      // becomes a cramped, artifact-y blip. A plain symmetric rise-then-
      // fall matches quick breathing far better, and a fixed filter
      // center (no sweep) avoids a filter sweep trying to cover the full
      // 300-900Hz range in under a couple of seconds.
      const mid = durationSec / 2;
      gain.gain.exponentialRampToValueAtTime(0.13, now + mid);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
      filter.frequency.setValueAtTime(direction === 'in' ? 500 : 700, now);
    } else {
      // Attack quickly, SUSTAIN near-peak through the bulk of the phase, and
      // only taper in the final stretch. Previously the whoosh peaked early
      // (60% in on inhale, just 30% in on exhale) and spent the rest of the
      // phase in an exponential decay that goes inaudible well before it
      // reaches its target -- on anything longer than ~4s that left real
      // silence for the last several seconds, forcing a person to silently
      // count the remainder themselves.
      const attack = Math.min(0.6, durationSec * 0.12);
      const tailWindow = Math.min(1.2, durationSec * 0.2);
      const decayStart = Math.max(attack, durationSec - tailWindow);
      gain.gain.exponentialRampToValueAtTime(0.13, now + attack);
      gain.gain.setValueAtTime(0.13, now + decayStart); // anchor the sustain so the ramp below only covers the tail
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      if (direction === 'in') {
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.linearRampToValueAtTime(900, now + durationSec);
      } else {
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.linearRampToValueAtTime(300, now + durationSec);
      }
    }

    src.start();
    src.stop(now + durationSec + 0.1);
    breathSource = src;
  }

  // Short, soft boundary marker -- distinct from both the breathing whoosh
  // and 'tick' mode's metronome click. Used in 'breath' mode to mark a hold
  // actually starting or ending, since holds have no natural air-movement
  // sound of their own and were previously completely silent, leaving no
  // way to know a hold had begun or was over without watching the screen.
  function playBoundaryCue(pitch) {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = pitch;
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.09, c.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.35);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.4);
  }

  // Called once per second while a session is running, for tick mode only.
  function onSecondTick(mode, phaseType) {
    if (mode === 'tick' && phaseType !== 'rest') playTick(phaseType);
  }

  let lastPhaseType = null;

  // Called whenever the session enters a new phase.
  function onPhaseChange(mode, phaseType, phaseSeconds) {
    if (mode === 'chime') {
      toneOnPhaseChange(phaseType, phaseSeconds);
    } else if (mode === 'breath') {
      const isHoldLike = t => t === 'hold_in' || t === 'hold_out' || t === 'pause_in' || t === 'pause_out';
      const wasHold = isHoldLike(lastPhaseType);
      const isHold = isHoldLike(phaseType);
      if (isHold) {
        stopBreathSound();
        playBoundaryCue(TONE_HOLD); // mark the hold/pause starting
      } else if (phaseType === 'in') {
        if (wasHold) playBoundaryCue(TONE_BASE); // mark the hold/pause ending, then breathe
        startBreathSound('in', phaseSeconds);
      } else if (phaseType === 'out') {
        if (wasHold) playBoundaryCue(TONE_BASE);
        startBreathSound('out', phaseSeconds);
      } else {
        stopBreathSound(); // rest is silent in breath mode
      }
    } else if (mode === 'tick') {
      // Reset so the first tick of every phase always lands on the same
      // (downbeat) pitch -- a predictable, consistent starting point per
      // phase rather than carrying over wherever the count happened to be.
      tickCountInPhase = 0;
    }
    lastPhaseType = phaseType;
  }

  // Soft "get ready" blip for the pre-session 3-2-1 countdown -- independent
  // of whichever pacing sound mode (tick/chime/breath) is selected, since
  // this is just a heads-up the session is about to start, not part of the
  // breathing-pace cue itself.
  function playCountdownCue() {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = 392; // G4 -- soft, mid register, gentle not alarming
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.3);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.35);
  }

  // --- Start-of-practice cues: gong / singing bowl ---
  // A convincing struck-metal sound comes from several inharmonic partials
  // (not simple integer ratios, unlike a plucked string) each decaying at
  // its own rate -- a single pure tone reads as a beep, not a strike.
  // Reused for both the real cue when a session starts and the settings-
  // panel preview button, so what you hear previewing is exactly what
  // you'll hear at the start of a real session.
  function playPartials(fundamental, partials) {
    const c = getCtx();
    const now = c.currentTime;
    partials.forEach(p => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = fundamental * p.ratio;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(p.gain, now + 0.02); // quick strike attack
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
      osc.connect(gain).connect(c.destination);
      osc.start(now);
      osc.stop(now + p.decay + 0.1);
    });
  }

  // Low and long -- a deep struck gong, not a bright bell.
  function playGongCue() {
    playPartials(110, [ // A2
      { ratio: 1.00, gain: 0.5, decay: 4.5 },
      { ratio: 1.41, gain: 0.35, decay: 3.8 },
      { ratio: 1.73, gain: 0.28, decay: 3.2 },
      { ratio: 2.00, gain: 0.22, decay: 4.0 },
      { ratio: 2.76, gain: 0.15, decay: 2.4 },
      { ratio: 3.50, gain: 0.10, decay: 1.8 },
      { ratio: 4.20, gain: 0.06, decay: 1.2 },
    ]);
  }

  // Higher and shimmering -- partials clustered close together (near but
  // not exactly matching ratios) beat softly against each other, the
  // characteristic "singing" sustain of a struck bowl rather than a gong's
  // single deep boom.
  function playSingingBowlCue() {
    playPartials(330, [ // E4
      { ratio: 1.00, gain: 0.42, decay: 5.5 },
      { ratio: 1.012, gain: 0.38, decay: 5.2 }, // near-unison with the fundamental -> slow beating
      { ratio: 2.76, gain: 0.20, decay: 3.5 },
      { ratio: 2.80, gain: 0.16, decay: 3.3 },  // same near-unison beating an octave-and-a-bit up
      { ratio: 5.40, gain: 0.08, decay: 2.0 },
    ]);
  }

  window.START_CUE_PLAYERS = { gong: playGongCue, bowl: playSingingBowlCue };

  // Called once, right as a session transitions into 'running' -- separate
  // from the ongoing per-breath sound mode (tick/chime/breath), which is
  // about pacing each breath, not marking the practice beginning.
  function playStartCue(startCueId) {
    const player = window.START_CUE_PLAYERS[startCueId];
    if (player) player();
  }

  // Short representative sample of an ongoing sound mode, for the settings-
  // panel preview buttons -- reuses the exact same synthesis a real session
  // uses, just for a couple of short simulated phases instead of the
  // session's actual phase timing.
  function previewSound(modeId) {
    if (modeId === 'tick') {
      playTick('in');
      setTimeout(() => playTick('in'), 350);
      setTimeout(() => playTick('out'), 700);
      setTimeout(() => playTick('out'), 1050);
    } else if (modeId === 'chime') {
      toneOnPhaseChange('in', 1.1);
      setTimeout(() => toneOnPhaseChange('out', 1.1), 1100);
      setTimeout(() => stopToneEngine(), 2200);
    } else if (modeId === 'breath') {
      startBreathSound('in', 1.1);
      setTimeout(() => startBreathSound('out', 1.1), 1150);
      setTimeout(() => stopBreathSound(), 2300);
    }
  }

  function stopAll() {
    stopBreathSound();
    stopToneEngine();
  }

  return { resume, onSecondTick, onPhaseChange, stopAll, playCountdownCue, playStartCue, previewSound };
})();
