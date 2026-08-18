// Flattens all 10 segments' 0.1-mile profile points into one continuous
// full-course dataset with absolute mile position, computed once from the
// real GPX-derived gradeSegments (same source as Grade Profile) so this
// view never drifts out of sync with the rest of the dashboard.
function GradeExplorerView() {
  const [order, setOrder] = React.useState('course'); // 'course' | 'grade'
  const [hovered, setHovered] = React.useState(null);

  const samples = React.useMemo(() => buildFullCourseSamples(), []);

  const climbingMiles = React.useMemo(() =>
    Math.round(samples.filter(s => s.grade > 0).length / 10 * 10) / 10, [samples]);
  const descendingMiles = React.useMemo(() =>
    Math.round(samples.filter(s => s.grade < 0).length / 10 * 10) / 10, [samples]);
  const flatMiles = React.useMemo(() =>
    Math.round(samples.filter(s => s.grade === 0).length / 10 * 10) / 10, [samples]);
  const officialTotalMi = 63.5; // official course distance, for the headline
  const sampleCoverageMi = samples.length / 10; // what the samples actually cover -- percentages below are relative to this, not the official total, since 0.1mi bin edges at each of the 10 segment boundaries don't perfectly tile the full distance

  const displaySamples = React.useMemo(() => {
    if (order === 'course') return samples;
    return [...samples].sort((a, b) => a.grade - b.grade);
  }, [samples, order]);

  const maxAbs = Math.max(...samples.map(s => Math.abs(s.grade)), 25);
  const chartH = 300;

  const legend = [
    { label: "\u226520% up", c: "#7B1010" }, { label: "15\u201320%", c: "#A32D2D" },
    { label: "8\u201315%", c: "#E8943A" }, { label: "0\u20138%", c: "#3CB897" },
    { label: "0\u20138% down", c: "#7DD3FC" }, { label: "8\u201315% down", c: "#4A9FE8" },
    { label: "15\u201320% down", c: "#1460A8" }, { label: "\u226520% down", c: "#0C3B6E" },
  ];

  return (
    <div style={{paddingBottom:60}}>
      <SectionHeader eyebrow="05" title="Grade Explorer" sub={`Full course \u00b7 ${officialTotalMi.toFixed(1)} miles \u00b7 0.1-mile samples from ultraPacer GPX \u00b7 tap any bar for detail`} />

      <div style={{display:'flex', gap:8, marginBottom:20}}>
        <button onClick={() => setOrder('course')} style={{
          flex:1, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${order==='course' ? 'var(--climb)' : 'var(--line)'}`,
          background: order==='course' ? 'var(--climb)15' : 'var(--bg-card)', color: order==='course' ? 'var(--climb)' : 'var(--ink-dim)',
          cursor:'pointer', fontFamily:'var(--display)', fontWeight:600, fontSize:14,
        }}>Course order (start &rarr; finish)</button>
        <button onClick={() => setOrder('grade')} style={{
          flex:1, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${order==='grade' ? 'var(--climb)' : 'var(--line)'}`,
          background: order==='grade' ? 'var(--climb)15' : 'var(--bg-card)', color: order==='grade' ? 'var(--climb)' : 'var(--ink-dim)',
          cursor:'pointer', fontFamily:'var(--display)', fontWeight:600, fontSize:14,
        }}>By grade (&minus; &rarr; +)</button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10, marginBottom:20}}>
        <div style={{background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:12, padding:16}}>
          <div style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase'}}>Climbing (&gt;0%)</div>
          <div style={{fontFamily:'var(--display)', fontSize:22, fontWeight:700, color:'var(--climb)', marginTop:4}}>{climbingMiles} mi</div>
          <div style={{fontSize:11, color:'var(--ink-faint)', marginTop:2}}>{Math.round(climbingMiles/sampleCoverageMi*100)}% of course</div>
        </div>
        <div style={{background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:12, padding:16}}>
          <div style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase'}}>Descending (&lt;0%)</div>
          <div style={{fontFamily:'var(--display)', fontSize:22, fontWeight:700, color:'var(--descent)', marginTop:4}}>{descendingMiles} mi</div>
          <div style={{fontSize:11, color:'var(--ink-faint)', marginTop:2}}>{Math.round(descendingMiles/sampleCoverageMi*100)}% of course</div>
        </div>
        <div style={{background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:12, padding:16}}>
          <div style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase'}}>Flat (0%)</div>
          <div style={{fontFamily:'var(--display)', fontSize:22, fontWeight:700, color:'#3CB897', marginTop:4}}>{flatMiles} mi</div>
          <div style={{fontSize:11, color:'var(--ink-faint)', marginTop:2}}>{Math.round(flatMiles/sampleCoverageMi*100)}% of course</div>
        </div>
      </div>

      <div style={{position:'relative', height:chartH+40, background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:12, padding:12, overflowX:'auto', marginBottom:12}}>
        <div style={{position:'relative', height:chartH, minWidth: displaySamples.length * 4, display:'flex', alignItems:'flex-end', gap:1}}>
          <div style={{position:'absolute', left:0, right:0, top:chartH/2, borderTop:'1px solid var(--ink-faint)'}} />
          {displaySamples.map((d, i) => {
            const h = Math.min(Math.abs(d.grade) / maxAbs, 1) * (chartH/2 - 8);
            const isPos = d.grade >= 0;
            return (
              <div
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width:3, flexShrink:0, height:Math.max(h,1),
                  background: gradeColor(d.grade), opacity: hovered===null || hovered===i ? 1 : 0.35,
                  alignSelf: isPos ? 'flex-end' : 'flex-start',
                  marginTop: isPos ? 0 : chartH/2,
                  marginBottom: isPos ? chartH/2 : 0,
                  cursor:'pointer',
                }}
              />
            );
          })}
        </div>
      </div>

      <div style={{fontSize:11, color:'var(--ink-faint)', marginBottom:16, textAlign:'center'}}>
        {order === 'course' ? 'Mile 0 (Start) \u2192 Mile 65 (Finish) \u2014 scroll to see full course' : 'Sorted steepest descent \u2192 steepest climb \u2014 scroll to see full range'}
      </div>

      {hovered !== null && displaySamples[hovered] && (
        <div style={{background:'var(--bg-raised)', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', gap:20, flexWrap:'wrap'}}>
          <div><span style={{fontSize:11, color:'var(--ink-faint)'}}>Mile </span><strong>{displaySamples[hovered].mile}</strong></div>
          <div><span style={{fontSize:11, color:'var(--ink-faint)'}}>Elevation </span><strong>{displaySamples[hovered].elev.toLocaleString()}ft</strong></div>
          <div><span style={{fontSize:11, color:'var(--ink-faint)'}}>Grade </span><strong style={{color:gradeColor(displaySamples[hovered].grade)}}>{displaySamples[hovered].grade > 0 ? '+' : ''}{displaySamples[hovered].grade}%</strong></div>
          <div><span style={{fontSize:11, color:'var(--ink-faint)'}}>{gradeLabel(displaySamples[hovered].grade)}</span></div>
        </div>
      )}

      <div style={{display:'flex', flexWrap:'wrap', gap:'6px 16px', marginBottom:20}}>
        {legend.map(l => (
          <div key={l.label} style={{display:'flex', alignItems:'center', gap:6, fontSize:11.5, color:'var(--ink-dim)'}}>
            <span style={{width:11, height:11, borderRadius:3, background:l.c, display:'inline-block'}} />
            {l.label}
          </div>
        ))}
      </div>

      <div style={{fontSize:13, color:'var(--ink-dim)', lineHeight:1.6, marginBottom:8}}>
        Course tops out at <strong>+{Math.max(...samples.map(s=>s.grade)).toFixed(1)}%</strong> and <strong>{Math.min(...samples.map(s=>s.grade)).toFixed(1)}%</strong> &mdash;
        the tallest concentration sits in the 8&ndash;15% climb and descent zones, the bulk of the course being steep-but-sustainable grade rather than rare extreme spikes.
      </div>
      <div style={{fontSize:11, color:'var(--ink-faint)'}}>
        Source: ultraPacer GPX &middot; {samples.length} tenth-mile samples across the full course
      </div>
    </div>
  );
}

window.GradeExplorerView = GradeExplorerView;
