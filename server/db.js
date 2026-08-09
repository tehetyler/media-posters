import { DatabaseSync } from 'node:sqlite';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { normalizeDir, isUnder } from './paths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let db;

// Rows belonging to a removed (disabled) library are hidden everywhere, but never
// deleted. Rows with no library at all stay visible so nothing silently vanishes.
const visible = (a = '') =>
  `(${a}library_id IS NULL OR ${a}library_id IN (SELECT id FROM libraries WHERE enabled = 1))`;

export function initDb() {
  db = new DatabaseSync(join(__dirname, 'data.db'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS movies (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_id     TEXT,
      title       TEXT NOT NULL,
      year        INTEGER,
      folder_path TEXT NOT NULL UNIQUE,
      nfo_path    TEXT NOT NULL,
      reviewed    INTEGER NOT NULL DEFAULT 0,
      skipped     INTEGER NOT NULL DEFAULT 0,
      reviewed_at DATETIME,
      added_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS scan_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      scanned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      found      INTEGER NOT NULL DEFAULT 0,
      added      INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS shows (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_id     TEXT,
      title       TEXT NOT NULL,
      year        INTEGER,
      folder_path TEXT NOT NULL UNIQUE,
      seasons     TEXT,
      reviewed    INTEGER NOT NULL DEFAULT 0,
      skipped     INTEGER NOT NULL DEFAULT 0,
      reviewed_at DATETIME,
      added_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tv_scan_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      scanned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      found      INTEGER NOT NULL DEFAULT 0,
      added      INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS libraries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      kind       TEXT NOT NULL,
      name       TEXT NOT NULL,
      path       TEXT NOT NULL UNIQUE,
      path_4k    TEXT,
      enabled    INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      added_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // Migrations — each is a no-op if the column already exists
  try { db.exec('ALTER TABLE shows  ADD COLUMN tvdb_id TEXT');       } catch {}
  try { db.exec('ALTER TABLE movies ADD COLUMN library_id INTEGER'); } catch {}
  try { db.exec('ALTER TABLE shows  ADD COLUMN library_id INTEGER'); } catch {}

  seedLibrariesFromEnv();
  backfillLibraryIds();
}

// One-time seed: the original single-directory .env config becomes the first
// library of each kind. Runs only while the table is empty, so edits made on the
// Options page afterwards are never overwritten by .env.
function seedLibrariesFromEnv() {
  const count = Number(db.prepare('SELECT COUNT(*) AS n FROM libraries').get().n);
  if (count > 0) return;

  const movieDir = normalizeDir(process.env.MOVIE_DIR);
  const tvDir    = normalizeDir(process.env.TV_SHOW_DIR);
  const dir4k    = normalizeDir(process.env.MOVIE_4K_DIR);

  const stmt = db.prepare(
    'INSERT INTO libraries (kind, name, path, path_4k, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  if (movieDir) { stmt.run('movie', 'Movies',   movieDir, dir4k ?? null, 0); console.log(`[db] Seeded movie library from MOVIE_DIR: ${movieDir}`); }
  if (tvDir)    { stmt.run('tv',    'TV Shows', tvDir,    null,          0); console.log(`[db] Seeded TV library from TV_SHOW_DIR: ${tvDir}`); }
}

// Tag any untagged movie/show with the library that owns its folder (longest
// matching path wins). Purely additive — no row is deleted or re-pathed.
function backfillLibraryIds() {
  const libs = db.prepare('SELECT id, kind, path FROM libraries').all();
  if (libs.length === 0) return;

  assign('movies', libs.filter(l => l.kind === 'movie'));
  assign('shows',  libs.filter(l => l.kind === 'tv'));

  function assign(table, candidates) {
    if (candidates.length === 0) return;
    const rows = db.prepare(`SELECT id, folder_path FROM ${table} WHERE library_id IS NULL`).all();
    if (rows.length === 0) return;

    const stmt = db.prepare(`UPDATE ${table} SET library_id = ? WHERE id = ?`);
    let tagged = 0;
    db.exec('BEGIN');
    try {
      for (const row of rows) {
        let best = null;
        for (const lib of candidates) {
          if (isUnder(row.folder_path, lib.path) && (!best || lib.path.length > best.path.length)) best = lib;
        }
        if (best) { stmt.run(best.id, row.id); tagged++; }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    if (tagged > 0) console.log(`[db] Tagged ${tagged} ${table} row(s) with their library`);
  }
}

// ── Libraries ─────────────────────────────────────────────────────────────────

export function getLibraries({ kind, enabledOnly = false } = {}) {
  const where = [];
  const params = [];
  if (kind)        { where.push('kind = ?'); params.push(kind); }
  if (enabledOnly) { where.push('enabled = 1'); }
  return d().prepare(`
    SELECT * FROM libraries
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY sort_order ASC, id ASC
  `).all(...params);
}

export function getLibraryById(id) {
  return d().prepare('SELECT * FROM libraries WHERE id = ?').get(Number(id)) ?? null;
}

export function findLibraryByPath(path) {
  const p = normalizeDir(path);
  if (!p) return null;
  // SQLite compares TEXT case-sensitively; do the platform-aware match in JS
  return d().prepare('SELECT * FROM libraries').all()
    .find(l => isUnder(l.path, p) && isUnder(p, l.path)) ?? null;
}

export function insertLibrary({ kind, name, path, path4k }) {
  const p = normalizeDir(path);
  const nextOrder = Number(
    d().prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM libraries WHERE kind = ?').get(kind).n
  );
  d().prepare(
    'INSERT INTO libraries (kind, name, path, path_4k, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(kind, name?.trim() || basename(p) || p, p, normalizeDir(path4k), nextOrder);
  return findLibraryByPath(p);
}

// Partial update — only the keys present in `fields` are written
export function updateLibrary(id, fields) {
  const sets = [];
  const params = [];
  if (fields.name    !== undefined) { sets.push('name = ?');    params.push(String(fields.name).trim()); }
  if (fields.path    !== undefined) { sets.push('path = ?');    params.push(normalizeDir(fields.path)); }
  if (fields.path4k  !== undefined) { sets.push('path_4k = ?'); params.push(normalizeDir(fields.path4k)); }
  if (fields.enabled !== undefined) { sets.push('enabled = ?'); params.push(fields.enabled ? 1 : 0); }
  if (sets.length > 0) {
    d().prepare(`UPDATE libraries SET ${sets.join(', ')} WHERE id = ?`).run(...params, Number(id));
  }
  return getLibraryById(id);
}

// How many movies/shows each library owns — shown on the Options page so it is
// clear what a removal would hide (and what a restore brings back).
export function getLibraryItemCounts() {
  const counts = {};
  for (const table of ['movies', 'shows']) {
    for (const row of d().prepare(
      `SELECT library_id, COUNT(*) AS n FROM ${table} WHERE library_id IS NOT NULL GROUP BY library_id`
    ).all()) {
      counts[row.library_id] = Number(row.n);
    }
  }
  return counts;
}

// Movies/shows whose folder no longer sits under any configured library
export function getUntaggedCounts() {
  return {
    movies: Number(d().prepare('SELECT COUNT(*) AS n FROM movies WHERE library_id IS NULL').get().n),
    shows:  Number(d().prepare('SELECT COUNT(*) AS n FROM shows  WHERE library_id IS NULL').get().n),
  };
}

function d() {
  if (!db) initDb();
  return db;
}

export function upsertMovies(movies) {
  const before = Number(d().prepare('SELECT COUNT(*) AS n FROM movies').get().n);

  const stmt = d().prepare(`
    INSERT INTO movies (tmdb_id, title, year, folder_path, nfo_path, library_id)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(folder_path) DO UPDATE SET
      tmdb_id    = excluded.tmdb_id,
      title      = excluded.title,
      year       = excluded.year,
      nfo_path   = excluded.nfo_path,
      library_id = excluded.library_id
  `);

  d().exec('BEGIN');
  try {
    for (const m of movies) {
      stmt.run(m.tmdbId ?? null, m.title, m.year ?? null, m.folderPath, m.nfoPath, m.libraryId ?? null);
    }
    d().exec('COMMIT');
  } catch (err) {
    d().exec('ROLLBACK');
    throw err;
  }

  const after  = Number(d().prepare('SELECT COUNT(*) AS n FROM movies').get().n);
  const added  = after - before;

  d().prepare('INSERT INTO scan_log (found, added) VALUES (?, ?)').run(movies.length, added);
  return { found: movies.length, added };
}

export function getNextPending() {
  return d().prepare(`
    SELECT * FROM movies
    WHERE reviewed = 0 AND skipped = 0 AND ${visible()}
    ORDER BY added_at ASC, title ASC
    LIMIT 1
  `).get() ?? null;
}

export function getMovieById(id) {
  return d().prepare('SELECT * FROM movies WHERE id = ?').get(Number(id)) ?? null;
}

export function markReviewed(id) {
  d().prepare(
    'UPDATE movies SET reviewed = 1, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(Number(id));
}

export function markSkipped(id) {
  d().prepare('UPDATE movies SET skipped = 1 WHERE id = ?').run(Number(id));
}

export function markSkippedAsReviewed() {
  const result = d().prepare(`
    UPDATE movies SET skipped = 0, reviewed = 1, reviewed_at = CURRENT_TIMESTAMP
    WHERE skipped = 1 AND ${visible()}
  `).run();
  return result.changes;
}

export function markSkippedAsPending() {
  const result = d().prepare(`
    UPDATE movies SET skipped = 0, reviewed = 0, reviewed_at = NULL
    WHERE skipped = 1 AND ${visible()}
  `).run();
  return result.changes;
}

export function getMovies() {
  return d().prepare(`
    SELECT
      m.id, m.tmdb_id, m.title, m.year, m.folder_path, m.reviewed, m.skipped,
      m.reviewed_at, m.added_at, m.library_id, l.name AS library_name,
      CASE
        WHEN m.reviewed = 1 THEN 'reviewed'
        WHEN m.skipped  = 1 THEN 'skipped'
        ELSE 'pending'
      END AS status
    FROM movies m
    LEFT JOIN libraries l ON l.id = m.library_id
    WHERE ${visible('m.')}
    ORDER BY m.title ASC
  `).all();
}

export function getStats() {
  const counts = d().prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN reviewed = 0 AND skipped = 0 THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN reviewed = 1 THEN 1 ELSE 0 END) AS reviewed,
      SUM(CASE WHEN skipped  = 1 THEN 1 ELSE 0 END) AS skipped
    FROM movies
    WHERE ${visible()}
  `).get();
  const scan = d().prepare(
    'SELECT scanned_at FROM scan_log ORDER BY id DESC LIMIT 1'
  ).get();
  return {
    total:    Number(counts.total),
    pending:  Number(counts.pending),
    reviewed: Number(counts.reviewed),
    skipped:  Number(counts.skipped),
    lastScan: scan?.scanned_at ?? null,
  };
}

// ── TV Shows ──────────────────────────────────────────────────────────────────

export function upsertShows(shows) {
  const before = Number(d().prepare('SELECT COUNT(*) AS n FROM shows').get().n);

  // Snapshot existing seasons before updating so we can detect additions
  const existingRows = d().prepare('SELECT folder_path, seasons FROM shows').all();
  const existingSeasons = new Map(
    existingRows.map(r => [r.folder_path, JSON.parse(r.seasons ?? '[]')])
  );

  const upsertStmt = d().prepare(`
    INSERT INTO shows (tmdb_id, title, year, folder_path, seasons, library_id)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(folder_path) DO UPDATE SET
      title      = excluded.title,
      year       = excluded.year,
      seasons    = excluded.seasons,
      library_id = excluded.library_id
  `);

  const resetStmt = d().prepare(
    'UPDATE shows SET reviewed = 0, skipped = 0, reviewed_at = NULL WHERE folder_path = ?'
  );

  let reset = 0;
  d().exec('BEGIN');
  try {
    for (const s of shows) {
      upsertStmt.run(s.tmdbId ?? null, s.title, s.year ?? null, s.folderPath, JSON.stringify(s.seasons ?? []), s.libraryId ?? null);

      // If this is an existing show and new season numbers appeared, reset to pending
      const prev = existingSeasons.get(s.folderPath);
      if (prev !== undefined) {
        const hasNewSeason = (s.seasons ?? []).some(n => !prev.includes(n));
        if (hasNewSeason) { resetStmt.run(s.folderPath); reset++; }
      }
    }
    d().exec('COMMIT');
  } catch (err) {
    d().exec('ROLLBACK');
    throw err;
  }

  const after = Number(d().prepare('SELECT COUNT(*) AS n FROM shows').get().n);
  const added = after - before;

  d().prepare('INSERT INTO tv_scan_log (found, added) VALUES (?, ?)').run(shows.length, added);
  return { found: shows.length, added, reset };
}

export function getUnmatchedShows() {
  return d().prepare(`SELECT * FROM shows WHERE tmdb_id IS NULL AND ${visible()}`).all();
}

export function getShows() {
  return d().prepare(`
    SELECT
      s.id, s.tmdb_id, s.tvdb_id, s.title, s.year, s.folder_path, s.seasons,
      s.reviewed, s.skipped, s.reviewed_at, s.added_at, s.library_id, l.name AS library_name,
      CASE
        WHEN s.reviewed = 1 THEN 'reviewed'
        WHEN s.skipped  = 1 THEN 'skipped'
        ELSE 'pending'
      END AS status
    FROM shows s
    LEFT JOIN libraries l ON l.id = s.library_id
    WHERE ${visible('s.')}
    ORDER BY s.title ASC
  `).all();
}

export function getShowById(id) {
  return d().prepare('SELECT * FROM shows WHERE id = ?').get(Number(id)) ?? null;
}

export function getNextPendingShow() {
  return d().prepare(`
    SELECT * FROM shows
    WHERE reviewed = 0 AND skipped = 0 AND ${visible()}
    ORDER BY added_at ASC, title ASC
    LIMIT 1
  `).get() ?? null;
}

export function markShowReviewed(id) {
  d().prepare(
    'UPDATE shows SET reviewed = 1, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(Number(id));
}

export function markShowSkipped(id) {
  d().prepare('UPDATE shows SET skipped = 1 WHERE id = ?').run(Number(id));
}

export function markShowSkippedAsReviewed() {
  const result = d().prepare(`
    UPDATE shows SET skipped = 0, reviewed = 1, reviewed_at = CURRENT_TIMESTAMP
    WHERE skipped = 1 AND ${visible()}
  `).run();
  return result.changes;
}

export function markShowSkippedAsPending() {
  const result = d().prepare(`
    UPDATE shows SET skipped = 0, reviewed = 0, reviewed_at = NULL
    WHERE skipped = 1 AND ${visible()}
  `).run();
  return result.changes;
}

export function setMovieTmdbId(id, tmdbId) {
  d().prepare('UPDATE movies SET tmdb_id = ? WHERE id = ?').run(tmdbId, Number(id));
}

export function setShowTmdbId(id, tmdbId) {
  d().prepare('UPDATE shows SET tmdb_id = ? WHERE id = ?').run(tmdbId, Number(id));
}

export function setShowTvdbId(id, tvdbId) {
  d().prepare('UPDATE shows SET tvdb_id = ? WHERE id = ?').run(tvdbId, Number(id));
}

export function getProcessedMovieFolders() {
  return new Set(
    d().prepare('SELECT folder_path FROM movies WHERE reviewed = 1 OR skipped = 1').all()
      .map(r => r.folder_path)
  );
}

// Only rows belonging to libraries that actually scanned successfully are
// eligible for removal. A library that failed to read (offline drive, renamed
// folder) is left completely untouched rather than wiped.
export function removeStaleMovies(currentFolderPaths, scannedLibraryIds) {
  if (!scannedLibraryIds?.length) return 0;
  const currentSet = new Set(currentFolderPaths);
  const placeholders = scannedLibraryIds.map(() => '?').join(', ');
  const existing = d()
    .prepare(`SELECT id, folder_path FROM movies WHERE library_id IN (${placeholders})`)
    .all(...scannedLibraryIds);
  const toRemove = existing.filter(m => !currentSet.has(m.folder_path));
  if (toRemove.length === 0) return 0;
  const stmt = d().prepare('DELETE FROM movies WHERE id = ?');
  d().exec('BEGIN');
  try {
    for (const m of toRemove) stmt.run(m.id);
    d().exec('COMMIT');
  } catch (err) {
    d().exec('ROLLBACK');
    throw err;
  }
  console.log(`[db] Removed ${toRemove.length} stale movie(s)`);
  return toRemove.length;
}

export function removeStaleShows(currentFolderPaths, scannedLibraryIds) {
  if (!scannedLibraryIds?.length) return 0;
  const currentSet = new Set(currentFolderPaths);
  const placeholders = scannedLibraryIds.map(() => '?').join(', ');
  const existing = d()
    .prepare(`SELECT id, folder_path FROM shows WHERE library_id IN (${placeholders})`)
    .all(...scannedLibraryIds);
  const toRemove = existing.filter(s => !currentSet.has(s.folder_path));
  if (toRemove.length === 0) return 0;
  const stmt = d().prepare('DELETE FROM shows WHERE id = ?');
  d().exec('BEGIN');
  try {
    for (const s of toRemove) stmt.run(s.id);
    d().exec('COMMIT');
  } catch (err) {
    d().exec('ROLLBACK');
    throw err;
  }
  console.log(`[db] Removed ${toRemove.length} stale show(s)`);
  return toRemove.length;
}

export function getShowStats() {
  const counts = d().prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN reviewed = 0 AND skipped = 0 THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN reviewed = 1 THEN 1 ELSE 0 END) AS reviewed,
      SUM(CASE WHEN skipped  = 1 THEN 1 ELSE 0 END) AS skipped
    FROM shows
    WHERE ${visible()}
  `).get();
  const scan = d().prepare(
    'SELECT scanned_at FROM tv_scan_log ORDER BY id DESC LIMIT 1'
  ).get();
  return {
    total:    Number(counts.total),
    pending:  Number(counts.pending),
    reviewed: Number(counts.reviewed),
    skipped:  Number(counts.skipped),
    lastScan: scan?.scanned_at ?? null,
  };
}
