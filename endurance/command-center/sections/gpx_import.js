// ---------------------------------------------------------------------------
// GPX Import
//
// Parses a GPX file entirely client-side (no upload to any server) and
// builds baseSegments/gradeSegments in the same shape as TMR's hand-built
// data, so every existing page works unchanged once a new race is
// registered. A GPX only ever gives us the route (lat/lon/elevation) and,
// if the file includes waypoints, their names and positions -- it can
// never give us official cutoff times, drop bag contents, or gear notes,
// so those fields are filled with clearly-marked placeholders here for
// the person to fill in afterward (see races_config_panel.js).
// ---------------------------------------------------------------------------

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function metersToFeet(m) { return m * 3.28084; }

// Parses raw <trkpt>/<wpt> elements out of GPX XML text into plain JS arrays.
function parseGpxXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('Could not parse this file as GPX/XML.');

  const trkpts = [...doc.querySelectorAll('trkpt')].map(el => {
    const lat = parseFloat(el.getAttribute('lat'));
    const lon = parseFloat(el.getAttribute('lon'));
    const eleEl = el.querySelector('ele');
    const eleM = eleEl ? parseFloat(eleEl.textContent) : null;
    return { lat, lon, elevFt: eleM !== null ? metersToFeet(eleM) : null };
  }).filter(p => !isNaN(p.lat) && !isNaN(p.lon));

  const waypoints = [...doc.querySelectorAll('wpt')].map(el => {
    const lat = parseFloat(el.getAttribute('lat'));
    const lon = parseFloat(el.getAttribute('lon'));
    const nameEl = el.querySelector('name');
    return { lat, lon, name: nameEl ? nameEl.textContent.trim() : null };
  }).filter(p => !isNaN(p.lat) && !isNaN(p.lon) && p.name);

  const trkNameEl = doc.querySelector('trk > name');
  const trackName = trkNameEl ? trkNameEl.textContent.trim() : null;

  return { trkpts, waypoints, trackName };
}

// Walks the raw trackpoints and assigns cumulative mile markers, filtering
// out zero-distance duplicate points GPS devices sometimes record.
function computeCumulativeMiles(trkpts) {
  const points = [{ ...trkpts[0], mile: 0 }];
  let cum = 0;
  for (let i = 1; i < trkpts.length; i++) {
    const prev = trkpts[i - 1], cur = trkpts[i];
    const d = haversineMiles(prev.lat, prev.lon, cur.lat, cur.lon);
    if (d < 0.0005) continue; // skip near-duplicate points
    cum += d;
    points.push({ ...cur, mile: cum });
  }
  return points;
}

// Light moving-average smoothing on raw elevation -- consumer GPS elevation
// is noisy enough that unsmoothed point-to-point grades are unusable.
function smoothElevation(points, windowSize = 5) {
  const half = Math.floor(windowSize / 2);
  return points.map((p, i) => {
    if (p.elevFt === null) return p;
    const lo = Math.max(0, i - half), hi = Math.min(points.length - 1, i + half);
    let sum = 0, count = 0;
    for (let j = lo; j <= hi; j++) {
      if (points[j].elevFt !== null) { sum += points[j].elevFt; count++; }
    }
    return { ...p, elevFt: count > 0 ? sum / count : p.elevFt };
  });
}

// Resamples the smoothed track to ~0.1-mile bins, matching the format
// gradeSegments already uses everywhere else in the app. Also carries lat/lon
// through via the same linear interpolation as elevation, so later code (aid
// station precipitation, in particular) has an actual point on the ground
// for any mile along the course, not just the race's single start coordinate.
function resampleToBins(points, binSize = 0.1) {
  const totalMiles = points[points.length - 1].mile;
  const bins = [];
  let nextTarget = binSize;
  let lastElev = points[0].elevFt;
  for (let i = 1; i < points.length; i++) {
    while (points[i].mile >= nextTarget && nextTarget <= totalMiles) {
      // linear-interpolate elevation (and lat/lon) at the exact bin mile
      const p0 = points[i - 1], p1 = points[i];
      const frac = p1.mile === p0.mile ? 0 : (nextTarget - p0.mile) / (p1.mile - p0.mile);
      const elev = p0.elevFt + (p1.elevFt - p0.elevFt) * frac;
      const lat = p0.lat + (p1.lat - p0.lat) * frac;
      const lon = p0.lon + (p1.lon - p0.lon) * frac;
      bins.push({ mile: Math.round(nextTarget * 100) / 100, elev: Math.round(elev), prevElev: lastElev, lat, lon });
      lastElev = elev;
      nextTarget += binSize;
    }
  }
  // compute grade for each bin from the elevation change since the previous bin
  return bins.map((b, i) => {
    const prevMile = i === 0 ? 0 : bins[i - 1].mile;
    const distFt = (b.mile - prevMile) * 5280;
    const grade = distFt > 0 ? Math.round(((b.elev - b.prevElev) / distFt) * 1000) / 10 : 0;
    return { mile: b.mile, elev: b.elev, grade, lat: b.lat, lon: b.lon };
  });
}

// Same noise-thresholded gain/loss walk used for TMR's segGain/segLoss, so
// a GPX-imported race's numbers are computed the same way as the
// hand-built one, not a different/less-accurate method.
function computeSegGainLoss(elevSeries, noiseFt = 10) {
  let gain = 0, loss = 0, runningStart = elevSeries[0], direction = null;
  for (let i = 1; i < elevSeries.length; i++) {
    const d = elevSeries[i] - elevSeries[i - 1];
    const newDir = d >= 0 ? 'up' : 'down';
    if (direction === null) direction = newDir;
    else if (newDir !== direction) {
      const size = Math.abs(elevSeries[i - 1] - runningStart);
      if (size >= noiseFt) {
        if (direction === 'up') gain += size; else loss += size;
      }
      runningStart = elevSeries[i - 1];
      direction = newDir;
    }
  }
  const finalSize = Math.abs(elevSeries[elevSeries.length - 1] - runningStart);
  if (direction === 'up') gain += finalSize; else if (direction === 'down') loss += finalSize;
  return { gain: Math.round(gain), loss: Math.round(loss) };
}

const PLACEHOLDER_COLOR = '#E8943A';

// Builds one baseSegments-shaped + one gradeSegments-shaped entry for a
// [miS, miE) slice of the resampled bins.
function elevAtMileFromBins(bins, mile) {
  if (!bins.length) return 0;
  if (mile <= bins[0].mile) return bins[0].elev;
  for (let i = 1; i < bins.length; i++) {
    if (bins[i].mile >= mile) {
      const p0 = bins[i - 1], p1 = bins[i];
      const frac = p1.mile === p0.mile ? 0 : (mile - p0.mile) / (p1.mile - p0.mile);
      return p0.elev + (p1.elev - p0.elev) * frac;
    }
  }
  return bins[bins.length - 1].elev;
}

// Same lookup-by-mile as elevAtMileFromBins, for lat/lon instead of
// elevation -- lets any segment boundary (aid station, start, finish) be
// resolved to an actual point on the ground, for precipitation forecasting
// specifically (temperature only ever needed elevation, since it's modeled
// off a single lapse-rate adjustment; precipitation is far more
// location-specific than that).
function latLonAtMileFromBins(bins, mile) {
  if (!bins.length || bins[0].lat == null) return null;
  if (mile <= bins[0].mile) return { lat: bins[0].lat, lon: bins[0].lon };
  for (let i = 1; i < bins.length; i++) {
    if (bins[i].mile >= mile) {
      const p0 = bins[i - 1], p1 = bins[i];
      const frac = p1.mile === p0.mile ? 0 : (mile - p0.mile) / (p1.mile - p0.mile);
      return { lat: p0.lat + (p1.lat - p0.lat) * frac, lon: p0.lon + (p1.lon - p0.lon) * frac };
    }
  }
  const last = bins[bins.length - 1];
  return { lat: last.lat, lon: last.lon };
}

function buildSegment(id, fromName, toName, miS, miE, allBins, allElevAtMile) {
  const segBins = allBins.filter(b => b.mile > miS && b.mile <= miE);
  const elevS = Math.round(allElevAtMile(miS));
  const elevE = Math.round(allElevAtMile(miE));
  const elevSeries = [elevS, ...segBins.map(b => b.elev)];
  const { gain, loss } = computeSegGainLoss(elevSeries);
  const distReal = Math.round((miE - miS) * 100) / 100;
  const netFt = elevE - elevS;
  const netDir = netFt >= 0 ? 'climb' : 'descent';
  const avgGrade = distReal > 0 ? Math.round((netFt / (distReal * 5280)) * 1000) / 10 : 0;
  const grades = segBins.map(b => b.grade);
  const maxClimb = grades.length ? Math.max(...grades, 0) : 0;
  const maxDescent = grades.length ? Math.min(...grades, 0) : 0;
  const endPoint = latLonAtMileFromBins(allBins, miE);

  const base = {
    id, from: fromName, to: toName, miS: Math.round(miS*100)/100, miE: Math.round(miE*100)/100,
    dist: Math.round(miE - miS), distReal,
    avgGrade: avgGrade.toFixed(1), maxClimb: `+${maxClimb.toFixed(1)}`, maxDescent: `${maxDescent.toFixed(1)}`,
    segGain: gain, segLoss: loss,
    netFt: `${netFt >= 0 ? '+' : ''}${netFt.toLocaleString()}`, netDir,
    elevS, elevE,
    lat: endPoint ? Math.round(endPoint.lat * 1e5) / 1e5 : null,
    lon: endPoint ? Math.round(endPoint.lon * 1e5) / 1e5 : null,
    conditions: '', // GPX can't tell us weather/terrain notes -- fill in on Overview
    cutoffClock: null, cutoffHours: null, // GPX can't tell us official cutoffs -- fill in on Overview
    amenities: { water: true, food: false, dropBag: false, crew: false }, // generic placeholder
    pickup: [], dropoff: [],
    socks: '', bladder: 'Refill at every aid station',
    color: PLACEHOLDER_COLOR,
    note: '',
  };
  const grade = {
    id, from: fromName, to: toName, miS: base.miS, miE: base.miE,
    clock: null, color: PLACEHOLDER_COLOR, netDir,
    data: segBins.map(b => ({ mile: Math.round((b.mile - miS)*100)/100, elev: b.elev, grade: b.grade })),
  };
  return { base, grade };
}

// Rebuilds baseSegments/gradeSegments for a new set of boundaries/names,
// straight from the persisted elevation bins -- used both by the initial
// GPX import (below) and later, whenever aid station mile markers get
// corrected against a real race document once the actual numbers are
// known (see overview.js's DropBagConfigWidget). Keeping this independent
// of parseGpxToRace's own local closures is what makes the later case
// possible at all -- the original per-file smoothed/cum arrays don't
// survive past import, but elevationBins (0.1mi resolution) does.
function recomputeSegmentsFromBins(bins, boundaries, names) {
  const elevAtMile = mile => elevAtMileFromBins(bins, mile);
  const baseSegments = [];
  const gradeSegments = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const { base, grade } = buildSegment(i + 1, names[i], names[i + 1], boundaries[i], boundaries[i + 1], bins, elevAtMile);
    baseSegments.push(base);
    gradeSegments.push(grade);
  }
  return { baseSegments, gradeSegments };
}
window.recomputeSegmentsFromBins = recomputeSegmentsFromBins;

// Main entry point: takes raw GPX file text, returns { baseSegments,
// gradeSegments, totalDistance, totalGain, totalLoss, trackName,
// detectedAidStations }, or throws with a person-readable message on
// anything unparseable.
function parseGpxToRace(xmlText) {
  const { trkpts, waypoints, trackName } = parseGpxXml(xmlText);
  if (trkpts.length < 10) {
    throw new Error('This file has too few track points to build a course profile. Make sure you exported the full track, not just a summary.');
  }

  const cum = computeCumulativeMiles(trkpts);
  const smoothed = smoothElevation(cum, 5);
  const bins = resampleToBins(smoothed, 0.1);
  const totalDistance = Math.round(smoothed[smoothed.length - 1].mile * 100) / 100;

  // Match GPX waypoints to their nearest point on the track (by straight-line
  // lat/lon distance), giving each a mile marker. Waypoints far from the
  // track (>0.3mi away -- e.g. a trailhead parking pin) are dropped rather
  // than misplacing a segment boundary.
  //
  // Two things make this trickier than plain nearest-neighbor: waypoints
  // are matched in course order (mile >= the previous match) rather than
  // searched globally, since an out-and-back or loop course passes the
  // same physical location more than once (an aid station visited outbound
  // and inbound sits at nearly identical lat/lon both times) and a global
  // search can match two different waypoints to the same trackpoint,
  // silently losing one to the de-dupe step below. And within that forward
  // search, the *first* point found within a tight distance wins, rather
  // than the true minimum across the whole remaining track -- on a course
  // that re-crosses its own path, a later pass can come out marginally
  // closer by mere feet than the intended occurrence, which a "find the
  // global minimum" search would wrongly prefer. Falls back to a true
  // nearest-within-0.3mi search if nothing is found within the tight
  // threshold, preserving the original tolerance for a waypoint that's
  // genuinely just imprecisely placed (a hand-dropped pin, GPS drift).
  const TIGHT_MATCH_MILES = 0.05;
  const LOOSE_MATCH_MILES = 0.3;
  const detectedAidStations = [];
  let minMile = 0;
  for (const wp of waypoints) {
    let best = null;
    for (const pt of smoothed) {
      if (pt.mile < minMile) continue;
      if (haversineMiles(wp.lat, wp.lon, pt.lat, pt.lon) <= TIGHT_MATCH_MILES) { best = pt; break; }
    }
    if (!best) {
      let bestDist = Infinity;
      let candidate = null;
      for (const pt of smoothed) {
        if (pt.mile < minMile) continue;
        const d = haversineMiles(wp.lat, wp.lon, pt.lat, pt.lon);
        if (d < bestDist) { bestDist = d; candidate = pt; }
      }
      if (candidate && bestDist <= LOOSE_MATCH_MILES) best = candidate;
    }
    if (best) {
      detectedAidStations.push({ name: wp.name, mile: Math.round(best.mile * 100) / 100 });
      minMile = best.mile;
    }
  }
  detectedAidStations.sort((a, b) => a.mile - b.mile);
  // de-dupe stations that landed within 0.15mi of each other or of the
  // start/finish (common when a waypoint sits right at the trailhead)
  const dedupedStations = [];
  for (const s of detectedAidStations) {
    if (s.mile < 0.15 || s.mile > totalDistance - 0.15) continue;
    if (dedupedStations.length && s.mile - dedupedStations[dedupedStations.length-1].mile < 0.15) continue;
    dedupedStations.push(s);
  }

  // Build segment boundaries: Start -> each detected aid station -> Finish.
  // If no waypoints were usable, fall back to splitting into 10 roughly
  // equal segments so the app still has something to render -- the person
  // can rename/adjust these manually afterward.
  let boundaries;
  let names;
  if (dedupedStations.length > 0) {
    boundaries = [0, ...dedupedStations.map(s => s.mile), totalDistance];
    names = ['Start', ...dedupedStations.map(s => s.name), 'Finish'];
  } else {
    const n = 10;
    boundaries = Array.from({ length: n + 1 }, (_, i) => Math.round((totalDistance / n) * i * 100) / 100);
    names = ['Start', ...Array.from({ length: n - 1 }, (_, i) => `Mile ${boundaries[i+1]}`), 'Finish'];
  }

  const { baseSegments, gradeSegments } = recomputeSegmentsFromBins(bins, boundaries, names);

  const totalGain = baseSegments.reduce((a, s) => a + s.segGain, 0);
  const totalLoss = baseSegments.reduce((a, s) => a + s.segLoss, 0);

  return {
    baseSegments, gradeSegments, totalDistance, totalGain, totalLoss,
    trackName, usedWaypoints: dedupedStations.length > 0, aidStationCount: dedupedStations.length,
    startLat: smoothed[0].lat, startLon: smoothed[0].lon,
    // 0.1mi-resolution elevation samples, kept around (not just used to
    // build the initial segments and discarded) so aid station mile
    // markers can be corrected later against a real race document and
    // have gain/loss/grade recomputed accurately for the new boundaries,
    // rather than just relabeled. See recomputeSegmentsFromBins above.
    elevationBins: bins,
  };
}

window.parseGpxToRace = parseGpxToRace;
