window.AudioEngine = (function () {
  let ctx = null;
  let noiseBuffer = null;
  let breathSource = null;
  let tickCount = 0;

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

  // --- Mode: gentle tone/chime each second ---
  function playChime() {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = 528;
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.09, c.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.45);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.47);
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

  // Called once per second while a session is running, for tick/chime modes.
  function onSecondTick(mode) {
    if (mode === 'tick') playTick();
    else if (mode === 'chime') playChime();
    // 'breath' mode does not use per-second ticks; see onPhaseChange.
  }

  // Called whenever the session enters a new phase, for breath mode.
  function onPhaseChange(mode, phaseType, phaseSeconds) {
    if (mode !== 'breath') return;
    if (phaseType === 'in') startBreathSound('in', phaseSeconds);
    else if (phaseType === 'out') startBreathSound('out', phaseSeconds);
    else stopBreathSound(); // holds are silent in breath mode
  }

  function stopAll() {
    stopBreathSound();
  }

  return { resume, onSecondTick, onPhaseChange, stopAll };
})();
