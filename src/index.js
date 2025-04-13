import puppeteer from 'puppeteer';
import logger from './scraperLogger.js';
import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';

const scrapeGreyhoundRaceList = async () => {
  try {
    logger.info("Launching Puppeteer...");
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    logger.info("Navigating to Greyhound Racing page...");
    await page.goto('https://www.odds.com.au/greyhounds/', { waitUntil: 'networkidle2' });

    // Wait for essential elements
    await page.waitForSelector('.racing-meeting-rows__right-inner', { timeout: 20000 });
    await page.waitForSelector('.date-selectors', { timeout: 10000 });

    logger.info("Extracting structured race data from page...");

    const raceData = await page.evaluate(() => {
      const baseUrl = 'https://www.odds.com.au';
      const data = [];

      function extractDateFromURL(url) {
        const match = url.match(/-(\d{8})\//);
        if (match) {
          const raw = match[1];
          return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
        }
        return 'Unknown';
      }

      const trackNames = Array.from(document.querySelectorAll('.racing-meeting-rows__main-left > div'))
        .map(div => div.innerText.trim());

      const trackRows = document.querySelectorAll('.racing-meeting-rows__right-inner > .racing-meeting-row');

      trackRows.forEach((row, index) => {
        const trackName = trackNames[index];
        const raceLinks = row.querySelectorAll('a');
        const races = [];

        raceLinks.forEach(link => {
          const raceURL = baseUrl + link.getAttribute('href');
          const content = link.innerText.trim();
          const parts = content.split(/\s|\n/);
          const raceNumber = parts.find(p => /^R\d+$/i.test(p));
          const startTime = parts.find(p => /^\d{1,2}:\d{2}$/.test(p));

          if (raceNumber && startTime) {
            races.push({
              raceNumber: raceNumber.trim(),
              startTime: startTime.trim(),
              raceURL
            });
          }
        });

        if (trackName && races.length > 0) {
          const actualDate = extractDateFromURL(races[0].raceURL);
          data.push({
            date: actualDate,
            track: trackName,
            races
          });
        }
      });

      return data;
    });

    logger.info(" Race data successfully extracted.");
    logger.info(JSON.stringify(raceData, null, 2));

    await browser.close();
    logger.info("Browser closed. Scraping completed.");

    //  Convert to CSV and save in daily folder
    const flatData = raceData.flatMap(track =>
      track.races.map(race => ({
        date: track.date,
        track: track.track,
        raceNumber: race.raceNumber,
        startTime: race.startTime,
        raceURL: race.raceURL
      }))
    );

    // Base exports directory
    const exportBaseDir = path.resolve('./exports');

    // Use the first valid date from raceData or today's date
    const folderDate = raceData[0]?.date || new Date().toISOString().split('T')[0];
    const exportDir = path.join(exportBaseDir, folderDate);

    // Create the folder if it doesn't exist
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const filename = path.join(exportDir, 'greyhound-races.csv');

    try {
      const parser = new Parser({ fields: ['date', 'track', 'raceNumber', 'startTime', 'raceURL'] });
      const csv = parser.parse(flatData);
      fs.writeFileSync(filename, csv);
      logger.info(` CSV saved to ${filename}`);
    } catch (csvError) {
      logger.error(` Error generating CSV: ${csvError.message}`);
    }

  } catch (error) {
    logger.error(` Scraping error: ${error.message}`);
  }
};

scrapeGreyhoundRaceList();
