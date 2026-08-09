import { readdirSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';
import { getProcessedMovieFolders, getLibraries } from './db.js';

const SUFFIX_RE = /[\s._\-[(]*(4k|2160p|uhd)[\s._\-\])]*/gi;

function normalize(name) {
  return name.replace(SUFFIX_RE, '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function subdirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
}

function findExisting(folder, names) {
  for (const name of names) {
    const p = join(folder, name);
    if (existsSync(p)) return { name, path: p };
  }
  return null;
}

export function sync4kArtwork() {
  const libraries = getLibraries({ kind: 'movie', enabledOnly: true }).filter(l => l.path_4k);
  if (libraries.length === 0) {
    throw new Error('No movie library has a 4K directory configured — set one on the Options page');
  }

  const processedFolders = getProcessedMovieFolders();
  const results = libraries.map(lib => ({
    name: lib.name,
    ...syncLibrary(lib.path, lib.path_4k, processedFolders),
  }));

  const totals = results.reduce((acc, r) => ({
    scanned:   acc.scanned + r.scanned,
    matched:   acc.matched + r.matched,
    copied:    acc.copied  + r.copied,
    pending:   acc.pending + r.pending,
    unmatched: acc.unmatched + r.unmatched.length,
  }), { scanned: 0, matched: 0, copied: 0, pending: 0, unmatched: 0 });

  return { totals, libraries: results };
}

function syncLibrary(dirMain, dir4k, processedFolders) {
  const mainFolders = subdirs(dirMain);
  const mainIndex   = new Map(mainFolders.map(f => [normalize(f), f]));

  const folders4k  = subdirs(dir4k);
  let matched = 0, copied = 0;
  const unmatched = [];
  const pending   = [];

  for (const folder4k of folders4k) {
    const key        = normalize(folder4k);
    const mainFolder = mainIndex.get(key);

    if (!mainFolder) {
      unmatched.push(folder4k);
      continue;
    }

    const srcPath = join(dirMain, mainFolder);
    if (!processedFolders.has(srcPath)) {
      pending.push(folder4k);
      continue;
    }

    matched++;
    const src  = srcPath;
    const dest = join(dir4k, folder4k);

    // poster
    const poster = findExisting(src, ['poster.jpg', 'poster.png', 'poster.webp']);
    if (poster) { copyFileSync(poster.path, join(dest, 'poster.jpg')); copied++; }

    // backdrop + fanart (same source file, two destinations)
    const backdrop = findExisting(src, ['backdrop.jpg', 'fanart.jpg', 'backdrop.png']);
    if (backdrop) {
      copyFileSync(backdrop.path, join(dest, 'backdrop.jpg'));
      copyFileSync(backdrop.path, join(dest, 'fanart.jpg'));
      copied++;
    }

    // clearlogo (preserve extension)
    const logo = findExisting(src, ['clearlogo.png', 'clearlogo.jpg', 'clearlogo.svg']);
    if (logo) { copyFileSync(logo.path, join(dest, logo.name)); copied++; }
  }

  return { scanned: folders4k.length, matched, copied, unmatched, pending: pending.length };
}
