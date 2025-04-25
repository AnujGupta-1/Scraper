import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
import logger from './scraperLogger.js';

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://www.thegreyhoundrecorder.com.au/results/search/';
const RESULTS_DATE = new Date().toISOString().split('T')[0];
const RESULTS_DAY_HEADING = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric'
});

export const scrapeResults = async () => {
  logger.info('Starting results scraping...');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    const fullURL = `${BASE_URL}${RESULTS_DATE}`;
    logger.info(`Navigating to: ${fullURL}`);
    await page.goto(fullURL, { waitUntil: 'networkidle2', timeout: 60000 });

    await page.waitForSelector('div.meeting-list', { timeout: 30000 });
    

    // Log available headings
    const headings = await page.$$eval('h2.meeting-list__title', els =>
      els.map(h => h.textContent.trim())
    );
    logger.info(`Available meeting headings: ${headings.join(' | ')}`);
    logger.info(`Expecting to match heading: ${RESULTS_DAY_HEADING}`);

    const resultLinks = await page.evaluate((headingText) => {
      const log = msg => console.log('CLIENT LOG:', msg);

      const sections = Array.from(document.querySelectorAll('.meeting-list'));
      log(`Found ${sections.length} .meeting-list containers`);

      const todaySection = sections.find(section => {
        const h2 = section.querySelector('h2.meeting-list__title');
        log(`Checking heading: ${h2?.textContent.trim()}`);
        return h2 && h2.textContent.trim() === headingText;
      });

      if (!todaySection) {
        log(`No matching section found for "${headingText}"`);
        return [];
      }

      const rows = todaySection.querySelectorAll('.meeting-row');
      log(`Found ${rows.length} .meeting-row under today's heading`);

      const links = [];
      rows.forEach(row => {
        const track = row.querySelector('.meeting-row__title')?.innerText.trim();
        const anchor = row.querySelector('.meeting-row__links a');
        if (track && anchor) {
          links.push({ track, url: anchor.getAttribute('href') });
        }
      });

      log(`Extracted ${links.length} result URLs`);
      return links;
    }, RESULTS_DAY_HEADING);

    logger.info(`Found ${resultLinks.length} result URLs for ${RESULTS_DATE}.`);
    if (!resultLinks.length) {
      logger.warn('No results data found.');
      return;
    }

    const allResults = [];

    for (const { url, track } of resultLinks) {
      try {
        const pageURL = `https://www.thegreyhoundrecorder.com.au${url}`;
        logger.info(`Scraping ${track} - ${pageURL}`);
        await page.goto(pageURL, { waitUntil: 'domcontentloaded' });

        await page.waitForSelector('table.results-event__table', { timeout: 15000 });

        const navItems = await page.$$('nav.meeting-events-nav .meeting-events-nav__item');

        for (let i = 0; i < navItems.length; i++) {
          if (i !== 0) {
            await navItems[i].click();
            await page.waitForSelector('table.results-event__table', { timeout: 15000 });
            await new Promise(resolve => setTimeout(resolve, 1200));
          }

          const raceData = await page.$$eval('table.results-event__table tbody tr', (rows, track, i) => {
            return Array.from(rows).map(row => {
              const tds = row.querySelectorAll('td');
              if (tds.length >= 12) {
                return {
                  track,
                  race: `Race ${i + 1}`,
                  place: tds[0].innerText.trim(),
                  rug: tds[1].innerText.trim(),
                  name: tds[2].innerText.trim(),
                  trainer: tds[3].innerText.trim(),
                  time: tds[4].innerText.trim(),
                  margin: tds[5].innerText.trim(),
                  split: tds[6].innerText.trim(),
                  inRun: tds[7].innerText.trim(),
                  weight: tds[8].innerText.trim(),
                  sire: tds[9].innerText.trim(),
                  dam: tds[10].innerText.trim(),
                  sp: tds[11].innerText.trim()
                };
              }
              return null;
            }).filter(Boolean);
          }, track, i);

          logger.info(`Scraped ${raceData.length} rows from ${track} Race ${i + 1}`);
          allResults.push(...raceData);
        }
      } catch (err) {
        logger.error(`Failed to scrape ${track}: ${err.message}`);
        const html = await page.content();
        const dumpFile = `debug-${Date.now()}.html`;
        fs.writeFileSync(dumpFile, html);
        logger.info(`Dumped error HTML to ${dumpFile}`);
      }
    }

    if (allResults.length) {
      const outputDir = `./exports/${RESULTS_DATE}`;
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const parser = new Parser();
      fs.writeFileSync(`${outputDir}/results.csv`, parser.parse(allResults));
      logger.info(`Saved results to ${outputDir}/results.csv`);
    } else {
      logger.warn('No results scraped for any track.');
    }
  } catch (e) {
    logger.error(`Global scraping failure: ${e.message}`);
  } finally {
    await browser.close();
  }
};


scrapeResults();
