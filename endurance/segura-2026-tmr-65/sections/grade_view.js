function GradeProfileView() {
  const [active, setActive] = React.useState(1);
  const [hovered, setHovered] = React.useState(null);
  const seg = gradeSegments.find(s => s.id === active);

  const allGrades = seg.data.map(d => d.grade);
  const maxAbs = Math.max(...allGrades.map(Math.abs), 25);
  const chartH = 200;
  const zeroY = chartH * 0.5;

  return (
    <div style={{paddingBottom:60}}>
      <SectionHeader eyebrow="03" title="Grade Profile" sub="63 miles &middot; 23,320 ft gain &middot; ultraPacer GPX &middot; 0.1-mile resolution &middot; tap any bar for detail" />

      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 8, marginBottom: 20 }}>
        {gradeSegments.map(s => (
          <button key={s.id} onClick={() => { setActive(s.id); setHovered(null); }} style={{
            padding: "6px 10px", borderRadius: 8, flexShrink: 0,
            border: `1.5px solid ${active === s.id ? s.color : "var(--line)"}`,
            background: active === s.id ? s.color + "20" : "var(--bg-card)",
            cursor: "pointer", textAlign: "left", minWidth: 90,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: active === s.id ? s.color : "var(--ink-faint)" }}>
              {s.netDir === "climb" ? "\u25B2" : "\u25BC"} Mi {s.miS}&ndash;{s.miE}
            </div>
            <div style={{ fontSize: 9, color: "var(--ink-dim)", marginTop: 1, lineHeight: 1.3 }}>
              {s.from.split(" ")[0]}&rarr;{s.to.split(" ")[0]}
            </div>
            <div style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 1 }}>{s.clock}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily:'var(--display)', fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>
            Seg {seg.id}: {seg.from} &rarr; {seg.to}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>
            {seg.miE - seg.miS} miles &middot; {seg.clock} &middot; {seg.data[0].elev.toLocaleString()}&rarr;{seg.data[seg.data.length-1].elev.toLocaleString()} ft
          </div>
        </div>
        <div style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: seg.color + "20", color: seg.color, fontWeight: 700 }}>
          {seg.netDir === "climb" ? "\u25B2 NET CLIMB" : "\u25BC NET DESCENT"}
        </div>
      </div>

      <div style={{ position: "relative", height: chartH + 48, marginBottom: 12, background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:12, padding:'12px' }}>
        {[-20, -10, 0, 10, 20].map(v => {
          const y = zeroY - (v / maxAbs) * (chartH * 0.45);
          return (
            <div key={v} style={{ position: "absolute", left: 12, top: y+12, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 8, color: "var(--ink-faint)", width: 24, textAlign: "right" }}>{v}%</span>
              <div style={{ position: "absolute", left: 28, right: -8, borderTop: v === 0 ? "1px solid var(--ink-faint)" : "0.5px solid var(--line)" }} />
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 44, right: 12, top: 12, bottom: 44, display: "flex", alignItems: "center", gap: 1 }}>
          {seg.data.map((d, i) => {
            const isPos = d.grade >= 0;
            const barH = Math.abs(d.grade) / maxAbs * (chartH * 0.45);
            const color = gradeColor(d.grade);
            const isHov = hovered === i;
            return (
              <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", cursor: "pointer", position: "relative" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onTouchStart={() => setHovered(i === hovered ? null : i)}
              >
                {isHov && (
                  <div style={{
                    position: "absolute", top: isPos ? zeroY - barH - 70 : zeroY + barH + 4,
                    background: "var(--bg-raised)", border: `1px solid ${color}`,
                    borderRadius: 8, padding: "8px 10px", fontSize: 10, color: "var(--ink)",
                    whiteSpace: "nowrap", zIndex: 20, pointerEvents: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                  }}>
                    <div style={{ fontWeight: 700 }}>Mile {d.mile}</div>
                    <div style={{ color }}>{d.grade > 0 ? "+" : ""}{d.grade}% grade</div>
                    <div style={{ color: "var(--ink-dim)" }}>{d.elev.toLocaleString()} ft</div>
                    <div style={{ color, fontSize: 9, marginTop: 2 }}>{gradeLabel(d.grade)}</div>
                  </div>
                )}
                {isPos && (
                  <div style={{ position: "absolute", bottom: "50%", width: "100%", height: barH, background: color, opacity: isHov ? 1 : 0.8, borderRadius: "1px 1px 0 0", transition: "opacity 0.1s" }} />
                )}
                {!isPos && (
                  <div style={{ position: "absolute", top: "50%", width: "100%", height: barH, background: color, opacity: isHov ? 1 : 0.8, borderRadius: "0 0 1px 1px", transition: "opacity 0.1s" }} />
                )}
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 44, right: 12, bottom: 12, display: "flex", gap: 1 }}>
          {seg.data.map((d, i) => (
            <div key={i} style={{ flex: 1, fontSize: 8, color: "var(--ink-faint)", textAlign: "center" }}>
              {Number.isInteger(d.mile) ? d.mile : ""}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: seg.color + "12", border: `1px solid ${seg.color}40`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.6 }}>
        &#128172; {seg.cue}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 8, marginBottom: 20 }}>
        {[
          { label: "Max climb", value: `+${Math.max(...seg.data.map(d=>d.grade)).toFixed(1)}%`, color: "var(--climb)" },
          { label: "Max descent", value: `${Math.min(...seg.data.map(d=>d.grade)).toFixed(1)}%`, color: "var(--descent)" },
          { label: "High point", value: `${Math.max(...seg.data.map(d=>d.elev)).toLocaleString()} ft`, color: "var(--ink)" },
          { label: "Low point", value: `${Math.min(...seg.data.map(d=>d.elev)).toLocaleString()} ft`, color: "var(--ink-faint)" },
        ].map(s => <StatBox key={s.label} label={s.label} value={s.value} color={s.color} />)}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { label: "\u226520% climb", c: "#7B1010" }, { label: "15\u201320%", c: "#A32D2D" },
          { label: "8\u201315%", c: "#E8943A" }, { label: "0\u20138%", c: "#3CB897" },
          { label: "0\u20138% \u2193", c: "#7DD3FC" }, { label: "8\u201315% \u2193", c: "#4A9FE8" },
          { label: "15\u201320% \u2193", c: "#1460A8" }, { label: "\u226520% \u2193", c: "#0C3B6E" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.c }} />
            <span style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>{l.label}</span>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "55px 100px 70px 1fr", fontSize: 9, fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", padding: "8px 14px", background: "var(--bg-raised)", borderBottom: "1px solid var(--line)", fontFamily:'var(--mono)' }}>
          <span>Mile</span><span>Elevation</span><span>Grade</span><span>Zone</span>
        </div>
        {seg.data.map((d, i) => (
          <div key={i} onClick={() => setHovered(hovered === i ? null : i)} style={{
            display: "grid", gridTemplateColumns: "55px 100px 70px 1fr",
            fontSize: 11.5, padding: "6px 14px", cursor: "pointer",
            borderBottom: "1px solid var(--line)",
            background: hovered === i ? gradeColor(d.grade) + "18" : i%2===0 ? "var(--bg)" : "var(--bg-card)",
          }}>
            <span style={{ color: "var(--ink-faint)" }}>{d.mile}</span>
            <span style={{ color: "var(--ink)" }}>{d.elev.toLocaleString()} ft</span>
            <span style={{ color: gradeColor(d.grade), fontWeight: 600 }}>{d.grade > 0 ? "+" : ""}{d.grade}%</span>
            <span style={{ color: gradeColor(d.grade), fontSize: 10.5 }}>{gradeLabel(d.grade)}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: "var(--ink-faint)" }}>
        Source: ultraPacer GPX &middot; 3,295 trackpoints &middot; 23,320 ft verified total gain
      </div>
    </div>
  );
}
window.GradeProfileView = GradeProfileView;
