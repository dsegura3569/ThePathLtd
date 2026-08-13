function Overview({ goTo }) {
  const stats = [
    { label: 'Distance', value: '63.5', unit: 'mi' },
    { label: 'Vert gain', value: '23,320', unit: 'ft' },
    { label: 'Aid stations', value: '9', unit: '' },
    { label: 'Drop bags', value: '3', unit: '' },
    { label: 'Elevation range', value: '8,750–13,500', unit: 'ft' },
    { label: 'Cutoff', value: '32', unit: 'hr' },
  ];

  const cards = [
    { id: 'raceplan', n: '01', t: 'Race Day Plan', d: 'Segment-by-segment pace, fuel, gear, and drop bag logistics for all 10 legs.' },
    { id: 'grade', n: '02', t: 'Grade Profile', d: 'Every 0.1-mile grade reading across the full course, aid station by aid station.' },
    { id: 'histogram', n: '03', t: 'Grade Distribution', d: 'How many miles sit at each grade band, from -45% to +45%.' },
    { id: 'climb', n: '04', t: 'Opening Climb', d: 'The 7.5-mile, 4,712ft opening push to Telluride Peak, broken down half-mile by half-mile.' },
    { id: 'treadmill', n: '05', t: 'Treadmill Legs', d: 'Indoor replication sessions matched to real course grade and duration.' },
    { id: 'vertcalc', n: '06', t: 'Vert Calculator', d: 'Grade, speed, and time-to-target vertical gain calculator.' },
    { id: 'history', n: '07', t: 'Race History', d: 'Completed races leading into TMR — Dead Horse, Desert RATS, Colfax.' },
    { id: 'comparison', n: '08', t: 'Race Comparison', d: 'How training runs and past races stack up against TMR\u2019s demands.' },
    { id: 'hillreps', n: '09', t: 'Hill Reps', d: 'Local hill session analysis and grade-matched training terrain.' },
  ];

  return (
    <div>
      <section style={{padding:'40px 0 56px', borderBottom:'1px solid var(--line)'}}>
        <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--climb)', letterSpacing:'0.08em', marginBottom:14}}>
          TELLURIDE MOUNTAIN RUN &middot; AUG 22, 2026
        </div>
        <h1 style={{
          fontFamily:'var(--display)', fontWeight:700, fontSize:'clamp(38px, 8vw, 68px)',
          lineHeight:1.02, letterSpacing:'-0.02em', margin:'0 0 20px',
        }}>
          63.5 miles.<br/>
          <span style={{color:'var(--climb)'}}>23,320 feet</span> of climbing.<br/>
          One race day.
        </h1>
        <p style={{fontFamily:'var(--body)', fontSize:17, color:'var(--ink-dim)', maxWidth:560, lineHeight:1.6, margin:'0 0 32px'}}>
          Every segment, every grade, every drop bag &mdash; built from the official ultraPacer GPX
          and race-day Strava data. This is the command center for race day.
        </p>
        <button onClick={()=>goTo('raceplan')} style={{
          background:'var(--climb)', color:'#12151A', border:'none', borderRadius:10,
          padding:'14px 24px', fontFamily:'var(--display)', fontWeight:600, fontSize:15,
          cursor:'pointer',
        }}>
          Open race day plan &rarr;
        </button>
      </section>

      <section style={{padding:'40px 0', borderBottom:'1px solid var(--line)'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:1, background:'var(--line)'}}>
          {stats.map(s => (
            <div key={s.label} style={{background:'var(--bg)', padding:'20px 16px'}}>
              <div style={{fontFamily:'var(--display)', fontSize:26, fontWeight:700, color:'var(--ink)'}}>
                {s.value}<span style={{fontSize:14, color:'var(--ink-faint)', marginLeft:4}}>{s.unit}</span>
              </div>
              <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', marginTop:6, textTransform:'uppercase', letterSpacing:'0.05em'}}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{padding:'48px 0 20px'}}>
        <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--ink-faint)', marginBottom:24, letterSpacing:'0.08em'}}>
          ALL SECTIONS
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14}}>
          {cards.map(c => (
            <button key={c.id} onClick={()=>goTo(c.id)} style={{
              textAlign:'left', background:'var(--bg-card)', border:'1px solid var(--line)',
              borderRadius:14, padding:'22px 20px', cursor:'pointer', color:'var(--ink)',
              transition:'border-color 0.15s',
            }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='var(--climb)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--line)'}
            >
              <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--climb)', marginBottom:10}}>{c.n}</div>
              <div style={{fontFamily:'var(--display)', fontSize:19, fontWeight:600, marginBottom:8}}>{c.t}</div>
              <div style={{fontFamily:'var(--body)', fontSize:13.5, color:'var(--ink-dim)', lineHeight:1.5}}>{c.d}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
window.Overview = Overview;
