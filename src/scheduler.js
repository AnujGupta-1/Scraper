import cron from 'node-cron';
import { scrapeGreyhoundRaceList } from './index.js';
import { runRaceDetailsScraper } from './raceDetailsScraper.js';
import logger from './scraperLogger.js';

// --- Proper AEST time without external package ---
function getAESTTime() {
  return new Date(new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' }));
}


// --- Task 1: Run scrapeGreyhoundRaceList() daily at 9:00 AM AEST ---
cron.schedule('0 9 * * *', async () => {
  const now = getAESTTime();
  logger.info(`[Scheduler] Running scrapeGreyhoundRaceList() at ${now.toISOString()}`);
  try {
    await scrapeGreyhoundRaceList();
    logger.info(`[Scheduler] ✅ scrapeGreyhoundRaceList() completed`);
  } catch (err) {
    logger.error(`[Scheduler] ❌ Error in scrapeGreyhoundRaceList(): ${err.message}`);
  }
}, {
  timezone: 'Australia/Brisbane'
});

// --- Task 2: Run runRaceDetailsScraper() every hour from 9AM onwards ---
cron.schedule('0 * * * *', async () => {
  const now = getAESTTime();
  const hour = now.getHours();
  if (hour >= 9) {
    logger.info(`[Scheduler] Running runRaceDetailsScraper() at ${now.toISOString()}`);
    try {
      await runRaceDetailsScraper();
      logger.info(`[Scheduler] ✅ runRaceDetailsScraper() completed`);
    } catch (err) {
      logger.error(`[Scheduler] ❌ Error in runRaceDetailsScraper(): ${err.message}`);
    }
  } else {
    logger.info(`[Scheduler] ⏸ Skipped runRaceDetailsScraper() before 9AM AEST`);
  }
}, {
  timezone: 'Australia/Brisbane'
});

// --- Start message ---
logger.info('✅ Greyhound Scraper Scheduler started...');
