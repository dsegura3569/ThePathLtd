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
function computeElevationStats(samples) {
  const NOISE_FT = 15;
  let min = samples[0].elev, max = samples[0].elev;
  let gain = 0, loss = 0;
  let maxClimbStreak = 0, maxDescentStreak = 0;
  let streakStart = samples[0].elev;
  let direction = null; // 'up' | 'down'

  for (let i = 1; i < samples.length; i++) {
    const d = samples[i].elev - samples[i - 1].elev;
    min = Math.min(min, samples[i].elev);
    max = Math.max(max, samples[i].elev);
    if (d > 0) gain += d; else loss += -d;

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

  return { min, max, gain: Math.round(gain), loss: Math.round(loss), maxClimbStreak: Math.round(maxClimbStreak), maxDescentStreak: Math.round(maxDescentStreak) };
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

function vesselPlan(seg) {
  // Vessel capacities: two 500ml vest flasks, one 2000ml bladder, one 650ml belt flask.
  // Tailwind-diluted mix goes in whichever vessel(s) fit the diluted volume most simply;
  // remaining plain water fills whatever's left. Shared by Race Day Plan and Segments
  // tabs so both describe the same physical gear identically.
  const VEST = 500, BLADDER = 2000, BELT = 650;
  const diluted = seg.dilutedMl;
  const plain = seg.plainMl;
  const vessels = [];

  if (diluted === 0) {
    let remaining = plain;
    const bladderFill = Math.min(remaining, BLADDER);
    if (bladderFill > 0) { vessels.push({ name: 'Bladder', capacity: BLADDER, water: bladderFill, tailwindMl: 0 }); remaining -= bladderFill; }
    const vestFill = Math.min(remaining, VEST);
    if (vestFill > 0) { vessels.push({ name: 'Vest flask A', capacity: VEST, water: vestFill, tailwindMl: 0 }); remaining -= vestFill; }
    return vessels;
  }

  if (diluted <= VEST) {
    vessels.push({ name: 'Vest flask A', capacity: VEST, water: diluted, tailwindMl: diluted, tailwindG: seg.tailwind });
    if (plain > 0) vessels.push({ name: 'Bladder', capacity: BLADDER, water: Math.min(plain, BLADDER), tailwindMl: 0 });
  } else if (diluted <= VEST * 2) {
    const half = diluted / 2;
    vessels.push({ name: 'Vest flask A', capacity: VEST, water: half, tailwindMl: half, tailwindG: seg.tailwind / 2 });
    vessels.push({ name: 'Vest flask B', capacity: VEST, water: half, tailwindMl: half, tailwindG: seg.tailwind / 2 });
    if (plain > 0) vessels.push({ name: 'Bladder', capacity: BLADDER, water: Math.min(plain, BLADDER), tailwindMl: 0 });
  } else if (diluted <= BLADDER) {
    vessels.push({ name: 'Bladder', capacity: BLADDER, water: diluted, tailwindMl: diluted, tailwindG: seg.tailwind });
    if (plain > 0) vessels.push({ name: 'Vest flask A', capacity: VEST, water: Math.min(plain, VEST), tailwindMl: 0 });
  } else {
    const bladderPortion = BLADDER;
    const beltPortion = Math.min(diluted - BLADDER, BELT);
    const bladderG = seg.tailwind * (bladderPortion / diluted);
    const beltG = seg.tailwind * (beltPortion / diluted);
    vessels.push({ name: 'Bladder', capacity: BLADDER, water: bladderPortion, tailwindMl: bladderPortion, tailwindG: bladderG });
    vessels.push({ name: 'Belt flask', capacity: BELT, water: beltPortion, tailwindMl: beltPortion, tailwindG: beltG });
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
window.buildFullCourseSamples = buildFullCourseSamples;
window.computeElevationStats = computeElevationStats;
