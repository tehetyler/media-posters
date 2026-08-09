import { readdirSync, statSync, readFileSync } from 'fs';
import { join, dirname, extname } from 'path';
import { upsertMovies, removeStaleMovies, getLibraries } from './db.js';

export function runScan() {
  const libraries = getLibraries({ kind: 'movie', enabledOnly: true });
  if (libraries.length === 0) {
    console.warn('[scan] No movie libraries configured — skipping scan');
    return { found: 0, added: 0, removed: 0, failed: [] };
  }

  const movies = [];
  const scannedLibraryIds = [];
  const failed = [];

  for (const lib of libraries) {
    // A library whose root cannot be read is skipped entirely — treating an
    // offline drive as "empty" would delete its whole review history below.
    try {
      readdirSync(lib.path);
    } catch {
      console.warn(`[scan] Cannot read "${lib.name}" (${lib.path}) — skipping, nothing removed`);
      failed.push({ id: lib.id, name: lib.name, path: lib.path });
      continue;
    }

    console.log(`[scan] Scanning ${lib.name} — ${lib.path}…`);
    const nfoPaths = [];
    collectNfoFiles(lib.path, nfoPaths);

    let count = 0;
    for (const nfoPath of nfoPaths) {
      const parsed = parseNfo(nfoPath);
      if (parsed) { movies.push({ ...parsed, libraryId: lib.id }); count++; }
    }
    scannedLibraryIds.push(lib.id);
    console.log(`[scan] ${lib.name}: ${count} movie NFO(s)`);
  }

  const result = upsertMovies(movies);
  const removed = removeStaleMovies(movies.map(m => m.folderPath), scannedLibraryIds);
  console.log(`[scan] Done — ${result.found} NFOs found, ${result.added} added, ${removed} removed`);
  return { ...result, removed, failed };
}

// Recursively collect all .nfo files under a directory
function collectNfoFiles(dir, results) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return; // skip inaccessible directories
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      collectNfoFiles(fullPath, results);
    } else if (extname(entry).toLowerCase() === '.nfo') {
      results.push(fullPath);
    }
  }
}

function parseNfo(nfoPath) {
  let content;
  try {
    content = readFileSync(nfoPath, 'utf-8');
  } catch {
    return null;
  }

  // Only process movie NFOs — skip TV show and episode files
  if (!/<movie[\s>]/i.test(content)) return null;

  const title = extractTag(content, 'title');
  if (!title) return null;

  const year    = parseInt(extractTag(content, 'year') ?? '') || null;
  const tmdbId  = extractTmdbId(content);
  const folderPath = dirname(nfoPath);

  return { title, year, tmdbId, nfoPath, folderPath };
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'));
  return m?.[1]?.trim() ?? null;
}

function extractTmdbId(xml) {
  // <tmdbid>12345</tmdbid>
  let m = xml.match(/<tmdbid>(\d+)<\/tmdbid>/i);
  if (m) return m[1];

  // <uniqueid type="tmdb" default="true">12345</uniqueid>
  m = xml.match(/<uniqueid[^>]+type=["']tmdb["'][^>]*>(\d+)<\/uniqueid>/i);
  if (m) return m[1];

  // <uniqueid type="tmdb">12345</uniqueid> (without default attr)
  m = xml.match(/<uniqueid[^>]*>(\d+)<\/uniqueid>/i);
  if (m) return m[1];

  return null;
}
