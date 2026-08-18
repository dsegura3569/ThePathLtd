const COLUMN_DEFS = [
  { key:'clock', label:'Clock', cellStyle:() => cellStyle('var(--ink-faint)'), render: s => s.clockS.split(' ')[1] },
  { key:'cutoff', label:'Cutoff', cellStyle:() => cellStyle('var(--ink-faint)'), render: s => s.cutoffClock },
  { key:'segment', label:'Segment', cellStyle: s => cellStyle(s.dropoff.length ? 'var(--db)' : 'var(--ink)', s.dropoff.length ? 600 : 400), render: s => <React.Fragment>{s.from} &rarr; {s.to.split(' (')[0]}</React.Fragment> },
  { key:'dist', label:'Dist', cellStyle:() => cellStyle('var(--ink-dim)'), render: s => `${s.distReal.toFixed(1)}mi` },
  { key:'pace', label:'Pace', cellStyle:() => cellStyle('var(--ink-dim)'), render: s => s.avgPace },
  { key:'mph', label:'Mph', cellStyle:() => cellStyle('var(--ink-dim)'), render: s => s.avgMph },
  { key:'grade', label:'Avg Grade', cellStyle: s => cellStyle(parseFloat(s.avgGrade) >= 0 ? 'var(--climb)' : 'var(--descent)'), render: s => `${s.avgGrade}%` },
  { key:'dir', label:'Dir', cellStyle: s => cellStyle(s.netDir==='climb'?'var(--climb)':'var(--descent)', 700), render: s => s.netDir==='climb'?'\u25B2':'\u25BC' },
  { key:'gain', label:'Gain', cellStyle:() => cellStyle('var(--climb)'), render: s => `+${s.segGain.toLocaleString()}ft` },
  { key:'loss', label:'Loss', cellStyle:() => cellStyle('var(--descent)'), render: s => `-${s.segLoss.toLocaleString()}ft` },
  { key:'tailwind', label:'Tailwind', cellStyle:() => cellStyle('var(--climb)'), render: s => `${s.tailwind}g` },
  { key:'gels', label:'Gels', cellStyle:() => cellStyle('var(--ink-dim)'), render: s => s.gels },
  { key:'saltcaps', label:'Salt', cellStyle: s => cellStyle(s.saltCapType==='caffeine'?'var(--ok)':'var(--ink-dim)'), render: s => <React.Fragment>{s.saltCaps} {s.saltCapType==='caffeine'?'+caf':''}</React.Fragment> },
];
const DEFAULT_COLUMN_ORDER = COLUMN_DEFS.map(c => c.key);
const COLUMN_ORDER_KEY = 'tmr_segment_table_col_order_v2';

function loadColumnOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(COLUMN_ORDER_KEY));
    if (Array.isArray(saved) && saved.length === DEFAULT_COLUMN_ORDER.length &&
        saved.every(k => DEFAULT_COLUMN_ORDER.includes(k))) {
      return saved;
    }
  } catch (e) {}
  return DEFAULT_COLUMN_ORDER;
}

function TargetStepper({ label, value, setValue, min, max, step, unit, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
      <SmallLabel>{label}</SmallLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => setValue(v => Math.max(min, Math.round((v - step) * 100) / 100))} style={{
          width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-raised)',
          color: 'var(--ink)', cursor: 'pointer', fontSize: 14,
        }}>&minus;</button>
        <input
          type="number" step={step} min={min} max={max} value={value}
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) setValue(Math.min(max, Math.max(min, v)));
          }}
          style={{
            width: 66, textAlign: 'center', fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600,
            background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--climb)',
            padding: '4px 6px',
          }}
        />
        <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{unit}</span>
        <button onClick={() => setValue(v => Math.min(max, Math.round((v + step) * 100) / 100))} style={{
          width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-raised)',
          color: 'var(--ink)', cursor: 'pointer', fontSize: 14,
        }}>+</button>
      </div>
      {note && <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{note}</span>}
    </div>
  );
}

function dropBagNum(seg) {
  const m = seg.to.match(/Drop Bag #(\d+)/i);
  return m ? m[1] : null;
}

function RaceDayPlanView() {
  const { targetHours, setTargetHours, targetCarb, setTargetCarb, targetSodium, setTargetSodium } = React.useContext(window.TargetHoursContext);
  const segments = React.useMemo(() => computeDerivedSegments(targetHours, targetCarb, targetSodium), [targetHours, targetCarb, targetSodium]);
  const [active, setActive] = React.useState(1);
  const seg = segments.find(s => s.id === active);
  const [showColumnPanel, setShowColumnPanel] = React.useState(false);
  const [columnOrder, setColumnOrder] = React.useState(loadColumnOrder);

  React.useEffect(() => {
    try { localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(columnOrder)); } catch (e) {}
  }, [columnOrder]);

  function moveColumn(index, dir) {
    setColumnOrder(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function resetColumns() { setColumnOrder(DEFAULT_COLUMN_ORDER); }

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
      <SectionHeader eyebrow="02" title="Race Day Plan" sub="Sat 6:00am start &middot; 9 aid stations, 3 drop bags (Mi 17, 35, 56)" />

      <TargetStepper label="Target finish time" value={targetHours} setValue={setTargetHours} min={12} max={32} step={0.5} unit="hr" note="32hr official cutoff" />
      <TargetStepper label="Target carb intake" value={targetCarb} setValue={setTargetCarb} min={50} max={120} step={5} unit="g/hr" />
      <TargetStepper label="Target salt intake" value={targetSodium} setValue={setTargetSodium} min={400} max={1200} step={50} unit="mg/hr" />

      <div style={{marginTop:32, marginBottom:32}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8}}>
          <SmallLabel>All segments</SmallLabel>
          <button onClick={() => setShowColumnPanel(v => !v)} style={{
            fontSize:11, fontFamily:'var(--mono)', color:'var(--ink-faint)', background:'var(--bg-raised)',
            border:'1px solid var(--line)', borderRadius:8, padding:'5px 10px', cursor:'pointer',
          }}>
            {showColumnPanel ? 'Done' : 'Customize columns'}
          </button>
        </div>

        {showColumnPanel && (
          <div style={{background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:10, padding:12, marginTop:10}}>
            <div style={{fontSize:11, color:'var(--ink-faint)', marginBottom:8}}>Reorder with the arrows, or reset.</div>
            {columnOrder.map((key, i) => {
              const col = COLUMN_DEFS.find(c => c.key === key);
              return (
                <div key={key} style={{display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderTop: i>0 ? '1px solid var(--line)' : 'none'}}>
                  <span style={{flex:1, fontSize:13, color:'var(--ink)'}}>{col.label}</span>
                  <button disabled={i===0} onClick={() => moveColumn(i, -1)} style={{
                    width:26, height:26, borderRadius:6, border:'1px solid var(--line)', background:'var(--bg-raised)',
                    color: i===0 ? 'var(--ink-faint)' : 'var(--ink)', cursor: i===0 ? 'not-allowed' : 'pointer', fontSize:12,
                  }}>&uarr;</button>
                  <button disabled={i===columnOrder.length-1} onClick={() => moveColumn(i, 1)} style={{
                    width:26, height:26, borderRadius:6, border:'1px solid var(--line)', background:'var(--bg-raised)',
                    color: i===columnOrder.length-1 ? 'var(--ink-faint)' : 'var(--ink)', cursor: i===columnOrder.length-1 ? 'not-allowed' : 'pointer', fontSize:12,
                  }}>&darr;</button>
                </div>
              );
            })}
            <button onClick={resetColumns} style={{
              marginTop:10, fontSize:11, fontFamily:'var(--mono)', color:'var(--ink-faint)', background:'none',
              border:'none', textDecoration:'underline', cursor:'pointer', padding:0,
            }}>Reset to default order</button>
          </div>
        )}

        <div style={{border:'1px solid var(--line)', borderRadius:12, overflow:'hidden', overflowX:'auto', marginTop:10}}>
          <table style={{width:'100%', minWidth:900, borderCollapse:'collapse', fontFamily:'var(--body)'}}>
            <thead>
              <tr style={{background:'var(--bg-raised)', textAlign:'left'}}>
                {columnOrder.map(key => {
                  const col = COLUMN_DEFS.find(c => c.key === key);
                  return (
                    <th key={key} style={{padding:'9px 12px', fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)', fontWeight:500, textTransform:'uppercase', borderBottom:'1px solid var(--line)'}}>{col.label}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {segments.map(s=>(
                <tr key={s.id} onClick={()=>setActive(s.id)} style={{cursor:'pointer', background: active===s.id ? s.color+'14' : 'transparent'}}>
                  {columnOrder.map(key => (
                    <td key={key} style={COLUMN_DEFS.find(c => c.key === key).cellStyle(s)}>
                      {COLUMN_DEFS.find(c => c.key === key).render(s)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{background:'var(--bg-raised)', borderTop:'2px solid var(--line)'}}>
                {columnOrder.map(key => {
                  const totalDist = segments.reduce((a,s)=>a+s.distReal,0);
                  const totalGain = segments.reduce((a,s)=>a+s.segGain,0);
                  const totalLoss = segments.reduce((a,s)=>a+s.segLoss,0);
                  const totalTailwind = segments.reduce((a,s)=>a+s.tailwind,0);
                  const totalGels = segments.reduce((a,s)=>a+s.gels,0);
                  const totalSalt = segments.reduce((a,s)=>a+s.saltCaps,0);
                  const cellBase = {padding:'10px 12px', fontFamily:'var(--mono)', fontWeight:700, fontSize:12.5};
                  switch(key) {
                    case 'segment': return <td key={key} style={{...cellBase, color:'var(--ink)'}}>TOTAL</td>;
                    case 'dist': return <td key={key} style={{...cellBase, color:'var(--ink)'}}>{totalDist.toFixed(1)}mi</td>;
                    case 'gain': return <td key={key} style={{...cellBase, color:'var(--climb)'}}>+{totalGain.toLocaleString()}ft</td>;
                    case 'loss': return <td key={key} style={{...cellBase, color:'var(--descent)'}}>-{totalLoss.toLocaleString()}ft</td>;
                    case 'tailwind': return <td key={key} style={{...cellBase, color:'var(--climb)'}}>{totalTailwind}g</td>;
                    case 'gels': return <td key={key} style={{...cellBase, color:'var(--ink)'}}>{totalGels}</td>;
                    case 'saltcaps': return <td key={key} style={{...cellBase, color:'var(--ink)'}}>{totalSalt}</td>;
                    default: return <td key={key} style={cellBase}></td>;
                  }
                })}
              </tr>
            </tfoot>
          </table>
        </div>
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
              <div style={{fontFamily:'var(--display)', fontSize:21, fontWeight:600, color:'var(--ink)'}}>{seg.from.replace(/\s*\(Drop Bag #\d+\)/i,'')} &rarr; {seg.to.replace(/\s*\(Drop Bag #\d+\)/i,'')}</div>
              <div style={{fontSize:13, color:'var(--ink-dim)', marginTop:4}}>{seg.clockS} &ndash; {seg.clockE} &middot; {seg.time} &middot; {seg.dist} mi &middot; {seg.elevS.toLocaleString()}&rarr;{seg.elevE.toLocaleString()}ft</div>
            </div>
            <div style={{display:'flex', gap:8, alignItems:'flex-start', flexWrap:'wrap'}}>
              {dropBagNum(seg) && (
                <span style={{fontSize:11, padding:'5px 12px', borderRadius:20, background:'var(--db)20', color:'var(--db)', fontWeight:700, fontFamily:'var(--mono)'}}>
                  DB{dropBagNum(seg)}
                </span>
              )}
              {seg.segGain > 300 && seg.segLoss > 300 ? (
                <React.Fragment>
                  <span style={{fontSize:11, padding:'5px 12px', borderRadius:20, fontWeight:700, fontFamily:'var(--mono)', background:'var(--climb)25', color:'var(--climb)'}}>
                    &#9650; {seg.segGain.toLocaleString()}ft
                  </span>
                  <span style={{fontSize:11, padding:'5px 12px', borderRadius:20, fontWeight:700, fontFamily:'var(--mono)', background:'var(--descent)25', color:'var(--descent)'}}>
                    &#9660; {seg.segLoss.toLocaleString()}ft
                  </span>
                </React.Fragment>
              ) : (
                <span style={{fontSize:11, padding:'5px 12px', borderRadius:20, fontWeight:700, fontFamily:'var(--mono)',
                  background: seg.netDir==='climb' ? 'var(--climb)25' : 'var(--descent)25', color: seg.netDir==='climb' ? 'var(--climb)' : 'var(--descent)'}}>
                  {seg.netDir==='climb' ? '\u25B2 CLIMB' : '\u25BC DESCENT'} {seg.netFt}ft
                </span>
              )}
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

          <VesselPlanCompact seg={seg} vessels={vessels} bags={bags} />

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

          <div style={{marginBottom:16}}>
            <SmallLabel color="var(--db)">&#128230; At this aid station</SmallLabel>
            <div style={{background:'var(--bg-raised)', borderRadius:10, padding:'4px 16px', marginTop:8}}>
              {seg.pickup.length > 0
                ? seg.pickup.map((item,i)=><InfoRow key={'p'+i} label="Pick up" value={item} />)
                : <InfoRow label="Pick up" value="Refill water &amp; bladder &mdash; no drop bag this stop" />
              }
              {seg.dropoff.map((item,i)=><InfoRow key={'d'+i} label="Drop off" value={item} />)}
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns: dropBagNum(seg) ? '1fr 1fr' : '1fr', gap:10, marginBottom:16}}>
            {dropBagNum(seg) && (
              <div style={{background:'var(--bg-raised)', borderRadius:10, padding:'12px 14px'}}>
                <div style={{fontSize:11, color:'var(--ink-faint)', marginBottom:4}}>&#129440; Socks</div>
                <div style={{fontSize:13, color:'var(--ink)'}}>{seg.socks}</div>
              </div>
            )}
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
