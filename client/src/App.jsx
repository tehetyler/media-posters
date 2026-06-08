import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { fetchQueue, fetchMovieById, fetchArtwork, fetchCurrentArtwork, saveSelections, skipMovie, scanNow, searchMovieById, setMovieTmdbId } from './api';
import HomePage        from './components/HomePage';
import LibraryPage     from './components/LibraryPage';
import OptionsPage     from './components/OptionsPage';
import ReviewerNav     from './components/ReviewerNav';
import ReviewScreen    from './components/ReviewScreen';
import TvLibraryPage   from './components/TvLibraryPage';
import TvReviewerPage  from './components/TvReviewerPage';

const VIEW_URLS = {
  home: '/', library: '/library', reviewer: '/review', options: '/options',
  'tv-reviewer': '/tv/review', 'tv-library': '/tv/library',
};

export default function App() {
  const [view,       setView]       = useState('home');
  const [reviewMode, setReviewMode] = useState('queue');
  const [specificId, setSpecificId] = useState(null);

  // Apply a history state object to React state
  const applyState = useCallback((s) => {
    setView(s?.view || 'home');
    setReviewMode(s?.reviewMode || 'queue');
    setSpecificId(s?.specificId ?? null);
  }, []);

  // On mount: stamp the current entry as home, listen for browser back/forward
  useEffect(() => {
    history.replaceState({ view: 'home' }, '', '/');
    const handler = (e) => applyState(e.state);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [applyState]);

  function push(newView, extras = {}) {
    const state = { view: newView, reviewMode: 'queue', specificId: null, ...extras };
    history.pushState(state, '', VIEW_URLS[newView] || '/');
    applyState(state);
  }

  const goHome         = () => push('home');
  const goLibrary      = () => push('library');
  const goOptions      = () => push('options');
  const startQueue     = () => push('reviewer', { reviewMode: 'queue' });
  const reviewSpecific = (id) => push('reviewer', { reviewMode: 'specific', specificId: id });
  const goTvLibrary      = () => push('tv-library');
  const startTvQueue     = () => push('tv-reviewer', { reviewMode: 'queue' });
  const reviewTvSpecific = (id) => push('tv-reviewer', { reviewMode: 'specific', specificId: id });

  if (view === 'home')        return <HomePage onQueue={startQueue} onLibrary={goLibrary} onOptions={goOptions} onTvQueue={startTvQueue} onTvLibrary={goTvLibrary} />;
  if (view === 'library')     return <LibraryPage onBack={goHome} onReview={reviewSpecific} />;
  if (view === 'options')     return <OptionsPage onBack={goHome} />;
  if (view === 'tv-library')  return <TvLibraryPage onBack={goHome} onReview={reviewTvSpecific} />;
  if (view === 'tv-reviewer') return (
    <TvReviewerPage
      mode={reviewMode}
      specificId={specificId}
      onBack={reviewMode === 'specific' ? goTvLibrary : goHome}
    />
  );
  if (view === 'reviewer') return (
    <ReviewerPage
      mode={reviewMode}
      specificId={specificId}
      onBack={reviewMode === 'specific' ? goLibrary : goHome}
    />
  );
}

// ── Reviewer page — manages all movie/artwork state ───────────────────────────

function ReviewerPage({ mode, specificId, onBack }) {
  const [movie,          setMovie]          = useState(undefined);
  const [artwork,        setArtwork]        = useState(null);
  const [currentArtwork, setCurrentArtwork] = useState({});
  const [artworkLoading, setArtworkLoading] = useState(false);
  const [artworkError,   setArtworkError]   = useState(null);
  const [stats,          setStats]          = useState(null);
  const [scanning,       setScanning]       = useState(false);
  const [error,          setError]          = useState(null);
  const [allDone,        setAllDone]        = useState(false);
  const [searchResults,  setSearchResults]  = useState(null);
  const [searchLoading,  setSearchLoading]  = useState(false);

  const loadArtworkFor = useCallback(async (m) => {
    if (!m) return;
    setArtwork(null);
    setCurrentArtwork({});
    setArtworkError(null);
    setSearchResults(null);
    setSearchLoading(false);

    if (!m.tmdb_id) {
      setSearchLoading(true);
      fetchCurrentArtwork(m.id).then(setCurrentArtwork).catch(() => {});
      try {
        const results = await searchMovieById(m.id);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
      return;
    }

    setArtworkLoading(true);
    try {
      const [tmdb, current] = await Promise.all([
        fetchArtwork(m.id),
        fetchCurrentArtwork(m.id).catch(() => ({})),
      ]);
      setArtwork(tmdb);
      setCurrentArtwork(current);
    } catch (err) {
      setArtworkError(err.message);
    } finally {
      setArtworkLoading(false);
    }
  }, []);

  // Load the initial movie depending on mode
  useEffect(() => {
    setAllDone(false);
    setMovie(undefined);

    if (mode === 'specific') {
      fetchMovieById(specificId)
        .then(m => { setMovie(m); return loadArtworkFor(m); })
        .catch(err => setError(err.message));
    } else {
      fetchQueue()
        .then(({ movie: m, stats: st }) => {
          setStats(st);
          if (m) { setMovie(m); return loadArtworkFor(m); }
          else   { setMovie(null); setAllDone(true); }
        })
        .catch(err => setError(err.message));
    }
  }, [mode, specificId, loadArtworkFor]);

  useLayoutEffect(() => {
    if (movie?.id) window.scrollTo(0, 0);
  }, [movie?.id]);

  async function advance(next, stats) {
    setStats(stats);
    if (next) { setMovie(next); await loadArtworkFor(next); }
    else      { setMovie(null); setAllDone(true); }
  }

  async function handleSave(selections) {
    setError(null);
    try {
      const result = await saveSelections(movie.id, selections);
      if (mode === 'specific') onBack();
      else await advance(result.movie, result.stats);
    } catch (err) {
      setError(`Save failed: ${err.message}`);
    }
  }

  async function handleSkip() {
    setError(null);
    try {
      const result = await skipMovie(movie.id);
      if (mode === 'specific') onBack();
      else await advance(result.movie, result.stats);
    } catch (err) {
      setError(`Skip failed: ${err.message}`);
    }
  }

  async function handleOpenSearch() {
    setSearchLoading(true);
    setSearchResults(null);
    try {
      const results = await searchMovieById(movie.id);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  function handleCloseSearch() {
    setSearchResults(null);
    setSearchLoading(false);
  }

  async function handleFixMatch(tmdbId) {
    setError(null);
    try {
      const updated = await setMovieTmdbId(movie.id, tmdbId);
      setMovie(updated);
      await loadArtworkFor(updated);
    } catch (err) {
      setError(`Failed to update match: ${err.message}`);
    }
  }

  async function handleScan() {
    setScanning(true);
    setError(null);
    try {
      const result = await scanNow();
      setStats(result.stats);
      // If queue was empty and scan found new movies, load the first one
      if (allDone && result.added > 0) {
        const { movie: m, stats: st } = await fetchQueue();
        setStats(st);
        setAllDone(false);
        if (m) { setMovie(m); await loadArtworkFor(m); }
      }
    } catch (err) {
      setError(`Scan failed: ${err.message}`);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ReviewerNav
        stats={stats}
        scanning={scanning}
        onScan={handleScan}
        onBack={onBack}
        backLabel={mode === 'specific' ? 'Library' : 'Home'}
        crumbs={mode === 'specific'
          ? ['Home', 'Movie Library', 'Review']
          : ['Home', 'Review Queue']}
      />

      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={styles.dismissBtn}>✕</button>
        </div>
      )}

      <main style={styles.main}>
        {movie === undefined ? (
          <Placeholder text="Loading…" />
        ) : allDone ? (
          <Placeholder
            text="All caught up — nothing left to review."
            sub="Click Scan Library to check for new movies."
          />
        ) : movie ? (
          <ReviewScreen
            movie={movie}
            artwork={artwork}
            currentArtwork={currentArtwork}
            artworkLoading={artworkLoading}
            artworkError={artworkError}
            searchResults={searchResults}
            searchLoading={searchLoading}
            onSave={handleSave}
            onSkip={handleSkip}
            onFixMatch={handleFixMatch}
            onOpenSearch={handleOpenSearch}
            onCloseSearch={handleCloseSearch}
            mode={mode}
          />
        ) : null}
      </main>
    </div>
  );
}

function Placeholder({ text, sub }) {
  return (
    <div style={styles.placeholder}>
      <p style={styles.placeholderText}>{text}</p>
      {sub && <p style={styles.placeholderSub}>{sub}</p>}
    </div>
  );
}

const styles = {
  main: { flex: 1, padding: '24px 20px' },
  errorBanner: {
    background: '#5c1a1a', color: '#ffb3b3',
    padding: '10px 20px', fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  dismissBtn:  { background: 'transparent', color: '#ffb3b3', padding: '2px 8px', fontSize: 16 },
  placeholder: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: '60vh', gap: 12,
  },
  placeholderText: { fontSize: 20, color: '#888' },
  placeholderSub:  { fontSize: 14, color: '#555' },
};
