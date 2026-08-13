function SectionHeader({ eyebrow, title, sub }) {
  return (
    <div style={{marginBottom:24}}>
      <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--climb)', letterSpacing:'0.08em', marginBottom:8}}>{eyebrow}</div>
      <h2 style={{fontFamily:'var(--display)', fontWeight:700, fontSize:'clamp(28px,5vw,38px)', letterSpacing:'-0.01em', margin:'0 0 8px'}}>{title}</h2>
      {sub && <p style={{fontFamily:'var(--body)', fontSize:13.5, color:'var(--ink-dim)', margin:0, lineHeight:1.6}} dangerouslySetInnerHTML={{__html: sub}} />}
    </div>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{background:'var(--bg-raised)', borderRadius:10, padding:'11px 12px'}}>
      <div style={{fontSize:10, color:'var(--ink-faint)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.04em'}}>{label}</div>
      <div style={{fontSize:16, fontWeight:600, color: color || 'var(--ink)', fontFamily:'var(--display)', marginTop:3}}>{value}</div>
      {sub && <div style={{fontSize:10, color:'var(--ink-faint)', marginTop:2}}>{sub}</div>}
    </div>
  );
}

function SmallLabel({ children, color }) {
  return (
    <div style={{fontSize:11, fontWeight:600, color: color || 'var(--ink-dim)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:'var(--mono)'}}>
      {children}
    </div>
  );
}

window.SectionHeader = SectionHeader;
window.StatBox = StatBox;
window.SmallLabel = SmallLabel;
