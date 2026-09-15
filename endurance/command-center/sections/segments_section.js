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
  const [active, setActive] = React.useState(1);
  const [showDetail, setShowDetail] = React.useState(false);
  const [hovered, setHovered] = React.useState(null);
  const gSeg = gradeSegments.find(s => s.id === active);
  const pSeg = segments.find(s => s.id === active);
  const total = segments.length;

  const elevs = gSeg.data.map(d => d.elev);
  const minElev = Math.min(...elevs);
  const maxElev = Math.max(...elevs);
  const range = maxElev - minElev || 1;
  const chartH = 180;

  const hasDropBag = /drop bag|\(db\d\)/i.test(pSeg.to) || /drop bag|\(db\d\)/i.test(gSeg.to);

  function go(delta) {
    const next = active + delta;
    if (next >= 1 && next <= total) { setActive(next); setHovered(null); }
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

  // Detailed grade chart's own scale -- independent of the elevation
  // profile chart above, since grade (%) and elevation (ft) are different
  // units/ranges entirely.
  const allGrades = gSeg.data.map(d => d.grade);
  const maxAbsGrade = Math.max(...allGrades.map(Math.abs), 25);
  const gradeChartH = 200;
  const zeroY = gradeChartH * 0.5;

  return (
    <div style={{ paddingBottom: 60 }}>
      <SectionHeader eyebrow="03" title="Segments" sub={`Course broken into legs \u00b7 step through start to finish \u00b7 official aid station miles + ultraPacer elevation \u00b7 ${targetHours}hr target (adjust on Race Day Plan) \u00b7 expand any segment for the full 0.1-mile grade breakdown`} />

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

      <div style={{
        background: marginOk ? 'var(--bg-card)' : 'rgba(232,148,58,0.1)',
        border: `1px solid ${marginOk ? 'var(--line)' : 'var(--climb)'}`,
        borderRadius: 12, padding: '12px 14px', marginBottom: 4,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <SmallLabel>Aid station cutoff</SmallLabel>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{pSeg.cutoffClock} <span style={{ color: 'var(--ink-faint)', fontWeight: 400, fontSize: 12 }}>(+{pSeg.cutoffHours}h)</span></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <SmallLabel color={marginOk ? undefined : 'var(--climb)'}>{marginOk ? 'Modeled margin' : 'Modeled — behind cutoff'}</SmallLabel>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, color: marginOk ? '#3CB897' : 'var(--climb)' }}>
            {marginOk ? '+' : '-'}{marginH}h{String(marginM).padStart(2,'0')}m
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 20, lineHeight: 1.5 }}>
        Based on a grade+altitude-adjusted pace model calibrated to your {targetHours}hr goal — not a guarantee, just a planning estimate.
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {pSeg.amenities.water && <AmenityBadge label="Water" />}
        {pSeg.amenities.food && <AmenityBadge label="Food" />}
        {pSeg.amenities.dropBag && <AmenityBadge label="Drop Bag" active />}
        {pSeg.amenities.crew && <AmenityBadge label="Crew" />}
        {pSeg.amenities.note && <span style={{ fontSize: 11, color: 'var(--ink-faint)', alignSelf: 'center', fontFamily: 'var(--mono)' }}>{pSeg.amenities.note}</span>}
      </div>

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginBottom: 28 }}>
        <StatBox label="Distance" value={`${pSeg.dist}mi`} sub={`${pSeg.distReal}mi measured`} />
        <StatBox label="Time" value={pSeg.time} />
        <StatBox label="Avg Pace" value={`${pSeg.avgPace}/mi`} />
        <StatBox label="Gain" value={`+${pSeg.segGain.toLocaleString()}ft`} color="var(--climb)" />
        <StatBox label="Loss" value={`-${pSeg.segLoss.toLocaleString()}ft`} color="var(--descent)" />
        <StatBox label="Max Climb" value={`${pSeg.maxClimb}%`} />
        <StatBox label="Max Descent" value={`${pSeg.maxDescent}%`} />
        <StatBox label="Net" value={pSeg.netFt} color={pSeg.netDir === 'climb' ? 'var(--climb)' : 'var(--descent)'} />
      </div>

      <div style={{ marginBottom: 28 }}>
        <SmallLabel>Fuel &amp; Hydration</SmallLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginTop: 10, marginBottom: 14 }}>
          <StatBox label="Carbs/hr" value={`${pSeg.actualCarbHr}g`} />
          <StatBox label="Sodium/hr" value={`${pSeg.sodiumHr}mg`} />
          <StatBox label="Water/hr" value={`${pSeg.waterMlPerHr}ml`} color="#4A9FE8" />
          <StatBox label="Calories/hr" value={`${pSeg.caloriesPerHr}kcal`} />
          <StatBox label="Tailwind mix" value={`${(pSeg.tailwindConc*100).toFixed(1)}%`} />
          {pSeg.caffeineHr > 0 && <StatBox label="Caffeine/hr" value={`${pSeg.caffeineHr}mg`} color="var(--climb)" />}
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Timing this segment
          </div>
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
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 }}>
          <StatBox label="Gels total" value={pSeg.gels} sub={`${pSeg.gelsPerHr}/hr`} />
          <StatBox label="Tailwind total" value={`${pSeg.tailwind}g`} sub={`${pSeg.dilutedMl}ml water`} />
          <StatBox label="Salt caps total" value={pSeg.saltCaps} sub={pSeg.saltCapType === 'caffeine' ? 'caffeine' : 'original'} />
          <StatBox label="Plain water" value={`${pSeg.plainMl}ml`} />
        </div>
      </div>

      <VesselPlanCompact seg={pSeg} vessels={vessels} bags={popsicleBagsForVessels(vessels)} labelColor={undefined} />

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
              {gSeg.data.map((d, i) => {
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
              {gSeg.data.map((d, i) => (
                <div key={i} style={{ flex: 1, fontSize: 8, color: "var(--ink-faint)", textAlign: "center" }}>
                  {Number.isInteger(d.mile) ? d.mile : ""}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 8, marginBottom: 20 }}>
            {[
              { label: "High point", value: `${Math.max(...gSeg.data.map(d=>d.elev)).toLocaleString()} ft`, color: "var(--ink)" },
              { label: "Low point", value: `${Math.min(...gSeg.data.map(d=>d.elev)).toLocaleString()} ft`, color: "var(--ink-faint)" },
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
            {gSeg.data.map((d, i) => (
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
