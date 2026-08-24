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

const RACES = {
  tmr: {
    id: 'tmr',
    name: 'Telluride Mountain Run',
    shortName: 'TMR',
    distance: 63.5,
    vertGain: 25385,
    startDate: '2026-08-22T06:00:00-06:00',
    startLabel: 'Sat, Aug 22, 2026 \u00b7 6:00 AM start',
    cutoffHours: 32,
    startLat: 37.93508,
    startLon: -107.80772,
    baseSegments: TMR_BASE_SEGMENTS,
    gradeSegments: TMR_GRADE_SEGMENTS,
  },
};

const CURRENT_RACE_KEY = 'tmr_command_current_race_v1';
const CUSTOM_RACES_KEY = 'tmr_command_custom_races_v1';

// Restore any previously-uploaded races BEFORE getStoredRaceId() runs below --
// otherwise a custom race selected last session wouldn't exist in RACES yet
// when we check whether the saved selection is valid, and we'd silently fall
// back to TMR every time.
(function restoreCustomRaces() {
  try {
    const stored = JSON.parse(localStorage.getItem(CUSTOM_RACES_KEY) || '[]');
    stored.forEach(r => { RACES[r.id] = r; });
  } catch (e) {}
})();

function getStoredRaceId() {
  try {
    // A ?race=<id> link (e.g. from the endurance landing page's race list)
    // always wins over whatever was last selected -- someone clicking a
    // specific race card expects to land on THAT race, not wherever they
    // left off last time.
    const urlRace = new URLSearchParams(window.location.search).get('race');
    if (urlRace && RACES[urlRace]) return urlRace;
  } catch (e) {}
  try {
    const saved = localStorage.getItem(CURRENT_RACE_KEY);
    if (saved && RACES[saved]) return saved;
  } catch (e) {}
  return 'tmr';
}

let currentRaceId = getStoredRaceId();
let baseSegments = RACES[currentRaceId].baseSegments;
let gradeSegments = RACES[currentRaceId].gradeSegments;

function selectRace(id) {
  if (!RACES[id]) return false;
  currentRaceId = id;
  baseSegments = RACES[id].baseSegments;
  gradeSegments = RACES[id].gradeSegments;
  try { localStorage.setItem(CURRENT_RACE_KEY, id); } catch (e) {}
  return true;
}

function listRaces() {
  return Object.values(RACES);
}

function registerRace(raceConfig) {
  // Used by the future GPX-upload flow to add a newly-configured race to
  // the registry at runtime, and by anything restoring a previously
  // uploaded race from localStorage on page load.
  RACES[raceConfig.id] = raceConfig;
}

// Custom (GPX-uploaded) races need to persist across page loads, unlike TMR
// which is baked into the deployed files. Stored as plain JSON -- baseSegments/
// gradeSegments are already plain data (no functions), so this round-trips
// cleanly through localStorage.
function saveCustomRace(raceConfig) {
  registerRace(raceConfig);
  try {
    const stored = JSON.parse(localStorage.getItem(CUSTOM_RACES_KEY) || '[]');
    const next = [...stored.filter(r => r.id !== raceConfig.id), raceConfig];
    localStorage.setItem(CUSTOM_RACES_KEY, JSON.stringify(next));
  } catch (e) {}
}

function deleteCustomRace(id) {
  if (id === 'tmr') return false; // never delete the built-in race
  delete RACES[id];
  try {
    const stored = JSON.parse(localStorage.getItem(CUSTOM_RACES_KEY) || '[]');
    localStorage.setItem(CUSTOM_RACES_KEY, JSON.stringify(stored.filter(r => r.id !== id)));
  } catch (e) {}
  if (currentRaceId === id) selectRace('tmr');
  return true;
}

window.RACES = RACES;
window.selectRace = selectRace;
window.listRaces = listRaces;
window.registerRace = registerRace;
window.saveCustomRace = saveCustomRace;
window.deleteCustomRace = deleteCustomRace;
window.getCurrentRaceId = () => currentRaceId;
