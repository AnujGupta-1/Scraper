import cron from 'node-cron';
import { scrapeGreyhoundRaceList } from './greyhoundRaceListScraper.js';
import { runRaceDetailsScraper } from './raceDetailsScraper.js';
import { scrapeResults } from './greyhoundResultsScraper.js'; // Use your correct export name!
import logger from './scraperLogger.js';

import fs from 'fs';
import path from 'path';

// Day.js and plugins
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';


dayjs.extend(utc);
dayjs.extend(timezone);

const STATUS_FILE = path.resolve('logs/scheduler-status.json');

// --- Helper: Get current time in AEST ---
function getAESTTime() {
  return dayjs().tz('Australia/Brisbane');
}

// --- Helper: Write status file, merging previous state ---
function writeStatus(update) {
  let current = {};
  if (fs.existsSync(STATUS_FILE)) {
    try {
      current = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    } catch {}
  }
  const merged = { ...current, ...update };
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(merged, null, 2));
  } catch (err) {
    // Optionally, log error
  }
}

// --- Helper: Get next run for each cron expression ---
import cronParser from 'cron-parser';

const raceListCron = '0 9 * * *';        // 9:00 AM daily
const detailsCron = '0 * * * *';         // Every hour at :00, 9AM to 11PM
const resultsCron = '58 23 * * *';       // 23:58 daily

function getNextRun(cronExpr, tz) {
  try {
    const interval = cronParser.parseExpression(cronExpr, { tz });
    return dayjs(interval.next().toISOString()).tz(tz).format('YYYY-MM-DD HH:mm:ss');
  } catch {
    return null;
  }
}
function getAllNextRuns() {
  return {
    raceListNextRun: getNextRun(raceListCron, 'Australia/Brisbane'),
    detailsNextRun: getNextRun(detailsCron, 'Australia/Brisbane'),
    resultsNextRun: getNextRun(resultsCron, 'Australia/Brisbane'),
  };
}

// --- Concurrency guards ---
let isRaceDetailsScraping = false;
let isRaceListScraping = false;
let isResultsScraping = false;

// --- Retry helper ---
async function runWithRetry(fn, maxAttempts = 2, name = 'Task') {
  let attempt = 1;
  while (attempt <= maxAttempts) {
    try {
      await fn();
      return true;
    } catch (err) {
      logger.error(`[Scheduler] ❌ ${name} failed (attempt ${attempt}): ${err.message}`);
      if (attempt === maxAttempts) throw err;
      attempt++;
      await new Promise(res => setTimeout(res, 2000)); // 2 sec pause before retry
    }
  }
}

// --- Race List Scraper Schedule ---
cron.schedule(raceListCron, async () => {
  if (isRaceListScraping) {
    logger.warn(`[Scheduler] Race list scrape already running. Skipping.`);
    return;
  }
  isRaceListScraping = true;
  const now = getAESTTime();
  logger.info(`[Scheduler][DEBUG] Now in AEST: ${now.format()} | Hour: ${now.hour()}`);
  try {
    await runWithRetry(scrapeGreyhoundRaceList, 2, 'scrapeGreyhoundRaceList');
    logger.info(`[Scheduler] ✅ scrapeGreyhoundRaceList() completed successfully`);
    let prev = {};
    if (fs.existsSync(STATUS_FILE)) {
      prev = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    }
    writeStatus({
      ...prev,
      running: true,
      ...getAllNextRuns(),
      raceListLastRun: now.format('YYYY-MM-DD HH:mm:ss'),
      raceListLastError: null
    });
  } catch (err) {
    logger.error(`[Scheduler] ❌ scrapeGreyhoundRaceList() failed after retries`);
    let prev = {};
    if (fs.existsSync(STATUS_FILE)) {
      prev = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    }
    writeStatus({
      ...prev,
      running: true,
      ...getAllNextRuns(),
      raceListLastRun: now.format('YYYY-MM-DD HH:mm:ss'),
      raceListLastError: err.message
    });
  } finally {
    isRaceListScraping = false;
  }
}, {
  timezone: 'Australia/Brisbane'
});

// --- Race Details Scraper Schedule ---
cron.schedule(detailsCron, async () => {
  const now = getAESTTime();
  const hour = now.hour();
  logger.info(`[Scheduler][DEBUG] Now in AEST: ${now.format()} | Hour: ${hour}`);
  if (hour < 9 || hour > 23) {
    logger.info(`[Scheduler] ⏸ Skipped runRaceDetailsScraper() before 9AM or after 11PM AEST`);
    return;
  }
  if (isRaceDetailsScraping) {
    logger.warn(`[Scheduler] Previous runRaceDetailsScraper() still running. Skipping this cycle.`);
    return;
  }
  isRaceDetailsScraping = true;
  logger.info(`[Scheduler] ⏰ runRaceDetailsScraper() triggered at ${now.format('YYYY-MM-DD HH:mm:ss')}`);
  try {
    await runWithRetry(runRaceDetailsScraper, 2, 'runRaceDetailsScraper');
    logger.info(`[Scheduler] ✅ runRaceDetailsScraper() completed successfully`);
    let prev = {};
    if (fs.existsSync(STATUS_FILE)) {
      prev = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    }
    writeStatus({
      ...prev,
      running: true,
      ...getAllNextRuns(),
      detailsLastRun: now.format('YYYY-MM-DD HH:mm:ss'),
      detailsLastError: null
    });
  } catch (err) {
    logger.error(`[Scheduler] ❌ runRaceDetailsScraper() failed after retries`);
    let prev = {};
    if (fs.existsSync(STATUS_FILE)) {
      prev = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    }
    writeStatus({
      ...prev,
      running: true,
      ...getAllNextRuns(),
      detailsLastRun: now.format('YYYY-MM-DD HH:mm:ss'),
      detailsLastError: err.message
    });
  } finally {
    isRaceDetailsScraping = false;
  }
}, {
  timezone: 'Australia/Brisbane'
});

// --- Race Results Scraper Schedule ---
cron.schedule(resultsCron, async () => {
  if (isResultsScraping) {
    logger.warn(`[Scheduler] Results scraper already running. Skipping.`);
    return;
  }
  isResultsScraping = true;
  const now = getAESTTime();
  logger.info(`[Scheduler][DEBUG] Now in AEST: ${now.format()} | Hour: ${now.hour()}`);
  logger.info(`[Scheduler] 🏁 scrapeResults() triggered at ${now.format('YYYY-MM-DD HH:mm:ss')}`);
  try {
    await runWithRetry(scrapeResults, 2, 'scrapeResults');
    logger.info(`[Scheduler] ✅ scrapeResults() completed successfully`);
    let prev = {};
    if (fs.existsSync(STATUS_FILE)) {
      prev = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    }
    writeStatus({
      ...prev,
      running: true,
      ...getAllNextRuns(),
      resultsLastRun: now.format('YYYY-MM-DD HH:mm:ss'),
      resultsLastError: null
    });
  } catch (err) {
    logger.error(`[Scheduler] ❌ scrapeResults() failed after retries`);
    let prev = {};
    if (fs.existsSync(STATUS_FILE)) {
      prev = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    }
    writeStatus({
      ...prev,
      running: true,
      ...getAllNextRuns(),
      resultsLastRun: now.format('YYYY-MM-DD HH:mm:ss'),
      resultsLastError: err.message
    });
  } finally {
    isResultsScraping = false;
  }
}, {
  timezone: 'Australia/Brisbane'
});

// --- Initial Status Write on Start ---
writeStatus({
  running: true,
  raceListLastRun: null,
  ...getAllNextRuns(),
  raceListLastError: null,
  detailsLastRun: null,
  detailsLastError: null,
  resultsLastRun: null,
  resultsLastError: null
});

// Start message
logger.info(`🟢 Greyhound Scraper Scheduler started successfully`);
logger.info(`🕒 Next runs: ${JSON.stringify(getAllNextRuns(), null, 2)}`);