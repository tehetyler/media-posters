import { useState } from 'react';
import ArtworkPanel from './ArtworkPanel';
import CurrentArtworkBanner from './CurrentArtworkBanner';
import MatchPanel from './MatchPanel';

export default function TvReviewScreen({
  show, seriesArtwork, seasonArtwork, currentArtwork,
  artworkLoading, artworkError,
  searchResults, searchLoading, searchError, searchOpen,
  onSave, onSkip, onFixMatch, onOpenSearch, onCloseSearch, onSearch,
  mode,
}) {
  const [selections, setSelections] = useState({ seasons: {} });
  const [saving, setSaving] = useState(false);

  const seasons = JSON.parse(show.seasons ?? '[]');
  const hasSeasons = seasons.length > 0;
  const artworkReady = show.tmdb_id && !searchLoading;

  function handleSelectSeries(type, url) {
    setSelections(prev => ({ ...prev, [type]: prev[type] === url ? null : url }));
  }

  function handleSelectSeason(n, url) {
    setSelections(prev => ({
      ...prev,
      seasons: { ...prev.seasons, [n]: prev.seasons[n] === url ? null : url },
    }));
  }

  async function handleSave() {
    setSaving(true);
    await onSave(selections);
    setSelections({ seasons: {} });
    setSaving(false);
  }

  const anySelected = ['poster', 'fanart', 'clearlogo'].some(k => selections[k]) ||
    Object.values(selections.seasons).some(Boolean);

  return (
    <div style={s.container}>
      {/* Show header */}
      <div style={s.showHeader}>
        <div style={s.titleRow}>
          <h1 style={s.title}>{show.title}</h1>
          {show.year && <span style={s.year}>{show.year}</span>}
        </div>
        <div style={s.matchRow}>
          {show.tmdb_id ? (
            <>
              <span style={s.matchBadge}>TMDB {show.tmdb_id}</span>
              {show.tvdb_id && <span style={s.tvdbBadge}>TVDB {show.tvdb_id}</span>}
              <button
                onClick={onOpenSearch}
                disabled={searchOpen}
                style={s.fixMatchBtn}
              >
                Fix Match
              </button>
            </>
          ) : (
            <span style={s.noMatch}>No TMDB match — select a show below to continue</span>
          )}
        </div>
      </div>

      {/* Fix Match / Initial Match Panel */}
      {searchOpen && (
        <MatchPanel
          key={show.id}
          results={searchResults}
          loading={searchLoading}
          error={searchError}
          currentTmdbId={show.tmdb_id}
          defaultTitle={show.title}
          defaultYear={show.year}
          accent="#7c3aed"
          kindLabel="show"
          onSearch={onSearch}
          onSelect={onFixMatch}
          onClose={show.tmdb_id ? onCloseSearch : null}
        />
      )}

      {/* Artwork — only shown once matched and not in the middle of a search load */}
      {artworkReady && (
        <>
          <CurrentArtworkBanner currentArtwork={{
            poster:    currentArtwork.poster    ?? null,
            backdrop:  currentArtwork.fanart    ?? null,
            clearlogo: currentArtwork.clearlogo ?? null,
          }} />

          {artworkError ? (
            <div style={s.artworkError}>Could not fetch artwork: {artworkError}</div>
          ) : (
            <>
              <div style={s.sectionLabel}>Series Artwork</div>
              <div className="review-panels">
                <ArtworkPanel
                  type="poster"
                  label="Series Poster"
                  options={seriesArtwork?.posters ?? []}
                  loading={artworkLoading}
                  selected={selections.poster ?? null}
                  onSelect={url => handleSelectSeries('poster', url)}
                />
                <ArtworkPanel
                  type="backdrop"
                  label="Background"
                  options={seriesArtwork?.backdrops ?? []}
                  loading={artworkLoading}
                  selected={selections.fanart ?? null}
                  onSelect={url => handleSelectSeries('fanart', url)}
                />
                <ArtworkPanel
                  type="clearlogo"
                  label="Clear Logo"
                  options={seriesArtwork?.logos ?? []}
                  loading={artworkLoading}
                  selected={selections.clearlogo ?? null}
                  onSelect={url => handleSelectSeries('clearlogo', url)}
                />
              </div>

              {hasSeasons && (
                <>
                  <div style={s.sectionLabel}>Season Posters</div>
                  <div className="review-panels">
                    {seasons.map(n => (
                      <ArtworkPanel
                        key={n}
                        type="poster"
                        label={n === 0 ? 'Specials' : `Season ${n}`}
                        options={seasonArtwork[n]?.posters ?? []}
                        loading={artworkLoading}
                        selected={selections.seasons[n] ?? null}
                        onSelect={url => handleSelectSeason(n, url)}
                        currentUrl={currentArtwork?.seasons?.[n] ?? null}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

        </>
      )}

      <div className="review-actions">
        {anySelected && (
          <span style={s.hint}>Only selected types will be written — others left unchanged</span>
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
  showHeader:  { display: 'flex', flexDirection: 'column', gap: 8 },
  titleRow:    { display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  title:       { fontSize: 26, fontWeight: 800, color: '#f0f0ff' },
  year:        { fontSize: 18, color: '#555', fontWeight: 400 },
  matchRow:    { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  matchBadge:  { fontSize: 12, background: '#0f2e1a', color: '#4caf7d', borderRadius: 4, padding: '3px 10px' },
  tvdbBadge:   { fontSize: 12, background: '#0d2040', color: '#60a5fa', borderRadius: 4, padding: '3px 10px' },
  fixMatchBtn: { background: '#1e1e38', color: '#9090c0', fontSize: 12, padding: '4px 12px', border: '1px solid #2a2a50' },
  noMatch:     { fontSize: 13, color: '#e2a52a', background: '#3a2a0a', borderRadius: 4, padding: '5px 12px' },
  sectionLabel:{
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: '#6060a0',
    borderBottom: '1px solid #1e1e38', paddingBottom: 6,
  },
  artworkError: {
    background: '#2a1a1a', color: '#e07070', borderRadius: 8, padding: '20px 24px', fontSize: 14,
  },
  hint:    { fontSize: 13, color: '#555', marginRight: 'auto', flexBasis: '100%', order: -1 },
  skipBtn: { background: '#1e1e38', color: '#8080a0' },
  saveBtn: { background: '#7c3aed', color: '#fff', padding: '10px 28px' },
};
