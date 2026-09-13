const historyRaces = [
  {
    id: "moab",
    name: "Moab Red Hot Ultra",
    dist: "15K",
    distMi: 9.3,
    date: "Feb 24, 2024",
    time: "1:30:44",
    timeMi: 90.7,
    overall: "20/11 DP",
    age: 42,
    rank: 68.83,
    vert: 1200,
    terrain: "Slickrock, desert canyon",
    color: "#B84000",
    notes: "First trail race on record. Top third of field on technical desert terrain.",
    tmr: "Technical trail footing practice. Very low vert, low altitude.",
    gain_per_mi: 129,
    elev_range: "~4,500–5,200 ft",
  },
  {
    id: "staunton",
    name: "Staunton Rocks! Half Marathon",
    dist: "Half",
    distMi: 13.1,
    date: "Aug 24, 2024",
    time: "2:42:27",
    timeMi: 162.5,
    overall: "45/35 DP",
    age: 42,
    rank: 71.29,
    vert: 2800,
    terrain: "Rocky mountain singletrack, Front Range foothills",
    color: "#633806",
    notes: "Staunton State Park — technical, rooty, rocky. 12:24/mi moving pace on real mountain terrain.",
    tmr: "Best pre-ultra terrain prep. 214 ft/mi gain, mountain foothills character. Good Front Range analog.",
    gain_per_mi: 214,
    elev_range: "~8,000–9,500 ft",
  },
  {
    id: "jemez",
    name: "Jemez Mountain 50K",
    dist: "50K",
    distMi: 32.36,
    date: "May 10, 2025",
    time: "8:29:28",
    timeMi: 509.5,
    chip: "8:29:28",
    overall: "94/71 DP",
    age: 43,
    rank: 60.51,
    vert: 6407,
    garmin_vert: 6407,
    garmin_dist: 32.36,
    moving: "7:54:00",
    stopped: 35,
    terrain: "Volcanic singletrack, scree, stream crossings, 7K–10.4K ft altitude",
    color: "#7B2D00",
    notes: "First ultra. 94th overall, solid debut. 15:43/mi moving pace. 35 min aid station time — excellent discipline.",
    tmr: "Most TMR-relevant race. 198 ft/mi gain, altitude to 10,400 ft. Best predictor of TMR performance.",
    gain_per_mi: 198,
    elev_range: "7,000–10,400 ft",
    pace_mi: "15:43",
  },
  {
    id: "wlw",
    name: "West Line Winder 50K",
    dist: "50K",
    distMi: 30.83,
    date: "Sep 27, 2025",
    time: "6:49:42",
    timeMi: 409.7,
    overall: "114/72 DP",
    age: 44,
    rank: 53.59,
    vert: 3356,
    garmin_vert: 3356,
    garmin_dist: 30.83,
    terrain: "Sawatch Range foothills, 72% singletrack, 8,000–9,500 ft",
    color: "#085041",
    notes: "13:15/mi pace. Fast for the gain — runnable course suited your strengths. Middle of field.",
    tmr: "Mid-altitude training analog. 109 ft/mi — too flat for TMR specificity but good pacing data.",
    gain_per_mi: 109,
    elev_range: "7,930–9,500 ft",
    pace_mi: "13:15",
  },
  {
    id: "deadhorse",
    name: "Dead Horse Ultra 50K",
    dist: "50K",
    distMi: 28.12,
    date: "Nov 15, 2025",
    time: "5:33:59",
    timeMi: 334,
    overall: "143/96 DP",
    age: 44,
    rank: 56.10,
    vert: 3041,
    garmin_vert: 3041,
    garmin_dist: 28.12,
    moving: "5:11:00",
    stopped: 22,
    terrain: "Moab slickrock, Magnificent Seven trail system, canyon terrain",
    color: "#1460A8",
    notes: "11:03/mi moving pace — your fastest ultra pace. 22 min stopped — exceptional aid station efficiency. Lower overall placement suggests competitive field.",
    tmr: "Least TMR-specific. 108 ft/mi, 4,500–5,800 ft altitude. Best data on your flat-terrain speed ceiling.",
    gain_per_mi: 108,
    elev_range: "4,560–5,768 ft",
    pace_mi: "11:03",
  },
  {
    id: "rats",
    name: "Desert RATS 100K",
    dist: "100K",
    distMi: 63.57,
    date: "Apr 11, 2026",
    time: "15:01:31",
    timeMi: 901.5,
    overall: "114/96 DP",
    age: 44,
    rank: 55.40,
    vert: 6923,
    garmin_vert: 6923,
    garmin_dist: 63.57,
    moving: "13:35:00",
    stopped: 86,
    terrain: "Fruita desert, Kokopelli Trail, red slickrock, mesa tops",
    color: "#534AB7",
    notes: "13h35m moving, 15h01m chip — 86 min stopped over 15 hrs = solid aid station management. 12:49/mi moving. Bilateral ankle tenderness post-race.",
    tmr: "Distance confidence builder. 109 ft/mi vs TMR's 367 ft/mi — terrain totally different but time-on-feet invaluable.",
    gain_per_mi: 109,
    elev_range: "4,500–5,400 ft",
    pace_mi: "12:49",
  },
  {
    id: "tmr",
    name: "Telluride Mountain Run 65-Mile",
    dist: "65M",
    distMi: 63.46,
    date: "Aug 22, 2026",
    time: "GOAL",
    timeMi: null,
    overall: "—",
    age: 44,
    rank: null,
    vert: 23320,
    terrain: "San Juan ridgelines, loose scree, talus, 8,750–13,502 ft altitude",
    color: "#3C3489",
    notes: "Registered ✓ • 32-hour cutoff • 9 aid stations • Pacer from mile 35 • Drop bags: miles 17, 35, 56",
    tmr: "THE RACE.",
    gain_per_mi: 367,
    elev_range: "8,750–13,502 ft",
    goal: true,
  },
  {
    id: "rrr",
    name: "Run Rabbit Run 50-Miler",
    dist: "50M",
    distMi: 50,
    date: "Sep 19, 2026",
    time: "REGISTERED",
    timeMi: null,
    overall: "—",
    age: 44,
    rank: null,
    vert: 10000,
    terrain: "Steamboat Springs, Mount Werner, Storm Peak, Fish Creek Falls — sustained alpine singletrack",
    color: "#0C6B3E",
    notes: "Registered ✓ • 4 weeks after TMR • 30-hour cutoff • Major mountain 50-miler with significant altitude and vert",
    tmr: "Post-TMR goal race. With TMR training and experience, RRR50 becomes achievable. Recovery between races is critical.",
    gain_per_mi: 200,
    elev_range: "~6,700–10,568 ft",
    future: true,
  },
];

const historyMetrics = [
  { key: "distMi", label: "Distance (mi)", fmt: v => v ? v.toFixed(1)+" mi" : "—" },
  { key: "vert", label: "Vert gain (ft)", fmt: v => v ? v.toLocaleString()+" ft" : "—" },
  { key: "gain_per_mi", label: "ft/mile", fmt: v => v ? v+" ft/mi" : "—" },
  { key: "rank", label: "Percentile rank", fmt: v => v ? v.toFixed(2)+"%" : "—" },
];

function paceColor(p) {
  if (!p) return "var(--color-text-secondary)";
  const [m] = p.split(":").map(Number);
  if (m <= 11) return "#085041";
  if (m <= 13) return "#1460A8";
  if (m <= 15) return "#B84000";
  return "#633806";
}

function RaceHistoryView() {
  const [active, setActive] = React.useState("tmr");
  const [view, setView] = React.useState("timeline");

  const race = historyRaces.find(r => r.id === active);

  return (
    <div style={{ fontFamily: "var(--body)", padding: "1rem 0", maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 500, color: "var(--ink)" }}>Dustin Segura — Race History</div>
          <div style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 2 }}>
            M44 • UltraSignup Rank: 60.16% overall / 72.98% age group • 8 historyRaces
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["timeline", "table", "detail"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "5px 12px", borderRadius: 8, border: "0.5px solid var(--line)",
              fontSize: 12, cursor: "pointer",
              background: view === v ? "#3C3489" : "var(--bg-raised)",
              color: view === v ? "#CECBF6" : "var(--ink-dim)",
            }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* TIMELINE VIEW */}
      {view === "timeline" && (
        <div>
          {historyRaces.map((r, i) => (
            <div key={r.id} style={{ display: "flex", gap: 0, marginBottom: 0 }}>
              {/* Timeline spine */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32, flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: r.goal || r.future ? r.color : r.color, border: `2px solid ${r.color}`, flexShrink: 0, marginTop: 16, zIndex: 1, boxShadow: r.goal ? `0 0 0 4px ${r.color}33` : "none" }} />
                {i < historyRaces.length - 1 && <div style={{ width: 2, flex: 1, background: "var(--line)", minHeight: 20 }} />}
              </div>

              {/* Card */}
              <div onClick={() => { setActive(r.id); setView("detail"); }} style={{
                flex: 1, marginLeft: 12, marginBottom: 12, padding: "10px 14px",
                border: `0.5px solid ${active === r.id ? r.color : "var(--line)"}`,
                borderRadius: 10, cursor: "pointer",
                background: r.goal ? r.color+"14" : r.future ? r.color+"0A" : "var(--bg)",
                transition: "border-color 0.15s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: r.goal || r.future ? r.color : "var(--ink)" }}>
                      {r.name}
                      {r.goal && " 🎯"}{r.future && " ⚡"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{r.date} • {r.dist}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: r.goal || r.future ? r.color : "var(--ink)" }}>{r.time}</div>
                    {r.rank && <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>Rank {r.rank}% • {r.overall}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  {[
                    { l: `↑${r.vert.toLocaleString()} ft`, c: "#B84000" },
                    { l: `${r.gain_per_mi} ft/mi`, c: r.gain_per_mi >= 300 ? "#7B2D00" : r.gain_per_mi >= 150 ? "#D4621A" : "var(--ink-faint)" },
                    { l: r.elev_range, c: "var(--ink-faint)" },
                    ...(r.pace_mi ? [{ l: `${r.pace_mi}/mi`, c: paceColor(r.pace_mi) }] : []),
                  ].map((tag, ti) => (
                    <span key={ti} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 12, background: "var(--bg-raised)", color: tag.c, fontWeight: 500 }}>{tag.l}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TABLE VIEW */}
      {view === "table" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--bg-raised)" }}>
                {["Race","Date","Dist","Time","Vert","ft/mi","Elev","Rank","Pace/mi"].map(h => (
                  <th key={h} style={{ padding: "7px 10px", textAlign: "left", color: "var(--ink-faint)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "0.5px solid var(--line)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historyRaces.map(r => (
                <tr key={r.id} onClick={() => { setActive(r.id); setView("detail"); }} style={{
                  borderBottom: "0.5px solid var(--line)",
                  background: r.goal ? r.color+"14" : r.future ? r.color+"0A" : "transparent",
                  cursor: "pointer",
                }}>
                  <td style={{ padding: "6px 10px", fontWeight: 500, color: r.goal || r.future ? r.color : "var(--ink)", whiteSpace: "nowrap" }}>{r.name}{r.goal?" 🎯":r.future?" ⚡":""}</td>
                  <td style={{ padding: "6px 10px", color: "var(--ink-dim)", whiteSpace: "nowrap" }}>{r.date}</td>
                  <td style={{ padding: "6px 10px", color: "var(--ink-dim)" }}>{r.dist}</td>
                  <td style={{ padding: "6px 10px", fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap" }}>{r.time}</td>
                  <td style={{ padding: "6px 10px", color: "#B84000", whiteSpace: "nowrap" }}>↑{r.vert.toLocaleString()}</td>
                  <td style={{ padding: "6px 10px", color: r.gain_per_mi >= 300 ? "#7B2D00" : r.gain_per_mi >= 150 ? "#D4621A" : "var(--ink-dim)", fontWeight: r.gain_per_mi >= 150 ? 600 : 400 }}>{r.gain_per_mi}</td>
                  <td style={{ padding: "6px 10px", color: "var(--ink-dim)", whiteSpace: "nowrap", fontSize: 11 }}>{r.elev_range}</td>
                  <td style={{ padding: "6px 10px", color: r.rank >= 70 ? "#085041" : r.rank >= 55 ? "#1460A8" : "var(--ink-dim)" }}>{r.rank ? r.rank+"%" : "—"}</td>
                  <td style={{ padding: "6px 10px", color: paceColor(r.pace_mi), fontWeight: 500 }}>{r.pace_mi ? r.pace_mi+"/mi" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ft/mi bar chart */}
          <div style={{ marginTop: "1.25rem" }}>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>Vert per mile — progression toward TMR</div>
            {historyRaces.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                <div style={{ fontSize: 11, color: "var(--ink-dim)", width: 180, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                <div style={{ flex: 1, background: "var(--bg-raised)", borderRadius: 4, height: 18, overflow: "hidden" }}>
                  <div style={{ width: `${(r.gain_per_mi / 400) * 100}%`, background: r.goal ? "#3C3489" : r.color, height: "100%", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 6, minWidth: 30 }}>
                    <span style={{ fontSize: 10, color: "white", fontWeight: 600, whiteSpace: "nowrap" }}>{r.gain_per_mi} ft/mi</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAIL VIEW */}
      {view === "detail" && race && (
        <div>
          {/* Race selector */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1.25rem" }}>
            {historyRaces.map(r => (
              <button key={r.id} onClick={() => setActive(r.id)} style={{
                padding: "5px 10px", borderRadius: 8, border: `0.5px solid ${active === r.id ? r.color : "var(--line)"}`,
                fontSize: 11, cursor: "pointer",
                background: active === r.id ? r.color+"18" : "var(--bg-raised)",
                color: active === r.id ? r.color : "var(--ink-dim)",
                fontWeight: active === r.id ? 600 : 400,
              }}>{r.dist} — {r.date.split(",")[1]?.trim() || r.date}</button>
            ))}
          </div>

          <div style={{ border: `1.5px solid ${race.color}40`, borderRadius: 12, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ background: race.color+"18", borderBottom: `1px solid ${race.color}30`, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>{race.name}{race.goal?" 🎯":race.future?" ⚡":""}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>{race.date} • Age {race.age} • {race.terrain}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: race.color }}>{race.time}</div>
                  {race.rank && <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>Rank {race.rank}% • {race.overall}</div>}
                </div>
              </div>
            </div>

            <div style={{ padding: "14px 16px" }}>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: "1rem" }}>
                {[
                  { l: "Distance", v: race.distMi ? race.distMi.toFixed(2)+" mi" : "63.46 mi" },
                  { l: "Vert gain", v: "↑"+race.vert.toLocaleString()+" ft" },
                  { l: "Gain/mile", v: race.gain_per_mi+" ft/mi" },
                  { l: "Elevation", v: race.elev_range },
                  ...(race.moving ? [{ l: "Moving time", v: race.moving }] : []),
                  ...(race.stopped ? [{ l: "Stopped", v: race.stopped+" min" }] : []),
                  ...(race.pace_mi ? [{ l: "Moving pace", v: race.pace_mi+"/mi" }] : []),
                  ...(race.rank ? [{ l: "Percentile", v: race.rank+"%" }] : []),
                ].map(s => (
                  <div key={s.l} style={{ background: "var(--bg-raised)", borderRadius: 8, padding: "9px 12px" }}>
                    <div style={{ fontSize: 10, color: "var(--ink-faint)", marginBottom: 2 }}>{s.l}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div style={{ fontSize: 12, color: "var(--ink)", background: "var(--bg-raised)", borderRadius: 8, padding: "10px 14px", marginBottom: 10, lineHeight: 1.6 }}>
                {race.notes}
              </div>

              {/* TMR relevance */}
              <div style={{ fontSize: 12, color: "var(--ink)", background: "#3C348914", borderLeft: "3px solid #3C3489", borderRadius: "0 8px 8px 0", padding: "10px 14px", lineHeight: 1.6 }}>
                <strong style={{ color: "#3C3489" }}>TMR relevance:</strong> {race.tmr}
              </div>

              {/* vs TMR comparison bar */}
              {!race.goal && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>Vert/mile vs TMR</div>
                  {[{ l: race.name, v: race.gain_per_mi, c: race.color }, { l: "TMR 65-Mile", v: 367, c: "#3C3489" }].map(b => (
                    <div key={b.l} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                      <div style={{ fontSize: 11, width: 180, flexShrink: 0, color: "var(--ink-dim)" }}>{b.l}</div>
                      <div style={{ flex: 1, background: "var(--bg-raised)", borderRadius: 4, height: 18, overflow: "hidden" }}>
                        <div style={{ width: `${(b.v/420)*100}%`, background: b.c, height: "100%", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 6, minWidth: 40 }}>
                          <span style={{ fontSize: 10, color: "white", fontWeight: 600 }}>{b.v} ft/mi</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RRR note */}
      <div style={{ marginTop: "1rem", background: "#0C6B3E14", border: "0.5px solid #0C6B3E40", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.6 }}>
        <strong style={{ color: "#0C6B3E" }}>⚡ Run Rabbit Run 50-Miler (Sep 19):</strong> 4 weeks after TMR. With TMR training complete, RRR50 is a natural progression — Steamboat's Storm Peak terrain (10,568 ft) is well within your post-TMR capability. Recovery between historyRaces and a clean taper will be the key variables. Consider this your 2026 victory lap.
      </div>

      <div style={{ marginTop: "0.75rem", fontSize: 11, color: "var(--ink-faint)" }}>
        Source: UltraSignup (Dustin Segura, M44) + Garmin/Strava data • Rank percentile = % of field behind you
      </div>
    </div>
  );
}
window.RaceHistoryView = RaceHistoryView;
