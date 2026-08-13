const hillReps_data = [
  {
    rep: 1,
    s60: { dist: 235.0, gain: 10.2, speed: 3.92, mph: 8.76, paceKm: "4:15", paceMi: "6:50", grade: 4.7, avgHr: 142, maxHr: 167, watts: 463 },
    s30: { dist: 132.4, gain: 8.8,  speed: 4.42, mph: 9.88, paceKm: "3:46", paceMi: "6:04", grade: 6.3, avgHr: 114, maxHr: 127, watts: 459 },
  },
  {
    rep: 2,
    s60: { dist: 249.6, gain: 12.8, speed: 4.16, mph: 9.31, paceKm: "4:00", paceMi: "6:26", grade: 4.9, avgHr: 147, maxHr: 168, watts: 500 },
    s30: { dist: 136.2, gain: 8.2,  speed: 4.54, mph: 10.16, paceKm: "3:40", paceMi: "5:54", grade: 6.0, avgHr: 133, maxHr: 150, watts: 417 },
  },
  {
    rep: 3,
    s60: { dist: 247.7, gain: 13.6, speed: 4.13, mph: 9.24, paceKm: "4:02", paceMi: "6:29", grade: 5.0, avgHr: 149, maxHr: 171, watts: 503 },
    s30: { dist: 141.5, gain: 9.4,  speed: 4.72, mph: 10.55, paceKm: "3:32", paceMi: "5:41", grade: 6.4, avgHr: 124, maxHr: 137, watts: 460 },
  },
  {
    rep: 4,
    s60: { dist: 235.7, gain: 11.8, speed: 3.93, mph: 8.79, paceKm: "4:14", paceMi: "6:49", grade: 4.2, avgHr: 155, maxHr: 172, watts: 461 },
    s30: { dist: 139.6, gain: 9.2,  speed: 4.65, mph: 10.41, paceKm: "3:34", paceMi: "5:45", grade: 6.4, avgHr: 132, maxHr: 143, watts: 460 },
  },
  {
    rep: 5,
    s60: { dist: 239.2, gain: 12.2, speed: 3.99, mph: 8.92, paceKm: "4:10", paceMi: "6:43", grade: 4.7, avgHr: 159, maxHr: 171, watts: 443 },
    s30: { dist: 136.5, gain: 8.6,  speed: 4.55, mph: 10.18, paceKm: "3:39", paceMi: "5:53", grade: 6.1, avgHr: 135, maxHr: 155, watts: 415 },
  },
  {
    rep: 6,
    s60: { dist: 235.9, gain: 12.8, speed: 3.93, mph: 8.79, paceKm: "4:14", paceMi: "6:49", grade: 5.3, avgHr: 145, maxHr: 171, watts: 470 },
    s30: { dist: 143.5, gain: 9.4,  speed: 4.78, mph: 10.70, paceKm: "3:29", paceMi: "5:36", grade: 6.2, avgHr: 116, maxHr: 131, watts: 453 },
  },
];

const hillAvg60 = {
  mph: (hillReps_data.reduce((s,r)=>s+r.s60.mph,0)/6).toFixed(2),
  paceMi: "6:41", paceKm: "4:09",
  grade: (hillReps_data.reduce((s,r)=>s+r.s60.grade,0)/6).toFixed(1),
  avgHr: Math.round(hillReps_data.reduce((s,r)=>s+r.s60.avgHr,0)/6),
  watts: Math.round(hillReps_data.reduce((s,r)=>s+r.s60.watts,0)/6),
  gain: (hillReps_data.reduce((s,r)=>s+r.s60.gain,0)/6).toFixed(1),
};
const hillAvg30 = {
  mph: (hillReps_data.reduce((s,r)=>s+r.s30.mph,0)/6).toFixed(2),
  paceMi: "5:49", paceKm: "3:36",
  grade: (hillReps_data.reduce((s,r)=>s+r.s30.grade,0)/6).toFixed(1),
  avgHr: Math.round(hillReps_data.reduce((s,r)=>s+r.s30.avgHr,0)/6),
  watts: Math.round(hillReps_data.reduce((s,r)=>s+r.s30.watts,0)/6),
  gain: (hillReps_data.reduce((s,r)=>s+r.s30.gain,0)/6).toFixed(1),
};

const hillMetrics = [
  { key: "mph",   label: "Speed (mph)",   fmt: v => v.toFixed(2), max60: 9.31, max30: 10.70, color60: "#B84000", color30: "#534AB7" },
  { key: "grade", label: "Grade (%)",     fmt: v => v.toFixed(1)+"%", max60: 5.3, max30: 6.4, color60: "#085041", color30: "#0F6E56" },
  { key: "avgHr", label: "Avg HR (bpm)",  fmt: v => Math.round(v), max60: 159, max30: 135, color60: "#A32D2D", color30: "#D4621A" },
  { key: "watts", label: "Power (W)",     fmt: v => Math.round(v), max60: 503, max30: 460, color60: "#1460A8", color30: "#2882CC" },
  { key: "gain",  label: "Elev gain (m)", fmt: v => v.toFixed(1)+"m", max60: 13.6, max30: 9.4, color60: "#633806", color30: "#BA7517" },
];

function HillBar({ value, max, color, label }) {
  const pct = Math.min((value / (max * 1.15)) * 100, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <div style={{ width: 200, height: 18, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 6, transition: "width 0.3s" }}>
          <span style={{ fontSize: 10, color: "white", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
        </div>
      </div>
    </div>
  );
}

function HillRepsView() {
  const [metric, setMetric] = React.useState("mph");
  const [view, setView] = React.useState("table");
  const m = hillMetrics.find(x => x.key === metric);

  return (
    <div style={{ fontFamily: "var(--body)", padding: "1rem 0", maxWidth: 860 }}>
      <div style={{ fontSize: 17, fontWeight: 500, color: "var(--ink)", marginBottom: 2 }}>
        Alternating Hill Reps — June 10, 2026
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-dim)", marginBottom: "1.25rem" }}>
        6 rounds of 60s hard uphill + 30s hard uphill • Kunming City Park / Harvard–Grant
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem" }}>
        {[{id:"table",label:"Table"},{id:"bars",label:"Bar chart"},{id:"cards",label:"Rep cards"}].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            padding: "5px 14px", borderRadius: 8, border: "0.5px solid var(--line)",
            fontSize: 13, cursor: "pointer",
            background: view === v.id ? "#085041" : "var(--bg)",
            color: view === v.id ? "#9FE1CB" : "var(--ink-dim)",
          }}>{v.label}</button>
        ))}
      </div>

      {/* TABLE VIEW */}
      {view === "table" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--bg-raised)" }}>
                <th style={{ padding: "7px 12px", textAlign: "left", color: "var(--ink-faint)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "0.5px solid var(--line)" }}>Rep</th>
                {["Speed (mph)","Pace/mi","Pace/km","Grade","Avg HR","Max HR","Watts","Gain"].map(h => (
                  <th key={h} colSpan={2} style={{ padding: "7px 12px", textAlign: "center", color: "var(--ink-faint)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "0.5px solid var(--line)" }}>{h}</th>
                ))}
              </tr>
              <tr style={{ background: "var(--bg-raised)" }}>
                <th style={{ padding: "4px 12px", borderBottom: "1px solid var(--line)" }}></th>
                {["Speed (mph)","Pace/mi","Pace/km","Grade","Avg HR","Max HR","Watts","Gain"].map(h => (
                  <>
                    <th key={h+"60"} style={{ padding: "4px 8px", textAlign: "center", fontSize: 10, color: "#B84000", fontWeight: 600, borderBottom: "1px solid var(--line)", background: "#B8400010" }}>60s</th>
                    <th key={h+"30"} style={{ padding: "4px 8px", textAlign: "center", fontSize: 10, color: "#534AB7", fontWeight: 600, borderBottom: "1px solid var(--line)", background: "#534AB710" }}>30s</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody>
              {hillReps_data.map(r => (
                <tr key={r.rep} style={{ borderBottom: "0.5px solid var(--line)" }}>
                  <td style={{ padding: "6px 12px", fontWeight: 600, color: "var(--ink)" }}>Rep {r.rep}</td>
                  {/* mph */}
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#B8400010", fontWeight: 500, color: "#B84000" }}>{r.s60.mph.toFixed(2)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#534AB710", fontWeight: 500, color: "#534AB7" }}>{r.s30.mph.toFixed(2)}</td>
                  {/* pace/mi */}
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#B8400008" }}>{r.s60.paceMi}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#534AB708" }}>{r.s30.paceMi}</td>
                  {/* pace/km */}
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#B8400008" }}>{r.s60.paceKm}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#534AB708" }}>{r.s30.paceKm}</td>
                  {/* grade */}
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#08504110" }}>{r.s60.grade.toFixed(1)}%</td>
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#0F6E5610" }}>{r.s30.grade.toFixed(1)}%</td>
                  {/* avg hr */}
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#A32D2D10", color: r.s60.avgHr > 155 ? "#A32D2D" : "var(--ink)", fontWeight: r.s60.avgHr > 155 ? 600 : 400 }}>{r.s60.avgHr}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#D4621A10" }}>{r.s30.avgHr}</td>
                  {/* max hr */}
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#A32D2D10", color: r.s60.maxHr >= 170 ? "#A32D2D" : "var(--ink)", fontWeight: r.s60.maxHr >= 170 ? 600 : 400 }}>{r.s60.maxHr}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#D4621A10" }}>{r.s30.maxHr}</td>
                  {/* watts */}
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#1460A810" }}>{r.s60.watts}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#2882CC10" }}>{r.s30.watts}</td>
                  {/* gain */}
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#63380610" }}>{r.s60.gain.toFixed(1)}m</td>
                  <td style={{ padding: "6px 8px", textAlign: "center", background: "#BA751710" }}>{r.s30.gain.toFixed(1)}m</td>
                </tr>
              ))}
              {/* Averages row */}
              <tr style={{ background: "var(--bg-raised)", fontWeight: 500, borderTop: "1.5px solid var(--line)" }}>
                <td style={{ padding: "6px 12px", color: "var(--ink-dim)", fontSize: 11 }}>AVG</td>
                <td style={{ padding: "6px 8px", textAlign: "center", color: "#B84000", fontWeight: 600, background: "#B8400010" }}>{hillAvg60.mph}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", color: "#534AB7", fontWeight: 600, background: "#534AB710" }}>{hillAvg30.mph}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", background: "#B8400008" }}>{hillAvg60.paceMi}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", background: "#534AB708" }}>{hillAvg30.paceMi}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", background: "#B8400008" }}>{hillAvg60.paceKm}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", background: "#534AB708" }}>{hillAvg30.paceKm}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", background: "#08504110" }}>{hillAvg60.grade}%</td>
                <td style={{ padding: "6px 8px", textAlign: "center", background: "#0F6E5610" }}>{hillAvg30.grade}%</td>
                <td style={{ padding: "6px 8px", textAlign: "center", background: "#A32D2D10" }}>{hillAvg60.avgHr}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", background: "#D4621A10" }}>{hillAvg30.avgHr}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", background: "#A32D2D10" }}>—</td>
                <td style={{ padding: "6px 8px", textAlign: "center", background: "#D4621A10" }}>—</td>
                <td style={{ padding: "6px 8px", textAlign: "center", background: "#1460A810" }}>{hillAvg60.watts}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", background: "#2882CC10" }}>{hillAvg30.watts}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", background: "#63380610" }}>{hillAvg60.gain}m</td>
                <td style={{ padding: "6px 8px", textAlign: "center", background: "#BA751710" }}>{hillAvg30.gain}m</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* BAR CHART VIEW */}
      {view === "bars" && (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
            {hillMetrics.map(mm => (
              <button key={mm.key} onClick={() => setMetric(mm.key)} style={{
                padding: "5px 12px", borderRadius: 8, border: "0.5px solid var(--line)",
                fontSize: 12, cursor: "pointer",
                background: metric === mm.key ? "#3C3489" : "var(--bg-raised)",
                color: metric === mm.key ? "#CECBF6" : "var(--ink-dim)",
              }}>{mm.label}</button>
            ))}
          </div>

          <div style={{ background: "var(--bg)", border: "0.5px solid var(--line)", borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: "1rem", color: "var(--ink)" }}>{m.label} — 60s vs 30s per rep</div>
            {hillReps_data.map(r => (
              <div key={r.rep} style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-dim)", marginBottom: 4 }}>Rep {r.rep}</div>
                <HillBar value={r.s60[metric]} max={m.max60 * 1.1} color={m.color60} label={`60s: ${typeof r.s60[metric] === 'number' ? m.fmt(r.s60[metric]) : r.s60[metric]}`} />
                <HillBar value={r.s30[metric]} max={m.max30 * 1.1} color={m.color30} label={`30s: ${typeof r.s30[metric] === 'number' ? m.fmt(r.s30[metric]) : r.s30[metric]}`} />
              </div>
            ))}
            {/* Avg */}
            <div style={{ borderTop: "0.5px solid var(--line)", paddingTop: "1rem", marginTop: "0.5rem" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-dim)", marginBottom: 4 }}>Average</div>
              <HillBar value={parseFloat(hillAvg60[metric])} max={m.max60 * 1.1} color={m.color60} label={`60s avg: ${hillAvg60[metric]}${metric==="grade"?"%":metric==="avgHr"?" bpm":metric==="watts"?"W":metric==="gain"?"m":""}`} />
              <HillBar value={parseFloat(hillAvg30[metric])} max={m.max30 * 1.1} color={m.color30} label={`30s avg: ${hillAvg30[metric]}${metric==="grade"?"%":metric==="avgHr"?" bpm":metric==="watts"?"W":metric==="gain"?"m":""}`} />
            </div>
          </div>
        </div>
      )}

      {/* REP CARDS VIEW */}
      {view === "cards" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {hillReps_data.map(r => (
            <div key={r.rep} style={{ border: "0.5px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: "#085041", padding: "8px 14px" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#9FE1CB" }}>Rep {r.rep}</div>
              </div>
              <div style={{ padding: "10px 14px" }}>
                {/* 60s */}
                <div style={{ fontSize: 10, fontWeight: 600, color: "#B84000", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>60 seconds</div>
                {[
                  ["Speed", r.s60.mph.toFixed(2)+" mph"],
                  ["Pace", r.s60.paceMi+"/mi"],
                  ["Grade", r.s60.grade.toFixed(1)+"%"],
                  ["HR", `${r.s60.avgHr} avg / ${r.s60.maxHr} max`],
                  ["Power", r.s60.watts+"W"],
                  ["Gain", r.s60.gain.toFixed(1)+"m"],
                ].map(([l,v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0", borderBottom: "0.5px solid var(--line)" }}>
                    <span style={{ color: "var(--ink-faint)" }}>{l}</span>
                    <span style={{ color: "var(--ink)", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}

                {/* 30s */}
                <div style={{ fontSize: 10, fontWeight: 600, color: "#534AB7", textTransform: "uppercase", letterSpacing: "0.05em", margin: "8px 0 4px" }}>30 seconds</div>
                {[
                  ["Speed", r.s30.mph.toFixed(2)+" mph"],
                  ["Pace", r.s30.paceMi+"/mi"],
                  ["Grade", r.s30.grade.toFixed(1)+"%"],
                  ["HR", `${r.s30.avgHr} avg / ${r.s30.maxHr} max`],
                  ["Power", r.s30.watts+"W"],
                  ["Gain", r.s30.gain.toFixed(1)+"m"],
                ].map(([l,v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0", borderBottom: "0.5px solid var(--line)" }}>
                    <span style={{ color: "var(--ink-faint)" }}>{l}</span>
                    <span style={{ color: "var(--ink)", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: "1.25rem" }}>
        {[
          { label: "Avg 60s speed", value: hillAvg60.mph+" mph", sub: hillAvg60.paceMi+"/mi", color: "#B84000" },
          { label: "Avg 30s speed", value: hillAvg30.mph+" mph", sub: hillAvg30.paceMi+"/mi", color: "#534AB7" },
          { label: "60s avg power", value: hillAvg60.watts+"W", sub: hillAvg60.grade+"% grade", color: "#1460A8" },
          { label: "30s avg power", value: hillAvg30.watts+"W", sub: hillAvg30.grade+"% grade", color: "#2882CC" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--bg-raised)", borderRadius: 8, padding: "10px 12px", borderTop: `2px solid ${s.color}` }}>
            <div style={{ fontSize: 10, color: "var(--ink-faint)", marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "0.75rem", fontSize: 11, color: "var(--ink-faint)" }}>
        Segments: Kunming City Park (189.5m, +10.2m) • Kunming City Sprint (98.9m, +6.1m) • Harvard–Grant Hustle (203.3m, +5.8m) • Lap data from Strava, June 10 2026
      </div>
    </div>
  );
}
window.HillRepsView = HillRepsView;
