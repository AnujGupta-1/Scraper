import express from 'express';
import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import cors from 'cors';
import { scrapeGreyhoundRaceList } from './src/greyhoundRaceListScraper.js';
import { runRaceDetailsScraper } from './src/raceDetailsScraper.js';

const STATUS_FILE = path.resolve('./logs/scheduler-status.json');

const app = express();
app.use(cors());

const EXPORTS_DIR = path.resolve('./exports');

function getTodayDate() {
  const today = new Date();
  return today.toISOString().slice(0,10);
}

// Endpoint: Get today's race list
app.get('/api/race-list', (req, res) => {
  const today = getTodayDate();
  const file = path.join(EXPORTS_DIR, today, 'greyhound-races.csv');
  const results = [];
  if (!fs.existsSync(file)) return res.json([]);
  fs.createReadStream(file)
    .pipe(csvParser())
    .on('data', row => results.push(row))
    .on('end', () => res.json(results))
    .on('error', () => res.json([]));
});

// Endpoint: Get today's latest race details (first file found)
app.get('/api/race-details', (req, res) => {
  const today = getTodayDate();
  const dir = path.join(EXPORTS_DIR, today);
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('race-details-') && f.endsWith('.csv'))
    .sort((a, b) => fs.statSync(path.join(dir, b)).mtime - fs.statSync(path.join(dir, a)).mtime);
  if (!files.length) return res.json([]);
  const file = path.join(dir, files[0]);
  const results = [];
  fs.createReadStream(file)
    .pipe(csvParser())
    .on('data', row => results.push(row))
    .on('end', () => res.json(results))
    .on('error', () => res.json([]));
});

// Endpoint: Get today's results
app.get('/api/results', (req, res) => {
  const today = getTodayDate();
  const file = path.join(EXPORTS_DIR, today, 'results.csv');
  const results = [];
  if (!fs.existsSync(file)) return res.json([]);
  fs.createReadStream(file)
    .pipe(csvParser())
    .on('data', row => results.push(row))
    .on('end', () => res.json(results))
    .on('error', () => res.json([]));
});

// Scheduler status endpoint (stub)
app.get('/api/scheduler-status', (req, res) => {
  if (fs.existsSync(STATUS_FILE)) {
    const data = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    res.json(data);
  } else {
    res.json({
      running: false,
      raceListLastRun: null,
      raceListNextRun: null,
      raceListLastError: 'No status yet',
      detailsLastRun: null,
      detailsNextRun: null,
      detailsLastError: 'No status yet'
    });
  }
});

app.post('/api/trigger-scrape', async (req, res) => {
  try {
    // Run race list scraper first
    await scrapeGreyhoundRaceList();

    // Then run race details scraper
    await runRaceDetailsScraper();

    res.json({ message: 'Manual scrape (race list + details) completed successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to trigger manual scrape.' });
  }
});

app.get('/api/race-list', (req, res) => {
  const date = req.query.date || getTodayDate();
  // Use 'date' instead of today's date when building path!
});


const PORT = 4000;
app.listen(PORT, () => console.log(`API server running at http://localhost:${PORT}`));
