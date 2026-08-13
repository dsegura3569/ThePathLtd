const vert = (speed, gradePct, minutes) =>
  Math.round(speed * (minutes / 60) * (gradePct / 100) * 5280);

const grades = [20, 20.5, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.5, 25];
const speeds = [2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0];
const durations = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 45, 60];

// Your pyramid protocol segments
const pyramid = [
  { g: 20.0, s: 2.1, dir: "up" },
  { g: 20.5, s: 2.1, dir: "up" },
  { g: 21.0, s: 2.1, dir: "up" },
  { g: 21.5, s: 2.1, dir: "up" },
  { g: 22.0, s: 2.1, dir: "up" },
  { g: 22.5, s: 2.1, dir: "up" },
  { g: 23.0, s: 2.1, dir: "up" },
  { g: 23.5, s: 2.1, dir: "up" },
  { g: 24.0, s: 2.1, dir: "up" },
  { g: 24.5, s: 2.1, dir: "up" },
  { g: 25.0, s: 2.1, dir: "up" },
  { g: 25.0, s: 2.2, dir: "hold" },
  { g: 25.0, s: 2.2, dir: "hold" },
  { g: 24.5, s: 2.1, dir: "down" },
  { g: 24.0, s: 2.1, dir: "down" },
  { g: 23.5, s: 2.1, dir: "down" },
  { g: 23.0, s: 2.1, dir: "down" },
  { g: 22.5, s: 2.1, dir: "down" },
  { g: 22.0, s: 2.1, dir: "down" },
  { g: 21.5, s: 2.1, dir: "down" },
  { g: 21.0, s: 2.1, dir: "down" },
  { g: 20.5, s: 2.1, dir: "down" },
  { g: 20.0, s: 2.1, dir: "down" },
  { g: 15.0, s: 3.0, dir: "cooldown" },
  { g: 10.0, s: 4.0, dir: "cooldown" },
];

function vertColor(v) {
  if (v >= 300) return { bg: "#4A0E00", text: "#FFD0B0" };
  if (v >= 250) return { bg: "#7B2D00", text: "#FFD0B0" };
  if (v >= 200) return { bg: "#B84000", text: "#FFE8D0" };
  if (v >= 150) return { bg: "#D4621A", text: "#FFF0E8" };
  if (v >= 100) return { bg: "#E8943A", text: "#3D1A00" };
  if (v >= 50)  return { bg: "#F5BC6E", text: "#3D1A00" };
  return { bg: "var(--color-background-secondary)", text: "var(--color-text-secondary)" };
}

function VertCalcView() {
  const [tab, setTab] = React.useState("solver");
  const [selSpeed, setSelSpeed] = React.useState(2.2);
  const [selGrade, setSelGrade] = React.useState(25);
  const [selDur, setSelDur] = React.useState(5);
  const [pyramidTarget, setPyramidTarget] = React.useState(200);

  const [goalDur, setGoalDur] = React.useState(60);
  const [goalVert, setGoalVert] = React.useState(2500);
  const [goalDurInput, setGoalDurInput] = React.useState("60");
  const [goalVertInput, setGoalVertInput] = React.useState("2500");

  // Solver: find all speed+grade combos that hit goalVert in goalDur minutes
  // Also show what grade you need at a fixed speed, and what speed at fixed grade
  const allSpeeds = [1.8,1.9,2.0,2.1,2.2,2.3,2.4,2.5,2.6,2.7,2.8,2.9,3.0,3.2,3.5,4.0];
  const allGrades = [];
  for (let g = 5; g <= 25; g += 0.5) allGrades.push(Math.round(g*10)/10);

  // For each speed, what grade is needed?
  const solverBySpeed = allSpeeds.map(s => {
    // goalVert = s * (goalDur/60) * (g/100) * 5280
    // g = goalVert / (s * (goalDur/60) * 5280) * 100
    const neededGrade = goalVert / (s * (goalDur / 60) * 5280) * 100;
    const miles = s * (goalDur / 60);
    const feasible = neededGrade >= 1 && neededGrade <= 25;
    const overMax = neededGrade > 25;
    const tooEasy = neededGrade < 1;
    return { speed: s, grade: neededGrade, miles, feasible, overMax, tooEasy };
  });

  // For each grade, what speed is needed?
  const solverByGrade = allGrades.map(g => {
    // goalVert = s * (goalDur/60) * (g/100) * 5280
    // s = goalVert / ((goalDur/60) * (g/100) * 5280)
    const neededSpeed = goalVert / ((goalDur / 60) * (g / 100) * 5280);
    const miles = neededSpeed * (goalDur / 60);
    const feasible = neededSpeed >= 1.5 && neededSpeed <= 6.0;
    return { grade: g, speed: neededSpeed, miles, feasible };
  });

  // Best combos (sweet spot: grade 18-25, speed 2.0-3.0)
  const sweetSpot = solverBySpeed.filter(r => r.grade >= 18 && r.grade <= 25 && r.speed >= 2.0 && r.speed <= 3.0);

  const tabs = [
    { id: "solver", label: "⚡ Goal solver" },
    { id: "lookup", label: "Quick lookup" },
    { id: "speed", label: "By speed (5 min)" },
    { id: "duration", label: "By duration" },
    { id: "pyramid", label: "Your protocol" },
  ];

  // Pyramid calc: minutes needed per segment to hit target vert
  const pyramidWithTime = pyramid.map(seg => {
    const ftPerMin = seg.s * (seg.g / 100) * 5280 / 60;
    const minsNeeded = pyramidTarget / ftPerMin;
    const totalVert = vert(seg.s, seg.g, minsNeeded);
    return { ...seg, ftPerMin, minsNeeded, totalVert };
  });
  const totalPyramidVert = pyramidWithTime.reduce((sum, s) => sum + s.totalVert, 0);
  const totalPyramidTime = pyramidWithTime.reduce((sum, s) => sum + s.minsNeeded, 0);

  const dirColor = { up: "#B84000", hold: "#7B2D00", down: "#1460A8", cooldown: "#085041" };
  const dirLabel = { up: "↑ Ramp up", hold: "→ Hold", down: "↓ Ramp down", cooldown: "✓ Cooldown" };

  return (
    <div style={{ fontFamily: "var(--body)", padding: "1rem 0", maxWidth: 860 }}>
      <div style={{ fontSize: 17, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>
        Treadmill Vertical Gain Calculator
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-dim)", marginBottom: "1.25rem" }}>
        Grade 20–25% • Speed 2.0–3.0 mph • Formula: speed × time × grade × 5,280
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "6px 14px", borderRadius: 8,
            border: "0.5px solid var(--line)",
            fontSize: 13, cursor: "pointer",
            background: tab === t.id ? "#085041" : "var(--bg)",
            color: tab === t.id ? "#9FE1CB" : "var(--ink-dim)",
          }}>{t.label}</button>
        ))}
      </div>

      {/* GOAL SOLVER */}
      {tab === "solver" && (
        <div>
          {/* Inputs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1.5rem" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 6 }}>I have this many minutes</div>
              <input
                type="number"
                value={goalDurInput}
                onChange={e => { setGoalDurInput(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) setGoalDur(v); }}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #085041", background: "var(--bg-raised)", color: "var(--ink)", fontSize: 22, fontWeight: 500, outline: "none" }}
              />
              <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>minutes</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 6 }}>I want to climb this much vert</div>
              <input
                type="number"
                value={goalVertInput}
                onChange={e => { setGoalVertInput(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) setGoalVert(v); }}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #B84000", background: "var(--bg-raised)", color: "var(--ink)", fontSize: 22, fontWeight: 500, outline: "none" }}
              />
              <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>feet of vertical</div>
            </div>
          </div>

          {/* Required ft/min */}
          <div style={{ background: "#085041", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "#6BCDB0", marginBottom: 2 }}>Required ft/min</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: "#9FE1CB" }}>{(goalVert / goalDur).toFixed(1)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6BCDB0", marginBottom: 2 }}>ft/hour</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: "#9FE1CB" }}>{(goalVert / goalDur * 60).toFixed(0)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6BCDB0", marginBottom: 2 }}>TMR comparison</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#9FE1CB", marginTop: 4 }}>{((goalVert / goalDur * 60) / (22500 / 32) * 100).toFixed(0)}% of TMR vert/hr pace</div>
            </div>
          </div>

          {/* Sweet spot callout */}
          {sweetSpot.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: 12, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, marginBottom: 8 }}>
                Sweet spot combos (grade 18–25%, speed 2.0–3.0 mph)
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {sweetSpot.map(r => (
                  <div key={r.speed} style={{ background: "#B8400018", border: "1px solid #B84000", borderRadius: 10, padding: "10px 14px", minWidth: 140 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#B84000" }}>{r.speed.toFixed(1)} mph @ {r.grade.toFixed(1)}%</div>
                    <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 3 }}>{r.miles.toFixed(2)} miles</div>
                    <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{goalVert.toLocaleString()} ft in {goalDur} min</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two-column solver tables */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* By speed → needed grade */}
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, marginBottom: 8 }}>
                Fix speed → needed grade
              </div>
              <div style={{ border: "0.5px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 10, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", padding: "6px 10px", background: "var(--bg-raised)", borderBottom: "0.5px solid var(--line)" }}>
                  <span>Speed</span><span style={{textAlign:"center"}}>Grade needed</span><span style={{textAlign:"center"}}>Miles</span>
                </div>
                {solverBySpeed.map(r => (
                  <div key={r.speed} style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                    padding: "5px 10px", fontSize: 12,
                    borderBottom: "0.5px solid var(--line)",
                    background: r.overMax ? "#0C3B6E18" : r.tooEasy ? "var(--bg-raised)" : r.grade >= 18 ? "#B8400018" : "#E8943A18",
                    opacity: (!r.feasible) ? 0.5 : 1,
                  }}>
                    <span style={{ color: "var(--ink)", fontWeight: 500 }}>{r.speed.toFixed(1)} mph</span>
                    <span style={{ textAlign: "center", fontWeight: 600, color: r.overMax ? "#1460A8" : r.tooEasy ? "var(--ink-faint)" : r.grade >= 20 ? "#B84000" : "#D4621A" }}>
                      {r.overMax ? ">25% ✗" : r.tooEasy ? "<1% —" : `${r.grade.toFixed(1)}%`}
                    </span>
                    <span style={{ textAlign: "center", color: "var(--ink-dim)", fontVariantNumeric: "tabular-nums" }}>{r.miles.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By grade → needed speed */}
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, marginBottom: 8 }}>
                Fix grade → needed speed
              </div>
              <div style={{ border: "0.5px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 10, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", padding: "6px 10px", background: "var(--bg-raised)", borderBottom: "0.5px solid var(--line)" }}>
                  <span>Grade</span><span style={{textAlign:"center"}}>Speed needed</span><span style={{textAlign:"center"}}>Miles</span>
                </div>
                {solverByGrade.map(r => (
                  <div key={r.grade} style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                    padding: "5px 10px", fontSize: 12,
                    borderBottom: "0.5px solid var(--line)",
                    background: r.grade >= 20 ? "#B8400018" : r.grade >= 15 ? "#E8943A18" : "var(--bg-raised)",
                    opacity: !r.feasible ? 0.5 : 1,
                  }}>
                    <span style={{ fontWeight: 500, color: r.grade >= 20 ? "#B84000" : r.grade >= 15 ? "#D4621A" : "var(--ink-dim)" }}>{r.grade.toFixed(1)}%</span>
                    <span style={{ textAlign: "center", fontWeight: 600, color: r.speed > 4.0 ? "#1460A8" : r.speed < 1.5 ? "var(--ink-faint)" : "var(--ink)" }}>
                      {r.speed > 6 ? ">6 mph ✗" : r.speed < 1.0 ? "<1 mph —" : `${r.speed.toFixed(2)} mph`}
                    </span>
                    <span style={{ textAlign: "center", color: "var(--ink-dim)", fontVariantNumeric: "tabular-nums" }}>{r.miles.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-faint)" }}>
            Blue = exceeds treadmill max (25%). Faded rows = outside practical range. Sweet spot highlighted in orange.
          </div>
        </div>
      )}

      {/* QUICK LOOKUP */}
      {tab === "lookup" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 6 }}>Speed (mph)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {speeds.map(s => (
                  <button key={s} onClick={() => setSelSpeed(s)} style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                    border: "0.5px solid var(--line)",
                    background: selSpeed === s ? "#085041" : "var(--bg-raised)",
                    color: selSpeed === s ? "#9FE1CB" : "var(--ink)",
                  }}>{s.toFixed(1)}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 6 }}>Grade (%)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {grades.map(g => (
                  <button key={g} onClick={() => setSelGrade(g)} style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                    border: "0.5px solid var(--line)",
                    background: selGrade === g ? "#B84000" : "var(--bg-raised)",
                    color: selGrade === g ? "#FFE8D0" : "var(--ink)",
                  }}>{g}%</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 6 }}>Duration (min)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {durations.map(d => (
                  <button key={d} onClick={() => setSelDur(d)} style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                    border: "0.5px solid var(--line)",
                    background: selDur === d ? "#534AB7" : "var(--bg-raised)",
                    color: selDur === d ? "#CECBF6" : "var(--ink)",
                  }}>{d}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Result */}
          <div style={{ background: "#085041", borderRadius: 12, padding: "1.5rem", textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 48, fontWeight: 600, color: "#9FE1CB" }}>
              {vert(selSpeed, selGrade, selDur).toLocaleString()} ft
            </div>
            <div style={{ fontSize: 14, color: "#6BCDB0", marginTop: 4 }}>
              {selSpeed.toFixed(1)} mph @ {selGrade}% grade for {selDur} min
            </div>
            <div style={{ fontSize: 13, color: "#4AAD94", marginTop: 8 }}>
              {(vert(selSpeed, selGrade, selDur) / selDur).toFixed(1)} ft/min •&nbsp;
              {(vert(selSpeed, selGrade, selDur) / selDur * 60).toFixed(0)} ft/hr •&nbsp;
              TMR total: {(22500 / vert(selSpeed, selGrade, selDur) * selDur).toFixed(0)} min at this rate
            </div>
          </div>

          {/* Mini cross-table at selected duration */}
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 8 }}>
            All grades × speeds at {selDur} min (ft gained)
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ padding: "5px 10px", background: "var(--bg-raised)", color: "var(--ink-faint)", fontSize: 10, textAlign: "left", borderBottom: "0.5px solid var(--line)" }}>Grade</th>
                  {speeds.map(s => (
                    <th key={s} style={{ padding: "5px 8px", background: selSpeed === s ? "#08504122" : "var(--bg-raised)", color: selSpeed === s ? "#085041" : "var(--ink-faint)", fontSize: 10, textAlign: "center", borderBottom: "0.5px solid var(--line)", fontWeight: selSpeed === s ? 600 : 400 }}>{s.toFixed(1)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grades.map(g => (
                  <tr key={g}>
                    <td style={{ padding: "4px 10px", fontWeight: selGrade === g ? 600 : 400, color: selGrade === g ? "#B84000" : "var(--ink-dim)", borderBottom: "0.5px solid var(--line)", background: selGrade === g ? "#B8400010" : "transparent" }}>{g}%</td>
                    {speeds.map(s => {
                      const v = vert(s, g, selDur);
                      const c = vertColor(v);
                      const isSelected = s === selSpeed && g === selGrade;
                      return (
                        <td key={s} onClick={() => { setSelSpeed(s); setSelGrade(g); }} style={{
                          padding: "4px 8px", textAlign: "center", cursor: "pointer",
                          background: isSelected ? "#085041" : c.bg,
                          color: isSelected ? "#9FE1CB" : c.text,
                          fontWeight: isSelected ? 700 : 400,
                          borderBottom: "0.5px solid var(--line)",
                          fontSize: 11,
                        }}>{v}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BY SPEED — 5 min segments */}
      {tab === "speed" && (
        <div style={{ overflowX: "auto" }}>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 8 }}>Vertical gained (ft) per 5-minute segment</div>
          <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
            <thead>
              <tr>
                <th style={{ padding: "6px 12px", background: "var(--bg-raised)", color: "var(--ink-faint)", fontSize: 10, textAlign: "left", borderBottom: "0.5px solid var(--line)" }}>Grade</th>
                {speeds.map(s => (
                  <th key={s} style={{ padding: "6px 10px", background: "var(--bg-raised)", color: "var(--ink-faint)", fontSize: 10, textAlign: "center", borderBottom: "0.5px solid var(--line)" }}>{s.toFixed(1)} mph</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grades.map(g => (
                <tr key={g}>
                  <td style={{ padding: "5px 12px", fontWeight: 500, color: "var(--ink-dim)", borderBottom: "0.5px solid var(--line)" }}>{g}%</td>
                  {speeds.map(s => {
                    const v = vert(s, g, 5);
                    const c = vertColor(v);
                    return (
                      <td key={s} style={{ padding: "5px 10px", textAlign: "center", background: c.bg, color: c.text, borderBottom: "0.5px solid var(--line)", fontSize: 12 }}>{v}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-faint)" }}>
            Color scale: <span style={{ background: "#F5BC6E", color: "#3D1A00", padding: "1px 6px", borderRadius: 3 }}>50–99</span>&nbsp;
            <span style={{ background: "#E8943A", color: "#3D1A00", padding: "1px 6px", borderRadius: 3 }}>100–149</span>&nbsp;
            <span style={{ background: "#D4621A", color: "#FFF0E8", padding: "1px 6px", borderRadius: 3 }}>150–199</span>&nbsp;
            <span style={{ background: "#B84000", color: "#FFE8D0", padding: "1px 6px", borderRadius: 3 }}>200–249</span>&nbsp;
            <span style={{ background: "#7B2D00", color: "#FFD0B0", padding: "1px 6px", borderRadius: 3 }}>250–299</span>&nbsp;
            <span style={{ background: "#4A0E00", color: "#FFD0B0", padding: "1px 6px", borderRadius: 3 }}>300+</span>
          </div>
        </div>
      )}

      {/* BY DURATION — at selected speed */}
      {tab === "duration" && (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", alignSelf: "center" }}>Speed:</div>
            {speeds.map(s => (
              <button key={s} onClick={() => setSelSpeed(s)} style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                border: "0.5px solid var(--line)",
                background: selSpeed === s ? "#085041" : "var(--bg-raised)",
                color: selSpeed === s ? "#9FE1CB" : "var(--ink)",
              }}>{s.toFixed(1)}</button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 8 }}>
            Vertical gained (ft) at {selSpeed.toFixed(1)} mph across durations
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ padding: "6px 12px", background: "var(--bg-raised)", color: "var(--ink-faint)", fontSize: 10, textAlign: "left", borderBottom: "0.5px solid var(--line)" }}>Grade</th>
                  {durations.map(d => (
                    <th key={d} style={{ padding: "6px 8px", background: "var(--bg-raised)", color: "var(--ink-faint)", fontSize: 10, textAlign: "center", borderBottom: "0.5px solid var(--line)" }}>{d}m</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grades.map(g => (
                  <tr key={g}>
                    <td style={{ padding: "5px 12px", fontWeight: 500, color: "var(--ink-dim)", borderBottom: "0.5px solid var(--line)" }}>{g}%</td>
                    {durations.map(d => {
                      const v = vert(selSpeed, g, d);
                      const c = vertColor(v);
                      return (
                        <td key={d} style={{ padding: "5px 8px", textAlign: "center", background: c.bg, color: c.text, borderBottom: "0.5px solid var(--line)", fontSize: 11 }}>{v}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* YOUR PYRAMID PROTOCOL */}
      {tab === "pyramid" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>Vert target per segment:</div>
            {[100, 150, 200, 250, 300].map(t => (
              <button key={t} onClick={() => setPyramidTarget(t)} style={{
                padding: "5px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
                border: "0.5px solid var(--line)",
                background: pyramidTarget === t ? "#B84000" : "var(--bg-raised)",
                color: pyramidTarget === t ? "#FFE8D0" : "var(--ink)",
              }}>{t} ft</button>
            ))}
          </div>

          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "1.25rem" }}>
            {[
              { label: "Total vert (climb phase)", value: `${pyramidWithTime.filter(s=>s.dir==="up"||s.dir==="hold").reduce((sum,s)=>sum+s.totalVert,0).toLocaleString()} ft` },
              { label: "Total session time", value: `${Math.floor(totalPyramidTime/60)}h ${Math.round(totalPyramidTime%60)}m` },
              { label: "Full session vert", value: `${totalPyramidVert.toLocaleString()} ft` },
            ].map(m => (
              <div key={m.label} style={{ background: "var(--bg-raised)", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--ink-faint)", marginBottom: 3 }}>{m.label}</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>{m.value}</div>
              </div>
            ))}
          </div>

          <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
            <thead>
              <tr style={{ background: "var(--bg-raised)" }}>
                {["Phase", "Grade", "Speed", "Min needed", "ft/min", "Vert gained"].map(h => (
                  <th key={h} style={{ padding: "6px 12px", color: "var(--ink-faint)", fontSize: 10, textAlign: h === "Phase" ? "left" : "center", borderBottom: "0.5px solid var(--line)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pyramidWithTime.map((seg, i) => {
                const dc = dirColor[seg.dir];
                return (
                  <tr key={i} style={{ borderBottom: "0.5px solid var(--line)", background: seg.dir === "hold" ? "#4A0E0010" : "transparent" }}>
                    <td style={{ padding: "5px 12px", color: dc, fontWeight: 500, fontSize: 11 }}>{dirLabel[seg.dir]}</td>
                    <td style={{ padding: "5px 12px", textAlign: "center", fontWeight: 500, color: "var(--ink)" }}>{seg.g}%</td>
                    <td style={{ padding: "5px 12px", textAlign: "center", color: "var(--ink-dim)" }}>{seg.s.toFixed(1)} mph</td>
                    <td style={{ padding: "5px 12px", textAlign: "center", color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{seg.minsNeeded.toFixed(1)}</td>
                    <td style={{ padding: "5px 12px", textAlign: "center", color: "var(--ink-faint)", fontVariantNumeric: "tabular-nums" }}>{seg.ftPerMin.toFixed(1)}</td>
                    <td style={{ padding: "5px 12px", textAlign: "center" }}>
                      <span style={{ background: vertColor(seg.totalVert).bg, color: vertColor(seg.totalVert).text, padding: "2px 8px", borderRadius: 4, fontWeight: 500, fontSize: 11 }}>
                        {seg.totalVert} ft
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
window.VertCalcView = VertCalcView;
