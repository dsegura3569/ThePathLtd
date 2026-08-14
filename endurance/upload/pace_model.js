// Grade-adjusted pacing, based on the general shape of Minetti's metabolic
// cost of running research (Minetti et al. 2002, J Appl Physiol) -- running
// costs more per % of uphill grade than it saves per % of gentle downhill,
// and very steep descents (beyond roughly -20%) become costly again due to
// eccentric braking. This is a general research-grounded approximation, NOT
// a personalized model -- it isn't calibrated to any specific runner's data
// (unlike TMR's dashboard, which used the runner's own Strava history).
// Different tools (Strava, Garmin, etc.) use their own specific formulas and
// will show different numbers for the same effort; treat this as a
// reasonable planning starting point, not a precise prediction.

window.PaceModel = (function () {
  // Relative cost factor for a given grade (in percent, e.g. 8 for 8% uphill).
  // 1.0 = same cost as flat ground.
  function costFactor(gradePercent) {
    if (gradePercent >= 0) {
      return 1 + 0.025 * gradePercent; // +2.5% cost per 1% of climb
    }
    if (gradePercent >= -20) {
      return 1 + 0.015 * gradePercent; // -1.5% cost per 1% of moderate descent (gradePercent is negative)
    }
    // Beyond -20%, braking cost rises back up. Anchor at the -20% value
    // (0.70) and climb back toward/through 1.0 for very steep descents.
    const base = 1 + 0.015 * -20; // 0.70
    return base + 0.03 * (-20 - gradePercent);
  }

  // Given an array of {mile, elevFt} profile points and a target total
  // finish time (hours), compute grade-adjusted pace per mile, then scale
  // so the total time matches the target exactly.
  function computePacing(profile, targetHours) {
    if (profile.length < 2) throw new Error('Need at least 2 profile points to compute pacing.');

    // Build per-mile-ish segments with their grade and a cost weight.
    const segments = [];
    for (let i = 1; i < profile.length; i++) {
      const distMi = profile[i].mile - profile[i - 1].mile;
      if (distMi <= 0) continue;
      const elevDeltaFt = (profile[i].elevFt || 0) - (profile[i - 1].elevFt || 0);
      const gradePercent = (elevDeltaFt / (distMi * 5280)) * 100;
      const weight = costFactor(gradePercent) * distMi;
      segments.push({ fromMile: profile[i - 1].mile, toMile: profile[i].mile, distMi, gradePercent, weight });
    }

    const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
    const totalDist = segments.reduce((s, seg) => s + seg.distMi, 0);
    const targetMinutes = targetHours * 60;

    // Each segment's share of total time is proportional to its weight.
    let cumMinutes = 0;
    const paced = segments.map(seg => {
      const minutesForSeg = (seg.weight / totalWeight) * targetMinutes;
      const paceMinPerMi = minutesForSeg / seg.distMi;
      cumMinutes += minutesForSeg;
      return { ...seg, minutesForSeg, paceMinPerMi, cumMinutes };
    });

    return { segments: paced, totalDist, totalWeight, targetMinutes };
  }

  function formatPace(minPerMi) {
    const m = Math.floor(minPerMi);
    const s = Math.round((minPerMi - m) * 60);
    return `${m}:${String(s).padStart(2, '0')}/mi`;
  }

  return { costFactor, computePacing, formatPace };
})();
