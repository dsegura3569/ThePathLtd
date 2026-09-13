function TreadmillView() {
  const [activeLeg, setActiveLeg] = React.useState(1);
  const leg = legs.find(l => l.id === activeLeg);
  const totalTime = leg.phases.reduce((s, p) => s + p.time, 0);

  let runningTotal = 0;
  const legsWithCumulative = legs.map(l => { runningTotal += l.dist; return { ...l, cumMiles: runningTotal }; });
  const activeLegCum = legsWithCumulative.find(l => l.id === activeLeg).cumMiles;

  return (
    <div style={{paddingBottom:60}}>
      <SectionHeader eyebrow="06" title="Treadmill Legs" sub="Based on official Bibstation aid station miles + ultraPacer GPX elevation data" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 6, marginBottom: 20 }}>
        {legsWithCumulative.map(l => (
          <button key={l.id} onClick={() => setActiveLeg(l.id)} style={{
            padding: "9px 8px", borderRadius: 8, border: "1.5px solid " + (activeLeg === l.id ? l.color : "var(--line)"),
            background: activeLeg === l.id ? l.color + "14" : "var(--bg-card)",
            cursor: "pointer", textAlign: "left",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: activeLeg === l.id ? l.color : "var(--ink-faint)", fontFamily:'var(--mono)' }}>Leg {l.id}</div>
            <div style={{ fontSize: 10, color: "var(--ink-dim)", lineHeight: 1.3, marginTop: 3 }}>{l.from.split(" ")[0]}&rarr;{l.to.split(" ")[0]}</div>
            <div style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 2 }}>{l.dist}mi <span>(@{l.cumMiles.toFixed(1)})</span></div>
          </button>
        ))}
      </div>

      <div style={{ border: "1.5px solid " + leg.color + "55", borderRadius: 16, overflow: "hidden", background:'var(--bg-card)' }}>
        <div style={{ background: leg.color + "14", borderBottom: "1px solid " + leg.color + "30", padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontFamily:'var(--display)', fontSize: 19, fontWeight: 600, color: "var(--ink)" }}>Leg {leg.id}: {leg.from} &rarr; {leg.to}</div>
              <div style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 4 }}>Mi {leg.miS}&ndash;{leg.miE} &middot; {leg.dist} miles &middot; {leg.elevS.toLocaleString()}&rarr;{leg.elevE.toLocaleString()} ft</div>
            </div>
            <TreadmillCharBadge character={leg.character} />
          </div>
        </div>

        <div style={{ padding: "18px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginBottom: 16 }}>
            <StatBox label="Gain" value={`\u2191${leg.gain.toLocaleString()} ft`} color="var(--climb)" />
            <StatBox label="Loss" value={`\u2193${leg.loss.toLocaleString()} ft`} color="var(--descent)" />
            <StatBox label="Distance" value={`${leg.dist} mi`} sub={`thru: ${activeLegCum.toFixed(1)}`} />
            <StatBox label="Session time" value={`${Math.floor(totalTime/60)}h ${totalTime%60}m`} />
          </div>

          <div style={{ fontSize: 13, color: "var(--ink)", background: "var(--bg-raised)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, lineHeight: 1.6 }}>{leg.profile}</div>

          <SmallLabel>Treadmill protocol</SmallLabel>
          <div style={{marginTop:10}}>
          {leg.phases.map((p, i) => {
            const isBackward = p.label.includes("Backward") || p.label.includes("backward");
            const [mStart, mEnd] = p.miRange.split("\u2013").map(parseFloat);
            const garminDist = (mEnd - mStart).toFixed(1);
            const paceMatch = p.speed.match(/\(([^)]+)\)/g) || [];
            const lastPaceMatch = paceMatch[paceMatch.length - 1] || "";
            const paces = lastPaceMatch.replace(/[()]/g, "").split("\u2013").map(s => s.trim());
            return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5, padding: "11px 14px", background: i % 2 === 0 ? "var(--bg-raised)" : "transparent", borderRadius: 8, marginBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{p.label}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: leg.color, fontFamily:'var(--mono)' }}>{p.time} min</span>
              </div>
              {isBackward ? (
                <div style={{ display: "flex", gap: 14, fontSize: 12, flexWrap: "wrap" }}>
                  <span style={{ color: "#A78BFA", fontWeight: 600 }}>&#9202; Duration Type: Time &rarr; {p.time} min</span>
                  <span style={{ color: "var(--ink-faint)" }}>Target Type: No Target</span>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 14, fontSize: 12, flexWrap: "wrap" }}>
                  <span style={{ color: "#7DD3FC", fontWeight: 600 }}>&#128207; Duration Type: Distance &rarr; {garminDist} mi</span>
                  <span style={{ color: "#7DD3FC", fontWeight: 600 }}>&#9201; Target Type: Pace &rarr; {paces.join("\u2013")}</span>
                </div>
              )}
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--ink-dim)" }}><span>&#128221; Notes: "{p.grade}"</span></div>
              <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--ink-faint)" }}>
                <span>Real course: Mi {p.miRange}</span><span>&middot;</span><span>{p.speed}</span>
              </div>
            </div>
            );
          })}
          </div>

          {leg.descentNote && <div style={{ marginTop: 12, fontSize: 12.5, color: "#F5BC6E", background: "#F5BC6E14", border:'1px solid #F5BC6E30', borderRadius: 10, padding: "12px 16px", lineHeight: 1.6 }}>&#9888; {leg.descentNote}</div>}
          {leg.nightNote && <div style={{ marginTop: 12, fontSize: 12.5, color: "#A78BFA", background: "#A78BFA14", border:'1px solid #A78BFA30', borderRadius: 10, padding: "12px 16px", lineHeight: 1.6 }}>&#127769; {leg.nightNote}</div>}
          {leg.finishNote && <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--ok)", background: "#3CB89714", border:'1px solid #3CB89730', borderRadius: 10, padding: "12px 16px", lineHeight: 1.6 }}>&#127937; Final leg to the finish line.</div>}
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <SmallLabel>All legs overview</SmallLabel>
        <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", overflowX:'auto', marginTop:10 }}>
          <table style={{width:'100%', minWidth:640, borderCollapse:'collapse'}}>
            <thead><tr style={{background:'var(--bg-raised)'}}>
              {['#','Leg','Mi','Cum','Gain','Loss','Character'].map(h=>(
                <th key={h} style={{padding:'8px 12px', fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)', textTransform:'uppercase', textAlign:'left', borderBottom:'1px solid var(--line)'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {legsWithCumulative.map(l => (
                <tr key={l.id} onClick={() => setActiveLeg(l.id)} style={{ cursor: "pointer", background: activeLeg === l.id ? l.color+"14" : "transparent" }}>
                  <td style={cellStyle2('var(--ink-faint)')}>{l.id}</td>
                  <td style={cellStyle2('var(--ink)', activeLeg===l.id?600:400)}>{l.from} &rarr; {l.to}</td>
                  <td style={cellStyle2('var(--ink-dim)')}>{l.dist}</td>
                  <td style={cellStyle2('var(--ink-faint)')}>{l.cumMiles.toFixed(1)}</td>
                  <td style={cellStyle2('var(--climb)')}>&uarr;{l.gain.toLocaleString()}</td>
                  <td style={cellStyle2('var(--descent)')}>&darr;{l.loss.toLocaleString()}</td>
                  <td style={{...cellStyle2(l.character==="CLIMB"?"var(--climb)":"var(--descent)"), fontSize:10.5}}>{l.character}-dom</td>
                </tr>
              ))}
              <tr style={{background:'var(--bg-raised)', borderTop:'2px solid var(--line)', fontWeight:700}}>
                <td style={cellStyle2('var(--ink-faint)')}></td>
                <td style={cellStyle2('var(--ink)',700)}>TOTAL</td>
                <td style={cellStyle2('var(--ink)',700)}>{legs.reduce((s,l)=>s+l.dist,0).toFixed(1)}</td>
                <td></td>
                <td style={cellStyle2('var(--climb)',700)}>&uarr;{legs.reduce((s,l)=>s+l.gain,0).toLocaleString()}</td>
                <td style={cellStyle2('var(--descent)',700)}>&darr;{legs.reduce((s,l)=>s+l.loss,0).toLocaleString()}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--ink-faint)" }}>
        Mile markers: bibstation.com official segments &middot; Elevation/grade: ultraPacer GPX (3,295 trackpoints) &middot; Total: 62.7mi, &uarr;23,305ft / &darr;23,041ft
      </div>
    </div>
  );
}
function cellStyle2(color, weight=400){ return {padding:'7px 12px', fontSize:12, color, fontWeight:weight, borderBottom:'1px solid var(--line)'}; }
window.TreadmillView = TreadmillView;
