import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { scrapeGreyhoundRaceList } from './index.js';
import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
import logger from './scraperLogger.js';

puppeteer.use(StealthPlugin());

const TEST_MODE = process.env.TEST_MODE === 'true';
const TEST_URL = 'https://www.odds.com.au/greyhounds/sale-20250413/national-greyhound-adoption-month-race-1/';

const scrapeRaceDetails = async (url, page) => {
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle0' });

    await page.waitForSelector('.octd-right__main-row', { timeout: 20000 });

    const raceTitle = await page.title();

    const runnerNames = await page.$$eval('span.competitor-details', els =>
      els.map(e => e.textContent.trim().replace(/\s+/g, ' '))
    );

    const rows = await page.$$('.octd-right__main-row');
    const runners = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cells = await row.$$eval('.octd-right__main-cell', cells =>
        cells.map(cell => {
          const value = cell.querySelector('.octd-right__odds-value-cell');
          if (value) {
            const cleanVal = value.textContent.trim();
            return isNaN(parseFloat(cleanVal)) ? '-' : parseFloat(cleanVal);
          }
          return '-';
        })
      );

      runners.push({
        raceTitle,
        runnerName: runnerNames[i] || `Runner ${i + 1}`,
        bet365: cells[0] || '-',
        ubet: cells[1] || '-',
        tabtouch: cells[2] || '-',
        betr: cells[3] || '-',
        boombet: cells[4] || '-',
        sportsbet: cells[5] || '-',
        betfair_back: cells[6] || '-',
        betfair_lay: cells[7] || '-',
        picketbet: cells[8] || '-',
        ladbrokes: cells[9] || '-',
        pointsbet: cells[10] || '-',
        neds: cells[11] || '-',
        colossal: cells[12] || '-'
      });
    }

    return runners;
  } catch (err) {
    logger.error(`Error scraping ${url}: ${err.message}`);
    const html = await page.content();
    const errorFile = `./exports/details/debug-${Date.now()}.html`;
    fs.writeFileSync(errorFile, html);
    logger.info(`Saved error page HTML to ${errorFile}`);
    return [];
  }
};

const saveRaceDetailsCSV = (allRaceDetails) => {
  const now = new Date();
  const timeStamp = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const exportDir = path.resolve('./exports/details');
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const filePath = path.join(exportDir, `race-details-${timeStamp}.csv`);
  const parser = new Parser({
    fields: ['raceTitle', 'runnerName', 'bet365', 'ubet', 'tabtouch', 'betr', 'boombet', 'sportsbet', 'betfair_back', 'betfair_lay', 'picketbet', 'ladbrokes', 'pointsbet', 'neds', 'colossal']
  });

  const csv = parser.parse(allRaceDetails);
  fs.writeFileSync(filePath, csv);
  logger.info(`Race details saved to ${filePath}`);
};

const runRaceDetailsScraper = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const allRaceDetails = [];

  if (TEST_MODE) {
    logger.info(`Test mode active: scraping only ${TEST_URL}`);
    const raceDetails = await scrapeRaceDetails(TEST_URL, page);
    allRaceDetails.push(...raceDetails);
  } else {
    const raceMetaList = await scrapeGreyhoundRaceList();
    for (const race of raceMetaList) {
      logger.info(`Scraping details for: ${race.raceURL}`);
      const raceDetails = await scrapeRaceDetails(race.raceURL, page);
      allRaceDetails.push(...raceDetails);
    }
  }

  await browser.close();
  saveRaceDetailsCSV(allRaceDetails);
};

runRaceDetailsScraper();
