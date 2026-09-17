// Record a smooth scroll-through of the live Seconds Marketplace TH homepage
// into the same lightweight web loop format as the other demo videos
// (webm + mp4 + poster in public/). Frames are captured at fixed scroll
// positions, so the output speed is deterministic regardless of capture rate.

import puppeteer from 'puppeteer-core';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import ffmpegPath from 'ffmpeg-static';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = resolve(__dirname, '../public');
const TMP = resolve(__dirname, '../.frames-seconds');
const URL = 'https://secondsmarketplace.com/th/marketplace';
const NAME = 'seconds-demo';

const WIDTH = 1280;
const HEIGHT = 800;
const FPS = 30;
const HOLD_START_S = 1.5; // hold on the hero before scrolling
const SCROLL_S = 6; // scroll duration
const HOLD_END_S = 1; // hold at the end
const SCROLL_DISTANCE = 2600; // px — hero → trending → new arrivals

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
];
const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) throw new Error('Chrome not found');

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: [`--window-size=${WIDTH},${HEIGHT + 100}`, '--hide-scrollbars', '--force-device-scale-factor=1.5'],
});
const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1.5 });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 });
// let hero image, fonts and first cards settle
await new Promise((r) => setTimeout(r, 4000));
// dismiss the cookie banner so it doesn't sit in every frame
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) =>
    /ยอมรับ|accept/i.test(b.textContent || ''),
  );
  if (btn) btn.click();
});
await new Promise((r) => setTimeout(r, 1000));
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise((r) => setTimeout(r, 500));

const totalFrames = Math.round((HOLD_START_S + SCROLL_S + HOLD_END_S) * FPS);
const holdStartFrames = Math.round(HOLD_START_S * FPS);
const scrollFrames = Math.round(SCROLL_S * FPS);

console.log(`capturing ${totalFrames} frames...`);
for (let i = 0; i < totalFrames; i++) {
  let y = 0;
  if (i >= holdStartFrames) {
    const t = Math.min(1, (i - holdStartFrames) / scrollFrames);
    y = Math.round(easeInOut(t) * SCROLL_DISTANCE);
  }
  await page.evaluate((py) => window.scrollTo(0, py), y);
  await page.screenshot({
    path: join(TMP, `f${String(i).padStart(4, '0')}.jpg`),
    type: 'jpeg',
    quality: 90,
  });
  if (i % 30 === 0) console.log(`  frame ${i}/${totalFrames} (y=${y})`);
}
await browser.close();

const run = (label, args) => {
  console.log(`\n> ${label}`);
  const res = spawnSync(ffmpegPath, args, { stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`${label} failed (${res.status})`);
};

const input = ['-y', '-framerate', String(FPS), '-i', join(TMP, 'f%04d.jpg')];
const scale = `scale=${WIDTH * 1.5 > 1920 ? 1920 : WIDTH}:-2`;

run('poster (jpg)', ['-y', '-i', join(TMP, 'f0000.jpg'), '-frames:v', '1', '-vf', scale, '-q:v', '4', resolve(PUB, `${NAME}-poster.jpg`)]);
run('mp4 (h264)', [...input, '-an', '-vf', scale, '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', resolve(PUB, `${NAME}.mp4`)]);
run('webm (vp9)', [...input, '-an', '-vf', scale, '-c:v', 'libvpx-vp9', '-crf', '40', '-b:v', '0', '-row-mt', '1', resolve(PUB, `${NAME}.webm`)]);

rmSync(TMP, { recursive: true, force: true });
for (const f of [`${NAME}-poster.jpg`, `${NAME}.mp4`, `${NAME}.webm`]) {
  console.log(`${f}: ${(statSync(resolve(PUB, f)).size / 1024).toFixed(0)} KB`);
}
