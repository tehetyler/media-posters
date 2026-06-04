import { useState } from 'react';
import NavBar from './NavBar';
import { scanNow, markSkippedAsReviewed, scanTvNow, markTvSkippedAsReviewed } from '../api';

export default function OptionsPage({ onBack }) {
  const [syncState,     setSyncState]     = useState('idle');
  const [syncResult,    setSyncResult]    = useState(null);
  const [markState,     setMarkState]     = useState('idle');
  const [markResult,    setMarkResult]    = useState(null);
  const [tvSyncState,   setTvSyncState]   = useState('idle');
  const [tvSyncResult,  setTvSyncResult]  = useState(null);
  const [tvMarkState,   setTvMarkState]   = useState('idle');
  const [tvMarkResult,  setTvMarkResult]  = useState(null);

  async function handleSync() {
    setSyncState('running'); setSyncResult(null);
    try {
      const r = await scanNow();
      setSyncResult(`Found ${r.found} movies — ${r.added} new added to queue.`);
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

  async function handleTvSync() {
    setTvSyncState('running'); setTvSyncResult(null);
    try {
      const r = await scanTvNow();
      setTvSyncResult(`Found ${r.found} shows — ${r.added} new added to queue.`);
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

function OptionCard({ title, desc, action, state, result, onAction, danger }) {
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
          </span>
        )}
      </div>
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
  result:    { fontSize: 13 },
};
