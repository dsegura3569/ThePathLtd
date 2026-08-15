function RaceDayPlanView() {
  const { targetHours, setTargetHours } = React.useContext(window.TargetHoursContext);
  const segments = React.useMemo(() => computeDerivedSegments(targetHours), [targetHours]);
  const [active, setActive] = React.useState(1);
  const seg = segments.find(s => s.id === active);

  // Vessel breakdown now comes from the same shared vesselPlan() used by the
  // Segments tab, so both views describe the same physical flasks/bladder
  // identically instead of drifting apart.
  const vessels = vesselPlan(seg);
  const bags = popsicleBagsForVessels(vessels);

  const InfoRow = ({label, value}) => (
    <div style={{display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--line)'}}>
      <span style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)'}}>{label}</span>
      <span style={{fontFamily:'var(--body)', fontSize:12.5, color:'var(--ink)', fontWeight:500, textAlign:'right', maxWidth:'65%'}}>{value}</span>
    </div>
  );

  return (
    <div style={{paddingBottom:60}}>
      <SectionHeader eyebrow="01" title="Race Day Plan" sub="Sat 6:00am start &middot; 9 aid stations, 3 drop bags (Mi 17, 35, 56)" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, marginTop: -12, flexWrap: 'wrap' }}>
        <SmallLabel>Target finish time</SmallLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setTargetHours(h => Math.max(12, Math.round((h - 0.5) * 2) / 2))} style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-raised)',
            color: 'var(--ink)', cursor: 'pointer', fontSize: 14,
          }}>&minus;</button>
          <input
            type="number" step="0.5" min="12" max="32" value={targetHours}
            onChange={e => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) setTargetHours(Math.min(32, Math.max(12, v)));
            }}
            style={{
              width: 60, textAlign: 'center', fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600,
              background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--climb)',
              padding: '4px 6px',
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>hr</span>
          <button onClick={() => setTargetHours(h => Math.min(32, Math.round((h + 0.5) * 2) / 2))} style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-raised)',
            color: 'var(--ink)', cursor: 'pointer', fontSize: 14,
          }}>+</button>
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>32hr official cutoff</span>
      </div>

      <div style={{display:'flex', gap:6, overflowX:'auto', paddingBottom:10, marginBottom:20}}>
        {segments.map(s => (
          <button key={s.id} onClick={()=>setActive(s.id)} style={{
            padding:'9px 12px', borderRadius:10, flexShrink:0, minWidth:118, textAlign:'left', cursor:'pointer',
            border:`1.5px solid ${active===s.id ? s.color : 'var(--line)'}`,
            background: active===s.id ? s.color+'1a' : 'var(--bg-card)',
          }}>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:10, fontWeight:700, color: active===s.id ? s.color : 'var(--ink-faint)', fontFamily:'var(--mono)'}}>
              <span>Mi {s.miS}&ndash;{s.miE}</span>
              <span>{s.netDir==='climb' ? '\u25B2' : '\u25BC'}</span>
            </div>
            <div style={{fontSize:11, color:'var(--ink-dim)', marginTop:4, lineHeight:1.3}}>{s.from} &rarr; {s.to.split(' (')[0]}</div>
            <div style={{fontSize:10, color:'var(--ink-faint)', marginTop:3, fontFamily:'var(--mono)'}}>{s.time}</div>
          </button>
        ))}
      </div>

      <div style={{border:`1.5px solid ${seg.color}55`, borderRadius:16, overflow:'hidden', background:'var(--bg-card)'}}>
        <div style={{background:seg.color+'14', padding:'20px 22px', borderBottom:`1px solid ${seg.color}30`}}>
          <div style={{display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10}}>
            <div>
              <div style={{fontFamily:'var(--display)', fontSize:21, fontWeight:600, color:'var(--ink)'}}>{seg.from} &rarr; {seg.to}</div>
              <div style={{fontSize:13, color:'var(--ink-dim)', marginTop:4}}>{seg.clockS} &ndash; {seg.clockE} &middot; {seg.time} &middot; {seg.dist} mi &middot; {seg.elevS.toLocaleString()}&rarr;{seg.elevE.toLocaleString()}ft</div>
            </div>
            <div style={{display:'flex', gap:8, alignItems:'flex-start'}}>
              <span style={{fontSize:11, padding:'5px 12px', borderRadius:20, fontWeight:700, fontFamily:'var(--mono)',
                background: seg.netDir==='climb' ? '#E8943A25' : '#4A9FE825', color: seg.netDir==='climb' ? '#E8943A' : '#4A9FE8'}}>
                {seg.netDir==='climb' ? '\u25B2 CLIMB' : '\u25BC DESCENT'} {seg.netFt}ft
              </span>
              {seg.pacer && <span style={{fontSize:11, padding:'5px 12px', borderRadius:20, background:'#A78BFA20', color:'#A78BFA', fontWeight:600}}>Pacer joins</span>}
            </div>
          </div>
        </div>

        <div style={{padding:'20px 22px'}}>
          <div style={{fontSize:13, color:'var(--ink-dim)', background:'var(--bg-raised)', borderRadius:10, padding:'12px 16px', marginBottom:14, lineHeight:1.6}}>
            &#127777; {seg.conditions}
          </div>
          {seg.gradeShift && (
            <div style={{fontSize:13, color:'#FBBF24', background:'#FBBF2414', border:'1px solid #FBBF2440', borderRadius:10, padding:'12px 16px', marginBottom:14, lineHeight:1.6}}>
              &#9889; Significant grade shift &mdash; {seg.gradeShift}
            </div>
          )}

          <div style={{marginBottom:14}}>
            <SmallLabel color="var(--climb)">Vessel plan &mdash; refill at every aid station</SmallLabel>
            <div style={{display:'flex', gap:10, marginTop:10, flexWrap:'wrap'}}>
              {vessels.map((v, i) => (
                <div key={i} style={{background:'var(--bg-raised)', borderRadius:10, padding:'10px 14px', minWidth:150}}>
                  <div style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)'}}>{v.name.toUpperCase()} ({v.capacity}ml)</div>
                  <div style={{fontSize:15, fontWeight:600, color: v.tailwindMl > 0 ? 'var(--climb)' : 'var(--ink-faint)', marginTop:3}}>
                    {v.tailwindMl > 0 ? `+${v.tailwindG.toFixed(0)}g tailwind` : 'water only'}
                  </div>
                  <div style={{fontSize:11, color:'var(--ink-faint)', marginTop:2}}>{Math.round(v.water)}ml</div>
                </div>
              ))}
            </div>
            {bags.length > 0 && (
              <div style={{fontSize:12, color:'var(--ink-faint)', marginTop:10}}>
                Popsicle bags: {bags.map(b => `${b.grams}g (${b.vessel})`).join(', ')}
              </div>
            )}
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:10, marginBottom:16}}>
            <StatBox label="Elevation" value={`\u2191${seg.segGain.toLocaleString()} / \u2193${seg.segLoss.toLocaleString()}ft`} sub={`avg grade ${seg.avgGrade}% \u00b7 max ${seg.maxClimb}%/${seg.maxDescent}%`} />
            <StatBox label="Avg pace" value={`${seg.avgPace}/mi`} sub={`${seg.avgMph} mph`} />
            <StatBox label="Tailwind" value={`${seg.tailwind}g`} sub={
              <React.Fragment>
                <div>sip every ~{Math.round(seg.hours*60/(seg.waterMl/40))}min (~40ml/sip)</div>
                <div style={{marginTop:2}}>{(seg.tailwindConc*100).toFixed(1)}% mix</div>
              </React.Fragment>
            } color="var(--climb)" />
            <StatBox label="SIS gels" value={seg.gels} sub={seg.gels>0 ? `every ~${Math.round(seg.hours*60/seg.gels)}min` : ''} />
            <StatBox label={seg.saltCapType==='caffeine' ? 'SaltStick +caf' : 'SaltStick'} value={seg.saltCaps} sub={seg.saltCaps>0 ? `every ~${Math.round(seg.hours*60/seg.saltCaps)}min` : ''} color={seg.saltCapType==='caffeine' ? 'var(--ok)' : undefined} />
            <StatBox label="Sodium" value={`${seg.sodiumHr}mg/hr`} />
          </div>

          {(seg.pickup.length>0 || seg.dropoff.length>0) && (
            <div style={{marginBottom:16}}>
              <SmallLabel color="var(--db)">&#128230; At this aid station</SmallLabel>
              <div style={{background:'var(--bg-raised)', borderRadius:10, padding:'4px 16px', marginTop:8}}>
                {seg.pickup.map((item,i)=><InfoRow key={'p'+i} label="Pick up" value={item} />)}
                {seg.dropoff.map((item,i)=><InfoRow key={'d'+i} label="Drop off" value={item} />)}
              </div>
            </div>
          )}

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16}}>
            <div style={{background:'var(--bg-raised)', borderRadius:10, padding:'12px 14px'}}>
              <div style={{fontSize:11, color:'var(--ink-faint)', marginBottom:4}}>&#129440; Socks</div>
              <div style={{fontSize:13, color:'var(--ink)'}}>{seg.socks}</div>
            </div>
            <div style={{background:'var(--bg-raised)', borderRadius:10, padding:'12px 14px'}}>
              <div style={{fontSize:11, color:'var(--ink-faint)', marginBottom:4}}>&#128167; Bladder/water</div>
              <div style={{fontSize:13, color:'var(--ink)'}}>{seg.bladder}</div>
            </div>
          </div>

          <div style={{fontSize:13, color:'var(--ink-dim)', lineHeight:1.65, background:seg.color+'0d', borderLeft:`3px solid ${seg.color}`, borderRadius:'0 10px 10px 0', padding:'12px 16px'}}>
            {seg.note}
          </div>
        </div>
      </div>

      <div style={{marginTop:32}}>
        <SmallLabel>All segments</SmallLabel>
        <div style={{border:'1px solid var(--line)', borderRadius:12, overflow:'hidden', overflowX:'auto', marginTop:10}}>
          <table style={{width:'100%', minWidth:820, borderCollapse:'collapse', fontFamily:'var(--body)'}}>
            <thead>
              <tr style={{background:'var(--bg-raised)', textAlign:'left'}}>
                {['Clock','Segment','Dist','Pace','Mph','','Tailwind','Gels','Salt caps','Bag'].map(h=>(
                  <th key={h} style={{padding:'9px 12px', fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)', fontWeight:500, textTransform:'uppercase', borderBottom:'1px solid var(--line)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {segments.map(s=>(
                <tr key={s.id} onClick={()=>setActive(s.id)} style={{cursor:'pointer', background: active===s.id ? s.color+'14' : 'transparent'}}>
                  <td style={cellStyle('var(--ink-faint)')}>{s.clockS.split(' ')[1]}</td>
                  <td style={cellStyle('var(--ink)')}>{s.from} &rarr; {s.to.split(' (')[0]}</td>
                  <td style={cellStyle('var(--ink-dim)')}>{s.dist}mi</td>
                  <td style={cellStyle('var(--ink-dim)')}>{s.avgPace}</td>
                  <td style={cellStyle('var(--ink-dim)')}>{s.avgMph}</td>
                  <td style={cellStyle(s.netDir==='climb'?'var(--climb)':'var(--descent)', 700)}>{s.netDir==='climb'?'\u25B2':'\u25BC'}</td>
                  <td style={cellStyle('var(--climb)')}>{s.tailwind}g/{s.waterMl}ml</td>
                  <td style={cellStyle('var(--ink-dim)')}>{s.gels}</td>
                  <td style={cellStyle(s.saltCapType==='caffeine'?'var(--ok)':'var(--ink-dim)')}>{s.saltCaps} {s.saltCapType==='caffeine'?'+caf':''}</td>
                  <td style={cellStyle(s.dropoff.length?'var(--db)':'var(--ink-faint)', s.dropoff.length?600:400)}>{s.dropoff.length?'DB':'\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop:32}}>
        <SmallLabel>Nutrition ledger &mdash; running total</SmallLabel>
        <p style={{fontSize:12, color:'var(--ink-faint)', margin:'6px 0 12px', lineHeight:1.5}}>
          Cumulative from the gun &mdash; what you'll have consumed by the time you reach each checkpoint, not per-segment amounts.
        </p>
        {(() => {
          const checkpoints = [];
          const cum = { gels: 0, saltCaps: 0, tailwind: 0, waterMl: 0 };
          checkpoints.push({ label: 'Start', ...cum });
          segments.forEach(s => {
            cum.gels += s.gels;
            cum.saltCaps += s.saltCaps;
            cum.tailwind += s.tailwind;
            cum.waterMl += s.waterMl;
            const isDropBag = /drop bag/i.test(s.to);
            const isFinish = s.id === segments.length;
            if (isDropBag || isFinish) {
              checkpoints.push({ label: isFinish ? 'Finish' : s.to.match(/\(([^)]+)\)/)[1], ...cum });
            }
          });
          return (
            <div style={{border:'1px solid var(--line)', borderRadius:12, overflow:'hidden', overflowX:'auto'}}>
              <table style={{width:'100%', minWidth:600, borderCollapse:'collapse', fontFamily:'var(--body)'}}>
                <thead>
                  <tr style={{background:'var(--bg-raised)', textAlign:'left'}}>
                    {['Checkpoint','Gels','Salt caps','Tailwind','Water'].map(h=>(
                      <th key={h} style={{padding:'9px 12px', fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)', fontWeight:500, textTransform:'uppercase', borderBottom:'1px solid var(--line)'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {checkpoints.map((c,i) => (
                    <tr key={i}>
                      <td style={cellStyle('var(--ink)', 600)}>{c.label}</td>
                      <td style={cellStyle('var(--ink-dim)')}>{c.gels}</td>
                      <td style={cellStyle('var(--ink-dim)')}>{c.saltCaps}</td>
                      <td style={cellStyle('var(--climb)')}>{c.tailwind}g</td>
                      <td style={cellStyle('var(--ink-dim)')}>{(c.waterMl/1000).toFixed(1)}L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      <p style={{marginTop:16, fontSize:11.5, color:'var(--ink-faint)', lineHeight:1.6}}>
        Elevation: ultraPacer GPX, recomputed at official aid-station mile boundaries &mdash; total &uarr;25,385ft/&darr;25,772ft. Differs from the earlier &uarr;23,320ft figure because segment boundaries were corrected to match runtelluride.com&rsquo;s official aid station miles (previously off by up to 2mi in places).
        Pace model: grade+altitude adjusted, scaled to {targetHours}hr finish. Temps from August Telluride averages. Treat as planning reference, not guarantee.
      </p>
    </div>
  );
}
function cellStyle(color, weight=400){ return {padding:'8px 12px', fontSize:12, color, fontWeight:weight, borderBottom:'1px solid var(--line)'}; }
window.RaceDayPlanView = RaceDayPlanView;
