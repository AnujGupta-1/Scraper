import puppeteer from 'puppeteer';
import logger from './scraperLogger.js';
import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';

const extractDateFromURL = (url) => {
  const match = url.match(/-(\d{8})\//);
  if (match) {
    const raw = match[1];
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return 'Unknown';
};

const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const scrapeTab = async (page) => {
  return await page.evaluate(() => {
    const baseUrl = 'https://www.odds.com.au';
    const trackNames = Array.from(document.querySelectorAll('.racing-meeting-rows__main-left > div'))
      .map(div => div.innerText.trim());

    const trackRows = document.querySelectorAll('.racing-meeting-rows__right-inner > .racing-meeting-row');
    const data = [];

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
        data.push({
          track: trackName,
          races
        });
      }
    });

    return data;
  });
};

const saveToCSV = (flatData, actualDate) => {
  const exportBaseDir = path.resolve('./exports');
  const exportDir = path.join(exportBaseDir, actualDate);
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const filename = path.join(exportDir, 'greyhound-races.csv');

  const parser = new Parser({ fields: ['date', 'track', 'raceNumber', 'startTime', 'raceURL'] });
  const csv = parser.parse(flatData);
  fs.writeFileSync(filename, csv);
  logger.info(`📄 Race list saved to ${filename}`);
  
};


export const scrapeGreyhoundRaceList = async () => {
  const browser = await puppeteer.launch({ headless: false});
  const page = await browser.newPage();
  const allFlatData = [];

  try {
    logger.info(` Scraper started`);
    await page.goto('https://www.odds.com.au/greyhounds/', { waitUntil: 'networkidle2' });

    await page.waitForSelector('.date-selectors__item', { timeout: 10000 });
    const tabs = await page.$$('.date-selectors__item');
    logger.info(`Tabs found: ${tabs.length}`);

    const todayStr = getTodayDateString();

    for (let i = 0; i < tabs.length; i++) {
      logger.info(` Scraping tab ${i + 1} of ${tabs.length}`);

      const currentTabs = await page.$$('.date-selectors__item');
      const tab = currentTabs[i];
      if (!tab) {
        logger.warn(`Tab index ${i} not found`);
        continue;
      }

      const selected = await tab.evaluate(el => el.classList.contains('selected'));
      if (!selected) {
        await tab.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      await page.waitForSelector('.racing-meeting-rows__right-inner', { timeout: 20000 });

      const raceData = await scrapeTab(page);

      if (!raceData.length) {
        logger.warn(`No data found on tab ${i + 1}`);
        continue;
      }

      const firstRaceURL = raceData[0].races[0]?.raceURL || '';
      const actualDate = extractDateFromURL(firstRaceURL);
      logger.info(`Comparing: actualDate = "${actualDate}" vs todayStr = "${todayStr}"`);

      if (actualDate !== todayStr) {
        logger.info(`Skipping tab ${i + 1} — not today's races (${actualDate})`);
        continue;
      }

      const flatData = raceData.flatMap(track =>
        track.races.map(race => {
          const entry = {
            date: actualDate,
            track: track.track,
            raceNumber: race.raceNumber,
            startTime: race.startTime,
            raceURL: race.raceURL
          };
          allFlatData.push(entry);
          return entry;
        })
      );

      saveToCSV(flatData, actualDate);
      break;
    }

    await browser.close();
    logger.info(" All tabs scraped and browser closed.");
    return allFlatData;
  } catch (error) {
    logger.error(` Scraping error: ${error.message}`);
    await browser.close();
    return [];
  }
};

scrapeGreyhoundRaceList();