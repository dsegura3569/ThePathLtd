// Turns (profile + waypoints + pacing + questionnaire answers) into the
// merged per-segment view: telemetry AND strategy together, not separate.
// Generic -- works for any uploaded course, not specific to any one race.

window.SegmentStrategy = (function () {
  const VEST_ML = 1000;   // 2x500ml
  const BLADDER_ML = 1500;
  const BELT_ML = 650;

  // Same split logic verified for TMR: fill vest first, remainder to
  // bladder, only spill into belt if it's on AND still needed beyond
  // vest+bladder combined (2500ml). Anything still left over (shortfall)
  // means this segment's water need exceeds total carrying capacity --
  // surfaced explicitly rather than silently dropped, since that's a real
  // possibility on courses with longer or hotter stretches than TMR's,
  // where this case never actually came up.
  function splitWater(totalMl, beltOn) {
    const vestMl = Math.min(totalMl, VEST_ML);
    const afterVest = Math.max(0, totalMl - VEST_ML);
    const bladderMl = Math.min(afterVest, BLADDER_ML);
    const afterBladder = Math.max(0, afterVest - BLADDER_ML);
    const beltMl = beltOn ? Math.min(afterBladder, BELT_ML) : 0;
    const shortfallMl = Math.max(0, afterBladder - beltMl);
    return { vestMl, bladderMl, beltMl, shortfallMl };
  }

  // waypoints: [{name, mile}, ...] already sorted ascending.
  // profile: [{mile, elevFt}, ...] from GPXParser.computeStats.
  // pacedSegments: result.segments from PaceModel.computePacing (fine-grained, per-mile-chunk).
  // answers: { targetHours, carbsPerHour, sodiumPerHour, waterPerHour, beltOn }
  function buildSegments(waypoints, profile, pacedSegments, totalMiles, answers) {
    // Waypoint mile values are rounded for display (e.g. 0.7), but the real
    // chunk boundaries built from the raw GPX track rarely land on a round
    // number (e.g. 0.6909). Filtering chunks by the rounded boundary directly
    // can leave a sliver of a chunk matching neither segment -- its time
    // (and nutrition/hydration built from that time) would silently vanish
    // rather than being double-counted or warned about. Snap each boundary
    // to the nearest *actual* profile mile before using it for chunk
    // filtering, so segment ranges always align exactly with a real chunk
    // edge; keep the original (rounded, human-friendly) name/mile for display.
    function nearestProfileMile(targetMile) {
      let nearest = profile[0].mile, minDiff = Math.abs(profile[0].mile - targetMile);
      for (const p of profile) {
        const diff = Math.abs(p.mile - targetMile);
        if (diff < minDiff) { minDiff = diff; nearest = p.mile; }
      }
      return nearest;
    }

    const boundaries = [{ name: 'Start', mile: 0, snapMile: 0 }];
    waypoints.forEach(w => {
      if (w.mile > 0 && w.mile < totalMiles) boundaries.push({ name: w.name, mile: w.mile, snapMile: nearestProfileMile(w.mile) });
    });
    boundaries.push({ name: 'Finish', mile: totalMiles, snapMile: profile[profile.length - 1].mile });

    const segments = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const fromB = boundaries[i], toB = boundaries[i + 1];
      const distMi = toB.mile - fromB.mile;
      if (distMi <= 0) continue;

      // Elevation gain/loss within this mile range, from the raw profile.
      const inRange = profile.filter(p => p.mile >= fromB.snapMile - 1e-9 && p.mile <= toB.snapMile + 1e-9);
      let gainFt = 0, lossFt = 0;
      for (let j = 1; j < inRange.length; j++) {
        const d = (inRange[j].elevFt || 0) - (inRange[j - 1].elevFt || 0);
        if (d > 0) gainFt += d; else lossFt += Math.abs(d);
      }

      // Sum time from the fine-grained paced chunks that fall in this range,
      // using the snapped (exact profile) boundaries so no chunk is missed.
      const chunksInRange = pacedSegments.filter(s => s.fromMile >= fromB.snapMile - 1e-9 && s.toMile <= toB.snapMile + 1e-9);
      const minutesForSeg = chunksInRange.reduce((s, c) => s + c.minutesForSeg, 0);
      const hoursForSeg = minutesForSeg / 60;

      const carbsG = Math.round(answers.carbsPerHour * hoursForSeg);
      const sodiumMg = Math.round(answers.sodiumPerHour * hoursForSeg);
      const waterMl = Math.round(answers.waterPerHour * hoursForSeg);
      const water = splitWater(waterMl, answers.beltOn);
      const concPerMl = waterMl > 0 ? carbsG / waterMl : 0; // approximating carb source concentration for context, not a specific product

      segments.push({
        id: i + 1,
        from: fromB.name, to: toB.name,
        fromMile: fromB.mile, toMile: toB.mile, distMi: Math.round(distMi * 10) / 10,
        gainFt: Math.round(gainFt), lossFt: Math.round(lossFt),
        minutesForSeg: Math.round(minutesForSeg),
        hoursForSeg,
        avgPaceMinPerMi: minutesForSeg / distMi,
        carbsG, sodiumMg, waterMl, water,
        elevStart: inRange.length ? inRange[0].elevFt : null,
        elevEnd: inRange.length ? inRange[inRange.length - 1].elevFt : null,
      });
    }
    return segments;
  }

  return { buildSegments, splitWater, VEST_ML, BLADDER_ML, BELT_ML };
})();
