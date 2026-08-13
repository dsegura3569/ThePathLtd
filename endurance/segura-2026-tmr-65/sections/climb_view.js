function InitialClimbView() {
  const [hovered, setHovered] = React.useState(null);
  const maxGrade = 22;
  const chartH = 240;

  return (
    <div style={{paddingBottom:60}}>
      <SectionHeader eyebrow="04" title="Opening Climb" sub="Miles 0&ndash;8.0 &middot; 4,712 ft gain &middot; 8,750&rarr;13,500 ft &middot; avg grade 11.9%" />

      <div style={{ position: "relative", height: chartH + 40, marginBottom: 16, background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:12, padding:'16px' }}>
        {[0, 5, 10, 15, 20].map(v => (
          <div key={v} style={{ position: "absolute", left: 16, bottom: 32 + (v / maxGrade) * chartH, fontSize: 9, color: "var(--ink-faint)", width: 28, textAlign: "right" }}>{v}%</div>
        ))}
        {[5, 10, 15, 20].map(v => (
          <div key={v} style={{ position: "absolute", left: 48, right: 16, bottom: 32 + (v / maxGrade) * chartH, borderTop: "0.5px solid var(--line)" }} />
        ))}
        <div style={{ position: "absolute", left: 48, right: 16, bottom: 32, top: 16, display: "flex", alignItems: "flex-end", gap: 2 }}>
          {halfMiles.map((d, i) => {
            const barH = (d.grade / maxGrade) * chartH;
            const color = climbGetColor(d.grade);
            const isHovered = hovered === i;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", position:'relative' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onTouchStart={() => setHovered(i)}
              >
                {isHovered && (
                  <div style={{
                    position: "absolute", bottom: barH + 10,
                    background: "var(--bg-raised)", border: `1px solid ${color}`,
                    borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "var(--ink)",
                    whiteSpace: "nowrap", zIndex: 10, pointerEvents: "none",
                  }}>
                    <div style={{ fontWeight: 600 }}>Mile {d.mile}</div>
                    <div style={{ color }}>{d.grade > 0 ? "+" : ""}{d.grade}% grade</div>
                    <div style={{ color: "var(--ink-dim)" }}>{d.elev.toLocaleString()} ft</div>
                    <div style={{ color, marginTop: 2 }}>{climbGetZoneLabel(d.grade)}</div>
                  </div>
                )}
                <div style={{ width: "100%", height: barH, background: color, opacity: isHovered ? 1 : 0.85, borderRadius: "3px 3px 0 0", transition: "opacity 0.15s" }} />
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 48, right: 16, bottom: 16, display: "flex" }}>
          {halfMiles.map((d, i) => (
            <div key={i} style={{ flex: 1, fontSize: 9, color: "var(--ink-faint)", textAlign: "center" }}>{d.mile % 1 === 0 ? d.mile : ""}</div>
          ))}
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: 11, color: "var(--ink-faint)", marginBottom: 20 }}>Mile marker</div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        {zones.map(z => (
          <div key={z.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: z.color }} />
            <span style={{ fontSize: 12, color: "var(--ink-dim)" }}><strong style={{ color: "var(--ink)" }}>{z.label}</strong> {z.range}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginBottom: 24 }}>
        {[
          { mile: "0\u20132.0", label: "Runnable approach", grade: "1\u20134%", color: "#3CB897", note: "Settle in. Don't chase anyone." },
          { mile: "2.5\u20134.5", label: "Climb begins", grade: "~10%", color: "#E8943A", note: "Poles out. Transition to hike." },
          { mile: "5.0\u20138.0", label: "The grind", grade: "16\u201320%", color: "#A32D2D", note: "Steady power hike. Breathe." },
        ].map(s => (
          <div key={s.mile} style={{ background: "var(--bg-card)", border:'1px solid var(--line)', borderRadius: 10, padding: "14px 16px", borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontFamily:'var(--mono)' }}>Mi {s.mile}</div>
            <div style={{ fontFamily:'var(--display)', fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: "4px 0" }}>{s.label}</div>
            <div style={{ fontSize: 13, color: s.color, fontWeight: 600 }}>{s.grade}</div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 6 }}>{s.note}</div>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "60px 100px 80px 1fr", fontSize: 10, fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", padding: "8px 14px", background: "var(--bg-raised)", borderBottom: "1px solid var(--line)", fontFamily:'var(--mono)' }}>
          <span>Mile</span><span>Elevation</span><span>Grade</span><span>Zone</span>
        </div>
        {halfMiles.map((d, i) => {
          const color = climbGetColor(d.grade);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 100px 80px 1fr", fontSize: 12.5, padding: "7px 14px", borderBottom: "1px solid var(--line)", background: i % 2 === 0 ? "var(--bg)" : "var(--bg-card)" }}>
              <span style={{ color: "var(--ink-faint)" }}>{d.mile}</span>
              <span style={{ color: "var(--ink)" }}>{d.elev.toLocaleString()} ft</span>
              <span style={{ color, fontWeight: 600 }}>+{d.grade}%</span>
              <span style={{ color, fontSize: 11.5 }}>{climbGetZoneLabel(d.grade)}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: "var(--ink-faint)" }}>Source: ultraPacer GPX &mdash; 3,295 trackpoints, half-mile resolution.</div>
    </div>
  );
}
window.InitialClimbView = InitialClimbView;
