import puppeteer from 'puppeteer';
import logger from './scraperLogger.js';

const scrapeGreyhoundRaceList = async () => {
  try {
    logger.info("Launching Puppeteer...");
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    logger.info("Navigating to Greyhound Racing page...");
    await page.goto('https://www.odds.com.au/greyhounds/', { waitUntil: 'networkidle2' });

    // Wait until full track list and race links are loaded
    await page.waitForSelector('.racing-meeting-rows__right-inner', { timeout: 20000 });

    logger.info("Extracting structured race data from right-inner rows...");

    const raceData = await page.evaluate(() => {
      const baseUrl = 'https://www.odds.com.au';
      const tracks = [];

      const trackNames = Array.from(document.querySelectorAll('.racing-meeting-rows__main-left > div'))
        .map(div => div.innerText.trim());

      const trackRows = document.querySelectorAll('.racing-meeting-rows__right-inner > .racing-meeting-row');

      trackRows.forEach((row, index) => {
        const trackName = trackNames[index];
        const raceLinks = row.querySelectorAll('a');
        const races = [];

        raceLinks.forEach(link => {
          const raceURL = baseUrl + link.getAttribute('href');
          const content = link.innerText.trim(); // e.g., "R1\n17:14" or "R1 17:14"
          const parts = content.split(/\s|\n/); // handle both space or newline
          const raceNumber = parts.find(p => /^R\d+$/i.test(p));
          const startTime = parts.find(p => /^\d{1,2}:\d{2}$/.test(p));

          if (raceNumber && startTime) {
            races.push({ raceNumber, startTime, raceURL });
          }
        });

        if (trackName && races.length > 0) {
          tracks.push({ track: trackName, races });
        }
      });

      return tracks;
    });

    logger.info("✅ Race data successfully extracted.");
    logger.info(JSON.stringify(raceData, null, 2));

    await browser.close();
    logger.info("Browser closed. Scraping completed.");
  } catch (error) {
    logger.error(`❌ Scraping error: ${error.message}`);
  }
};

scrapeGreyhoundRaceList();
