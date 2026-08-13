const comparisonRaces = [
  {
    id: "jemez",
    name: "Jemez Mountain Trail Run 50km",
    date: "May 10, 2025",
    location: "Los Alamos, NM",
    distance: 31.1,
    distanceKm: 50,
    gain: 6800,
    loss: 6800,
    gainPerMile: 219,
    highPoint: 10400,
    lowPoint: 7000,
    avgElev: 8700,
    elevRange: 3400,
    cutoff: "~14.5 hrs (8:20pm finish)",
    terrain: "Technical volcanic singletrack, scree fields, stream crossings, fallen trees",
    character: "Two major climbs above 10,000 ft. Steep sustained ascents and descents on rocky, rooted trail. Long stretches >5 miles between some aid stations.",
    aidStations: [
      { name: "El Cajete", mile: 3 },
      { name: "Camp May Road", mile: 21.7, cutoff: "3:00pm" },
      { name: "Pipeline", mile: "~26" },
      { name: "Ice Rink", mile: 24.7, cutoff: "5:00pm" },
      { name: "Mitchell", mile: 27.9, cutoff: "8:20pm" },
      { name: "Finish — Posse Lodge", mile: 31.1 },
    ],
    dropBags: "Available at Mitchell aid station",
    color: "#7B2D00",
    badge: "bg-amber",
    tmrComparison: "More vert per mile than TMR front half. Altitude (7K–10.4K) is good prep. No treadmill simulation of the volcanic scree.",
    steepestSegment: "Pajarito Mountain climb: ~800 ft in ~1.5 mi (~10% avg, with steep pitches to ~25%)",
    source: "jemezmountaintrailruns.org + race reports",
  },
  {
    id: "desertrats",
    name: "Desert RATS 100km",
    date: "April 11, 2026",
    location: "Fruita, CO (Hawkeye Trailhead)",
    distance: 62.1,
    distanceKm: 100,
    gain: 6205,
    loss: 6205,
    gainPerMile: 100,
    highPoint: 5400,
    lowPoint: 4500,
    avgElev: 4950,
    elevRange: 900,
    cutoff: "20 hours",
    terrain: "Fast flowy singletrack, red slickrock, mesa tops, cliff edges, Kokopelli Trail jeep road",
    character: "Rolling desert terrain. Runnable, not mountainous. Biggest climb is the Western Rim mesa ascent. Excellent gut-training and time-on-feet race at low altitude.",
    aidStations: [
      { name: "Crossroads #1", mile: "~5" },
      { name: "Moore Fun", mile: "~15" },
      { name: "Western Rim", mile: "~35" },
      { name: "Moore Fun 2nd pass", mile: "~45" },
      { name: "Crossroads #2", mile: "~55" },
      { name: "Finish — Hawkeye TH", mile: 62.1 },
    ],
    dropBags: "Available at multiple aid stations",
    color: "#B84000",
    badge: "bg-orange",
    tmrComparison: "This was YOUR race — you finished it. 6× less gain per mile than TMR. Excellent for time-on-feet and nutrition practice. Poor TMR altitude/vert prep.",
    steepestSegment: "Western Rim mesa climb: ~500 ft in ~1 mi (~9.5% avg, mostly moderate grades)",
    source: "desertrats.utmb.world",
  },
  {
    id: "westline",
    name: "West Line Winder 50km",
    date: "September 27, 2025",
    location: "Buena Vista, CO",
    distance: 30.6,
    distanceKm: 50,
    gain: 4300,
    loss: 4300,
    gainPerMile: 140,
    highPoint: 9500,
    lowPoint: 7930,
    avgElev: 8500,
    elevRange: 1570,
    cutoff: "11 hours",
    terrain: "22 miles singletrack, 7 miles forest/gravel road, 1.5 miles pavement. 72% singletrack.",
    character: "Sawatch Range foothills. Runnable but hilly. No extreme peaks. Great mid-altitude training at consistent 8,000–9,500 ft. Fast course for the gain.",
    aidStations: [
      { name: "Start — E Main & N Court St", mile: 0 },
      { name: "Speculator", mile: 15.4, dropbag: true },
      { name: "Midland", mile: 25.4, dropbag: true },
      { name: "Valley View", mile: "~28" },
      { name: "Finish — E Main & N Court St", mile: 30.6 },
    ],
    dropBags: "Speculator (Mi 15.4) and Midland (Mi 25.4). No pacers. No poles.",
    color: "#085041",
    badge: "bg-teal",
    tmrComparison: "Good mid-altitude training (8–9.5K ft). No major exposed ridgelines. The Collegiate Peaks backdrop is beautiful but this is not a mountain race in TMR's sense. Good gut and pacing training.",
    steepestSegment: "Multiple 200–400 ft punchy climbs on singletrack, estimated 15–20% max grade per course markings",
    source: "westlinewinder.com — verified specs",
  },
  {
    id: "deadhorse",
    name: "Dead Horse Ultra 50km",
    date: "November 15, 2025",
    location: "Moab, UT (Gemini Bridges TH)",
    distance: 31.1,
    distanceKm: 50,
    gain: 2805,
    loss: 2812,
    gainPerMile: 90,
    highPoint: 5768,
    lowPoint: 4560,
    avgElev: 5164,
    elevRange: 1208,
    cutoff: "~9 hrs",
    terrain: "Slickrock, technical rocky singletrack, Magnificent Seven trail system, Gemini Bridges Trail, Bull Run Trail",
    character: "Desert canyon terrain. Two major ascent/descent cycles. Technically challenging on slickrock. Course map described as 'two mountains you ascend and descend.' Lowest altitude of all four.",
    aidStations: [
      { name: "Start — Gemini Bridges TH", mile: 0 },
      { name: "Aid Station 1", mile: "~8" },
      { name: "Aid Station 2 (Court Point area)", mile: "~15" },
      { name: "Aid Station 3 (Bull Run)", mile: "~22" },
      { name: "Aid Station 4", mile: "~27" },
      { name: "Finish — Gemini Bridges TH", mile: 31.1 },
    ],
    dropBags: "Check race guide — some AS require 4WD access",
    color: "#1460A8",
    badge: "bg-blue",
    tmrComparison: "Least TMR-specific of the four. Low altitude, low gain. Great technical terrain practice on slickrock (different from San Juan loose rock). Best recovery race or fall base-building event.",
    steepestSegment: "Mesa climbs on slickrock: estimated 800–1,000 ft over 2–3 miles, ~8–12% avg grade",
    source: "madmooseevents.com — verified specs",
  },
];

const comparisonTmr = {
  name: "Telluride Mountain Run 65-Mile",
  distance: 65,
  gain: 22500,
  gainPerMile: 346,
  highPoint: 13500,
  lowPoint: 8750,
  avgElev: 11000,
  cutoff: "32 hours",
};

function RaceComparisonView() {
  const [active, setActive] = React.useState("jemez");
  const [showAS, setShowAS] = React.useState(false);
  const race = comparisonRaces.find(r => r.id === active);

  // TMR comparison bar widths
  const maxGainPerMile = comparisonTmr.gainPerMile;

  return (
    <div style={{ fontFamily: "var(--body)", padding: "1rem 0", maxWidth: 860 }}>
      <div style={{ fontSize: 17, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>
        Your Race History vs TMR 65-Mile
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-dim)", marginBottom: "1.25rem" }}>
        Click a race to see details, aid stations, and TMR comparison
      </div>

      {/* Race selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: "1.25rem" }}>
        {comparisonRaces.map(r => (
          <button key={r.id} onClick={() => { setActive(r.id); setShowAS(false); }} style={{
            padding: "10px 8px", borderRadius: 10, border: `1.5px solid ${active === r.id ? r.color : "var(--line)"}`,
            background: active === r.id ? r.color + "18" : "var(--bg)",
            cursor: "pointer", textAlign: "left",
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: active === r.id ? r.color : "var(--ink)", lineHeight: 1.3, marginBottom: 4 }}>{r.name}</div>
            <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>{r.date}</div>
            <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>{r.distanceKm}km • ↑{r.gain.toLocaleString()} ft</div>
          </button>
        ))}
      </div>

      {/* Detail card */}
      <div style={{ border: `1.5px solid ${race.color}40`, borderRadius: 12, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: race.color + "18", borderBottom: `1px solid ${race.color}30`, padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{race.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>{race.date} • {race.location}</div>
            </div>
            <div style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: race.color, color: "white", fontWeight: 500 }}>
              {race.distanceKm}km
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 16px" }}>
          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: "1rem" }}>
            <StatBox label="Total gain" value={`↑${race.gain.toLocaleString()} ft`} sub={`${race.gainPerMile} ft/mile`} />
            <StatBox label="Elev range" value={`${race.lowPoint.toLocaleString()}–${race.highPoint.toLocaleString()} ft`} sub={`${race.elevRange.toLocaleString()} ft span`} />
            <StatBox label="Avg elevation" value={`${race.avgElev.toLocaleString()} ft`} />
            <StatBox label="Cutoff" value={race.cutoff} />
          </div>

          {/* Gain per mile vs TMR bar */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>
              Vert per mile vs TMR
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[{ label: race.name, val: race.gainPerMile, color: race.color }, { label: "TMR 65-Mile", val: comparisonTmr.gainPerMile, color: "#534AB7" }].map(b => (
                <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--ink-dim)", width: 200, flexShrink: 0 }}>{b.label}</div>
                  <div style={{ flex: 1, background: "var(--bg-raised)", borderRadius: 4, height: 16, overflow: "hidden" }}>
                    <div style={{ width: `${(b.val / 400) * 100}%`, background: b.color, height: "100%", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 6 }}>
                      <span style={{ fontSize: 10, color: "white", fontWeight: 500, whiteSpace: "nowrap" }}>{b.val} ft/mi</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terrain */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, marginBottom: 5 }}>Terrain & character</div>
            <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.6, background: "var(--bg-raised)", borderRadius: 8, padding: "10px 12px" }}>
              {race.character}
            </div>
          </div>

          {/* Steepest segment */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, marginBottom: 5 }}>Steepest segment</div>
            <div style={{ fontSize: 12, color: "var(--ink)", background: race.color + "14", borderRadius: 8, padding: "10px 12px", borderLeft: `3px solid ${race.color}` }}>
              {race.steepestSegment}
            </div>
          </div>

          {/* TMR comparison */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, marginBottom: 5 }}>TMR training value</div>
            <div style={{ fontSize: 12, color: "var(--ink)", background: "#534AB714", borderRadius: 8, padding: "10px 12px", borderLeft: "3px solid #534AB7" }}>
              {race.tmrComparison}
            </div>
          </div>

          {/* Aid stations toggle */}
          <button onClick={() => setShowAS(!showAS)} style={{
            padding: "6px 14px", borderRadius: 8, border: "0.5px solid var(--line)",
            fontSize: 12, cursor: "pointer", background: "var(--bg-raised)",
            color: "var(--ink-dim)", marginBottom: showAS ? 8 : 0,
          }}>
            {showAS ? "▾ Hide" : "▸ Show"} aid stations ({race.aidStations.length})
          </button>

          {showAS && (
            <div style={{ border: "0.5px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 120px", fontSize: 10, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "6px 12px", background: "var(--bg-raised)", borderBottom: "0.5px solid var(--line)" }}>
                <span>Mile</span><span>Aid Station</span><span>Notes</span>
              </div>
              {race.aidStations.map((as, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 1fr 120px", fontSize: 12, padding: "6px 12px", borderBottom: i < race.aidStations.length - 1 ? "0.5px solid var(--line)" : "none", background: as.cutoff ? "#FAEEDA" : as.dropbag ? "#EEEDFE" : "transparent" }}>
                  <span style={{ color: "var(--ink-dim)", fontVariantNumeric: "tabular-nums" }}>{as.mile}</span>
                  <span style={{ color: "var(--ink)" }}>{as.name}</span>
                  <span style={{ fontSize: 10, color: as.cutoff ? "#633806" : as.dropbag ? "#3C3489" : "var(--ink-faint)" }}>
                    {as.cutoff ? `⏱ Cutoff ${as.cutoff}` : as.dropbag ? "🎒 Drop bag" : ""}
                  </span>
                </div>
              ))}
              <div style={{ padding: "6px 12px", fontSize: 11, color: "var(--ink-faint)", background: "var(--bg-raised)" }}>
                Drop bags: {race.dropBags}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary comparison table */}
      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", marginBottom: 8 }}>All comparisonRaces at a glance</div>
        <div style={{ border: "0.5px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 60px 80px 80px 80px 80px", fontSize: 10, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "7px 14px", background: "var(--bg-raised)", borderBottom: "0.5px solid var(--line)" }}>
            <span>Race</span><span>Km</span><span>↑ Gain</span><span>ft/mile</span><span>High pt</span><span>Cutoff</span>
          </div>
          {[...comparisonRaces, { id: "tmr", name: "TMR 65-Mile ★ GOAL", date: "Aug 22, 2026", distanceKm: 105, gain: 22500, gainPerMile: 346, highPoint: 13500, cutoff: "32 hrs", color: "#534AB7" }].map((r, i) => (
            <div key={r.id} style={{
              display: "grid", gridTemplateColumns: "1.5fr 60px 80px 80px 80px 80px",
              fontSize: 12, padding: "7px 14px",
              borderBottom: i < comparisonRaces.length ? "0.5px solid var(--line)" : "none",
              background: r.id === "tmr" ? "#534AB714" : r.id === active ? r.color + "12" : "transparent",
              fontWeight: r.id === "tmr" ? 500 : 400,
            }}>
              <span style={{ color: r.id === "tmr" ? "#534AB7" : "var(--ink)" }}>{r.name}</span>
              <span style={{ color: "var(--ink-dim)", fontVariantNumeric: "tabular-nums" }}>{r.distanceKm}</span>
              <span style={{ color: "#B84000", fontVariantNumeric: "tabular-nums" }}>↑{r.gain.toLocaleString()}</span>
              <span style={{ color: "var(--ink-dim)", fontVariantNumeric: "tabular-nums" }}>{r.gainPerMile}</span>
              <span style={{ color: "var(--ink-dim)", fontVariantNumeric: "tabular-nums" }}>{r.highPoint?.toLocaleString()} ft</span>
              <span style={{ color: "var(--ink-dim)" }}>{r.cutoff}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "0.75rem", fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.6 }}>
        * Jemez 50km gain estimated ~6,800 ft from race reports and ITRA data (GPX files available at jemezmountaintrailruns.org). Desert RATS 100km gain: 6,205 ft per desertrats.utmb.world. West Line Winder 50km: 4,300 ft per westlinewinder.com. Dead Horse 50km: 2,805 ft per madmooseevents.com. Half-mile grade tables require GPX parsing — download from each race's official site.
      </div>
    </div>
  );
}
window.RaceComparisonView = RaceComparisonView;
