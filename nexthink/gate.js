// ---------------------------------------------------------------------------
// Nexthink section gate: WebAuthn (Face ID / Touch ID on supported devices)
// as the primary unlock, with a passphrase fallback for other devices or
// browsers without WebAuthn support.
//
// Honest limits, worth remembering when touching this file:
// - This is a static site with no backend, so there's no server to verify
//   a WebAuthn assertion's signature against a stored public key. What this
//   actually checks is "did the browser return a successful assertion
//   object" -- a real Face ID/Touch ID prompt from the device's secure
//   enclave, but not cryptographically verified against anything server-side.
//   That's a legitimate deterrent against casual snooping, not real access
//   control -- viewing page source would reveal the gated content's HTML
//   regardless. Same threat model as a plain passphrase gate.
// - WebAuthn credentials are scoped per-device. Enrolling on one phone does
//   nothing for a different phone or a laptop -- each needs its own
//   enrollment, or the passphrase fallback.
// ---------------------------------------------------------------------------

const NEXTHINK_UNLOCK_KEY = 'nexthink_unlocked_v1';
const NEXTHINK_CREDENTIAL_KEY = 'nexthink_webauthn_credential_v1';
const NEXTHINK_PASSPHRASE = 'telluride26'; // change this to whatever you want -- it's just a string in client-side JS

function nexthinkIsUnlocked() {
  try { return localStorage.getItem(NEXTHINK_UNLOCK_KEY) === '1'; } catch (e) { return false; }
}
function nexthinkSetUnlocked() {
  try { localStorage.setItem(NEXTHINK_UNLOCK_KEY, '1'); } catch (e) {}
}
function nexthinkLock() {
  try { localStorage.removeItem(NEXTHINK_UNLOCK_KEY); } catch (e) {}
}

function nexthinkBufToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function nexthinkBase64ToBuf(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function nexthinkWebAuthnSupported() {
  return typeof window.PublicKeyCredential !== 'undefined' && !!navigator.credentials;
}

function nexthinkHasEnrolledCredential() {
  try { return !!localStorage.getItem(NEXTHINK_CREDENTIAL_KEY); } catch (e) { return false; }
}

async function nexthinkEnrollFaceId() {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Nexthink Onboarding' },
      user: { id: userId, name: 'dustin', displayName: 'Dustin' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', requireResidentKey: false },
      timeout: 60000,
    },
  });
  if (!cred) throw new Error('No credential returned.');
  localStorage.setItem(NEXTHINK_CREDENTIAL_KEY, nexthinkBufToBase64(cred.rawId));
  nexthinkSetUnlocked();
  return true;
}

async function nexthinkUnlockFaceId() {
  const storedId = localStorage.getItem(NEXTHINK_CREDENTIAL_KEY);
  if (!storedId) return nexthinkEnrollFaceId();
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: nexthinkBase64ToBuf(storedId), type: 'public-key', transports: ['internal'] }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  if (!assertion) throw new Error('No assertion returned.');
  nexthinkSetUnlocked();
  return true;
}

function nexthinkUnlockPassphrase(input) {
  if (input === NEXTHINK_PASSPHRASE) { nexthinkSetUnlocked(); return true; }
  return false;
}

window.NexthinkGate = {
  isUnlocked: nexthinkIsUnlocked,
  lock: nexthinkLock,
  webAuthnSupported: nexthinkWebAuthnSupported,
  hasEnrolledCredential: nexthinkHasEnrolledCredential,
  unlockFaceId: nexthinkUnlockFaceId,
  unlockPassphrase: nexthinkUnlockPassphrase,
};
