export default function ReviewerNav({ stats, scanning, onScan, onBack, backLabel, crumbs = [] }) {
  return (
    <header style={s.bar}>
      <div style={s.topRow}>
        <div style={s.left}>
          {onBack && (
            <button onClick={onBack} style={s.backBtn}>← {backLabel ?? 'Home'}</button>
          )}
          <span className="nav-appname" style={s.appName}>Movie Artwork Reviewer</span>
        </div>
        <button onClick={onScan} disabled={scanning} style={s.scanBtn}>
          {scanning ? '↻ …' : '↻ Scan'}
        </button>
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

      {stats && (
        <div style={s.statsRow}>
          <Pill label="Pending"  value={stats.pending}  color="#e2a52a" />
          <Pill label="Reviewed" value={stats.reviewed} color="#4caf7d" />
          <Pill label="Skipped"  value={stats.skipped}  color="#7a7a9a" />
          <Pill label="Total"    value={stats.total}    color="#555" />
        </div>
      )}
    </header>
  );
}

function Pill({ label, value, color }) {
  return (
    <div style={s.pill}>
      <span style={{ ...s.pillVal, color }}>{value}</span>
      <span style={s.pillLbl}>{label}</span>
    </div>
  );
}

const s = {
  bar: {
    background: '#13132a', borderBottom: '1px solid #252540',
    padding: '10px 16px', display: 'flex', flexDirection: 'column',
    gap: 6, flexShrink: 0,
  },
  topRow:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  left:       { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' },
  appName:    { fontWeight: 700, fontSize: 14, color: '#b0b0d0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  backBtn:    { background: '#1e1e38', color: '#9090b0', padding: '6px 14px', fontSize: 13, flexShrink: 0 },
  scanBtn:    { background: '#252540', color: '#a0a0c0', padding: '7px 14px', fontSize: 13, flexShrink: 0 },
  breadcrumb: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', paddingLeft: 2 },
  sep:        { color: '#333', margin: '0 2px' },
  crumbPast:  { fontSize: 11, color: '#555' },
  crumbActive:{ fontSize: 11, color: '#8080a0', fontWeight: 600 },
  statsRow:   { display: 'flex', gap: 20, paddingLeft: 2 },
  pill:       { display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2, minWidth: 40 },
  pillVal:    { fontSize: 16, fontWeight: 700 },
  pillLbl:    { fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' },
};
