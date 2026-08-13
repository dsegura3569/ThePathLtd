function HistogramView() {
  const [hovered, setHovered] = React.useState(null);
  const chartH = 260;

  const totalMiles = full.reduce((s, b) => s + b.miles, 0);
  const climbingMiles = full.filter(b => b.grade > 0).reduce((s, b) => s + b.miles, 0);
  const descendingMiles = full.filter(b => b.grade < 0).reduce((s, b) => s + b.miles, 0);
  const flatMiles = full.filter(b => b.grade === 0).reduce((s, b) => s + b.miles, 0);

  return (
    <div style={{paddingBottom:60}}>
      <SectionHeader eyebrow="03" title="Grade Distribution" sub="Full course &middot; -45% to +45% &middot; 630 tenth-mile samples from ultraPacer GPX" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 24 }}>
        <StatBox label="Climbing (>0%)" value={`${climbingMiles.toFixed(1)} mi`} sub={`${(climbingMiles/totalMiles*100).toFixed(0)}% of course`} color="var(--climb)" />
        <StatBox label="Descending (<0%)" value={`${descendingMiles.toFixed(1)} mi`} sub={`${(descendingMiles/totalMiles*100).toFixed(0)}% of course`} color="var(--descent)" />
        <StatBox label="Flat (0%)" value={`${flatMiles.toFixed(1)} mi`} sub={`${(flatMiles/totalMiles*100).toFixed(0)}% of course`} color="var(--ok)" />
      </div>

      <div style={{ position: "relative", height: chartH + 50, marginBottom: 12, overflowX: "auto", background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:12, padding:'12px 0' }}>
        <div style={{ position: "relative", height: chartH + 50, minWidth: 1400 }}>
          {[0, 0.5, 1.0, 1.5].map(v => (
            <div key={v} style={{ position: "absolute", left: 0, top: chartH - (v/1.6)*chartH, display: "flex", alignItems: "center", gap: 4, width: "100%" }}>
              <span style={{ fontSize: 8, color: "var(--ink-faint)", width: 24, textAlign: "right" }}>{v}</span>
              <div style={{ position: "absolute", left: 28, right: 0, borderTop: "0.5px solid var(--line)" }} />
            </div>
          ))}
          <div style={{
            position: "absolute", top: 0, bottom: 32,
            left: `calc(28px + ${((0 - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * 100}% - 14px)`,
            borderLeft: "1px solid var(--ink-faint)", width: 0,
          }} />
          <div style={{ position: "absolute", left: 28, right: 0, top: 0, bottom: 32, display: "flex", alignItems: "flex-end", gap: 0.5 }}>
            {full.map((d, i) => {
              const h = (d.miles / 1.6) * chartH;
              const color = histGradeColor(d.grade);
              const isHov = hovered === i;
              return (
                <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", cursor: d.miles > 0 ? "pointer" : "default", position: "relative" }}
                  onMouseEnter={() => d.miles > 0 && setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {isHov && (
                    <div style={{
                      position: "absolute", bottom: h + 6, left: "50%", transform: "translateX(-50%)",
                      background: "var(--bg-raised)", border: `1px solid ${color}`,
                      borderRadius: 6, padding: "6px 9px", fontSize: 10, color: "var(--ink)",
                      whiteSpace: "nowrap", zIndex: 20, pointerEvents: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    }}>
                      <div style={{ color, fontWeight: 700 }}>{d.grade > 0 ? "+" : ""}{d.grade}%</div>
                      <div style={{ color: "var(--ink-dim)" }}>{d.miles.toFixed(1)} mi</div>
                    </div>
                  )}
                  <div style={{ width: "100%", height: Math.max(h, d.miles > 0 ? 2 : 0), background: color, opacity: isHov ? 1 : 0.85 }} />
                </div>
              );
            })}
          </div>
          <div style={{ position: "absolute", left: 28, right: 0, bottom: 8, display: "flex" }}>
            {full.map((d, i) => (
              <div key={i} style={{ flex: 1, fontSize: 8, color: "var(--ink-faint)", textAlign: "center" }}>
                {d.grade % 5 === 0 ? (d.grade > 0 ? "+" : "") + d.grade : ""}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: 10.5, color: "var(--ink-faint)", marginBottom: 24 }}>Grade (%) &mdash; scroll to see full &plusmn;45% range</div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { label: "\u226520% up", c: "#7B1010" }, { label: "15\u201320%", c: "#A32D2D" },
          { label: "8\u201315%", c: "#E8943A" }, { label: "0\u20138%", c: "#3CB897" },
          { label: "0\u20138% down", c: "#7DD3FC" }, { label: "8\u201315% down", c: "#4A9FE8" },
          { label: "15\u201320% down", c: "#1460A8" }, { label: "\u226520% down", c: "#0C3B6E" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.c }} />
            <span style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>{l.label}</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.6 }}>
        Course tops out at <strong style={{ color: "var(--ink)" }}>+41.0%</strong> and <strong style={{ color: "var(--ink)" }}>-40.5%</strong> &mdash; nothing approaches &plusmn;60%, so the chart is scaled to &plusmn;45% for readability.
        The tallest bars sit in the 8&ndash;15% climb and descent zones &mdash; the bulk of the course is steep-but-sustainable grade, not the rare extreme spikes.
      </p>
      <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-faint)" }}>
        Source: ultraPacer GPX &middot; 3,295 trackpoints interpolated to 0.1-mile resolution (630 samples) &middot; 0.5% bin width
      </div>
    </div>
  );
}
window.HistogramView = HistogramView;
