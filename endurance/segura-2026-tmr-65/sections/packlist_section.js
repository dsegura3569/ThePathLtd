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

function buildPackingData(segments, vesselCapacities) {
  return buildPackPoints(segments).map(point => {
    const segs = segments.filter(s => s.id >= point.segRange[0] && s.id <= point.segRange[1]);

    const gelsTotal = segs.reduce((sum, s) => sum + s.gels, 0);
    const gelsBySeg = segs.map(s => ({ seg: s.id, count: s.gels, label: `${s.from} → ${s.to}` }));

    const tailwindBags = [];
    segs.forEach(s => {
      const vessels = vesselPlan(s, vesselCapacities);
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
  const { targetHours, targetCarb, targetSodium, targetWaterHr, vestCapacity, bladderCapacity, beltCapacity } = React.useContext(window.TargetHoursContext);
  const segments = React.useMemo(() => computeDerivedSegments(targetHours, targetCarb, targetSodium, targetWaterHr), [targetHours, targetCarb, targetSodium, targetWaterHr]);
  const packing = React.useMemo(() => buildPackingData(segments, { vest: vestCapacity, bladder: bladderCapacity, belt: beltCapacity }), [segments, vestCapacity, bladderCapacity, beltCapacity]);

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

  return (
    <div style={{ paddingBottom: 60 }}>
      <SectionHeader eyebrow="01" title="Pack List" sub={`Everything to portion and label before Saturday &middot; ${targetHours}hr target (adjust on Race Day Plan)`} />

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
        <StatBox label="Calories" value={totalCalories} sub="whole race" />
      </div>

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
