import { useState } from 'react';
import ArtworkPanel from './ArtworkPanel';
import CurrentArtworkBanner from './CurrentArtworkBanner';

const PANELS = [
  { type: 'poster',    label: 'Poster',     key: 'posters' },
  { type: 'backdrop',  label: 'Background', key: 'backdrops' },
  { type: 'clearlogo', label: 'Clear Logo', key: 'logos' },
];

export default function ReviewScreen({
  movie, artwork, currentArtwork = {}, artworkLoading, artworkError,
  searchResults, searchLoading,
  onSave, onSkip, onFixMatch, onOpenSearch, onCloseSearch,
  mode = 'queue',
}) {
  const [selections, setSelections] = useState({});
  const [saving, setSaving] = useState(false);

  const showMatchPanel = searchResults !== null || searchLoading;
  const artworkReady = movie.tmdb_id && !showMatchPanel;

  function handleSelect(type, url) {
    setSelections(prev => ({ ...prev, [type]: prev[type] === url ? null : url }));
  }

  async function handleSave() {
    setSaving(true);
    await onSave(selections);
    setSelections({});
    setSaving(false);
  }

  const anySelected = Object.values(selections).some(Boolean);
  const unselected  = artwork
    ? PANELS.filter(p => (artwork[p.key]?.length ?? 0) > 0 && !selections[p.type]).length
    : 0;

  return (
    <div style={s.container}>
      <div style={s.movieHeader}>
        <div style={s.titleRow}>
          <h1 style={s.title}>{movie.title}</h1>
          {movie.year && <span style={s.year}>{movie.year}</span>}
        </div>
        <div style={s.matchRow}>
          {movie.tmdb_id ? (
            <>
              <span style={s.matchBadge}>TMDB {movie.tmdb_id}</span>
              <button
                onClick={onOpenSearch}
                disabled={showMatchPanel}
                style={s.fixMatchBtn}
              >
                Fix Match
              </button>
            </>
          ) : (
            <span style={s.noMatch}>No TMDB match — select a movie below to continue</span>
          )}
        </div>
      </div>

      {showMatchPanel && (
        <MatchPanel
          results={searchResults}
          loading={searchLoading}
          currentTmdbId={movie.tmdb_id}
          onSelect={onFixMatch}
          onClose={movie.tmdb_id ? onCloseSearch : null}
        />
      )}

      {artworkReady && (
        <>
          <CurrentArtworkBanner currentArtwork={currentArtwork} />

          {artworkError ? (
            <div style={s.artworkError}>Could not fetch artwork: {artworkError}</div>
          ) : (
            <div className="review-panels">
              {PANELS.map(({ type, label, key }) => (
                <ArtworkPanel
                  key={type}
                  type={type}
                  label={label}
                  options={artwork?.[key] ?? []}
                  loading={artworkLoading}
                  selected={selections[type] ?? null}
                  onSelect={url => handleSelect(type, url)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="review-actions">
        {anySelected && unselected > 0 && (
          <span style={s.hint}>
            {unselected} type{unselected !== 1 ? 's' : ''} without selection will be left unchanged
          </span>
        )}
        <button onClick={onSkip} disabled={saving} style={s.skipBtn}>Skip</button>
        {artworkReady && (
          <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
            {saving ? 'Saving…' : mode === 'specific' ? 'Save & Done' : 'Save & Next'}
          </button>
        )}
      </div>
    </div>
  );
}

function MatchPanel({ results, loading, currentTmdbId, onSelect, onClose }) {
  return (
    <div style={mp.panel}>
      <div style={mp.header}>
        <span style={mp.title}>
          {currentTmdbId ? 'Change TMDB Match' : 'Select TMDB Match'}
        </span>
        {onClose && (
          <button onClick={onClose} style={mp.closeBtn}>✕ Cancel</button>
        )}
      </div>

      {loading ? (
        <div style={mp.status}>Searching TMDB…</div>
      ) : !results || results.length === 0 ? (
        <div style={mp.status}>No results found — check that the movie folder name matches the title.</div>
      ) : (
        <div style={mp.list}>
          {results.map(r => {
            const isActive = String(r.tmdbId) === String(currentTmdbId);
            return (
              <button
                key={r.tmdbId}
                style={{ ...mp.result, ...(isActive ? mp.resultActive : {}) }}
                onClick={() => onSelect(String(r.tmdbId))}
              >
                {r.posterPath ? (
                  <img
                    src={`/api/proxy?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w92${r.posterPath}`)}`}
                    alt=""
                    style={mp.thumb}
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div style={mp.thumbPlaceholder} />
                )}
                <div style={mp.info}>
                  <span style={mp.name}>{r.name}</span>
                  <span style={mp.meta}>
                    {r.year ?? '?'} · TMDB {r.tmdbId} · pop {r.popularity.toFixed(0)}
                  </span>
                  {r.overview && (
                    <span style={mp.overview}>
                      {r.overview.length > 130 ? r.overview.slice(0, 130) + '…' : r.overview}
                    </span>
                  )}
                </div>
                {isActive && <span style={mp.check}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  container:   { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1400, margin: '0 auto' },
  movieHeader: { display: 'flex', flexDirection: 'column', gap: 8 },
  titleRow:    { display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  title:       { fontSize: 26, fontWeight: 800, color: '#f0f0ff' },
  year:        { fontSize: 18, color: '#555', fontWeight: 400 },
  matchRow:    { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  matchBadge:  { fontSize: 12, background: '#0f2e1a', color: '#4caf7d', borderRadius: 4, padding: '3px 10px' },
  fixMatchBtn: { background: '#1e1e38', color: '#9090c0', fontSize: 12, padding: '4px 12px', border: '1px solid #2a2a50' },
  noMatch:     { fontSize: 13, color: '#e2a52a', background: '#3a2a0a', borderRadius: 4, padding: '5px 12px' },
  artworkError: {
    background: '#2a1a1a', color: '#e07070', borderRadius: 8, padding: '20px 24px', fontSize: 14,
  },
  hint:    { fontSize: 13, color: '#555', marginRight: 'auto', flexBasis: '100%', order: -1 },
  skipBtn: { background: '#1e1e38', color: '#8080a0' },
  saveBtn: { background: '#2563eb', color: '#fff', padding: '10px 28px' },
};

const mp = {
  panel: {
    background: '#13132a', border: '1px solid #3a2a60',
    borderRadius: 10, padding: '16px',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title:   { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a080d0' },
  closeBtn: { background: '#1e1e38', color: '#8080a0', fontSize: 12, padding: '4px 10px' },
  status:  { fontSize: 13, color: '#666', padding: '8px 0' },
  list:    { display: 'flex', flexDirection: 'column', gap: 6 },
  result: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    background: '#0e0e22', border: '1px solid #252540',
    borderRadius: 8, padding: '10px 12px',
    cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  resultActive: { border: '1px solid #2563eb', background: '#0a1830' },
  thumb: { width: 46, flexShrink: 0, borderRadius: 4, display: 'block' },
  thumbPlaceholder: { width: 46, height: 68, flexShrink: 0, borderRadius: 4, background: '#1e1e38' },
  info:  { display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 },
  name:  { fontSize: 14, fontWeight: 600, color: '#e0e0ff' },
  meta:  { fontSize: 12, color: '#666' },
  overview: { fontSize: 12, color: '#555', lineHeight: 1.45, marginTop: 2 },
  check: { fontSize: 14, color: '#2563eb', fontWeight: 700, flexShrink: 0, alignSelf: 'center' },
};
