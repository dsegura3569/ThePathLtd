// Each technique defines an ordered list of phase types drawn from:
//   'in'       - inhale (circle grows)
//   'hold_in'  - hold after inhale (circle stays solid, large)
//   'out'      - exhale (circle shrinks)
//   'hold_out' - hold after exhale (circle stays solid, small)
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
    description: 'Light, slow, and deep. Six breaths a minute, felt through the ribs.',
    phaseTypes: ['in', 'out'],
    durationMode: 'fixed',
    durations: [4, 6],
    cue: "Hands on your lower ribs. Breathe in and feel the ribs move outward. Breathe out and feel them move inward.",
  },
];

// Resolve a technique + chosen duration into a concrete list of {type, seconds}
window.resolvePhases = function resolvePhases(technique, chosenDuration) {
  if (technique.durationMode === 'fixed') {
    return technique.phaseTypes.map((type, i) => ({ type, seconds: technique.durations[i] }));
  }
  return technique.phaseTypes.map(type => ({ type, seconds: chosenDuration }));
};

window.PHASE_LABELS = {
  in: 'Breathe in',
  hold_in: 'Hold',
  out: 'Breathe out',
  hold_out: 'Hold',
  rest: 'Rest',
};

// For 2-phase (in/out only) patterns like Coherent: one full breath = 2 phases.
window.secondsToBpm = function secondsToBpm(secondsPerPhase) {
  return 60 / (2 * secondsPerPhase);
};
window.bpmToSeconds = function bpmToSeconds(bpm) {
  return 30 / bpm;
};
