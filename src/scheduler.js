
import cron from 'node-cron';
import { scrapeGreyhoundRaceList } from './greyhoundRaceListScraper.js';
import { runRaceDetailsScraper } from './raceDetailsScraper.js';
import logger from './scraperLogger.js';

// Helper to get current time in AEST
function getAESTTime() {
  return new Date(new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' }));
}

// Task 1: Run scrapeGreyhoundRaceList() once daily at 9:00 AM AEST
cron.schedule('0 9 * * *', async () => {
  const now = getAESTTime();
  logger.info(`[Scheduler] 🔄 scrapeGreyhoundRaceList() triggered at ${now.toISOString()}`);
  try {
    await scrapeGreyhoundRaceList();
    logger.info(`[Scheduler] ✅ scrapeGreyhoundRaceList() completed successfully`);
  } catch (err) {
    logger.error(`[Scheduler] ❌ Error in scrapeGreyhoundRaceList(): ${err.message}`);
  }
}, {
  timezone: 'Australia/Brisbane'
});

// Task 2: Run runRaceDetailsScraper() every hour between 9AM and 11PM AEST
cron.schedule('0 * * * *', async () => {
  const now = getAESTTime();
  const hour = now.getHours();
  if (hour >= 9 && hour <= 23) {
    logger.info(`[Scheduler] ⏰ runRaceDetailsScraper() triggered at ${now.toISOString()}`);
    try {
      await runRaceDetailsScraper();
      logger.info(`[Scheduler] ✅ runRaceDetailsScraper() completed successfully`);
    } catch (err) {
      logger.error(`[Scheduler] ❌ Error in runRaceDetailsScraper(): ${err.message}`);
    }
  } else {
    logger.info(`[Scheduler] ⏸ Skipped runRaceDetailsScraper() before 9AM or after 11PM AEST`);
  }
}, {
  timezone: 'Australia/Brisbane'
});

// Start message
logger.info(`🟢 Greyhound Scraper Scheduler started successfully`);
