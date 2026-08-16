const { useState, useEffect } = React;

// Shared target-finish-time state. Segment data everywhere except raw
// terrain (distance/elevation/grade) is derived from this at render time,
// so changing it updates pace, clock times, cutoff margins, and the whole
// nutrition plan consistently across every tab that reads it.
const TargetHoursContext = React.createContext({
  targetHours: 24, setTargetHours: () => {},
  targetCarb: 80, setTargetCarb: () => {},
  targetSodium: 700, setTargetSodium: () => {},
});
window.TargetHoursContext = TargetHoursContext;

// ---------- Nav elevation spine data (simplified TMR profile for the header signature) ----------
const SPINE = [8750,9563,10801,12278,13500,11824,11339,12374,9128,9407,11003,11833,11077,12437,12718,12049,11990,13056,11412,10415,10957,12139,12621,12566,11223,11275,11934,11253,10138,10082,10430,11195,11771,10603,11909,13104,12235,10891,9443,8858];

function Sparkline({ data, color, height = 40 }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v,i) => {
    const x = (i/(data.length-1))*100;
    const y = 100 - ((v-min)/range)*100;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{width:'100%',height,display:'block'}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

const SECTIONS = [
  { id: 'overview', label: 'Overview', eyebrow: '00' },
  { id: 'packlist', label: 'Pack List', eyebrow: '00b' },
  { id: 'raceplan', label: 'Race Day Plan', eyebrow: '01' },
  { id: 'grade', label: 'Grade Profile', eyebrow: '02' },
  { id: 'segments', label: 'Segments', eyebrow: '02b' },
  { id: 'histogram', label: 'Grade Distribution', eyebrow: '03' },
  { id: 'climb', label: 'Opening Climb', eyebrow: '04' },
  { id: 'treadmill', label: 'Treadmill Legs', eyebrow: '05' },
  { id: 'vertcalc', label: 'Vert Calculator', eyebrow: '06' },
  { id: 'history', label: 'Race History', eyebrow: '07' },
  { id: 'comparison', label: 'Race Comparison', eyebrow: '08' },
  { id: 'hillreps', label: 'Hill Reps', eyebrow: '09' },
];

function Nav({ active, setActive, open, setOpen }) {
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
                TMR<span style={{color:'var(--climb)'}}>/</span>Command
              </span>
            </div>
            <span style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)'}}>63.5mi · 25,385ft</span>
          </div>
          <div style={{height:36, opacity:0.5}}>
            <Sparkline data={SPINE} color="var(--climb)" height={36} />
          </div>
        </div>
      </header>
      {open && (
        <nav style={{
          position:'fixed', inset:'96px 0 0 0', zIndex:40, background:'var(--bg)',
          overflowY:'auto', padding:'8px 20px 40px',
        }}>
          <div style={{maxWidth:1180, margin:'0 auto'}}>
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

function Footer() {
  return (
    <footer style={{borderTop:'1px solid var(--line)', marginTop:80, padding:'32px 20px 60px'}}>
      <div style={{maxWidth:1180, margin:'0 auto', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:12}}>
        <span style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)'}}>
          Telluride Mountain Run · Aug 22, 2026 · Sat 6:00am start
        </span>
        <span style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)'}}>
          Source: ultraPacer GPX · Strava · built for race-day execution
        </span>
      </div>
    </footer>
  );
}

function App() {
  const [active, setActive] = useState('overview');
  const [open, setOpen] = useState(false);
  const [targetHours, setTargetHours] = useState(24);
  const [targetCarb, setTargetCarb] = useState(80);
  const [targetSodium, setTargetSodium] = useState(700);

  useEffect(() => { window.scrollTo(0,0); }, [active]);

  const ActiveComponent = {
    overview: window.Overview,
    packlist: window.PackListView,
    raceplan: window.RaceDayPlanView,
    grade: window.GradeProfileView,
    segments: window.SegmentsView,
    histogram: window.HistogramView,
    climb: window.InitialClimbView,
    treadmill: window.TreadmillView,
    vertcalc: window.VertCalcView,
    history: window.RaceHistoryView,
    comparison: window.RaceComparisonView,
    hillreps: window.HillRepsView,
  }[active];

  return (
    <TargetHoursContext.Provider value={{ targetHours, setTargetHours, targetCarb, setTargetCarb, targetSodium, setTargetSodium }}>
      <div>
        <Nav active={active} setActive={setActive} open={open} setOpen={setOpen} />
        <main style={{maxWidth:1180, margin:'0 auto', padding:'32px 20px 0'}}>
          {ActiveComponent ? <ActiveComponent goTo={setActive} /> : <div style={{padding:'80px 0', textAlign:'center', color:'var(--ink-faint)'}}>Section not found.</div>}
        </main>
        <Footer />
      </div>
    </TargetHoursContext.Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
