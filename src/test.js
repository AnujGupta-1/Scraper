import { scrapeResults } from "./greyhoundResultsScraper.js"; // Add .js extension!

// Immediately-invoked async function expression for top-level await
(async () => {
  await scrapeResults();
})();
