import axios from 'axios';
import { writeFile } from 'fs/promises';
import { readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// selections: { poster?, fanart?, clearlogo?, seasons?: { [n]: url } }
export async function downloadTvSelections(folderPath, selections) {
  const tasks = [];

  if (selections.poster) {
    tasks.push(saveImage(selections.poster, join(folderPath, 'poster.jpg')));
  }
  if (selections.fanart) {
    tasks.push(saveImage(selections.fanart, join(folderPath, 'fanart.jpg')));
    tasks.push(saveImage(selections.fanart, join(folderPath, 'backdrop.jpg')));
  }
  if (selections.clearlogo) {
    const ext = extname(new URL(selections.clearlogo).pathname) || '.png';
    tasks.push(saveImage(selections.clearlogo, join(folderPath, `clearlogo${ext}`)));
  }
  for (const [nStr, url] of Object.entries(selections.seasons ?? {})) {
    if (!url) continue;
    const n = parseInt(nStr);
    const seasonFolder = findSeasonFolder(folderPath, n);
    const filename = `Season${String(n).padStart(2, '0')}.jpg`;
    const dest = seasonFolder
      ? join(seasonFolder, filename)
      : join(folderPath, filename); // fallback to show root if no season folder found
    tasks.push(saveImage(url, dest));
  }

  await Promise.all(tasks);
}

// Find the season subfolder matching the given season number.
// Handles names like "Friends Season 01", "Season 1", "Specials", etc.
export function findSeasonFolder(showPath, seasonNumber) {
  let entries;
  try { entries = readdirSync(showPath); } catch { return null; }

  for (const entry of entries) {
    try {
      if (!statSync(join(showPath, entry)).isDirectory()) continue;
    } catch { continue; }

    if (seasonNumber === 0) {
      if (/specials?$/i.test(entry) || /(?:season|series)[\s._-]*0+$/i.test(entry)) {
        return join(showPath, entry);
      }
    } else {
      const m = entry.match(/(?:season|series)[\s._-]*(\d+)$/i);
      if (m && parseInt(m[1]) === seasonNumber) return join(showPath, entry);
    }
  }
  return null;
}

async function saveImage(url, destPath) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': 'MediaPosterReviewer/1.0' },
  });
  await writeFile(destPath, Buffer.from(response.data));
  console.log(`[tv-download] Saved ${destPath}`);
}
