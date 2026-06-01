export default function NavBar({ title, onBack, backLabel = 'Back', right, crumbs = [] }) {
  return (
    <header style={s.header}>
      <div style={s.bar}>
        <div style={s.left}>
          {onBack && (
            <button onClick={onBack} style={s.backBtn}>← {backLabel}</button>
          )}
          <span style={s.title}>{title}</span>
        </div>
        {right && <div style={s.right}>{right}</div>}
      </div>

      {crumbs.length > 0 && (
        <div style={s.breadcrumb}>
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && <span style={s.sep}> › </span>}
              <span style={i === crumbs.length - 1 ? s.crumbActive : s.crumbPast}>{c}</span>
            </span>
          ))}
        </div>
      )}
    </header>
  );
}

const s = {
  header: { background: '#13132a', borderBottom: '1px solid #252540', flexShrink: 0 },
  bar: {
    padding: '0 20px', height: 52,
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
  },
  left:       { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
  title:      { fontWeight: 700, fontSize: 15, color: '#b0b0d0', whiteSpace: 'nowrap' },
  backBtn:    { background: '#1e1e38', color: '#9090b0', padding: '6px 14px', fontSize: 13, flexShrink: 0 },
  right:      { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  breadcrumb: { padding: '4px 20px 8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' },
  sep:        { color: '#333', margin: '0 2px' },
  crumbPast:  { fontSize: 11, color: '#555' },
  crumbActive:{ fontSize: 11, color: '#8080a0', fontWeight: 600 },
};
