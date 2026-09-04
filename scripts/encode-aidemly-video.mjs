// Encode the Aidemly demo OBS recording into a lightweight web-friendly loop.
// - Trims to t=20..28 (8s segment with modal interaction + chart-add animation)
// - Crops top 90px (removes personal email/Sign-out from the captured browser chrome)
// - Drops audio (autoplay requires muted anyway)
// - Outputs mp4 (h264 + faststart) and webm (vp9) for cross-browser support
// - Also extracts a poster frame

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { statSync } from 'node:fs';
import ffmpegPath from 'ffmpeg-static';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = 'D:/videos/2026-06-26 10-53-32.mkv';
const PUB = resolve(__dirname, '../public');

const SEEK = '20';
const DUR = '8';
// crop=W:H:X:Y — content area is 1897×829 starting at (0,90):
//   y=90 removes the personal-email/nav bar at the top
//   width 1897 removes the tiny black sliver on the right
//   height 829 removes the ~161px black bar at the bottom (OBS canvas wider than Chrome window)
const CROP = 'crop=1897:829:0:90,scale=1280:-2';

const run = (label, args) => {
  console.log(`\n▶ ${label}`);
  const res = spawnSync(ffmpegPath, args, { stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`${label} failed (${res.status})`);
};

// Poster: still frame at t=20 (first frame of segment) — used while video loads
run('poster (jpg)', [
  '-y',
  '-ss', SEEK,
  '-i', SRC,
  '-frames:v', '1',
  '-vf', `${CROP}`,
  '-q:v', '4',
  resolve(PUB, 'aidemly-demo-poster.jpg'),
]);

// MP4 (h264, CRF 28 = visibly compressed but small; faststart enables progressive playback)
run('mp4 (h264)', [
  '-y',
  '-ss', SEEK,
  '-i', SRC,
  '-t', DUR,
  '-an',
  '-vf', CROP,
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '28',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  resolve(PUB, 'aidemly-demo.mp4'),
]);

// WebM (vp9, CRF 35 — vp9 tends to be smaller at same perceived quality)
run('webm (vp9)', [
  '-y',
  '-ss', SEEK,
  '-i', SRC,
  '-t', DUR,
  '-an',
  '-vf', CROP,
  '-c:v', 'libvpx-vp9',
  '-crf', '35',
  '-b:v', '0',
  '-row-mt', '1',
  '-pix_fmt', 'yuv420p',
  resolve(PUB, 'aidemly-demo.webm'),
]);

const kb = (p) => (statSync(p).size / 1024).toFixed(1);
console.log('\n=== output sizes ===');
console.log('poster jpg:', kb(resolve(PUB, 'aidemly-demo-poster.jpg')), 'KB');
console.log('mp4       :', kb(resolve(PUB, 'aidemly-demo.mp4')), 'KB');
console.log('webm      :', kb(resolve(PUB, 'aidemly-demo.webm')), 'KB');
