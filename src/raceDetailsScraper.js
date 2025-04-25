import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { scrapeGreyhoundRaceList } from './index.js';
import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
import logger from './scraperLogger.js';
import csvParser from 'csv-parser';

puppeteer.use(StealthPlugin());

const scrapeRaceDetails = async (url, browser, track, raceNumber) => {
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    await page.waitForSelector('.octd-right__main-row', { timeout: 20000 });

    const runnerNames = await page.$$eval('.competitor-details a', els =>
      els.map(e => e.textContent.trim().replace(/\s+/g, ' '))
    );

    const extractOdds = async () => {
      const rows = await page.$$('.octd-right__main-row');
      const result = [];

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

        result.push({
          track,
          raceNumber,
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

      return result;
    };

    const winData = await extractOdds();

    // Toggle to 'Place' using text match fallback
    const placeClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button.bettype-button'));
      const placeBtn = buttons.find(b => b.textContent.trim().toLowerCase() === 'place');
      if (placeBtn) {
        placeBtn.click();
        return true;
      }
      return false;
    });

    let placeData = [];
    if (placeClicked) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const placeOddsLoaded = await page.$('.octd-right__main-row');
      if (placeOddsLoaded) {
        await page.waitForSelector('.octd-right__main-row', { timeout: 10000 });
        logger.info(`Place odds visible`);
        placeData = await extractOdds();
        placeData.forEach(r => r.betType = 'Place');
      } else {
        logger.warn(`Place odds did not load for ${track} Race ${raceNumber}`);
      }
    } else {
      logger.warn(`Place button not found for ${track} Race ${raceNumber}`);
    }

    winData.forEach(r => r.betType = 'Win');
    return [...winData, ...placeData];
  } catch (err) {
    logger.error(`Error scraping ${url}: ${err.message}`);
    const html = await page.content();
    const errorFile = `./exports/details/debug-${Date.now()}.html`;
    fs.writeFileSync(errorFile, html);
    logger.info(`Saved error page HTML to ${errorFile}`);
    return [];
  } finally {
    await page.close(); // cleanup page context after each race
  }
};

const saveRaceDetailsCSV = (allRaceDetails, folderDate) => {
  const exportDir = path.resolve(`./exports/${folderDate}`);
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const filePath = path.join(exportDir, `race-details.csv`);
  const parser = new Parser({
    fields: ['track', 'raceNumber', 'runnerName', 'betType', 'bet365', 'ubet', 'tabtouch', 'betr', 'boombet', 'sportsbet', 'betfair_back', 'betfair_lay', 'picketbet', 'ladbrokes', 'pointsbet', 'neds', 'colossal']
  });

  const csv = parser.parse(allRaceDetails);
  fs.writeFileSync(filePath, csv);
  logger.info(`Race details saved to ${filePath}`);
};

const loadRaceURLsFromCSV = (csvPath) => {
  return new Promise((resolve, reject) => {
    const raceData = [];
    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on('data', (row) => {
        if (row.raceURL && row.track && row.raceNumber) {
          raceData.push({ url: row.raceURL, track: row.track, raceNumber: row.raceNumber, date: row.date });
        }
      })
      .on('end', () => resolve(raceData))
      .on('error', reject);
  });
};

const findLatestRaceListCSV = (folderDate) => {
  const folderPath = path.resolve(`./exports/${folderDate}`);
  if (!fs.existsSync(folderPath)) return null;

  const files = fs.readdirSync(folderPath)
    .filter(f => f.startsWith('greyhound-races-') && f.endsWith('.csv'))
    .map(f => ({ file: f, time: fs.statSync(path.join(folderPath, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  return files.length > 0 ? path.join(folderPath, files[0].file) : null;
};

const runRaceDetailsScraper = async () => {
  const today = new Date();
  const folderDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let raceListCSV = findLatestRaceListCSV(folderDate);

  if (!raceListCSV) {
    logger.info(`Race list CSV not found. Running scrapeGreyhoundRaceList to generate it.`);
    await scrapeGreyhoundRaceList();
    raceListCSV = findLatestRaceListCSV(folderDate);
  }

  if (!raceListCSV) {
    logger.error('Failed to locate or generate race list CSV.');
    return;
  }

  const browser = await puppeteer.launch({
    headless: false,
    protocolTimeout: 60000 // avoid network.setUserAgentOverride timeout
  });

  const allRaceDetails = [];
  const raceEntries = await loadRaceURLsFromCSV(raceListCSV);

  for (const { url, track, raceNumber } of raceEntries) {
    logger.info(`Scraping details for: ${url}`);
    try {
      const raceDetails = await scrapeRaceDetails(url, browser, track, raceNumber);
      allRaceDetails.push(...raceDetails);
    } catch (err) {
      logger.error(`Failed to scrape race: ${err.message}`);
    }
  }

  await browser.close();
  saveRaceDetailsCSV(allRaceDetails, folderDate);
};

runRaceDetailsScraper();
