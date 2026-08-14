// Turns (profile + waypoints + pacing + questionnaire answers) into the
// merged per-segment view: telemetry AND strategy together, not separate.
// Generic -- works for any uploaded course, not specific to any one race,
// and doesn't assume any particular gear -- every container's capacity is
// a real input, not a hardcoded default.

window.SegmentStrategy = (function () {
  // capacities: { vestMl, bladderMl, beltOn, beltMl, extraFlasks: [{name, ml}, ...] }
  // Fills containers in order (vest, bladder, belt if on, then each extra
  // flask in the order added). Anything still unaccounted for is a real
  // shortfall -- surfaced explicitly, never silently dropped, since a
  // segment's water need can genuinely exceed whatever's being carried on
  // courses with longer or hotter stretches than any one reference race.
  function splitWater(totalMl, capacities) {
    const containers = [
      { key: 'vest', label: 'Vest', ml: capacities.vestMl || 0 },
      { key: 'bladder', label: 'Bladder', ml: capacities.bladderMl || 0 },
    ];
    if (capacities.beltOn) containers.push({ key: 'belt', label: 'Belt', ml: capacities.beltMl || 0 });
    (capacities.extraFlasks || []).forEach((f, i) => {
      containers.push({ key: 'extra' + i, label: f.name || ('Extra flask ' + (i + 1)), ml: f.ml || 0 });
    });

    let remaining = totalMl;
    const fillList = [];
    for (const c of containers) {
      const amt = Math.min(remaining, c.ml);
      fillList.push({ key: c.key, label: c.label, ml: amt, capacity: c.ml });
      remaining -= amt;
    }
    const totalCapacityMl = containers.reduce((s, c) => s + c.ml, 0);
    const shortfallMl = Math.max(0, remaining);
    return { fillList, totalCapacityMl, shortfallMl };
  }

  // waypoints: [{name, mile}, ...] already sorted ascending.
  // profile: [{mile, elevFt}, ...] from GPXParser.computeStats.
  // pacedSegments: result.segments from PaceModel.computePacing (fine-grained, per-mile-chunk).
  // answers: { targetHours, carbsPerHour, sodiumPerHour, waterPerHour, capacities }
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

      const inRange = profile.filter(p => p.mile >= fromB.snapMile - 1e-9 && p.mile <= toB.snapMile + 1e-9);
      let gainFt = 0, lossFt = 0;
      for (let j = 1; j < inRange.length; j++) {
        const d = (inRange[j].elevFt || 0) - (inRange[j - 1].elevFt || 0);
        if (d > 0) gainFt += d; else lossFt += Math.abs(d);
      }

      const chunksInRange = pacedSegments.filter(s => s.fromMile >= fromB.snapMile - 1e-9 && s.toMile <= toB.snapMile + 1e-9);
      const minutesForSeg = chunksInRange.reduce((s, c) => s + c.minutesForSeg, 0);
      const hoursForSeg = minutesForSeg / 60;

      const carbsG = Math.round(answers.carbsPerHour * hoursForSeg);
      const sodiumMg = Math.round(answers.sodiumPerHour * hoursForSeg);
      const waterMl = Math.round(answers.waterPerHour * hoursForSeg);
      const water = splitWater(waterMl, answers.capacities);

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

  return { buildSegments, splitWater };
})();
