function buildFuelTimeline(seg) {
  const events = [];
  if (seg.gels > 0) {
    const interval = seg.hours / seg.gels;
    for (let i = 0; i < seg.gels; i++) {
      events.push({ t: interval * (i + 0.5), type: 'gel', label: 'SIS GO gel' });
    }
  }
  if (seg.saltCaps > 0) {
    const interval = seg.hours / seg.saltCaps;
    for (let i = 0; i < seg.saltCaps; i++) {
      events.push({
        t: interval * (i + 0.5), type: 'salt',
        label: seg.saltCapType === 'caffeine' ? 'SaltStick +caffeine' : 'SaltStick capsule',
      });
    }
  }
  events.sort((a, b) => a.t - b.t);
  return events;
}

function fmtClockOffset(startClock, hoursOffset) {
  const m = startClock.match(/(\w+) (\d+):(\d+)(am|pm)/);
  if (!m) return '';
  let [, day, hh, mm, period] = m;
  let h24 = parseInt(hh) % 12 + (period === 'pm' ? 12 : 0);
  let totalMin = h24 * 60 + parseInt(mm) + Math.round(hoursOffset * 60);
  totalMin = totalMin % 1440;
  const oh = Math.floor(totalMin / 60);
  const om = totalMin % 60;
  const outPeriod = oh < 12 ? 'am' : 'pm';
  let oh12 = oh % 12; if (oh12 === 0) oh12 = 12;
  return `${oh12}:${String(om).padStart(2, '0')}${outPeriod}`;
}

function AmenityBadge({ label, active }) {
  return (
    <span style={{
      fontSize: 11, fontFamily: 'var(--mono)', padding: '4px 10px', borderRadius: 20,
      background: active ? 'rgba(232,148,58,0.15)' : 'var(--bg-raised)',
      color: active ? 'var(--climb)' : 'var(--ink-dim)',
      border: `1px solid ${active ? 'var(--climb)' : 'var(--line)'}`,
    }}>{label}</span>
  );
}

function SegmentsView() {
  const { targetHours, targetCarb, targetSodium, targetWaterHr, vestCapacity, vestCount, bladderCapacity, beltCapacity,
    vestEnabled, bladderEnabled, beltEnabled, handheldCapacity, handheldEnabled, vesselRanges, gelRateShift } = React.useContext(window.TargetHoursContext);
  const segments = React.useMemo(() => computeDerivedSegments(targetHours, targetCarb, targetSodium, targetWaterHr, gelRateShift), [targetHours, targetCarb, targetSodium, targetWaterHr, gelRateShift]);
  const [range_, setRange_] = React.useState({ start: 1, size: 1 });
  const rangeStart = range_.start, rangeSize = range_.size;
  const [showDetail, setShowDetail] = React.useState(false);
  const [hovered, setHovered] = React.useState(null);
  const total = segments.length;
  const rangeEnd = Math.min(total, rangeStart + rangeSize - 1);
  const isSingle = rangeStart === rangeEnd;
  const rangeSegs = segments.slice(rangeStart - 1, rangeEnd);
  const rangeGradeSegs = gradeSegments.slice(rangeStart - 1, rangeEnd);
  const gSeg = rangeGradeSegs[0]; // first segment in range -- .from, .color stay meaningful as "where this range starts"
  const pSeg = rangeSegs[0];
  const lastGSeg = rangeGradeSegs[rangeGradeSegs.length - 1]; // range's actual endpoint for .to/.miE
  const rangeData = rangeGradeSegs.flatMap(s => s.data.map(d => ({ ...d, mile: Math.round((s.miS + d.mile) * 100) / 100 }))).sort((a, b) => a.mile - b.mile); // flattened 0.1-mi samples across every segment in the range, mile converted from per-segment-relative to absolute course position and re-sorted (same two corrections buildFullCourseSamples already applies -- adjacent segments' own boundary samples can slightly overlap) -- for both the simple elevation chart and the detailed grade chart/table below

  const elevs = rangeGradeSegs.flatMap(s => s.data.map(d => d.elev));
  const minElev = Math.min(...elevs);
  const maxElev = Math.max(...elevs);
  const range = maxElev - minElev || 1;
  const chartH = 180;

  const hasDropBag = rangeSegs.some(s => /drop bag|\(db\d\)/i.test(s.to)) || rangeGradeSegs.some(s => /drop bag|\(db\d\)/i.test(s.to));

  function go(delta) {
    setRange_(prev => {
      const next = prev.start + delta;
      if (next >= 1 && next + prev.size - 1 <= total) return { start: next, size: prev.size };
      return prev;
    });
    setHovered(null);
  }

  function setZoom(newSizeOrFn) {
    setRange_(prev => {
      const requestedSize = typeof newSizeOrFn === 'function' ? newSizeOrFn(prev.size) : newSizeOrFn;
      const clampedSize = Math.max(1, Math.min(total, requestedSize));
      let newStart = prev.start;
      if (newStart + clampedSize - 1 > total) newStart = total - clampedSize + 1;
      return { start: newStart, size: clampedSize };
    });
    setHovered(null);
  }

  const vessels = vesselPlan(pSeg, capacitiesForSegment(pSeg.id, {
    vestCapacity, vestCount, vestEnabled, bladderCapacity, bladderEnabled, beltCapacity, beltEnabled,
    handheldCapacity, handheldEnabled, vesselRanges,
  }));
  const timeline = buildFuelTimeline(pSeg);

  const marginOk = pSeg.cutoffMarginHours >= 0;
  const marginAbs = Math.abs(pSeg.cutoffMarginHours);
  const marginH = Math.floor(marginAbs);
  const marginM = Math.round((marginAbs - marginH) * 60);

  // Aggregates across the full selected range -- used whenever rangeSize > 1
  // (a single segment just uses pSeg's own fields directly, unchanged from
  // before this range-selection feature existed). Cutoff margin uses the
  // LAST segment in the range, since "am I on pace" only makes sense
  // evaluated at the point you'd actually be at, not averaged across a span.
  const lastInRange = rangeSegs[rangeSegs.length - 1];
  const rangeAgg = {
    distReal: Math.round(rangeSegs.reduce((a, s) => a + s.distReal, 0) * 10) / 10,
    hoursTotal: rangeSegs.reduce((a, s) => a + s.hours, 0),
    gain: rangeSegs.reduce((a, s) => a + s.segGain, 0),
    loss: rangeSegs.reduce((a, s) => a + s.segLoss, 0),
    maxClimb: Math.max(...rangeSegs.map(s => s.maxClimb)),
    maxDescent: Math.max(...rangeSegs.map(s => s.maxDescent)),
    gels: rangeSegs.reduce((a, s) => a + s.gels, 0),
    tailwind: rangeSegs.reduce((a, s) => a + s.tailwind, 0),
    saltCaps: rangeSegs.reduce((a, s) => a + s.saltCaps, 0),
    dilutedMl: rangeSegs.reduce((a, s) => a + s.dilutedMl, 0),
    plainMl: rangeSegs.reduce((a, s) => a + s.plainMl, 0),
    cutoffMarginHours: lastInRange.cutoffMarginHours,
    cutoffClock: lastInRange.cutoffClock,
    cutoffHours: lastInRange.cutoffHours,
  };
  const rangeHoursFmt = `${Math.floor(rangeAgg.hoursTotal)}h${String(Math.round((rangeAgg.hoursTotal % 1) * 60)).padStart(2, '0')}m`;
  const rangeAvgPaceMinPerMi = rangeAgg.hoursTotal * 60 / rangeAgg.distReal;
  const rangeAvgPaceFmt = `${Math.floor(rangeAvgPaceMinPerMi)}:${String(Math.round((rangeAvgPaceMinPerMi % 1) * 60)).padStart(2, '0')}`;
  const rangeMarginOk = rangeAgg.cutoffMarginHours >= 0;
  const rangeMarginAbs = Math.abs(rangeAgg.cutoffMarginHours);
  const rangeMarginH = Math.floor(rangeMarginAbs);
  const rangeMarginM = Math.round((rangeMarginAbs - rangeMarginH) * 60);
  // Aid stations crossed within the range (excludes the range's own start,
  // since that's where you're departing from, not arriving at)
  const rangeAidStations = rangeGradeSegs.map(s => ({ name: s.to, seg: rangeSegs.find(p => p.to === s.to) })).filter(a => a.seg);

  // Detailed grade chart's own scale -- independent of the elevation
  // profile chart above, since grade (%) and elevation (ft) are different
  // units/ranges entirely.
  const allGrades = rangeData.map(d => d.grade);
  const maxAbsGrade = Math.max(...allGrades.map(Math.abs), 25);
  const gradeChartH = 200;
  const zeroY = gradeChartH * 0.5;

  // Whole-course overview (merged in from the former separate Grade
  // Explorer tab): same 0.1-mile samples flattened across all segments,
  // not scoped to whichever one is currently active above -- this is
  // deliberately "the entire course at once", the complementary view to
  // stepping through one leg at a time.
  const [showWholeCourse, setShowWholeCourse] = React.useState(false);
  const [wcOrder, setWcOrder] = React.useState('course'); // 'course' | 'grade'
  const [wcHovered, setWcHovered] = React.useState(null);
  const wcSamples = React.useMemo(() => buildFullCourseSamples(), []);
  const wcClimbingMiles = React.useMemo(() => Math.round(wcSamples.filter(s => s.grade > 0).length / 10 * 10) / 10, [wcSamples]);
  const wcDescendingMiles = React.useMemo(() => Math.round(wcSamples.filter(s => s.grade < 0).length / 10 * 10) / 10, [wcSamples]);
  const wcFlatMiles = React.useMemo(() => Math.round(wcSamples.filter(s => s.grade === 0).length / 10 * 10) / 10, [wcSamples]);
  const wcCoverageMi = wcSamples.length / 10;
  const wcDisplaySamples = React.useMemo(() => {
    if (wcOrder === 'course') return wcSamples;
    return [...wcSamples].sort((a, b) => a.grade - b.grade);
  }, [wcSamples, wcOrder]);
  const wcMaxAbs = Math.max(...wcSamples.map(s => Math.abs(s.grade)), 25);
  const wcChartH = 240;
  const wcLegend = [
    { label: "\u226520% up", c: "#7B1010" }, { label: "15\u201320%", c: "#A32D2D" },
    { label: "8\u201315%", c: "#E8943A" }, { label: "0\u20138%", c: "#3CB897" },
    { label: "0\u20138% down", c: "#7DD3FC" }, { label: "8\u201315% down", c: "#4A9FE8" },
    { label: "15\u201320% down", c: "#1460A8" }, { label: "\u226520% down", c: "#0C3B6E" },
  ];

  return (
    <div style={{ paddingBottom: 60 }}>
      <SectionHeader eyebrow="03" title="Segments" sub={`Course broken into legs \u00b7 step through start to finish, or expand the whole-course overview below \u00b7 official aid station miles + ultraPacer elevation \u00b7 ${targetHours}hr target (adjust on Race Day Plan)`} />

      <button onClick={() => setShowWholeCourse(v => !v)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-raised)', border: '1px solid var(--line)', borderRadius: 10,
        padding: '12px 16px', marginBottom: showWholeCourse ? 16 : 24, cursor: 'pointer', color: 'var(--ink)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {showWholeCourse ? 'Hide' : 'Show'} whole-course overview (all segments at once, sortable by grade)
        </span>
        <span style={{ color: 'var(--ink-faint)', fontSize: 13 }}>{showWholeCourse ? '\u2212' : '+'}</span>
      </button>

      {showWholeCourse && (
        <div style={{ marginBottom: 28 }}>
          <div style={{display:'flex', gap:8, marginBottom:20}}>
            <button onClick={() => setWcOrder('course')} style={{
              flex:1, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${wcOrder==='course' ? 'var(--climb)' : 'var(--line)'}`,
              background: wcOrder==='course' ? 'var(--climb)15' : 'var(--bg-card)', color: wcOrder==='course' ? 'var(--climb)' : 'var(--ink-dim)',
              cursor:'pointer', fontFamily:'var(--display)', fontWeight:600, fontSize:14,
            }}>Course order (start &rarr; finish)</button>
            <button onClick={() => setWcOrder('grade')} style={{
              flex:1, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${wcOrder==='grade' ? 'var(--climb)' : 'var(--line)'}`,
              background: wcOrder==='grade' ? 'var(--climb)15' : 'var(--bg-card)', color: wcOrder==='grade' ? 'var(--climb)' : 'var(--ink-dim)',
              cursor:'pointer', fontFamily:'var(--display)', fontWeight:600, fontSize:14,
            }}>By grade (&minus; &rarr; +)</button>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:10, marginBottom:20}}>
            <div style={{background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:12, padding:16}}>
              <div style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase'}}>Climbing (&gt;0%)</div>
              <div style={{fontFamily:'var(--display)', fontSize:22, fontWeight:700, color:'var(--climb)', marginTop:4}}>{wcClimbingMiles} mi</div>
              <div style={{fontSize:11, color:'var(--ink-faint)', marginTop:2}}>{Math.round(wcClimbingMiles/wcCoverageMi*100)}% of course</div>
            </div>
            <div style={{background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:12, padding:16}}>
              <div style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase'}}>Descending (&lt;0%)</div>
              <div style={{fontFamily:'var(--display)', fontSize:22, fontWeight:700, color:'var(--descent)', marginTop:4}}>{wcDescendingMiles} mi</div>
              <div style={{fontSize:11, color:'var(--ink-faint)', marginTop:2}}>{Math.round(wcDescendingMiles/wcCoverageMi*100)}% of course</div>
            </div>
            <div style={{background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:12, padding:16}}>
              <div style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase'}}>Flat (0%)</div>
              <div style={{fontFamily:'var(--display)', fontSize:22, fontWeight:700, color:'#3CB897', marginTop:4}}>{wcFlatMiles} mi</div>
              <div style={{fontSize:11, color:'var(--ink-faint)', marginTop:2}}>{Math.round(wcFlatMiles/wcCoverageMi*100)}% of course</div>
            </div>
          </div>

          <div style={{position:'relative', height:wcChartH+40, background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:12, padding:12, overflowX:'auto', marginBottom:12}}>
            <div style={{position:'relative', height:wcChartH, minWidth: wcDisplaySamples.length * 4, display:'flex', alignItems:'flex-end', gap:1}}>
              <div style={{position:'absolute', left:0, right:0, top:wcChartH/2, borderTop:'1px solid var(--ink-faint)'}} />
              {wcDisplaySamples.map((d, i) => {
                const h = Math.min(Math.abs(d.grade) / wcMaxAbs, 1) * (wcChartH/2 - 8);
                const isPos = d.grade >= 0;
                return (
                  <div
                    key={i}
                    onMouseEnter={() => setWcHovered(i)}
                    onMouseLeave={() => setWcHovered(null)}
                    style={{
                      width:3, flexShrink:0, height:Math.max(h,1),
                      background: gradeColor(d.grade), opacity: wcHovered===null || wcHovered===i ? 1 : 0.35,
                      alignSelf: isPos ? 'flex-end' : 'flex-start',
                      marginTop: isPos ? 0 : wcChartH/2,
                      marginBottom: isPos ? wcChartH/2 : 0,
                      cursor:'pointer',
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div style={{fontSize:11, color:'var(--ink-faint)', marginBottom:16, textAlign:'center'}}>
            {wcOrder === 'course' ? 'Mile 0 (Start) \u2192 Finish \u2014 scroll to see full course' : 'Sorted steepest descent \u2192 steepest climb \u2014 scroll to see full range'}
          </div>

          {wcHovered !== null && wcDisplaySamples[wcHovered] && (
            <div style={{background:'var(--bg-raised)', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', gap:20, flexWrap:'wrap'}}>
              <div><span style={{fontSize:11, color:'var(--ink-faint)'}}>Mile </span><strong>{wcDisplaySamples[wcHovered].mile}</strong></div>
              <div><span style={{fontSize:11, color:'var(--ink-faint)'}}>Elevation </span><strong>{wcDisplaySamples[wcHovered].elev.toLocaleString()}ft</strong></div>
              <div><span style={{fontSize:11, color:'var(--ink-faint)'}}>Grade </span><strong style={{color:gradeColor(wcDisplaySamples[wcHovered].grade)}}>{wcDisplaySamples[wcHovered].grade > 0 ? '+' : ''}{wcDisplaySamples[wcHovered].grade}%</strong></div>
              <div><span style={{fontSize:11, color:'var(--ink-faint)'}}>{gradeLabel(wcDisplaySamples[wcHovered].grade)}</span></div>
            </div>
          )}

          <div style={{display:'flex', flexWrap:'wrap', gap:'6px 16px', marginBottom:20}}>
            {wcLegend.map(l => (
              <div key={l.label} style={{display:'flex', alignItems:'center', gap:6, fontSize:11.5, color:'var(--ink-dim)'}}>
                <span style={{width:11, height:11, borderRadius:3, background:l.c, display:'inline-block'}} />
                {l.label}
              </div>
            ))}
          </div>

          <div style={{fontSize:13, color:'var(--ink-dim)', lineHeight:1.6}}>
            Course tops out at <strong>+{Math.max(...wcSamples.map(s=>s.grade)).toFixed(1)}%</strong> and <strong>{Math.min(...wcSamples.map(s=>s.grade)).toFixed(1)}%</strong> &mdash;
            the tallest concentration sits in the 8&ndash;15% climb and descent zones, the bulk of the course being steep-but-sustainable grade rather than rare extreme spikes.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => go(-1)} disabled={rangeStart === 1} style={{
          width: 40, height: 40, borderRadius: 10, border: '1px solid var(--line)',
          background: 'var(--bg-raised)', color: rangeStart === 1 ? 'var(--ink-faint)' : 'var(--ink)',
          cursor: rangeStart === 1 ? 'not-allowed' : 'pointer', fontSize: 16,
        }}>&larr;</button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
            {isSingle ? `SEGMENT ${rangeStart} OF ${total}` : `SEGMENTS ${rangeStart}\u2013${rangeEnd} OF ${total}`}
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, marginTop: 2 }}>
            {gSeg.from} &rarr; {lastGSeg.to}
          </div>
        </div>

        <button onClick={() => go(1)} disabled={rangeEnd === total} style={{
          width: 40, height: 40, borderRadius: 10, border: '1px solid var(--line)',
          background: 'var(--bg-raised)', color: rangeEnd === total ? 'var(--ink-faint)' : 'var(--ink)',
          cursor: rangeEnd === total ? 'not-allowed' : 'pointer', fontSize: 16,
        }}>&rarr;</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setZoom(s => s - 1)} disabled={rangeSize === 1} title="Zoom in (fewer segments)" style={{
          width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-raised)',
          color: rangeSize === 1 ? 'var(--ink-faint)' : 'var(--ink)', cursor: rangeSize === 1 ? 'not-allowed' : 'pointer', fontSize: 15,
        }}>&minus;</button>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', minWidth: 130, textAlign: 'center' }}>
          {rangeSize} segment{rangeSize === 1 ? '' : 's'} selected
        </span>
        <button onClick={() => setZoom(s => s + 1)} disabled={rangeSize === total} title="Zoom out (more segments)" style={{
          width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-raised)',
          color: rangeSize === total ? 'var(--ink-faint)' : 'var(--ink)', cursor: rangeSize === total ? 'not-allowed' : 'pointer', fontSize: 15,
        }}>+</button>
        <button onClick={() => setZoom(total)} disabled={rangeSize === total} style={{
          marginLeft: 8, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--climb)', background: 'none',
          border: 'none', textDecoration: 'underline', cursor: rangeSize === total ? 'default' : 'pointer', padding: 0,
          opacity: rangeSize === total ? 0.4 : 1,
        }}>Zoom to full course</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}>
          <SmallLabel>Start</SmallLabel>
          <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, marginTop: 4 }}>{gSeg.from}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>
            Mile {gSeg.miS} &middot; {pSeg.elevS.toLocaleString()}ft &middot; {pSeg.clockS}
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}>
          <SmallLabel color="var(--climb)">End</SmallLabel>
          <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, marginTop: 4 }}>{lastGSeg.to}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>
            Mile {lastGSeg.miE} &middot; {lastInRange.elevE.toLocaleString()}ft &middot; {lastInRange.clockE}
          </div>
          {hasDropBag && (
            <div style={{ fontSize: 11, color: 'var(--climb)', marginTop: 6, fontFamily: 'var(--mono)' }}>
              &#9679; Drop bag available in range
            </div>
          )}
        </div>
      </div>

      <div style={{
        background: rangeMarginOk ? 'var(--bg-card)' : 'rgba(232,148,58,0.1)',
        border: `1px solid ${rangeMarginOk ? 'var(--line)' : 'var(--climb)'}`,
        borderRadius: 12, padding: '12px 14px', marginBottom: 4,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <SmallLabel>{isSingle ? 'Aid station cutoff' : 'Cutoff at end of range'}</SmallLabel>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{rangeAgg.cutoffClock} <span style={{ color: 'var(--ink-faint)', fontWeight: 400, fontSize: 12 }}>(+{rangeAgg.cutoffHours}h)</span></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <SmallLabel color={rangeMarginOk ? undefined : 'var(--climb)'}>{rangeMarginOk ? 'Modeled margin' : 'Modeled — behind cutoff'}</SmallLabel>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, color: rangeMarginOk ? '#3CB897' : 'var(--climb)' }}>
            {rangeMarginOk ? '+' : '-'}{rangeMarginH}h{String(rangeMarginM).padStart(2,'0')}m
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 20, lineHeight: 1.5 }}>
        Based on a grade+altitude-adjusted pace model calibrated to your {targetHours}hr goal — not a guarantee, just a planning estimate.
      </div>

      {isSingle ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {pSeg.amenities.water && <AmenityBadge label="Water" />}
          {pSeg.amenities.food && <AmenityBadge label="Food" />}
          {pSeg.amenities.dropBag && <AmenityBadge label="Drop Bag" active />}
          {pSeg.amenities.crew && <AmenityBadge label="Crew" />}
          {pSeg.amenities.note && <span style={{ fontSize: 11, color: 'var(--ink-faint)', alignSelf: 'center', fontFamily: 'var(--mono)' }}>{pSeg.amenities.note}</span>}
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <SmallLabel>Aid stations in range</SmallLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {rangeAidStations.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, minWidth: 140 }}>{a.name}</span>
                {a.seg.amenities.water && <AmenityBadge label="Water" />}
                {a.seg.amenities.food && <AmenityBadge label="Food" />}
                {a.seg.amenities.dropBag && <AmenityBadge label="Drop Bag" active />}
                {a.seg.amenities.crew && <AmenityBadge label="Crew" />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ position: 'relative', height: chartH + 24, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
        <svg viewBox={`0 0 100 ${chartH}`} preserveAspectRatio="none" style={{ width: '100%', height: chartH, display: 'block' }}>
          <polyline
            points={rangeData.map((d, i) => {
              const x = (i / (rangeData.length - 1)) * 100;
              const y = chartH - ((d.elev - minElev) / range) * (chartH - 10) - 5;
              return `${x},${y}`;
            }).join(' ')}
            fill="none" stroke={gSeg.color} strokeWidth="1.6" vectorEffect="non-scaling-stroke"
            strokeLinejoin="round" strokeLinecap="round"
          />
          <polygon
            points={
              `0,${chartH} ` +
              rangeData.map((d, i) => {
                const x = (i / (rangeData.length - 1)) * 100;
                const y = chartH - ((d.elev - minElev) / range) * (chartH - 10) - 5;
                return `${x},${y}`;
              }).join(' ') +
              ` 100,${chartH}`
            }
            fill={gSeg.color} opacity="0.12"
          />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginTop: 4 }}>
          <span>{minElev.toLocaleString()}ft</span>
          <span>{maxElev.toLocaleString()}ft</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginBottom: 28 }}>
        {isSingle ? (
          <>
            <StatBox label="Distance" value={`${pSeg.dist}mi`} sub={`${pSeg.distReal}mi measured`} />
            <StatBox label="Time" value={pSeg.time} />
            <StatBox label="Avg Pace" value={`${pSeg.avgPace}/mi`} />
            <StatBox label="Gain" value={`+${pSeg.segGain.toLocaleString()}ft`} color="var(--climb)" />
            <StatBox label="Loss" value={`-${pSeg.segLoss.toLocaleString()}ft`} color="var(--descent)" />
            <StatBox label="Max Climb" value={`${pSeg.maxClimb}%`} />
            <StatBox label="Max Descent" value={`${pSeg.maxDescent}%`} />
            <StatBox label="Net" value={pSeg.netFt} color={pSeg.netDir === 'climb' ? 'var(--climb)' : 'var(--descent)'} />
          </>
        ) : (
          <>
            <StatBox label="Distance" value={`${rangeAgg.distReal}mi`} sub="measured" />
            <StatBox label="Time" value={rangeHoursFmt} />
            <StatBox label="Avg Pace" value={`${rangeAvgPaceFmt}/mi`} />
            <StatBox label="Gain" value={`+${rangeAgg.gain.toLocaleString()}ft`} color="var(--climb)" />
            <StatBox label="Loss" value={`-${rangeAgg.loss.toLocaleString()}ft`} color="var(--descent)" />
            <StatBox label="Max Climb" value={`${rangeAgg.maxClimb}%`} sub="steepest segment in range" />
            <StatBox label="Max Descent" value={`${rangeAgg.maxDescent}%`} sub="steepest segment in range" />
            <StatBox label="Net" value={`${rangeAgg.gain - rangeAgg.loss >= 0 ? '+' : ''}${(rangeAgg.gain - rangeAgg.loss).toLocaleString()}ft`} color={rangeAgg.gain >= rangeAgg.loss ? 'var(--climb)' : 'var(--descent)'} />
          </>
        )}
      </div>

      <div style={{ marginBottom: 28 }}>
        <SmallLabel>Fuel &amp; Hydration</SmallLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginTop: 10, marginBottom: 14 }}>
          <StatBox label="Carbs/hr" value={`${pSeg.actualCarbHr}g`} sub={isSingle ? undefined : 'target rate, constant'} />
          <StatBox label="Sodium/hr" value={`${pSeg.sodiumHr}mg`} sub={isSingle ? undefined : 'target rate, constant'} />
          <StatBox label="Water/hr" value={`${pSeg.waterMlPerHr}ml`} color="#4A9FE8" sub={isSingle ? undefined : 'target rate, constant'} />
          <StatBox label="Calories/hr" value={`${pSeg.caloriesPerHr}kcal`} sub={isSingle ? undefined : 'target rate, constant'} />
          <StatBox label="Tailwind mix" value={`${(pSeg.tailwindConc*100).toFixed(1)}%`} />
          {pSeg.caffeineHr > 0 && <StatBox label="Caffeine/hr" value={`${pSeg.caffeineHr}mg`} color="var(--climb)" />}
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            {isSingle ? 'Timing this segment' : `Timing across ${rangeSize} segments`}
          </div>
          {isSingle ? (
            <>
              {timeline.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>No discrete doses this segment — hydration only.</div>}
              {timeline.map((ev, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 0', borderTop: i > 0 ? '1px solid var(--line)' : 'none', fontSize: 13,
                }}>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-faint)', fontSize: 12, width: 70 }}>
                    {fmtClockOffset(pSeg.clockS, ev.t)}
                  </span>
                  <span style={{ flex: 1, marginLeft: 10 }}>{ev.label}</span>
                  <span style={{
                    fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 20,
                    background: ev.type === 'gel' ? 'rgba(232,148,58,0.15)' : 'rgba(74,159,232,0.15)',
                    color: ev.type === 'gel' ? 'var(--climb)' : '#4A9FE8',
                  }}>
                    {ev.type === 'gel' ? 'GEL' : 'SALT'}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
              Exact timing isn't shown across multiple segments — zoom in to one segment for a dose-by-dose schedule. Totals for the full range are below.
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 }}>
          {isSingle ? (
            <>
              <StatBox label="Gels total" value={pSeg.gels} sub={`${pSeg.gelsPerHr}/hr`} />
              <StatBox label="Tailwind total" value={`${pSeg.tailwind}g`} sub={`${pSeg.dilutedMl}ml water`} />
              <StatBox label="Salt caps total" value={pSeg.saltCaps} sub={pSeg.saltCapType === 'caffeine' ? 'caffeine' : 'original'} />
              <StatBox label="Plain water" value={`${pSeg.plainMl}ml`} />
            </>
          ) : (
            <>
              <StatBox label="Gels total" value={rangeAgg.gels} />
              <StatBox label="Tailwind total" value={`${rangeAgg.tailwind}g`} sub={`${rangeAgg.dilutedMl}ml water`} />
              <StatBox label="Salt caps total" value={rangeAgg.saltCaps} />
              <StatBox label="Plain water" value={`${rangeAgg.plainMl}ml`} />
            </>
          )}
        </div>
      </div>

      {isSingle ? (
        <VesselPlanCompact seg={pSeg} vessels={vessels} bags={popsicleBagsForVessels(vessels)} labelColor={undefined} />
      ) : (
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', background: 'var(--bg-raised)', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
          Vessel-by-vessel packing depends on exactly where you mix and refill, which varies stop to stop — see Pack List for the full carrying plan for each aid-to-aid stretch in this range.
        </div>
      )}

      <button onClick={() => setShowDetail(v => !v)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-raised)', border: '1px solid var(--line)', borderRadius: 10,
        padding: '12px 16px', marginBottom: showDetail ? 16 : 28, cursor: 'pointer', color: 'var(--ink)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {showDetail ? 'Hide' : 'Show'} full 0.1-mile grade breakdown
        </span>
        <span style={{ color: 'var(--ink-faint)', fontSize: 13 }}>{showDetail ? '\u2212' : '+'}</span>
      </button>

      {showDetail && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ position: "relative", height: gradeChartH + 48, marginBottom: 12, background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:12, padding:'12px' }}>
            {[-20, -10, 0, 10, 20].map(v => {
              const y = zeroY - (v / maxAbsGrade) * (gradeChartH * 0.45);
              return (
                <div key={v} style={{ position: "absolute", left: 12, top: y+12, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 8, color: "var(--ink-faint)", width: 24, textAlign: "right" }}>{v}%</span>
                  <div style={{ position: "absolute", left: 28, right: -8, borderTop: v === 0 ? "1px solid var(--ink-faint)" : "0.5px solid var(--line)" }} />
                </div>
              );
            })}
            <div style={{ position: "absolute", left: 44, right: 12, top: 12, bottom: 44, display: "flex", alignItems: "center", gap: 1 }}>
              {rangeData.map((d, i) => {
                const isPos = d.grade >= 0;
                const barH = Math.abs(d.grade) / maxAbsGrade * (gradeChartH * 0.45);
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
              {rangeData.map((d, i) => (
                <div key={i} style={{ flex: 1, fontSize: 8, color: "var(--ink-faint)", textAlign: "center" }}>
                  {Number.isInteger(d.mile) ? d.mile : ""}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 8, marginBottom: 20 }}>
            {[
              { label: "High point", value: `${Math.max(...rangeData.map(d=>d.elev)).toLocaleString()} ft`, color: "var(--ink)" },
              { label: "Low point", value: `${Math.min(...rangeData.map(d=>d.elev)).toLocaleString()} ft`, color: "var(--ink-faint)" },
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
            {rangeData.map((d, i) => (
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
        </div>
      )}

      {pSeg.conditions && (
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 14 }}>{pSeg.conditions}</div>
      )}
      {pSeg.note && (
        <div style={{ background: 'var(--bg-raised)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.6 }}>
          {pSeg.note}
        </div>
      )}
    </div>
  );
}

window.SegmentsView = SegmentsView;
