import 'dotenv/config';
import { networkInterfaces } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { runScan } from './scanner.js';
import { runTvScan } from './tvscanner.js';
import routes from './routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);

// In production, serve the built React client from the same port
const clientDist = join(__dirname, '..', 'client', 'dist');
if (existsSync(join(clientDist, 'index.html'))) {
  // Service worker must never be cached — stale SW breaks PWA install
  app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(join(clientDist, 'sw.js'));
  });

  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(join(clientDist, 'index.html')));
  console.log('[server] Serving production client build');
}

const PORT = process.env.PORT || 3001;

initDb();
runScan();
runTvScan().catch(err => console.warn('[tv-scan] Startup scan failed:', err.message));
setInterval(() => runScan(), 30 * 60 * 1000);
setInterval(() => runTvScan().catch(() => {}), 30 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  const nets = Object.values(networkInterfaces()).flat();
  const lan  = nets.find(n => n.family === 'IPv4' && !n.internal);
  console.log(`Server listening:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  if (lan) console.log(`  Network: http://${lan.address}:${PORT}`);
});
