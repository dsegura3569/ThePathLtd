function useCountdown(targetIso) {
  const [remaining, setRemaining] = React.useState(() => new Date(targetIso).getTime() - Date.now());
  React.useEffect(() => {
    const id = setInterval(() => {
      setRemaining(new Date(targetIso).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  if (remaining <= 0) return null;
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

// WMO weather codes used by Open-Meteo's `weather_code` field.
const WMO_CODES = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
  95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Severe thunderstorm',
};

function aqiLabel(aqi) {
  if (aqi <= 50) return { label: 'Good', color: 'var(--ok, #3CB897)' };
  if (aqi <= 100) return { label: 'Moderate', color: 'var(--climb)' };
  if (aqi <= 150) return { label: 'Unhealthy (sensitive)', color: '#E8943A' };
  if (aqi <= 200) return { label: 'Unhealthy', color: 'var(--descent)' };
  return { label: 'Very unhealthy', color: '#C0392B' };
}

// Start line coordinates (Town Park, Telluride) -- same point used for the
// GPX-derived course data elsewhere on the dashboard.
const START_LAT = 37.93508, START_LON = -107.80772;

function useLiveWeather() {
  const [state, setState] = React.useState({ status: 'loading' });
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [wxRes, aqRes] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${START_LAT}&longitude=${START_LON}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FDenver`),
          fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${START_LAT}&longitude=${START_LON}&current=us_aqi&timezone=America%2FDenver`),
        ]);
        if (!wxRes.ok || !aqRes.ok) throw new Error('bad response');
        const wx = await wxRes.json();
        const aq = await aqRes.json();
        if (cancelled) return;
        setState({
          status: 'ok',
          temp: Math.round(wx.current.temperature_2m),
          condition: WMO_CODES[wx.current.weather_code] || 'Unknown',
          wind: Math.round(wx.current.wind_speed_10m),
          humidity: Math.round(wx.current.relative_humidity_2m),
          aqi: aq.current.us_aqi,
        });
      } catch (e) {
        if (!cancelled) setState({ status: 'error' });
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);
  return state;
}

const STAT_DEFS_KEY = 'tmr_overview_stat_order_v1';

function Overview({ goTo }) {
  // Race starts 6:00am Saturday Aug 22, 2026, Mountain Time (MDT, UTC-6 in August)
  const countdown = useCountdown('2026-08-22T06:00:00-06:00');
  const weather = useLiveWeather();

  const staticStats = [
    { key: 'distance', label: 'Distance', value: '63.5', unit: 'mi' },
    { key: 'vert', label: 'Vert gain', value: '25,385', unit: 'ft' },
    { key: 'aid', label: 'Aid stations', value: '9', unit: '' },
    { key: 'bags', label: 'Drop bags', value: '3', unit: '' },
    { key: 'range', label: 'Elevation range', value: '8,750–13,500', unit: 'ft' },
    { key: 'avgalt', label: 'Avg altitude', value: '11,255', unit: 'ft' },
    { key: 'cutoff', label: 'Cutoff', value: '32', unit: 'hr' },
  ];

  const weatherStats = React.useMemo(() => {
    if (weather.status === 'ok') {
      const aq = aqiLabel(weather.aqi);
      return [
        { key: 'temp', label: 'Live temp (start line)', value: `${weather.temp}`, unit: '°F', sub: `${weather.humidity}% humidity` },
        { key: 'conditions', label: 'Live conditions', value: weather.condition, unit: '', sub: `${weather.wind}mph wind` },
        { key: 'aqi', label: 'Air quality (AQI)', value: `${weather.aqi}`, unit: '', sub: aq.label, subColor: aq.color },
      ];
    }
    if (weather.status === 'error') {
      return [
        { key: 'temp', label: 'Live temp (start line)', value: '—', unit: '', sub: 'unavailable' },
        { key: 'conditions', label: 'Live conditions', value: '—', unit: '', sub: 'unavailable' },
        { key: 'aqi', label: 'Air quality (AQI)', value: '—', unit: '', sub: 'unavailable' },
      ];
    }
    return [
      { key: 'temp', label: 'Live temp (start line)', value: '···', unit: '' },
      { key: 'conditions', label: 'Live conditions', value: '···', unit: '' },
      { key: 'aqi', label: 'Air quality (AQI)', value: '···', unit: '' },
    ];
  }, [weather]);

  const allStats = [...staticStats, ...weatherStats];
  const defaultOrder = allStats.map(s => s.key);

  const [showStatPanel, setShowStatPanel] = React.useState(false);
  const [statOrder, setStatOrder] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STAT_DEFS_KEY));
      if (Array.isArray(saved) && saved.every(k => defaultOrder.includes(k)) &&
          defaultOrder.every(k => saved.includes(k))) {
        return saved;
      }
    } catch (e) {}
    return defaultOrder;
  });

  React.useEffect(() => {
    try { localStorage.setItem(STAT_DEFS_KEY, JSON.stringify(statOrder)); } catch (e) {}
  }, [statOrder]);

  function moveStat(index, dir) {
    setStatOrder(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function resetStats() { setStatOrder(defaultOrder); }

  const orderedStats = statOrder.map(k => allStats.find(s => s.key === k)).filter(Boolean);

  const cards = [
    { id: 'raceplan', n: '01', t: 'Race Day Plan', d: 'Segment-by-segment pace, fuel, gear, and drop bag logistics for all 10 legs.' },
    { id: 'grade', n: '02', t: 'Grade Profile', d: 'Every 0.1-mile grade reading across the full course, aid station by aid station.' },
    { id: 'histogram', n: '03', t: 'Grade Distribution', d: 'How many miles sit at each grade band, from -45% to +45%.' },
    { id: 'climb', n: '04', t: 'Opening Climb', d: 'The 7.5-mile, 4,712ft opening push to Telluride Peak, broken down half-mile by half-mile.' },
    { id: 'treadmill', n: '05', t: 'Treadmill Legs', d: 'Indoor replication sessions matched to real course grade and duration.' },
    { id: 'vertcalc', n: '06', t: 'Vert Calculator', d: 'Grade, speed, and time-to-target vertical gain calculator.' },
    { id: 'history', n: '07', t: 'Race History', d: 'Completed races leading into TMR — Dead Horse, Desert RATS, Colfax.' },
    { id: 'comparison', n: '08', t: 'Race Comparison', d: 'How training runs and past races stack up against TMR\u2019s demands.' },
    { id: 'hillreps', n: '09', t: 'Hill Reps', d: 'Local hill session analysis and grade-matched training terrain.' },
  ];

  return (
    <div>
      <section style={{padding:'40px 0 56px', borderBottom:'1px solid var(--line)'}}>
        <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--climb)', letterSpacing:'0.08em', marginBottom:14}}>
          TELLURIDE MOUNTAIN RUN &middot; SAT, AUG 22, 2026 &middot; 6:00 AM START
        </div>
        <h1 style={{
          fontFamily:'var(--display)', fontWeight:700, fontSize:'clamp(38px, 8vw, 68px)',
          lineHeight:1.02, letterSpacing:'-0.02em', margin:'0 0 20px',
        }}>
          63.5 miles.<br/>
          <span style={{color:'var(--climb)'}}>25,385 feet</span> of climbing.<br/>
          One race day.
        </h1>
        <button onClick={()=>goTo('raceplan')} style={{
          background:'var(--climb)', color:'#12151A', border:'none', borderRadius:10,
          padding:'14px 24px', fontFamily:'var(--display)', fontWeight:600, fontSize:15,
          cursor:'pointer', marginTop:8,
        }}>
          Open race day plan &rarr;
        </button>
      </section>

      {countdown && (
        <section style={{padding:'32px 0', borderBottom:'1px solid var(--line)'}}>
          <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', marginBottom:16, letterSpacing:'0.08em', textTransform:'uppercase'}}>
            Countdown to Start
          </div>
          <div style={{display:'flex', gap:28, flexWrap:'wrap', marginBottom:28}}>
            {[['days','Days'],['hours','Hours'],['minutes','Min'],['seconds','Sec']].map(([key,label]) => (
              <div key={key}>
                <div style={{fontFamily:'var(--display)', fontSize:32, fontWeight:700, color:'var(--climb)'}}>
                  {String(countdown[key]).padStart(2,'0')}
                </div>
                <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)', textTransform:'uppercase', letterSpacing:'0.05em'}}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:20}}>
            <div>
              <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em'}}>
                Historical Weather &mdash; Telluride, August
              </div>
              <p style={{fontFamily:'var(--body)', fontSize:14, color:'var(--ink-dim)', lineHeight:1.6, margin:0}}>
                Town-level (8,647ft) NOAA climate normals: avg high <strong style={{color:'var(--ink)'}}>74&deg;F</strong>,
                avg low <strong style={{color:'var(--ink)'}}>40&deg;F</strong>, ~42% chance of rain on a given day.
              </p>
              <p style={{fontFamily:'var(--body)', fontSize:13, color:'var(--ink-faint)', lineHeight:1.6, marginTop:8}}>
                The start (Town Park, 8,750ft) sits almost exactly at this station&rsquo;s elevation &mdash;
                the 6am cold is a time-of-day thing, not an altitude thing. Elevation starts to matter once
                you climb: you&rsquo;re 2,000ft+ above the station for most of the course, and up to
                4,850ft above it on the highest sections (13,500ft, above treeline). That&rsquo;s where the
                real temperature drop and storm risk kick in, not at the start line.
              </p>
            </div>
          </div>
        </section>
      )}

      <section style={{padding:'40px 0', borderBottom:'1px solid var(--line)'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:12}}>
          <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', letterSpacing:'0.08em', textTransform:'uppercase'}}>
            Course &amp; Conditions
          </div>
          <button onClick={() => setShowStatPanel(v => !v)} style={{
            fontSize:11, fontFamily:'var(--mono)', color:'var(--ink-faint)', background:'var(--bg-raised)',
            border:'1px solid var(--line)', borderRadius:8, padding:'5px 10px', cursor:'pointer',
          }}>
            {showStatPanel ? 'Done' : 'Reorder blocks'}
          </button>
        </div>

        {showStatPanel && (
          <div style={{background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:10, padding:12, marginBottom:16}}>
            {statOrder.map((key, i) => {
              const s = allStats.find(x => x.key === key);
              return (
                <div key={key} style={{display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderTop: i>0 ? '1px solid var(--line)' : 'none'}}>
                  <span style={{flex:1, fontSize:13, color:'var(--ink)'}}>{s.label}</span>
                  <button disabled={i===0} onClick={() => moveStat(i, -1)} style={{
                    width:26, height:26, borderRadius:6, border:'1px solid var(--line)', background:'var(--bg-raised)',
                    color: i===0 ? 'var(--ink-faint)' : 'var(--ink)', cursor: i===0 ? 'not-allowed' : 'pointer', fontSize:12,
                  }}>&uarr;</button>
                  <button disabled={i===statOrder.length-1} onClick={() => moveStat(i, 1)} style={{
                    width:26, height:26, borderRadius:6, border:'1px solid var(--line)', background:'var(--bg-raised)',
                    color: i===statOrder.length-1 ? 'var(--ink-faint)' : 'var(--ink)', cursor: i===statOrder.length-1 ? 'not-allowed' : 'pointer', fontSize:12,
                  }}>&darr;</button>
                </div>
              );
            })}
            <button onClick={resetStats} style={{
              marginTop:10, fontSize:11, fontFamily:'var(--mono)', color:'var(--ink-faint)', background:'none',
              border:'none', textDecoration:'underline', cursor:'pointer', padding:0,
            }}>Reset to default order</button>
          </div>
        )}

        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:1, background:'var(--line)'}}>
          {orderedStats.map(s => (
            <div key={s.key} style={{background:'var(--bg)', padding:'20px 16px'}}>
              <div style={{fontFamily:'var(--display)', fontSize:26, fontWeight:700, color:'var(--ink)'}}>
                {s.value}<span style={{fontSize:14, color:'var(--ink-faint)', marginLeft:4}}>{s.unit}</span>
              </div>
              <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', marginTop:6, textTransform:'uppercase', letterSpacing:'0.05em'}}>
                {s.label}
              </div>
              {s.sub && (
                <div style={{fontFamily:'var(--mono)', fontSize:10, color: s.subColor || 'var(--ink-faint)', marginTop:4}}>
                  {s.sub}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section style={{padding:'48px 0 20px'}}>
        <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--ink-faint)', marginBottom:24, letterSpacing:'0.08em'}}>
          ALL SECTIONS
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14}}>
          {cards.map(c => (
            <button key={c.id} onClick={()=>goTo(c.id)} style={{
              textAlign:'left', background:'var(--bg-card)', border:'1px solid var(--line)',
              borderRadius:14, padding:'22px 20px', cursor:'pointer', color:'var(--ink)',
              transition:'border-color 0.15s',
            }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='var(--climb)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--line)'}
            >
              <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--climb)', marginBottom:10}}>{c.n}</div>
              <div style={{fontFamily:'var(--display)', fontSize:19, fontWeight:600, marginBottom:8}}>{c.t}</div>
              <div style={{fontFamily:'var(--body)', fontSize:13.5, color:'var(--ink-dim)', lineHeight:1.5}}>{c.d}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
window.Overview = Overview;
