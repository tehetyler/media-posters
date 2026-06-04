import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  fetchTvQueue, fetchTvShowById, fetchTvArtwork, fetchTvSeasonArtwork,
  fetchTvCurrentArtwork, saveTvSelections, skipTvShow, scanTvNow,
  searchTvShowById, setTvShowTmdbId,
} from '../api';
import ReviewerNav from './ReviewerNav';
import TvReviewScreen from './TvReviewScreen';

export default function TvReviewerPage({ mode, specificId, onBack }) {
  const [show,           setShow]           = useState(undefined);
  const [seriesArtwork,  setSeriesArtwork]  = useState(null);
  const [seasonArtwork,  setSeasonArtwork]  = useState({});
  const [currentArtwork, setCurrentArtwork] = useState({});
  const [artworkLoading, setArtworkLoading] = useState(false);
  const [artworkError,   setArtworkError]   = useState(null);
  const [stats,          setStats]          = useState(null);
  const [scanning,       setScanning]       = useState(false);
  const [error,          setError]          = useState(null);
  const [allDone,        setAllDone]        = useState(false);
  const [searchResults,  setSearchResults]  = useState(null);
  const [searchLoading,  setSearchLoading]  = useState(false);

  const loadArtworkFor = useCallback(async (s) => {
    if (!s) return;
    setSeriesArtwork(null);
    setSeasonArtwork({});
    setCurrentArtwork({});
    setArtworkError(null);
    setSearchResults(null);
    setSearchLoading(false);

    if (!s.tmdb_id) {
      // No match yet — auto-trigger search so the match panel is pre-populated
      setSearchLoading(true);
      fetchTvCurrentArtwork(s.id).then(setCurrentArtwork).catch(() => {});
      try {
        const results = await searchTvShowById(s.id);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
      return;
    }

    setArtworkLoading(true);
    const seasons = JSON.parse(s.seasons ?? '[]');
    try {
      const [series, current, ...seasonResults] = await Promise.all([
        fetchTvArtwork(s.id),
        fetchTvCurrentArtwork(s.id).catch(() => ({})),
        ...seasons.map(n => fetchTvSeasonArtwork(s.id, n).catch(() => ({ posters: [] }))),
      ]);
      setSeriesArtwork(series);
      setCurrentArtwork(current);
      const seasonMap = {};
      seasons.forEach((n, i) => { seasonMap[n] = seasonResults[i]; });
      setSeasonArtwork(seasonMap);
    } catch (err) {
      setArtworkError(err.message);
    } finally {
      setArtworkLoading(false);
    }
  }, []);

  useEffect(() => {
    setAllDone(false);
    setShow(undefined);

    if (mode === 'specific') {
      fetchTvShowById(specificId)
        .then(s => { setShow(s); return loadArtworkFor(s); })
        .catch(err => setError(err.message));
    } else {
      fetchTvQueue()
        .then(({ show: s, stats: st }) => {
          setStats(st);
          if (s) { setShow(s); return loadArtworkFor(s); }
          else   { setShow(null); setAllDone(true); }
        })
        .catch(err => setError(err.message));
    }
  }, [mode, specificId, loadArtworkFor]);

  useLayoutEffect(() => {
    if (show?.id) window.scrollTo(0, 0);
  }, [show?.id]);

  async function advance(next, st) {
    setStats(st);
    if (next) { setShow(next); await loadArtworkFor(next); }
    else      { setShow(null); setAllDone(true); }
  }

  async function handleSave(selections) {
    setError(null);
    try {
      const result = await saveTvSelections(show.id, selections);
      if (mode === 'specific') onBack();
      else await advance(result.show, result.stats);
    } catch (err) {
      setError(`Save failed: ${err.message}`);
    }
  }

  async function handleSkip() {
    setError(null);
    try {
      const result = await skipTvShow(show.id);
      if (mode === 'specific') onBack();
      else await advance(result.show, result.stats);
    } catch (err) {
      setError(`Skip failed: ${err.message}`);
    }
  }

  async function handleScan() {
    setScanning(true);
    setError(null);
    try {
      const result = await scanTvNow();
      setStats(result.stats);
      if (allDone && result.added > 0) {
        const { show: s, stats: st } = await fetchTvQueue();
        setStats(st);
        setAllDone(false);
        if (s) { setShow(s); await loadArtworkFor(s); }
      }
    } catch (err) {
      setError(`Scan failed: ${err.message}`);
    } finally {
      setScanning(false);
    }
  }

  async function handleOpenSearch() {
    setSearchLoading(true);
    setSearchResults(null);
    try {
      const results = await searchTvShowById(show.id);
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
      const updated = await setTvShowTmdbId(show.id, tmdbId);
      setShow(updated);
      await loadArtworkFor(updated);
    } catch (err) {
      setError(`Failed to update match: ${err.message}`);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ReviewerNav
        appName="TV Artwork Reviewer"
        stats={stats}
        scanning={scanning}
        onScan={handleScan}
        onBack={onBack}
        backLabel={mode === 'specific' ? 'TV Library' : 'TV Shows'}
        crumbs={mode === 'specific'
          ? ['Home', 'TV Shows', 'TV Library', 'Review']
          : ['Home', 'TV Shows', 'Review Queue']}
      />

      {error && (
        <div style={errs.banner}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={errs.dismiss}>✕</button>
        </div>
      )}

      <main style={{ flex: 1, padding: '24px 20px' }}>
        {show === undefined ? (
          <Placeholder text="Loading…" />
        ) : allDone ? (
          <Placeholder
            text="All caught up — nothing left to review."
            sub="Click Scan Library to check for new shows."
          />
        ) : show ? (
          <TvReviewScreen
            show={show}
            seriesArtwork={seriesArtwork}
            seasonArtwork={seasonArtwork}
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
    <div style={ph.wrap}>
      <p style={ph.text}>{text}</p>
      {sub && <p style={ph.sub}>{sub}</p>}
    </div>
  );
}

const errs = {
  banner:  { background: '#5c1a1a', color: '#ffb3b3', padding: '10px 20px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  dismiss: { background: 'transparent', color: '#ffb3b3', padding: '2px 8px', fontSize: 16 },
};

const ph = {
  wrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 },
  text: { fontSize: 20, color: '#888' },
  sub:  { fontSize: 14, color: '#555' },
};
