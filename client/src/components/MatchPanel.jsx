import { useState } from 'react';

// Matches a bare id ("1396") or a TMDB URL ("https://www.themoviedb.org/tv/1396-breaking-bad")
const TMDB_ID = /(?:themoviedb\.org\/(?:movie|tv)\/)?(\d+)/;

export default function MatchPanel({
  results, loading, error, currentTmdbId,
  defaultTitle, defaultYear, accent, kindLabel,
  onSearch, onSelect, onClose,
}) {
  const [title, setTitle] = useState(defaultTitle ?? '');
  const [year,  setYear]  = useState(defaultYear != null ? String(defaultYear) : '');
  const [idInput, setIdInput] = useState('');

  const edited = title !== (defaultTitle ?? '') || year !== (defaultYear != null ? String(defaultYear) : '');

  function submitSearch(e) {
    e.preventDefault();
    // An empty year is meaningful — it tells the server to drop the year filter
    onSearch({ title, year });
  }

  function submitId(e) {
    e.preventDefault();
    const id = idInput.match(TMDB_ID)?.[1];
    if (id) onSearch({ tmdbId: id });
  }

  function reset() {
    setTitle(defaultTitle ?? '');
    setYear(defaultYear != null ? String(defaultYear) : '');
  }

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

      <div style={mp.forms}>
        <form onSubmit={submitSearch} style={mp.searchForm}>
          <input
            style={{ ...mp.input, ...mp.titleInput }}
            placeholder={`${kindLabel} title`}
            value={title}
            onChange={e => setTitle(e.target.value)}
            aria-label="Search title"
          />
          <input
            style={{ ...mp.input, ...mp.yearInput }}
            placeholder="Year"
            value={year}
            onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            aria-label="Search year"
          />
          <button type="submit" disabled={loading} style={{ ...mp.searchBtn, background: accent }}>
            {loading ? 'Searching…' : 'Search'}
          </button>
          {edited && (
            <button type="button" onClick={reset} style={mp.resetBtn}>Reset</button>
          )}
        </form>

        <form onSubmit={submitId} style={mp.searchForm}>
          <input
            style={{ ...mp.input, ...mp.idInput }}
            placeholder="…or paste a TMDB ID or URL"
            value={idInput}
            onChange={e => setIdInput(e.target.value)}
            aria-label="TMDB ID or URL"
          />
          <button type="submit" disabled={loading || !idInput.trim()} style={mp.lookupBtn}>
            Look up
          </button>
        </form>

        <span style={mp.tip}>
          Clear the year to search every {kindLabel} with that title.
        </span>
      </div>

      {loading ? (
        <div style={mp.status}>Searching TMDB…</div>
      ) : error ? (
        <div style={mp.error}>TMDB search failed: {error}</div>
      ) : !results || results.length === 0 ? (
        <div style={mp.status}>
          No results — try a different title, clear the year, or paste the TMDB ID directly.
        </div>
      ) : (
        <div style={mp.list}>
          {results.map(r => {
            const isActive = String(r.tmdbId) === String(currentTmdbId);
            return (
              <button
                key={r.tmdbId}
                style={{
                  ...mp.result,
                  ...(isActive ? { border: `1px solid ${accent}`, background: '#141030' } : {}),
                }}
                onClick={() => onSelect(r)}
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
                {isActive && <span style={{ ...mp.check, color: accent }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const mp = {
  panel: {
    background: '#13132a', border: '1px solid #3a2a60',
    borderRadius: 10, padding: '16px',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  header:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title:    { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a080d0' },
  closeBtn: { background: '#1e1e38', color: '#8080a0', fontSize: 12, padding: '4px 10px' },

  forms:      { display: 'flex', flexDirection: 'column', gap: 8 },
  searchForm: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  input: {
    background: '#1e1e38', border: '1px solid #2a2a50',
    color: '#e0e0e0', borderRadius: 6, padding: '8px 12px', fontSize: 13, outline: 'none',
  },
  titleInput: { flex: '1 1 220px', minWidth: 0 },
  yearInput:  { width: 80, flexShrink: 0 },
  idInput:    { flex: '1 1 220px', minWidth: 0 },
  searchBtn:  { color: '#fff', fontSize: 13, padding: '8px 18px', flexShrink: 0 },
  lookupBtn:  { background: '#1e1e38', color: '#9090c0', fontSize: 13, padding: '8px 16px', border: '1px solid #2a2a50', flexShrink: 0 },
  resetBtn:   { background: 'none', color: '#6060a0', fontSize: 12, padding: '4px 6px' },
  tip:        { fontSize: 12, color: '#555' },

  status:   { fontSize: 13, color: '#666', padding: '8px 0' },
  error:    { fontSize: 13, color: '#e07070', background: '#2a1a1a', borderRadius: 6, padding: '10px 12px' },
  list:     { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 460, overflowY: 'auto' },
  result: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    background: '#0e0e22', border: '1px solid #252540',
    borderRadius: 8, padding: '10px 12px',
    cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  thumb: { width: 46, flexShrink: 0, borderRadius: 4, display: 'block' },
  thumbPlaceholder: { width: 46, height: 68, flexShrink: 0, borderRadius: 4, background: '#1e1e38' },
  info:  { display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 },
  name:  { fontSize: 14, fontWeight: 600, color: '#e0e0ff' },
  meta:  { fontSize: 12, color: '#666' },
  overview: { fontSize: 12, color: '#555', lineHeight: 1.45, marginTop: 2 },
  check: { fontSize: 14, fontWeight: 700, flexShrink: 0, alignSelf: 'center' },
};
