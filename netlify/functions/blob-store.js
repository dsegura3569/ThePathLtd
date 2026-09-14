// Authenticated read/write for one JSON blob per app (endurance, breathe,
// body) -- the whole app's persisted state (settings, races, targets,
// layout preferences) lives in a single blob per app rather than one blob
// per localStorage key, so a page only ever needs one GET at load and one
// PUT per save, and there's no per-key surface to validate at all: the
// only thing a caller controls is which of three known app names they're
// touching.
//
// Uses the classic Lambda-style handler (not the newer default-export
// style) specifically because Identity's clientContext.user population is
// documented against this signature -- see
// https://docs.netlify.com/build/functions/functions-and-identity/.
// connectLambda(event) must run before getStore() in this handler style,
// or Blobs throws MissingBlobsEnvironmentError.
const { getStore, connectLambda } = require('@netlify/blobs');

const ALLOWED_APPS = ['endurance', 'breathe', 'body'];
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB -- generous for JSON settings/race data, well under Blobs' own limits

exports.handler = async (event, context) => {
  connectLambda(event);

  // Single-user site: this only ever needs to confirm the request carries
  // a valid Identity session, not distinguish between different accounts.
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const app = (event.queryStringParameters || {}).app;
  if (!app || !ALLOWED_APPS.includes(app)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown app. Expected one of: ' + ALLOWED_APPS.join(', ') }) };
  }

  const store = getStore({ name: app });
  const STATE_KEY = 'state';

  if (event.httpMethod === 'GET') {
    const value = await store.get(STATE_KEY);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: value === null ? '{}' : value,
    };
  }

  if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
    const body = event.body || '';
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
      return { statusCode: 413, body: JSON.stringify({ error: 'State too large' }) };
    }
    // Validate it's at least well-formed JSON before persisting -- a
    // malformed write here would otherwise corrupt the one blob the whole
    // app reads on every load.
    try {
      JSON.parse(body);
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Body must be valid JSON' }) };
    }
    await store.set(STATE_KEY, body);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
