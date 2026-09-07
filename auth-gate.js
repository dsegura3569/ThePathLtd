// Shared Netlify Identity login/signup gate for thepath.ltd's React-based
// tools (endurance command center, breathwork assistant). Not used by the
// self-massage guide (body/), which has no JS framework -- see
// auth-gate-vanilla.js for that one.
//
// Usage, at the bottom of a tool's app.js, replacing the old direct
// ReactDOM.createRoot(...).render(<App/>) call:
//
//   window.mountWithAuthGate(App, {
//     toolName: 'thepath.ltd',
//     toolTagline: 'Tools for endurance training, breathwork, and bodywork.',
//     accent: '#4A7C8C',       // this tool's own accent color
//     bg: '#12151A',           // page background behind the login card
//     cardBg: '#171B22',       // 'transparent' is fine for light themes
//     text: '#EDEEF0',
//     textMuted: '#8A93A3',
//     border: 'rgba(255,255,255,0.08)',
//   });
//
// Everything below Root reads the logged-in user (if any) from
// window.AuthContext rather than talking to window.netlifyIdentity
// directly, so the auth mechanism can change later without touching
// every page that needs to know who's logged in.

window.AuthContext = React.createContext({ user: null, logout: () => {} });

function AuthGateLoginScreen(opts) {
  return React.createElement('div', {
    style: {
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: opts.bg, padding: 20, fontFamily: opts.fontBody || 'inherit',
    },
  },
    React.createElement('div', { style: { textAlign: 'center', maxWidth: 360 } },
      React.createElement('div', {
        style: {
          fontFamily: opts.fontDisplay || 'inherit', fontWeight: 700, fontSize: 26,
          color: opts.text, marginBottom: 8,
        },
      }, opts.toolName),
      React.createElement('p', {
        style: { fontSize: 13.5, color: opts.textMuted, lineHeight: 1.6, marginBottom: 28 },
      }, opts.toolTagline),
      React.createElement('button', {
        onClick: () => window.netlifyIdentity.open('login'),
        style: {
          width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: opts.accent,
          color: opts.accentText || '#12151A', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 10,
        },
      }, 'Log in'),
      React.createElement('button', {
        onClick: () => window.netlifyIdentity.open('signup'),
        style: {
          width: '100%', padding: '12px', borderRadius: 10, border: `1px solid ${opts.border}`, background: opts.cardBg,
          color: opts.text, fontWeight: 600, fontSize: 14, cursor: 'pointer',
        },
      }, 'Create an account')
    )
  );
}

window.mountWithAuthGate = function mountWithAuthGate(AppComponent, opts) {
  function Root() {
    const [ready, setReady] = React.useState(false);
    const [user, setUser] = React.useState(null);

    React.useEffect(() => {
      function handleInit(u) { setUser(u); setReady(true); }
      function handleLogin(u) { setUser(u); window.netlifyIdentity.close(); }
      function handleLogout() { setUser(null); }
      window.netlifyIdentity.on('init', handleInit);
      window.netlifyIdentity.on('login', handleLogin);
      window.netlifyIdentity.on('logout', handleLogout);
      window.netlifyIdentity.init();
      return () => {
        window.netlifyIdentity.off('init', handleInit);
        window.netlifyIdentity.off('login', handleLogin);
        window.netlifyIdentity.off('logout', handleLogout);
      };
    }, []);

    if (!ready) {
      return React.createElement('div', {
        style: {
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: opts.bg,
        },
      }, React.createElement('div', {
        style: { fontFamily: opts.fontMono || 'inherit', fontSize: 12, color: opts.textMuted },
      }, 'Loading\u2026'));
    }

    if (!user) {
      return React.createElement(AuthGateLoginScreen, opts);
    }

    return React.createElement(
      window.AuthContext.Provider,
      { value: { user, logout: () => window.netlifyIdentity.logout() } },
      React.createElement(AppComponent)
    );
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(Root));
};
