import puppeteer from 'puppeteer';
import logger from './scraperLogger.js'; // Ensure the path is correct

const scrapeGreyhoundRaceList = async () => {
  try {
    logger.info("Launching Puppeteer...");
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    logger.info("Navigating to Greyhound Racing page...");
    await page.goto('https://www.odds.com.au/greyhounds/', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000)); // wait for content to render

    logger.info("Extracting race data from page...");
    const raceData = await page.evaluate(() => {
      const tracks = Array.from(document.querySelectorAll('h3'));
      const data = [];

      tracks.forEach(trackHeader => {
        const trackName = trackHeader.textContent.trim();
        const trackSection = trackHeader.closest('section');
        const raceLinks = Array.from(trackSection?.querySelectorAll('a') || []);

        const races = raceLinks.map(link => {
          const raceNumber = link.textContent.match(/R\d+/)?.[0] || '';
          const raceTime = link.textContent.match(/\d{1,2}:\d{2}/)?.[0] || '';
          const raceUrl = link.href;
          return { raceNumber, raceTime, raceUrl };
        });

        if (trackName && races.length > 0) {
          data.push({ track: trackName, races });
        }
      });

      return data;
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
