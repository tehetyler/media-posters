import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { upsertShows, getUnmatchedShows, setShowMatch, removeStaleShows, getLibraries } from './db.js';
import { searchTvShow } from './tmdb.js';

export async function runTvScan() {
  const libraries = getLibraries({ kind: 'tv', enabledOnly: true });
  if (libraries.length === 0) {
    console.warn('[tv-scan] No TV libraries configured — skipping');
    return { found: 0, added: 0, removed: 0, reset: 0, failed: [] };
  }

  const minPop = parseFloat(process.env.TV_MATCH_MIN_POPULARITY ?? '5');
  const shows = [];
  const scannedLibraryIds = [];
  const failed = [];

  for (const lib of libraries) {
    let entries;
    // Skip unreadable libraries so an offline drive never looks like an empty one
    try {
      entries = readdirSync(lib.path);
    } catch {
      console.warn(`[tv-scan] Cannot read "${lib.name}" (${lib.path}) — skipping, nothing removed`);
      failed.push({ id: lib.id, name: lib.name, path: lib.path });
      continue;
    }

    console.log(`[tv-scan] Scanning ${lib.name} — ${lib.path}…`);
    for (const entry of entries) {
      const fullPath = join(lib.path, entry);
      let stat;
      try { stat = statSync(fullPath); } catch { continue; }
      if (!stat.isDirectory()) continue;
      if (entry === '.grab') continue;

      const { title, year } = parseFolderName(entry);
      const seasons = detectSeasons(fullPath);
      console.log(`[tv-scan] Found: "${title}" — seasons: [${seasons.join(', ') || 'none'}]`);
      shows.push({ title, year, folderPath: fullPath, seasons, libraryId: lib.id });
    }
    scannedLibraryIds.push(lib.id);
  }

  const result = upsertShows(shows);
  const removed = removeStaleShows(shows.map(s => s.folderPath), scannedLibraryIds);

  // Auto-match TMDB for any shows still missing an ID
  const unmatched = getUnmatchedShows();
  for (const show of unmatched) {
    try {
      const candidates = await searchTvShow(show.title, show.year);
      if (candidates.length > 0 && candidates[0].popularity >= minPop) {
        setShowMatch(show.id, { tmdbId: String(candidates[0].tmdbId) });
        console.log(`[tv-scan] Auto-matched "${show.title}" → TMDB ${candidates[0].tmdbId} (pop: ${candidates[0].popularity.toFixed(1)})`);
      }
    } catch {
      // best-effort — leave unmatched on failure
    }
  }

  console.log(`[tv-scan] Done — ${result.found} shows found, ${result.added} added, ${removed} removed`);
  return { ...result, removed, failed };
}

function parseFolderName(name) {
  const m = name.match(/^(.+?)\s*\((\d{4})\)\s*$/);
  if (m) return { title: m[1].trim(), year: parseInt(m[2]) };
  return { title: name.trim(), year: null };
}

function detectSeasons(showPath) {
  let entries;
  try { entries = readdirSync(showPath); } catch { return []; }

  const seasons = new Set();
  for (const entry of entries) {
    let stat;
    try { stat = statSync(join(showPath, entry)); } catch { continue; }
    if (!stat.isDirectory()) continue;

    // Match: "Season 1", "Friends Season 01", "Series 2", etc. — show name prefix allowed
    const m = entry.match(/(?:season|series)[\s._-]*(\d+)$/i);
    if (m) { seasons.add(parseInt(m[1])); continue; }
    // Season 0 aliases: "Specials", "Friends Specials", "Season 0", etc.
    if (/specials?$/i.test(entry) || /(?:season|series)[\s._-]*0+$/i.test(entry)) { seasons.add(0); }
  }

  return [...seasons].sort((a, b) => a - b);
}
