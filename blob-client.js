// Shared client for the one-blob-per-app state store (see
// netlify/functions/blob-store.js). Used by all three tools so their
// settings/data sync across devices instead of being stuck in one
// browser's localStorage.
//
// Usage (called once at boot, before the app renders -- see auth-gate.js
// and auth-gate-vanilla.js, which both call this automatically when given
// a `blobApp` option):
//
//   const state = await window.BlobClient.load('endurance');
//   // ...mutate state...
//   window.BlobClient.save('endurance', state);
//
// load() falls back to a local mirror (a single localStorage key, not the
// many separate keys these apps used before) if the network is
// unavailable, so a page still opens with last-known data instead of
// blanking out. save() writes that same local mirror synchronously on
// every call and debounces the actual network write, so rapid changes
// (dragging a reorder list, typing in a field) don't fire a request per
// keystroke.

window.BlobClient = (function () {
  const LOCAL_MIRROR_PREFIX = 'blobstate_mirror_';
  const SAVE_DEBOUNCE_MS = 800;
  const saveTimers = {};
  const pendingSaveValue = {};

  function mirrorKey(app) { return LOCAL_MIRROR_PREFIX + app; }

  async function getAuthHeader() {
    try {
      const user = window.netlifyIdentity && window.netlifyIdentity.currentUser();
      if (!user) return null;
      const token = await user.jwt();
      return token ? { Authorization: 'Bearer ' + token } : null;
    } catch (e) {
      return null;
    }
  }

  async function load(app) {
    // Local mirror first, synchronously-ish, so there's always something
    // to show even before the network call resolves (or if it fails).
    let localFallback = {};
    try {
      const raw = localStorage.getItem(mirrorKey(app));
      if (raw) localFallback = JSON.parse(raw);
    } catch (e) { /* corrupt mirror -- ignore, treat as empty */ }

    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) return localFallback; // not logged in yet -- caller's auth gate handles that separately
      const res = await fetch('/.netlify/functions/blob-store?app=' + encodeURIComponent(app), {
        headers: authHeader,
      });
      if (!res.ok) return localFallback;
      const remote = await res.json();
      // Remote is authoritative once reachable -- keep the mirror in sync
      // so the next offline/failed load has the latest known-good copy.
      try { localStorage.setItem(mirrorKey(app), JSON.stringify(remote)); } catch (e) {}
      return remote;
    } catch (e) {
      return localFallback;
    }
  }

  function save(app, stateObject) {
    // Synchronous local write happens immediately on every call, so a
    // same-browser reload right after a change is never stale even if the
    // debounced network write hasn't fired yet.
    try { localStorage.setItem(mirrorKey(app), JSON.stringify(stateObject)); } catch (e) {}

    pendingSaveValue[app] = stateObject;
    clearTimeout(saveTimers[app]);
    saveTimers[app] = setTimeout(() => flushSave(app), SAVE_DEBOUNCE_MS);
  }

  async function flushSave(app) {
    const value = pendingSaveValue[app];
    if (value === undefined) return;
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) return; // logged out mid-session -- local mirror already has it, will sync on next successful load
      await fetch('/.netlify/functions/blob-store?app=' + encodeURIComponent(app), {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader),
        body: JSON.stringify(value),
      });
    } catch (e) {
      // Network hiccup -- the local mirror still has the latest value, and
      // the next save() call (or a manual retry) will try again. Not
      // retrying automatically here to avoid a runaway loop if the
      // function itself is the problem (e.g. misconfigured).
    }
  }

  // Forces any pending debounced save to fire immediately -- call this
  // before navigating away if a change was just made, so a quick edit
  // followed by an immediate page change doesn't get lost to the debounce
  // window never completing.
  function flushNow(app) {
    clearTimeout(saveTimers[app]);
    return flushSave(app);
  }

  return { load, save, flushNow };
})();
