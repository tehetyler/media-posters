import { resolve, sep } from 'path';

const CASE_INSENSITIVE = process.platform === 'win32';

// Absolute path with any trailing separator stripped — the canonical form
// stored in the libraries table and compared against everywhere else.
export function normalizeDir(p) {
  if (!p) return null;
  let r = resolve(String(p).trim());
  while (r.length > 1 && r.endsWith(sep)) r = r.slice(0, -1);
  return r;
}

function cmpKey(p) {
  return CASE_INSENSITIVE ? p.toLowerCase() : p;
}

// True when `child` is `parent` itself or lives underneath it
export function isUnder(child, parent) {
  if (!child || !parent) return false;
  const c = cmpKey(normalizeDir(child));
  const p = cmpKey(normalizeDir(parent));
  return c === p || c.startsWith(p + sep);
}

// True when either path contains the other — used to reject overlapping libraries
export function pathsConflict(a, b) {
  return isUnder(a, b) || isUnder(b, a);
}
