import { useState } from 'react';
import NavBar from './NavBar';
import { scanNow, markSkippedAsReviewed, scanTvNow, markTvSkippedAsReviewed, sync4kArtwork } from '../api';

export default function OptionsPage({ onBack }) {
  const [syncState,     setSyncState]     = useState('idle');
  const [syncResult,    setSyncResult]    = useState(null);
  const [markState,     setMarkState]     = useState('idle');
  const [markResult,    setMarkResult]    = useState(null);
  const [sync4kState,   setSync4kState]   = useState('idle');
  const [sync4kResult,  setSync4kResult]  = useState(null);
  const [sync4kDetail,  setSync4kDetail]  = useState(null);
  const [tvSyncState,   setTvSyncState]   = useState('idle');
  const [tvSyncResult,  setTvSyncResult]  = useState(null);
  const [tvMarkState,   setTvMarkState]   = useState('idle');
  const [tvMarkResult,  setTvMarkResult]  = useState(null);

  async function handleSync() {
    setSyncState('running'); setSyncResult(null);
    try {
      const r = await scanNow();
      const parts = [`${r.found} found`, `${r.added} new`];
      if (r.removed > 0) parts.push(`${r.removed} removed`);
      setSyncResult(`Movies: ${parts.join(', ')}.`);
      setSyncState('done');
    } catch (err) { setSyncResult(err.message); setSyncState('error'); }
  }

  async function handleMarkSkipped() {
    setMarkState('running'); setMarkResult(null);
    try {
      const r = await markSkippedAsReviewed();
      setMarkResult(`${r.updated} skipped movie${r.updated !== 1 ? 's' : ''} marked as reviewed.`);
      setMarkState('done');
    } catch (err) { setMarkResult(err.message); setMarkState('error'); }
  }

  async function handleSync4k() {
    setSync4kState('running'); setSync4kResult(null); setSync4kDetail(null);
    try {
      const r = await sync4kArtwork();
      const parts = [`${r.matched} matched`, `${r.copied} files copied`];
      if (r.pending   > 0) parts.push(`${r.pending} skipped (pending review)`);
      if (r.unmatched.length > 0) parts.push(`${r.unmatched.length} unmatched`);
      setSync4kResult(`${parts.join(', ')}.`);
      setSync4kDetail(r.unmatched.length > 0 ? r.unmatched : null);
      setSync4kState('done');
    } catch (err) { setSync4kResult(err.message); setSync4kState('error'); }
  }

  async function handleTvSync() {
    setTvSyncState('running'); setTvSyncResult(null);
    try {
      const r = await scanTvNow();
      const parts = [`${r.found} found`, `${r.added} new`];
      if (r.removed > 0) parts.push(`${r.removed} removed`);
      if (r.reset   > 0) parts.push(`${r.reset} reset to pending (new seasons)`);
      setTvSyncResult(`TV shows: ${parts.join(', ')}.`);
      setTvSyncState('done');
    } catch (err) { setTvSyncResult(err.message); setTvSyncState('error'); }
  }

  async function handleTvMarkSkipped() {
    setTvMarkState('running'); setTvMarkResult(null);
    try {
      const r = await markTvSkippedAsReviewed();
      setTvMarkResult(`${r.updated} skipped show${r.updated !== 1 ? 's' : ''} marked as reviewed.`);
      setTvMarkState('done');
    } catch (err) { setTvMarkResult(err.message); setTvMarkState('error'); }
  }

  return (
    <div style={s.page}>
      <NavBar title="Options" onBack={onBack} backLabel="Home" crumbs={['Home', 'Options']} />

      <div style={s.body}>
        <SectionLabel>Movies</SectionLabel>

        <OptionCard
          title="Force Library Sync"
          desc="Rescan the movie directory for new NFO files and add any new movies to the review queue. Existing movies and their review status are not affected."
          action="Sync Now"
          state={syncState}
          result={syncResult}
          onAction={handleSync}
        />
        <OptionCard
          title="Sync 4k Versions"
          desc="Matches folders in your 4K movie directory to your regular library by name and copies artwork (poster, backdrop, clearlogo) into each matching 4K folder."
          action="Sync Now"
          state={sync4kState}
          result={sync4kResult}
          detail={sync4kDetail}
          onAction={handleSync4k}
        />
        <OptionCard
          title="Mark Skipped as Reviewed"
          desc="Moves all movies currently marked as skipped into the reviewed state, removing them from the pending queue."
          action="Apply"
          state={markState}
          result={markResult}
          onAction={handleMarkSkipped}
          danger
        />

        <SectionLabel>TV Shows</SectionLabel>

        <OptionCard
          title="Force TV Library Sync"
          desc="Rescan the TV show directory for new shows and seasons. New shows are added to the queue; shows with new seasons are reset to pending."
          action="Sync Now"
          state={tvSyncState}
          result={tvSyncResult}
          onAction={handleTvSync}
        />
        <OptionCard
          title="Mark Skipped as Reviewed"
          desc="Moves all TV shows currently marked as skipped into the reviewed state, removing them from the pending queue."
          action="Apply"
          state={tvMarkState}
          result={tvMarkResult}
          onAction={handleTvMarkSkipped}
          danger
        />
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={s.sectionLabel}>{children}</div>;
}

function OptionCard({ title, desc, action, state, result, detail, onAction, danger }) {
  const [showDetail, setShowDetail] = useState(false);
  const running = state === 'running';
  const btnColor = danger ? '#7c2d12' : '#1e3a5f';
  const btnTextColor = danger ? '#fca5a5' : '#93c5fd';

  return (
    <div style={s.card}>
      <div style={s.cardBody}>
        <h2 style={s.cardTitle}>{title}</h2>
        <p style={s.cardDesc}>{desc}</p>
      </div>
      <div style={s.cardFooter}>
        <button
          onClick={onAction}
          disabled={running}
          style={{ ...s.actionBtn, background: btnColor, color: btnTextColor }}
        >
          {running ? 'Working…' : action}
        </button>
        {result && (
          <span style={{ ...s.result, color: state === 'error' ? '#f87171' : '#4caf7d' }}>
            {result}
            {detail && (
              <button onClick={() => setShowDetail(v => !v)} style={s.detailToggle}>
                {showDetail ? 'hide' : 'show unmatched'}
              </button>
            )}
          </span>
        )}
      </div>
      {detail && showDetail && (
        <ul style={s.detailList}>
          {detail.map(name => <li key={name} style={s.detailItem}>{name}</li>)}
        </ul>
      )}
    </div>
  );
}

const s = {
  page: { display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  body: { padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640, margin: '0 auto', width: '100%' },
  sectionLabel: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: '#6060a0',
    borderBottom: '1px solid #1e1e38', paddingBottom: 8, marginTop: 8,
  },
  card: {
    background: '#13132a', border: '1px solid #252540', borderRadius: 10,
    padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16,
  },
  cardBody:  { display: 'flex', flexDirection: 'column', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#e0e0ff' },
  cardDesc:  { fontSize: 14, color: '#777', lineHeight: 1.55 },
  cardFooter:{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  actionBtn: { padding: '8px 20px', fontSize: 13, flexShrink: 0 },
  result:      { fontSize: 13 },
  detailToggle:{ marginLeft: 10, fontSize: 12, background: 'none', border: 'none', color: '#6060a0', cursor: 'pointer', textDecoration: 'underline', padding: 0 },
  detailList:  { margin: '4px 0 0', padding: '0 0 0 20px', listStyle: 'disc' },
  detailItem:  { fontSize: 12, color: '#888', lineHeight: 1.7 },
};
