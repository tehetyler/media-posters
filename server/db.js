import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let db;

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
  `);
  // Migration: add tvdb_id to shows (no-op if column already exists)
  try { db.exec('ALTER TABLE shows ADD COLUMN tvdb_id TEXT'); } catch {}
}

function d() {
  if (!db) initDb();
  return db;
}

export function upsertMovies(movies) {
  const before = Number(d().prepare('SELECT COUNT(*) AS n FROM movies').get().n);

  const stmt = d().prepare(`
    INSERT INTO movies (tmdb_id, title, year, folder_path, nfo_path)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(folder_path) DO UPDATE SET
      tmdb_id  = excluded.tmdb_id,
      title    = excluded.title,
      year     = excluded.year,
      nfo_path = excluded.nfo_path
  `);

  d().exec('BEGIN');
  try {
    for (const m of movies) {
      stmt.run(m.tmdbId ?? null, m.title, m.year ?? null, m.folderPath, m.nfoPath);
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
    WHERE reviewed = 0 AND skipped = 0
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
    WHERE skipped = 1
  `).run();
  return result.changes;
}

export function getMovies() {
  return d().prepare(`
    SELECT
      id, tmdb_id, title, year, folder_path, reviewed, skipped, reviewed_at, added_at,
      CASE
        WHEN reviewed = 1 THEN 'reviewed'
        WHEN skipped  = 1 THEN 'skipped'
        ELSE 'pending'
      END AS status
    FROM movies
    ORDER BY title ASC
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
    INSERT INTO shows (tmdb_id, title, year, folder_path, seasons)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(folder_path) DO UPDATE SET
      title   = excluded.title,
      year    = excluded.year,
      seasons = excluded.seasons
  `);

  const resetStmt = d().prepare(
    'UPDATE shows SET reviewed = 0, skipped = 0, reviewed_at = NULL WHERE folder_path = ?'
  );

  let reset = 0;
  d().exec('BEGIN');
  try {
    for (const s of shows) {
      upsertStmt.run(s.tmdbId ?? null, s.title, s.year ?? null, s.folderPath, JSON.stringify(s.seasons ?? []));

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
  return d().prepare('SELECT * FROM shows WHERE tmdb_id IS NULL').all();
}

export function getShows() {
  return d().prepare(`
    SELECT
      id, tmdb_id, tvdb_id, title, year, folder_path, seasons, reviewed, skipped, reviewed_at, added_at,
      CASE
        WHEN reviewed = 1 THEN 'reviewed'
        WHEN skipped  = 1 THEN 'skipped'
        ELSE 'pending'
      END AS status
    FROM shows
    ORDER BY title ASC
  `).all();
}

export function getShowById(id) {
  return d().prepare('SELECT * FROM shows WHERE id = ?').get(Number(id)) ?? null;
}

export function getNextPendingShow() {
  return d().prepare(`
    SELECT * FROM shows
    WHERE reviewed = 0 AND skipped = 0
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
    WHERE skipped = 1
  `).run();
  return result.changes;
}

export function setShowTmdbId(id, tmdbId) {
  d().prepare('UPDATE shows SET tmdb_id = ? WHERE id = ?').run(tmdbId, Number(id));
}

export function setShowTvdbId(id, tvdbId) {
  d().prepare('UPDATE shows SET tvdb_id = ? WHERE id = ?').run(tvdbId, Number(id));
}

export function removeStaleMovies(currentFolderPaths) {
  const currentSet = new Set(currentFolderPaths);
  const existing = d().prepare('SELECT id, folder_path FROM movies').all();
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

export function removeStaleShows(currentFolderPaths) {
  const currentSet = new Set(currentFolderPaths);
  const existing = d().prepare('SELECT id, folder_path FROM shows').all();
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
