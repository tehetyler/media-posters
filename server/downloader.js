import axios from 'axios';
import { writeFile } from 'fs/promises';
import { join, extname } from 'path';

// selections: { poster?: downloadUrl, backdrop?: downloadUrl, clearlogo?: downloadUrl }
export async function downloadSelections(folderPath, selections) {
  const tasks = [];

  if (selections.poster) {
    tasks.push(saveImage(selections.poster, join(folderPath, 'poster.jpg')));
  }
  if (selections.backdrop) {
    tasks.push(saveImage(selections.backdrop, join(folderPath, 'backdrop.jpg')));
    tasks.push(saveImage(selections.backdrop, join(folderPath, 'fanart.jpg')));
  }
  if (selections.clearlogo) {
    // Preserve original extension (logos are often PNG with transparency)
    const ext = extname(new URL(selections.clearlogo).pathname) || '.png';
    tasks.push(saveImage(selections.clearlogo, join(folderPath, `clearlogo${ext}`)));
  }

  await Promise.all(tasks);
}

async function saveImage(url, destPath) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': 'MediaPosterReviewer/1.0' },
  });
  await writeFile(destPath, Buffer.from(response.data));
  console.log(`[download] Saved ${destPath}`);
}
