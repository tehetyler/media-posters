import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { upsertShows, getUnmatchedShows, setShowTmdbId, removeStaleShows } from './db.js';
import { searchTvShow } from './tmdb.js';

export async function runTvScan() {
  const tvDir = process.env.TV_SHOW_DIR;
  if (!tvDir) {
    console.warn('[tv-scan] TV_SHOW_DIR not set — skipping');
    return { found: 0, added: 0 };
  }

  const minPop = parseFloat(process.env.TV_MATCH_MIN_POPULARITY ?? '5');
  console.log(`[tv-scan] Scanning ${tvDir}…`);

  let entries;
  try {
    entries = readdirSync(tvDir);
  } catch {
    console.warn('[tv-scan] Cannot read TV_SHOW_DIR');
    return { found: 0, added: 0 };
  }

  const shows = [];
  for (const entry of entries) {
    const fullPath = join(tvDir, entry);
    let stat;
    try { stat = statSync(fullPath); } catch { continue; }
    if (!stat.isDirectory()) continue;

    const { title, year } = parseFolderName(entry);
    const seasons = detectSeasons(fullPath);
    console.log(`[tv-scan] Found: "${title}" — seasons: [${seasons.join(', ') || 'none'}]`);
    shows.push({ title, year, folderPath: fullPath, seasons });
  }

  const result = upsertShows(shows);
  const removed = removeStaleShows(shows.map(s => s.folderPath));

  // Auto-match TMDB for any shows still missing an ID
  const unmatched = getUnmatchedShows();
  for (const show of unmatched) {
    try {
      const candidates = await searchTvShow(show.title, show.year);
      if (candidates.length > 0 && candidates[0].popularity >= minPop) {
        setShowTmdbId(show.id, String(candidates[0].tmdbId));
        console.log(`[tv-scan] Auto-matched "${show.title}" → TMDB ${candidates[0].tmdbId} (pop: ${candidates[0].popularity.toFixed(1)})`);
      }
    } catch {
      // best-effort — leave unmatched on failure
    }
  }

  console.log(`[tv-scan] Done — ${result.found} shows found, ${result.added} added, ${removed} removed`);
  return { ...result, removed };
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
