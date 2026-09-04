// Render the StockMgmtMockup component to a static PNG (transparent bg).
// Run after editing the component to refresh public/stock-mgmt-mockup.png.

import puppeteer from 'puppeteer-core';
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPng = resolve(__dirname, '../public/stock-mgmt-mockup.png');

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const executablePath = CHROME_PATHS.find((p) => existsSync(p));
if (!executablePath) throw new Error('Chrome not found');

// Standalone render page that contains ONLY the StockMgmtMockup. Pass `live`
// to use the deployed copy, otherwise we expect a local preview server at 4321.
const TARGET = process.argv[2] === 'live'
  ? 'https://moadigital-e3d23.web.app/dev-render-stock/'
  : 'http://localhost:4321/dev-render-stock/';

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox', '--font-render-hinting=none'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 700, deviceScaleFactor: 2 });

  console.log(`Navigating to ${TARGET}`);
  await page.goto(TARGET, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));

  // The standalone page only has the StockMgmtMockup component wrapped in a
  // transparent root. Locate the inner mockup container directly.
  await page.evaluate(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  });
  await new Promise((r) => setTimeout(r, 800));

  // Use the wrapping #render-root (which already has 40px padding inside)
  // and screenshot it directly — avoids the manual clip math + max-texture
  // limits we hit with page.screenshot({ clip: ... }).
  const handle = await page.$('#render-root');
  if (!handle) throw new Error('#render-root not found');

  const png = await handle.screenshot({ type: 'png', omitBackground: true });
  writeFileSync(outPng, png);
  console.log(`Rendered ${outPng} (${(png.length / 1024).toFixed(1)} KB)`);
} finally {
  await browser.close();
}
