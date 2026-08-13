// GPX parsing and derived-stats computation. No external libraries --
// browser-native DOMParser handles the XML.

window.GPXParser = (function () {
  const METERS_TO_FEET = 3.28084;
  const METERS_TO_MILES = 0.000621371;
  // Raw GPS elevation is noisy -- small jitter between consecutive points
  // isn't real climbing/descending. Ignore deltas below this threshold when
  // summing gain/loss, matching the general approach tools like Strava and
  // Garmin use (their exact thresholds aren't public, so this is a
  // reasonable approximation, not a guaranteed match to any specific tool).
  const ELEVATION_NOISE_THRESHOLD_FT = 10;

  function toRad(deg) { return (deg * Math.PI) / 180; }

  function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius, meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function parse(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');

    if (doc.querySelector('parsererror')) {
      throw new Error('That file doesn\'t look like valid GPX/XML.');
    }

    const trkpts = Array.from(doc.querySelectorAll('trkpt'));
    if (trkpts.length === 0) {
      throw new Error('No track points found -- this GPX may only contain waypoints, or may be empty.');
    }

    const points = trkpts.map(pt => {
      const eleNode = pt.querySelector('ele');
      const timeNode = pt.querySelector('time');
      return {
        lat: parseFloat(pt.getAttribute('lat')),
        lon: parseFloat(pt.getAttribute('lon')),
        eleM: eleNode ? parseFloat(eleNode.textContent) : null,
        time: timeNode ? timeNode.textContent : null,
      };
    });

    const waypoints = Array.from(doc.querySelectorAll('wpt')).map(pt => {
      const nameNode = pt.querySelector('name');
      const eleNode = pt.querySelector('ele');
      return {
        lat: parseFloat(pt.getAttribute('lat')),
        lon: parseFloat(pt.getAttribute('lon')),
        name: nameNode ? nameNode.textContent : 'Waypoint',
        eleM: eleNode ? parseFloat(eleNode.textContent) : null,
      };
    });

    return { points, waypoints };
  }

  // Builds a cumulative mile-by-mile profile and summary stats from raw points.
  function computeStats(points) {
    let cumMeters = 0;
    let gainFt = 0, lossFt = 0;
    let pendingDeltaFt = 0; // accumulates sub-threshold deltas until they cross the noise threshold
    let lastEleFt = points[0].eleM != null ? points[0].eleM * METERS_TO_FEET : null;

    const profile = [{ mile: 0, elevFt: lastEleFt != null ? Math.round(lastEleFt) : null }];

    for (let i = 1; i < points.length; i++) {
      const d = haversineMeters(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
      cumMeters += d;

      const curEleFt = points[i].eleM != null ? points[i].eleM * METERS_TO_FEET : null;
      if (curEleFt != null && lastEleFt != null) {
        pendingDeltaFt += curEleFt - lastEleFt;
        if (Math.abs(pendingDeltaFt) >= ELEVATION_NOISE_THRESHOLD_FT) {
          if (pendingDeltaFt > 0) gainFt += pendingDeltaFt;
          else lossFt += Math.abs(pendingDeltaFt);
          pendingDeltaFt = 0;
        }
      }
      if (curEleFt != null) lastEleFt = curEleFt;

      profile.push({ mile: cumMeters * METERS_TO_MILES, elevFt: curEleFt != null ? Math.round(curEleFt) : null });
    }

    const elevs = points.filter(p => p.eleM != null).map(p => p.eleM * METERS_TO_FEET);

    return {
      totalMiles: Math.round(cumMeters * METERS_TO_MILES * 10) / 10,
      gainFt: Math.round(gainFt),
      lossFt: Math.round(lossFt),
      minElevFt: elevs.length ? Math.round(Math.min(...elevs)) : null,
      maxElevFt: elevs.length ? Math.round(Math.max(...elevs)) : null,
      profile,
      hasElevation: elevs.length > 0,
    };
  }

  // Matches each waypoint to the nearest track point, to determine its mile marker.
  function matchWaypointsToMiles(waypoints, points, profile) {
    return waypoints.map(wpt => {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < points.length; i++) {
        const d = haversineMeters(wpt.lat, wpt.lon, points[i].lat, points[i].lon);
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
      }
      return {
        name: wpt.name,
        mile: Math.round(profile[nearestIdx].mile * 10) / 10,
        elevFt: profile[nearestIdx].elevFt,
        matchDistanceM: Math.round(nearestDist),
      };
    }).sort((a, b) => a.mile - b.mile);
  }

  return { parse, computeStats, matchWaypointsToMiles, haversineMeters };
})();
