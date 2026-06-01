import { useState } from 'react';
import NavBar from './NavBar';
import { scanNow, markSkippedAsReviewed } from '../api';

export default function OptionsPage({ onBack }) {
  const [syncState,   setSyncState]   = useState('idle');   // idle | running | done | error
  const [syncResult,  setSyncResult]  = useState(null);
  const [markState,   setMarkState]   = useState('idle');
  const [markResult,  setMarkResult]  = useState(null);

  async function handleSync() {
    setSyncState('running');
    setSyncResult(null);
    try {
      const r = await scanNow();
      setSyncResult(`Found ${r.found} movies — ${r.added} new added to queue.`);
      setSyncState('done');
    } catch (err) {
      setSyncResult(err.message);
      setSyncState('error');
    }
  }

  async function handleMarkSkipped() {
    setMarkState('running');
    setMarkResult(null);
    try {
      const r = await markSkippedAsReviewed();
      setMarkResult(`${r.updated} skipped movie${r.updated !== 1 ? 's' : ''} marked as reviewed.`);
      setMarkState('done');
    } catch (err) {
      setMarkResult(err.message);
      setMarkState('error');
    }
  }

  return (
    <div style={s.page}>
      <NavBar title="Options" onBack={onBack} backLabel="Home" crumbs={['Home', 'Options']} />

      <div style={s.body}>
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
      </div>
    </div>
  );
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
