function SegmentsView() {
  const [active, setActive] = React.useState(1);
  const gSeg = gradeSegments.find(s => s.id === active);
  const pSeg = segments.find(s => s.id === active);
  const total = segments.length;

  const elevs = gSeg.data.map(d => d.elev);
  const minElev = Math.min(...elevs);
  const maxElev = Math.max(...elevs);
  const range = maxElev - minElev || 1;
  const chartH = 180;

  // Drop bag detection: the pickup/dropoff arrays turned out to be modeled
  // inconsistently in the source data (e.g. segment 4's drop bag is
  // described in its own pickup array even though the bag is physically at
  // segment 3's endpoint, while segment 6's is described in its own pickup
  // array AND matches its own endpoint name) -- plus some pickup entries are
  // plain water-refill notes that happen to contain the substring "drop bag"
  // as a negation ("no drop bag here"), producing false positives either way.
  // The one unambiguous signal is the destination name itself: segments 3,
  // 6, and 9 explicitly label it, e.g. "Oak St (Drop Bag #1)".
  const hasDropBag = /drop bag|\(db\d\)/i.test(pSeg.to) || /drop bag|\(db\d\)/i.test(gSeg.to);

  function go(delta) {
    const next = active + delta;
    if (next >= 1 && next <= total) setActive(next);
  }

  return (
    <div style={{ paddingBottom: 60 }}>
      <SectionHeader eyebrow="10" title="Segments" sub="Course broken into legs &middot; step through start to finish &middot; ultraPacer GPX" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => go(-1)} disabled={active === 1} style={{
          width: 40, height: 40, borderRadius: 10, border: '1px solid var(--line)',
          background: 'var(--bg-raised)', color: active === 1 ? 'var(--ink-faint)' : 'var(--ink)',
          cursor: active === 1 ? 'not-allowed' : 'pointer', fontSize: 16,
        }}>&larr;</button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
            SEGMENT {active} OF {total}
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, marginTop: 2 }}>
            {gSeg.from} &rarr; {gSeg.to}
          </div>
        </div>

        <button onClick={() => go(1)} disabled={active === total} style={{
          width: 40, height: 40, borderRadius: 10, border: '1px solid var(--line)',
          background: 'var(--bg-raised)', color: active === total ? 'var(--ink-faint)' : 'var(--ink)',
          cursor: active === total ? 'not-allowed' : 'pointer', fontSize: 16,
        }}>&rarr;</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}>
          <SmallLabel>Start</SmallLabel>
          <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, marginTop: 4 }}>{gSeg.from}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>
            Mile {gSeg.miS} &middot; {pSeg.elevS.toLocaleString()}ft &middot; {pSeg.clockS}
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}>
          <SmallLabel color="var(--climb)">End</SmallLabel>
          <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, marginTop: 4 }}>{gSeg.to}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>
            Mile {gSeg.miE} &middot; {pSeg.elevE.toLocaleString()}ft &middot; {pSeg.clockE}
          </div>
          {hasDropBag && (
            <div style={{ fontSize: 11, color: 'var(--climb)', marginTop: 6, fontFamily: 'var(--mono)' }}>
              &#9679; Drop bag available here
            </div>
          )}
        </div>
      </div>

      {/* Elevation area chart for this segment only */}
      <div style={{ position: 'relative', height: chartH + 24, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
        <svg viewBox={`0 0 100 ${chartH}`} preserveAspectRatio="none" style={{ width: '100%', height: chartH, display: 'block' }}>
          <polyline
            points={gSeg.data.map((d, i) => {
              const x = (i / (gSeg.data.length - 1)) * 100;
              const y = chartH - ((d.elev - minElev) / range) * (chartH - 10) - 5;
              return `${x},${y}`;
            }).join(' ')}
            fill="none" stroke={gSeg.color} strokeWidth="1.6" vectorEffect="non-scaling-stroke"
            strokeLinejoin="round" strokeLinecap="round"
          />
          <polygon
            points={
              `0,${chartH} ` +
              gSeg.data.map((d, i) => {
                const x = (i / (gSeg.data.length - 1)) * 100;
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginBottom: 20 }}>
        <StatBox label="Distance" value={`${pSeg.dist}mi`} />
        <StatBox label="Time" value={pSeg.time} />
        <StatBox label="Avg Pace" value={`${pSeg.avgPace}/mi`} />
        <StatBox label="Gain" value={`+${pSeg.segGain.toLocaleString()}ft`} color="var(--climb)" />
        <StatBox label="Loss" value={`-${pSeg.segLoss.toLocaleString()}ft`} color="var(--descent)" />
        <StatBox label="Max Climb" value={`${pSeg.maxClimb}%`} />
        <StatBox label="Max Descent" value={`${pSeg.maxDescent}%`} />
        <StatBox label="Net" value={pSeg.netFt} color={pSeg.netDir === 'climb' ? 'var(--climb)' : 'var(--descent)'} />
      </div>

      {pSeg.note && (
        <div style={{ background: 'var(--bg-raised)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.6 }}>
          {pSeg.note}
        </div>
      )}
    </div>
  );
}

window.SegmentsView = SegmentsView;
