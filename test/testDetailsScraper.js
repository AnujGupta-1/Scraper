import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Parser } from 'json2csv';
import fs from 'fs';
import path from 'path';
import logger from '../src/scraperLogger.js';

puppeteer.use(StealthPlugin());

const testURL = 'https://www.odds.com.au/greyhounds/sale-20250420/national-greyhound-adoption-month-race-1/';
const testTrack = 'Sale';
const testRaceNumber = 'R1';

const scrapeRaceDetails = async (url, page, track, raceNumber) => {
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle0' });

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

    if (placeClicked) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await page.waitForSelector('.octd-right__main-row', { timeout: 20000 });
    }
    logger.info(`Place button clicked`);

    const placeData = await extractOdds();

    // Add betType to each
    winData.forEach(r => r.betType = 'Win');
    placeData.forEach(r => r.betType = 'Place');

    return [...winData, ...placeData];
  } catch (err) {
    logger.error(`Error scraping ${url}: ${err.message}`);
    const html = await page.content();
    const errorFile = `./exports/details/debug-${Date.now()}.html`;
    fs.writeFileSync(errorFile, html);
    logger.info(`Saved error page HTML to ${errorFile}`);
    return [];
  }
};

const saveCSV = (data, filename) => {
  const folderDate = new Date().toISOString().split('T')[0];
  const exportDir = path.resolve(`./exports/${folderDate}`);
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const filePath = path.join(exportDir, filename);
  const parser = new Parser({ fields: Object.keys(data[0]) });
  fs.writeFileSync(filePath, parser.parse(data));
  logger.info(`Test CSV saved to ${filePath}`);
};

const runTest = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const all = await scrapeRaceDetails(testURL, page, testTrack, testRaceNumber);
  await browser.close();

  if (all.length > 0) saveCSV(all, 'test-race-details.csv');
  else logger.warn('No test data scraped.');
};

runTest();
