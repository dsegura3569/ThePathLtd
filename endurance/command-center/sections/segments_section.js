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

function SegmentsView({ goToRaceSettings }) {
  const { targetHours, targetCarb, targetSodium, targetWaterHr, vestCapacity, vestCount, bladderCapacity, beltCapacity,
    vestEnabled, bladderEnabled, beltEnabled, handheldCapacity, handheldEnabled, vesselRanges, gelRateShift } = React.useContext(window.TargetHoursContext);
  const { state: blobState, setState: setBlobState } = React.useContext(window.BlobStateContext);
  const segments = React.useMemo(() => computeDerivedSegments(targetHours, targetCarb, targetSodium, targetWaterHr, gelRateShift), [targetHours, targetCarb, targetSodium, targetWaterHr, gelRateShift]);
  const [range_, setRange_] = React.useState(() => ({ start: 1, size: segments.length })); // whole course by default
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

  const hasDropBag = rangeSegs.some(s => /drop bag|\(db\d\)/i.test(s.to)) || rangeGradeSegs.some(s => /drop bag|\(db\d\)/i.test(s.to));

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

  // Segment chips: click one to select just that segment (and anchor it for
  // a future range selection); shift-click a second one (desktop) OR turn
  // on "Select range" and tap a second one (any device, since shift-click
  // has no touch equivalent) to select everything between the anchor and
  // that click, in either direction -- same interaction file browsers and
  // spreadsheets use for range selection.
  const [lastClickedChip, setLastClickedChip] = React.useState(1);
  const [rangeMode, setRangeMode] = React.useState(false);
  function selectChip(segId, shiftKey) {
    if (shiftKey || rangeMode) {
      const from = Math.min(lastClickedChip, segId);
      const to = Math.max(lastClickedChip, segId);
      setRange_({ start: from, size: to - from + 1 });
      setRangeMode(false);
    } else {
      setRange_({ start: segId, size: 1 });
      setLastClickedChip(segId);
    }
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

  // Metrics grid, customizable via the gear icon below it -- values are
  // computed here for whatever is currently selected (single segment or a
  // range) so the widgets themselves stay dumb; only which ones show and
  // in what order is user-configurable, not what each one means.
  const metricDefs = [
    { key: 'distance', label: 'Distance', value: isSingle ? `${pSeg.dist}mi` : `${rangeAgg.distReal}mi`, sub: isSingle ? `${pSeg.distReal}mi measured` : 'measured' },
    { key: 'time', label: 'Time', value: isSingle ? pSeg.time : rangeHoursFmt },
    { key: 'avgPace', label: 'Avg Pace', value: isSingle ? `${pSeg.avgPace}/mi` : `${rangeAvgPaceFmt}/mi` },
    { key: 'gain', label: 'Gain', value: isSingle ? `+${pSeg.segGain.toLocaleString()}ft` : `+${rangeAgg.gain.toLocaleString()}ft`, color: 'var(--climb)' },
    { key: 'loss', label: 'Loss', value: isSingle ? `-${pSeg.segLoss.toLocaleString()}ft` : `-${rangeAgg.loss.toLocaleString()}ft`, color: 'var(--descent)' },
    { key: 'maxClimb', label: 'Max Climb', value: isSingle ? `${pSeg.maxClimb}%` : `${rangeAgg.maxClimb}%`, sub: isSingle ? undefined : 'steepest segment in range' },
    { key: 'maxDescent', label: 'Max Descent', value: isSingle ? `${pSeg.maxDescent}%` : `${rangeAgg.maxDescent}%`, sub: isSingle ? undefined : 'steepest segment in range' },
    {
      key: 'net', label: 'Net',
      value: isSingle ? pSeg.netFt : `${rangeAgg.gain - rangeAgg.loss >= 0 ? '+' : ''}${(rangeAgg.gain - rangeAgg.loss).toLocaleString()}ft`,
      color: isSingle ? (pSeg.netDir === 'climb' ? 'var(--climb)' : 'var(--descent)') : (rangeAgg.gain >= rangeAgg.loss ? 'var(--climb)' : 'var(--descent)'),
    },
  ];
  const metricKeys = metricDefs.map(m => m.key);
  const [metricsOrder, setMetricsOrder] = window.useBlobField(
    blobState, setBlobState, 'trailExplorerMetricsOrder', metricKeys,
    saved => (Array.isArray(saved) && saved.every(k => metricKeys.includes(k)) && metricKeys.every(k => saved.includes(k))) ? saved : undefined
  );
  const [metricsHidden, setMetricsHidden] = window.useBlobField(
    blobState, setBlobState, 'trailExplorerMetricsHidden', [],
    saved => Array.isArray(saved) ? saved.filter(k => metricKeys.includes(k)) : undefined
  );
  const orderedMetrics = metricsOrder.map(k => metricDefs.find(m => m.key === k)).filter(Boolean).filter(m => !metricsHidden.includes(m.key));

  // One gear for everything on this page below the chart -- Start/End
  // cards, cutoff, metrics, fuel & hydration, vessel plan, and the data
  // table are all draggable/hideable from here, instead of scattering a
  // separate gear per widget.
  const WIDGET_SECTIONS = [
    { id: 'startEnd', label: 'Start/End cards' },
    { id: 'cutoff', label: 'Cutoff & aid stations' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'fuelHydration', label: 'Fuel & Hydration' },
    { id: 'vesselPlan', label: 'Vessel Plan' },
    { id: 'dataTable', label: 'Mile-by-mile data table' },
  ];
  const widgetDefaultOrder = WIDGET_SECTIONS.map(s => s.id);
  const [widgetOrder, setWidgetOrder] = window.useBlobField(
    blobState, setBlobState, 'trailExplorerWidgetOrder', widgetDefaultOrder,
    saved => (Array.isArray(saved) && saved.length === widgetDefaultOrder.length && saved.every(id => widgetDefaultOrder.includes(id))) ? saved : undefined
  );
  const [widgetHidden, setWidgetHidden] = window.useBlobField(
    blobState, setBlobState, 'trailExplorerWidgetHidden', [],
    saved => Array.isArray(saved) ? saved.filter(id => widgetDefaultOrder.includes(id)) : undefined
  );
  function widgetStyle(id) { return { order: widgetOrder.indexOf(id), display: widgetHidden.includes(id) ? 'none' : undefined }; }
  const [showPageGear, setShowPageGear] = React.useState(false);


  // Detailed grade chart's own scale -- independent of the elevation
  // profile chart above, since grade (%) and elevation (ft) are different
  // units/ranges entirely.
  const allGrades = rangeData.map(d => d.grade);
  const maxAbsGrade = Math.max(...allGrades.map(Math.abs), 25);
  const gradeChartH = 200;
  const zeroY = gradeChartH * 0.5;

  // Unified chart: one visual for whatever range is selected above (single
  // segment, several, or the whole course), toggling between a smooth
  // elevation line ("course profile") and the colored, sortable grade bars
  // ("grade profile") -- replaces what used to be two separate systems (a
  // simple per-range elevation chart, and a separate always-whole-course
  // sortable bar chart merged in from the old Grade Explorer tab).
  const [chartMode, setChartMode] = React.useState('course'); // 'course' | 'grade'
  const [gradeOrder, setGradeOrder] = React.useState('course'); // 'course' | 'climbToDescent' | 'descentToClimb'
  const chartData = React.useMemo(() => {
    if (gradeOrder === 'climbToDescent') return [...rangeData].sort((a, b) => b.grade - a.grade);
    if (gradeOrder === 'descentToClimb') return [...rangeData].sort((a, b) => a.grade - b.grade);
    return rangeData;
  }, [rangeData, gradeOrder]);
  const climbingMiles = Math.round(rangeData.filter(s => s.grade > 0).length / 10 * 10) / 10;
  const descendingMiles = Math.round(rangeData.filter(s => s.grade < 0).length / 10 * 10) / 10;
  const flatMiles = Math.round(rangeData.filter(s => s.grade === 0).length / 10 * 10) / 10;
  const coverageMi = rangeData.length / 10;
  const gradeLegend = [
    { label: "\u226520% up", c: "#7B1010" }, { label: "15\u201320%", c: "#A32D2D" },
    { label: "8\u201315%", c: "#E8943A" }, { label: "0\u20138%", c: "#3CB897" },
    { label: "0\u20138% down", c: "#7DD3FC" }, { label: "8\u201315% down", c: "#4A9FE8" },
    { label: "15\u201320% down", c: "#1460A8" }, { label: "\u226520% down", c: "#0C3B6E" },
  ];

  // Aid station markers on the chart -- every station boundary visible
  // within the current range (the range's own start, plus every segment's
  // arrival point up to the range's end), each carrying its own amenities
  // so hovering can show name/mile/amenities without needing the separate
  // list section this replaces. Drop-bag stations get a distinct color so
  // "how many segments from here to the next drop bag" is visible at a
  // glance, which is the actual point of marking these at all.
  const [markerHovered, setMarkerHovered] = React.useState(null); // {type:'aid'|'high'|'low', ...}
  const aidStationMarkers = React.useMemo(() => {
    const markers = [];
    const seenMiles = new Set();
    if (gradeSegments[0].miS >= gSeg.miS && gradeSegments[0].miS <= lastGSeg.miE) {
      markers.push({ mile: gradeSegments[0].miS, name: gradeSegments[0].from, amenities: {}, pacer: false, hasDropBag: false, segId: gradeSegments[0].id });
      seenMiles.add(gradeSegments[0].miS);
    }
    gradeSegments.forEach((s, idx) => {
      if (s.miE >= gSeg.miS && s.miE <= lastGSeg.miE && !seenMiles.has(s.miE)) {
        const correspondingSeg = segments[idx];
        markers.push({
          mile: s.miE, name: s.to,
          amenities: (correspondingSeg && correspondingSeg.amenities) || {},
          pacer: !!(correspondingSeg && correspondingSeg.pacer),
          hasDropBag: !!(correspondingSeg && correspondingSeg.amenities && correspondingSeg.amenities.dropBag),
          segId: s.id,
        });
        seenMiles.add(s.miE);
      }
    });
    return markers.sort((a, b) => a.mile - b.mile);
  }, [gSeg, lastGSeg]);
  const highPoint = rangeData.reduce((max, d) => d.elev > max.elev ? d : max, rangeData[0]);
  const lowPoint = rangeData.reduce((min, d) => d.elev < min.elev ? d : min, rangeData[0]);

  // Maps an absolute course mile to the same 0-100% x position each chart
  // already uses for its own points, by finding the closest sample in
  // whichever dataset is actually on screen -- rangeData for Course
  // Profile, chartData for Grade Profile (identical to rangeData in course
  // order, but reordered when sorted by grade, which is why markers only
  // render in course order there -- a mile-based position is meaningless
  // once points are reordered by steepness instead of location).
  function mileToPercent(mile, data) {
    let closestIdx = 0, closestDiff = Infinity;
    data.forEach((d, i) => { const diff = Math.abs(d.mile - mile); if (diff < closestDiff) { closestDiff = diff; closestIdx = i; } });
    return (closestIdx / Math.max(1, data.length - 1)) * 100;
  }

  // Lets the whole chart area be clickable, not just the small marker dots
  // themselves -- finds the nearest aid station marker to wherever the
  // click landed and selects that segment, same as clicking the marker
  // directly would.
  function handleChartClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const clickMile = gSeg.miS + (clickPercent / 100) * (lastGSeg.miE - gSeg.miS);
    let nearest = aidStationMarkers[0], nearestDiff = Infinity;
    aidStationMarkers.forEach(m => { const diff = Math.abs(m.mile - clickMile); if (diff < nearestDiff) { nearestDiff = diff; nearest = m; } });
    if (nearest) selectChip(nearest.segId, e.shiftKey);
  }

  return (
    <div style={{ paddingBottom: 60, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <SectionHeader eyebrow="03" title="Trail Explorer" sub={
          <>{targetHours}hr target (
            <span onClick={goToRaceSettings} style={{ color: 'var(--climb)', textDecoration: 'underline', cursor: 'pointer' }}>adjust in Race Settings</span>
          )</>
        } />
        <button onClick={() => setShowPageGear(v => !v)} aria-label="Trail Explorer settings" title="Move, reorder, or hide widgets on this page" style={{
          background: 'none', border: '1px solid var(--line)', borderRadius: 6, width: 28, height: 28, flexShrink: 0, marginTop: 4,
          color: showPageGear ? 'var(--climb)' : 'var(--ink-faint)', cursor: 'pointer', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>&#9881;&#65039;</button>
      </div>

      {showPageGear && (
        <>
          <div onClick={() => setShowPageGear(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 92vw)', zIndex: 1000,
            background: 'var(--bg-card)', borderLeft: '1px solid var(--line)', boxShadow: '-8px 0 28px rgba(0,0,0,0.45)',
            overflowY: 'auto', padding: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 16 }}>Trail Explorer Settings</div>
              <button onClick={() => setShowPageGear(false)} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>&#10005;</button>
            </div>

            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--climb)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Page Widgets</div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8 }}>Drag to reorder, or toggle to show/hide.</div>
            <window.DragReorderList
              order={widgetOrder}
              setOrder={setWidgetOrder}
              renderLabel={id => WIDGET_SECTIONS.find(x => x.id === id).label}
              extraControls={id => {
                const vis = !widgetHidden.includes(id);
                return (
                  <button onClick={() => setWidgetHidden(prev => vis ? [...prev, id] : prev.filter(x => x !== id))} aria-label={vis ? 'Hide widget' : 'Show widget'} style={{
                    width: 26, height: 26, borderRadius: 6, border: '1px solid var(--line)',
                    background: vis ? 'var(--climb)' : 'var(--bg-raised)',
                    color: vis ? '#12151A' : 'var(--ink-faint)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
                  }}>{vis ? '\u2212' : '+'}</button>
                );
              }}
            />
            <button onClick={() => { setWidgetOrder(widgetDefaultOrder); setWidgetHidden([]); }} style={{
              marginTop: 8, marginBottom: 24, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', background: 'none',
              border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0,
            }}>Reset to default</button>

            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--climb)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, borderTop: '1px solid var(--line)', paddingTop: 20 }}>Metrics</div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8 }}>Which stats show in the Metrics widget, and in what order.</div>
            <window.DragReorderList
              order={metricsOrder}
              setOrder={setMetricsOrder}
              renderLabel={key => metricDefs.find(x => x.key === key).label}
              extraControls={key => {
                const vis = !metricsHidden.includes(key);
                return (
                  <button onClick={() => setMetricsHidden(prev => vis ? [...prev, key] : prev.filter(k => k !== key))} aria-label={vis ? 'Hide metric' : 'Show metric'} style={{
                    width: 26, height: 26, borderRadius: 6, border: '1px solid var(--line)',
                    background: vis ? 'var(--climb)' : 'var(--bg-raised)',
                    color: vis ? '#12151A' : 'var(--ink-faint)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
                  }}>{vis ? '\u2212' : '+'}</button>
                );
              }}
            />
            <button onClick={() => { setMetricsOrder(metricKeys); setMetricsHidden([]); }} style={{
              marginTop: 8, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', background: 'none',
              border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0,
            }}>Reset to default</button>
          </div>
        </>
      )}

      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
          {isSingle ? `SEGMENT ${rangeStart} OF ${total}` : rangeSize === total ? `FULL COURSE \u00b7 ${total} SEGMENTS` : `SEGMENTS ${rangeStart}\u2013${rangeEnd} OF ${total}`}
        </div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, marginTop: 2 }}>
          {gSeg.from} &rarr; {lastGSeg.to}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Tap anywhere on the chart to select a segment.</span>
        {rangeSize !== total && (
          <>
            {' \u00b7 '}
            <span onClick={() => setZoom(total)} style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--climb)', textDecoration: 'underline', cursor: 'pointer' }}>
              Zoom to full course
            </span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <button onClick={() => setRangeMode(v => !v)} style={{
          padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${rangeMode ? 'var(--climb)' : 'var(--line)'}`,
          background: rangeMode ? 'var(--climb)' : 'var(--bg-card)', color: rangeMode ? '#12151A' : 'var(--ink-dim)',
          fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
        }}>
          {rangeMode ? 'Tap the other end of your range\u2026' : '+ Select a range'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setChartMode('course')} style={{
          flex: 1, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${chartMode === 'course' ? 'var(--climb)' : 'var(--line)'}`,
          background: chartMode === 'course' ? 'var(--climb)15' : 'var(--bg-card)', color: chartMode === 'course' ? 'var(--climb)' : 'var(--ink-dim)',
          cursor: 'pointer', fontFamily: 'var(--display)', fontWeight: 600, fontSize: 14,
        }}>Course Profile</button>
        <button onClick={() => setChartMode('grade')} style={{
          flex: 1, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${chartMode === 'grade' ? 'var(--climb)' : 'var(--line)'}`,
          background: chartMode === 'grade' ? 'var(--climb)15' : 'var(--bg-card)', color: chartMode === 'grade' ? 'var(--climb)' : 'var(--ink-dim)',
          cursor: 'pointer', fontFamily: 'var(--display)', fontWeight: 600, fontSize: 14,
        }}>Grade Profile</button>
      </div>

      {chartMode === 'grade' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { id: 'course', label: 'Start \u2192 Finish' },
            { id: 'climbToDescent', label: 'By grade: climb \u2192 descent' },
            { id: 'descentToClimb', label: 'By grade: descent \u2192 climb' },
          ].map(o => (
            <button key={o.id} onClick={() => setGradeOrder(o.id)} style={{
              padding: '6px 12px', borderRadius: 8, border: `1px solid ${gradeOrder === o.id ? 'var(--climb)' : 'var(--line)'}`,
              background: gradeOrder === o.id ? 'var(--climb)15' : 'var(--bg-card)', color: gradeOrder === o.id ? 'var(--climb)' : 'var(--ink-dim)',
              cursor: 'pointer', fontSize: 11.5,
            }}>{o.label}</button>
          ))}
        </div>
      )}

      {chartMode === 'course' ? (() => {
        const cw = 1000, ch = 280, padL = 54, padR = 14, padT = 14, padB = 30;
        const plotW = cw - padL - padR, plotH = ch - padT - padB;
        const minMile = rangeData[0].mile, maxMile = rangeData[rangeData.length - 1].mile;
        const mileSpan = maxMile - minMile || 1;
        function cxFor(mile) { return padL + ((mile - minMile) / mileSpan) * plotW; }
        function cyFor(elev) { return padT + plotH - ((elev - minElev) / range) * plotH; }
        function pctX(mile) { return (cxFor(mile) / cw) * 100; }
        function pctY(elev) { return (cyFor(elev) / ch) * 100; }
        const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(minElev + t * range));
        const xTickCount = mileSpan > 20 ? 8 : mileSpan > 5 ? 5 : 4;
        const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => Math.round((minMile + (mileSpan / xTickCount) * i) * 10) / 10);

        function handleCourseChartClick(e) {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickFracX = (e.clientX - rect.left) / rect.width; // 0-1 across the whole container
          const clickSvgX = clickFracX * cw;
          const clickMile = minMile + Math.max(0, Math.min(1, (clickSvgX - padL) / plotW)) * mileSpan;
          let nearest = aidStationMarkers[0], nearestDiff = Infinity;
          aidStationMarkers.forEach(m => { const diff = Math.abs(m.mile - clickMile); if (diff < nearestDiff) { nearestDiff = diff; nearest = m; } });
          if (nearest) selectChip(nearest.segId, e.shiftKey);
        }

        return (
          <div onClick={handleCourseChartClick} style={{ position: 'relative', width: '100%', aspectRatio: `${cw}/${ch}`, marginBottom: 12, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 12, cursor: 'pointer', boxSizing: 'border-box' }}>
          <svg viewBox={`0 0 ${cw} ${ch}`} style={{ width: '100%', height: '100%', display: 'block' }}>
            {yTicks.map((v, i) => (
              <g key={i}>
                <line x1={padL} x2={cw - padR} y1={cyFor(v)} y2={cyFor(v)} stroke="var(--line)" strokeWidth="1" />
                <text x={padL - 8} y={cyFor(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-faint)" fontFamily="var(--mono)">{v.toLocaleString()}ft</text>
              </g>
            ))}
            {xTicks.map((v, i) => (
              <text key={i} x={cxFor(v)} y={ch - 10} textAnchor="middle" fontSize="11" fill="var(--ink-faint)" fontFamily="var(--mono)">{v}mi</text>
            ))}
            <polyline
              points={rangeData.map(d => `${cxFor(d.mile)},${cyFor(d.elev)}`).join(' ')}
              fill="none" stroke={gSeg.color} strokeWidth="2" vectorEffect="non-scaling-stroke"
              strokeLinejoin="round" strokeLinecap="round"
            />
            <polygon
              points={`${cxFor(minMile)},${padT + plotH} ` + rangeData.map(d => `${cxFor(d.mile)},${cyFor(d.elev)}`).join(' ') + ` ${cxFor(maxMile)},${padT + plotH}`}
              fill={gSeg.color} opacity="0.14"
            />
          </svg>
          {aidStationMarkers.map((m, i) => {
            const closest = rangeData.reduce((best, d) => Math.abs(d.mile - m.mile) < Math.abs(best.mile - m.mile) ? d : best, rangeData[0]);
            const x = pctX(m.mile), y = pctY(closest.elev);
            const color = m.hasDropBag ? 'var(--db)' : 'var(--climb)';
            const size = m.hasDropBag ? 12 : 10;
            return (
              <div key={'aid'+i}
                onClick={(e) => { e.stopPropagation(); selectChip(m.segId, e.shiftKey); }}
                onMouseEnter={() => setMarkerHovered({ type: 'aid', ...m })}
                onMouseLeave={() => setMarkerHovered(null)}
                style={{
                  position: 'absolute', left: `${x}%`, top: `${y}%`, width: size, height: size, marginLeft: -size/2, marginTop: -size/2,
                  borderRadius: '50%', background: color, border: '1.5px solid var(--bg-card)', cursor: 'pointer', zIndex: 5,
                }}
              />
            );
          })}
          {[{ ...highPoint, kind: 'high' }, { ...lowPoint, kind: 'low' }].map((p, i) => {
            const x = pctX(p.mile), y = pctY(p.elev);
            return (
              <div key={'pt'+i}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setMarkerHovered({ type: p.kind, mile: p.mile, elev: p.elev })}
                onMouseLeave={() => setMarkerHovered(null)}
                style={{
                  position: 'absolute', left: `${x}%`, top: `${y}%`, width: 8, height: 8, marginLeft: -4, marginTop: -4,
                  borderRadius: '50%', background: p.kind === 'high' ? '#E8484A' : '#4A9FE8',
                  border: '1.5px solid var(--bg-card)', cursor: 'pointer', zIndex: 4,
                }}
              />
            );
          })}
          {markerHovered && (
            <div style={{
              position: 'absolute', left: `${pctX(markerHovered.mile)}%`, top: 8, transform: 'translateX(-50%)',
              background: 'var(--bg-raised)', border: `1px solid ${markerHovered.type === 'aid' ? (markerHovered.hasDropBag ? 'var(--db)' : 'var(--climb)') : markerHovered.type === 'high' ? '#E8484A' : '#4A9FE8'}`,
              borderRadius: 8, padding: '8px 10px', fontSize: 10.5, color: 'var(--ink)',
              whiteSpace: 'nowrap', zIndex: 20, pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              {markerHovered.type === 'aid' ? (
                <>
                  <div style={{ fontWeight: 700, color: markerHovered.hasDropBag ? 'var(--db)' : 'var(--climb)' }}>{markerHovered.name}</div>
                  <div style={{ color: 'var(--ink-faint)' }}>Mile {markerHovered.mile}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap', maxWidth: 180 }}>
                    {markerHovered.amenities.water && <AmenityBadge label="Water" />}
                    {markerHovered.amenities.food && <AmenityBadge label="Food" />}
                    {markerHovered.hasDropBag && <AmenityBadge label="Drop Bag" active />}
                    {markerHovered.amenities.crew && <AmenityBadge label="Crew" />}
                    {markerHovered.pacer && <AmenityBadge label="Pacer" />}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 700, color: markerHovered.type === 'high' ? '#E8484A' : '#4A9FE8' }}>{markerHovered.type === 'high' ? 'High point' : 'Low point'}</div>
                  <div>{markerHovered.elev.toLocaleString()} ft</div>
                  <div style={{ color: 'var(--ink-faint)' }}>Mile {markerHovered.mile}</div>
                </>
              )}
            </div>
          )}
          </div>
        );
      })() : (
        <div onClick={handleChartClick} style={{ position: 'relative', height: gradeChartH + 48, marginBottom: 12, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px', cursor: 'pointer' }}>
          {[-20, -10, 0, 10, 20].map(v => {
            const y = zeroY - (v / maxAbsGrade) * (gradeChartH * 0.45);
            return (
              <div key={v} style={{ position: 'absolute', left: 12, top: y + 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 8, color: 'var(--ink-faint)', width: 24, textAlign: 'right' }}>{v}%</span>
                <div style={{ position: 'absolute', left: 28, right: -8, borderTop: v === 0 ? '1px solid var(--ink-faint)' : '0.5px solid var(--line)' }} />
              </div>
            );
          })}
          <div style={{ position: 'absolute', left: 44, right: 12, top: 12, bottom: 44, display: 'flex', alignItems: 'center', gap: chartData.length > 200 ? 0 : 1 }}>
            {chartData.map((d, i) => {
              const isPos = d.grade >= 0;
              const barH = Math.abs(d.grade) / maxAbsGrade * (gradeChartH * 0.45);
              const color = gradeColor(d.grade);
              const isHov = hovered === i;
              return (
                <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', position: 'relative' }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onTouchStart={() => setHovered(i === hovered ? null : i)}
                >
                  {isHov && (
                    <div style={{
                      position: 'absolute', top: isPos ? zeroY - barH - 70 : zeroY + barH + 4,
                      background: 'var(--bg-raised)', border: `1px solid ${color}`,
                      borderRadius: 8, padding: '8px 10px', fontSize: 10, color: 'var(--ink)',
                      whiteSpace: 'nowrap', zIndex: 20, pointerEvents: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    }}>
                      <div style={{ fontWeight: 700 }}>Mile {d.mile}</div>
                      <div style={{ color }}>{d.grade > 0 ? '+' : ''}{d.grade}% grade</div>
                      <div style={{ color: 'var(--ink-dim)' }}>{d.elev.toLocaleString()} ft</div>
                      <div style={{ color, fontSize: 9, marginTop: 2 }}>{gradeLabel(d.grade)}</div>
                    </div>
                  )}
                  {isPos && (
                    <div style={{ position: 'absolute', bottom: '50%', width: '100%', height: barH, background: color, opacity: isHov ? 1 : 0.8, borderRadius: '1px 1px 0 0', transition: 'opacity 0.1s' }} />
                  )}
                  {!isPos && (
                    <div style={{ position: 'absolute', top: '50%', width: '100%', height: barH, background: color, opacity: isHov ? 1 : 0.8, borderRadius: '0 0 1px 1px', transition: 'opacity 0.1s' }} />
                  )}
                </div>
              );
            })}
          </div>
          {gradeOrder === 'course' && (
            <div style={{ position: 'absolute', left: 44, right: 12, top: 12, bottom: 44, pointerEvents: 'none' }}>
              {aidStationMarkers.map((m, i) => {
                const x = mileToPercent(m.mile, chartData);
                const size = m.hasDropBag ? 12 : 10;
                return (
                  <div key={'aid' + i}
                    onClick={(e) => { e.stopPropagation(); selectChip(m.segId, e.shiftKey); }}
                    onMouseEnter={() => setMarkerHovered({ type: 'aid', ...m })}
                    onMouseLeave={() => setMarkerHovered(null)}
                    style={{
                      position: 'absolute', left: `${x}%`, top: 10, width: size, height: size, marginLeft: -size/2, marginTop: -size/2,
                      borderRadius: '50%', background: m.hasDropBag ? 'var(--db)' : 'var(--climb)',
                      border: '1.5px solid var(--bg-card)', pointerEvents: 'auto', cursor: 'pointer', zIndex: 5,
                    }}
                  />
                );
              })}
              {[{ ...highPoint, kind: 'high' }, { ...lowPoint, kind: 'low' }].map((p, i) => {
                const x = mileToPercent(p.mile, chartData);
                return (
                  <div key={'pt' + i}
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={() => setMarkerHovered({ type: p.kind, mile: p.mile, elev: p.elev })}
                    onMouseLeave={() => setMarkerHovered(null)}
                    style={{
                      position: 'absolute', left: `${x}%`, top: 30, width: 8, height: 8, marginLeft: -4, marginTop: -4,
                      borderRadius: '50%', background: p.kind === 'high' ? '#E8484A' : '#4A9FE8',
                      border: '1.5px solid var(--bg-card)', pointerEvents: 'auto', cursor: 'pointer', zIndex: 4,
                    }}
                  />
                );
              })}
              {markerHovered && (
                <div style={{
                  position: 'absolute', left: `${mileToPercent(markerHovered.mile, chartData)}%`, top: -8, transform: 'translate(-50%, -100%)',
                  background: 'var(--bg-raised)', border: `1px solid ${markerHovered.type === 'aid' ? (markerHovered.hasDropBag ? 'var(--db)' : 'var(--climb)') : markerHovered.type === 'high' ? '#E8484A' : '#4A9FE8'}`,
                  borderRadius: 8, padding: '8px 10px', fontSize: 10.5, color: 'var(--ink)',
                  whiteSpace: 'nowrap', zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}>
                  {markerHovered.type === 'aid' ? (
                    <>
                      <div style={{ fontWeight: 700, color: markerHovered.hasDropBag ? 'var(--db)' : 'var(--climb)' }}>{markerHovered.name}</div>
                      <div style={{ color: 'var(--ink-faint)' }}>Mile {markerHovered.mile}</div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap', maxWidth: 180 }}>
                        {markerHovered.amenities.water && <AmenityBadge label="Water" />}
                        {markerHovered.amenities.food && <AmenityBadge label="Food" />}
                        {markerHovered.hasDropBag && <AmenityBadge label="Drop Bag" active />}
                        {markerHovered.amenities.crew && <AmenityBadge label="Crew" />}
                        {markerHovered.pacer && <AmenityBadge label="Pacer" />}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 700, color: markerHovered.type === 'high' ? '#E8484A' : '#4A9FE8' }}>{markerHovered.type === 'high' ? 'High point' : 'Low point'}</div>
                      <div>{markerHovered.elev.toLocaleString()} ft</div>
                      <div style={{ color: 'var(--ink-faint)' }}>Mile {markerHovered.mile}</div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 16, textAlign: 'center' }}>
        {chartMode === 'course'
          ? 'Elevation profile for the selected range'
          : gradeOrder === 'course' ? 'Mile order, start \u2192 finish' : gradeOrder === 'climbToDescent' ? 'Sorted steepest climb \u2192 steepest descent' : 'Sorted steepest descent \u2192 steepest climb'}
      </div>

      {chartMode === 'grade' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginBottom: 20 }}>
          {gradeLegend.map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ink-dim)' }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: l.c, display: 'inline-block' }} />
              {l.label}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 28 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>Climbing (&gt;0%)</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: 'var(--climb)', marginTop: 4 }}>{climbingMiles} mi</div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{Math.round(climbingMiles / coverageMi * 100)}% of range</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>Descending (&lt;0%)</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: 'var(--descent)', marginTop: 4 }}>{descendingMiles} mi</div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{Math.round(descendingMiles / coverageMi * 100)}% of range</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>Flat (0%)</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: '#3CB897', marginTop: 4 }}>{flatMiles} mi</div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{Math.round(flatMiles / coverageMi * 100)}% of range</div>
        </div>
      </div>

      <div style={widgetStyle('startEnd')}>
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
      </div>

      <div style={widgetStyle('cutoff')}>
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
        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 20 }}>
          {rangeAidStations.length} aid station{rangeAidStations.length === 1 ? '' : 's'} in this range {'\u2014'} marked on the chart below (<span style={{ color: 'var(--db)' }}>purple</span> = drop bag); hover a marker for name, mile, and amenities.
        </div>
      )}
      </div>

      <div style={widgetStyle('metrics')}>
      <SmallLabel>Metrics</SmallLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginTop: 8, marginBottom: 28 }}>
        {orderedMetrics.map(m => <StatBox key={m.key} label={m.label} value={m.value} sub={m.sub} color={m.color} />)}
      </div>
      </div>

      <div style={{ marginBottom: 28, ...widgetStyle('fuelHydration') }}>
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

      <div style={widgetStyle('vesselPlan')}>
      {isSingle ? (
        <VesselPlanCompact seg={pSeg} vessels={vessels} bags={popsicleBagsForVessels(vessels)} labelColor={undefined} />
      ) : (
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', background: 'var(--bg-raised)', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
          Vessel-by-vessel packing depends on exactly where you mix and refill, which varies stop to stop — see Pack List for the full carrying plan for each aid-to-aid stretch in this range.
        </div>
      )}
      </div>

      <div style={widgetStyle('dataTable')}>
      <button onClick={() => setShowDetail(v => !v)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-raised)', border: '1px solid var(--line)', borderRadius: 10,
        padding: '12px 16px', marginBottom: showDetail ? 16 : 28, cursor: 'pointer', color: 'var(--ink)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {showDetail ? 'Hide' : 'Show'} mile-by-mile data table
        </span>
        <span style={{ color: 'var(--ink-faint)', fontSize: 13 }}>{showDetail ? '\u2212' : '+'}</span>
      </button>

      {showDetail && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 8, marginBottom: 20 }}>
            {[
              { label: "High point", value: `${Math.max(...rangeData.map(d=>d.elev)).toLocaleString()} ft`, color: "var(--ink)" },
              { label: "Low point", value: `${Math.min(...rangeData.map(d=>d.elev)).toLocaleString()} ft`, color: "var(--ink-faint)" },
            ].map(s => <StatBox key={s.label} label={s.label} value={s.value} color={s.color} />)}
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
      </div>

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
