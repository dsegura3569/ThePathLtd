function GsiEyebrow({ children, color }) {
  return <div style={{fontFamily:'var(--mono)', fontSize:11.5, color: color || 'var(--ink-faint)', letterSpacing:'0.12em', textTransform:'uppercase'}}>{children}</div>;
}

function GsiStat({ label, value, sub }) {
  return (
    <div style={{padding:'10px 14px', borderLeft:'2px solid var(--accent)', minWidth:110}}>
      <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)', textTransform:'uppercase', letterSpacing:'0.06em'}}>{label}</div>
      <div style={{fontFamily:'var(--display)', fontSize:18, fontWeight:700, color:'var(--ink)', marginTop:2}}>{value}</div>
      {sub && <div style={{fontSize:10.5, color:'var(--ink-faint)', marginTop:1}}>{sub}</div>}
    </div>
  );
}

function GsiChip({ children, tone }) {
  const colors = {confirmed:'#2F7D5A', pending:'#B8792E', accent:'var(--accent)', draft:'#8792A3'};
  const c = colors[tone] || colors.accent;
  return (
    <span style={{
      display:'inline-block', fontFamily:'var(--mono)', fontSize:10, fontWeight:600,
      textTransform:'uppercase', letterSpacing:'0.05em', color:c, background:`${c}14`,
      border:`1px solid ${c}4D`, borderRadius:4, padding:'2px 8px'
    }}>{children}</span>
  );
}

function GsiFolderTab({ code, name, statusLabel }) {
  return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:6}}>
      <div>
        <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--accent)', letterSpacing:'0.1em', marginBottom:6}}>{code}</div>
        <h1 style={{fontFamily:'var(--display)', fontWeight:800, fontSize:'clamp(30px,5vw,44px)', letterSpacing:'-0.01em', margin:0, color:'var(--ink)'}}>{name}</h1>
      </div>
      <div style={{
        fontFamily:'var(--mono)', fontSize:11, letterSpacing:'0.08em', color:'var(--accent)',
        border:'1.5px solid var(--accent)', borderRadius:3, padding:'6px 12px', transform:'rotate(-2deg)',
        textTransform:'uppercase', whiteSpace:'nowrap'
      }}>{statusLabel}</div>
    </div>
  );
}

function nexthinkCheckKey(accountKey, dayId, itemIndex, subIndex) {
  return `nexthink_check_${accountKey}_d${dayId}_i${itemIndex}${subIndex !== undefined ? '_s' + subIndex : ''}`;
}

// Every checkbox key a given day's items (and sub-items) would use --
// shared by the day card (to check if it's fully done) and the plan view
// (to find the next incomplete day), so both stay in sync off one source.
// Keyed on d.id (a permanent, stable identifier) rather than d.n (the
// user-facing "Day N" label, which now reflects true calendar days elapsed
// and can change if the plan's dates are ever adjusted) -- so renumbering
// the display never orphans anyone's already-checked progress.
function nexthinkDayCheckKeys(accountKey, d) {
  const keys = [];
  d.items.forEach((it, i) => {
    keys.push(nexthinkCheckKey(accountKey, d.id, i));
    if (it.subitems) it.subitems.forEach((sub, si) => keys.push(nexthinkCheckKey(accountKey, d.id, i, si)));
  });
  return keys;
}

function nexthinkIsDayComplete(accountKey, d) {
  const keys = nexthinkDayCheckKeys(accountKey, d);
  if (keys.length === 0) return false;
  try {
    return keys.every(k => localStorage.getItem(k) === '1');
  } catch (e) { return false; }
}

function GsiCheckItem({ checkKey, text, indent }) {
  const [checked, setChecked] = React.useState(() => {
    try { return localStorage.getItem(checkKey) === '1'; } catch (e) { return false; }
  });
  function toggle() {
    const next = !checked;
    setChecked(next);
    try { localStorage.setItem(checkKey, next ? '1' : '0'); } catch (e) {}
    window.dispatchEvent(new Event('nexthink-check-change'));
  }
  return (
    <label
      onClick={(e) => e.stopPropagation()}
      style={{
        display:'flex', alignItems:'flex-start', gap:9, cursor:'pointer',
        marginLeft: indent ? 26 : 0, marginBottom:6, fontSize: indent ? 12.5 : 13.5,
      }}>
      <input type="checkbox" checked={checked} onChange={toggle} style={{ marginTop:3, flexShrink:0, cursor:'pointer' }} />
      <span style={{
        color: checked ? 'var(--ink-faint)' : 'var(--ink-dim)',
        textDecoration: checked ? 'line-through' : 'none',
        lineHeight:1.5,
      }}>{text}</span>
    </label>
  );
}

function GsiDayCard({ d, isToday, accountKey }) {
  if (d.items.length === 0) return null;
  const isDraft = d.id >= window.GSI_DRAFT_STARTS_DAY;
  const [complete, setComplete] = React.useState(() => nexthinkIsDayComplete(accountKey, d));
  const [collapsed, setCollapsed] = React.useState(() => nexthinkIsDayComplete(accountKey, d));

  React.useEffect(() => {
    function recompute() {
      const done = nexthinkIsDayComplete(accountKey, d);
      setComplete(done);
      // auto-collapse the moment it becomes complete, but don't fight
      // a manual re-expand -- only auto-collapse on the transition INTO
      // complete, not every time this effect re-runs
      setCollapsed(prevCollapsed => done && !complete ? true : prevCollapsed);
    }
    window.addEventListener('nexthink-check-change', recompute);
    return () => window.removeEventListener('nexthink-check-change', recompute);
  }, [complete]);

  return (
    <div id={`gsi-day-${d.id}`} style={{
      display:'flex', gap:18, padding: collapsed ? '10px 16px' : '14px 16px', borderRadius:6,
      background: isToday ? 'var(--accent-wash)' : complete ? 'var(--accent-wash)' : 'var(--paper-card)',
      border: `1px ${isDraft ? 'dashed' : 'solid'} ${isToday ? 'var(--accent)' : complete ? '#2F7D5A66' : 'var(--line)'}`,
      marginBottom:9, cursor: complete ? 'pointer' : 'default',
    }} onClick={complete ? () => setCollapsed(v => !v) : undefined}>
      <div style={{minWidth:52}}>
        <div style={{fontFamily:'var(--mono)', fontSize:9.5, color:'var(--ink-faint)', letterSpacing:'0.05em'}}>DAY</div>
        <div style={{fontFamily:'var(--display)', fontSize:21, fontWeight:800, color: isToday ? 'var(--accent)' : 'var(--ink)'}}>{d.n}</div>
        <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)', marginTop:1}}>{d.date}</div>
      </div>
      <div style={{flex:1}}>
        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom: collapsed ? 0 : 6}}>
          {d.tag && <GsiChip tone={isDraft ? 'draft' : 'accent'}>{d.tag}</GsiChip>}
          {complete && <GsiChip tone="confirmed">&#10003; Done{collapsed ? ' \u2014 tap to expand' : ''}</GsiChip>}
        </div>
        {!collapsed && (
          <div>
            {d.items.map((it, i) => (
              <div key={i}>
                <GsiCheckItem checkKey={nexthinkCheckKey(accountKey, d.id, i)} text={it.text.replace('[DRAFT] ', '')} />
                {it.subitems && it.subitems.map((sub, si) => (
                  <GsiCheckItem key={si} checkKey={nexthinkCheckKey(accountKey, d.id, i, si)} text={sub} indent />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function nexthinkPeriodProgress(accountKey, days, startDay, endDay) {
  const periodDays = days.filter(d => d.n >= startDay && d.n <= endDay);
  let total = 0, checked = 0;
  periodDays.forEach(d => {
    const keys = nexthinkDayCheckKeys(accountKey, d);
    total += keys.length;
    try {
      checked += keys.filter(k => localStorage.getItem(k) === '1').length;
    } catch (e) {}
  });
  return { total, checked, firstDay: periodDays[0] || null };
}

function GsiPeriodCard({ label, startDay, endDay, accountKey, days }) {
  const { total, checked, firstDay } = nexthinkPeriodProgress(accountKey, days, startDay, endDay);
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
  const complete = total > 0 && checked === total;

  function jump() {
    if (!firstDay) return;
    const el = document.getElementById(`gsi-day-${firstDay.id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (total === 0) return null;

  return (
    <button onClick={jump} style={{
      textAlign:'left', background:'var(--paper-card)', border:`1px solid ${complete ? '#2F7D5A66' : 'var(--line)'}`,
      borderRadius:8, padding:'14px 16px', cursor:'pointer', flex:'1 1 180px', minWidth:160,
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8}}>
        <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', textTransform:'uppercase', letterSpacing:'0.05em'}}>{label}</div>
        {complete && <span style={{fontSize:11, color:'#2F7D5A'}}>&#10003;</span>}
      </div>
      <div style={{height:7, borderRadius:4, background:'var(--line)', overflow:'hidden', marginBottom:8}}>
        <div style={{height:'100%', width:`${pct}%`, background: complete ? '#2F7D5A' : 'var(--accent)', borderRadius:4, transition:'width 0.2s ease'}} />
      </div>
      <div style={{fontFamily:'var(--display)', fontSize:15, fontWeight:700, color:'var(--ink)'}}>{checked} / {total}</div>
      <div style={{fontSize:11, color:'var(--ink-faint)'}}>{pct}% done</div>
    </button>
  );
}

function GsiPlanView({ accountKey }) {
  const days = window.GSI_DAYS
    .map(d => ({...d, items: d.items.filter(it => it.t === 'shared' || it.t === accountKey).map(it=>it)}))
    .filter(d => d.items.length > 0);
  const weeks = Array.from({length: 12}, (_, i) => i + 1);
  const today = new Date();
  const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  function parseDay(dateStr){
    const parts = dateStr.split(' ');
    const year = months[parts[1]] <= 1 ? 2027 : 2026; // Jan/Feb entries roll into the next year
    return new Date(year, months[parts[1]], parseInt(parts[2],10));
  }

  const [, forceTick] = React.useState(0);
  React.useEffect(() => {
    function recompute() { forceTick(v => v + 1); }
    window.addEventListener('nexthink-check-change', recompute);
    return () => window.removeEventListener('nexthink-check-change', recompute);
  }, []);

  const nextIncomplete = days.find(d => !nexthinkIsDayComplete(accountKey, d));
  const allComplete = !nextIncomplete;

  function jumpToNext() {
    if (!nextIncomplete) return;
    const el = document.getElementById(`gsi-day-${nextIncomplete.id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div>
      <div style={{background:'var(--paper-card)', border:'1px dashed var(--line)', borderRadius:6, padding:'12px 15px', marginBottom:14, fontSize:12.5, color:'var(--ink-faint)'}}>
        Days 1&ndash;30 are the real onboarding plan. Days 31&ndash;90 (marked <GsiChip tone="draft">draft</GsiChip>) are a template continuation using standard milestones &mdash; not verified, edit freely as the real specifics firm up.
      </div>

      <div style={{display:'flex', gap:12, flexWrap:'wrap', marginBottom:22}}>
        <GsiPeriodCard label="Days 1-30" startDay={1} endDay={30} accountKey={accountKey} days={days} />
        <GsiPeriodCard label="Days 31-60" startDay={31} endDay={60} accountKey={accountKey} days={days} />
        <GsiPeriodCard label="Days 61-90" startDay={61} endDay={90} accountKey={accountKey} days={days} />
      </div>

      <div style={{marginBottom:22}}>
        {allComplete ? (
          <div style={{fontSize:13, color:'#2F7D5A', fontWeight:600}}>&#10003; Everything on this plan is checked off.</div>
        ) : (
          <button onClick={jumpToNext} style={{
            fontFamily:'var(--mono)', fontSize:12, fontWeight:600, padding:'8px 14px', borderRadius:6,
            border:'1px solid var(--accent)66', background:'var(--accent-wash)', color:'var(--accent)', cursor:'pointer',
          }}>&darr; Jump to Day {nextIncomplete.n} (next incomplete)</button>
        )}
      </div>

      {weeks.map(w=>{
        const weekDays = days.filter(d=>d.week===w);
        if (weekDays.length===0) return null;
        return (
          <div key={w} style={{marginBottom:24}}>
            <GsiEyebrow>WEEK {w} &mdash; {window.GSI_WEEK_LABELS[w]}</GsiEyebrow>
            <div style={{marginTop:10}}>
              {weekDays.map(d=>{
                const isToday = parseDay(d.date).toDateString() === today.toDateString();
                return <GsiDayCard key={d.id} d={d} isToday={isToday} accountKey={accountKey} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GsiStakeholderCard({ s, tone }){
  return (
    <div style={{background:'var(--paper-card)', border:'1px solid var(--line)', borderRadius:6, padding:'15px 17px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:7}}>
        <div style={{fontFamily:'var(--display)', fontWeight:700, fontSize:16, color:'var(--ink)'}}>{s.name}</div>
        <GsiChip tone={tone}>{tone === 'confirmed' ? 'Confirmed' : 'Pending'}</GsiChip>
      </div>
      <div style={{fontSize:12, color:'var(--ink-dim)', marginBottom:7}}>{s.title}</div>
      <div style={{fontSize:12, color:'var(--ink-faint)', lineHeight:1.6, marginBottom: s.linkedin ? 9 : 0}}>{s.note}</div>
      {s.linkedin && (
        <a href={s.linkedin} target="_blank" rel="noopener noreferrer" style={{
          display:'inline-block', fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)',
          border:'1px solid var(--accent)66', borderRadius:4, padding:'4px 9px', textDecoration:'none'
        }}>LinkedIn &#8599;</a>
      )}
    </div>
  );
}

function GsiStakeholderView({ accountKey }) {
  const data = window.GSI_STAKEHOLDERS[accountKey];
  if (data.confirmed.length === 0 && data.pending.length === 0) {
    return (
      <div style={{
        border:'1px dashed var(--line)', borderRadius:6, padding:'28px 20px',
        textAlign:'center', color:'var(--ink-faint)', fontSize:13.5
      }}>
        No stakeholders documented yet for this account. Nothing verified from the Michael McCrum calls so far, this section fills in as contacts surface.
      </div>
    );
  }
  return (
    <div>
      {data.confirmed.length > 0 && (
        <div style={{marginBottom:24}}>
          <GsiEyebrow color="#2F7D5A">CONFIRMED</GsiEyebrow>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px,1fr))', gap:11, marginTop:10}}>
            {data.confirmed.map(s=>(<GsiStakeholderCard key={s.name} s={s} tone="confirmed" />))}
          </div>
        </div>
      )}
      {data.pending.length > 0 && (
        <div>
          <GsiEyebrow color="#B8792E">CONFIRM DIRECTLY BEFORE USING</GsiEyebrow>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px,1fr))', gap:11, marginTop:10}}>
            {data.pending.map(s=>(<GsiStakeholderCard key={s.name} s={s} tone="pending" />))}
          </div>
        </div>
      )}
    </div>
  );
}

window.GsiEyebrow = GsiEyebrow;
window.GsiStat = GsiStat;
window.GsiChip = GsiChip;
window.GsiFolderTab = GsiFolderTab;
window.GsiPlanView = GsiPlanView;
window.GsiStakeholderView = GsiStakeholderView;
