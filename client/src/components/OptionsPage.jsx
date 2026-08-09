import { useState, useEffect, useCallback } from 'react';
import NavBar from './NavBar';
import {
  scanNow, markSkippedAsReviewed, markSkippedAsPending,
  scanTvNow, markTvSkippedAsReviewed, markTvSkippedAsPending, sync4kArtwork,
  fetchLibraries, createLibrary, updateLibrary, removeLibrary,
} from '../api';

export default function OptionsPage({ onBack }) {
  const [syncState,     setSyncState]     = useState('idle');
  const [syncResult,    setSyncResult]    = useState(null);
  const [syncDetail,    setSyncDetail]    = useState(null);
  const [markState,     setMarkState]     = useState('idle');
  const [markResult,    setMarkResult]    = useState(null);
  const [sync4kState,   setSync4kState]   = useState('idle');
  const [sync4kResult,  setSync4kResult]  = useState(null);
  const [sync4kDetail,  setSync4kDetail]  = useState(null);
  const [tvSyncState,   setTvSyncState]   = useState('idle');
  const [tvSyncResult,  setTvSyncResult]  = useState(null);
  const [tvSyncDetail,  setTvSyncDetail]  = useState(null);
  const [tvMarkState,   setTvMarkState]   = useState('idle');
  const [tvMarkResult,  setTvMarkResult]  = useState(null);

  async function handleSync() {
    setSyncState('running'); setSyncResult(null); setSyncDetail(null);
    try {
      const r = await scanNow();
      const parts = [`${r.found} found`, `${r.added} new`];
      if (r.removed > 0) parts.push(`${r.removed} removed`);
      if (r.failed?.length > 0) parts.push(`${r.failed.length} directory unreadable`);
      setSyncResult(`Movies: ${parts.join(', ')}.`);
      setSyncDetail(failureDetail(r.failed));
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

  async function handleMarkSkippedPending() {
    setMarkState('running'); setMarkResult(null);
    try {
      const r = await markSkippedAsPending();
      setMarkResult(`${r.updated} skipped movie${r.updated !== 1 ? 's' : ''} restored to queue.`);
      setMarkState('done');
    } catch (err) { setMarkResult(err.message); setMarkState('error'); }
  }

  async function handleSync4k() {
    setSync4kState('running'); setSync4kResult(null); setSync4kDetail(null);
    try {
      const { totals, libraries } = await sync4kArtwork();
      const parts = [`${totals.matched} matched`, `${totals.copied} files copied`];
      if (totals.pending   > 0) parts.push(`${totals.pending} skipped (pending review)`);
      if (totals.unmatched > 0) parts.push(`${totals.unmatched} unmatched`);
      setSync4kResult(`${parts.join(', ')}.`);
      const unmatched = libraries.flatMap(l => l.unmatched.map(name => `${l.name}: ${name}`));
      setSync4kDetail(unmatched.length > 0 ? unmatched : null);
      setSync4kState('done');
    } catch (err) { setSync4kResult(err.message); setSync4kState('error'); }
  }

  async function handleTvSync() {
    setTvSyncState('running'); setTvSyncResult(null); setTvSyncDetail(null);
    try {
      const r = await scanTvNow();
      const parts = [`${r.found} found`, `${r.added} new`];
      if (r.removed > 0) parts.push(`${r.removed} removed`);
      if (r.reset   > 0) parts.push(`${r.reset} reset to pending (new seasons)`);
      if (r.failed?.length > 0) parts.push(`${r.failed.length} directory unreadable`);
      setTvSyncResult(`TV shows: ${parts.join(', ')}.`);
      setTvSyncDetail(failureDetail(r.failed));
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

  async function handleTvMarkSkippedPending() {
    setTvMarkState('running'); setTvMarkResult(null);
    try {
      const r = await markTvSkippedAsPending();
      setTvMarkResult(`${r.updated} skipped show${r.updated !== 1 ? 's' : ''} restored to queue.`);
      setTvMarkState('done');
    } catch (err) { setTvMarkResult(err.message); setTvMarkState('error'); }
  }

  return (
    <div style={s.page}>
      <NavBar title="Options" onBack={onBack} backLabel="Home" crumbs={['Home', 'Options']} />

      <div style={s.body}>
        <LibrariesSection />

        <SectionLabel>Movies</SectionLabel>

        <OptionCard
          title="Force Library Sync"
          desc="Rescan every movie directory for new NFO files and add any new movies to the review queue. Existing movies and their review status are not affected."
          action="Sync Now"
          state={syncState}
          result={syncResult}
          detail={syncDetail}
          detailLabel="show warnings"
          onAction={handleSync}
        />
        <OptionCard
          title="Sync 4k Versions"
          desc="For each movie library with a 4K directory, matches folders by name and copies artwork (poster, backdrop, clearlogo) into each matching 4K folder."
          action="Sync Now"
          state={sync4kState}
          result={sync4kResult}
          detail={sync4kDetail}
          onAction={handleSync4k}
        />
        <OptionCard
          title="Mark Skipped as Reviewed"
          desc="Moves all skipped movies into the reviewed state, or restores them to the pending queue."
          action="Mark as Reviewed"
          secondAction="Restore to Queue"
          state={markState}
          result={markResult}
          onAction={handleMarkSkipped}
          onSecondAction={handleMarkSkippedPending}
          danger
        />

        <SectionLabel>TV Shows</SectionLabel>

        <OptionCard
          title="Force TV Library Sync"
          desc="Rescan every TV directory for new shows and seasons. New shows are added to the queue; shows with new seasons are reset to pending."
          action="Sync Now"
          state={tvSyncState}
          result={tvSyncResult}
          detail={tvSyncDetail}
          detailLabel="show warnings"
          onAction={handleTvSync}
        />
        <OptionCard
          title="Mark Skipped as Reviewed"
          desc="Moves all skipped TV shows into the reviewed state, or restores them to the pending queue."
          action="Mark as Reviewed"
          secondAction="Restore to Queue"
          state={tvMarkState}
          result={tvMarkResult}
          onAction={handleTvMarkSkipped}
          onSecondAction={handleTvMarkSkippedPending}
          danger
        />
      </div>
    </div>
  );
}

function failureDetail(failed) {
  if (!failed?.length) return null;
  return failed.map(f => `Could not read ${f.name} (${f.path}) — skipped, nothing removed`);
}

// ── Library directories ───────────────────────────────────────────────────────

function LibrariesSection() {
  const [data,        setData]        = useState(null);
  const [error,       setError]       = useState(null);
  const [showRemoved, setShowRemoved] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await fetchLibraries());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) {
    return (
      <>
        <SectionLabel>Libraries</SectionLabel>
        <div style={s.card}><p style={s.cardDesc}>{error ?? 'Loading directories…'}</p></div>
      </>
    );
  }

  const active  = data.libraries.filter(l => l.enabled);
  const removed = data.libraries.filter(l => !l.enabled);
  const untaggedTotal = data.untagged.movies + data.untagged.shows;

  return (
    <>
      <SectionLabel>Libraries</SectionLabel>

      <LibraryKindCard
        kind="movie"
        title="Movie Directories"
        desc="Every directory scanned for movie NFO files. Each can have its own 4K directory used by Sync 4k Versions."
        libraries={active.filter(l => l.kind === 'movie')}
        onChanged={load}
      />
      <LibraryKindCard
        kind="tv"
        title="TV Directories"
        desc="Every directory scanned for TV show folders."
        libraries={active.filter(l => l.kind === 'tv')}
        onChanged={load}
      />

      {removed.length > 0 && (
        <div style={s.card}>
          <div style={s.cardBody}>
            <h2 style={s.cardTitle}>Removed Directories</h2>
            <p style={s.cardDesc}>
              These are hidden from the queue, libraries, and stats, but their review history is
              still stored. Restoring a directory brings every item back exactly as it was.
            </p>
          </div>
          <button onClick={() => setShowRemoved(v => !v)} style={s.linkBtn}>
            {showRemoved ? 'Hide' : `Show ${removed.length} removed director${removed.length === 1 ? 'y' : 'ies'}`}
          </button>
          {showRemoved && removed.map(lib => (
            <LibraryRow key={lib.id} lib={lib} onChanged={load} />
          ))}
        </div>
      )}

      {untaggedTotal > 0 && (
        <div style={s.card}>
          <div style={s.cardBody}>
            <h2 style={s.cardTitle}>Items Outside Every Directory</h2>
            <p style={s.cardDesc}>
              {data.untagged.movies} movie{data.untagged.movies !== 1 ? 's' : ''} and{' '}
              {data.untagged.shows} show{data.untagged.shows !== 1 ? 's' : ''} have a folder that
              no longer sits under any configured directory. They keep their review status and stay
              visible, and are never removed by a scan. Add the directory that contains them to
              bring them back under management.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function LibraryKindCard({ kind, title, desc, libraries, onChanged }) {
  const [adding, setAdding] = useState(false);

  return (
    <div style={s.card}>
      <div style={s.cardBody}>
        <h2 style={s.cardTitle}>{title}</h2>
        <p style={s.cardDesc}>{desc}</p>
      </div>

      {libraries.length === 0
        ? <p style={s.emptyNote}>No directories configured — nothing will be scanned.</p>
        : libraries.map(lib => <LibraryRow key={lib.id} lib={lib} onChanged={onChanged} />)}

      {adding
        ? <LibraryForm
            kind={kind}
            onCancel={() => setAdding(false)}
            onDone={() => { setAdding(false); onChanged(); }}
          />
        : <button onClick={() => setAdding(true)} style={s.addBtn}>+ Add directory</button>}
    </div>
  );
}

function LibraryRow({ lib, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState(null);

  async function run(fn) {
    setBusy(true); setError(null);
    try { await fn(); onChanged(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (editing) {
    return (
      <LibraryForm
        kind={lib.kind}
        lib={lib}
        onCancel={() => setEditing(false)}
        onDone={() => { setEditing(false); onChanged(); }}
      />
    );
  }

  return (
    <div style={s.libRow}>
      <div style={s.libInfo}>
        <div style={s.libNameRow}>
          <span style={s.libName}>{lib.name}</span>
          <span style={s.libCount}>
            {lib.itemCount} item{lib.itemCount !== 1 ? 's' : ''}
          </span>
        </div>
        <span style={s.libPath}>{lib.path}</span>
        {lib.kind === 'movie' && (
          <span style={s.libPath4k}>
            4K: {lib.path_4k || <span style={{ color: '#444' }}>not set</span>}
          </span>
        )}
        {error && <span style={s.libError}>{error}</span>}
      </div>
      <div style={s.libActions}>
        {lib.enabled ? (
          <>
            <button onClick={() => setEditing(true)} disabled={busy} style={s.smallBtn}>Edit</button>
            <button
              onClick={() => run(() => removeLibrary(lib.id))}
              disabled={busy}
              style={{ ...s.smallBtn, background: '#3a1a1a', color: '#fca5a5' }}
            >
              Remove
            </button>
          </>
        ) : (
          <button
            onClick={() => run(() => updateLibrary(lib.id, { enabled: true }))}
            disabled={busy}
            style={s.smallBtn}
          >
            Restore
          </button>
        )}
      </div>
    </div>
  );
}

// Used for both adding a new directory and editing an existing one
function LibraryForm({ kind, lib, onCancel, onDone }) {
  const [name,   setName]   = useState(lib?.name    ?? '');
  const [path,   setPath]   = useState(lib?.path    ?? '');
  const [path4k, setPath4k] = useState(lib?.path_4k ?? '');
  const [busy,   setBusy]   = useState(false);
  const [error,  setError]  = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (lib) await updateLibrary(lib.id, { name, path, path4k: kind === 'movie' ? path4k : null });
      else     await createLibrary({ kind, name, path, path4k: kind === 'movie' ? path4k : null });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={s.libForm}>
      <input
        style={s.input}
        placeholder={kind === 'movie' ? 'D:\\Kids Movies' : 'D:\\Kids Shows'}
        value={path}
        onChange={e => setPath(e.target.value)}
        autoFocus
      />
      <input
        style={s.input}
        placeholder="Display name (optional — defaults to the folder name)"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      {kind === 'movie' && (
        <input
          style={s.input}
          placeholder="Matching 4K directory (optional)"
          value={path4k}
          onChange={e => setPath4k(e.target.value)}
        />
      )}
      {error && <span style={s.libError}>{error}</span>}
      <div style={s.formActions}>
        <button type="submit" disabled={busy} style={s.smallBtn}>
          {busy ? 'Saving…' : lib ? 'Save' : 'Add'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} style={s.linkBtn}>Cancel</button>
      </div>
    </form>
  );
}

function SectionLabel({ children }) {
  return <div style={s.sectionLabel}>{children}</div>;
}

function OptionCard({ title, desc, action, secondAction, state, result, detail, detailLabel = 'show unmatched', onAction, onSecondAction, danger }) {
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
        {secondAction && (
          <button
            onClick={onSecondAction}
            disabled={running}
            style={{ ...s.actionBtn, background: '#1e3a5f', color: '#93c5fd' }}
          >
            {running ? 'Working…' : secondAction}
          </button>
        )}
        {result && (
          <span style={{ ...s.result, color: state === 'error' ? '#f87171' : '#4caf7d' }}>
            {result}
            {detail && (
              <button onClick={() => setShowDetail(v => !v)} style={s.detailToggle}>
                {showDetail ? 'hide' : detailLabel}
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

  libRow: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
    background: '#0e0e20', border: '1px solid #1e1e38', borderRadius: 8, padding: '12px 14px',
    flexWrap: 'wrap',
  },
  libInfo:    { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: '1 1 240px' },
  libNameRow: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  libName:    { fontSize: 14, fontWeight: 600, color: '#e0e0ff' },
  libCount:   { fontSize: 11, color: '#5a5a80' },
  libPath:    { fontSize: 12, color: '#777', wordBreak: 'break-all' },
  libPath4k:  { fontSize: 12, color: '#666', wordBreak: 'break-all' },
  libError:   { fontSize: 12, color: '#f87171' },
  libActions: { display: 'flex', gap: 8, flexShrink: 0 },
  smallBtn:   { background: '#1e2e4a', color: '#6ea8fe', padding: '6px 14px', fontSize: 13 },
  addBtn:     { background: '#1e1e38', color: '#8080a0', padding: '7px 16px', fontSize: 13, alignSelf: 'flex-start' },
  linkBtn:    { background: 'none', border: 'none', color: '#6060a0', fontSize: 13, cursor: 'pointer', padding: 0, alignSelf: 'flex-start', textDecoration: 'underline' },
  libForm:    { display: 'flex', flexDirection: 'column', gap: 8, background: '#0e0e20', border: '1px solid #1e1e38', borderRadius: 8, padding: '12px 14px' },
  input: {
    background: '#1e1e38', border: '1px solid #2a2a50',
    color: '#e0e0e0', borderRadius: 6, padding: '8px 12px', fontSize: 13, outline: 'none',
  },
  formActions:{ display: 'flex', alignItems: 'center', gap: 12 },
  emptyNote:  { fontSize: 13, color: '#666', fontStyle: 'italic' },
};
