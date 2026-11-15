import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

// $FFMPEG, else the ffmpeg Playwright ships (needs libvpx-vp9), else ffmpeg on PATH.
const PW_DIR = process.env.PLAYWRIGHT_BROWSERS_PATH || {
  win32: path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright'),
  darwin: path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
}[process.platform] || path.join(os.homedir(), '.cache', 'ms-playwright');
const BIN = { win32: 'ffmpeg-win64.exe', darwin: 'ffmpeg-mac' }[process.platform] || 'ffmpeg-linux';

export const FFMPEG = process.env.FFMPEG || (fs.existsSync(PW_DIR) && fs.readdirSync(PW_DIR)
  .filter((d) => d.startsWith('ffmpeg-')).sort().reverse()
  .map((d) => path.join(PW_DIR, d, BIN)).find((p) => fs.existsSync(p))) || 'ffmpeg';

export function ffmpeg(args, what) {
  const r = spawnSync(FFMPEG, ['-y', ...args], { stdio: 'pipe' });
  if (r.error) throw new Error(`cannot run ffmpeg (${FFMPEG}): ${r.error.message}. Set FFMPEG to an ffmpeg with libvpx-vp9.`);
  if (what && r.status !== 0) throw new Error(`ffmpeg ${what} failed: ` + r.stderr.toString().slice(-600));
  return r.stderr.toString();
}

/** Small VP9 re-encode used for the published videos. */
export const shrink = (src, dest) => ffmpeg(['-i', src, '-c:v', 'libvpx-vp9', '-crf', '40', '-b:v', '0', '-deadline', 'good', '-cpu-used', '4', '-an', dest], 'shrink');
