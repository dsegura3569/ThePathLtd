// ---------------------------------------------------------------------------
// Race Registry
//
// Every other file in this app (derived_segments.js, shared.js, raceplan.js,
// segments_section.js, grade_view.js, grade_explorer_section.js, overview.js)
// references `baseSegments` and `gradeSegments` as bare global identifiers.
// None of that logic is TMR-specific -- it's all parametric on whatever
// segment data these two names point to. So instead of touching all of
// those files to thread a "current race" value through, this registry keeps
// the same two global names, but as `let` bindings that can be reassigned
// when the selected race changes. Consumers that read baseSegments/
// gradeSegments inside a function body (which all of them do) automatically
// see the new data on their next call -- no changes needed there.
//
// React components that cache derived values in useMemo/useState need to be
// remounted when the race changes, since they won't know the underlying
// globals moved. App.js handles this by keying the active page component on
// the current race id, forcing a full remount on switch.
// ---------------------------------------------------------------------------

const RACES = {};

// TMR's full data, kept as a standalone seed rather than a default entry in
// RACES -- previously every visitor got this race for free, regardless of
// login state, since it was baked into the deployed JS bundle. Now it's
// nothing more than data sitting in memory until someone explicitly imports
// it (see the "Import TMR" option in AddRaceModal), at which point it's
// saved into THEIR OWN account exactly like any GPX upload would be --
// same shape, same saveCustomRace() path, same everything from that point
// on. Nobody else's account is touched by this constant merely existing in
// the source.
const TMR_SEED_RACE = {
  id: 'tmr',
  name: 'Telluride Mountain Run',
  shortName: 'TMR',
  distance: 63.5,
  vertGain: 25385,
  vertLoss: 25385,
  startDate: '2026-08-22T06:00:00-06:00',
  startLabel: 'Sat, Aug 22, 2026 \u00b7 6:00 AM start',
  cutoffHours: 32,
  resultsUrl: 'https://www.runtelluride.com/results',
  startLat: 37.93508,
  startLon: -107.80772,
  baseSegments: TMR_BASE_SEGMENTS,
  gradeSegments: TMR_GRADE_SEGMENTS,
};

// currentRaceId starts on a safe null-ish placeholder and is only ever
// actually resolved (custom races restored, ?race=/last-selected honored)
// once initRacesFromBlobState runs -- see the comment there for why this
// can't happen at module-load time anymore now that the data it needs
// comes from an async blob fetch instead of synchronous localStorage.
let currentRaceId = null;
let baseSegments = [];
let gradeSegments = [];
let racesInitialized = false;

// Called from App's render body (not a useEffect -- effects run after the
// first paint, too late for the useState(() => getCurrentRaceId())
// initializer elsewhere in app.js, which needs this to have already run
// earlier in the SAME render pass) once mountWithAuthGate guarantees the
// blob state has actually loaded. Safe to call on every render: the
// racesInitialized guard makes everything after it a one-time effect
// despite being invoked unconditionally from render.
function initRacesFromBlobState(blobState) {
  if (racesInitialized) return;
  racesInitialized = true;
  const state = blobState || {};

  (state.customRaces || []).forEach(r => { RACES[r.id] = r; });

  const availableIds = Object.keys(RACES);
  let resolvedId = availableIds.length ? availableIds[0] : null;
  try {
    // A ?race=<id> link (e.g. from the endurance landing page's race list)
    // always wins over whatever was last selected -- someone clicking a
    // specific race card expects to land on THAT race, not wherever they
    // left off last time.
    const urlRace = new URLSearchParams(window.location.search).get('race');
    if (urlRace && RACES[urlRace]) resolvedId = urlRace;
    else if (state.currentRaceId && RACES[state.currentRaceId]) resolvedId = state.currentRaceId;
  } catch (e) {}

  currentRaceId = resolvedId;
  baseSegments = resolvedId ? RACES[resolvedId].baseSegments : [];
  gradeSegments = resolvedId ? RACES[resolvedId].gradeSegments : [];
}

// Persists a patch into the shared endurance blob state. Routes through
// the same setState the React app itself uses (exposed by App -- see
// app.js) rather than this file keeping its own separate cached copy of
// the full state and writing that back directly, which risks clobbering
// a change some other part of the app made to a *different* key in the
// same one-blob-per-app object with a stale copy that never saw it.
function saveToBlobState(patch) {
  if (window.__setEnduranceBlobState) window.__setEnduranceBlobState(prev => Object.assign({}, prev, patch));
}

function selectRace(id) {
  if (!RACES[id]) return false;
  currentRaceId = id;
  baseSegments = RACES[id].baseSegments;
  gradeSegments = RACES[id].gradeSegments;
  saveToBlobState({ currentRaceId: id });
  return true;
}

function listRaces() {
  return Object.values(RACES);
}

function registerRace(raceConfig) {
  // Used by the GPX-upload flow to add a newly-configured race to the
  // registry at runtime, and by initRacesFromBlobState restoring
  // previously uploaded races on page load.
  RACES[raceConfig.id] = raceConfig;
}

// Every race a user has -- GPX-uploaded or imported (TMR included) --
// persists the same way: plain JSON in their own blob state. baseSegments/
// gradeSegments are already plain data (no functions), so this round-trips
// cleanly through the blob.
function saveCustomRace(raceConfig) {
  registerRace(raceConfig);
  saveToBlobState({
    customRaces: [...Object.values(RACES).filter(r => r.id !== raceConfig.id), raceConfig],
  });
}

function deleteCustomRace(id) {
  if (!RACES[id]) return false;
  delete RACES[id];
  saveToBlobState({ customRaces: Object.values(RACES) });
  if (currentRaceId === id) {
    const remaining = Object.keys(RACES);
    selectRace(remaining.length ? remaining[0] : null);
    if (!remaining.length) { currentRaceId = null; baseSegments = []; gradeSegments = []; }
  }
  return true;
}

// One-time import: pulls TMR's known data into the CURRENTLY logged-in
// user's own account, through the exact same save path as a fresh GPX
// upload -- nothing TMR-specific happens after this point. Safe to call
// more than once; it just overwrites the same id rather than duplicating.
function importTmrRace() {
  saveCustomRace({ ...TMR_SEED_RACE });
  return TMR_SEED_RACE.id;
}

window.RACES = RACES;
window.selectRace = selectRace;
window.listRaces = listRaces;
window.registerRace = registerRace;
window.saveCustomRace = saveCustomRace;
window.deleteCustomRace = deleteCustomRace;
window.importTmrRace = importTmrRace;
window.getCurrentRaceId = () => currentRaceId;
window.initRacesFromBlobState = initRacesFromBlobState;
