function SectionHeader({ eyebrow, title, sub }) {
  return (
    <div style={{marginBottom:24}}>
      <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--climb)', letterSpacing:'0.08em', marginBottom:8}}>{eyebrow}</div>
      <h2 style={{fontFamily:'var(--display)', fontWeight:700, fontSize:'clamp(28px,5vw,38px)', letterSpacing:'-0.01em', margin:'0 0 8px'}}>{title}</h2>
      {sub && <p style={{fontFamily:'var(--body)', fontSize:13.5, color:'var(--ink-dim)', margin:0, lineHeight:1.6}} dangerouslySetInnerHTML={{__html: sub}} />}
    </div>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{background:'var(--bg-raised)', borderRadius:10, padding:'11px 12px'}}>
      <div style={{fontSize:10, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.04em'}}>{label}</div>
      <div style={{fontSize:16, fontWeight:600, color: color || 'var(--ink)', fontFamily:'var(--display)', marginTop:3}}>{value}</div>
      {sub && <div style={{fontSize:10, color:'var(--ink-faint)', marginTop:2}}>{sub}</div>}
    </div>
  );
}

function SmallLabel({ children, color }) {
  return (
    <div style={{fontSize:11, fontWeight:600, color: color || 'var(--ink-dim)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:'var(--mono)'}}>
      {children}
    </div>
  );
}

function buildFullCourseSamples() {
  const samples = [];
  gradeSegments.forEach(seg => {
    seg.data.forEach(d => {
      samples.push({ mile: Math.round((seg.miS + d.mile) * 100) / 100, elev: d.elev, grade: d.grade });
    });
  });
  samples.sort((a, b) => a.mile - b.mile);
  return samples;
}

// Walks the elevation profile and finds the single largest continuous
// climb streak and largest continuous descent streak (the "max climb" /
// "max descent" stat -- how big the biggest uninterrupted push is, not
// just the steepest instantaneous grade). Uses a small noise threshold
// so tiny back-and-forth wiggles don't reset the streak.
// Walks a set of samples and returns min/max elevation plus the largest
// continuous climb/descent streak within just those samples. Shared by the
// whole-course stats and the per-segment stats so both use identical logic.
function walkElevationStreaks(samples) {
  const NOISE_FT = 15;
  let min = samples[0].elev, max = samples[0].elev;
  let maxClimbStreak = 0, maxDescentStreak = 0;
  let streakStart = samples[0].elev;
  let direction = null;

  for (let i = 1; i < samples.length; i++) {
    const d = samples[i].elev - samples[i - 1].elev;
    min = Math.min(min, samples[i].elev);
    max = Math.max(max, samples[i].elev);

    const newDir = d >= 0 ? 'up' : 'down';
    if (direction === null) { direction = newDir; streakStart = samples[i - 1].elev; }
    else if (newDir !== direction) {
      const streakSize = Math.abs(samples[i - 1].elev - streakStart);
      if (streakSize >= NOISE_FT) {
        if (direction === 'up') maxClimbStreak = Math.max(maxClimbStreak, streakSize);
        else maxDescentStreak = Math.max(maxDescentStreak, streakSize);
      }
      direction = newDir;
      streakStart = samples[i - 1].elev;
    }
  }
  const finalStreak = Math.abs(samples[samples.length - 1].elev - streakStart);
  if (direction === 'up') maxClimbStreak = Math.max(maxClimbStreak, finalStreak);
  else if (direction === 'down') maxDescentStreak = Math.max(maxDescentStreak, finalStreak);

  return { min, max, maxClimbStreak: Math.round(maxClimbStreak), maxDescentStreak: Math.round(maxDescentStreak) };
}

function computeElevationStats(samples) {
  const streaks = walkElevationStreaks(samples);

  // Gain/loss come from the authoritative per-segment sums (segGain/segLoss,
  // computed from the full-resolution 3,289-point raw GPX) rather than being
  // recomputed here from the flattened 0.1-mile-binned samples -- binning
  // smooths out small elevation wiggles and undercounts the true total.
  // Min/max and climb/descent streaks stay sample-based since there's no
  // simpler authoritative source for those.
  const gain = baseSegments.reduce((a, s) => a + s.segGain, 0);
  const loss = baseSegments.reduce((a, s) => a + s.segLoss, 0);

  return { ...streaks, gain, loss };
}

// Finds which segment a given course mile falls in, using a half-open
// [miS, miE) range on every segment except none are inclusive at their own
// miE -- so a point exactly at an aid station boundary belongs to the
// segment that STARTS there, not the one that ends there, and the finish
// mile (65) naturally matches no segment at all since segment 10's own
// miE is 65.
function findSegmentForMile(mile) {
  return baseSegments.find(s => mile >= s.miS && mile < s.miE) || null;
}

// Per-segment version of computeElevationStats: uses that segment's own
// authoritative segGain/segLoss (same numbers as the Race Day Plan table)
// rather than recomputing from samples, and scopes min/max/streaks to only
// the samples within that segment's mile range.
function computeSegmentElevationStats(segment, allSamples) {
  const samples = allSamples.filter(s => s.mile >= segment.miS && s.mile <= segment.miE);
  if (samples.length === 0) return null;
  const streaks = walkElevationStreaks(samples);
  return { ...streaks, gain: segment.segGain, loss: segment.segLoss };
}

// Computes the "Sat, Aug 22, 2026 · 6:00 AM start" label directly from
// startDate every time, rather than relying on a separate startLabel field
// set once at creation -- that field going stale is exactly what happened
// when startDate was edited later but startLabel never got recomputed.
// Parses the date/time components as literal text rather than through a
// timezone-converting Date object, since a race's start time is tied to
// its own location, not the viewer's browser timezone.
function formatRaceStartLabel(race) {
  if (!race.startDate) return 'Date not set \u2014 add on Overview';
  const m = race.startDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return 'Date not set \u2014 add on Overview';
  const y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10), h = parseInt(m[4], 10), mi = parseInt(m[5], 10);
  const dateForNames = new Date(y, mo - 1, d); // local construction only, for weekday/month names -- no timezone conversion
  const weekday = dateForNames.toLocaleDateString('en-US', { weekday: 'short' });
  const monthName = dateForNames.toLocaleDateString('en-US', { month: 'short' });
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? 'AM' : 'PM';
  return `${weekday}, ${monthName} ${d}, ${y} \u00b7 ${h12}:${String(mi).padStart(2, '0')} ${period} start`;
}

function gradeColor(g) {
  if (g >= 20) return "#7B1010";
  if (g >= 15) return "#A32D2D";
  if (g >= 8)  return "#E8943A";
  if (g >= 0)  return "#3CB897";
  if (g >= -8) return "#7DD3FC";
  if (g >= -15) return "#4A9FE8";
  if (g >= -20) return "#1460A8";
  return "#0C3B6E";
}
function gradeLabel(g) {
  const ag = Math.abs(g);
  const dir = g >= 0 ? "climb" : "descent";
  if (ag >= 20) return `Very steep ${dir}`;
  if (ag >= 15) return `Steep ${dir}`;
  if (ag >= 8)  return `Moderate ${dir}`;
  return "Gentle";
}

function VesselPlanCompact({ seg, vessels, bags, labelColor }) {
  return (
    <div style={{marginBottom:14}}>
      <SmallLabel color={labelColor || 'var(--climb)'}>
        Vessel plan &mdash; {seg.tailwind}g tailwind total, refill at every aid station
      </SmallLabel>
      <div style={{background:'var(--bg-raised)', borderRadius:10, padding:'2px 14px', marginTop:8}}>
        {vessels.map((v, i) => (
          <div key={i} style={{
            display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0',
            borderTop: i>0 ? '1px solid var(--line)' : 'none', fontSize:13,
          }}>
            <span style={{color:'var(--ink-dim)'}}>{v.name} <span style={{color:'var(--ink-faint)', fontSize:11}}>({v.capacity}ml)</span></span>
            <span style={{fontWeight:600, color: v.tailwindMl > 0 ? 'var(--climb)' : 'var(--ink-faint)'}}>
              {v.tailwindMl > 0 ? `+${v.tailwindG.toFixed(0)}g tailwind` : 'water only'} <span style={{color:'var(--ink-faint)', fontWeight:400, fontSize:11}}>&middot; {Math.round(v.water)}ml</span>
            </span>
          </div>
        ))}
      </div>
      {bags.length > 0 && (
        <div style={{fontSize:11.5, color:'var(--ink-faint)', marginTop:8}}>
          Popsicle bags: {bags.map(b => `${b.grams}g (${b.vessel})`).join(', ')}
        </div>
      )}
    </div>
  );
}

function TargetStepper({ label, value, setValue, min, max, step, unit, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <SmallLabel>{label}</SmallLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => setValue(v => Math.max(min, Math.round((v - step) * 100) / 100))} style={{
          width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-raised)',
          color: 'var(--ink)', cursor: 'pointer', fontSize: 14,
        }}>&minus;</button>
        <input
          type="number" step={step} min={min} max={max} value={value}
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) setValue(Math.min(max, Math.max(min, v)));
          }}
          style={{
            width: 66, textAlign: 'center', fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600,
            background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--climb)',
            padding: '4px 6px',
          }}
        />
        <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{unit}</span>
        <button onClick={() => setValue(v => Math.min(max, Math.round((v + step) * 100) / 100))} style={{
          width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-raised)',
          color: 'var(--ink)', cursor: 'pointer', fontSize: 14,
        }}>+</button>
      </div>
      {note && <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{note}</span>}
    </div>
  );
}

// A TargetStepper for one piece of carrying gear, plus a checkbox for
// whether that vessel is even part of the kit -- not everyone runs with a
// full vest, so vest/bladder/belt/handheld are each independently
// switchable rather than always assumed present. Dims (but doesn't
// disable) the stepper when unchecked so the ml value stays visible and
// editable even while "not carried". When a segments list, range, and
// setRange are supplied and the race has more than one leg, also renders
// From/Until dropdowns so a vessel can be picked up or dropped at a
// specific aid station instead of always assumed for the whole race.
function VesselToggleStepper({ label, enabled, setEnabled, value, setValue, min, max, step, unit, note, segments, range, setRange }) {
  const selectStyle = { background:'var(--bg-raised)', border:'1px solid var(--line)', borderRadius:6, color:'var(--ink)', fontSize:11.5, padding:'3px 5px' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: enabled ? 1 : 0.5 }}>
        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} title="Carry this" style={{ cursor: 'pointer' }} />
        <TargetStepper label={label} value={value} setValue={setValue} min={min} max={max} step={step} unit={unit} note={note} />
      </div>
      {enabled && segments && segments.length > 1 && range && setRange && (
        <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:6, marginLeft:34, fontSize:11.5, color:'var(--ink-faint)' }}>
          <span>From</span>
          <select value={range.from ?? ''} onChange={e => setRange({ ...range, from: e.target.value === '' ? null : Number(e.target.value) })} style={selectStyle}>
            <option value="">Start</option>
            {segments.slice(0, -1).map(s => <option key={s.id} value={s.id + 1}>Pickup: {s.to}</option>)}
          </select>
          <span>until</span>
          <select value={range.to ?? ''} onChange={e => setRange({ ...range, to: e.target.value === '' ? null : Number(e.target.value) })} style={selectStyle}>
            {segments.map(s => <option key={s.id} value={s.id}>Drop: {s.to}</option>)}
            <option value="">Finish</option>
          </select>
        </div>
      )}
    </div>
  );
}

// Whether a vessel with the given {from, to} segment-id range is carried
// during a specific segment -- null on either end means unbounded (carried
// from the very start / kept through the finish).
function vesselActiveForSegment(range, segmentId) {
  if (!range) return true;
  if (range.from != null && segmentId < range.from) return false;
  if (range.to != null && segmentId > range.to) return false;
  return true;
}
window.vesselActiveForSegment = vesselActiveForSegment;

// Builds the {vest, bladder, belt, handheld} capacities object for one
// specific segment, given the global enabled flags/capacities/ranges --
// shared by every vesselPlan() call site so "enabled AND active for this
// segment's pickup/dropoff range" is computed identically everywhere.
function capacitiesForSegment(segmentId, cfg) {
  const r = cfg.vesselRanges || {};
  const active = (key) => vesselActiveForSegment(r[key], segmentId);
  return {
    vest: (cfg.vestEnabled && active('vest')) ? cfg.vestCapacity : 0,
    bladder: (cfg.bladderEnabled && active('bladder')) ? cfg.bladderCapacity : 0,
    belt: (cfg.beltEnabled && active('belt')) ? cfg.beltCapacity : 0,
    handheld: (cfg.handheldEnabled && active('handheld')) ? cfg.handheldCapacity : 0,
  };
}
window.capacitiesForSegment = capacitiesForSegment;

function vesselPlan(seg, capacities) {
  // Vessel capacities: vest flasks, bladder, belt flask, handheld -- each
  // independently enable-able (0 or omitted capacity means "not carrying
  // this"), since not everyone runs with a full vest. Defaults preserve the
  // original vest+bladder+belt kit if the caller passes nothing.
  // Tailwind-diluted mix goes in whichever vessel(s) fit the diluted volume most simply;
  // remaining plain water fills whatever's left, cascading through every
  // enabled vessel rather than assuming vest/bladder always exist. Shared by
  // Race Day Plan and Segments tabs so both describe the same physical gear identically.
  const c = capacities || {};
  const VEST = c.vest ?? 500;
  const BLADDER = c.bladder ?? 2000;
  const BELT = c.belt ?? 650;
  const HANDHELD = c.handheld ?? 0;
  const diluted = seg.dilutedMl;
  const plain = seg.plainMl;
  const vessels = [];

  // Fills `remaining` plain water into a priority-ordered list of vessels,
  // topping up a vessel already used for diluted mix (matched by name)
  // rather than double-adding it, and skipping any disabled (capacity<=0)
  // or already-full vessel.
  function fillPlain(remaining, chain) {
    for (const v of chain) {
      if (remaining <= 0) break;
      if (v.capacity <= 0) continue;
      const already = vessels.find(x => x.name === v.name);
      const room = v.capacity - (already ? already.water : 0);
      if (room <= 0) continue;
      const fill = Math.min(remaining, room);
      if (already) already.water += fill;
      else vessels.push({ name: v.name, capacity: v.capacity, water: fill, tailwindMl: 0 });
      remaining -= fill;
    }
    return remaining;
  }

  if (diluted === 0) {
    fillPlain(plain, [
      { name: 'Bladder', capacity: BLADDER },
      { name: 'Vest flask A', capacity: VEST },
      { name: 'Belt flask', capacity: BELT },
      { name: 'Handheld', capacity: HANDHELD },
    ]);
    return vessels;
  }

  if (VEST > 0 && diluted <= VEST) {
    vessels.push({ name: 'Vest flask A', capacity: VEST, water: diluted, tailwindMl: diluted, tailwindG: seg.tailwind });
    fillPlain(plain, [
      { name: 'Bladder', capacity: BLADDER },
      { name: 'Belt flask', capacity: BELT },
      { name: 'Handheld', capacity: HANDHELD },
    ]);
  } else if (VEST > 0 && diluted <= VEST * 2) {
    const half = diluted / 2;
    vessels.push({ name: 'Vest flask A', capacity: VEST, water: half, tailwindMl: half, tailwindG: seg.tailwind / 2 });
    vessels.push({ name: 'Vest flask B', capacity: VEST, water: half, tailwindMl: half, tailwindG: seg.tailwind / 2 });
    fillPlain(plain, [
      { name: 'Bladder', capacity: BLADDER },
      { name: 'Belt flask', capacity: BELT },
      { name: 'Handheld', capacity: HANDHELD },
    ]);
  } else if (BLADDER > 0 && diluted <= BLADDER) {
    vessels.push({ name: 'Bladder', capacity: BLADDER, water: diluted, tailwindMl: diluted, tailwindG: seg.tailwind });
    fillPlain(plain, [
      { name: 'Vest flask A', capacity: VEST },
      { name: 'Belt flask', capacity: BELT },
      { name: 'Handheld', capacity: HANDHELD },
    ]);
  } else {
    // Diluted mix is bigger than any single enabled vessel -- spread it
    // across whatever's enabled in priority order, then send any leftover
    // plain water through that same chain.
    let remaining = diluted;
    const chain = [
      { name: 'Bladder', capacity: BLADDER },
      { name: 'Belt flask', capacity: BELT },
      { name: 'Vest flask A', capacity: VEST },
      { name: 'Handheld', capacity: HANDHELD },
    ];
    for (const v of chain) {
      if (remaining <= 0 || v.capacity <= 0) continue;
      const portion = Math.min(remaining, v.capacity);
      vessels.push({ name: v.name, capacity: v.capacity, water: portion, tailwindMl: portion, tailwindG: seg.tailwind * (portion / diluted) });
      remaining -= portion;
    }
    fillPlain(plain, chain);
  }
  return vessels;
}

function popsicleBagsForVessels(vessels, maxG = 80) {
  const bags = [];
  vessels.filter(v => v.tailwindG > 0).forEach(v => {
    const g = v.tailwindG;
    if (g <= maxG) {
      bags.push({ vessel: v.name, grams: Math.round(g) });
    } else {
      const bagCount = Math.ceil(g / maxG);
      const per = g / bagCount;
      for (let i = 0; i < bagCount; i++) {
        bags.push({ vessel: v.name, grams: Math.round(per) });
      }
    }
  });
  return bags;
}

window.SectionHeader = SectionHeader;
window.StatBox = StatBox;
window.SmallLabel = SmallLabel;
window.vesselPlan = vesselPlan;
window.popsicleBagsForVessels = popsicleBagsForVessels;
window.gradeColor = gradeColor;
window.gradeLabel = gradeLabel;
window.formatRaceStartLabel = formatRaceStartLabel;
window.buildFullCourseSamples = buildFullCourseSamples;
window.computeElevationStats = computeElevationStats;
window.findSegmentForMile = findSegmentForMile;
window.computeSegmentElevationStats = computeSegmentElevationStats;
window.VesselPlanCompact = VesselPlanCompact;
window.TargetStepper = TargetStepper;
window.VesselToggleStepper = VesselToggleStepper;
