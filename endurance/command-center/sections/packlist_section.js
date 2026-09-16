// Packing points map onto the real drop-bag pickup structure: whatever you
// start with carries you to the first drop bag, each drop bag then carries
// you to the next one (or to the finish, if it's the last one). Built
// dynamically from each race's own segments (via their dropBagNum, set in
// derived_segments.js from amenities.dropBag) rather than hardcoded --
// every race has a different course and different drop bag locations.
function buildPackPoints(segments) {
  const firstId = segments[0].id;
  const lastId = segments[segments.length - 1].id;
  const dropBagSegs = segments.filter(s => s.dropBagNum).sort((a, b) => a.dropBagNum - b.dropBagNum);

  if (dropBagSegs.length === 0) {
    return [{ key: 'vest', label: 'Vest / pack (no drop bags for this race)', segRange: [firstId, lastId] }];
  }

  const points = [{ key: 'vest', label: 'Vest (pack before start)', segRange: [firstId, dropBagSegs[0].id] }];
  dropBagSegs.forEach((dbSeg, i) => {
    const rangeStart = dbSeg.id + 1;
    const rangeEnd = i + 1 < dropBagSegs.length ? dropBagSegs[i + 1].id : lastId;
    points.push({
      key: `db${dbSeg.dropBagNum}`,
      label: `Drop Bag #${dbSeg.dropBagNum} \u2014 Mile ${dbSeg.miE} (${dbSeg.to.split(' (')[0]})`,
      segRange: [rangeStart, rangeEnd],
    });
  });
  return points;
}

function buildPackingData(segments, vesselConfig) {
  return buildPackPoints(segments).map(point => {
    const segs = segments.filter(s => s.id >= point.segRange[0] && s.id <= point.segRange[1]);

    const gelsTotal = segs.reduce((sum, s) => sum + s.gels, 0);
    const gelsBySeg = segs.map(s => ({ seg: s.id, count: s.gels, label: `${s.from} → ${s.to}` }));

    const tailwindBags = [];
    segs.forEach(s => {
      const vessels = vesselPlan(s, capacitiesForSegment(s.id, vesselConfig));
      const bags = popsicleBagsForVessels(vessels);
      bags.forEach(b => tailwindBags.push({ seg: s.id, grams: b.grams, vessel: b.vessel }));
    });
    const tailwindTotal = segs.reduce((sum, s) => sum + s.tailwind, 0);

    const saltOriginal = segs.filter(s => s.saltCapType === 'original' && s.saltCaps > 0)
      .map(s => ({ seg: s.id, count: s.saltCaps, freqMin: Math.round(s.hours * 60 / s.saltCaps) }));
    const saltOriginalTotal = saltOriginal.reduce((sum, x) => sum + x.count, 0);

    const saltCaffeine = segs.filter(s => s.saltCapType === 'caffeine' && s.saltCaps > 0)
      .map(s => ({ seg: s.id, count: s.saltCaps, freqMin: Math.round(s.hours * 60 / s.saltCaps) }));
    const saltCaffeineTotal = saltCaffeine.reduce((sum, x) => sum + x.count, 0);

    return {
      ...point, segs, gelsTotal, gelsBySeg, tailwindBags, tailwindTotal,
      saltOriginal, saltOriginalTotal, saltCaffeine, saltCaffeineTotal,
    };
  });
}

function TotalStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontFamily: 'var(--display)', fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function PackCard({ point, tempRange }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 18, marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600, marginBottom: 2 }}>{point.label}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 16 }}>
            Covers segments {point.segRange[0]}–{point.segRange[1]} &middot; {point.segs.map(s => s.time).join(' + ')}
          </div>
        </div>
        {tempRange && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600 }}>
              {tempRange.low === tempRange.high ? `${tempRange.low}\u00b0F` : (
                <><span style={{ color: '#4A9FE8' }}>{tempRange.low}\u00b0</span><span style={{ color: 'var(--ink-faint)', fontSize: 14 }}>&ndash;</span><span style={{ color: 'var(--climb)' }}>{tempRange.high}\u00b0F</span></>
              )}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Forecast, this leg</div>
          </div>
        )}
      </div>

      {/* Totals, grouped together in one row instead of scattered as a
          per-category heading repeated three/four times down the card. */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 28, padding: '14px 18px',
        background: 'var(--bg, rgba(255,255,255,0.035))', border: '1px solid var(--line)',
        borderRadius: 10, marginBottom: 20,
      }}>
        <TotalStat label="SIS GO Gels" value={point.gelsTotal} color="var(--climb)" />
        {point.tailwindTotal > 0 && <TotalStat label="Tailwind" value={`${point.tailwindTotal}g`} color="var(--climb)" />}
        {point.saltOriginalTotal > 0 && <TotalStat label="SaltStick" value={point.saltOriginalTotal} color="#4A9FE8" />}
        {point.saltCaffeineTotal > 0 && <TotalStat label="SaltStick +caf" value={point.saltCaffeineTotal} color="var(--ok, #3CB897)" />}
      </div>

      {/* Then each segment, once, with everything it needs packed together
          -- gels/tailwind/salt for Seg 4 all live in the Seg 4 tile, rather
          than Seg 4 appearing three separate times across three separate
          category lists you have to cross-reference by eye. Grid instead
          of a single column so this actually uses a wide card's width. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
        {point.segs.map(s => {
          const segTailwind = point.tailwindBags.filter(b => b.seg === s.id);
          const segSaltOriginal = point.saltOriginal.find(x => x.seg === s.id);
          const segSaltCaffeine = point.saltCaffeine.find(x => x.seg === s.id);
          const hasAnything = s.gels > 0 || segTailwind.length > 0 || segSaltOriginal || segSaltCaffeine;
          if (!hasAnything) return null;
          return (
            <div key={s.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: dropBagNum(s) ? 'var(--db)' : 'var(--ink)' }}>Seg {s.id}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 9 }}>{s.from} &rarr; {s.to.split(' (')[0]} &middot; {s.time}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {s.gels > 0 && (
                  <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
                    <strong style={{ color: 'var(--climb)' }}>{s.gels}</strong> gel{s.gels === 1 ? '' : 's'}
                  </div>
                )}
                {segTailwind.map((b, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
                    <strong style={{ color: 'var(--climb)' }}>{b.grams}g</strong> tailwind &rarr; {b.vessel}
                  </div>
                ))}
                {segSaltOriginal && (
                  <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
                    <strong style={{ color: '#4A9FE8' }}>{segSaltOriginal.count}</strong> SaltStick &middot; every ~{segSaltOriginal.freqMin}min
                  </div>
                )}
                {segSaltCaffeine && (
                  <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
                    <strong style={{ color: 'var(--ok, #3CB897)' }}>{segSaltCaffeine.count}</strong> SaltStick +caf &middot; every ~{segSaltCaffeine.freqMin}min
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PackListView() {
  const { targetHours, targetCarb, targetSodium, targetWaterHr, vestCapacity, vestCount, bladderCapacity, beltCapacity,
    vestEnabled, bladderEnabled, beltEnabled, handheldCapacity, handheldEnabled, vesselRanges, extraGear,
    gelRateShift, setGelRateShift, customFuelItems, setCustomFuelItems } = React.useContext(window.TargetHoursContext);
  const segments = React.useMemo(() => computeDerivedSegments(targetHours, targetCarb, targetSodium, targetWaterHr, gelRateShift), [targetHours, targetCarb, targetSodium, targetWaterHr, gelRateShift]);
  const vesselConfig = {
    vestCapacity, vestCount, vestEnabled, bladderCapacity, bladderEnabled, beltCapacity, beltEnabled,
    handheldCapacity, handheldEnabled, vesselRanges,
  };
  const packing = React.useMemo(() => buildPackingData(segments, vesselConfig), [segments, vestCapacity, vestCount, bladderCapacity, beltCapacity, vestEnabled, bladderEnabled, beltEnabled, handheldCapacity, handheldEnabled, vesselRanges]);

  // Elevations needed for the temp range shown on each pack card below --
  // start and end elevation of every point, so a card spanning a big climb
  // shows that its finish is meaningfully colder than its start, not just
  // one single-point estimate for the whole stretch.
  const packPointElevations = React.useMemo(() => {
    const elevs = new Set();
    packing.forEach(point => {
      const firstSeg = point.segs[0], lastSeg = point.segs[point.segs.length - 1];
      if (firstSeg) elevs.add(Math.round(firstSeg.elevS));
      if (lastSeg) elevs.add(Math.round(lastSeg.elevE));
    });
    return [...elevs];
  }, [packing]);

  const grandGels = packing.reduce((s, p) => s + p.gelsTotal, 0);
  const grandTailwind = packing.reduce((s, p) => s + p.tailwindTotal, 0);
  const grandSaltOrig = packing.reduce((s, p) => s + p.saltOriginalTotal, 0);
  const grandSaltCaf = packing.reduce((s, p) => s + p.saltCaffeineTotal, 0);

  const GEL_CARB = 22, SCOOP_G = 27, CARB_PER_SCOOP = 25, CAP_NA = 215, CAP_NA_CAFFEINE = 190;
  const gelCarbs = grandGels * GEL_CARB;
  const tailwindCarbs = Math.round(grandTailwind * (CARB_PER_SCOOP / SCOOP_G));
  const totalCarbs = gelCarbs + tailwindCarbs;
  const totalSodium = grandSaltOrig * CAP_NA + grandSaltCaf * CAP_NA_CAFFEINE;
  const totalCalories = Math.round(totalCarbs * 4); // 4 kcal/g carb, matches both SIS GO and Tailwind label ratios
  const totalWaterMl = segments.reduce((a, s) => a + s.waterMl, 0);

  function addFuelItem() {
    setCustomFuelItems(prev => [...prev, { id: Date.now(), name: '', carbG: 0, sodiumMg: 0, caffeineMg: 0, servings: 1 }]);
  }
  function updateFuelItem(id, patch) {
    setCustomFuelItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  }
  function removeFuelItem(id) {
    setCustomFuelItems(prev => prev.filter(it => it.id !== id));
  }
  const customCarbTotal = customFuelItems.reduce((a, it) => a + it.carbG * it.servings, 0);
  const customSodiumTotal = customFuelItems.reduce((a, it) => a + it.sodiumMg * it.servings, 0);
  const customCaffeineTotal = customFuelItems.reduce((a, it) => a + it.caffeineMg * it.servings, 0);
  const combinedCarbs = totalCarbs + customCarbTotal;
  const combinedSodium = totalSodium + customSodiumTotal;
  const combinedCalories = totalCalories + Math.round(customCarbTotal * 4);
  const fuelSelectStyle = { background:'var(--bg-raised)', border:'1px solid var(--line)', borderRadius:6, color:'var(--ink)', fontSize:12, padding:'5px 6px' };
  const [showFuelPanel, setShowFuelPanel] = React.useState(false);

  // --- Gear summary: vessels + extra gear, with pickup/dropoff labels and
  // live dawn/cold suggestions where the person asked for a forecast check. ---
  const race = window.RACES[window.getCurrentRaceId()];
  const raceSegments = race.baseSegments;
  const forecast = window.useRaceDayForecast(packPointElevations);
  let raceStartDecHour = null;
  if (race.startDate) {
    const m = race.startDate.match(/T(\d{2}):(\d{2})/);
    if (m) raceStartDecHour = parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
  }

  function pointLabel(segmentId, kind) {
    if (kind === 'pickup') {
      if (segmentId == null) return 'Start';
      const prevSeg = raceSegments.find(s => s.id === segmentId - 1);
      return prevSeg ? prevSeg.to : 'Start';
    }
    if (segmentId == null) return 'Finish';
    const seg = raceSegments.find(s => s.id === segmentId);
    return seg ? seg.to : 'Finish';
  }

  function arrivalHoursForPickup(pickupSegmentId) {
    if (pickupSegmentId == null) return 0;
    const prevSeg = segments.find(s => s.id === pickupSegmentId - 1);
    return prevSeg ? prevSeg.modeledArrivalHours : 0;
  }

  // Steep enough to usually mean power-hiking a climb or picking carefully
  // down loose/technical footing -- used to flag poles-worthy terrain from
  // the same maxClimb/maxDescent grade data already on each base segment,
  // rather than a separate weather-style check.
  const STEEP_GRADE_THRESHOLD = 20;
  function gearSuggestion(g) {
    if (g.suggestType === 'dawn') {
      if (forecast.status !== 'ok' || raceStartDecHour == null) return null;
      const m = forecast.sunrise.match(/(\d+):(\d+)(am|pm)/i);
      if (!m) return null;
      let h = parseInt(m[1], 10) % 12; if (m[3].toLowerCase() === 'pm') h += 12;
      const sunriseDec = h + parseInt(m[2], 10) / 60;
      return raceStartDecHour < sunriseDec
        ? { suggested: true, note: `start is before sunrise (${forecast.sunrise})` }
        : { suggested: false, note: `sunrise is ${forecast.sunrise}, before your start` };
    }
    if (g.suggestType === 'cold') {
      if (forecast.status !== 'ok' || raceStartDecHour == null || !forecast.tempAtDecimalHour) return null;
      const temp = forecast.tempAtDecimalHour(raceStartDecHour + arrivalHoursForPickup(g.pickupSegmentId));
      if (temp == null) return null;
      return temp < g.tempThreshold
        ? { suggested: true, note: `~${Math.round(temp)}\u00b0F forecasted at pickup` }
        : { suggested: false, note: `~${Math.round(temp)}\u00b0F forecasted at pickup, above ${g.tempThreshold}\u00b0F` };
    }
    if (g.suggestType === 'steepTerrain') {
      const range = { from: g.pickupSegmentId, to: g.dropoffSegmentId };
      const relevantSegs = raceSegments.filter(s => window.vesselActiveForSegment(range, s.id));
      const steepSeg = relevantSegs.find(s =>
        Math.abs(parseFloat(s.maxClimb)) >= STEEP_GRADE_THRESHOLD || Math.abs(parseFloat(s.maxDescent)) >= STEEP_GRADE_THRESHOLD);
      if (!steepSeg) {
        return { suggested: false, note: `no segment over ${STEEP_GRADE_THRESHOLD}% grade in this range` };
      }
      const climbAbs = Math.abs(parseFloat(steepSeg.maxClimb));
      const descAbs = Math.abs(parseFloat(steepSeg.maxDescent));
      const steepest = climbAbs >= descAbs ? `${steepSeg.maxClimb}% climb` : `${steepSeg.maxDescent}% descent`;
      return { suggested: true, note: `${steepest} in ${steepSeg.from} \u2192 ${steepSeg.to}` };
    }
    return null;
  }

  const vesselRows = [
    { key: 'vest', label: `Vest flask${vestCount > 1 ? 's' : ''}${vestCount > 1 ? ` (x${vestCount})` : ''}`, enabled: vestEnabled, capacity: vestCapacity, range: vesselRanges.vest },
    { key: 'bladder', label: 'Bladder', enabled: bladderEnabled, capacity: bladderCapacity, range: vesselRanges.bladder },
    { key: 'belt', label: 'Belt flask', enabled: beltEnabled, capacity: beltCapacity, range: vesselRanges.belt },
    { key: 'handheld', label: 'Handheld', enabled: handheldEnabled, capacity: handheldCapacity, range: vesselRanges.handheld },
  ].filter(v => v.enabled);

  return (
    <div style={{ paddingBottom: 60 }}>
      <SectionHeader eyebrow="01" title="Pack List" sub={`Everything to portion and label before Saturday &middot; ${targetHours}hr target (adjust on Race Day Plan)`} />

      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        Totals &mdash; whole race
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 24 }}>
        <StatBox label="Gels" value={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setGelRateShift(v => Math.round(v - 1))} style={{
              width: 20, height: 20, borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'var(--ink)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0,
            }}>&minus;</button>
            <span>{grandGels}</span>
            <button onClick={() => setGelRateShift(v => Math.round(v + 1))} style={{
              width: 20, height: 20, borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'var(--ink)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0,
            }}>+</button>
          </div>
        } sub={
          <React.Fragment>
            <div>{gelCarbs}g carbs (22g/gel)</div>
            {grandGels > 0 && grandTailwind > 0 && <div>{totalCarbs}g combined w/ tailwind</div>}
            {gelRateShift !== 0 && <div>{gelRateShift > 0 ? `+${gelRateShift}` : gelRateShift}/hr shift &middot; <span onClick={() => setGelRateShift(0)} style={{ textDecoration: 'underline', cursor: 'pointer' }}>reset</span></div>}
          </React.Fragment>
        } />
        <StatBox label="Tailwind" value={`${grandTailwind}g`} sub={
          <React.Fragment>
            <div>{tailwindCarbs}g carbs from tailwind</div>
            {grandGels > 0 && grandTailwind > 0 && <div>{totalCarbs}g combined w/ gels</div>}
          </React.Fragment>
        } />
        <StatBox label="Salt caps" value={grandSaltOrig} sub={
          <React.Fragment>
            <div>{grandSaltOrig * CAP_NA}mg sodium (215mg/cap)</div>
            {grandSaltOrig > 0 && grandSaltCaf > 0 && <div>{totalSodium}mg combined w/ +caf</div>}
          </React.Fragment>
        } />
        <StatBox label="Salt +caf" value={grandSaltCaf} sub={
          <React.Fragment>
            <div>{grandSaltCaf * CAP_NA_CAFFEINE}mg sodium (190mg/cap)</div>
            {grandSaltOrig > 0 && grandSaltCaf > 0 && <div>{totalSodium}mg combined w/ caps</div>}
          </React.Fragment>
        } />
        <StatBox label="Water" value={`${(totalWaterMl/1000).toFixed(1)}L`} sub="whole race" color="#4A9FE8" />
        <StatBox label="Calories" value={combinedCalories} sub={customFuelItems.length ? `${totalCalories} from plan + ${Math.round(customCarbTotal*4)} custom` : 'whole race'} />
      </div>

      <div style={{ background: 'var(--bg-raised)', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showFuelPanel ? 10 : 0 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', flex: 1 }}>
            Additional Fuel &amp; Electrolytes
          </div>
          <button onClick={() => setShowFuelPanel(v => !v)} aria-label={showFuelPanel ? 'Collapse' : 'Expand'} style={{
            background: 'none', border: '1px solid var(--line)', borderRadius: 6, width: 26, height: 26,
            color: showFuelPanel ? 'var(--climb)' : 'var(--ink-faint)', cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>&#9881;&#65039;</button>
        </div>
        {!showFuelPanel && customFuelItems.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
            {customFuelItems.length} item{customFuelItems.length === 1 ? '' : 's'} added &mdash; {customCarbTotal}g carbs, {customSodiumTotal}mg sodium{customCaffeineTotal > 0 ? `, ${customCaffeineTotal}mg caffeine` : ''} already folded into the totals above.
          </div>
        )}
        {showFuelPanel && (
          <>
        {customFuelItems.map(it => (
          <div key={it.id} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <input value={it.name} onChange={e => updateFuelItem(it.id, { name: e.target.value })} placeholder="Product name (e.g. LMNT)" style={{ ...fuelSelectStyle, flex: 1, minWidth: 140 }} />
              <button onClick={() => removeFuelItem(it.id)} aria-label="Remove item" style={{
                width: 26, height: 26, borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg-raised)', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 13,
              }}>&#10005;</button>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: 'var(--ink-dim)' }}>
              <span>Carb/serving</span>
              <input type="number" value={it.carbG} onChange={e => updateFuelItem(it.id, { carbG: parseFloat(e.target.value) || 0 })} style={{ ...fuelSelectStyle, width: 56 }} /><span>g</span>
              <span>Sodium/serving</span>
              <input type="number" value={it.sodiumMg} onChange={e => updateFuelItem(it.id, { sodiumMg: parseFloat(e.target.value) || 0 })} style={{ ...fuelSelectStyle, width: 64 }} /><span>mg</span>
              <span>Caffeine/serving</span>
              <input type="number" value={it.caffeineMg} onChange={e => updateFuelItem(it.id, { caffeineMg: parseFloat(e.target.value) || 0 })} style={{ ...fuelSelectStyle, width: 56 }} /><span>mg</span>
              <span>Servings</span>
              <input type="number" min="0" value={it.servings} onChange={e => updateFuelItem(it.id, { servings: parseFloat(e.target.value) || 0 })} style={{ ...fuelSelectStyle, width: 48 }} />
            </div>
          </div>
        ))}
        <button onClick={addFuelItem} style={{
          padding: '8px 14px', borderRadius: 8, border: '1px dashed var(--line)', background: 'none',
          color: 'var(--climb)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
        }}>+ Add fuel/electrolyte item</button>
        {customFuelItems.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
            Adds {customCarbTotal}g carbs, {customSodiumTotal}mg sodium{customCaffeineTotal > 0 ? `, ${customCaffeineTotal}mg caffeine` : ''} to the totals above
            (combined: {combinedCarbs}g carbs, {combinedSodium}mg sodium).
          </div>
        )}
          </>
        )}
      </div>

      {(vesselRows.length > 0 || extraGear.length > 0) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Gear
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
            {vesselRows.map(v => {
              const fromLabel = v.range && v.range.from != null ? pointLabel(v.range.from, 'pickup') : null;
              const toLabel = v.range && v.range.to != null ? pointLabel(v.range.to, 'dropoff') : null;
              return (
                <div key={v.key} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{v.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2 }}>{v.capacity}ml</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-dim)', marginTop: 8 }}>
                    {fromLabel || toLabel ? `${fromLabel ? `from ${fromLabel}` : 'whole race'}${toLabel ? ` \u2192 ${toLabel}` : ''}` : 'whole race'}
                  </div>
                </div>
              );
            })}
            {extraGear.map(g => {
              const sugg = gearSuggestion(g);
              return (
                <div key={g.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{g.name || 'Untitled item'}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2 }}>
                    {pointLabel(g.pickupSegmentId, 'pickup')} &rarr; {pointLabel(g.dropoffSegmentId, 'dropoff')}
                  </div>
                  {sugg && (
                    <div style={{ fontSize: 11, marginTop: 8, color: sugg.suggested ? 'var(--climb)' : 'var(--ink-faint)' }}>
                      {sugg.suggested ? '\u2713 Suggested' : 'Not needed'} &mdash; {sugg.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {packing.map(point => {
        const firstSeg = point.segs[0], lastSeg = point.segs[point.segs.length - 1];
        let tempRange = null;
        if (forecast.status === 'ok' && typeof forecast.tempAtElevationAndHour === 'function' && raceStartDecHour != null && firstSeg && lastSeg) {
          const startHour = raceStartDecHour + (firstSeg.modeledArrivalHours - firstSeg.hours);
          const endHour = raceStartDecHour + lastSeg.modeledArrivalHours;
          const startTemp = forecast.tempAtElevationAndHour(firstSeg.elevS, startHour);
          const endTemp = forecast.tempAtElevationAndHour(lastSeg.elevE, endHour);
          if (startTemp != null && endTemp != null) {
            tempRange = { low: Math.round(Math.min(startTemp, endTemp)), high: Math.round(Math.max(startTemp, endTemp)) };
          }
        }
        return <PackCard key={point.key} point={point} tempRange={tempRange} />;
      })}

      <div style={{ background: 'var(--bg-raised)', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--ink)' }}>Contingency &mdash; carry on you the whole race, not tied to a specific bag.</strong>
        <div style={{ marginTop: 10 }}>
          <div style={{ padding: '3px 0' }}>&bull; 1 extra tailwind popsicle bag (~40g, one flask-sized serving)</div>
          <div style={{ padding: '3px 0' }}>&bull; 1 extra SIS GO gel</div>
          <div style={{ padding: '3px 0' }}>&bull; 1 extra SaltStick +caffeine capsule</div>
          <div style={{ padding: '3px 0' }}>&bull; SaltStick FastChews (sleeve) &mdash; stomach-relief backup, not scheduled</div>
        </div>
        <div style={{ marginTop: 10 }}>
          Buffer only &mdash; not part of the scheduled totals above. Use if you fall behind on a dose, want variety, or a capsule/gel gets dropped mid-segment.
        </div>
      </div>
    </div>
  );
}

window.PackListView = PackListView;
