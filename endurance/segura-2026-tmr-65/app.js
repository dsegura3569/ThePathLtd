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

function AddRaceModal({ onClose, onRaceAdded }) {
  const [step, setStep] = React.useState('upload'); // upload | naming | error
  const [parsed, setParsed] = React.useState(null);
  const [raceName, setRaceName] = React.useState('');
  const [cutoffHours, setCutoffHours] = React.useState(24);
  const [manualDate, setManualDate] = React.useState('');
  const [manualTime, setManualTime] = React.useState('06:00');
  const [errorMsg, setErrorMsg] = React.useState('');
  const fileInputRef = React.useRef(null);

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
    onRaceAdded(id);
  }

  return ReactDOM.createPortal(
    <div style={{
      position:'fixed', inset:0, background:'var(--bg)', zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:14,
        padding:24, maxWidth:440, width:'100%', maxHeight:'85vh', overflowY:'auto',
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <div style={{fontFamily:'var(--display)', fontWeight:700, fontSize:18, color:'var(--ink)'}}>Add a race</div>
          <button onClick={onClose} style={{background:'none', border:'none', color:'var(--ink-faint)', fontSize:18, cursor:'pointer'}}>&#10005;</button>
        </div>

        {step === 'upload' && (
          <div>
            <p style={{fontSize:13, color:'var(--ink-dim)', lineHeight:1.6, marginBottom:16}}>
              Upload a GPX file of the course. This gives you the elevation profile, distances, and grade data
              automatically. Official cutoff times, drop bag contents, and gear notes aren't in a GPX file, so
              you'll fill those in afterward on Overview.
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
            <label style={{fontSize:11, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase'}}>Race date &amp; start time (optional &mdash; can also set this later on Overview)</label>
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
            }}>Add race &amp; switch to it</button>
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
          onClose={() => setShowModal(false)}
          onRaceAdded={(id) => { setShowModal(false); onSelectRace(id); }}
        />
      )}
    </div>
  );
}

function Nav({ active, setActive, open, setOpen, onGear, raceId, onSelectRace }) {
  const race = window.RACES[raceId];
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
              padding:'14px 4px', textDecoration:'none', color:'var(--ink-faint)',
              borderBottom:'1px solid var(--line)', marginBottom:4,
              fontFamily:'var(--mono)', fontSize:13,
            }}>&larr; All Races</a>
            {SECTIONS.map(s => (
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
      }));
    } catch (e) {}
  }, [targetHours, targetCarb, targetSodium, targetWaterHr, vestCapacity, bladderCapacity, beltCapacity, raceId]);

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
