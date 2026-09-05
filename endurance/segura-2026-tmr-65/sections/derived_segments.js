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
const BASE_WATER_HR = 500; // matches roughly the average of WATER_BANDS

// These four baseline arrays were hand-tailored to TMR's exact 10 segments
// (terrain, altitude, time-of-day). For any other race -- a different
// segment count from an uploaded GPX -- indexing past position 9 would
// silently return undefined and propagate as NaN through the whole
// nutrition plan. safeBaselineArray only uses the tailored array when the
// segment count actually matches; otherwise it falls back to a flat array
// (every segment gets the same base rate) sized correctly, which is the
// honest option anyway since we have no terrain-appropriate reason to vary
// an arbitrary uploaded course's per-segment nutrition the way TMR's was.
function safeBaselineArray(templateArray, length, flatDefault) {
  if (length === templateArray.length) return templateArray;
  return Array(length).fill(flatDefault);
}

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
  const hoursList = baseSegments.map(s => {
    const avgElev = (s.elevS + s.elevE) / 2;
    const pace = basePace * gradeFactor(parseFloat(s.avgGrade)) * altitudeFactor(avgElev);
    return (pace * s.distReal) / 60;
  });
  return { hoursList, basePace };
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

function computeDerivedSegments(targetTotalHours, targetCarbHr = BASE_CARB_HR, targetSodiumHr = BASE_SODIUM_HR, targetWaterHr = BASE_WATER_HR, gelRateShift = 0) {
  const numSegments = baseSegments.length;
  const carbScale = targetCarbHr / BASE_CARB_HR;
  const CARB_TARGETS = safeBaselineArray(BASE_CARB_TARGETS, numSegments, BASE_CARB_HR).map(c => Math.round(c * carbScale));
  // gelRateShift is the "Gels <-> Tailwind" quick-convert: positive shifts
  // more of the fixed carb target onto gels (fewer scoops of tailwind
  // needed), negative shifts it onto tailwind (fewer gels) -- the overall
  // carb/hr target itself never changes, only which product supplies it.
  const SAFE_GEL_RATES = safeBaselineArray(GEL_RATES, numSegments, 2).map(r => Math.max(0, r + gelRateShift));
  const waterScale = targetWaterHr / BASE_WATER_HR;
  const SAFE_WATER_BANDS = safeBaselineArray(WATER_BANDS, numSegments, BASE_WATER_HR).map(w => Math.round(w * waterScale));
  const { hoursList, basePace } = calibratedHours(targetTotalHours);

  // Per-segment average grade and pace split by climbing vs descending,
  // computed from the real 0.1-mile profile samples (gradeSegments) rather
  // than the single net avg grade -- redistributes each segment's total
  // time across its samples proportionally to each sample's own difficulty
  // (grade + altitude), so the up/down pace split stays internally
  // consistent with the segment's overall calibrated time.
  const upDownStats = baseSegments.map((s, i) => {
    const gSeg = gradeSegments[i];
    if (!gSeg || !gSeg.data || gSeg.data.length === 0) {
      return { avgGradeUp: null, avgGradeDown: null, avgPaceUpMin: null, avgPaceDownMin: null };
    }
    const samples = gSeg.data.map(d => ({
      grade: d.grade,
      factor: gradeFactor(d.grade) * altitudeFactor(d.elev),
    }));
    const segAvgFactor = samples.reduce((a, x) => a + x.factor, 0) / samples.length;
    const segAvgPaceMin = (hoursList[i] * 60) / s.distReal;
    const upSamples = samples.filter(x => x.grade > 0);
    const downSamples = samples.filter(x => x.grade < 0);
    const avg = (arr, key) => arr.length ? arr.reduce((a, x) => a + x[key], 0) / arr.length : null;
    const avgGradeUp = avg(upSamples, 'grade');
    const avgGradeDown = avg(downSamples, 'grade');
    const avgPaceUpMin = upSamples.length ? segAvgPaceMin * (avg(upSamples, 'factor') / segAvgFactor) : null;
    const avgPaceDownMin = downSamples.length ? segAvgPaceMin * (avg(downSamples, 'factor') / segAvgFactor) : null;
    return { avgGradeUp, avgGradeDown, avgPaceUpMin, avgPaceDownMin };
  });

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

  let dropBagCounter = 0;
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

    const gelsHr = SAFE_GEL_RATES[i];
    const carbHr = CARB_TARGETS[i];
    const gels = Math.round(hours * gelsHr);
    const gelCarbsTotal = gels * GEL_CARB;
    const carbTargetTotal = hours * carbHr;
    const twCarbNeeded = Math.max(0, carbTargetTotal - gelCarbsTotal);
    const scoops = twCarbNeeded / CARB_PER_SCOOP;
    const tailwind = scoops * SCOOP_G;

    let conc = 0.0675;
    const waterTarget = hours * SAFE_WATER_BANDS[i];
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

    const ud = upDownStats[i];
    function fmtPace(min) {
      if (min === null) return null;
      const mm = Math.floor(min);
      const ss = Math.round((min - mm) * 60);
      return `${mm}:${String(ss).padStart(2, '0')}`;
    }

    const totalCarbsG = actualCarbHr * hours;
    const calories = Math.round(totalCarbsG * 4); // 4 kcal/g carb -- matches both SIS GO (87kcal/22g) and Tailwind (100kcal/25g) label ratios exactly
    const caloriesPerHr = Math.round(actualCarbHr * 4);
    const waterMlTotal = Math.round(dilutedMl + plainMl);
    const waterMlPerHr = Math.round(waterMlTotal / hours);

    // Sequential drop bag number (1, 2, 3...) assigned in course order to
    // whichever segments are actually flagged amenities.dropBag=true for
    // THIS race -- not derived from the segment's name text, which was a
    // TMR-specific pattern ("Drop Bag #1" literally in the name) that
    // never matched any other race's real segment names.
    const dropBagNum = s.amenities && s.amenities.dropBag ? ++dropBagCounter : null;

    return {
      ...s,
      dropBagNum,
      hours, clockS, clockE, time, avgPace, avgMph,
      tailwind: Math.round(tailwind), waterMl: waterMlTotal, waterMlPerHr,
      dilutedMl: Math.round(dilutedMl), plainMl: Math.round(plainMl), tailwindConc: conc,
      gels, gelsPerHr: gelsHr, carbTargetHr: carbHr, actualCarbHr, calories, caloriesPerHr,
      saltCaps, saltCapType: isCaffeine ? 'caffeine' : 'original', sodiumHr, caffeineHr,
      modeledArrivalHours: Math.round(modeledArrivalHours * 100) / 100,
      cutoffMarginHours: Math.round(cutoffMarginHours * 100) / 100,
      avgGradeUp: ud.avgGradeUp !== null ? Math.round(ud.avgGradeUp * 10) / 10 : null,
      avgGradeDown: ud.avgGradeDown !== null ? Math.round(ud.avgGradeDown * 10) / 10 : null,
      avgPaceUp: fmtPace(ud.avgPaceUpMin),
      avgPaceDown: fmtPace(ud.avgPaceDownMin),
    };
  });
}

window.computeDerivedSegments = computeDerivedSegments;
