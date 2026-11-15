// Story clip: scan a paper genetic report with the phone camera.
// The camera is faked with a canvas stream showing a synthetic sample report (no real data).
import { BASE } from '../lib/harness.mjs';
import upload from './upload-diagnosis.mjs';

function fakeCamera() {
  const W = 720, H = 1280;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  window.__demoPage = 1;
  const lines = (x, y, n, w) => { g.fillStyle = '#c9c9c9'; for (let i = 0; i < n; i++) g.fillRect(x, y + i * 26, w * (0.7 + ((i * 37) % 30) / 100), 9); };
  const draw = () => {
    const t = performance.now();
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#7a6450'); bg.addColorStop(1, '#4b3b2e');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.save();
    g.translate(W / 2 + Math.sin(t / 900) * 6, H / 2 + Math.cos(t / 1100) * 6);
    g.rotate((-2 + Math.sin(t / 1300) * 0.6) * Math.PI / 180);
    const pw = 580, ph = 820; g.translate(-pw / 2, -ph / 2);
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 30; g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, pw, ph); g.shadowBlur = 0;
    g.fillStyle = '#2b4c7e'; g.fillRect(0, 0, pw, 70);
    g.fillStyle = '#fff'; g.font = 'bold 24px sans-serif'; g.fillText('GENETICS LABORATORY', 30, 45);
    g.fillStyle = '#c0392b'; g.font = 'bold 18px sans-serif'; g.fillText('SAMPLE · DEMONSTRATION ONLY', 30, 108);
    g.fillStyle = '#222';
    if (window.__demoPage === 1) {
      g.font = 'bold 30px sans-serif'; g.fillText('Genetic test report', 30, 160);
      g.font = '20px sans-serif';
      [['Patient', 'Lia Demo'], ['Date of birth', '14/03/2016'], ['Test', 'MECP2 gene sequencing'], ['Result', 'Pathogenic variant detected'], ['Variant', 'MECP2 c.916C>T (p.Arg306Cys)']]
        .forEach(([k, v], i) => { g.fillStyle = '#666'; g.fillText(k, 30, 220 + i * 40); g.fillStyle = '#111'; g.fillText(v, 200, 220 + i * 40); });
      g.font = 'bold 20px sans-serif'; g.fillText('Conclusion', 30, 450);
      g.font = '19px sans-serif'; g.fillText('Consistent with a diagnosis of Rett syndrome.', 30, 482);
      lines(30, 530, 8, 500);
      g.fillStyle = '#888'; g.font = '16px sans-serif'; g.fillText('Page 1 of 2', pw - 130, ph - 25);
    } else {
      g.font = 'bold 26px sans-serif'; g.fillText('Methods and interpretation', 30, 160);
      lines(30, 200, 14, 500);
      g.fillStyle = '#222'; g.font = '18px sans-serif'; g.fillText('Reviewed by: Dr. A. Sample, clinical geneticist', 30, 620);
      g.strokeStyle = '#333'; g.lineWidth = 2; g.beginPath(); g.moveTo(30, 700); g.bezierCurveTo(90, 650, 140, 740, 210, 680); g.stroke();
      g.fillStyle = '#888'; g.font = '16px sans-serif'; g.fillText('Page 2 of 2', pw - 130, ph - 25);
    }
    g.restore();
  };
  setInterval(draw, 33); draw();
  const md = navigator.mediaDevices;
  md.enumerateDevices = async () => [{ deviceId: 'demo-cam', groupId: 'demo', kind: 'videoinput', label: 'Back camera', toJSON() { return this; } }];
  md.getUserMedia = async () => c.captureStream(30);
}

export default {
  ...upload,
  name: 'upload-scan',
  init: fakeCamera,

  async run({ page, VP, wait, cue, click, begin }) {
    await page.goto(`${BASE}/patients`);
    await page.waitForSelector('app-diagnosis-tab', { timeout: 30000 });
    await page.locator('app-diagnosis-tab').scrollIntoViewIfNeeded();
    await begin();
    await page.mouse.move(VP.width / 2, VP.height / 2);

    cue('scan'); await wait(1500);
    await click(page.locator('app-diagnosis-tab .g-btn.ghost').first());
    await page.waitForSelector('app-document-scanner video', { timeout: 15000 });
    cue('camera'); await wait(3000);

    const shoot = page.locator('app-document-scanner .action-buttons button').first();
    await click(shoot);
    cue('page1'); await wait(2500);
    await page.evaluate(() => { window.__demoPage = 2; });
    await click(shoot);
    cue('page2'); await wait(3000);

    const done = page.locator('app-document-scanner .complete-btn');
    await click(done);
    cue('processing'); await wait(6000);
    await page.waitForFunction(() => !document.querySelector('app-diagnosis-tab mat-spinner'), null, { timeout: 30000 }).catch(() => {});
    await page.locator('app-diagnosis-tab').scrollIntoViewIfNeeded();
    cue('review'); await wait(4500);
  },
};
