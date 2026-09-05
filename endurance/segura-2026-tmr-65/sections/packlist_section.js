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

function PackCard({ point }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 18, marginBottom: 18 }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600, marginBottom: 2 }}>{point.label}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 16 }}>
        Covers segments {point.segRange[0]}–{point.segRange[1]} &middot; {point.segs.map(s => s.time).join(' + ')}
      </div>

      {/* Gels */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--climb)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
          SIS GO Gels — {point.gelsTotal} total
        </div>
        {point.gelsBySeg.map((g, i) => (
          <div key={i} style={{ fontSize: 13, color: 'var(--ink-dim)', padding: '3px 0' }}>
            Seg {g.seg}: <strong style={{ color: 'var(--ink)' }}>{g.count}</strong> &middot; <span style={{ color: 'var(--ink-faint)' }}>{g.label}</span>
          </div>
        ))}
      </div>

      {/* Tailwind popsicle bags */}
      {point.tailwindBags.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--climb)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Tailwind popsicle bags — {point.tailwindTotal}g total
          </div>
          {point.tailwindBags.map((b, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--ink-dim)', padding: '3px 0' }}>
              Seg {b.seg}: <strong style={{ color: 'var(--ink)' }}>{b.grams}g</strong> &rarr; {b.vessel}
            </div>
          ))}
        </div>
      )}

      {/* Salt caps original */}
      {point.saltOriginal.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: '#4A9FE8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            SaltStick capsules — {point.saltOriginalTotal} total
          </div>
          {point.saltOriginal.map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--ink-dim)', padding: '3px 0' }}>
              Seg {s.seg}: <strong style={{ color: 'var(--ink)' }}>{s.count}</strong> &middot; every ~{s.freqMin}min
            </div>
          ))}
        </div>
      )}

      {/* Salt caps caffeine */}
      {point.saltCaffeine.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ok, #3CB897)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            SaltStick +caffeine — {point.saltCaffeineTotal} total
          </div>
          {point.saltCaffeine.map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--ink-dim)', padding: '3px 0' }}>
              Seg {s.seg}: <strong style={{ color: 'var(--ink)' }}>{s.count}</strong> &middot; every ~{s.freqMin}min
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PackListView() {
  const { targetHours, targetCarb, targetSodium, targetWaterHr, vestCapacity, bladderCapacity, beltCapacity,
    vestEnabled, bladderEnabled, beltEnabled, handheldCapacity, handheldEnabled, vesselRanges, extraGear,
    gelRateShift, setGelRateShift, customFuelItems, setCustomFuelItems } = React.useContext(window.TargetHoursContext);
  const segments = React.useMemo(() => computeDerivedSegments(targetHours, targetCarb, targetSodium, targetWaterHr, gelRateShift), [targetHours, targetCarb, targetSodium, targetWaterHr, gelRateShift]);
  const vesselConfig = {
    vestCapacity, vestEnabled, bladderCapacity, bladderEnabled, beltCapacity, beltEnabled,
    handheldCapacity, handheldEnabled, vesselRanges,
  };
  const packing = React.useMemo(() => buildPackingData(segments, vesselConfig), [segments, vestCapacity, bladderCapacity, beltCapacity, vestEnabled, bladderEnabled, beltEnabled, handheldCapacity, handheldEnabled, vesselRanges]);

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

  // --- Gear summary: vessels + extra gear, with pickup/dropoff labels and
  // live dawn/cold suggestions where the person asked for a forecast check. ---
  const race = window.RACES[window.getCurrentRaceId()];
  const raceSegments = race.baseSegments;
  const forecast = window.useRaceDayForecast();
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
    return null;
  }

  const vesselRows = [
    { key: 'vest', label: 'Vest flasks (x2)', enabled: vestEnabled, capacity: vestCapacity, range: vesselRanges.vest },
    { key: 'bladder', label: 'Bladder', enabled: bladderEnabled, capacity: bladderCapacity, range: vesselRanges.bladder },
    { key: 'belt', label: 'Belt flask', enabled: beltEnabled, capacity: beltCapacity, range: vesselRanges.belt },
    { key: 'handheld', label: 'Handheld', enabled: handheldEnabled, capacity: handheldCapacity, range: vesselRanges.handheld },
  ].filter(v => v.enabled);

  return (
    <div style={{ paddingBottom: 60 }}>
      <SectionHeader eyebrow="01" title="Pack List" sub={`Everything to portion and label before Saturday &middot; ${targetHours}hr target (adjust on Race Day Plan)`} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20, background: 'var(--bg-raised)', borderRadius: 10, padding: '10px 14px' }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-dim)', flex: 1, minWidth: 180 }}>
          Gels &harr; Tailwind &mdash; shifts the same carb target between the two, doesn't change total carbs/hr.
        </span>
        <button onClick={() => setGelRateShift(v => Math.round((v - 0.5) * 10) / 10)} style={{
          width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'var(--ink)', cursor: 'pointer', fontSize: 14,
        }}>&minus;</button>
        <span style={{ fontSize: 13, fontFamily: 'var(--display)', fontWeight: 600, color: 'var(--climb)', minWidth: 90, textAlign: 'center' }}>
          {gelRateShift > 0 ? `+${gelRateShift} gel/hr` : gelRateShift < 0 ? `${gelRateShift} gel/hr` : 'no shift'}
        </span>
        <button onClick={() => setGelRateShift(v => Math.round((v + 0.5) * 10) / 10)} style={{
          width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'var(--ink)', cursor: 'pointer', fontSize: 14,
        }}>+</button>
        {gelRateShift !== 0 && (
          <button onClick={() => setGelRateShift(0)} style={{ fontSize: 11, color: 'var(--ink-faint)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>reset</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 24 }}>
        <StatBox label="Gels" value={grandGels} sub={
          <React.Fragment>
            <div>{gelCarbs}g carbs (22g/gel)</div>
            <div>{totalCarbs}g combined w/ tailwind</div>
          </React.Fragment>
        } />
        <StatBox label="Tailwind" value={`${grandTailwind}g`} sub={
          <React.Fragment>
            <div>{tailwindCarbs}g carbs from tailwind</div>
            <div>{totalCarbs}g combined w/ gels</div>
          </React.Fragment>
        } />
        <StatBox label="Salt caps" value={grandSaltOrig} sub={
          <React.Fragment>
            <div>{grandSaltOrig * CAP_NA}mg sodium (215mg/cap)</div>
            <div>{totalSodium}mg combined w/ +caf</div>
          </React.Fragment>
        } />
        <StatBox label="Salt +caf" value={grandSaltCaf} sub={
          <React.Fragment>
            <div>{grandSaltCaf * CAP_NA_CAFFEINE}mg sodium (190mg/cap)</div>
            <div>{totalSodium}mg combined w/ caps</div>
          </React.Fragment>
        } />
        <StatBox label="Water" value={`${(totalWaterMl/1000).toFixed(1)}L`} sub="whole race" color="#4A9FE8" />
        <StatBox label="Calories" value={combinedCalories} sub={customFuelItems.length ? `${totalCalories} from plan + ${Math.round(customCarbTotal*4)} custom` : 'whole race'} />
      </div>

      <div style={{ background: 'var(--bg-raised)', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
          Additional Fuel &amp; Electrolytes
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 12 }}>
          Anything beyond SIS GO gels + Tailwind + SaltStick &mdash; another carb mix, LMNT, etc. Logged as extra totals, not auto-scheduled per segment.
        </div>
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
      </div>

      {(vesselRows.length > 0 || extraGear.length > 0) && (
        <div style={{ background: 'var(--bg-raised)', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Gear
          </div>
          {vesselRows.map(v => {
            const fromLabel = v.range && v.range.from != null ? pointLabel(v.range.from, 'pickup') : null;
            const toLabel = v.range && v.range.to != null ? pointLabel(v.range.to, 'dropoff') : null;
            return (
              <div key={v.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderTop: '1px solid var(--line)', fontSize: 13 }}>
                <span style={{ color: 'var(--ink)' }}>{v.label} <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}>({v.capacity}ml)</span></span>
                <span style={{ color: 'var(--ink-faint)', fontSize: 11.5, textAlign: 'right' }}>
                  {fromLabel || toLabel ? `${fromLabel ? `from ${fromLabel}` : 'whole race'}${toLabel ? ` \u2192 ${toLabel}` : ''}` : 'whole race'}
                </span>
              </div>
            );
          })}
          {extraGear.map(g => {
            const sugg = gearSuggestion(g);
            return (
              <div key={g.id} style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink)' }}>{g.name || 'Untitled item'}</span>
                  <span style={{ color: 'var(--ink-faint)', fontSize: 11.5, textAlign: 'right' }}>
                    {pointLabel(g.pickupSegmentId, 'pickup')} &rarr; {pointLabel(g.dropoffSegmentId, 'dropoff')}
                  </span>
                </div>
                {sugg && (
                  <div style={{ fontSize: 11, marginTop: 2, color: sugg.suggested ? 'var(--climb)' : 'var(--ink-faint)' }}>
                    {sugg.suggested ? '\u2713 Suggested' : 'Not needed'} &mdash; {sugg.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {packing.map(point => <PackCard key={point.key} point={point} />)}

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
