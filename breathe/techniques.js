// Each technique defines an ordered list of phase types drawn from:
//   'in'        - inhale (circle grows)
//   'hold_in'   - hold after inhale (circle stays solid, large) -- part of the technique's own counted pattern
//   'out'       - exhale (circle shrinks)
//   'hold_out'  - hold after exhale (circle stays solid, small) -- part of the technique's own counted pattern
//   'pause_in'  - brief automatic pause after inhale, before exhale (see resolvePhases below)
//   'pause_out' - brief automatic pause after exhale, before the next inhale
//
// durationMode 'fixed'      -> durations array maps 1:1 to phaseTypes
// durationMode 'selectable' -> every phase shares one user-selected duration (min/max/default)

window.TECHNIQUES = [
  {
    id: 'box',
    name: 'Box',
    description: 'Equal inhale, hold, exhale, hold — a steady four-count square.',
    phaseTypes: ['in', 'hold_in', 'out', 'hold_out'],
    durationMode: 'selectable',
    min: 2,
    max: 16,
    default: 4,
  },
  {
    id: '478',
    name: '4-7-8',
    description: 'A fixed pattern: inhale 4, hold 7, exhale 8.',
    phaseTypes: ['in', 'hold_in', 'out'],
    durationMode: 'fixed',
    durations: [4, 7, 8],
  },
  {
    id: 'coherent',
    name: 'Coherent',
    description: 'Equal inhale and exhale, no holds — steady resonance breathing.',
    phaseTypes: ['in', 'out'],
    durationMode: 'selectable',
    min: 2,
    max: 32,
    default: 5,
    supportsBpm: true, // 2-phase pattern: BPM = 60 / (2 * secondsPerPhase)
  },
  {
    id: 'cadence',
    name: 'Cadence Breathing',
    description: 'Light, slow, and deep. Six breaths a minute, felt through the ribs. Works well paced to a walk.',
    phaseTypes: ['in', 'out'],
    durationMode: 'fixed',
    durations: [4, 6],
    cue: "Hands on your lower ribs. Breathe in and feel the ribs move outward. Breathe out and feel them move inward.",
  },
  {
    id: 'recovery-walk',
    name: 'Breathing Recovery Walking',
    description: 'Exhale, hold your breath and walk 10-15 paces, then recover and repeat five times.',
    finite: true, // configured and resolved specially, not via resolvePhases/resolvePhilosopherPhases
    holdWalk: { min: 8, max: 30, default: 15 },
    rest: { min: 30, max: 60, default: 45 },
    cue: "Take a normal breath in and out through your nose. Hold your breath and walk 10-15 paces. Stop, release, and breathe gently until the rest ends.",
  },
  {
    id: 'connected',
    name: 'Conscious Connected',
    description: 'A continuous circular loop, no pause between inhale and exhale — active in, passive out.',
    phaseTypes: ['in', 'out'],
    durationMode: 'selectable',
    min: 2,
    max: 8,
    default: 4,
    cue: "No gap between the in-breath and the out-breath — keep it one continuous loop. Draw the inhale in actively, into the belly and up into the chest. Let the exhale go soft and unforced. Breathe through the same pathway the whole time — all nose, or all mouth.",
    // This technique is specifically defined by having zero gap between
    // breaths -- inserting one would contradict its whole design.
    noTransitionPause: true,
  },
  {
    id: 'holotropic',
    name: 'Holotropic',
    description: 'Fast, deep, continuous breathing — traditionally done with a trained facilitator, not alone.',
    phaseTypes: ['in', 'out'],
    durationMode: 'selectable',
    min: 1,
    max: 3,
    step: 0.5,
    default: 1.5,
    cue: "This is an intense practice — traditionally guided by a trained facilitator, often in a group, not done solo. Sit or lie down somewhere safe before starting. Not recommended if you're pregnant, or have a cardiovascular condition, seizure disorder, glaucoma, recent surgery, or a history of psychosis — check with a doctor first if any of that applies. Stop immediately if you feel unwell.",
    // This is a one-time safety warning to read before starting, not an
    // in-the-moment coaching reminder like Cadence's or Conscious
    // Connected's cues -- it shouldn't keep reappearing over every single
    // "breathe out" during a fast, intense session where it's just noise.
    cueShowsOnSetupOnly: true,
    // A slow melodic glide (chime mode) structurally can't represent a
    // 1-3s phase legibly -- there's no time for it to read as a gentle
    // tone, only as an abrupt chirp. Tick and real-breath modes both work
    // at this pace; chime doesn't, regardless of tuning.
    excludeSoundModes: ['chime'],
    // "Fast, deep, continuous breathing" is the whole point here -- an
    // inserted pause would work against the technique itself.
    noTransitionPause: true,
  },
];

// Resolves a Breathing Recovery Walking session into 5 repetitions of
// exhale-cue -> hold & walk -> rest, ending naturally (not looping).
window.resolveRecoveryWalkingPhases = function resolveRecoveryWalkingPhases(holdWalkSeconds, restSeconds) {
  const phases = [];
  for (let i = 0; i < 5; i++) {
    phases.push({ type: 'out', seconds: 2, stageIndex: i });
    phases.push({ type: 'hold_out', seconds: holdWalkSeconds, stageIndex: i });
    phases.push({ type: 'rest', seconds: restSeconds, stageIndex: i });
  }
  return phases;
};

// Brief stillness inserted between an inhale and exhale (and, since sessions
// loop, between the exhale and the next inhale) so the two never feel like
// they're running directly into one another. Distinct from an actual
// programmed hold (hold_in/hold_out) -- this is just a beat, not part of
// the technique's counted pattern -- and skipped entirely for techniques
// that define themselves by having no gap (Conscious Connected, Holotropic).
const PAUSE_SECONDS = 0.4;

// Resolve a technique + chosen duration into a concrete list of {type, seconds}
window.resolvePhases = function resolvePhases(technique, chosenDuration) {
  const base = technique.durationMode === 'fixed'
    ? technique.phaseTypes.map((type, i) => ({ type, seconds: technique.durations[i] }))
    : technique.phaseTypes.map(type => ({ type, seconds: chosenDuration }));

  if (technique.noTransitionPause) return base;

  const isBreath = t => t === 'in' || t === 'out';
  // Count how many pause beats will actually be inserted -- including the
  // wrap-around from the last phase back to the first, since sessions loop
  // -- so their added time can be subtracted back out of the breath phases
  // themselves. Without this, a stated pace (Cadence's "six breaths a
  // minute", Coherent's BPM control) would silently drift slower once
  // pauses are added.
  let pauseCount = 0;
  for (let i = 0; i < base.length; i++) {
    const cur = base[i], next = base[(i + 1) % base.length];
    if (isBreath(cur.type) && isBreath(next.type) && cur.type !== next.type) pauseCount++;
  }
  if (pauseCount === 0) return base; // no direct in<->out adjacency (e.g. Box, 4-7-8 already have holds there)

  const breathPhaseCount = base.filter(p => isBreath(p.type)).length;
  const perPhaseReduction = (pauseCount * PAUSE_SECONDS) / breathPhaseCount;

  const result = [];
  for (let i = 0; i < base.length; i++) {
    const cur = base[i];
    const seconds = isBreath(cur.type) ? Math.max(0.3, cur.seconds - perPhaseReduction) : cur.seconds;
    result.push({ type: cur.type, seconds });
    const next = base[(i + 1) % base.length];
    if (cur.type === 'in' && next.type === 'out') {
      result.push({ type: 'pause_in', seconds: PAUSE_SECONDS }); // pause at the top, lungs full
    } else if (cur.type === 'out' && next.type === 'in') {
      result.push({ type: 'pause_out', seconds: PAUSE_SECONDS }); // pause at the bottom, lungs empty
    }
  }
  return result;
};

window.PHASE_LABELS = {
  in: 'Breathe in',
  hold_in: 'Hold',
  out: 'Breathe out',
  hold_out: 'Hold',
  pause_in: 'Pause',
  pause_out: 'Pause',
  rest: 'Rest',
};

// One accent color per phase *category* (not per raw type -- hold_in and
// hold_out share a color, as do pause_in/pause_out) so the circle, the
// phase label, and anything else visual can be color-coded consistently:
// a person can tell what's happening from color alone, not just position
// or text. Chosen from the site's existing warm/earthy palette rather than
// introducing new hues -- cool slate blue for inhale (already the app's
// default accent), warm rust for exhale (the site's other primary accent,
// giving a natural cool/warm pairing), clay for a real programmed hold,
// and a quieter neutral for the brief transition pause and for rest.
window.PHASE_COLORS = {
  in: '#4A7C8C',        // breathe-color -- inhale
  out: '#A9542C',        // rust -- exhale
  hold_in: '#8F5D36',    // clay -- a real, programmed hold
  hold_out: '#8F5D36',
  pause_in: '#B7AA95',   // muted sand -- brief transition beat, not a real hold
  pause_out: '#B7AA95',
  rest: '#A79E8C',
};

// For 2-phase (in/out only) patterns like Coherent: one full breath = 2 phases.
window.secondsToBpm = function secondsToBpm(secondsPerPhase) {
  return 60 / (2 * secondsPerPhase);
};
window.bpmToSeconds = function bpmToSeconds(bpm) {
  return 30 / bpm;
};
