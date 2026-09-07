// Shared Netlify Identity login/signup gate for thepath.ltd's plain
// HTML/vanilla-JS tools (endurance landing page, self-massage guide). For
// the React-based tools, see auth-gate.js instead.
//
// Usage, right before </body>, after the real page content:
//
//   <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
//   <script src="/auth-gate-vanilla.js"></script>
//   <script>
//     window.initVanillaAuthGate({
//       contentSelector: '.container',   // wraps your real page content
//       toolName: 'thepath.ltd',
//       toolTagline: 'Tools for endurance training, breathwork, and bodywork.',
//       accent: '#B85C38',
//       bg: '#F8F1E4',
//       cardBg: '#FBF7EF',
//       text: '#2B1B10',
//       textMuted: '#4A3627',
//       border: 'rgba(43,27,16,0.14)',
//       fontDisplay: "'Fraunces', serif",
//       fontMono: "'Space Mono', monospace",
//     });
//   </script>
//
// The real content element is hidden until Identity confirms a logged-in
// user; until then a login/signup screen (matching auth-gate.js's React
// version) is shown in its place.

window.initVanillaAuthGate = function initVanillaAuthGate(opts) {
  const content = document.querySelector(opts.contentSelector);
  if (!content) return;
  content.style.display = 'none';

  const gate = document.createElement('div');
  gate.style.cssText = `min-height:100vh; display:flex; align-items:center; justify-content:center; background:${opts.bg}; padding:20px; font-family:inherit;`;
  gate.innerHTML = `
    <div style="text-align:center; max-width:360px;">
      <div id="agv-loading" style="font-family:${opts.fontMono}; font-size:12px; color:${opts.textMuted};">Loading&hellip;</div>
      <div id="agv-login" style="display:none;">
        <div style="font-family:${opts.fontDisplay}; font-weight:700; font-size:26px; color:${opts.text}; margin-bottom:8px;">${opts.toolName}</div>
        <p style="font-size:13.5px; color:${opts.textMuted}; line-height:1.6; margin-bottom:28px;">${opts.toolTagline}</p>
        <button id="agv-login-btn" style="width:100%; padding:12px; border-radius:10px; border:none; background:${opts.accent}; color:${opts.accentText || '#FBF7EF'}; font-weight:600; font-size:14px; cursor:pointer; margin-bottom:10px; font-family:inherit;">Log in</button>
        <button id="agv-signup-btn" style="width:100%; padding:12px; border-radius:10px; border:1px solid ${opts.border}; background:${opts.cardBg}; color:${opts.text}; font-weight:600; font-size:14px; cursor:pointer; font-family:inherit;">Create an account</button>
      </div>
    </div>
  `;
  content.parentNode.insertBefore(gate, content);

  const loadingEl = gate.querySelector('#agv-loading');
  const loginEl = gate.querySelector('#agv-login');
  gate.querySelector('#agv-login-btn').addEventListener('click', () => window.netlifyIdentity.open('login'));
  gate.querySelector('#agv-signup-btn').addEventListener('click', () => window.netlifyIdentity.open('signup'));

  function showApp() {
    gate.style.display = 'none';
    content.style.display = '';
  }
  function showLogin() {
    loadingEl.style.display = 'none';
    loginEl.style.display = 'block';
    gate.style.display = 'flex';
    content.style.display = 'none';
  }

  window.netlifyIdentity.on('init', (user) => { if (user) showApp(); else showLogin(); });
  window.netlifyIdentity.on('login', () => { window.netlifyIdentity.close(); showApp(); });
  window.netlifyIdentity.on('logout', () => showLogin());
  window.netlifyIdentity.init();
};
