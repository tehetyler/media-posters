import { useState } from 'react';
import ArtworkPanel from './ArtworkPanel';
import CurrentArtworkBanner from './CurrentArtworkBanner';

const PANELS = [
  { type: 'poster',    label: 'Poster',     key: 'posters' },
  { type: 'backdrop',  label: 'Background', key: 'backdrops' },
  { type: 'clearlogo', label: 'Clear Logo', key: 'logos' },
];

// mode: 'queue' (save → next pending) | 'specific' (save → back)
export default function ReviewScreen({ movie, artwork, currentArtwork = {}, artworkLoading, artworkError, onSave, onSkip, mode = 'queue' }) {
  const [selections, setSelections] = useState({});
  const [saving, setSaving] = useState(false);

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
        <h1 style={s.title}>{movie.title}</h1>
        {movie.year && <span style={s.year}>{movie.year}</span>}
        {!movie.tmdb_id && <span style={s.noTmdb}>No TMDB ID</span>}
      </div>

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

      <div className="review-actions">
        {anySelected && unselected > 0 && (
          <span style={s.hint}>
            {unselected} type{unselected !== 1 ? 's' : ''} without selection will be left unchanged
          </span>
        )}
        <button onClick={onSkip}  disabled={saving} style={s.skipBtn}>Skip</button>
        <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
          {saving ? 'Saving…' : mode === 'specific' ? 'Save & Done' : 'Save & Next'}
        </button>
      </div>
    </div>
  );
}

const s = {
  container:   { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1400, margin: '0 auto' },
  movieHeader: { display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  title:       { fontSize: 26, fontWeight: 800, color: '#f0f0ff' },
  year:        { fontSize: 18, color: '#555', fontWeight: 400 },
  noTmdb:      {
    fontSize: 12, background: '#3a1a1a', color: '#e07070',
    borderRadius: 4, padding: '3px 10px', alignSelf: 'center',
  },
  artworkError: {
    background: '#2a1a1a', color: '#e07070', borderRadius: 8, padding: '20px 24px', fontSize: 14,
  },
  hint:    { fontSize: 13, color: '#555', marginRight: 'auto', flexBasis: '100%', order: -1 },
  skipBtn: { background: '#1e1e38', color: '#8080a0' },
  saveBtn: { background: '#2563eb', color: '#fff', padding: '10px 28px' },
};
