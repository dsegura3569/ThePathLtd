// ---------------------------------------------------------------------------
// Pace + nutrition model. Runs entirely client-side so the target finish
// time is adjustable on the site without touching terrain data (distance,
// elevation, grade) which comes straight from GPX and never changes.
// ---------------------------------------------------------------------------

const WATER_BANDS = [480, 520, 650, 650, 580, 520, 450, 400, 400, 420]; // ml/hr baseline by segment
const GEL_RATES = [2, 3, 2, 3, 2, 2, 1, 1, 3, 2];   // gels/hr, terrain-based (2-3 on the real climbs)
// Baseline per-segment carb targets at a default 80g/hr overall setting --
// segments 7/8 sit lower for appetite reasons (dusk/deep night). When the
// user picks a different overall target, this whole array scales
// proportionally so that relative dip is preserved.
const BASE_CARB_TARGETS = [80, 80, 80, 80, 80, 80, 65, 60, 80, 75];
const BASE_CARB_HR = 80;
const BASE_SODIUM_HR = 700;

const SCOOP_G = 27, CARB_PER_SCOOP = 25, NA_PER_SCOOP = 310, GEL_CARB = 22; // SIS GO Isotonic
const CAP_NA = 215, CAP_NA_CAFFEINE = 190, CAP_CAFFEINE_MG = 30;

function gradeFactor(grade) {
  if (grade >= 0) return 1 + 0.05 * grade;
  const ag = Math.abs(grade);
  if (ag <= 8) return Math.max(0.85, 1 - 0.025 * ag);
  return 0.85 + 0.02 * (ag - 8);
}

function altitudeFactor(avgElevFt) {
  const baseline = 9000;
  return 1 + Math.max(0, (avgElevFt - baseline) / 1000) * 0.035;
}

function calibratedHours(targetTotalHours) {
  // binary-search a flat base pace so grade+altitude-adjusted total hits the target
  function totalFor(basePace) {
    return baseSegments.reduce((sum, s) => {
      const avgElev = (s.elevS + s.elevE) / 2;
      const pace = basePace * gradeFactor(parseFloat(s.avgGrade)) * altitudeFactor(avgElev);
      return sum + (pace * s.distReal) / 60;
    }, 0);
  }
  let lo = 5, hi = 40;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (totalFor(mid) < targetTotalHours) lo = mid; else hi = mid;
  }
  const basePace = (lo + hi) / 2;
  return baseSegments.map(s => {
    const avgElev = (s.elevS + s.elevE) / 2;
    const pace = basePace * gradeFactor(parseFloat(s.avgGrade)) * altitudeFactor(avgElev);
    return (pace * s.distReal) / 60;
  });
}

function hToClockParts(h) {
  const dayOffset = Math.floor(h / 24);
  const hMod = ((h % 24) + 24) % 24;
  let hh = Math.floor(hMod);
  let mm = Math.round((hMod - hh) * 60);
  if (mm === 60) { mm = 0; hh += 1; }
  const period = hh < 12 ? 'am' : 'pm';
  let hh12 = hh % 12; if (hh12 === 0) hh12 = 12;
  const day = dayOffset >= 1 ? 'Sun' : 'Sat';
  return { day, hh12, mm, period, hh24: hh, dayOffset };
}

function fmtClock(h) {
  const p = hToClockParts(h);
  return `${p.day} ${p.hh12}:${String(p.mm).padStart(2, '0')}${p.period}`;
}

function fmtHm(h) {
  const hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  return mm ? `${hh}h${String(mm).padStart(2, '0')}m` : `${hh}h`;
}

function computeDerivedSegments(targetTotalHours, targetCarbHr = BASE_CARB_HR, targetSodiumHr = BASE_SODIUM_HR) {
  const carbScale = targetCarbHr / BASE_CARB_HR;
  const CARB_TARGETS = BASE_CARB_TARGETS.map(c => Math.round(c * carbScale));
  const hoursList = calibratedHours(targetTotalHours);

  // First pass: clock times, to determine which segments actually span the
  // caffeine window (midnight to +4h, capped at sunrise ~6:30am) under THIS
  // pace -- not hardcoded to specific segment numbers, since a faster or
  // slower target shifts exactly when midnight falls.
  let cum = 0;
  const clockRanges = hoursList.map(h => {
    const startClock = 6.0 + cum;
    cum += h;
    const endClock = 6.0 + cum;
    return { startClock, endClock };
  });
  const SUNRISE_H = 30.5; // 6:30am next day, i.e. 24 + 6.5
  const caffeineSegIdx = new Set();
  clockRanges.forEach((r, i) => {
    // does [start,end] overlap [24 (midnight), min(24+4, sunrise)]?
    const windowStart = 24, windowEnd = Math.min(24 + 4, SUNRISE_H);
    if (r.endClock > windowStart && r.startClock < windowEnd) caffeineSegIdx.add(i);
  });

  return baseSegments.map((s, i) => {
    const hours = hoursList[i];
    const { startClock, endClock } = clockRanges[i];
    const clockS = fmtClock(startClock);
    const clockE = fmtClock(endClock);
    const time = fmtHm(hours);
    const avgPaceMin = (hours * 60) / s.distReal;
    const paceMm = Math.floor(avgPaceMin);
    const paceSs = Math.round((avgPaceMin - paceMm) * 60);
    const avgPace = `${paceMm}:${String(paceSs).padStart(2, '0')}`;
    const avgMph = (s.distReal / hours).toFixed(1);

    const gelsHr = GEL_RATES[i];
    const carbHr = CARB_TARGETS[i];
    const gels = Math.round(hours * gelsHr);
    const gelCarbsTotal = gels * GEL_CARB;
    const carbTargetTotal = hours * carbHr;
    const twCarbNeeded = Math.max(0, carbTargetTotal - gelCarbsTotal);
    const scoops = twCarbNeeded / CARB_PER_SCOOP;
    const tailwind = scoops * SCOOP_G;

    let conc = 0.0675;
    const waterTarget = hours * WATER_BANDS[i];
    let dilutedMl = tailwind > 0 ? tailwind / conc : 0;
    if (dilutedMl > waterTarget && tailwind > 0) {
      conc = 0.08;
      dilutedMl = tailwind / conc;
    }
    const plainMl = Math.max(0, waterTarget - dilutedMl);
    const actualCarbHr = Math.round(((gelCarbsTotal + twCarbNeeded) / hours) * 10) / 10;

    const isCaffeine = caffeineSegIdx.has(i);
    const naTwHr = hours > 0 ? (scoops * NA_PER_SCOOP) / hours : 0;
    const capNaUse = isCaffeine ? CAP_NA_CAFFEINE : CAP_NA;
    const gapHr = Math.max(0, targetSodiumHr - naTwHr);
    const capsHr = Math.round((gapHr / capNaUse) * 2) / 2;
    const saltCaps = Math.round(capsHr * hours);
    const sodiumHr = Math.round(naTwHr + capsHr * capNaUse);
    const caffeineHr = isCaffeine ? Math.round(capsHr * CAP_CAFFEINE_MG) : 0;

    const modeledArrivalHours = endClock - 6.0;
    const cutoffMarginHours = s.cutoffHours - modeledArrivalHours;

    return {
      ...s,
      hours, clockS, clockE, time, avgPace, avgMph,
      tailwind: Math.round(tailwind), waterMl: Math.round(dilutedMl + plainMl),
      dilutedMl: Math.round(dilutedMl), plainMl: Math.round(plainMl), tailwindConc: conc,
      gels, gelsPerHr: gelsHr, carbTargetHr: carbHr, actualCarbHr,
      saltCaps, saltCapType: isCaffeine ? 'caffeine' : 'original', sodiumHr, caffeineHr,
      modeledArrivalHours: Math.round(modeledArrivalHours * 100) / 100,
      cutoffMarginHours: Math.round(cutoffMarginHours * 100) / 100,
    };
  });
}

window.computeDerivedSegments = computeDerivedSegments;
