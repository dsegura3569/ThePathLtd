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

function nexthinkCheckKey(accountKey, dayNum, itemIndex, subIndex) {
  return `nexthink_check_${accountKey}_d${dayNum}_i${itemIndex}${subIndex !== undefined ? '_s' + subIndex : ''}`;
}

function GsiCheckItem({ checkKey, text, indent }) {
  const [checked, setChecked] = React.useState(() => {
    try { return localStorage.getItem(checkKey) === '1'; } catch (e) { return false; }
  });
  function toggle() {
    const next = !checked;
    setChecked(next);
    try { localStorage.setItem(checkKey, next ? '1' : '0'); } catch (e) {}
  }
  return (
    <label style={{
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
  const isDraft = d.n >= window.GSI_DRAFT_STARTS_DAY;
  return (
    <div style={{
      display:'flex', gap:18, padding:'14px 16px', borderRadius:6,
      background: isToday ? 'var(--accent-wash)' : 'var(--paper-card)',
      border: `1px ${isDraft ? 'dashed' : 'solid'} ${isToday ? 'var(--accent)' : 'var(--line)'}`,
      marginBottom:9
    }}>
      <div style={{minWidth:52}}>
        <div style={{fontFamily:'var(--mono)', fontSize:9.5, color:'var(--ink-faint)', letterSpacing:'0.05em'}}>DAY</div>
        <div style={{fontFamily:'var(--display)', fontSize:21, fontWeight:800, color: isToday ? 'var(--accent)' : 'var(--ink)'}}>{d.n}</div>
        <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)', marginTop:1}}>{d.date}</div>
      </div>
      <div style={{flex:1}}>
        {d.tag && <div style={{marginBottom:6}}><GsiChip tone={isDraft ? 'draft' : 'accent'}>{d.tag}</GsiChip></div>}
        <div>
          {d.items.map((it, i) => (
            <div key={i}>
              <GsiCheckItem checkKey={nexthinkCheckKey(accountKey, d.n, i)} text={it.text.replace('[DRAFT] ', '')} />
              {it.subitems && it.subitems.map((sub, si) => (
                <GsiCheckItem key={si} checkKey={nexthinkCheckKey(accountKey, d.n, i, si)} text={sub} indent />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GsiPlanView({ accountKey }) {
  const days = window.GSI_DAYS
    .map(d => ({...d, items: d.items.filter(it => it.t === 'shared' || it.t === accountKey).map(it=>it)}))
  const weeks = Array.from({length: 12}, (_, i) => i + 1);
  const today = new Date();
  const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  function parseDay(dateStr){
    const parts = dateStr.split(' ');
    const year = months[parts[1]] <= 1 ? 2027 : 2026; // Jan/Feb entries roll into the next year
    return new Date(year, months[parts[1]], parseInt(parts[2],10));
  }
  return (
    <div>
      <div style={{background:'var(--paper-card)', border:'1px dashed var(--line)', borderRadius:6, padding:'12px 15px', marginBottom:22, fontSize:12.5, color:'var(--ink-faint)'}}>
        Days 1&ndash;30 are the real onboarding plan. Days 31&ndash;90 (marked <GsiChip tone="draft">draft</GsiChip>) are a template continuation using standard milestones &mdash; not verified, edit freely as the real specifics firm up.
      </div>
      {weeks.map(w=>{
        const weekDays = days.filter(d=>d.week===w && d.items.length>0);
        if (weekDays.length===0) return null;
        return (
          <div key={w} style={{marginBottom:24}}>
            <GsiEyebrow>WEEK {w} &mdash; {window.GSI_WEEK_LABELS[w]}</GsiEyebrow>
            <div style={{marginTop:10}}>
              {weekDays.map(d=>{
                const isToday = parseDay(d.date).toDateString() === today.toDateString();
                return <GsiDayCard key={d.n} d={d} isToday={isToday} accountKey={accountKey} />;
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
