const { useState, useEffect } = React;

// Shared target-finish-time state. Segment data everywhere except raw
// terrain (distance/elevation/grade) is derived from this at render time,
// so changing it updates pace, clock times, cutoff margins, and the whole
// nutrition plan consistently across every tab that reads it.
const TargetHoursContext = React.createContext({
  targetHours: 24, setTargetHours: () => {},
  targetCarb: 80, setTargetCarb: () => {},
  targetSodium: 700, setTargetSodium: () => {},
  targetWaterHr: 500, setTargetWaterHr: () => {},
  vestCapacity: 500, setVestCapacity: () => {},
  bladderCapacity: 2000, setBladderCapacity: () => {},
  beltCapacity: 650, setBeltCapacity: () => {},
  vestEnabled: true, setVestEnabled: () => {},
  bladderEnabled: true, setBladderEnabled: () => {},
  beltEnabled: true, setBeltEnabled: () => {},
  handheldCapacity: 500, setHandheldCapacity: () => {},
  handheldEnabled: false, setHandheldEnabled: () => {},
  // Per-vessel pickup/dropoff range: {from, to} segment ids, null on either
  // end meaning "no restriction" (carried from the very start / kept all
  // the way to the finish). Lets a vessel be picked up or dropped at a
  // specific aid station instead of always assumed for the whole race.
  vesselRanges: {
    vest: { from: null, to: null }, bladder: { from: null, to: null },
    belt: { from: null, to: null }, handheld: { from: null, to: null },
  },
  setVesselRanges: () => {},
  // Freeform extra gear (headlamp, shoe/clothing change, etc.) -- each item
  // is { id, name, pickupSegmentId (null = start), dropoffSegmentId (null =
  // finish), suggestType: 'none'|'dawn'|'cold', tempThreshold }.
  extraGear: [], setExtraGear: () => {},
  // "Gels <-> Tailwind" quick-convert: extra (or fewer) gels/hr shifted onto
  // gels, with tailwind automatically absorbing the rest of the fixed carb
  // target. See derived_segments.js.
  gelRateShift: 0, setGelRateShift: () => {},
  // Freeform additional fuel/electrolyte products beyond the built-in SIS GO
  // gel + Tailwind + SaltStick model (e.g. LMNT, a different carb mix) --
  // each is { id, name, carbG, sodiumMg, caffeineMg, servings } and is
  // logged/totaled alongside the auto-computed plan rather than woven into
  // its per-segment math.
  customFuelItems: [], setCustomFuelItems: () => {},
});
window.TargetHoursContext = TargetHoursContext;


const SECTIONS = [
  { id: 'overview', label: 'Overview', eyebrow: '00' },
  { id: 'packlist', label: 'Pack List', eyebrow: '01' },
  { id: 'raceplan', label: 'Race Day Plan', eyebrow: '02' },
  { id: 'grade', label: 'Grade Profile', eyebrow: '03' },
  { id: 'segments', label: 'Segments', eyebrow: '04' },
  { id: 'gradeExplorer', label: 'Grade Explorer', eyebrow: '05' },
  { id: 'treadmill', label: 'Treadmill Legs', eyebrow: '06' },
  { id: 'vertcalc', label: 'Vert Calculator', eyebrow: '07' },
  { id: 'history', label: 'Race History', eyebrow: '08' },
  { id: 'comparison', label: 'Race Comparison', eyebrow: '09' },
  { id: 'hillreps', label: 'Hill Reps', eyebrow: '10' },
];

function AddRaceModal({ onClose, onRaceSelected }) {
  const [step, setStep] = React.useState('upload'); // upload | naming | dropbags | target | gear | nutrition | done | error
  const [parsed, setParsed] = React.useState(null);
  const [raceName, setRaceName] = React.useState('');
  const [cutoffHours, setCutoffHours] = React.useState(24);
  const [manualDate, setManualDate] = React.useState('');
  const [manualTime, setManualTime] = React.useState('06:00');
  const [errorMsg, setErrorMsg] = React.useState('');
  const fileInputRef = React.useRef(null);
  const ctx = React.useContext(window.TargetHoursContext);

  // Steps after "naming" configure the newly-created race's actual target
  // state (finish time, gear, nutrition) through the same context every
  // other page reads from -- this wizard is just a guided, linear way to
  // fill in the handful of things a GPX can never tell us, instead of
  // leaving them scattered across gear-icon panels for the person to find
  // on their own.
  const WIZARD_STEPS = ['naming', 'dropbags', 'target', 'gear', 'nutrition', 'done'];
  const stepIndex = WIZARD_STEPS.indexOf(step);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = window.parseGpxToRace(ev.target.result);
        setParsed(result);
        setRaceName(result.trackName || file.name.replace(/\.gpx$/i, ''));
        setStep('naming');
      } catch (err) {
        setErrorMsg(err.message);
        setStep('error');
      }
    };
    reader.onerror = () => { setErrorMsg('Could not read this file.'); setStep('error'); };
    reader.readAsText(file);
  }

  function confirmAdd() {
    if (!parsed || !raceName.trim()) return;
    const id = 'custom-' + Date.now();
    const raceConfig = {
      id, name: raceName.trim(), shortName: raceName.trim().slice(0, 20),
      distance: parsed.totalDistance, vertGain: parsed.totalGain,
      startDate: manualDate ? `${manualDate}T${manualTime}:00` : null,
      startLabel: 'Date not set \u2014 add on Overview',
      cutoffHours: Number(cutoffHours) || 24,
      startLat: parsed.startLat, startLon: parsed.startLon,
      baseSegments: parsed.baseSegments, gradeSegments: parsed.gradeSegments,
    };
    window.saveCustomRace(raceConfig);
    window.selectRace(id);
    onRaceSelected(id);
    setStep('dropbags');
  }

  const raceSegments = window.RACES[window.getCurrentRaceId()] ? window.RACES[window.getCurrentRaceId()].baseSegments : [];
  const [dropRows, setDropRows] = React.useState(null);
  React.useEffect(() => {
    if (step === 'dropbags' && raceSegments.length && !dropRows) {
      setDropRows(raceSegments.map(s => ({
        dropBag: !!(s.amenities && s.amenities.dropBag),
        crew: !!(s.amenities && s.amenities.crew),
        pacer: !!s.pacer,
      })));
    }
  }, [step]);
  function saveDropRows() {
    const race = window.RACES[window.getCurrentRaceId()];
    raceSegments.forEach((s, i) => {
      s.amenities = { ...s.amenities, dropBag: dropRows[i].dropBag, crew: dropRows[i].crew };
      s.pacer = dropRows[i].pacer;
    });
    if (window.getCurrentRaceId() !== 'tmr') window.saveCustomRace(race);
    setStep('target');
  }

  const WizardHeader = () => (
    <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
      <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', flex:1}}>Step {stepIndex} of {WIZARD_STEPS.length - 1}</div>
      <button onClick={onClose} style={{background:'none', border:'none', color:'var(--ink-faint)', fontSize:18, cursor:'pointer'}}>&#10005;</button>
    </div>
  );
  const skipStyle = { fontSize:12, color:'var(--ink-faint)', background:'none', border:'none', textDecoration:'underline', cursor:'pointer', padding:0 };
  const nextBtnStyle = { width:'100%', padding:'12px', borderRadius:10, border:'none', background:'var(--climb)', color:'#12151A', fontWeight:600, fontSize:14, cursor:'pointer' };

  return ReactDOM.createPortal(
    <div style={{
      position:'fixed', inset:0, background:'var(--bg)', zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:14,
        padding:24, maxWidth:440, width:'100%', maxHeight:'85vh', overflowY:'auto',
      }}>
        {(step === 'upload' || step === 'error') && (
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
            <div style={{fontFamily:'var(--display)', fontWeight:700, fontSize:18, color:'var(--ink)'}}>Add a race</div>
            <button onClick={onClose} style={{background:'none', border:'none', color:'var(--ink-faint)', fontSize:18, cursor:'pointer'}}>&#10005;</button>
          </div>
        )}

        {step === 'upload' && (
          <div>
            <p style={{fontSize:13, color:'var(--ink-dim)', lineHeight:1.6, marginBottom:16}}>
              Upload a GPX file of the course. This gives you the elevation profile, distances, and grade data
              automatically. Official cutoff times, drop bag contents, and gear notes aren't in a GPX file, so
              you'll fill those in next.
            </p>
            <input ref={fileInputRef} type="file" accept=".gpx" onChange={handleFile} style={{display:'none'}} />
            <button onClick={() => fileInputRef.current.click()} style={{
              width:'100%', padding:'14px', borderRadius:10, border:'1px dashed var(--line)',
              background:'var(--bg-raised)', color:'var(--climb)', fontSize:14, fontWeight:600, cursor:'pointer',
            }}>Choose GPX file&hellip;</button>
          </div>
        )}

        {step === 'error' && (
          <div>
            <p style={{fontSize:13, color:'var(--descent)', lineHeight:1.6, marginBottom:16}}>{errorMsg}</p>
            <button onClick={() => setStep('upload')} style={{
              padding:'10px 16px', borderRadius:8, border:'1px solid var(--line)', background:'var(--bg-raised)',
              color:'var(--ink)', fontSize:13, cursor:'pointer',
            }}>Try another file</button>
          </div>
        )}

        {step === 'naming' && parsed && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
              <div style={{fontFamily:'var(--display)', fontWeight:700, fontSize:18, color:'var(--ink)'}}>Add a race</div>
              <button onClick={onClose} style={{background:'none', border:'none', color:'var(--ink-faint)', fontSize:18, cursor:'pointer'}}>&#10005;</button>
            </div>
            <div style={{background:'var(--bg-raised)', borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:13, color:'var(--ink-dim)'}}>
              <div style={{color:'var(--climb)', fontWeight:600, marginBottom:6}}>Parsed successfully</div>
              <div>{parsed.totalDistance}mi &middot; {parsed.totalGain.toLocaleString()}ft gain &middot; {parsed.totalLoss.toLocaleString()}ft loss</div>
              <div style={{marginTop:4}}>
                {parsed.usedWaypoints
                  ? `${parsed.aidStationCount} aid station${parsed.aidStationCount===1?'':'s'} detected from GPX waypoints`
                  : 'No usable waypoints found \u2014 split into 10 equal segments (rename/adjust later)'}
              </div>
            </div>
            <label style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase'}}>Race name</label>
            <input value={raceName} onChange={e => setRaceName(e.target.value)} style={{
              width:'100%', marginTop:6, marginBottom:14, padding:'9px 10px', borderRadius:8, border:'1px solid var(--line)',
              background:'var(--bg-raised)', color:'var(--ink)', fontSize:14,
            }} />
            <label style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase'}}>Official cutoff (hours)</label>
            <input type="number" value={cutoffHours} onChange={e => setCutoffHours(e.target.value)} style={{
              width:'100%', marginTop:6, marginBottom:18, padding:'9px 10px', borderRadius:8, border:'1px solid var(--line)',
              background:'var(--bg-raised)', color:'var(--ink)', fontSize:14,
            }} />
            <label style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase'}}>Race date &amp; start time</label>
            <div style={{display:'flex', gap:8, marginTop:6, marginBottom:18}}>
              <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} style={{
                flex:1, padding:'9px 10px', borderRadius:8, border:'1px solid var(--line)',
                background:'var(--bg-raised)', color:'var(--ink)', fontSize:14,
              }} />
              <input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} style={{
                padding:'9px 10px', borderRadius:8, border:'1px solid var(--line)',
                background:'var(--bg-raised)', color:'var(--ink)', fontSize:14,
              }} />
            </div>
            <button onClick={confirmAdd} disabled={!raceName.trim()} style={{
              width:'100%', padding:'12px', borderRadius:10, border:'none',
              background: raceName.trim() ? 'var(--climb)' : 'var(--bg-raised)',
              color: raceName.trim() ? '#12151A' : 'var(--ink-faint)',
              fontWeight:600, fontSize:14, cursor: raceName.trim() ? 'pointer' : 'not-allowed',
            }}>Continue</button>
          </div>
        )}

        {step === 'dropbags' && (
          <div>
            <WizardHeader />
            <div style={{fontFamily:'var(--display)', fontWeight:700, fontSize:17, color:'var(--ink)', marginBottom:4}}>Drop bags, crew &amp; pacers</div>
            <div style={{fontSize:12.5, color:'var(--ink-faint)', marginBottom:14}}>Which aid stations apply? Skip if none of this applies yet.</div>
            {dropRows && raceSegments.map((s, i) => (
              <div key={s.id} style={{display:'flex', alignItems:'center', flexWrap:'wrap', gap:12, padding:'8px 0', borderBottom:'1px solid var(--line)'}}>
                <span style={{fontSize:13, color:'var(--ink)', flex:1, minWidth:120}}>{s.to} <span style={{color:'var(--ink-faint)', fontFamily:'var(--mono)', fontSize:11}}>(mi {s.miE})</span></span>
                {['dropBag','crew','pacer'].map(field => (
                  <label key={field} style={{display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--ink-dim)', cursor:'pointer'}}>
                    <input type="checkbox" checked={dropRows[i][field]} onChange={() => setDropRows(prev => prev.map((r,idx) => idx===i ? {...r,[field]:!r[field]} : r))} />
                    {field === 'dropBag' ? 'Drop bag' : field === 'crew' ? 'Crew' : 'Pacer'}
                  </label>
                ))}
              </div>
            ))}
            <div style={{display:'flex', gap:16, alignItems:'center', marginTop:18}}>
              <button onClick={saveDropRows} style={{...nextBtnStyle, flex:1}}>Continue</button>
              <button onClick={() => setStep('target')} style={skipStyle}>Skip</button>
            </div>
          </div>
        )}

        {step === 'target' && (
          <div>
            <WizardHeader />
            <div style={{fontFamily:'var(--display)', fontWeight:700, fontSize:17, color:'var(--ink)', marginBottom:4}}>Target finish time</div>
            <div style={{fontSize:12.5, color:'var(--ink-faint)', marginBottom:16}}>Drives pacing, cutoff margins, and every fuel/water number in the plan.</div>
            <window.TargetStepper label="Target finish time" value={ctx.targetHours} setValue={ctx.setTargetHours} min={1} max={cutoffHours} step={0.5} unit="hr" note={`${cutoffHours}hr official cutoff`} />
            <div style={{display:'flex', gap:16, alignItems:'center', marginTop:22}}>
              <button onClick={() => setStep('gear')} style={{...nextBtnStyle, flex:1}}>Continue</button>
            </div>
          </div>
        )}

        {step === 'gear' && (
          <div>
            <WizardHeader />
            <div style={{fontFamily:'var(--display)', fontWeight:700, fontSize:17, color:'var(--ink)', marginBottom:4}}>Gear</div>
            <div style={{fontSize:12.5, color:'var(--ink-faint)', marginBottom:16}}>Uncheck anything you're not carrying.</div>
            <div style={{display:'flex', flexDirection:'column', gap:16}}>
              <window.VesselToggleStepper label="Vest flask (each)" enabled={ctx.vestEnabled} setEnabled={ctx.setVestEnabled} value={ctx.vestCapacity} setValue={ctx.setVestCapacity} min={150} max={750} step={50} unit="ml" note="you carry 2" />
              <window.VesselToggleStepper label="Bladder" enabled={ctx.bladderEnabled} setEnabled={ctx.setBladderEnabled} value={ctx.bladderCapacity} setValue={ctx.setBladderCapacity} min={500} max={3000} step={100} unit="ml" />
              <window.VesselToggleStepper label="Belt flask" enabled={ctx.beltEnabled} setEnabled={ctx.setBeltEnabled} value={ctx.beltCapacity} setValue={ctx.setBeltCapacity} min={100} max={1000} step={50} unit="ml" />
              <window.VesselToggleStepper label="Handheld" enabled={ctx.handheldEnabled} setEnabled={ctx.setHandheldEnabled} value={ctx.handheldCapacity} setValue={ctx.setHandheldCapacity} min={150} max={750} step={50} unit="ml" />
            </div>
            <div style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase', marginTop:22, marginBottom:10}}>Other gear</div>
            <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
              {[
                { name: 'Poles', suggestType: 'none' },
                { name: 'Waist Lamp', suggestType: 'dawn' },
                { name: 'Head Lamp', suggestType: 'dawn' },
              ].map(p => {
                const active = ctx.extraGear.some(g => g.name === p.name);
                return (
                  <button key={p.name} onClick={() => {
                    if (active) ctx.setExtraGear(prev => prev.filter(g => g.name !== p.name));
                    else ctx.setExtraGear(prev => [...prev, { id: Date.now(), name: p.name, pickupSegmentId: null, dropoffSegmentId: null, suggestType: p.suggestType, tempThreshold: 40 }]);
                  }} style={{
                    padding:'6px 12px', borderRadius:20, border:'1px solid var(--line)',
                    background: active ? 'var(--climb)' : 'var(--bg-raised)', color: active ? '#12151A' : 'var(--ink-dim)',
                    fontSize:12, fontWeight: active ? 600 : 400, cursor:'pointer',
                  }}>{active ? '\u2713 ' : '+ '}{p.name}</button>
                );
              })}
            </div>
            <div style={{display:'flex', gap:16, alignItems:'center', marginTop:22}}>
              <button onClick={() => setStep('nutrition')} style={{...nextBtnStyle, flex:1}}>Continue</button>
            </div>
          </div>
        )}

        {step === 'nutrition' && (
          <div>
            <WizardHeader />
            <div style={{fontFamily:'var(--display)', fontWeight:700, fontSize:17, color:'var(--ink)', marginBottom:4}}>Nutrition &amp; fuel</div>
            <div style={{fontSize:12.5, color:'var(--ink-faint)', marginBottom:16}}>Hourly targets -- fine-tune the gel/tailwind split and add other products later on Pack List.</div>
            <div style={{display:'flex', flexDirection:'column', gap:16}}>
              <window.TargetStepper label="Target carb intake" value={ctx.targetCarb} setValue={ctx.setTargetCarb} min={50} max={120} step={5} unit="g/hr" />
              <window.TargetStepper label="Target salt intake" value={ctx.targetSodium} setValue={ctx.setTargetSodium} min={400} max={1200} step={50} unit="mg/hr" />
              <window.TargetStepper label="Target water intake" value={ctx.targetWaterHr} setValue={ctx.setTargetWaterHr} min={200} max={1200} step={50} unit="ml/hr" />
            </div>
            <div style={{display:'flex', gap:16, alignItems:'center', marginTop:22}}>
              <button onClick={() => setStep('done')} style={{...nextBtnStyle, flex:1}}>Continue</button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div>
            <div style={{fontFamily:'var(--display)', fontWeight:700, fontSize:19, color:'var(--ink)', marginBottom:8}}>Race is ready</div>
            <p style={{fontSize:13, color:'var(--ink-dim)', lineHeight:1.6, marginBottom:20}}>
              Everything's set. You can revisit any of this later from the gear icons on the Command Center.
            </p>
            <button onClick={onClose} style={nextBtnStyle}>Go to Command Center</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function RacePicker({ raceId, onSelectRace }) {
  const [showModal, setShowModal] = React.useState(() => {
    try { return new URLSearchParams(window.location.search).get('addRace') === '1'; } catch (e) { return false; }
  });
  const races = window.listRaces();

  // The "Add a race" modal can be opened via a ?addRace=1 link so it's
  // ready on first paint. Nothing ever stripped that param back out of the
  // URL afterward, so it stuck around in the address bar and reopened the
  // upload prompt on every future refresh -- close it here whenever the
  // modal is dismissed, by whichever path (X, successful upload, or the
  // toggle button), so a plain refresh lands on the normal dashboard again.
  function closeModal() {
    setShowModal(false);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('addRace')) {
        url.searchParams.delete('addRace');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {}
  }

  return (
    <div style={{display:'flex', alignItems:'center', gap:8}}>
      {races.length > 1 && (
        <select
          value={raceId}
          onChange={(e) => onSelectRace(e.target.value)}
          style={{
            background:'var(--bg-raised)', border:'1px solid var(--line)', borderRadius:8,
            color:'var(--ink)', fontFamily:'var(--body)', fontSize:13, padding:'6px 10px', cursor:'pointer',
          }}
        >
          {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      )}
      <button onClick={() => setShowModal(true)} title="Add a race" aria-label="Add a race" style={{
        width:32, height:32, borderRadius:8, border:'1px solid var(--line)', background:'var(--bg-raised)',
        color:'var(--climb)', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
      }}>+</button>
      {showModal && (
        <AddRaceModal
          onClose={closeModal}
          onRaceSelected={(id) => { onSelectRace(id); }}
        />
      )}
    </div>
  );
}

function getHiddenCardIds() {
  try {
    const saved = JSON.parse(localStorage.getItem('tmr_overview_card_state_v1'));
    if (saved && typeof saved === 'object') {
      return Object.keys(saved).filter(id => saved[id] === 'hidden');
    }
  } catch (e) {}
  return [];
}

function Nav({ active, setActive, open, setOpen, onGear, raceId, onSelectRace }) {
  const race = window.RACES[raceId];
  // Only 'overview' is always shown -- every other section corresponds to a
  // Race Insights card on Overview, so if that card's been hidden there (via
  // the manage-sections gear), it shouldn't still show up as a nav option.
  const hiddenCardIds = getHiddenCardIds();
  const visibleSections = SECTIONS.filter(s => s.id === 'overview' || !hiddenCardIds.includes(s.id));
  return (
    <React.Fragment>
      <header style={{
        position:'sticky', top:0, zIndex:50, background:'rgba(18,21,26,0.92)',
        backdropFilter:'blur(10px)', borderBottom:'1px solid var(--line)',
      }}>
        <div style={{maxWidth:1180, margin:'0 auto', padding:'0 20px'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', height:56}}>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <button onClick={()=>setOpen(!open)} aria-label="Toggle menu" style={{
                background:'none', border:'1px solid var(--line)', borderRadius:8, width:36, height:36,
                color:'var(--ink)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <span style={{fontFamily:'var(--mono)', fontSize:14}}>{open ? '✕' : '☰'}</span>
              </button>
              <span style={{fontFamily:'var(--display)', fontWeight:700, fontSize:16, letterSpacing:'-0.01em'}}>
                {race.shortName}<span style={{color:'var(--climb)'}}>/</span>Command
              </span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <RacePicker raceId={raceId} onSelectRace={onSelectRace} />
              <button onClick={onGear} aria-label="Manage sections" title="Manage sections" style={{
                background:'none', border:'1px solid var(--line)', borderRadius:8, width:36, height:36,
                color:'var(--ink-faint)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:16,
              }}>⚙️</button>
            </div>
          </div>
        </div>
      </header>
      {open && (
        <nav style={{
          position:'fixed', inset:'96px 0 0 0', zIndex:40, background:'var(--bg)',
          overflowY:'auto', padding:'8px 20px 40px',
        }}>
          <div style={{maxWidth:1180, margin:'0 auto'}}>
            <a href="/endurance/" style={{
              display:'flex', alignItems:'center', gap:8, width:'100%', textAlign:'left',
              padding:'18px 4px', textDecoration:'none', color:'var(--descent)',
              borderBottom:'1px solid var(--line)', marginBottom:4,
              fontFamily:'var(--display)', fontSize:22, fontWeight:600,
            }}>&larr; All Races</a>
            {visibleSections.map(s => (
              <button key={s.id} onClick={()=>{ setActive(s.id); setOpen(false); }} style={{
                display:'flex', alignItems:'baseline', gap:16, width:'100%', textAlign:'left',
                background:'none', border:'none', borderBottom:'1px solid var(--line)',
                padding:'18px 4px', cursor:'pointer', color: active===s.id ? 'var(--climb)' : 'var(--ink)',
              }}>
                <span style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--ink-faint)'}}>{s.eyebrow}</span>
                <span style={{fontFamily:'var(--display)', fontSize:22, fontWeight:600}}>{s.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </React.Fragment>
  );
}

function Footer({ raceId }) {
  const race = window.RACES[raceId];
  return (
    <footer style={{borderTop:'1px solid var(--line)', marginTop:80, padding:'32px 20px 60px'}}>
      <div style={{maxWidth:1180, margin:'0 auto', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:12}}>
        <span style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)'}}>
          {race.name} &middot; {window.formatRaceStartLabel(race)}
        </span>
        <span style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)'}}>
          Source: ultraPacer GPX · Strava · built for race-day execution
        </span>
      </div>
    </footer>
  );
}

// Race targets (finish time, nutrition, vessel capacities) are meant to be
// specific to each race -- a 65-mile mountain race and a flat 50k need very
// different numbers -- so they're saved per race id, not globally. Also
// clamped against that race's own official cutoff: a target finish time
// longer than the cutoff itself was possible before this fix (confirmed via
// screenshot: showed 24hr target against a 15hr cutoff), since the
// hardcoded default of 24 was never checked against whatever race was
// actually loaded.
const TARGETS_KEY_PREFIX = 'tmr_command_targets_v1_';

function loadTargetsForRace(id) {
  const race = window.RACES[id];
  const cutoff = (race && race.cutoffHours) || 24;
  const defaults = {
    targetHours: Math.min(24, cutoff), targetCarb: 80, targetSodium: 700, targetWaterHr: 500,
    vestCapacity: 500, bladderCapacity: 2000, beltCapacity: 650,
    vestEnabled: true, bladderEnabled: true, beltEnabled: true,
    handheldCapacity: 500, handheldEnabled: false,
    vesselRanges: {
      vest: { from: null, to: null }, bladder: { from: null, to: null },
      belt: { from: null, to: null }, handheld: { from: null, to: null },
    },
    extraGear: [],
    gelRateShift: 0,
    customFuelItems: [],
  };
  try {
    const saved = JSON.parse(localStorage.getItem(TARGETS_KEY_PREFIX + id) || 'null');
    if (saved) return { ...defaults, ...saved, targetHours: Math.min(saved.targetHours ?? defaults.targetHours, cutoff) };
  } catch (e) {}
  return defaults;
}

function App() {
  const [active, setActive] = useState('overview');
  const [open, setOpen] = useState(false);
  const [openCardPanel, setOpenCardPanel] = useState(false);
  const [raceId, setRaceId] = useState(() => window.getCurrentRaceId());
  const [targetHours, setTargetHours] = useState(() => loadTargetsForRace(raceId).targetHours);
  const [targetCarb, setTargetCarb] = useState(() => loadTargetsForRace(raceId).targetCarb);
  const [targetSodium, setTargetSodium] = useState(() => loadTargetsForRace(raceId).targetSodium);
  const [targetWaterHr, setTargetWaterHr] = useState(() => loadTargetsForRace(raceId).targetWaterHr);
  const [vestCapacity, setVestCapacity] = useState(() => loadTargetsForRace(raceId).vestCapacity);
  const [bladderCapacity, setBladderCapacity] = useState(() => loadTargetsForRace(raceId).bladderCapacity);
  const [beltCapacity, setBeltCapacity] = useState(() => loadTargetsForRace(raceId).beltCapacity);
  const [vestEnabled, setVestEnabled] = useState(() => loadTargetsForRace(raceId).vestEnabled);
  const [bladderEnabled, setBladderEnabled] = useState(() => loadTargetsForRace(raceId).bladderEnabled);
  const [beltEnabled, setBeltEnabled] = useState(() => loadTargetsForRace(raceId).beltEnabled);
  const [handheldCapacity, setHandheldCapacity] = useState(() => loadTargetsForRace(raceId).handheldCapacity);
  const [handheldEnabled, setHandheldEnabled] = useState(() => loadTargetsForRace(raceId).handheldEnabled);
  const [vesselRanges, setVesselRanges] = useState(() => loadTargetsForRace(raceId).vesselRanges);
  const [extraGear, setExtraGear] = useState(() => loadTargetsForRace(raceId).extraGear);
  const [gelRateShift, setGelRateShift] = useState(() => loadTargetsForRace(raceId).gelRateShift);
  const [customFuelItems, setCustomFuelItems] = useState(() => loadTargetsForRace(raceId).customFuelItems);
  // Bumped whenever race data is edited in place (e.g. applying parsed race
  // info) so the active page remounts and picks up fresh data, the same way
  // switching races does -- switching raceId alone wouldn't detect an edit
  // to the SAME race's data, since the id itself hasn't changed.
  const [raceDataVersion, setRaceDataVersion] = useState(0);

  useEffect(() => { window.scrollTo(0,0); }, [active]);

  // Persist targets for the current race whenever any of them change.
  useEffect(() => {
    try {
      localStorage.setItem(TARGETS_KEY_PREFIX + raceId, JSON.stringify({
        targetHours, targetCarb, targetSodium, targetWaterHr, vestCapacity, bladderCapacity, beltCapacity,
        vestEnabled, bladderEnabled, beltEnabled, handheldCapacity, handheldEnabled, vesselRanges, extraGear,
        gelRateShift, customFuelItems,
      }));
    } catch (e) {}
  }, [targetHours, targetCarb, targetSodium, targetWaterHr, vestCapacity, bladderCapacity, beltCapacity,
      vestEnabled, bladderEnabled, beltEnabled, handheldCapacity, handheldEnabled, vesselRanges, extraGear,
      gelRateShift, customFuelItems, raceId]);

  // If the current race's own cutoff gets edited down below the current
  // target (e.g. via the Race Date/Time/Cutoff widget or Import Race Info),
  // re-clamp immediately rather than silently leaving an impossible target
  // in place until the person happens to touch the stepper themselves.
  useEffect(() => {
    const race = window.RACES[raceId];
    if (race && race.cutoffHours && targetHours > race.cutoffHours) {
      setTargetHours(race.cutoffHours);
    }
  }, [raceDataVersion, raceId]);

  function handleGear() {
    if (active !== 'overview') { setActive('overview'); setOpenCardPanel(true); }
    else { setOpenCardPanel(v => !v); }
  }

  function handleSelectRace(id) {
    if (window.selectRace(id)) {
      const loaded = loadTargetsForRace(id);
      setRaceId(id);
      setTargetHours(loaded.targetHours);
      setTargetCarb(loaded.targetCarb);
      setTargetSodium(loaded.targetSodium);
      setTargetWaterHr(loaded.targetWaterHr);
      setVestCapacity(loaded.vestCapacity);
      setBladderCapacity(loaded.bladderCapacity);
      setBeltCapacity(loaded.beltCapacity);
      setVestEnabled(loaded.vestEnabled);
      setBladderEnabled(loaded.bladderEnabled);
      setBeltEnabled(loaded.beltEnabled);
      setHandheldCapacity(loaded.handheldCapacity);
      setHandheldEnabled(loaded.handheldEnabled);
      setVesselRanges(loaded.vesselRanges);
      setExtraGear(loaded.extraGear);
      setGelRateShift(loaded.gelRateShift);
      setCustomFuelItems(loaded.customFuelItems);
      setActive('overview'); // land on Overview -- the previously active page may not exist/make sense for a different race
    }
  }

  const ActiveComponent = {
    overview: window.Overview,
    packlist: window.PackListView,
    raceplan: window.RaceDayPlanView,
    grade: window.GradeProfileView,
    segments: window.SegmentsView,
    gradeExplorer: window.GradeExplorerView,
    treadmill: window.TreadmillView,
    vertcalc: window.VertCalcView,
    history: window.RaceHistoryView,
    comparison: window.RaceComparisonView,
    hillreps: window.HillRepsView,
  }[active];

  return (
    <TargetHoursContext.Provider value={{
      targetHours, setTargetHours, targetCarb, setTargetCarb, targetSodium, setTargetSodium,
      targetWaterHr, setTargetWaterHr, vestCapacity, setVestCapacity, bladderCapacity, setBladderCapacity, beltCapacity, setBeltCapacity,
      vestEnabled, setVestEnabled, bladderEnabled, setBladderEnabled, beltEnabled, setBeltEnabled,
      handheldCapacity, setHandheldCapacity, handheldEnabled, setHandheldEnabled,
      vesselRanges, setVesselRanges, extraGear, setExtraGear,
      gelRateShift, setGelRateShift, customFuelItems, setCustomFuelItems,
    }}>
      <div>
        <Nav active={active} setActive={setActive} open={open} setOpen={setOpen} onGear={handleGear} raceId={raceId} onSelectRace={handleSelectRace} />
        <main style={{maxWidth:1180, margin:'0 auto', padding:'32px 20px 0'}}>
          {ActiveComponent
            ? <ActiveComponent key={raceId + ':' + raceDataVersion} goTo={setActive} externalCardPanelOpen={active==='overview' ? openCardPanel : undefined} onCardPanelToggle={active==='overview' ? setOpenCardPanel : undefined} onRaceDataChanged={() => setRaceDataVersion(v => v + 1)} />
            : <div style={{padding:'80px 0', textAlign:'center', color:'var(--ink-faint)'}}>Section not found.</div>}
        </main>
        <Footer raceId={raceId} />
      </div>
    </TargetHoursContext.Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
