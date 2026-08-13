import { useState } from 'react';
import ArtworkPanel from './ArtworkPanel';
import CurrentArtworkBanner from './CurrentArtworkBanner';
import MatchPanel from './MatchPanel';

const PANELS = [
  { type: 'poster',    label: 'Poster',     key: 'posters' },
  { type: 'backdrop',  label: 'Background', key: 'backdrops' },
  { type: 'clearlogo', label: 'Clear Logo', key: 'logos' },
];

export default function ReviewScreen({
  movie, artwork, currentArtwork = {}, artworkLoading, artworkError,
  searchResults, searchLoading, searchError, searchOpen,
  onSave, onSkip, onFixMatch, onOpenSearch, onCloseSearch, onSearch,
  mode = 'queue',
}) {
  const [selections, setSelections] = useState({});
  const [saving, setSaving] = useState(false);

  const artworkReady = movie.tmdb_id && !searchOpen;

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
                disabled={searchOpen}
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

      {searchOpen && (
        <MatchPanel
          key={movie.id}
          results={searchResults}
          loading={searchLoading}
          error={searchError}
          currentTmdbId={movie.tmdb_id}
          defaultTitle={movie.title}
          defaultYear={movie.year}
          accent="#2563eb"
          kindLabel="movie"
          onSearch={onSearch}
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
