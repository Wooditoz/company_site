// Login to dev-lmautostore-wms (DEV env — synthetic data, safe) and capture multiple
// screens for review. Credentials via env vars.
//
// Usage (bash):
//   WMS_EMAIL='adm@lm.auto' WMS_PASSWORD='...' node scripts/render-wms-mockup.mjs

import puppeteer from 'puppeteer-core';
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public');

const email = process.env.WMS_EMAIL;
const password = process.env.WMS_PASSWORD;
if (!email || !password) {
  console.error('Missing WMS_EMAIL / WMS_PASSWORD env vars');
  process.exit(1);
}

const BASE = 'https://dev-lmautostore-wms.web.app';

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const executablePath = CHROME_PATHS.find((p) => existsSync(p));
if (!executablePath) throw new Error('Chrome not found');

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });

  console.log(`Navigating to ${BASE}/ ...`);
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Login
  const emailInput = await page.$('input[type="email"], input[name="email"], input[autocomplete="email"]');
  const passwordInput = await page.$('input[type="password"], input[name="password"]');
  if (!emailInput || !passwordInput) throw new Error('Login inputs not found');
  await emailInput.type(email, { delay: 30 });
  await passwordInput.type(password, { delay: 30 });

  const submitBtn = await page.$('button[type="submit"], button.submit');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
    submitBtn ? submitBtn.click() : passwordInput.press('Enter'),
  ]);
  await new Promise((r) => setTimeout(r, 2000));
  console.log('Logged in, current URL:', page.url());

  // Tour pages
  const TOUR = [
    { path: '/parts/', file: 'wms-parts.png', label: 'Parts list' },
    { path: '/invoices/', file: 'wms-invoices.png', label: 'Invoices' },
    { path: '/manage/', file: 'wms-manage.png', label: 'Manage hub' },
    { path: '/clients/', file: 'wms-clients.png', label: 'Clients' },
    { path: '/suppliers/', file: 'wms-suppliers.png', label: 'Suppliers' },
    { path: '/team/', file: 'wms-team.png', label: 'Team' },
  ];

  for (const stop of TOUR) {
    try {
      const url = `${BASE}${stop.path}`;
      console.log(`Visiting ${url} ...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      // Wait for app shell to render + Firestore listeners to populate
      await new Promise((r) => setTimeout(r, 4000));
      // Try opening any select / dropdown that might populate data — for the parts page
      // try to click the first Main Category option to actually show parts data.
      if (stop.path === '/parts/') {
        try {
          await page.evaluate(() => {
            const select = document.querySelector('select');
            if (!select) return;
            // pick the first non-placeholder option (index 1+)
            if (select.options.length > 1) {
              select.selectedIndex = 1;
              select.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
          await new Promise((r) => setTimeout(r, 1500));
        } catch {
          /* ignore */
        }
      }
      const png = await page.screenshot({ type: 'png', fullPage: false });
      writeFileSync(resolve(outDir, stop.file), png);
      console.log(`  ✓ ${stop.label} → ${stop.file}`);
    } catch (e) {
      console.log(`  ✗ ${stop.label}: ${e.message}`);
    }
  }
} finally {
  await browser.close();
}
