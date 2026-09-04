// Encode the Stock Management OBS recording into a lightweight web loop.
// Skips the segment containing the "LM" placeholder hint in the client modal.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { statSync } from 'node:fs';
import ffmpegPath from 'ffmpeg-static';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = 'D:/videos/2026-06-26 11-38-28.mkv';
const PUB = resolve(__dirname, '../public');

const CROP = 'crop=1920:798:0:53,scale=1280:-2';
const SKIP_START = 25;
const SKIP_END = 31;
const TOTAL_END = 46;
const FILTER = [
  `[0:v]trim=0:${SKIP_START},setpts=PTS-STARTPTS,${CROP}[v1]`,
  `[0:v]trim=${SKIP_END}:${TOTAL_END},setpts=PTS-STARTPTS,${CROP}[v2]`,
  `[v1][v2]concat=n=2:v=1:a=0[out]`,
].join(';');

const run = (label, args) => {
  console.log(`\n▶ ${label}`);
  const res = spawnSync(ffmpegPath, args, { stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`${label} failed (${res.status})`);
};

run('poster (jpg)', [
  '-y',
  '-ss', '5',
  '-i', SRC,
  '-frames:v', '1',
  '-vf', CROP,
  '-q:v', '4',
  resolve(PUB, 'stock-mgmt-demo-poster.jpg'),
]);

run('mp4 (h264)', [
  '-y',
  '-i', SRC,
  '-filter_complex', FILTER,
  '-map', '[out]',
  '-an',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '30',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  resolve(PUB, 'stock-mgmt-demo.mp4'),
]);

run('webm (vp9)', [
  '-y',
  '-i', SRC,
  '-filter_complex', FILTER,
  '-map', '[out]',
  '-an',
  '-c:v', 'libvpx-vp9',
  '-crf', '37',
  '-b:v', '0',
  '-row-mt', '1',
  '-pix_fmt', 'yuv420p',
  resolve(PUB, 'stock-mgmt-demo.webm'),
]);

const kb = (p) => (statSync(p).size / 1024).toFixed(1);
console.log('\n=== output sizes ===');
console.log('poster jpg:', kb(resolve(PUB, 'stock-mgmt-demo-poster.jpg')), 'KB');
console.log('mp4       :', kb(resolve(PUB, 'stock-mgmt-demo.mp4')), 'KB');
console.log('webm      :', kb(resolve(PUB, 'stock-mgmt-demo.webm')), 'KB');
