import { Router } from 'express';
import axios from 'axios';
import { existsSync, createReadStream, statSync } from 'fs';
import { join, resolve, extname, sep } from 'path';
import { getNextPending, getMovieById, getMovies, markReviewed, markSkipped, markSkippedAsReviewed, getStats, getShows, getShowById, getNextPendingShow, markShowReviewed, markShowSkipped, markShowSkippedAsReviewed, setShowTmdbId, getShowStats } from './db.js';
import { fetchArtwork, searchTvShow, fetchTvArtwork, fetchSeasonArtwork } from './tmdb.js';
import { downloadSelections } from './downloader.js';
import { downloadTvSelections, findSeasonFolder } from './tvdownloader.js';
import { runScan } from './scanner.js';
import { runTvScan } from './tvscanner.js';

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

function findExisting(folder, names) {
  for (const name of names) {
    const full = join(folder, name);
    if (existsSync(full)) return full;
  }
  return null;
}

const router = Router();

// Next pending movie + overall stats
router.get('/queue', (req, res) => {
  res.json({ movie: getNextPending(), stats: getStats() });
});

// All movies (for library view — client handles search/sort/filter)
router.get('/movies', (req, res) => {
  res.json(getMovies());
});

// Single movie by id
router.get('/movie/:id', (req, res) => {
  const movie = getMovieById(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });
  res.json(movie);
});

// Current artwork files on disk for a movie
router.get('/movie/:id/current-artwork', (req, res) => {
  const movie = getMovieById(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });

  const f = movie.folder_path;
  const encode = p => {
    if (!p) return null;
    const mtime = statSync(p).mtimeMs;
    return `/api/file?path=${encodeURIComponent(p)}&t=${mtime}`;
  };

  res.json({
    poster:    encode(findExisting(f, ['poster.jpg', 'poster.png', 'poster.webp'])),
    backdrop:  encode(findExisting(f, ['backdrop.jpg', 'fanart.jpg', 'backdrop.png'])),
    clearlogo: encode(findExisting(f, ['clearlogo.png', 'clearlogo.jpg', 'clearlogo.svg'])),
  });
});

// Serve a local image file (restricted to MOVIE_DIR)
router.get('/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).send('Missing path');

  const resolved = resolve(filePath);
  const allowedDirs = [
    process.env.MOVIE_DIR,
    process.env.TV_SHOW_DIR,
  ].filter(Boolean).map(d => resolve(d));

  const isAllowed = allowedDirs.some(dir => resolved.startsWith(dir + sep) || resolved === dir);
  if (!isAllowed) return res.status(403).send('Forbidden');
  if (!existsSync(resolved))          return res.status(404).send('Not found');

  res.setHeader('Content-Type', MIME[extname(resolved).toLowerCase()] ?? 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  createReadStream(resolved).pipe(res);
});

// Fetch artwork options from TMDB for a specific movie
router.get('/movie/:id/artwork', async (req, res) => {
  const movie = getMovieById(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });
  if (!movie.tmdb_id) return res.status(422).json({ error: 'No TMDB ID — cannot fetch artwork' });

  try {
    const artwork = await fetchArtwork(movie.tmdb_id);
    res.json(artwork);
  } catch (err) {
    res.status(502).json({ error: 'TMDB request failed', detail: err.message });
  }
});

// Download selected artwork to the movie folder, then mark reviewed
router.post('/movie/:id/select', async (req, res) => {
  const movie = getMovieById(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });

  const { selections } = req.body;

  try {
    const hasAny = Object.values(selections ?? {}).some(Boolean);
    if (hasAny) await downloadSelections(movie.folder_path, selections);
    markReviewed(movie.id);
    res.json({ movie: getNextPending(), stats: getStats() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save artwork', detail: err.message });
  }
});

// Skip a movie
router.post('/movie/:id/skip', (req, res) => {
  markSkipped(req.params.id);
  res.json({ movie: getNextPending(), stats: getStats() });
});

// Trigger a fresh NFO scan
router.post('/scan', (req, res) => {
  try {
    const result = runScan();
    res.json({ ...result, stats: getStats() });
  } catch (err) {
    res.status(500).json({ error: 'Scan failed', detail: err.message });
  }
});

router.get('/status', (req, res) => res.json(getStats()));

// Mark all skipped movies as reviewed
router.post('/options/mark-skipped-reviewed', (req, res) => {
  const updated = markSkippedAsReviewed();
  res.json({ updated, stats: getStats() });
});

// ─── TV SHOW ROUTES ──────────────────────────────────────────────────────────

router.get('/tv/status', (req, res) => res.json(getShowStats()));

router.get('/tv/queue', (req, res) => {
  res.json({ show: getNextPendingShow(), stats: getShowStats() });
});

router.get('/tv/shows', (req, res) => {
  res.json(getShows());
});

router.get('/tv/:id', (req, res) => {
  const show = getShowById(req.params.id);
  if (!show) return res.status(404).json({ error: 'Show not found' });
  res.json(show);
});

router.get('/tv/:id/search', async (req, res) => {
  const show = getShowById(req.params.id);
  if (!show) return res.status(404).json({ error: 'Show not found' });
  try {
    const results = await searchTvShow(show.title, show.year);
    res.json(results);
  } catch (err) {
    res.status(502).json({ error: 'TMDB search failed', detail: err.message });
  }
});

router.post('/tv/:id/set-tmdb', (req, res) => {
  const show = getShowById(req.params.id);
  if (!show) return res.status(404).json({ error: 'Show not found' });
  const { tmdbId } = req.body;
  if (!tmdbId) return res.status(400).json({ error: 'tmdbId required' });
  setShowTmdbId(req.params.id, String(tmdbId));
  res.json(getShowById(req.params.id));
});

router.get('/tv/:id/artwork', async (req, res) => {
  const show = getShowById(req.params.id);
  if (!show) return res.status(404).json({ error: 'Show not found' });
  if (!show.tmdb_id) return res.status(422).json({ error: 'No TMDB ID — cannot fetch artwork' });
  try {
    const artwork = await fetchTvArtwork(show.tmdb_id);
    res.json(artwork);
  } catch (err) {
    res.status(502).json({ error: 'TMDB request failed', detail: err.message });
  }
});

router.get('/tv/:id/season/:n/artwork', async (req, res) => {
  const show = getShowById(req.params.id);
  if (!show) return res.status(404).json({ error: 'Show not found' });
  if (!show.tmdb_id) return res.status(422).json({ error: 'No TMDB ID — cannot fetch artwork' });
  try {
    const artwork = await fetchSeasonArtwork(show.tmdb_id, req.params.n);
    res.json(artwork);
  } catch (err) {
    res.status(502).json({ error: 'TMDB request failed', detail: err.message });
  }
});

router.get('/tv/:id/current-artwork', (req, res) => {
  const show = getShowById(req.params.id);
  if (!show) return res.status(404).json({ error: 'Show not found' });

  const f = show.folder_path;
  const seasons = JSON.parse(show.seasons ?? '[]');

  const encode = p => {
    if (!p) return null;
    const mtime = statSync(p).mtimeMs;
    return `/api/file?path=${encodeURIComponent(p)}&t=${mtime}`;
  };

  const seasonUrls = {};
  for (const n of seasons) {
    const seasonFolder = findSeasonFolder(f, n);
    const pad = String(n).padStart(2, '0');
    seasonUrls[n] = seasonFolder
      ? encode(findExisting(seasonFolder, [`Season${pad}.jpg`, `Season${pad}.png`]))
      : null;
  }

  res.json({
    poster:    encode(findExisting(f, ['poster.jpg', 'poster.png'])),
    fanart:    encode(findExisting(f, ['fanart.jpg', 'art.jpg', 'backdrop.jpg', 'background.jpg'])),
    clearlogo: encode(findExisting(f, ['clearlogo.png', 'clearlogo.jpg', 'logo.png'])),
    seasons:   seasonUrls,
  });
});

router.post('/tv/:id/select', async (req, res) => {
  const show = getShowById(req.params.id);
  if (!show) return res.status(404).json({ error: 'Show not found' });

  const { selections } = req.body;

  try {
    const hasAny = ['poster', 'fanart', 'clearlogo'].some(k => selections?.[k]) ||
      Object.values(selections?.seasons ?? {}).some(Boolean);
    if (hasAny) await downloadTvSelections(show.folder_path, selections);
    markShowReviewed(show.id);
    res.json({ show: getNextPendingShow(), stats: getShowStats() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save artwork', detail: err.message });
  }
});

router.post('/tv/:id/skip', (req, res) => {
  markShowSkipped(req.params.id);
  res.json({ show: getNextPendingShow(), stats: getShowStats() });
});

router.post('/tv/scan', async (req, res) => {
  try {
    const result = await runTvScan();
    res.json({ ...result, stats: getShowStats() });
  } catch (err) {
    res.status(500).json({ error: 'TV scan failed', detail: err.message });
  }
});

router.post('/tv/options/mark-skipped-reviewed', (req, res) => {
  const updated = markShowSkippedAsReviewed();
  res.json({ updated, stats: getShowStats() });
});

// ─── Image Proxy ─────────────────────────────────────────────────────────────

// Image proxy — avoids CORS issues loading TMDB thumbnails in the browser
router.get('/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url param' });
  try {
    const upstream = await axios.get(url, {
      responseType: 'stream',
      timeout: 15000,
      headers: { 'User-Agent': 'MediaPosterReviewer/1.0' },
    });
    res.setHeader('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    upstream.data.pipe(res);
  } catch {
    res.status(502).send('Image unavailable');
  }
});

export default router;
