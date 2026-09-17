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

// Maps days-until-race to a training/nutrition/hydration phase with concrete
// guidance -- general, mainstream taper/carb-loading/hydration-loading
// practice, not a personalized or medical prescription. Ordered furthest-out
// to closest so the first matching threshold wins.
function getRacePrepPhase(daysUntil) {
  const phases = [
    {
      minDays: 21, name: 'Base Training', tagline: 'Taper guidance kicks in around 3 weeks out.',
      items: [
        'Keep building volume and terrain-specific training (climbing, descending, technical footing) that matches the course.',
        'Start dialing in your race-day fueling and hydration in training now -- never try something new on race day.',
        'Begin a shortlist of race-day gear so nothing is a last-minute decision later.',
      ],
    },
    {
      minDays: 14, name: 'Taper Begins', tagline: '2-3 weeks out',
      items: [
        'Cut weekly volume by roughly 20-30%, keeping some intensity or race-pace effort so your legs stay sharp.',
        'Prioritize sleep over this stretch -- it\u2019s where the training adaptation actually locks in.',
        'Finalize your race-day nutrition and hydration plan (Pack List) and test it on your remaining long efforts.',
        'Lock in gear choices -- nothing brand new from here on.',
      ],
    },
    {
      minDays: 7, name: 'Deep Taper', tagline: '1-2 weeks out',
      items: [
        'Volume drops further (50%+ below peak); short strides or a few minutes at race pace keep things sharp without adding fatigue.',
        'Confirm drop bag contents and logistics (Pack List).',
        'Review your pacing plan and course profile (Race Day Plan, Trail Explorer) so race morning holds no surprises.',
        'No need to start carb- or hydration-loading yet -- that ramps up in the final 48 hours.',
      ],
    },
    {
      minDays: 3, name: 'Dial It In', tagline: '3-6 days out',
      items: [
        'Training is minimal now -- short shakeouts only, nothing that leaves you sore.',
        'Start shifting toward a higher-carb ratio at meals -- more carbs relative to fat and protein, not necessarily more total food yet.',
        'Begin easing up fluid and sodium intake -- full hydration loading typically ramps up in the final 24-48 hours.',
        'Lay out gear, charge devices, and save or print your race plan.',
      ],
    },
    {
      minDays: 1, name: 'Load & Rest', tagline: 'Final 1-2 days',
      items: [
        'Carb-load in earnest with familiar, simple, carb-forward meals -- skip anything new, high-fiber, or high-fat right before the race.',
        'Increase fluids with electrolytes -- aim for pale, not clear, urine (overhydration carries its own risk).',
        'No hard training -- an easy walk or very short shakeout at most.',
        'Pack drop bags, lay out race-morning clothes, and confirm start-line logistics.',
        'Keep to an early, calm bedtime -- some pre-race sleep disruption is normal and doesn\u2019t undo the taper.',
      ],
    },
    {
      minDays: 0, name: 'Race Day', tagline: 'Today',
      items: [
        'Eat a familiar, carb-forward breakfast 2-3 hours before the start.',
        'Keep sipping fluids with electrolytes right up to the start.',
        'Light dynamic movement to warm up -- not a hard effort.',
        'Trust the training, run your own plan, and adjust to conditions as they come.',
      ],
    },
  ];
  return phases.find(p => daysUntil >= p.minDays) || phases[phases.length - 1];
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


function useRaceDayForecast(extraElevationsFt) {
  const [state, setState] = React.useState({ status: 'loading' });
  // Stable dependency key -- extraElevationsFt is a fresh array each render
  // otherwise, which would re-fetch on every render rather than only when
  // the actual elevations requested change.
  const elevKey = (extraElevationsFt || []).map(e => Math.round(e)).sort((a, b) => a - b).join(',');
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { lat: START_LAT, lon: START_LON } = getStartCoords();
        const raceDate = window.RACES[window.getCurrentRaceId()].startDate.slice(0, 10);
        const extras = elevKey ? elevKey.split(',').map(Number) : [];
        const baseUrl = 'https://api.open-meteo.com/v1/forecast';
        const commonParams = `daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&hourly=temperature_2m&start_date=${raceDate}&end_date=${raceDate}&temperature_unit=fahrenheit&timezone=America%2FDenver`;
        let url;
        if (extras.length) {
          // Same point repeated once per elevation -- 'nan' for the first
          // (native/default downscaling, identical to the no-extras case)
          // plus one override per requested elevation, feet converted to
          // meters since that's the unit Open-Meteo's elevation parameter
          // expects (unlike the rest of this app, which is feet throughout).
          const lats = [START_LAT, ...extras.map(() => START_LAT)].join(',');
          const lons = [START_LON, ...extras.map(() => START_LON)].join(',');
          const elevs = ['nan', ...extras.map(ft => Math.round(ft / 3.28084))].join(',');
          url = `${baseUrl}?latitude=${lats}&longitude=${lons}&elevation=${elevs}&${commonParams}`;
        } else {
          url = `${baseUrl}?latitude=${START_LAT}&longitude=${START_LON}&${commonParams}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('bad response');
        const raw = await res.json();
        if (cancelled) return;
        // Multi-location requests return a JSON array (one entry per
        // point, same shape as the single-location object) rather than a
        // single merged object -- confirmed against Open-Meteo's own docs,
        // not assumed. The base/native point is always entry 0 either way.
        const data = Array.isArray(raw) ? raw[0] : raw;
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
        // Elevation-adjusted lookup: finds the response entry whose
        // requested elevation is closest to the one asked for (exact match
        // in practice, since callers request the same values that were
        // fetched), then interpolates that series by hour the same way.
        let tempAtElevationAndHour = null;
        if (Array.isArray(raw) && raw.length > 1) {
          const points = raw.slice(1).map((entry, i) => ({ elevationFt: extras[i], hourlyTemps: entry.hourly.temperature_2m }));
          tempAtElevationAndHour = function (elevationFt, decHour) {
            let closest = points[0];
            let bestDiff = Math.abs(points[0].elevationFt - elevationFt);
            for (const p of points) {
              const diff = Math.abs(p.elevationFt - elevationFt);
              if (diff < bestDiff) { bestDiff = diff; closest = p; }
            }
            const clamped = Math.max(0, Math.min(23.999, decHour));
            const h0 = Math.floor(clamped);
            const h1 = Math.min(23, h0 + 1);
            const frac = clamped - h0;
            const t0 = closest.hourlyTemps[h0], t1 = closest.hourlyTemps[h1];
            if (t0 == null || t1 == null) return null;
            return t0 + (t1 - t0) * frac;
          };
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
          tempAtElevationAndHour,
        });
      } catch (e) {
        if (!cancelled) setState({ status: 'error' });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [elevKey]);
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

  const startTemp = (startDecHour !== null && typeof f.tempAtDecimalHour === 'function') ? f.tempAtDecimalHour(startDecHour) : null;
  const finishTemp = (finishDecHour !== null && typeof f.tempAtDecimalHour === 'function') ? f.tempAtDecimalHour(finishDecHour) : null;
  // Color start/finish by which is actually warmer, matching the Low
  // (blue)/High (orange) convention above -- rather than hardcoding start=
  // orange/finish=blue by position, which showed a cooler start in orange
  // and a warmer finish in blue: backwards from what those colors mean
  // everywhere else on this card.
  let startColor = 'var(--ink)', finishColor = 'var(--ink)';
  if (startTemp != null && finishTemp != null && startTemp !== finishTemp) {
    startColor = startTemp > finishTemp ? 'var(--climb)' : '#4A9FE8';
    finishColor = finishTemp > startTemp ? 'var(--climb)' : '#4A9FE8';
  }

  const blocks = f.status === 'ok'
    ? [
        { label: 'Low', value: `${f.low}°F`, sub: f.lowTime, color: '#4A9FE8' },
        { label: 'High', value: `${f.high}°F`, sub: f.highTime, color: 'var(--climb)' },
        // Sunrise/Sunset are time-of-day markers, not temperatures -- kept
        // neutral rather than reusing the warm/cool palette, since morning
        // isn't reliably "the warm one" the way High actually is.
        { label: 'Sunrise', value: f.sunrise, sub: null, color: 'var(--ink)' },
        { label: 'Sunset', value: f.sunset, sub: null, color: 'var(--ink)' },
        ...(startDecHour !== null ? [{
          label: 'At start', value: startTemp == null ? '\u2014' : `${Math.round(startTemp)}\u00b0F`,
          sub: fmtDecHour(startDecHour), color: startColor,
        }] : []),
        ...(finishDecHour !== null ? [{
          label: 'At finish', value: finishTemp == null ? '\u2014' : `${Math.round(finishTemp)}\u00b0F`,
          sub: `${fmtDecHour(finishDecHour)} \u00b7 ${targetHours}hr target`, color: finishColor,
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

// A Course & Conditions stat tile. When s.linkTo is set (Aid stations ->
// raceplan, Drop bags -> packlist), the whole tile becomes a button that
// jumps to that section -- keyboard-accessible via Enter/Space like any
// other button, with a subtle arrow and hover tint as the visual hint that
// it goes somewhere, rather than looking identical to the plain stats
// around it.
function StatTile({ s, goTo }) {
  const clickable = !!s.linkTo;
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={clickable ? () => goTo(s.linkTo) : undefined}
      onMouseEnter={clickable ? () => setHover(true) : undefined}
      onMouseLeave={clickable ? () => setHover(false) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(s.linkTo); } } : undefined}
      style={{
        background: clickable && hover ? 'var(--bg-raised)' : 'var(--bg)', padding:'20px 16px',
        cursor: clickable ? 'pointer' : 'default', position:'relative',
        transition:'background 0.15s ease',
      }}
    >
      <div style={{fontFamily:'var(--display)', fontSize:26, fontWeight:700, color:'var(--ink)'}}>
        {s.value}<span style={{fontSize:14, color:'var(--ink-faint)', marginLeft:4}}>{s.unit}</span>
        {clickable && <span style={{fontSize:14, color:'var(--climb)', marginLeft:6, opacity: hover ? 1 : 0.5}}>&rarr;</span>}
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
  );
}

function CourseProfileChart() {
  const { state: blobState, setState: setBlobState } = React.useContext(window.BlobStateContext);
  const [hovered, setHovered] = React.useState(null);
  const [focusedRange, setFocusedRange] = React.useState(null); // {startSegId, endSegId} or null for whole course
  const [lastClickedSeg, setLastClickedSeg] = React.useState(null);
  const [rangeMode, setRangeMode] = React.useState(false);
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
  const [courseProfileStatOrder, setCourseProfileStatOrder] = window.useBlobField(
    blobState, setBlobState, 'courseProfileStatOrder', courseProfileStatKeys,
    saved => (Array.isArray(saved) && saved.every(k => courseProfileStatKeys.includes(k)) &&
      courseProfileStatKeys.every(k => saved.includes(k))) ? saved : undefined
  );
  const [courseProfileStatHidden, setCourseProfileStatHidden] = window.useBlobField(
    blobState, setBlobState, 'courseProfileStatHidden', [],
    saved => Array.isArray(saved) ? saved.filter(k => courseProfileStatKeys.includes(k)) : undefined
  );

  // aid station markers: every segment boundary (start through finish),
  // colored orange for a regular aid station or purple for one with a drop
  // bag -- same convention as Trail Explorer's chart, rather than this
  // chart's previous start/aid/finish-specific coloring.
  const markers = React.useMemo(() => {
    const points = [];
    gradeSegments.forEach((seg, i) => {
      if (i === 0) {
        const first = samples.find(s => s.mile >= seg.miS) || samples[0];
        points.push({ mile: seg.miS, elev: first.elev, label: seg.from, type: 'start', segId: baseSegments[i].id, hasDropBag: false });
      }
      const last = [...samples].reverse().find(s => s.mile <= seg.miE) || samples[samples.length - 1];
      points.push({
        mile: seg.miE, elev: last.elev, label: seg.to.replace(/\s*\(Drop Bag #\d+\)/i, ''),
        type: i === gradeSegments.length - 1 ? 'finish' : 'aid',
        segId: baseSegments[i].id, hasDropBag: !!dropBagNum(baseSegments[i]),
      });
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

  function selectSegId(segId, shiftKey) {
    if (segId == null) { setFocusedRange(null); return; } // e.g. clicking exactly at Finish clears back to whole-course
    if ((shiftKey || rangeMode) && lastClickedSeg != null) {
      const from = Math.min(lastClickedSeg, segId);
      const to = Math.max(lastClickedSeg, segId);
      setFocusedRange({ startSegId: from, endSegId: to });
      setRangeMode(false);
    } else {
      setFocusedRange({ startSegId: segId, endSegId: segId });
      setLastClickedSeg(segId);
    }
  }

  function handlePlotClick(e) {
    const svg = e.currentTarget.ownerSVGElement || e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * w;
    const seg = findSegmentForMile(mileForX(clickX));
    selectSegId(seg ? seg.id : null, e.shiftKey);
  }

  const linePts = samples.map(s => `${xFor(s.mile)},${yFor(s.elev)}`).join(' ');
  const areaPts = `${xFor(0)},${padT + plotH} ${linePts} ${xFor(maxMile)},${padT + plotH}`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(stats.min + t * elevRange));
  const xTickCount = 10;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => Math.round((maxMile / xTickCount) * i * 10) / 10);

  const focusedSegRange = focusedRange ? baseSegments.filter(s => s.id >= focusedRange.startSegId && s.id <= focusedRange.endSegId) : null;
  const rangeSegObj = focusedSegRange && focusedSegRange.length ? {
    miS: focusedSegRange[0].miS, miE: focusedSegRange[focusedSegRange.length - 1].miE,
    segGain: focusedSegRange.reduce((a, s) => a + s.segGain, 0), segLoss: focusedSegRange.reduce((a, s) => a + s.segLoss, 0),
  } : null;
  const segStats = rangeSegObj ? computeSegmentElevationStats(rangeSegObj, samples) : null;
  const displayStats = segStats || stats;
  const scopeLabel = focusedSegRange && focusedSegRange.length
    ? (focusedSegRange.length === 1
      ? `${focusedSegRange[0].from} \u2192 ${focusedSegRange[0].to.replace(/\s*\(Drop Bag #\d+\)/i, '')}`
      : `${focusedSegRange[0].from} \u2192 ${focusedSegRange[focusedSegRange.length - 1].to.replace(/\s*\(Drop Bag #\d+\)/i, '')} (${focusedSegRange.length} segments)`)
    : 'Whole course';

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

          {/* highlight the focused range's mile span on the plot */}
          {rangeSegObj && (
            <rect x={xFor(rangeSegObj.miS)} y={padT} width={xFor(rangeSegObj.miE) - xFor(rangeSegObj.miS)} height={plotH}
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
              onClick={(e) => { e.stopPropagation(); selectSegId(m.segId, e.shiftKey); }}
              style={{cursor: 'pointer'}}
            >
              {/* invisible larger hit-target -- the visible marker (r=6-10) is far
                  too small to reliably tap on a phone once the 1000-unit viewBox
                  is scaled down to actual screen width */}
              <circle cx={xFor(m.mile)} cy={yFor(m.elev)} r={22} fill="transparent" />
              <circle cx={xFor(m.mile)} cy={yFor(m.elev)}
                r={hovered===i ? 8 : 6}
                fill={m.hasDropBag ? 'var(--db)' : 'var(--climb)'}
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
                color: m.hasDropBag ? 'var(--db)' : 'var(--ink-faint)',
                fontFamily:'var(--mono)', fontSize:11, textTransform:'uppercase',
              }}>{m.hasDropBag ? 'drop bag' : m.type}</span>
            </div>
          </div>
        );
      })()}

      <div style={{display:'flex', alignItems:'center', gap:8, marginTop:14, marginBottom:4, flexWrap:'wrap'}}>
        <div style={{fontFamily:'var(--display)', fontWeight:600, fontSize:14, color: focusedRange ? 'var(--climb)' : 'var(--ink-faint)', flex:1}}>
          {scopeLabel}
        </div>
        <button onClick={() => setRangeMode(v => !v)} style={{
          padding:'4px 10px', borderRadius:16, border:`1.5px solid ${rangeMode ? 'var(--climb)' : 'var(--line)'}`,
          background: rangeMode ? 'var(--climb)' : 'none', color: rangeMode ? '#12151A' : 'var(--ink-faint)',
          fontSize:11, fontWeight:600, cursor:'pointer',
        }}>{rangeMode ? 'Tap the other end\u2026' : '+ Select a range'}</button>
        {focusedRange && (
          <button onClick={() => setFocusedRange(null)} style={{
            background:'none', border:'none', color:'var(--ink-faint)', cursor:'pointer', fontSize:11, fontFamily:'var(--mono)',
          }}>&#10005; whole course</button>
        )}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(110px, 1fr))', gap:1, background:'var(--line)'}}>
        {courseProfileStatOrder.filter(key => !courseProfileStatHidden.includes(key)).map(key => {
          const defs = {
            gain: ['GAIN', `+${displayStats.gain.toLocaleString()} ft`, '#3CB897'],
            loss: ['LOSS', `-${displayStats.loss.toLocaleString()} ft`, 'var(--descent)'],
            max: ['MAX ELEVATION', `${displayStats.max.toLocaleString()} ft`, 'var(--climb)'],
            min: ['MIN ELEVATION', `${displayStats.min.toLocaleString()} ft`, 'var(--ink)'],
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
    targetWaterHr, setTargetWaterHr, vestCapacity, setVestCapacity, vestCount, setVestCount, bladderCapacity, setBladderCapacity, beltCapacity, setBeltCapacity,
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
  function addGearItem(preset) {
    setExtraGear(prev => [...prev, {
      id: Date.now(),
      name: preset ? preset.name : '',
      pickupSegmentId: null, dropoffSegmentId: null,
      suggestType: preset ? preset.suggestType : 'none',
      tempThreshold: 40,
    }]);
  }
  const GEAR_PRESETS = [
    { name: 'Poles', suggestType: 'steepTerrain' },
    { name: 'Waist Lamp', suggestType: 'dawn' },
    { name: 'Head Lamp', suggestType: 'dawn' },
  ];
  function updateGearItem(id, patch) {
    setExtraGear(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  }
  function removeGearItem(id) {
    setExtraGear(prev => prev.filter(g => g.id !== id));
  }
  const gearSelectStyle = { background:'var(--bg-raised)', border:'1px solid var(--line)', borderRadius:6, color:'var(--ink)', fontSize:12, padding:'5px 6px' };
  return (
    <div style={{padding:'20px 0', borderBottom:'1px solid var(--line)'}}>
      <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:16}}>
        Pace &amp; Nutrition Targets
      </div>

      <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 40, rowGap: 16, marginBottom: 20 }}>
            <TargetStepper label="Target finish time" value={targetHours} setValue={setTargetHours} min={1} max={window.RACES[window.getCurrentRaceId()].cutoffHours} step={0.5} unit="hr" note={`${window.RACES[window.getCurrentRaceId()].cutoffHours}hr official cutoff`} />
            <TargetStepper label="Target carb intake" value={targetCarb} setValue={setTargetCarb} min={50} max={120} step={5} unit="g/hr" />
            <TargetStepper label="Target salt intake" value={targetSodium} setValue={setTargetSodium} min={400} max={1200} step={50} unit="mg/hr" />
          </div>
          <div style={{marginTop:24, paddingTop:20, borderTop:'1px solid var(--line)'}}>
          <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 40, rowGap: 16, marginBottom: 20 }}>
            <TargetStepper label="Target water intake" value={targetWaterHr} setValue={setTargetWaterHr} min={200} max={1200} step={50} unit="ml/hr" />
          </div>
          <div style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase', marginBottom:12}}>Carrying setup</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 40, rowGap: 16 }}>
            <VesselToggleStepper label="Vest flask (each)" enabled={vestEnabled} setEnabled={setVestEnabled} value={vestCapacity} setValue={setVestCapacity} min={150} max={750} step={50} unit="ml" count={vestCount} setCount={setVestCount} countMin={1} countMax={6}
              segments={raceSegments} range={vesselRanges.vest} setRange={setRangeFor('vest')} />
            <VesselToggleStepper label="Bladder" enabled={bladderEnabled} setEnabled={setBladderEnabled} value={bladderCapacity} setValue={setBladderCapacity} min={500} max={3000} step={100} unit="ml"
              segments={raceSegments} range={vesselRanges.bladder} setRange={setRangeFor('bladder')} />
            <VesselToggleStepper label="Belt flask" enabled={beltEnabled} setEnabled={setBeltEnabled} value={beltCapacity} setValue={setBeltCapacity} min={100} max={1000} step={50} unit="ml"
              segments={raceSegments} range={vesselRanges.belt} setRange={setRangeFor('belt')} />
            <VesselToggleStepper label="Handheld" enabled={handheldEnabled} setEnabled={setHandheldEnabled} value={handheldCapacity} setValue={setHandheldCapacity} min={150} max={750} step={50} unit="ml"
              segments={raceSegments} range={vesselRanges.handheld} setRange={setRangeFor('handheld')} />
          </div>

          <div style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase', marginTop:24, marginBottom:12}}>Extra Gear</div>
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
                  {raceSegments.slice(0, -1).map(s => <option key={s.id} value={s.id + 1}>At {s.to} (mi {s.miE})</option>)}
                </select>
                <span>Drop:</span>
                <select value={g.dropoffSegmentId ?? ''} onChange={e => updateGearItem(g.id, { dropoffSegmentId: e.target.value === '' ? null : Number(e.target.value) })} style={gearSelectStyle}>
                  {raceSegments.map(s => <option key={s.id} value={s.id}>At {s.to} (mi {s.miE})</option>)}
                  <option value="">Finish</option>
                </select>
              </div>
              <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', fontSize:12, color:'var(--ink-dim)'}}>
                <span>Suggest when:</span>
                <select value={g.suggestType} onChange={e => updateGearItem(g.id, { suggestType: e.target.value })} style={gearSelectStyle}>
                  <option value="none">Always (no forecast check)</option>
                  <option value="dawn">Start is before sunrise</option>
                  <option value="cold">Forecast at pickup is below&hellip;</option>
                  <option value="steepTerrain">Segment has a steep climb or descent</option>
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
          <div style={{display:'flex', flexWrap:'wrap', gap:8, marginBottom:10}}>
            {GEAR_PRESETS.filter(p => !extraGear.some(g => g.name === p.name)).map(p => (
              <button key={p.name} onClick={() => addGearItem(p)} style={{
                padding:'6px 12px', borderRadius:20, border:'1px solid var(--line)', background:'var(--bg-raised)',
                color:'var(--ink-dim)', fontSize:12, cursor:'pointer',
              }}>+ {p.name}</button>
            ))}
          </div>
          <button onClick={() => addGearItem()} style={{
            padding:'8px 14px', borderRadius:8, border:'1px dashed var(--line)', background:'none',
            color:'var(--climb)', fontSize:12.5, fontWeight:600, cursor:'pointer',
          }}>+ Add gear item</button>
        </div>
      </div>
    </div>
  );
}

function DropBagConfigWidget({ onRaceDataChanged }) {
  const race = window.RACES[window.getCurrentRaceId()];
  const segments = race.baseSegments;
  const hasElevationBins = Array.isArray(race.elevationBins) && race.elevationBins.length > 0;
  const [rows, setRows] = React.useState(() => segments.map(s => ({
    dropBag: !!(s.amenities && s.amenities.dropBag),
    crew: !!(s.amenities && s.amenities.crew),
    pacer: !!s.pacer,
    noAid: !!(s.amenities && s.amenities.noAid),
    name: s.to,
    mile: String(s.miE),
  })));
  const [saved, setSaved] = React.useState(false);
  const [mileError, setMileError] = React.useState('');

  const hasAny = rows.some(r => r.dropBag || r.crew || r.pacer);

  function toggle(i, field) {
    setRows(prev => prev.map((r, idx) => {
      if (idx !== i) return r;
      const next = { ...r, [field]: !r[field] };
      // No Aid means exactly that -- no drop bag, no crew, no pacer access
      // either, so these are mutually exclusive rather than independently
      // toggleable in a way that could claim both at once.
      if (field === 'noAid' && next.noAid) {
        next.dropBag = false; next.crew = false; next.pacer = false;
      } else if (field !== 'noAid' && next[field]) {
        next.noAid = false;
      }
      return next;
    }));
    setSaved(false);
  }

  function renameRow(i, value) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, name: value } : r));
    setSaved(false);
  }

  function remileRow(i, value) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, mile: value } : r));
    setSaved(false);
    setMileError('');
  }

  function handleSave() {
    const newMiles = rows.map(r => parseFloat(r.mile));
    const milesChanged = newMiles.some((m, i) => m !== segments[i].miE);

    if (milesChanged) {
      if (!hasElevationBins) {
        setMileError("Mile markers can't be corrected on this race -- it was imported before this feature existed, so the underlying elevation profile isn't available to recompute gain/loss/grade for new boundaries. Re-uploading the same GPX file will enable this.");
        return;
      }
      if (newMiles.some(m => isNaN(m) || m <= 0) || newMiles.some((m, i) => i > 0 && m <= newMiles[i - 1])) {
        setMileError('Mile markers must be increasing numbers, each greater than the one before it.');
        return;
      }
      if (newMiles[newMiles.length - 1] > race.elevationBins[race.elevationBins.length - 1].mile + 0.15) {
        setMileError(`The last mile marker (${newMiles[newMiles.length - 1]}) is past the end of the recorded track (${race.elevationBins[race.elevationBins.length - 1].mile}mi). Check for a typo.`);
        return;
      }

      const boundaries = [0, ...newMiles];
      const names = ['Start', ...rows.map(r => r.name.trim() || 'Aid Station')];
      const { baseSegments: freshBase, gradeSegments: freshGrade } = window.recomputeSegmentsFromBins(race.elevationBins, boundaries, names);

      // Recomputing from scratch gives every segment fresh placeholder
      // amenities/cutoffs/notes -- carry forward whatever was already set
      // on the segment in that same position, so correcting a mile marker
      // doesn't wipe out drop bag/crew/pacer/cutoff/notes data entered
      // earlier.
      freshBase.forEach((s, i) => {
        const old = segments[i];
        if (old) {
          s.amenities = { ...s.amenities, dropBag: rows[i].dropBag, crew: rows[i].crew, noAid: rows[i].noAid };
          s.pacer = rows[i].pacer;
          s.cutoffClock = old.cutoffClock; s.cutoffHours = old.cutoffHours;
          s.conditions = old.conditions; s.note = old.note;
          s.socks = old.socks; s.bladder = old.bladder;
          s.color = old.color;
        }
      });
      race.baseSegments = freshBase;
      race.gradeSegments = freshGrade;
      race.totalDistance = boundaries[boundaries.length - 1];
      race.totalGain = freshBase.reduce((a, s) => a + s.segGain, 0);
      race.totalLoss = freshBase.reduce((a, s) => a + s.segLoss, 0);
    } else {
      segments.forEach((s, i) => {
        s.amenities = { ...s.amenities, dropBag: rows[i].dropBag, crew: rows[i].crew, noAid: rows[i].noAid };
        s.pacer = rows[i].pacer;

        // Each aid station name is shared between two places: this segment's
        // `to` and the next segment's `from` (the same physical point, seen
        // from either side) -- both need updating together, or the name
        // would show correctly in one view and stay stale in another that
        // reads the neighboring segment instead. gradeSegments carries its
        // own independent copy of the same from/to pair (built alongside
        // baseSegments in gpx_import.js), so it needs the same update too.
        const newName = rows[i].name.trim();
        if (newName && newName !== s.to) {
          s.to = newName;
          if (segments[i + 1]) segments[i + 1].from = newName;
          if (race.gradeSegments && race.gradeSegments[i]) race.gradeSegments[i].to = newName;
          if (race.gradeSegments && race.gradeSegments[i + 1]) race.gradeSegments[i + 1].from = newName;
        }
      });
    }

    if (window.getCurrentRaceId() !== 'tmr') window.saveCustomRace(race);
    setSaved(true);
    setMileError('');
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
      {!hasElevationBins && (
        <div style={{background:'var(--bg-raised)', border:'1px solid var(--line)', borderRadius:10, padding:'12px 14px', marginBottom:14, fontSize:12.5, color:'var(--ink-faint)'}}>
          Names are editable below, but mile markers aren't correctable on this race -- it was imported before that was supported. Re-upload the same GPX to enable it.
        </div>
      )}
      {mileError && (
        <div style={{background:'var(--descent)15', border:'1px solid var(--descent)55', borderRadius:10, padding:'12px 14px', marginBottom:14, fontSize:12.5, color:'var(--descent)'}}>
          {mileError}
        </div>
      )}
      <div style={{marginBottom:14}}>
        {segments.map((s, i) => (
          <div key={s.id} style={{display:'flex', alignItems:'center', flexWrap:'wrap', gap:14, padding:'8px 0', borderBottom:'1px solid var(--line)'}}>
            <span style={{display:'flex', alignItems:'center', gap:8, minWidth:200, flex:1}}>
              <input
                value={rows[i].name}
                onChange={e => renameRow(i, e.target.value)}
                style={{
                  fontSize:13, color:'var(--ink)', background:'var(--bg-raised)', border:'1px solid var(--line)',
                  borderRadius:6, padding:'4px 8px', width:160, fontFamily:'inherit',
                }}
              />
              <span style={{color:'var(--ink-faint)', fontFamily:'var(--mono)', fontSize:11, whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:4}}>
                (mi
                <input
                  value={rows[i].mile}
                  onChange={e => remileRow(i, e.target.value)}
                  disabled={!hasElevationBins}
                  inputMode="decimal"
                  style={{
                    width:48, fontSize:11, fontFamily:'var(--mono)', color: hasElevationBins ? 'var(--ink)' : 'var(--ink-faint)',
                    background: hasElevationBins ? 'var(--bg-raised)' : 'transparent', border:'1px solid var(--line)',
                    borderRadius:4, padding:'2px 4px', textAlign:'center',
                  }}
                />)
              </span>
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
            <label style={{display:'flex', alignItems:'center', gap:5, fontSize:12, color: rows[i].noAid ? 'crimson' : 'var(--ink-dim)', cursor:'pointer'}}>
              <input type="checkbox" checked={rows[i].noAid} onChange={() => toggle(i, 'noAid')} /> No Aid
            </label>
          </div>
        ))}
      </div>
      <button onClick={handleSave} style={{
        padding:'9px 16px', borderRadius:8, border:'none', background:'var(--climb)', color:'#12151A',
        fontWeight:600, fontSize:13, cursor:'pointer',
      }}>{saved ? 'Saved \u2713' : 'Save aid stations'}</button>
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

function Overview({ goTo, externalCardPanelOpen, onCardPanelToggle, externalRaceSettingsOpen, onRaceSettingsToggle, onRaceDataChanged }) {
  const { state: blobState, setState: setBlobState } = React.useContext(window.BlobStateContext);
  // Race starts 6:00am Saturday Aug 22, 2026, Mountain Time (MDT, UTC-6 in August)
  const activeRace = window.RACES[window.getCurrentRaceId()];
  const countdown = useCountdown(activeRace.startDate);
  const weather = useLiveWeather();

  const courseSamples = React.useMemo(() => buildFullCourseSamples(), [activeRace]);
  const courseStats = React.useMemo(() => computeElevationStats(courseSamples), [courseSamples]);
  const dropBagSegs = baseSegments.filter(s => s.amenities && s.amenities.dropBag);
  const avgAltitude = Math.round(courseSamples.reduce((a, s) => a + s.elev, 0) / courseSamples.length);

  const staticStats = [
    { key: 'distance', label: 'Distance', value: activeRace.distance.toFixed(1), unit: 'mi' },
    { key: 'vert', label: 'Vert gain', value: activeRace.vertGain.toLocaleString(), unit: 'ft' },
    { key: 'aid', label: 'Aid stations', value: `${baseSegments.length - 1}`, unit: '', linkTo: 'raceplan' },
    { key: 'bags', label: 'Drop bags', value: `${dropBagSegs.length}`, unit: '', sub: dropBagSegs.length ? `Mi ${dropBagSegs.map(s => s.miE).join(', ')}` : undefined, linkTo: 'packlist' },
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

  const [statOrder, setStatOrder] = window.useBlobField(
    blobState, setBlobState, 'statOrder', defaultOrder,
    saved => (Array.isArray(saved) && saved.every(k => defaultOrder.includes(k)) &&
      defaultOrder.every(k => saved.includes(k))) ? saved : undefined
  );

  const [statVisible, setStatVisible] = window.useBlobField(
    blobState, setBlobState, 'statVisible', {},
    saved => (saved && typeof saved === 'object') ? saved : undefined
  );
  function isVisible(key) { return statVisible[key] !== false; }
  function toggleVisible(key) {
    setStatVisible(prev => ({ ...prev, [key]: prev[key] === false ? true : false }));
  }

  function resetStats() { setStatOrder(defaultOrder); setStatVisible({}); }

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
    { id: 'header', label: 'Race Header' },
    { id: 'countdown', label: 'Countdown' },
    { id: 'racePrep', label: 'Race Prep' },
    { id: 'conditions', label: 'Conditions' },
    { id: 'raceDayForecast', label: 'Race Day Forecast' },
    { id: 'courseProfile', label: 'Course Profile' },
    { id: 'raceSettings', label: 'Race Settings' },
    { id: 'raceInsights', label: 'Race Insights' },
  ];
  const pageSectionDefaultOrder = PAGE_SECTIONS.map(s => s.id);
  const [pageSectionOrder, setPageSectionOrder] = window.useBlobField(
    blobState, setBlobState, 'pageSectionOrder', pageSectionDefaultOrder,
    saved => (Array.isArray(saved) && saved.length === pageSectionDefaultOrder.length &&
      saved.every(id => pageSectionDefaultOrder.includes(id))) ? saved : undefined
  );
  const [pageSectionHidden, setPageSectionHidden] = window.useBlobField(
    blobState, setBlobState, 'pageSectionHidden', [],
    saved => Array.isArray(saved) ? saved.filter(id => pageSectionDefaultOrder.includes(id)) : undefined
  );
  function togglePageSection(id) {
    setPageSectionHidden(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  // Same blob key CourseProfileChart itself reads/writes -- duplicated here
  // (not lifted/prop-drilled) so the one unified settings flyout below can
  // manage it too, since both components already share the same blobState/
  // setBlobState via context.
  const courseProfileStatKeys = ['gain', 'max', 'maxClimb', 'loss', 'min', 'maxDescent'];
  const [courseProfileStatOrder, setCourseProfileStatOrder] = window.useBlobField(
    blobState, setBlobState, 'courseProfileStatOrder', courseProfileStatKeys,
    saved => (Array.isArray(saved) && saved.every(k => courseProfileStatKeys.includes(k)) &&
      courseProfileStatKeys.every(k => saved.includes(k))) ? saved : undefined
  );
  const [courseProfileStatHidden, setCourseProfileStatHidden] = window.useBlobField(
    blobState, setBlobState, 'courseProfileStatHidden', [],
    saved => Array.isArray(saved) ? saved.filter(k => courseProfileStatKeys.includes(k)) : undefined
  );
  const courseProfileStatLabels = { gain: 'Gain', loss: 'Loss', max: 'Max elevation', min: 'Min elevation', maxClimb: 'Max Climb', maxDescent: 'Max Descent' };

  // One flyout (not an inline panel that pushes down the rest of the page)
  // covers page layout plus every stat-reorder gear that used to be
  // scattered across separate sections -- Course & Conditions stats and
  // Course Profile stats both used to have their own gear icon; Race
  // Settings used to have its own gear too, but that's now just another
  // entry in the page-layout list below (draggable/hideable like any other
  // section) rather than a separate toggle.
  const [showPageLayoutPanel, setShowPageLayoutPanel] = React.useState(false);
  const [expandPageLayout, setExpandPageLayout] = React.useState(true);
  const [expandConditionsStats, setExpandConditionsStats] = React.useState(true);
  const [expandCourseProfileStats, setExpandCourseProfileStats] = React.useState(true);
  React.useEffect(() => {
    if (externalCardPanelOpen !== undefined) setShowPageLayoutPanel(externalCardPanelOpen);
  }, [externalCardPanelOpen]);

  // Race Settings' own content (Pace & Nutrition Targets, Drop Bag
  // Locations, Race Date/Time/Cutoff, Import Race Info) still expands/
  // collapses independently of whether the section itself is shown in the
  // page layout -- this is "is the content open", not "is this section
  // visible", so it stays a separate toggle, just no longer a gear icon
  // (that framing belonged to the old per-section-gear pattern).
  const [showRaceSettingsPanel, setShowRaceSettingsPanel] = React.useState(false);
  React.useEffect(() => {
    if (externalRaceSettingsOpen !== undefined) setShowRaceSettingsPanel(externalRaceSettingsOpen);
  }, [externalRaceSettingsOpen]);
  React.useEffect(() => {
    if (onRaceSettingsToggle) onRaceSettingsToggle(showRaceSettingsPanel);
  }, [showRaceSettingsPanel]);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingCardId, setEditingCardId] = React.useState(null);
  const [newCardTitle, setNewCardTitle] = React.useState('');
  const [newCardDesc, setNewCardDesc] = React.useState('');
  const [newCardUrl, setNewCardUrl] = React.useState('');

  const [customCards, setCustomCards] = window.useBlobField(
    blobState, setBlobState, 'customCards', [],
    saved => Array.isArray(saved) ? saved : undefined
  );

  const cards = [...builtinCards, ...customCards.map(c => ({ ...c, isCustom: true }))];

  const [cardOrder, setCardOrder] = window.useBlobField(
    blobState, setBlobState, 'cardOrder', cardDefaultOrder,
    saved => Array.isArray(saved) ? saved : undefined
  );
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

  const [cardState, setCardState] = window.useBlobField(
    blobState, setBlobState, 'cardState', {},
    saved => (saved && typeof saved === 'object') ? saved : undefined
  );
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
      <div style={{display:'flex', justifyContent:'flex-end', marginBottom:4}}>
        <button onClick={() => setShowPageLayoutPanel(v => !v)} aria-label="Overview settings" title="Reorder sections, customize stats" style={{
          background:'none', border:'1px solid var(--line)', borderRadius:6, width:28, height:28,
          color: showPageLayoutPanel ? 'var(--climb)' : 'var(--ink-faint)', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
        }}>⚙️</button>
      </div>

      {showPageLayoutPanel && (
        <>
          <div onClick={() => setShowPageLayoutPanel(false)} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999,
          }} />
          <div style={{
            position:'fixed', top:0, right:0, bottom:0, width:'min(420px, 92vw)', zIndex:1000,
            background:'var(--bg-card)', borderLeft:'1px solid var(--line)', boxShadow:'-8px 0 28px rgba(0,0,0,0.45)',
            overflowY:'auto', padding:16,
          }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
              <div style={{fontFamily:'var(--display)', fontWeight:600, fontSize:16}}>Overview Settings</div>
              <button onClick={() => setShowPageLayoutPanel(false)} aria-label="Close" style={{
                background:'none', border:'none', color:'var(--ink-faint)', cursor:'pointer', fontSize:18, lineHeight:1,
              }}>&#10005;</button>
            </div>

            <div onClick={() => setExpandPageLayout(v => !v)} style={{display:'flex', alignItems:'center', gap:6, cursor:'pointer', marginBottom:8}}>
              <span style={{fontSize:10, color:'var(--ink-faint)', transform: expandPageLayout ? 'rotate(90deg)' : 'none', transition:'transform 0.15s', display:'inline-block'}}>&#9656;</span>
              <div style={{fontSize:11, fontFamily:'var(--mono)', color:'var(--climb)', textTransform:'uppercase', letterSpacing:'0.05em'}}>Page Layout</div>
            </div>
            {expandPageLayout && (
              <>
            <div style={{fontSize:12, color:'var(--ink-faint)', marginBottom:8}}>Drag to reorder sections, or toggle to show/hide.</div>
            <window.DragReorderList
              order={pageSectionOrder}
              setOrder={setPageSectionOrder}
              renderLabel={id => PAGE_SECTIONS.find(x => x.id === id).label}
              extraControls={id => {
                const vis = !pageSectionHidden.includes(id);
                return (
                  <button onClick={() => togglePageSection(id)} aria-label={vis ? 'Hide section' : 'Show section'} style={{
                    width:26, height:26, borderRadius:6, border:'1px solid var(--line)',
                    background: vis ? 'var(--climb)' : 'var(--bg-raised)',
                    color: vis ? '#12151A' : 'var(--ink-faint)', cursor:'pointer', fontSize:16, lineHeight:1,
                  }}>{vis ? '\u2212' : '+'}</button>
                );
              }}
            />
            <button onClick={() => { setPageSectionOrder(pageSectionDefaultOrder); setPageSectionHidden([]); }} style={{
              marginTop:8, fontSize:11, fontFamily:'var(--mono)', color:'var(--ink-faint)', background:'none',
              border:'none', textDecoration:'underline', cursor:'pointer', padding:0,
            }}>Reset to default order</button>
              </>
            )}

            <div onClick={() => setExpandConditionsStats(v => !v)} style={{display:'flex', alignItems:'center', gap:6, cursor:'pointer', marginBottom:8, borderTop:'1px solid var(--line)', paddingTop:20, marginTop:24}}>
              <span style={{fontSize:10, color:'var(--ink-faint)', transform: expandConditionsStats ? 'rotate(90deg)' : 'none', transition:'transform 0.15s', display:'inline-block'}}>&#9656;</span>
              <div style={{fontSize:11, fontFamily:'var(--mono)', color:'var(--climb)', textTransform:'uppercase', letterSpacing:'0.05em'}}>Course &amp; Conditions Stats</div>
            </div>
            {expandConditionsStats && (
              <>
            <window.DragReorderList
              order={statOrder}
              setOrder={setStatOrder}
              renderLabel={key => allStats.find(x => x.key === key).label}
              extraControls={key => {
                const vis = isVisible(key);
                return (
                  <button onClick={() => toggleVisible(key)} aria-label={vis ? 'Hide stat' : 'Show stat'} style={{
                    width:26, height:26, borderRadius:6, border:'1px solid var(--line)',
                    background: vis ? 'var(--climb)' : 'var(--bg-raised)',
                    color: vis ? '#12151A' : 'var(--ink-faint)', cursor:'pointer', fontSize:16, lineHeight:1,
                  }}>{vis ? '\u2212' : '+'}</button>
                );
              }}
            />
            <button onClick={resetStats} style={{
              marginTop:8, fontSize:11, fontFamily:'var(--mono)', color:'var(--ink-faint)', background:'none',
              border:'none', textDecoration:'underline', cursor:'pointer', padding:0,
            }}>Reset to default order</button>
              </>
            )}

            <div onClick={() => setExpandCourseProfileStats(v => !v)} style={{display:'flex', alignItems:'center', gap:6, cursor:'pointer', marginBottom:8, borderTop:'1px solid var(--line)', paddingTop:20, marginTop:24}}>
              <span style={{fontSize:10, color:'var(--ink-faint)', transform: expandCourseProfileStats ? 'rotate(90deg)' : 'none', transition:'transform 0.15s', display:'inline-block'}}>&#9656;</span>
              <div style={{fontSize:11, fontFamily:'var(--mono)', color:'var(--climb)', textTransform:'uppercase', letterSpacing:'0.05em'}}>Course Profile Stats</div>
            </div>
            {expandCourseProfileStats && (
              <>
            <window.DragReorderList
              order={courseProfileStatOrder}
              setOrder={setCourseProfileStatOrder}
              renderLabel={key => courseProfileStatLabels[key]}
              extraControls={key => {
                const vis = !courseProfileStatHidden.includes(key);
                return (
                  <button onClick={() => setCourseProfileStatHidden(prev => vis ? [...prev, key] : prev.filter(k => k !== key))} aria-label={vis ? 'Hide stat' : 'Show stat'} style={{
                    width:26, height:26, borderRadius:6, border:'1px solid var(--line)',
                    background: vis ? 'var(--climb)' : 'var(--bg-raised)',
                    color: vis ? '#12151A' : 'var(--ink-faint)', cursor:'pointer', fontSize:16, lineHeight:1,
                  }}>{vis ? '\u2212' : '+'}</button>
                );
              }}
            />
            <button onClick={() => { setCourseProfileStatOrder(courseProfileStatKeys); setCourseProfileStatHidden([]); }} style={{
              marginTop:8, fontSize:11, fontFamily:'var(--mono)', color:'var(--ink-faint)', background:'none',
              border:'none', textDecoration:'underline', cursor:'pointer', padding:0,
            }}>Reset to default order</button>
              </>
            )}
          </div>
        </>
      )}

      <div style={{display:'flex', flexDirection:'column'}}>

      <div style={{order: pageSectionOrder.indexOf('header'), display: pageSectionHidden.includes('header') ? 'none' : undefined}}>
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
      </div>

      <div style={{order: pageSectionOrder.indexOf('countdown'), display: pageSectionHidden.includes('countdown') ? 'none' : undefined}}>
      {countdown ? (
        <section style={{padding:'16px 0', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', gap:24, flexWrap:'wrap'}}>
          <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', letterSpacing:'0.08em', textTransform:'uppercase', whiteSpace:'nowrap'}}>
            Countdown to Start
          </div>
          <div style={{display:'flex', gap:18, flexWrap:'wrap'}}>
            {[['days','Days','var(--climb)'],['hours','Hours','var(--descent)'],['minutes','Min','var(--db)'],['seconds','Sec','var(--ok)']].map(([key,label,color]) => (
              <div key={key} style={{display:'flex', alignItems:'baseline', gap:5}}>
                <span style={{fontFamily:'var(--display)', fontSize:19, fontWeight:700, color:color}}>
                  {String(countdown[key]).padStart(2,'0')}
                </span>
                <span style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)', textTransform:'uppercase', letterSpacing:'0.05em'}}>{label}</span>
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

      {countdown && (() => {
        const phase = getRacePrepPhase(countdown.days);
        return (
          <div style={{order: pageSectionOrder.indexOf('racePrep'), display: pageSectionHidden.includes('racePrep') ? 'none' : undefined}}>
          <section style={{padding:'28px 0', borderBottom:'1px solid var(--line)'}}>
            <div style={{display:'flex', alignItems:'baseline', gap:10, marginBottom:14, flexWrap:'wrap'}}>
              <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', letterSpacing:'0.08em', textTransform:'uppercase'}}>
                Race Prep
              </div>
              <div style={{fontFamily:'var(--display)', fontWeight:600, fontSize:16, color:'var(--climb)'}}>{phase.name}</div>
              <div style={{fontSize:12, color:'var(--ink-faint)'}}>{phase.tagline}</div>
            </div>
            <ul style={{margin:0, padding:'0 0 0 20px', display:'flex', flexDirection:'column', gap:8}}>
              {phase.items.map((item, i) => (
                <li key={i} style={{fontSize:13.5, color:'var(--ink-dim)', lineHeight:1.55}}>{item}</li>
              ))}
            </ul>
            <div style={{fontSize:11, color:'var(--ink-faint)', marginTop:14, lineHeight:1.5}}>
              General guidance, not a personalized plan -- adjust to how your own training and body are responding.
            </div>
          </section>
          </div>
        );
      })()}

      <div style={{order: pageSectionOrder.indexOf('conditions'), display: pageSectionHidden.includes('conditions') ? 'none' : undefined}}>
      <section style={{padding:'40px 0', borderBottom:'1px solid var(--line)'}}>
        <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12}}>
          Course &amp; Conditions
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:1, background:'var(--line)', marginBottom: orderedStats.some(s => s.isWeather) ? 1 : 0}}>
          {orderedStats.filter(s => !s.isWeather).map(s => <StatTile key={s.key} s={s} goTo={goTo} />)}
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:1, background:'var(--line)'}}>
          {orderedStats.filter(s => s.isWeather).map(s => <StatTile key={s.key} s={s} goTo={goTo} />)}
        </div>
      </section>
      </div>

      <div style={{order: pageSectionOrder.indexOf('raceDayForecast'), display: pageSectionHidden.includes('raceDayForecast') ? 'none' : undefined}}>
      <RaceDayForecastWidget />
      </div>

      <div style={{order: pageSectionOrder.indexOf('courseProfile'), display: pageSectionHidden.includes('courseProfile') ? 'none' : undefined}}>
      <CourseProfileChart />
      </div>

      <div style={{order: pageSectionOrder.indexOf('raceSettings'), display: pageSectionHidden.includes('raceSettings') ? 'none' : undefined}}>
      <section style={{padding:'16px 0', borderBottom: showRaceSettingsPanel ? 'none' : '1px solid var(--line)', display:'flex', alignItems:'center', gap:8}}>
        <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', letterSpacing:'0.08em', textTransform:'uppercase', flex:1}}>
          Race Settings
        </div>
        <button onClick={() => setShowRaceSettingsPanel(v => !v)} aria-label={showRaceSettingsPanel ? 'Collapse race settings' : 'Expand race settings'} title="Pace & nutrition targets, drop bag locations, race date/time/cutoff, import race info" style={{
          background:'none', border:'1px solid var(--line)', borderRadius:6, padding:'4px 10px',
          color: showRaceSettingsPanel ? 'var(--climb)' : 'var(--ink-faint)', cursor:'pointer', fontSize:12,
        }}>{showRaceSettingsPanel ? '\u2212 Hide' : '+ Edit'}</button>
      </section>

      {showRaceSettingsPanel && (
        <div style={{borderBottom:'1px solid var(--line)'}}>
          <PaceTargetsWidget />
          <DropBagConfigWidget onRaceDataChanged={onRaceDataChanged} />
          <RaceInfoImportWidget onRaceDataChanged={onRaceDataChanged} />
        </div>
      )}
      </div>

      <div style={{order: pageSectionOrder.indexOf('raceInsights'), display: pageSectionHidden.includes('raceInsights') ? 'none' : undefined}}>
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
          <div style={{background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:10, padding:12, marginBottom:20, maxWidth:520}}>
            <div style={{fontSize:11, color:'var(--ink-faint)', marginBottom:8}}>+ to show &middot; &minus; to minimize &middot; tap again to hide. Drag the handle to reorder.</div>
            <window.DragReorderList
              order={cardOrder}
              setOrder={setCardOrder}
              renderLabel={id => {
                const c = cards.find(x => x.id === id);
                if (!c) return null;
                return <React.Fragment>{c.t}{c.isCustom && <span style={{color:'var(--ink-faint)', fontSize:11}}> &#8599;</span>}</React.Fragment>;
              }}
              extraControls={id => {
                const c = cards.find(x => x.id === id);
                if (!c) return null;
                const state = getCardState(id);
                return (
                  <React.Fragment>
                    <button onClick={() => cycleCardState(id)} aria-label={`${state} \u2014 tap to cycle`} title={state} style={{
                      width:26, height:26, borderRadius:6, border:'1px solid var(--line)',
                      background: state==='shown' ? 'var(--climb)' : state==='minimized' ? 'var(--bg-raised)' : 'transparent',
                      color: state==='shown' ? '#12151A' : state==='minimized' ? '#4A9FE8' : 'var(--ink-faint)',
                      cursor:'pointer', fontSize:16, lineHeight:1,
                    }}>{state==='shown' ? '\u2212' : state==='minimized' ? '\u25FB' : '+'}</button>
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
                      }}>&#10005;</button>
                    )}
                  </React.Fragment>
                );
              }}
            />

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
