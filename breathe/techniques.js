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
