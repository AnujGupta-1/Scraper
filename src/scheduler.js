import cron from 'node-cron';
import { scrapeGreyhoundRaceList } from './greyhoundRaceListScraper.js';
import { runRaceDetailsScraper } from './raceDetailsScraper.js';
import logger from './scraperLogger.js';

// Helper to get current time in AEST
function getAESTTime() {
  return new Date(new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' }));
}

// Concurrency guards
let isRaceDetailsScraping = false;
let isRaceListScraping = false;

// Retry helper
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

// Task 1: Run scrapeGreyhoundRaceList() once daily at 9:00 AM AEST
cron.schedule('0 9 * * *', async () => {
  if (isRaceListScraping) {
    logger.warn(`[Scheduler] Race list scrape already running. Skipping.`);
    return;
  }
  isRaceListScraping = true;
  const now = getAESTTime();
  logger.info(`[Scheduler] 🔄 scrapeGreyhoundRaceList() triggered at ${now.toISOString()}`);
  try {
    await runWithRetry(scrapeGreyhoundRaceList, 2, 'scrapeGreyhoundRaceList');
    logger.info(`[Scheduler] ✅ scrapeGreyhoundRaceList() completed successfully`);
  } catch (err) {
    logger.error(`[Scheduler] ❌ scrapeGreyhoundRaceList() failed after retries`);
  } finally {
    isRaceListScraping = false;
  }
}, {
  timezone: 'Australia/Brisbane'
});

// Task 2: Run runRaceDetailsScraper() every 10 minutes between 9AM and 11PM AEST
cron.schedule('0 * * * *', async () => {
  const now = getAESTTime();
  const hour = now.getHours();
  if (hour < 9 || hour > 23) {
    logger.info(`[Scheduler] ⏸ Skipped runRaceDetailsScraper() before 9AM or after 11PM AEST`);
    return;
  }
  if (isRaceDetailsScraping) {
    logger.warn(`[Scheduler] Previous runRaceDetailsScraper() still running. Skipping this cycle.`);
    return;
  }
  isRaceDetailsScraping = true;
  logger.info(`[Scheduler] ⏰ runRaceDetailsScraper() triggered at ${now.toISOString()}`);
  try {
    await runWithRetry(runRaceDetailsScraper, 2, 'runRaceDetailsScraper');
    logger.info(`[Scheduler] ✅ runRaceDetailsScraper() completed successfully`);
  } catch (err) {
    logger.error(`[Scheduler] ❌ runRaceDetailsScraper() failed after retries`);
  } finally {
    isRaceDetailsScraping = false;
  }
}, {
  timezone: 'Australia/Brisbane'
});

// Start message
logger.info(`🟢 Greyhound Scraper Scheduler started successfully`);
