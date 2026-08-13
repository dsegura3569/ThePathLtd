window.AudioEngine = (function () {
  let ctx = null;
  let noiseBuffer = null;
  let breathSource = null;
  let tickCount = 0;

  // Persistent tone-glide engine for 'chime' mode
  let toneOsc = null;
  let toneGain = null;
  const TONE_BASE = 440;       // A4 - baseline (bottom of inhale / bottom of exhale)
  const TONE_PEAK = 880;       // A5 - one octave up (top of inhale)
  const TONE_HOLD = 659.25;    // E5 - distinct pitch used only during holds

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

  // --- Mode: soft tick/tock click, alternating pitch each second ---
  function playTick() {
    const c = getCtx();
    tickCount++;
    const isDownbeat = tickCount % 2 === 1;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = isDownbeat ? 880 : 660;
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
    toneGain.gain.linearRampToValueAtTime(0.07, now + 0.15);

    toneOsc.frequency.cancelScheduledValues(now);
    toneOsc.frequency.setValueAtTime(Math.max(toneOsc.frequency.value, 1), now);
    if (phaseType === 'in') {
      toneOsc.frequency.exponentialRampToValueAtTime(TONE_PEAK, now + phaseSeconds);
    } else if (phaseType === 'out') {
      toneOsc.frequency.exponentialRampToValueAtTime(TONE_BASE, now + phaseSeconds);
    } else {
      // hold_in or hold_out: distinct steady tone, quick glide to it and sustain
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
    if (direction === 'in') {
      gain.gain.exponentialRampToValueAtTime(0.13, now + durationSec * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.linearRampToValueAtTime(900, now + durationSec);
    } else {
      gain.gain.exponentialRampToValueAtTime(0.13, now + durationSec * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.linearRampToValueAtTime(300, now + durationSec);
    }

    src.start();
    src.stop(now + durationSec + 0.1);
    breathSource = src;
  }

  // Called once per second while a session is running, for tick mode only.
  function onSecondTick(mode) {
    if (mode === 'tick') playTick();
  }

  // Called whenever the session enters a new phase.
  function onPhaseChange(mode, phaseType, phaseSeconds) {
    if (mode === 'chime') {
      toneOnPhaseChange(phaseType, phaseSeconds);
    } else if (mode === 'breath') {
      if (phaseType === 'in') startBreathSound('in', phaseSeconds);
      else if (phaseType === 'out') startBreathSound('out', phaseSeconds);
      else stopBreathSound(); // holds are silent in breath mode
    }
  }

  function stopAll() {
    stopBreathSound();
    stopToneEngine();
  }

  return { resume, onSecondTick, onPhaseChange, stopAll };
})();
