import { useState, useEffect, useMemo } from 'react';
import { fetchMovies } from '../api';
import NavBar from './NavBar';

const STATUS_COLORS = {
  pending:  { bg: '#3a2a0a', text: '#e2a52a' },
  reviewed: { bg: '#0a2a1a', text: '#4caf7d' },
  skipped:  { bg: '#1e1e2e', text: '#7a7a9a' },
};

export default function LibraryPage({ onBack, onReview }) {
  const [movies,  setMovies]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('all');
  const [sortBy,  setSortBy]  = useState('title');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    fetchMovies()
      .then(setMovies)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = movies;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.title.toLowerCase().includes(q));
    }
    if (status !== 'all') list = list.filter(m => m.status === status);

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'title') cmp = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      else if (sortBy === 'year') cmp = (a.year ?? 0) - (b.year ?? 0);
      else if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [movies, search, status, sortBy, sortDir]);

  return (
    <div style={s.page}>
      <NavBar
        title="Movie Library"
        onBack={onBack}
        backLabel="Home"
        crumbs={['Home', 'Movie Library']}
        right={<span style={s.count}>{filtered.length} / {movies.length} movies</span>}
      />

      <div style={s.body}>
        <div className="library-controls">
          <input
            style={s.searchInput}
            placeholder="Search by title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={s.select} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="skipped">Skipped</option>
          </select>
          <select style={s.select} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="title">Sort: Title</option>
            <option value="year">Sort: Year</option>
            <option value="status">Sort: Status</option>
          </select>
          <button
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            style={s.dirBtn}
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {loading ? (
          <div style={s.empty}>Loading library…</div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>No movies match your search.</div>
        ) : (
          <div className="library-grid">
            {filtered.map(movie => (
              <MovieRow key={movie.id} movie={movie} onReview={() => onReview(movie.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MovieRow({ movie, onReview }) {
  const sc = STATUS_COLORS[movie.status] ?? STATUS_COLORS.pending;
  return (
    <div className="movie-row">
      {/* Title + status always visible — status lives inside this block so it shows on mobile */}
      <div style={s.rowMain}>
        <div style={s.rowTitle}>
          <span style={s.movieTitle}>{movie.title}</span>
          {movie.year && <span style={s.movieYear}>{movie.year}</span>}
        </div>
        <span style={{ ...s.statusBadge, background: sc.bg, color: sc.text }}>
          {movie.status}
        </span>
      </div>
      {/* TMDB ID — hidden on mobile via row-meta */}
      <span style={s.tmdbId} className="row-meta">
        {movie.tmdb_id ? `TMDB ${movie.tmdb_id}` : <span style={{ color: '#444' }}>No ID</span>}
      </span>
      <button onClick={onReview} style={s.reviewBtn}>Review</button>
    </div>
  );
}

const s = {
  page:  { display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  body:  { padding: '20px', flex: 1 },
  count: { fontSize: 13, color: '#666' },

  searchInput: {
    flex: '1 1 200px', minWidth: 0,
    background: '#1e1e38', border: '1px solid #2a2a50',
    color: '#e0e0e0', borderRadius: 6, padding: '8px 12px', fontSize: 14,
    outline: 'none',
  },
  select: {
    background: '#1e1e38', border: '1px solid #2a2a50',
    color: '#e0e0e0', borderRadius: 6, padding: '8px 10px', fontSize: 13,
  },
  dirBtn: {
    background: '#1e1e38', color: '#a0a0c0',
    padding: '8px 14px', fontSize: 16, flexShrink: 0,
  },

  rowMain:     { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, alignItems: 'flex-start' },
  rowTitle:    { display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 },
  movieTitle:  { fontWeight: 600, fontSize: 14, color: '#e0e0ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  movieYear:   { fontSize: 13, color: '#555', flexShrink: 0 },
  statusBadge: { fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '3px 8px', textTransform: 'capitalize', whiteSpace: 'nowrap' },
  tmdbId:      { fontSize: 12, color: '#666', whiteSpace: 'nowrap' },
  reviewBtn:   { background: '#1e2e4a', color: '#6ea8fe', padding: '6px 14px', fontSize: 13, flexShrink: 0 },

  empty: { textAlign: 'center', color: '#555', padding: '60px 0', fontSize: 15 },
};
