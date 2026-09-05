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

// Start line coordinates -- read fresh from whichever race is currently
// active each time this is called, not cached at script-load time, since
// switching races remounts components rather than reloading the page.
function getStartCoords() {
  const r = window.RACES[window.getCurrentRaceId()];
  return { lat: r.startLat, lon: r.startLon };
}

function useLiveWeather() {
  const [state, setState] = React.useState({ status: 'loading' });
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { lat: START_LAT, lon: START_LON } = getStartCoords();
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
const STAT_VISIBILITY_KEY = 'tmr_overview_stat_visibility_v1';
const COURSE_PROFILE_STAT_ORDER_KEY = 'tmr_overview_course_profile_stat_order_v1';

function useRaceDayForecast() {
  const [state, setState] = React.useState({ status: 'loading' });
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { lat: START_LAT, lon: START_LON } = getStartCoords();
        const raceDate = window.RACES[window.getCurrentRaceId()].startDate.slice(0, 10);
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${START_LAT}&longitude=${START_LON}&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&hourly=temperature_2m&start_date=${raceDate}&end_date=${raceDate}&temperature_unit=fahrenheit&timezone=America%2FDenver`);
        if (!res.ok) throw new Error('bad response');
        const data = await res.json();
        if (cancelled) return;
        if (!data.daily || data.daily.temperature_2m_max[0] == null) {
          setState({ status: 'unavailable' }); // race day likely outside forecast range
          return;
        }
        const hourlyTimes = data.hourly.time;
        const hourlyTemps = data.hourly.temperature_2m;
        const maxIdx = hourlyTemps.indexOf(Math.max(...hourlyTemps));
        const minIdx = hourlyTemps.indexOf(Math.min(...hourlyTemps));
        function fmtTimeStr(isoStr) {
          const h = parseInt(isoStr.slice(11, 13), 10);
          const m = parseInt(isoStr.slice(14, 16), 10);
          const period = h < 12 ? 'am' : 'pm';
          let h12 = h % 12; if (h12 === 0) h12 = 12;
          return `${h12}:${String(m).padStart(2, '0')}${period}`;
        }
        // Interpolates between the two bracketing hourly readings so a start/finish
        // time that lands mid-hour (e.g. a 6:35am start) isn't just rounded to
        // whichever hour is closest.
        function tempAtDecimalHour(decHour) {
          const clamped = Math.max(0, Math.min(23.999, decHour));
          const h0 = Math.floor(clamped);
          const h1 = Math.min(23, h0 + 1);
          const frac = clamped - h0;
          const t0 = hourlyTemps[h0], t1 = hourlyTemps[h1];
          if (t0 == null || t1 == null) return null;
          return t0 + (t1 - t0) * frac;
        }
        setState({
          status: 'ok',
          high: Math.round(data.daily.temperature_2m_max[0]),
          low: Math.round(data.daily.temperature_2m_min[0]),
          highTime: fmtTimeStr(hourlyTimes[maxIdx]),
          lowTime: fmtTimeStr(hourlyTimes[minIdx]),
          sunrise: fmtTimeStr(data.daily.sunrise[0]),
          sunset: fmtTimeStr(data.daily.sunset[0]),
          tempAtDecimalHour,
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

function RaceDayForecastWidget() {
  const f = useRaceDayForecast();
  const { targetHours } = React.useContext(window.TargetHoursContext);
  const race = window.RACES[window.getCurrentRaceId()];

  // Race start hour-of-day as a decimal (e.g. 6:35am -> 6.583), read straight
  // from the race's startDate rather than assuming a 6am default. Finish is
  // just start + the Target Finish Time from Pace & Nutrition Targets --
  // if that pushes past midnight the temp lookup clamps to the last hour
  // of data we have rather than wrapping into the next day.
  let startDecHour = null, finishDecHour = null;
  if (race.startDate) {
    const m = race.startDate.match(/T(\d{2}):(\d{2})/);
    if (m) {
      startDecHour = parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
      finishDecHour = startDecHour + targetHours;
    }
  }
  function fmtDecHour(decHour) {
    const h = Math.floor(decHour) % 24;
    const mins = Math.round((decHour - Math.floor(decHour)) * 60);
    const period = h < 12 ? 'am' : 'pm';
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return `${h12}:${String(mins).padStart(2, '0')}${period}`;
  }

  const blocks = f.status === 'ok'
    ? [
        { label: 'Low', value: `${f.low}°F`, sub: f.lowTime, color: '#4A9FE8' },
        { label: 'High', value: `${f.high}°F`, sub: f.highTime, color: 'var(--climb)' },
        { label: 'Sunrise', value: f.sunrise, sub: null, color: 'var(--climb)' },
        { label: 'Sunset', value: f.sunset, sub: null, color: '#4A9FE8' },
        ...(startDecHour !== null ? [{
          label: 'At start', value: (() => { const t = f.tempAtDecimalHour(startDecHour); return t == null ? '\u2014' : `${Math.round(t)}\u00b0F`; })(),
          sub: fmtDecHour(startDecHour), color: 'var(--climb)',
        }] : []),
        ...(finishDecHour !== null ? [{
          label: 'At finish', value: (() => { const t = f.tempAtDecimalHour(finishDecHour); return t == null ? '\u2014' : `${Math.round(t)}\u00b0F`; })(),
          sub: `${fmtDecHour(finishDecHour)} \u00b7 ${targetHours}hr target`, color: '#4A9FE8',
        }] : []),
      ]
    : null;

  return (
    <section style={{padding:'32px 0', borderBottom:'1px solid var(--line)'}}>
      <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', marginBottom:16, letterSpacing:'0.08em', textTransform:'uppercase'}}>
        Race Day Forecast{(() => {
          const r = window.RACES[window.getCurrentRaceId()];
          if (!r.startDate) return ' \u2014 date not set';
          const m = r.startDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (!m) return ' \u2014 date not set';
          const dateForNames = new Date(parseInt(m[1],10), parseInt(m[2],10) - 1, parseInt(m[3],10));
          return ` \u2014 ${dateForNames.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
        })()}
      </div>
      {f.status === 'ok' ? (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:1, background:'var(--line)'}}>
          {blocks.map(b => (
            <div key={b.label} style={{background:'var(--bg-card)', padding:'16px 18px'}}>
              <div style={{fontFamily:'var(--display)', fontSize:22, fontWeight:700, color:b.color}}>{b.value}</div>
              <div style={{fontFamily:'var(--mono)', fontSize:10.5, color:'var(--ink-faint)', marginTop:4, textTransform:'uppercase'}}>{b.label}</div>
              {b.sub && <div style={{fontFamily:'var(--mono)', fontSize:10.5, color:'var(--ink-faint)', marginTop:2}}>{b.sub}</div>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{fontSize:13, color:'var(--ink-faint)'}}>
          {f.status === 'loading' ? 'Loading forecast\u2026'
            : !window.RACES[window.getCurrentRaceId()].startDate ? 'Set a race date on Overview to see a forecast.'
            : 'Race date outside the 15-16 day forecast window.'}
        </div>
      )}
    </section>
  );
}

function CourseProfileChart() {
  const [hovered, setHovered] = React.useState(null);
  const [focusedSegment, setFocusedSegment] = React.useState(null);
  const samples = React.useMemo(() => buildFullCourseSamples(), []);
  const stats = React.useMemo(() => computeElevationStats(samples), [samples]);

  // Reorderable whole-course/segment stat tiles (Gain/Loss/Max/Min/Max
  // Climb/Max Descent) -- same up/down reorder pattern as the Course &
  // Conditions stats above, so a person can put e.g. Gain directly above
  // Loss and Max directly above Min if that reads better to them.
  // Default order fills the grid column-major (assuming 3 columns, the
  // common case) so Gain sits directly above Loss and Max directly above
  // Min, rather than the row-major order that split those pairs diagonally.
  const courseProfileStatKeys = ['gain', 'max', 'maxClimb', 'loss', 'min', 'maxDescent'];
  const [showCourseProfileStatPanel, setShowCourseProfileStatPanel] = React.useState(false);
  const [courseProfileStatOrder, setCourseProfileStatOrder] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COURSE_PROFILE_STAT_ORDER_KEY));
      if (Array.isArray(saved) && saved.every(k => courseProfileStatKeys.includes(k)) &&
          courseProfileStatKeys.every(k => saved.includes(k))) {
        return saved;
      }
    } catch (e) {}
    return courseProfileStatKeys;
  });
  React.useEffect(() => {
    try { localStorage.setItem(COURSE_PROFILE_STAT_ORDER_KEY, JSON.stringify(courseProfileStatOrder)); } catch (e) {}
  }, [courseProfileStatOrder]);
  function moveCourseProfileStat(index, dir) {
    setCourseProfileStatOrder(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function resetCourseProfileStats() { setCourseProfileStatOrder(courseProfileStatKeys); }

  // aid station markers: start (green), 9 aid stations (orange), finish (red) --
  // positioned at each segment boundary using the real official mile markers
  const markers = React.useMemo(() => {
    const points = [];
    gradeSegments.forEach((seg, i) => {
      if (i === 0) {
        const first = samples.find(s => s.mile >= seg.miS) || samples[0];
        points.push({ mile: seg.miS, elev: first.elev, label: seg.from, type: 'start' });
      }
      const last = [...samples].reverse().find(s => s.mile <= seg.miE) || samples[samples.length - 1];
      points.push({ mile: seg.miE, elev: last.elev, label: seg.to.replace(/\s*\(Drop Bag #\d+\)/i, ''), type: i === gradeSegments.length - 1 ? 'finish' : 'aid' });
    });
    return points;
  }, [samples]);

  const w = 1000, h = 260, padL = 74, padB = 36, padT = 14, padR = 14;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const elevRange = stats.max - stats.min || 1;
  const maxMile = samples[samples.length - 1].mile;

  function xFor(mile) { return padL + (mile / maxMile) * plotW; }
  function yFor(elev) { return padT + plotH - ((elev - stats.min) / elevRange) * plotH; }
  function mileForX(svgX) { return Math.max(0, Math.min(maxMile, ((svgX - padL) / plotW) * maxMile)); }

  function selectMile(mile) {
    const seg = findSegmentForMile(mile);
    setFocusedSegment(seg); // null (e.g. clicking exactly at Finish) clears back to whole-course
  }

  function handlePlotClick(e) {
    const svg = e.currentTarget.ownerSVGElement || e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * w;
    selectMile(mileForX(clickX));
  }

  const linePts = samples.map(s => `${xFor(s.mile)},${yFor(s.elev)}`).join(' ');
  const areaPts = `${xFor(0)},${padT + plotH} ${linePts} ${xFor(maxMile)},${padT + plotH}`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(stats.min + t * elevRange));
  const xTickCount = 10;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => Math.round((maxMile / xTickCount) * i * 10) / 10);

  const segStats = focusedSegment ? computeSegmentElevationStats(focusedSegment, samples) : null;
  const displayStats = segStats || stats;
  const scopeLabel = focusedSegment ? `${focusedSegment.from} \u2192 ${focusedSegment.to.replace(/\s*\(Drop Bag #\d+\)/i, '')}` : 'Whole course';

  return (
    <section style={{padding:'32px 0', borderBottom:'1px solid var(--line)'}}>
      <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', marginBottom:16, letterSpacing:'0.08em', textTransform:'uppercase'}}>
        Full Course Profile
      </div>
      <div style={{background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:12, padding:'16px 12px 8px', overflowX:'auto'}}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{width:'100%', minWidth:640, height:'auto', display:'block'}}>
          {yTicks.map((v, i) => (
            <g key={i}>
              <line x1={padL} x2={w-padR} y1={yFor(v)} y2={yFor(v)} stroke="var(--line)" strokeWidth="1" />
              <text x={padL-8} y={yFor(v)+4} textAnchor="end" fontSize="10" fill="var(--ink-faint)" fontFamily="var(--mono)">{v.toLocaleString()}ft</text>
            </g>
          ))}
          {xTicks.map((v, i) => (
            <text key={i} x={xFor(v)} y={h-14} textAnchor="middle" fontSize="10" fill="var(--ink-faint)" fontFamily="var(--mono)">{v}mi</text>
          ))}

          {/* highlight the focused segment's mile range on the plot */}
          {focusedSegment && (
            <rect x={xFor(focusedSegment.miS)} y={padT} width={xFor(focusedSegment.miE) - xFor(focusedSegment.miS)} height={plotH}
              fill="var(--climb)" opacity="0.08" />
          )}

          {/* invisible full-plot hit area so clicking anywhere on the line/area selects that mile's segment */}
          <rect x={padL} y={padT} width={plotW} height={plotH} fill="transparent" style={{cursor:'pointer'}} onClick={handlePlotClick} />

          <polygon points={areaPts} fill="var(--climb)" opacity="0.14" style={{pointerEvents:'none'}} />
          <polyline points={linePts} fill="none" stroke="var(--climb)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" style={{pointerEvents:'none'}} />

          {markers.map((m, i) => (
            <g key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={(e) => { e.stopPropagation(); selectMile(m.mile); }}
              style={{cursor: m.type === 'finish' ? 'default' : 'pointer'}}
            >
              {/* invisible larger hit-target -- the visible marker (r=6-10) is far
                  too small to reliably tap on a phone once the 1000-unit viewBox
                  is scaled down to actual screen width */}
              <circle cx={xFor(m.mile)} cy={yFor(m.elev)} r={22} fill="transparent" />
              <circle cx={xFor(m.mile)} cy={yFor(m.elev)}
                r={hovered===i ? 8 : 6}
                fill={m.type==='start' ? '#3CB897' : m.type==='finish' ? '#C0392B' : 'var(--climb)'}
                stroke="var(--bg-card)" strokeWidth={2} />
            </g>
          ))}
        </svg>
      </div>

      {hovered !== null && markers[hovered] && (() => {
        const m = markers[hovered];
        return (
          <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--line)', borderRadius:10, padding:'12px 16px', marginTop:10 }}>
            <div style={{fontFamily:'var(--display)', fontWeight:600, fontSize:15, color:'var(--ink)', marginBottom:4}}>{m.label}</div>
            <div style={{display:'flex', gap:16, flexWrap:'wrap', fontSize:13}}>
              <span style={{color:'var(--ink-faint)'}}>Mile {m.mile}</span>
              <span style={{color:'var(--climb)'}}>{m.elev.toLocaleString()} ft</span>
              <span style={{
                color: m.type==='start' ? '#3CB897' : m.type==='finish' ? '#C0392B' : 'var(--ink-faint)',
                fontFamily:'var(--mono)', fontSize:11, textTransform:'uppercase',
              }}>{m.type}</span>
            </div>
          </div>
        );
      })()}

      <div style={{display:'flex', alignItems:'center', gap:8, marginTop:14, marginBottom:4}}>
        <div style={{fontFamily:'var(--display)', fontWeight:600, fontSize:14, color: focusedSegment ? 'var(--climb)' : 'var(--ink-faint)', flex:1}}>
          {scopeLabel}
        </div>
        {focusedSegment && (
          <button onClick={() => setFocusedSegment(null)} style={{
            background:'none', border:'none', color:'var(--ink-faint)', cursor:'pointer', fontSize:11, fontFamily:'var(--mono)',
          }}>&#10005; whole course</button>
        )}
        <button onClick={() => setShowCourseProfileStatPanel(v => !v)} aria-label="Reorder stats" title="Reorder stats" style={{
          background:'none', border:'1px solid var(--line)', borderRadius:6, width:26, height:26,
          color: showCourseProfileStatPanel ? 'var(--climb)' : 'var(--ink-faint)', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:13,
        }}>⚙️</button>
      </div>

      {showCourseProfileStatPanel && (
        <div style={{background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:10, padding:12, marginBottom:12}}>
          {courseProfileStatOrder.map((key, i) => {
            const label = { gain: 'Gain', loss: 'Loss', max: 'Max', min: 'Min', maxClimb: 'Max Climb', maxDescent: 'Max Descent' }[key];
            return (
              <div key={key} style={{display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderTop: i>0 ? '1px solid var(--line)' : 'none'}}>
                <span style={{flex:1, fontSize:13, color:'var(--ink)'}}>{label}</span>
                <button disabled={i===0} onClick={() => moveCourseProfileStat(i, -1)} style={{
                  width:26, height:26, borderRadius:6, border:'1px solid var(--line)', background:'var(--bg-raised)',
                  color: i===0 ? 'var(--ink-faint)' : 'var(--ink)', cursor: i===0 ? 'not-allowed' : 'pointer', fontSize:12,
                }}>&uarr;</button>
                <button disabled={i===courseProfileStatOrder.length-1} onClick={() => moveCourseProfileStat(i, 1)} style={{
                  width:26, height:26, borderRadius:6, border:'1px solid var(--line)', background:'var(--bg-raised)',
                  color: i===courseProfileStatOrder.length-1 ? 'var(--ink-faint)' : 'var(--ink)', cursor: i===courseProfileStatOrder.length-1 ? 'not-allowed' : 'pointer', fontSize:12,
                }}>&darr;</button>
              </div>
            );
          })}
          <button onClick={resetCourseProfileStats} style={{
            marginTop:10, fontSize:11, fontFamily:'var(--mono)', color:'var(--ink-faint)', background:'none',
            border:'none', textDecoration:'underline', cursor:'pointer', padding:0,
          }}>Reset to default order</button>
        </div>
      )}

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(110px, 1fr))', gap:1, background:'var(--line)'}}>
        {courseProfileStatOrder.map(key => {
          const defs = {
            gain: ['GAIN', `+${displayStats.gain.toLocaleString()} ft`, '#3CB897'],
            loss: ['LOSS', `-${displayStats.loss.toLocaleString()} ft`, 'var(--descent)'],
            max: ['MAX', `${displayStats.max.toLocaleString()} ft`, 'var(--climb)'],
            min: ['MIN', `${displayStats.min.toLocaleString()} ft`, 'var(--ink)'],
            maxClimb: ['MAX CLIMB', `+${displayStats.maxClimbStreak.toLocaleString()} ft`, 'var(--ink)'],
            maxDescent: ['MAX DESCENT', `-${displayStats.maxDescentStreak.toLocaleString()} ft`, 'var(--ink)'],
          };
          const [label, value, color] = defs[key];
          return (
            <div key={label} style={{background:'var(--bg)', padding:'14px 12px'}}>
              <div style={{fontFamily:'var(--display)', fontSize:18, fontWeight:700, color}}>{value}</div>
              <div style={{fontFamily:'var(--mono)', fontSize:9.5, color:'var(--ink-faint)', marginTop:4, letterSpacing:'0.04em'}}>{label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PaceTargetsWidget() {
  const {
    targetHours, setTargetHours, targetCarb, setTargetCarb, targetSodium, setTargetSodium,
    targetWaterHr, setTargetWaterHr, vestCapacity, setVestCapacity, bladderCapacity, setBladderCapacity, beltCapacity, setBeltCapacity,
    vestEnabled, setVestEnabled, bladderEnabled, setBladderEnabled, beltEnabled, setBeltEnabled,
    handheldCapacity, setHandheldCapacity, handheldEnabled, setHandheldEnabled,
    vesselRanges, setVesselRanges,
    extraGear, setExtraGear,
  } = React.useContext(window.TargetHoursContext);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const raceSegments = window.RACES[window.getCurrentRaceId()].baseSegments;
  function setRangeFor(key) {
    return (next) => setVesselRanges(prev => ({ ...prev, [key]: next }));
  }
  function addGearItem() {
    setExtraGear(prev => [...prev, { id: Date.now(), name: '', pickupSegmentId: null, dropoffSegmentId: null, suggestType: 'none', tempThreshold: 40 }]);
  }
  function updateGearItem(id, patch) {
    setExtraGear(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  }
  function removeGearItem(id) {
    setExtraGear(prev => prev.filter(g => g.id !== id));
  }
  const gearSelectStyle = { background:'var(--bg-raised)', border:'1px solid var(--line)', borderRadius:6, color:'var(--ink)', fontSize:12, padding:'5px 6px' };
  return (
    <section style={{padding:'32px 0', borderBottom:'1px solid var(--line)'}}>
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
        <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', letterSpacing:'0.08em', textTransform:'uppercase', flex:1}}>
          Pace &amp; Nutrition Targets
        </div>
        <button onClick={() => setShowAdvanced(v => !v)} aria-label="Water and carrying setup" title="Water and carrying setup" style={{
          width:30, height:30, borderRadius:8, border:'1px solid var(--line)',
          background: showAdvanced ? 'var(--climb)' : 'var(--bg-raised)', color: showAdvanced ? '#12151A' : 'var(--ink-faint)', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
        }}>&#9881;&#65039;</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 40, rowGap: 16 }}>
        <TargetStepper label="Target finish time" value={targetHours} setValue={setTargetHours} min={1} max={window.RACES[window.getCurrentRaceId()].cutoffHours} step={0.5} unit="hr" note={`${window.RACES[window.getCurrentRaceId()].cutoffHours}hr official cutoff`} />
        <TargetStepper label="Target carb intake" value={targetCarb} setValue={setTargetCarb} min={50} max={120} step={5} unit="g/hr" />
        <TargetStepper label="Target salt intake" value={targetSodium} setValue={setTargetSodium} min={400} max={1200} step={50} unit="mg/hr" />
      </div>

      {showAdvanced && (
        <div style={{marginTop:24, paddingTop:20, borderTop:'1px solid var(--line)'}}>
          <div style={{fontSize:12, color:'var(--ink-faint)', marginBottom:16}}>
            Water intake and carrying setup &mdash; also feeds every segment's vessel plan (which flask/bladder holds what).
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 40, rowGap: 16, marginBottom: 20 }}>
            <TargetStepper label="Target water intake" value={targetWaterHr} setValue={setTargetWaterHr} min={200} max={1200} step={50} unit="ml/hr" />
          </div>
          <div style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase', marginBottom:6}}>Carrying setup</div>
          <div style={{fontSize:11.5, color:'var(--ink-faint)', marginBottom:14}}>Uncheck anything you're not carrying &mdash; not everyone runs with a full vest. If a race has more than one leg, set where you pick up or drop each piece.</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 40, rowGap: 16 }}>
            <VesselToggleStepper label="Vest flask (each)" enabled={vestEnabled} setEnabled={setVestEnabled} value={vestCapacity} setValue={setVestCapacity} min={150} max={750} step={50} unit="ml" note="you carry 2"
              segments={raceSegments} range={vesselRanges.vest} setRange={setRangeFor('vest')} />
            <VesselToggleStepper label="Bladder" enabled={bladderEnabled} setEnabled={setBladderEnabled} value={bladderCapacity} setValue={setBladderCapacity} min={500} max={3000} step={100} unit="ml"
              segments={raceSegments} range={vesselRanges.bladder} setRange={setRangeFor('bladder')} />
            <VesselToggleStepper label="Belt flask" enabled={beltEnabled} setEnabled={setBeltEnabled} value={beltCapacity} setValue={setBeltCapacity} min={100} max={1000} step={50} unit="ml"
              segments={raceSegments} range={vesselRanges.belt} setRange={setRangeFor('belt')} />
            <VesselToggleStepper label="Handheld" enabled={handheldEnabled} setEnabled={setHandheldEnabled} value={handheldCapacity} setValue={setHandheldCapacity} min={150} max={750} step={50} unit="ml"
              segments={raceSegments} range={vesselRanges.handheld} setRange={setRangeFor('handheld')} />
          </div>

          <div style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase', marginTop:24, marginBottom:6}}>Extra Gear</div>
          <div style={{fontSize:11.5, color:'var(--ink-faint)', marginBottom:14}}>
            Headlamp, shoe/clothing change, anything else picked up or dropped mid-race. "Dawn-dependent" and
            "Cold-dependent" flag the item on Pack List when the forecast actually calls for it.
          </div>
          {extraGear.map(g => (
            <div key={g.id} style={{background:'var(--bg-raised)', borderRadius:10, padding:'10px 14px', marginBottom:8}}>
              <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:8}}>
                <input value={g.name} onChange={e => updateGearItem(g.id, { name: e.target.value })} placeholder="Item name (e.g. Headlamp)" style={{...gearSelectStyle, flex:1, minWidth:140}} />
                <button onClick={() => removeGearItem(g.id)} aria-label="Remove gear item" style={{
                  width:26, height:26, borderRadius:6, border:'1px solid var(--line)', background:'var(--bg-card)',
                  color:'var(--ink-faint)', cursor:'pointer', fontSize:13,
                }}>&#10005;</button>
              </div>
              <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:8, fontSize:12, color:'var(--ink-dim)'}}>
                <span>Pickup:</span>
                <select value={g.pickupSegmentId ?? ''} onChange={e => updateGearItem(g.id, { pickupSegmentId: e.target.value === '' ? null : Number(e.target.value) })} style={gearSelectStyle}>
                  <option value="">Start</option>
                  {raceSegments.slice(0, -1).map(s => <option key={s.id} value={s.id + 1}>At {s.to}</option>)}
                </select>
                <span>Drop:</span>
                <select value={g.dropoffSegmentId ?? ''} onChange={e => updateGearItem(g.id, { dropoffSegmentId: e.target.value === '' ? null : Number(e.target.value) })} style={gearSelectStyle}>
                  {raceSegments.map(s => <option key={s.id} value={s.id}>At {s.to}</option>)}
                  <option value="">Finish</option>
                </select>
              </div>
              <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', fontSize:12, color:'var(--ink-dim)'}}>
                <span>Suggest when:</span>
                <select value={g.suggestType} onChange={e => updateGearItem(g.id, { suggestType: e.target.value })} style={gearSelectStyle}>
                  <option value="none">Always (no forecast check)</option>
                  <option value="dawn">Start is before sunrise</option>
                  <option value="cold">Forecast at pickup is below&hellip;</option>
                </select>
                {g.suggestType === 'cold' && (
                  <>
                    <input type="number" value={g.tempThreshold} onChange={e => updateGearItem(g.id, { tempThreshold: parseInt(e.target.value) || 0 })} style={{...gearSelectStyle, width:56}} />
                    <span>&deg;F</span>
                  </>
                )}
              </div>
            </div>
          ))}
          <button onClick={addGearItem} style={{
            padding:'8px 14px', borderRadius:8, border:'1px dashed var(--line)', background:'none',
            color:'var(--climb)', fontSize:12.5, fontWeight:600, cursor:'pointer',
          }}>+ Add gear item</button>
        </div>
      )}
    </section>
  );
}

function DropBagConfigWidget({ onRaceDataChanged }) {
  const race = window.RACES[window.getCurrentRaceId()];
  const segments = race.baseSegments;
  const [rows, setRows] = React.useState(() => segments.map(s => ({
    dropBag: !!(s.amenities && s.amenities.dropBag),
    crew: !!(s.amenities && s.amenities.crew),
    pacer: !!s.pacer,
  })));
  const [saved, setSaved] = React.useState(false);

  const hasAny = rows.some(r => r.dropBag || r.crew || r.pacer);

  function toggle(i, field) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: !r[field] } : r));
    setSaved(false);
  }

  function handleSave() {
    segments.forEach((s, i) => {
      s.amenities = { ...s.amenities, dropBag: rows[i].dropBag, crew: rows[i].crew };
      s.pacer = rows[i].pacer;
    });
    if (window.getCurrentRaceId() !== 'tmr') window.saveCustomRace(race);
    setSaved(true);
    if (onRaceDataChanged) onRaceDataChanged();
  }

  return (
    <section style={{padding:'32px 0', borderBottom:'1px solid var(--line)'}}>
      <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', marginBottom:10, letterSpacing:'0.08em', textTransform:'uppercase'}}>
        Aid Station Access (Drop Bag / Crew / Pacer)
      </div>
      {!hasAny && (
        <div style={{background:'var(--bg-raised)', border:'1px solid var(--climb)66', borderRadius:10, padding:'12px 14px', marginBottom:14, fontSize:12.5, color:'var(--ink-dim)'}}>
          Nothing marked yet &mdash; a GPX file can't tell us where drop bags, crew, or pacers are allowed. Check the boxes below for each aid station that applies.
        </div>
      )}
      <div style={{marginBottom:14}}>
        {segments.map((s, i) => (
          <div key={s.id} style={{display:'flex', alignItems:'center', flexWrap:'wrap', gap:14, padding:'8px 0', borderBottom:'1px solid var(--line)'}}>
            <span style={{fontSize:13, color:'var(--ink)', minWidth:140, flex:1}}>
              {s.to} <span style={{color:'var(--ink-faint)', fontFamily:'var(--mono)', fontSize:11}}>(mi {s.miE})</span>
            </span>
            <label style={{display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--ink-dim)', cursor:'pointer'}}>
              <input type="checkbox" checked={rows[i].dropBag} onChange={() => toggle(i, 'dropBag')} /> Drop bag
            </label>
            <label style={{display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--ink-dim)', cursor:'pointer'}}>
              <input type="checkbox" checked={rows[i].crew} onChange={() => toggle(i, 'crew')} /> Crew
            </label>
            <label style={{display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--ink-dim)', cursor:'pointer'}}>
              <input type="checkbox" checked={rows[i].pacer} onChange={() => toggle(i, 'pacer')} /> Pacer
            </label>
          </div>
        ))}
      </div>
      <button onClick={handleSave} style={{
        padding:'9px 16px', borderRadius:8, border:'none', background:'var(--climb)', color:'#12151A',
        fontWeight:600, fontSize:13, cursor:'pointer',
      }}>{saved ? 'Saved \u2713' : 'Save aid station access'}</button>
    </section>
  );
}

function RaceInfoImportWidget({ onRaceDataChanged }) {
  const [pastedText, setPastedText] = React.useState('');
  const [parsed, setParsed] = React.useState(null);
  const [stationRows, setStationRows] = React.useState([]); // editable copies of detected stations
  const [dateApplied, setDateApplied] = React.useState(false);
  const [stationsMessage, setStationsMessage] = React.useState('');

  const race = window.RACES[window.getCurrentRaceId()];
  const segments = race.baseSegments;

  // Direct date/time inputs -- the paste-and-extract flow below is useful
  // for bulk aid-station info, but someone who just wants to set the date
  // and start time shouldn't have to paste anything to do it.
  // Parsed directly from the string as literal text, not through a Date
  // object -- new Date(race.startDate) converts to the VIEWER's browser
  // timezone, which would show a different hour than what's actually
  // stored whenever the string has an explicit offset (like TMR's -06:00)
  // and the viewer isn't in that same timezone.
  const startDateMatch = race.startDate ? race.startDate.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/) : null;
  const [manualDate, setManualDate] = React.useState(startDateMatch ? startDateMatch[1] : '');
  const [manualTime, setManualTime] = React.useState(startDateMatch ? startDateMatch[2] : '06:00');
  const [manualCutoff, setManualCutoff] = React.useState(race.cutoffHours || '');
  const [manualResultsUrl, setManualResultsUrl] = React.useState(race.resultsUrl || '');
  const [manualDateSaved, setManualDateSaved] = React.useState(false);

  function handleSaveManualDate() {
    if (!manualDate) return;
    race.startDate = `${manualDate}T${manualTime}:00`;
    if (manualCutoff) race.cutoffHours = Number(manualCutoff);
    race.resultsUrl = manualResultsUrl.trim() || null;
    if (window.getCurrentRaceId() !== 'tmr') window.saveCustomRace(race);
    setManualDateSaved(true);
    setPendingRefresh(true);
  }

  function handleExtract() {
    if (!pastedText.trim()) return;
    const result = window.parseRaceInfoText(pastedText);
    setParsed(result);
    setDateApplied(false);
    setStationsMessage('');

    const rows = result.aidStations.map(s => {
      // auto-match by closest mile within half a mile -- anything further
      // is left unmatched rather than guessing, since a wrong match would
      // silently overwrite the wrong segment's cutoff
      let bestId = '', bestDist = 0.5;
      segments.forEach(seg => {
        const d = Math.abs(seg.miE - s.mile);
        if (d < bestDist) { bestDist = d; bestId = String(seg.id); }
      });
      return {
        key: s.lineNumber,
        rawLine: s.rawLine,
        name: s.name || '',
        mile: s.mile,
        cutoffHH: s.cutoffHH,
        cutoffMM: s.cutoffMM,
        dropBag: s.dropBag,
        crew: s.crew,
        pacer: s.pacer,
        matchedSegmentId: bestId,
      };
    });
    setStationRows(rows);
  }

  function updateRow(key, patch) {
    setStationRows(rows => rows.map(r => r.key === key ? { ...r, ...patch } : r));
  }

  const [pendingRefresh, setPendingRefresh] = React.useState(false);

  function handleApplyDate() {
    if (!parsed || !parsed.date) return;
    const hh = parsed.startTime ? parsed.startTime.hh : 6;
    const mm = parsed.startTime ? parsed.startTime.mm : 0;
    race.startDate = `${parsed.date.iso}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`;
    if (window.getCurrentRaceId() !== 'tmr') window.saveCustomRace(race);
    setDateApplied(true);
    setPendingRefresh(true);
    // deliberately NOT calling onRaceDataChanged() here -- that remounts the
    // whole page (needed so Race Day Plan etc. pick up the new date), which
    // would also wipe out any station-matching review still in progress in
    // this same widget. Applying stations below can still happen first;
    // the explicit "Refresh dashboard" button triggers the remount once,
    // when the person is actually done with both.
  }

  function handleApplyStations() {
    let count = 0;
    stationRows.forEach(row => {
      if (!row.matchedSegmentId) return;
      const seg = segments.find(s => String(s.id) === row.matchedSegmentId);
      if (!seg) return;
      if (row.cutoffHH !== null && row.cutoffHH !== undefined && row.cutoffHH !== '') {
        const hh = Number(row.cutoffHH), mm = Number(row.cutoffMM) || 0;
        const h12 = hh % 12 === 0 ? 12 : hh % 12;
        const period = hh < 12 ? 'am' : 'pm';
        seg.cutoffClock = `${h12}:${String(mm).padStart(2,'0')}${period}`;
      }
      seg.amenities = { ...seg.amenities, dropBag: !!row.dropBag, crew: !!row.crew };
      seg.pacer = !!row.pacer;
      count++;
    });
    if (window.getCurrentRaceId() !== 'tmr') window.saveCustomRace(race);
    setStationsMessage(`Applied to ${count} segment${count === 1 ? '' : 's'}.`);
    setPendingRefresh(true);
  }

  const inputStyle = {
    background:'var(--bg-raised)', border:'1px solid var(--line)', borderRadius:6,
    color:'var(--ink)', fontSize:12.5, padding:'4px 6px', fontFamily:'var(--body)',
  };

  return (
    <section style={{padding:'32px 0', borderBottom:'1px solid var(--line)'}}>
      <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', marginBottom:10, letterSpacing:'0.08em', textTransform:'uppercase'}}>
        Race Date, Time &amp; Cutoff
      </div>
      <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:14}}>
        <input type="date" value={manualDate} onChange={e => { setManualDate(e.target.value); setManualDateSaved(false); }} style={{
          background:'var(--bg-raised)', border:'1px solid var(--line)', borderRadius:8, color:'var(--ink)',
          fontSize:13, padding:'8px 10px', fontFamily:'var(--body)',
        }} />
        <input type="time" value={manualTime} onChange={e => { setManualTime(e.target.value); setManualDateSaved(false); }} style={{
          background:'var(--bg-raised)', border:'1px solid var(--line)', borderRadius:8, color:'var(--ink)',
          fontSize:13, padding:'8px 10px', fontFamily:'var(--body)',
        }} />
        <input type="number" min="0" step="0.5" value={manualCutoff} onChange={e => { setManualCutoff(e.target.value); setManualDateSaved(false); }} placeholder="Cutoff" style={{
          background:'var(--bg-raised)', border:'1px solid var(--line)', borderRadius:8, color:'var(--ink)',
          fontSize:13, padding:'8px 10px', fontFamily:'var(--body)', width:80,
        }} />
        <span style={{fontSize:12, color:'var(--ink-faint)'}}>hours</span>
      </div>
      <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:14}}>
        <input type="url" value={manualResultsUrl} onChange={e => { setManualResultsUrl(e.target.value); setManualDateSaved(false); }} placeholder="Results page URL (shown once the race date has passed)" style={{
          background:'var(--bg-raised)', border:'1px solid var(--line)', borderRadius:8, color:'var(--ink)',
          fontSize:13, padding:'8px 10px', fontFamily:'var(--body)', flex:1, minWidth:260,
        }} />
      </div>
      <button onClick={handleSaveManualDate} disabled={!manualDate} style={{
        padding:'8px 16px', borderRadius:8, border:'none',
        background: manualDate ? 'var(--climb)' : 'var(--bg-raised)',
        color: manualDate ? '#12151A' : 'var(--ink-faint)',
        fontWeight:600, fontSize:13, cursor: manualDate ? 'pointer' : 'not-allowed', marginBottom:28,
      }}>{manualDateSaved ? 'Saved \u2713' : 'Save'}</button>

      <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', marginBottom:10, letterSpacing:'0.08em', textTransform:'uppercase'}}>
        Import Race Info
      </div>
      <div style={{fontSize:12, color:'var(--ink-faint)', marginBottom:14, lineHeight:1.5}}>
        Paste text copied from the race's official website (aid station tables, start info, rules). This is best-effort
        pattern matching, not guaranteed &mdash; review everything below before applying, nothing is saved automatically.
      </div>
      <textarea
        value={pastedText} onChange={e => setPastedText(e.target.value)}
        placeholder="Paste race website text here&hellip;"
        style={{ width:'100%', minHeight:120, background:'var(--bg-raised)', border:'1px solid var(--line)', borderRadius:8,
          color:'var(--ink)', fontSize:13, padding:10, fontFamily:'var(--body)', resize:'vertical' }}
      />
      <button onClick={handleExtract} disabled={!pastedText.trim()} style={{
        marginTop:10, padding:'9px 16px', borderRadius:8, border:'none',
        background: pastedText.trim() ? 'var(--climb)' : 'var(--bg-raised)',
        color: pastedText.trim() ? '#12151A' : 'var(--ink-faint)',
        fontWeight:600, fontSize:13, cursor: pastedText.trim() ? 'pointer' : 'not-allowed',
      }}>Extract</button>

      {parsed && (
        <div style={{marginTop:20}}>
          {/* Date + start time */}
          <div style={{background:'var(--bg-raised)', borderRadius:10, padding:'12px 14px', marginBottom:16}}>
            <div style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase', marginBottom:6}}>Race date &amp; start time</div>
            {parsed.date ? (
              <div style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
                <span style={{fontSize:13, color:'var(--ink)'}}>
                  Found: <strong>{parsed.date.matchedText}</strong>
                  {parsed.startTime && <> at <strong>{parsed.startTime.matchedText}</strong></>}
                </span>
                <button onClick={handleApplyDate} style={{
                  padding:'6px 12px', borderRadius:6, border:'1px solid var(--climb)',
                  background: dateApplied ? 'var(--climb)' : 'transparent', color: dateApplied ? '#12151A' : 'var(--climb)',
                  fontSize:12, fontWeight:600, cursor:'pointer',
                }}>{dateApplied ? 'Applied \u2713' : 'Apply to this race'}</button>
              </div>
            ) : (
              <span style={{fontSize:13, color:'var(--ink-faint)'}}>No date found in the pasted text.</span>
            )}
          </div>

          {/* Aid stations */}
          <div style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase', marginBottom:8}}>
            Detected aid station mentions ({stationRows.length})
          </div>
          {stationRows.length === 0 && <div style={{fontSize:13, color:'var(--ink-faint)', marginBottom:12}}>No mile-marker mentions found in the pasted text.</div>}
          {stationRows.map(row => (
            <div key={row.key} style={{background:'var(--bg-raised)', borderRadius:10, padding:'10px 14px', marginBottom:8}}>
              <div style={{fontSize:10.5, color:'var(--ink-faint)', marginBottom:6, fontFamily:'var(--mono)'}} title={row.rawLine}>
                &ldquo;{row.rawLine.length > 70 ? row.rawLine.slice(0, 70) + '\u2026' : row.rawLine}&rdquo;
              </div>
              <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:8}}>
                <input value={row.name} onChange={e => updateRow(row.key, { name: e.target.value })} placeholder="Name" style={{...inputStyle, width:130}} />
                <span style={{fontSize:11, color:'var(--ink-faint)'}}>mi</span>
                <input type="number" value={row.mile} onChange={e => updateRow(row.key, { mile: parseFloat(e.target.value) })} style={{...inputStyle, width:60}} />
                <span style={{fontSize:11, color:'var(--ink-faint)'}}>cutoff</span>
                <input type="number" min="0" max="23" value={row.cutoffHH ?? ''} onChange={e => updateRow(row.key, { cutoffHH: e.target.value === '' ? null : parseInt(e.target.value) })} placeholder="HH" style={{...inputStyle, width:44}} />
                <span>:</span>
                <input type="number" min="0" max="59" value={row.cutoffMM ?? ''} onChange={e => updateRow(row.key, { cutoffMM: e.target.value === '' ? null : parseInt(e.target.value) })} placeholder="MM" style={{...inputStyle, width:44}} />
                <span style={{fontSize:10, color:'var(--ink-faint)'}}>(24hr)</span>
              </div>
              <div style={{display:'flex', gap:14, flexWrap:'wrap', alignItems:'center', marginBottom:8, fontSize:12, color:'var(--ink-dim)'}}>
                <label style={{display:'flex', alignItems:'center', gap:5, cursor:'pointer'}}>
                  <input type="checkbox" checked={row.dropBag} onChange={e => updateRow(row.key, { dropBag: e.target.checked })} /> Drop bag
                </label>
                <label style={{display:'flex', alignItems:'center', gap:5, cursor:'pointer'}}>
                  <input type="checkbox" checked={row.crew} onChange={e => updateRow(row.key, { crew: e.target.checked })} /> Crew
                </label>
                <label style={{display:'flex', alignItems:'center', gap:5, cursor:'pointer'}}>
                  <input type="checkbox" checked={row.pacer} onChange={e => updateRow(row.key, { pacer: e.target.checked })} /> Pacer
                </label>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <span style={{fontSize:11, color:'var(--ink-faint)'}}>Matches:</span>
                <select value={row.matchedSegmentId} onChange={e => updateRow(row.key, { matchedSegmentId: e.target.value })} style={{...inputStyle, flex:1}}>
                  <option value="">Don't apply this one</option>
                  {segments.map(seg => <option key={seg.id} value={seg.id}>{seg.from} &rarr; {seg.to} (mi {seg.miE})</option>)}
                </select>
              </div>
            </div>
          ))}
          {stationRows.length > 0 && (
            <div style={{display:'flex', alignItems:'center', gap:12, marginTop:8}}>
              <button onClick={handleApplyStations} style={{
                padding:'9px 16px', borderRadius:8, border:'none', background:'var(--climb)', color:'#12151A',
                fontWeight:600, fontSize:13, cursor:'pointer',
              }}>Apply matched stations</button>
              {stationsMessage && <span style={{fontSize:12, color:'var(--climb)'}}>{stationsMessage}</span>}
            </div>
          )}
        </div>
      )}

      {pendingRefresh && (
        <div style={{marginTop:16, padding:'12px 14px', background:'var(--climb)15', border:'1px solid var(--climb)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap'}}>
          <span style={{fontSize:12.5, color:'var(--ink)'}}>Changes applied. Refresh to see them reflected across the whole dashboard.</span>
          <button onClick={() => { if (onRaceDataChanged) onRaceDataChanged(); }} style={{
            padding:'7px 14px', borderRadius:8, border:'none', background:'var(--climb)', color:'#12151A',
            fontWeight:600, fontSize:12.5, cursor:'pointer', whiteSpace:'nowrap',
          }}>Refresh dashboard</button>
        </div>
      )}
    </section>
  );
}

function Overview({ goTo, externalCardPanelOpen, onCardPanelToggle, onRaceDataChanged }) {
  // Race starts 6:00am Saturday Aug 22, 2026, Mountain Time (MDT, UTC-6 in August)
  const activeRace = window.RACES[window.getCurrentRaceId()];
  const countdown = useCountdown(activeRace.startDate);
  const weather = useLiveWeather();

  const courseSamples = React.useMemo(() => buildFullCourseSamples(), [activeRace]);
  const courseStats = React.useMemo(() => computeElevationStats(courseSamples), [courseSamples]);
  const dropBagSegs = baseSegments.filter(s => /Drop Bag #/i.test(s.to));
  const avgAltitude = Math.round(courseSamples.reduce((a, s) => a + s.elev, 0) / courseSamples.length);

  const staticStats = [
    { key: 'distance', label: 'Distance', value: activeRace.distance.toFixed(1), unit: 'mi' },
    { key: 'vert', label: 'Vert gain', value: activeRace.vertGain.toLocaleString(), unit: 'ft' },
    { key: 'aid', label: 'Aid stations', value: `${baseSegments.length - 1}`, unit: '' },
    { key: 'bags', label: 'Drop bags', value: `${dropBagSegs.length}`, unit: '', sub: dropBagSegs.length ? `Mi ${dropBagSegs.map(s => s.miE).join(', ')}` : undefined },
    { key: 'range', label: 'Elevation range', value: `${courseStats.min.toLocaleString()}\u2013${courseStats.max.toLocaleString()}`, unit: 'ft' },
    { key: 'avgalt', label: 'Avg altitude', value: avgAltitude.toLocaleString(), unit: 'ft' },
    { key: 'cutoff', label: 'Cutoff', value: `${activeRace.cutoffHours}`, unit: 'hr' },
  ];

  const weatherStats = React.useMemo(() => {
    if (weather.status === 'ok') {
      const aq = aqiLabel(weather.aqi);
      return [
        { key: 'temp', label: 'Live temp (start line)', value: `${weather.temp}`, unit: '°F', sub: `${weather.humidity}% humidity`, isWeather: true },
        { key: 'conditions', label: 'Live conditions', value: weather.condition, unit: '', sub: `${weather.wind}mph wind`, isWeather: true },
        { key: 'aqi', label: 'Air quality (AQI)', value: `${weather.aqi}`, unit: '', sub: aq.label, subColor: aq.color, isWeather: true },
      ];
    }
    if (weather.status === 'error') {
      return [
        { key: 'temp', label: 'Live temp (start line)', value: '—', unit: '', sub: 'unavailable', isWeather: true },
        { key: 'conditions', label: 'Live conditions', value: '—', unit: '', sub: 'unavailable', isWeather: true },
        { key: 'aqi', label: 'Air quality (AQI)', value: '—', unit: '', sub: 'unavailable', isWeather: true },
      ];
    }
    return [
      { key: 'temp', label: 'Live temp (start line)', value: '···', unit: '', isWeather: true },
      { key: 'conditions', label: 'Live conditions', value: '···', unit: '', isWeather: true },
      { key: 'aqi', label: 'Air quality (AQI)', value: '···', unit: '', isWeather: true },
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

  const [statVisible, setStatVisible] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STAT_VISIBILITY_KEY));
      if (saved && typeof saved === 'object') return saved;
    } catch (e) {}
    return {};
  });
  React.useEffect(() => {
    try { localStorage.setItem(STAT_VISIBILITY_KEY, JSON.stringify(statVisible)); } catch (e) {}
  }, [statVisible]);
  function isVisible(key) { return statVisible[key] !== false; }
  function toggleVisible(key) {
    setStatVisible(prev => ({ ...prev, [key]: prev[key] === false ? true : false }));
  }

  function moveStat(index, dir) {
    setStatOrder(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function resetStats() { setStatOrder(defaultOrder); setStatVisible({}); }

  const CARD_ORDER_KEY = 'tmr_overview_card_order_v2';
  const CARD_STATE_KEY = 'tmr_overview_card_state_v1';
  const CUSTOM_CARDS_KEY = 'tmr_overview_custom_cards_v1';
  const builtinCards = [
    { id: 'packlist', n: '01', t: 'Pack List', d: 'What to portion into popsicle bags and drop bags before Saturday \u2014 gels, tailwind, salt caps, by pickup point.' },
    { id: 'raceplan', n: '02', t: 'Race Day Plan', d: 'Segment-by-segment pace, fuel, gear, and drop bag logistics for all 10 legs.' },
    { id: 'grade', n: '03', t: 'Grade Profile', d: 'Every 0.1-mile grade reading across the full course, aid station by aid station.' },
    { id: 'segments', n: '04', t: 'Segments', d: 'Step through each leg with elevation chart, cutoff margin, aid station info, and fuel timing.' },
    { id: 'gradeExplorer', n: '05', t: 'Grade Explorer', d: 'Every 0.1-mile sample across the full course \u2014 view in course order or sorted by grade.' },
    { id: 'treadmill', n: '06', t: 'Treadmill Legs', d: 'Indoor replication sessions matched to real course grade and duration.' },
    { id: 'vertcalc', n: '07', t: 'Vert Calculator', d: 'Grade, speed, and time-to-target vertical gain calculator.' },
    { id: 'history', n: '08', t: 'Race History', d: 'Completed races leading into TMR \u2014 Dead Horse, Desert RATS, Colfax.' },
    { id: 'comparison', n: '09', t: 'Race Comparison', d: 'How training runs and past races stack up against TMR\u2019s demands.' },
    { id: 'hillreps', n: '10', t: 'Hill Reps', d: 'Local hill session analysis and grade-matched training terrain.' },
  ];
  const cardDefaultOrder = builtinCards.map(c => c.id);

  const [showCardPanel, setShowCardPanel] = React.useState(false);
  const cardSectionRef = React.useRef(null);

  // Page-level section reorder -- the main nav gear (top-right of the whole
  // app, not the local per-section gears) controls this: lets you reorder
  // the four big Overview blocks themselves (Countdown, Conditions, Course
  // Profile, Race Insights), separate from reordering/hiding the individual
  // cards inside Race Insights or the individual stats inside Conditions.
  const PAGE_SECTIONS = [
    { id: 'countdown', label: 'Countdown' },
    { id: 'conditions', label: 'Conditions' },
    { id: 'courseProfile', label: 'Course Profile' },
    { id: 'raceInsights', label: 'Race Insights' },
  ];
  const PAGE_SECTION_ORDER_KEY = 'tmr_overview_page_section_order_v1';
  const pageSectionDefaultOrder = PAGE_SECTIONS.map(s => s.id);
  const [pageSectionOrder, setPageSectionOrder] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PAGE_SECTION_ORDER_KEY));
      if (Array.isArray(saved) && saved.length === pageSectionDefaultOrder.length &&
          saved.every(id => pageSectionDefaultOrder.includes(id))) {
        return saved;
      }
    } catch (e) {}
    return pageSectionDefaultOrder;
  });
  React.useEffect(() => {
    try { localStorage.setItem(PAGE_SECTION_ORDER_KEY, JSON.stringify(pageSectionOrder)); } catch (e) {}
  }, [pageSectionOrder]);
  function movePageSection(index, dir) {
    setPageSectionOrder(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const [showPageLayoutPanel, setShowPageLayoutPanel] = React.useState(false);
  React.useEffect(() => {
    if (externalCardPanelOpen !== undefined) setShowPageLayoutPanel(externalCardPanelOpen);
  }, [externalCardPanelOpen]);

  // Race Config (Drop Bag Locations, Race Date/Time/Cutoff, Import Race Info) --
  // tucked behind its own gear toggle instead of always showing inline, since
  // it's one-time setup rather than something checked on every visit.
  const [showRaceConfigPanel, setShowRaceConfigPanel] = React.useState(false);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingCardId, setEditingCardId] = React.useState(null);
  const [newCardTitle, setNewCardTitle] = React.useState('');
  const [newCardDesc, setNewCardDesc] = React.useState('');
  const [newCardUrl, setNewCardUrl] = React.useState('');

  const [customCards, setCustomCards] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOM_CARDS_KEY));
      if (Array.isArray(saved)) return saved;
    } catch (e) {}
    return [];
  });
  React.useEffect(() => {
    try { localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(customCards)); } catch (e) {}
  }, [customCards]);

  const cards = [...builtinCards, ...customCards.map(c => ({ ...c, isCustom: true }))];

  const [cardOrder, setCardOrder] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CARD_ORDER_KEY));
      if (Array.isArray(saved)) return saved;
    } catch (e) {}
    return cardDefaultOrder;
  });
  // reconcile order with whatever cards actually exist right now (new custom
  // cards appended at the end, removed/renamed ones dropped) without
  // clobbering the user's saved arrangement of everything else
  React.useEffect(() => {
    const allIds = cards.map(c => c.id);
    setCardOrder(prev => {
      const kept = prev.filter(id => allIds.includes(id));
      const missing = allIds.filter(id => !kept.includes(id));
      const next = [...kept, ...missing];
      return next.length === prev.length && next.every((id, i) => id === prev[i]) ? prev : next;
    });
  }, [customCards.length]);
  React.useEffect(() => {
    try { localStorage.setItem(CARD_ORDER_KEY, JSON.stringify(cardOrder)); } catch (e) {}
  }, [cardOrder]);

  const [cardState, setCardState] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CARD_STATE_KEY));
      if (saved && typeof saved === 'object') return saved;
    } catch (e) {}
    return {};
  });
  React.useEffect(() => {
    try { localStorage.setItem(CARD_STATE_KEY, JSON.stringify(cardState)); } catch (e) {}
  }, [cardState]);
  function getCardState(id) { return cardState[id] || 'shown'; }
  function cycleCardState(id) {
    setCardState(prev => {
      const cur = prev[id] || 'shown';
      const next = cur === 'shown' ? 'minimized' : cur === 'minimized' ? 'hidden' : 'shown';
      return { ...prev, [id]: next };
    });
  }
  function moveCard(index, dir) {
    setCardOrder(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function resetCards() { setCardOrder([...cardDefaultOrder, ...customCards.map(c => c.id)]); setCardState({}); }
  function removeCustomCard(id) {
    setCustomCards(prev => prev.filter(c => c.id !== id));
    setCardOrder(prev => prev.filter(x => x !== id));
  }
  function saveCustomCard() {
    if (!newCardTitle.trim() || !newCardUrl.trim()) return;
    let url = newCardUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (editingCardId) {
      setCustomCards(prev => prev.map(c => c.id === editingCardId ? { ...c, t: newCardTitle.trim(), d: newCardDesc.trim(), url } : c));
    } else {
      const id = 'custom-' + Date.now();
      setCustomCards(prev => [...prev, { id, t: newCardTitle.trim(), d: newCardDesc.trim(), url }]);
    }
    setNewCardTitle(''); setNewCardDesc(''); setNewCardUrl('');
    setShowAddForm(false);
    setEditingCardId(null);
  }
  function startEditCustomCard(c) {
    setEditingCardId(c.id);
    setNewCardTitle(c.t); setNewCardDesc(c.d || ''); setNewCardUrl(c.url);
    setShowAddForm(true);
  }
  function cancelCardForm() {
    setShowAddForm(false); setEditingCardId(null);
    setNewCardTitle(''); setNewCardDesc(''); setNewCardUrl('');
  }

  const orderedCards = cardOrder.map(id => cards.find(c => c.id === id)).filter(Boolean).filter(c => getCardState(c.id) !== 'hidden');

  const orderedStats = statOrder.map(k => allStats.find(s => s.key === k)).filter(Boolean).filter(s => isVisible(s.key));

  return (
    <div>
      <section style={{padding:'20px 0 24px', borderBottom:'1px solid var(--line)'}}>
        <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--climb)', letterSpacing:'0.08em', marginBottom:10}}>
          {activeRace.name.toUpperCase()} &middot; {window.formatRaceStartLabel(activeRace).toUpperCase()}
        </div>
        <div style={{display:'flex', alignItems:'center', gap:16, flexWrap:'wrap'}}>
          <h1 style={{
            fontFamily:'var(--display)', fontWeight:700, fontSize:'clamp(18px, 2.6vw, 24px)',
            lineHeight:1.2, letterSpacing:'-0.01em', margin:0, whiteSpace:'nowrap',
          }}>
            <span style={{color:'var(--climb)'}}>{activeRace.distance.toFixed(1)}mi</span> &middot; <span style={{color:'var(--climb)'}}>{activeRace.vertGain.toLocaleString()}ft</span> of climbing &middot; one race day.
          </h1>
          <button onClick={()=>goTo('raceplan')} style={{
            background:'var(--climb)', color:'#12151A', border:'none', borderRadius:8,
            padding:'8px 16px', fontFamily:'var(--display)', fontWeight:600, fontSize:13,
            cursor:'pointer', whiteSpace:'nowrap',
          }}>
            Open race day plan &rarr;
          </button>
        </div>
      </section>

      {showPageLayoutPanel && (
        <div style={{background:'var(--bg-card)', border:'1px solid var(--climb)', borderRadius:10, padding:12, marginBottom:20}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <div style={{fontSize:12, color:'var(--ink-faint)'}}>Reorder the page sections below.</div>
            <button onClick={() => setShowPageLayoutPanel(false)} style={{
              background:'none', border:'none', color:'var(--ink-faint)', cursor:'pointer', fontSize:16, lineHeight:1,
            }}>&#10005;</button>
          </div>
          {pageSectionOrder.map((id, i) => {
            const s = PAGE_SECTIONS.find(x => x.id === id);
            return (
              <div key={id} style={{display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderTop: i>0 ? '1px solid var(--line)' : 'none'}}>
                <span style={{flex:1, fontSize:13, color:'var(--ink)'}}>{s.label}</span>
                <button disabled={i===0} onClick={() => movePageSection(i, -1)} style={{
                  width:26, height:26, borderRadius:6, border:'1px solid var(--line)', background:'var(--bg-raised)',
                  color: i===0 ? 'var(--ink-faint)' : 'var(--ink)', cursor: i===0 ? 'not-allowed' : 'pointer', fontSize:12,
                }}>&uarr;</button>
                <button disabled={i===pageSectionOrder.length-1} onClick={() => movePageSection(i, 1)} style={{
                  width:26, height:26, borderRadius:6, border:'1px solid var(--line)', background:'var(--bg-raised)',
                  color: i===pageSectionOrder.length-1 ? 'var(--ink-faint)' : 'var(--ink)', cursor: i===pageSectionOrder.length-1 ? 'not-allowed' : 'pointer', fontSize:12,
                }}>&darr;</button>
              </div>
            );
          })}
          <button onClick={() => setPageSectionOrder(pageSectionDefaultOrder)} style={{
            marginTop:10, fontSize:11, fontFamily:'var(--mono)', color:'var(--ink-faint)', background:'none',
            border:'none', textDecoration:'underline', cursor:'pointer', padding:0,
          }}>Reset to default order</button>
        </div>
      )}

      <div style={{display:'flex', flexDirection:'column'}}>

      <div style={{order: pageSectionOrder.indexOf('countdown')}}>
      {countdown ? (
        <section style={{padding:'32px 0', borderBottom:'1px solid var(--line)'}}>
          <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', marginBottom:16, letterSpacing:'0.08em', textTransform:'uppercase'}}>
            Countdown to Start
          </div>
          <div style={{display:'flex', gap:28, flexWrap:'wrap', marginBottom:0}}>
            {[['days','Days','var(--climb)'],['hours','Hours','var(--descent)'],['minutes','Min','var(--db)'],['seconds','Sec','var(--ok)']].map(([key,label,color]) => (
              <div key={key}>
                <div style={{fontFamily:'var(--display)', fontSize:32, fontWeight:700, color:color}}>
                  {String(countdown[key]).padStart(2,'0')}
                </div>
                <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)', textTransform:'uppercase', letterSpacing:'0.05em'}}>{label}</div>
              </div>
            ))}
          </div>
        </section>
      ) : activeRace.startDate && (
        <section style={{padding:'32px 0', borderBottom:'1px solid var(--line)'}}>
          <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', marginBottom:16, letterSpacing:'0.08em', textTransform:'uppercase'}}>
            Race Day Has Passed
          </div>
          <a
            href={activeRace.resultsUrl || `https://www.google.com/search?q=${encodeURIComponent(activeRace.name + ' results')}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display:'inline-block', padding:'12px 20px', borderRadius:10, background:'var(--climb)',
              color:'#12151A', fontWeight:600, fontSize:14, textDecoration:'none',
            }}
          >View results &rarr;</a>
        </section>
      )}
      </div>

      <div style={{order: pageSectionOrder.indexOf('conditions')}}>
      <section style={{padding:'40px 0', borderBottom:'1px solid var(--line)'}}>
        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
          <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', letterSpacing:'0.08em', textTransform:'uppercase', flex:1}}>
            Course &amp; Conditions
          </div>
          <button onClick={() => setShowStatPanel(v => !v)} aria-label="Configure stats" title="Configure stats" style={{
            background:'none', border:'1px solid var(--line)', borderRadius:6, width:28, height:28,
            color: showStatPanel ? 'var(--climb)' : 'var(--ink-faint)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
          }}>⚙️</button>
        </div>

        {showStatPanel && (
          <div style={{background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:10, padding:12, marginBottom:16}}>
            {statOrder.map((key, i) => {
              const s = allStats.find(x => x.key === key);
              const vis = isVisible(key);
              return (
                <div key={key} style={{display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderTop: i>0 ? '1px solid var(--line)' : 'none', opacity: vis ? 1 : 0.45}}>
                  <span style={{flex:1, fontSize:13, color:'var(--ink)'}}>{s.label}</span>
                  <button onClick={() => toggleVisible(key)} aria-label={vis ? 'Hide stat' : 'Show stat'} style={{
                    width:26, height:26, borderRadius:6, border:'1px solid var(--line)',
                    background: vis ? 'var(--climb)' : 'var(--bg-raised)',
                    color: vis ? '#12151A' : 'var(--ink-faint)', cursor:'pointer', fontSize:16, lineHeight:1,
                  }}>{vis ? '−' : '+'}</button>
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

        <div style={{display:'flex', flexWrap:'wrap', gap:1, background:'var(--line)'}}>
          {orderedStats.map((s, i) => {
            const prev = orderedStats[i - 1];
            const startsWeatherGroup = s.isWeather && (!prev || !prev.isWeather);
            return (
              <React.Fragment key={s.key}>
                {startsWeatherGroup && <div style={{flexBasis:'100%', height:0}} />}
                <div style={{background:'var(--bg)', padding:'20px 16px', flex:'1 1 140px', minWidth:140}}>
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
              </React.Fragment>
            );
          })}
        </div>
      </section>

      <RaceDayForecastWidget />
      </div>

      <div style={{order: pageSectionOrder.indexOf('courseProfile')}}>
      <CourseProfileChart />
      <PaceTargetsWidget />

      <section style={{padding: showRaceConfigPanel ? '20px 0 0' : '20px 0', borderBottom: showRaceConfigPanel ? 'none' : '1px solid var(--line)'}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', letterSpacing:'0.08em', textTransform:'uppercase', flex:1}}>
            Race Config
          </div>
          <button onClick={() => setShowRaceConfigPanel(v => !v)} aria-label="Race config" title="Drop bag locations, race date/time/cutoff, import race info" style={{
            background:'none', border:'1px solid var(--line)', borderRadius:6, width:28, height:28,
            color: showRaceConfigPanel ? 'var(--climb)' : 'var(--ink-faint)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
          }}>⚙️</button>
        </div>
      </section>

      {showRaceConfigPanel && (
        <>
          <DropBagConfigWidget onRaceDataChanged={onRaceDataChanged} />
          <RaceInfoImportWidget onRaceDataChanged={onRaceDataChanged} />
        </>
      )}
      </div>

      <div style={{order: pageSectionOrder.indexOf('raceInsights')}}>
      <section ref={cardSectionRef} style={{padding:'48px 0 20px'}}>
        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:24}}>
          <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--ink-faint)', letterSpacing:'0.08em', flex:1}}>
            RACE INSIGHTS
          </div>
          <button onClick={() => setShowCardPanel(v => !v)} aria-label="Manage sections" title="Manage sections" style={{
            background:'none', border:'1px solid var(--line)', borderRadius:6, width:28, height:28,
            color: showCardPanel ? 'var(--climb)' : 'var(--ink-faint)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
          }}>⚙️</button>
        </div>

        {showCardPanel && (
          <div style={{background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:10, padding:12, marginBottom:20}}>
            <div style={{fontSize:11, color:'var(--ink-faint)', marginBottom:8}}>+ to show · − to minimize · tap again to hide. Drag ↑↓ to reorder.</div>
            {cardOrder.map((id, i) => {
              const c = cards.find(x => x.id === id);
              if (!c) return null;
              const state = getCardState(id);
              return (
                <div key={id} style={{display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderTop: i>0 ? '1px solid var(--line)' : 'none', opacity: state==='hidden' ? 0.35 : 1}}>
                  <span style={{flex:1, fontSize:13, color:'var(--ink)'}}>{c.t}{c.isCustom && <span style={{color:'var(--ink-faint)', fontSize:11}}> ↗</span>}</span>
                  <button onClick={() => cycleCardState(id)} aria-label={`${state} — tap to cycle`} title={state} style={{
                    width:26, height:26, borderRadius:6, border:'1px solid var(--line)',
                    background: state==='shown' ? 'var(--climb)' : state==='minimized' ? 'var(--bg-raised)' : 'transparent',
                    color: state==='shown' ? '#12151A' : state==='minimized' ? '#4A9FE8' : 'var(--ink-faint)',
                    cursor:'pointer', fontSize:16, lineHeight:1,
                  }}>{state==='shown' ? '−' : state==='minimized' ? '◻' : '+'}</button>
                  {c.isCustom && (
                    <button onClick={() => startEditCustomCard(c)} aria-label="Edit custom card" title="Edit" style={{
                      fontSize:10, fontFamily:'var(--mono)', padding:'4px 9px', borderRadius:6,
                      border:'1px solid var(--line)', background:'transparent', color:'var(--ink-dim)', cursor:'pointer',
                    }}>&#9998;</button>
                  )}
                  {c.isCustom && (
                    <button onClick={() => removeCustomCard(id)} style={{
                      fontSize:10, fontFamily:'var(--mono)', padding:'4px 9px', borderRadius:6,
                      border:'1px solid var(--descent)', background:'transparent', color:'var(--descent)', cursor:'pointer',
                    }}>✕</button>
                  )}
                  <button disabled={i===0} onClick={() => moveCard(i, -1)} style={{
                    width:26, height:26, borderRadius:6, border:'1px solid var(--line)', background:'var(--bg-raised)',
                    color: i===0 ? 'var(--ink-faint)' : 'var(--ink)', cursor: i===0 ? 'not-allowed' : 'pointer', fontSize:12,
                  }}>&uarr;</button>
                  <button disabled={i===cardOrder.length-1} onClick={() => moveCard(i, 1)} style={{
                    width:26, height:26, borderRadius:6, border:'1px solid var(--line)', background:'var(--bg-raised)',
                    color: i===cardOrder.length-1 ? 'var(--ink-faint)' : 'var(--ink)', cursor: i===cardOrder.length-1 ? 'not-allowed' : 'pointer', fontSize:12,
                  }}>&darr;</button>
                </div>
              );
            })}

            {showAddForm ? (
              <div style={{marginTop:14, paddingTop:14, borderTop:'1px solid var(--line)'}}>
                {editingCardId && (
                  <div style={{fontSize:11, color:'var(--ink-faint)', marginBottom:8}}>Editing &ldquo;{cards.find(c=>c.id===editingCardId)?.t}&rdquo;</div>
                )}
                <input placeholder="Title" value={newCardTitle} onChange={e=>setNewCardTitle(e.target.value)} style={{
                  width:'100%', marginBottom:8, padding:'8px 10px', borderRadius:8, border:'1px solid var(--line)',
                  background:'var(--bg-raised)', color:'var(--ink)', fontSize:13, fontFamily:'var(--body)',
                }} />
                <input placeholder="Description (optional)" value={newCardDesc} onChange={e=>setNewCardDesc(e.target.value)} style={{
                  width:'100%', marginBottom:8, padding:'8px 10px', borderRadius:8, border:'1px solid var(--line)',
                  background:'var(--bg-raised)', color:'var(--ink)', fontSize:13, fontFamily:'var(--body)',
                }} />
                <input placeholder="URL (e.g. strava.com/...)" value={newCardUrl} onChange={e=>setNewCardUrl(e.target.value)} style={{
                  width:'100%', marginBottom:10, padding:'8px 10px', borderRadius:8, border:'1px solid var(--line)',
                  background:'var(--bg-raised)', color:'var(--ink)', fontSize:13, fontFamily:'var(--body)',
                }} />
                <div style={{display:'flex', gap:8}}>
                  <button onClick={saveCustomCard} disabled={!newCardTitle.trim() || !newCardUrl.trim()} style={{
                    flex:1, padding:'8px 14px', borderRadius:8, border:'none',
                    background: (newCardTitle.trim() && newCardUrl.trim()) ? 'var(--climb)' : 'var(--bg-raised)',
                    color: (newCardTitle.trim() && newCardUrl.trim()) ? '#12151A' : 'var(--ink-faint)',
                    fontWeight:600, fontSize:13, cursor: (newCardTitle.trim() && newCardUrl.trim()) ? 'pointer' : 'not-allowed',
                  }}>{editingCardId ? 'Save changes' : 'Add card'}</button>
                  <button onClick={cancelCardForm} style={{
                    padding:'8px 14px', borderRadius:8, border:'1px solid var(--line)', background:'transparent', color:'var(--ink-dim)', fontSize:13, cursor:'pointer',
                  }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddForm(true)} style={{
                marginTop:10, width:'100%', padding:'10px', borderRadius:8, border:'1px dashed var(--line)',
                background:'transparent', color:'var(--climb)', fontSize:13, fontWeight:600, cursor:'pointer',
              }}>+ Add card</button>
            )}

            <button onClick={resetCards} style={{
              marginTop:10, fontSize:11, fontFamily:'var(--mono)', color:'var(--ink-faint)', background:'none',
              border:'none', textDecoration:'underline', cursor:'pointer', padding:0,
            }}>Reset order &amp; states (keeps custom cards)</button>
          </div>
        )}

        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14}}>
          {orderedCards.map(c => {
            const minimized = getCardState(c.id) === 'minimized';
            const trueIndex = cardOrder.indexOf(c.id);
            const commonStyle = {
              textAlign:'left', background:'var(--bg-card)', border:'1px solid var(--line)',
              borderRadius:14, padding: minimized ? '14px 20px' : '22px 20px', cursor:'pointer', color:'var(--ink)',
              transition:'border-color 0.15s', display:'block', textDecoration:'none', width:'100%',
            };
            const inner = (
              <React.Fragment>
                <div style={{fontFamily:'var(--display)', fontSize:19, fontWeight:600, marginBottom: minimized ? 0 : 8, paddingRight:60}}>{c.t}</div>
                {!minimized && <div style={{fontFamily:'var(--body)', fontSize:13.5, color:'var(--ink-dim)', lineHeight:1.5}}>{c.d}</div>}
              </React.Fragment>
            );
            const overlayControls = (
              <div style={{position:'absolute', top:12, right:12, display:'flex', gap:4, zIndex:2}}>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); cycleCardState(c.id); }}
                  aria-label="Toggle card size" title="Toggle shown/minimized/hidden"
                  style={{
                    width:24, height:24, borderRadius:6, border:'1px solid var(--line)',
                    background: minimized ? 'var(--bg-raised)' : 'var(--climb)',
                    color: minimized ? '#4A9FE8' : '#12151A', cursor:'pointer', fontSize:15, lineHeight:1,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}
                >{minimized ? '◻' : '−'}</button>
                <button
                  disabled={trueIndex===0}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveCard(trueIndex, -1); }}
                  aria-label="Move card earlier" style={{
                    width:24, height:24, borderRadius:6, border:'1px solid var(--line)', background:'var(--bg-raised)',
                    color: trueIndex===0 ? 'var(--ink-faint)' : 'var(--ink)', cursor: trueIndex===0 ? 'not-allowed' : 'pointer', fontSize:11,
                  }}>&uarr;</button>
                <button
                  disabled={trueIndex===cardOrder.length-1}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveCard(trueIndex, 1); }}
                  aria-label="Move card later" style={{
                    width:24, height:24, borderRadius:6, border:'1px solid var(--line)', background:'var(--bg-raised)',
                    color: trueIndex===cardOrder.length-1 ? 'var(--ink-faint)' : 'var(--ink)', cursor: trueIndex===cardOrder.length-1 ? 'not-allowed' : 'pointer', fontSize:11,
                  }}>&darr;</button>
              </div>
            );
            if (c.isCustom) {
              return (
                <div key={c.id} style={{position:'relative'}}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" style={commonStyle}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='var(--climb)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='var(--line)'}
                  >{inner}</a>
                  {overlayControls}
                </div>
              );
            }
            return (
              <div key={c.id} style={{position:'relative'}}>
                <button onClick={()=>goTo(c.id)} style={commonStyle}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--climb)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--line)'}
                >{inner}</button>
                {overlayControls}
              </div>
            );
          })}
        </div>
      </section>
      </div>

      </div>
    </div>
  );
}
window.Overview = Overview;
window.useRaceDayForecast = useRaceDayForecast;
