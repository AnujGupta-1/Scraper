// test/test_scraper.js

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Parser } from 'json2csv';
import logger from './testLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_URL = 'https://www.odds.com.au/greyhounds/sale-20250413/national-greyhound-adoption-month-race-1/';

const extractOddsFromPage = async (pageContent) => {
  try {
    const runnerRegex = /"name":"(.*?)".*?selectionId":(\d+).*?Average_FixedWin".*?\[(.*?)\]/gs;
    const oddsData = [];

    let match;
    while ((match = runnerRegex.exec(pageContent)) !== null) {
      const name = match[1];
      const selectionId = match[2];
      const oddsValues = match[3].split(',').map(v => parseFloat(v.trim()));

      oddsData.push({
        runner: name,
        selectionId,
        averageFixedWinOdds: oddsValues.join(', ')
      });
    }

    // Place odds (if available)
    const placeRegex = /Average_PlaceWin.*?\[(.*?)\]/gs;
    const placeMatches = [...pageContent.matchAll(placeRegex)];

    placeMatches.forEach((match, idx) => {
      if (oddsData[idx]) {
        const placeOdds = match[1].split(',').map(v => parseFloat(v.trim()));
        oddsData[idx].averagePlaceWinOdds = placeOdds.join(', ');
      }
    });

    return oddsData;
  } catch (err) {
    logger.error(`Failed to extract odds: ${err.message}`);
    return [];
  }
};

const saveCSV = (data, timestamp) => {
  try {
    if (!data || data.length === 0) {
      logger.warn('No data to save. Skipping CSV export.');
      return;
    }

    const folderPath = path.join(__dirname, `../test_exports/${timestamp}`);
    fs.mkdirSync(folderPath, { recursive: true });

    const csvParser = new Parser();
    const csv = csvParser.parse(data);

    const filePath = path.join(folderPath, `odds-test-${timestamp}.csv`);
    fs.writeFileSync(filePath, csv);
    logger.info(`CSV saved to ${filePath}`);
  } catch (err) {
    logger.error(`Failed to save CSV: ${err.message}`);
  }
};

const scrapeEmbeddedOdds = async () => {
  logger.info('Navigating to test race URL...');

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 0 });

    const pageContent = await page.content();
    const oddsData = await extractOddsFromPage(pageContent);

    if (!oddsData || oddsData.length === 0) {
      logger.warn('No odds data found in page source.');
    }

    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    saveCSV(oddsData, timestamp);
  } catch (err) {
    logger.error(`Test scraping error: ${err.message}`);
    await page.screenshot({ path: path.join(__dirname, '../test_exports/odds_failed.png') });
    logger.warn('Screenshot saved: odds_failed.png');
  } finally {
    await browser.close();
    logger.info('Test scraping completed.');
  }
};

scrapeEmbeddedOdds();