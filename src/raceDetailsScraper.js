import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { scrapeGreyhoundRaceList } from './index.js';
import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
import logger from './scraperLogger.js';
import csvParser from 'csv-parser';

puppeteer.use(StealthPlugin());

const MAX_CONCURRENT_PAGES = 10;

const scrapeRaceDetails = async (page, url, track, raceNumber) => {
  try {
    logger.info(`Scraping ${track} Race ${raceNumber} — ${url}`);

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      try {
        const blockTypes = ['image', 'stylesheet', 'font'];
        blockTypes.includes(req.resourceType()) ? req.abort() : req.continue();
      } catch (err) {
        logger.warn(` Request error on ${track} R${raceNumber}: ${err.message}`);
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.octd-right__main-row', { timeout: 20000 });

    const runnerNames = await page.$$eval('.competitor-details a', els =>
      els.map(e => e.textContent.trim().replace(/\s+/g, ' '))
    );

    const extractOdds = async () => {
      const rows = await page.$$('.octd-right__main-row');
      return Promise.all(rows.map(async (row, i) => {
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

        return {
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
        };
      }));
    };

    const winData = await extractOdds();
    winData.forEach(r => r.betType = 'Win');

    let placeData = [];
    const placeClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button.bettype-button'));
      const placeBtn = buttons.find(b => b.textContent.trim().toLowerCase() === 'place');
      if (placeBtn) {
        placeBtn.click();
        return true;
      }
      return false;
    });

    if (placeClicked) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const rowsExist = await page.$('.octd-right__main-row');
      if (rowsExist) {
        await page.waitForSelector('.octd-right__main-row', { timeout: 10000 });
        placeData = await extractOdds();
        placeData.forEach(r => r.betType = 'Place');
      } else {
        logger.warn(` Place odds not visible for ${track} Race ${raceNumber}`);
      }
    }

    const combined = [...winData, ...placeData];
    logger.info(` Finished ${track} Race ${raceNumber} — Records: ${combined.length}`);
    return combined;
  } catch (err) {
    logger.error(` Error scraping ${url}: ${err.message}`);
    try {
      const html = await page.content();
      const errorFile = `./exports/details/debug-${Date.now()}.html`;
      fs.writeFileSync(errorFile, html);
      logger.info(` Saved error page to ${errorFile}`);
    } catch (_) {}
    return [];
  } finally {
    await page.close(); // always close page
  }
};

const saveRaceDetailsCSV = (allRaceDetails, folderDate) => {
  const exportBaseDir = path.resolve('./exports');
  const exportDir = path.join(exportBaseDir, folderDate);
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const now = new Date();
  const timeStamp = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = path.join(exportDir, `race-details-${timeStamp}.csv`);

  const parser = new Parser({
    fields: [
      'track', 'raceNumber', 'runnerName', 'betType',
      'bet365', 'ubet', 'tabtouch', 'betr', 'boombet', 'sportsbet',
      'betfair_back', 'betfair_lay', 'picketbet', 'ladbrokes',
      'pointsbet', 'neds', 'colossal'
    ]
  });

  const csv = parser.parse(allRaceDetails);
  fs.writeFileSync(filename, csv);
  logger.info(` Race details saved to ${filename} — Total: ${allRaceDetails.length}`);
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

export const runRaceDetailsScraper = async () => {
  const today = new Date();
  const folderDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  logger.info(` Starting scraper for: ${folderDate}`);

  let raceListCSV = findLatestRaceListCSV(folderDate);
  if (!raceListCSV) {
    logger.info(` Race list not found, generating with scrapeGreyhoundRaceList...`);
    await scrapeGreyhoundRaceList();
    raceListCSV = findLatestRaceListCSV(folderDate);
  }

  if (!raceListCSV) {
    logger.error(' Could not find or generate race list CSV.');
    return;
  }

  const raceEntries = await loadRaceURLsFromCSV(raceListCSV);
  logger.info(` Loaded ${raceEntries.length} races from ${raceListCSV}`);

  if (!raceEntries.length) {
    logger.warn(' No races to scrape.');
    return;
  }

  const browser = await puppeteer.launch({ headless: false, protocolTimeout: 60000 });
  const allRaceDetails = [];

  const scrapeInBatches = async (entries, batchSize) => {
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      logger.info(`🚀 Starting batch ${i / batchSize + 1} (${batch.length} races)`);

      const pages = await Promise.all(batch.map(() => browser.newPage()));

      const results = await Promise.allSettled(
        batch.map((entry, idx) =>
          scrapeRaceDetails(pages[idx], entry.url, entry.track, entry.raceNumber)
        )
      );

      for (const res of results) {
        if (res.status === 'fulfilled') allRaceDetails.push(...res.value);
        else logger.error(` Scrape failed: ${res.reason?.message}`);
      }
    }
  };

  await scrapeInBatches(raceEntries, MAX_CONCURRENT_PAGES);

  await browser.close();
  saveRaceDetailsCSV(allRaceDetails, folderDate);
};

runRaceDetailsScraper();
