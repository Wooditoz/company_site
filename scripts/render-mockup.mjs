// Render the Aidemly hero mockup by navigating to aidemly.com with headless Chrome
// and screenshotting the actual mockup element. This captures the real, polished version
// (TikTok/IG/FB logos, all colors, exact fonts) as it appears in a real browser.

import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPng = resolve(__dirname, '../public/aidemly-mockup.png');

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const executablePath = CHROME_PATHS.find((p) => existsSync(p));
if (!executablePath) throw new Error('Chrome not found in known paths');

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1200, deviceScaleFactor: 2 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  );

  console.log('Navigating to https://aidemly.com/ ...');
  await page.goto('https://aidemly.com/', { waitUntil: 'networkidle0', timeout: 30000 });

  // Strip backgrounds on the body + every ancestor of the mockup so the screenshot
  // captures the floating panels on a transparent canvas. We do NOT touch descendants,
  // so the mockup's own dark header bars, blue table headers, etc. stay intact.
  await page.evaluate(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    const els = document.querySelectorAll('div.relative.w-full.max-w-xl.mx-auto');
    const mockup = Array.from(els).find((el) => el.style.height === '420px');
    if (!mockup) return;
    let node = mockup.parentElement;
    while (node && node !== document.documentElement) {
      node.style.background = 'transparent';
      node.style.backgroundColor = 'transparent';
      node.style.backgroundImage = 'none';
      node = node.parentElement;
    }
  });

  // Wait for the mockup container to be rendered. It has style="height: 420px" and class "max-w-xl".
  await page.waitForFunction(
    () => {
      const els = document.querySelectorAll('div.relative.w-full.max-w-xl.mx-auto');
      return Array.from(els).some(
        (el) => el.style.height === '420px' && el.querySelector('svg')
      );
    },
    { timeout: 15000 }
  );

  // Give the React app a moment to settle (animations, charts)
  await new Promise((r) => setTimeout(r, 800));

  // Find the exact mockup container's bounding box, then expand to give breathing room
  // around the floating panels. Asymmetric: 0 on the left (the hero text in the adjacent
  // column on aidemly.com would otherwise bleed into the screenshot), generous elsewhere.
  const PAD = { top: 64, right: 80, bottom: 64, left: 0 };
  const box = await page.evaluate(() => {
    const els = document.querySelectorAll('div.relative.w-full.max-w-xl.mx-auto');
    const el = Array.from(els).find((el) => el.style.height === '420px');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (!box) throw new Error('Mockup container not found on aidemly.com');

  const png = await page.screenshot({
    type: 'png',
    omitBackground: true,
    clip: {
      x: Math.max(0, box.x - PAD.left),
      y: Math.max(0, box.y - PAD.top),
      width: box.width + PAD.left + PAD.right,
      height: box.height + PAD.top + PAD.bottom,
    },
  });
  writeFileSync(outPng, png);
  console.log(
    `Rendered ${outPng} (${(png.length / 1024).toFixed(1)} KB) ` +
      `padding T${PAD.top}/R${PAD.right}/B${PAD.bottom}/L${PAD.left}`
  );
} finally {
  await browser.close();
}
