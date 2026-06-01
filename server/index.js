import 'dotenv/config';
import { networkInterfaces } from 'os';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { runScan } from './scanner.js';
import routes from './routes.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);

const PORT = process.env.PORT || 3001;

initDb();
runScan();
setInterval(() => runScan(), 30 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  const nets = Object.values(networkInterfaces()).flat();
  const lan  = nets.find(n => n.family === 'IPv4' && !n.internal);
  console.log(`Server listening:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  if (lan) console.log(`  Network: http://${lan.address}:${PORT}`);
});
