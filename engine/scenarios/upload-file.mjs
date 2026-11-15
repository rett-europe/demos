// Story clip: upload the genetic report as a file already on the phone.
// The OS file picker can't be recorded, so a simple stand-in sheet is drawn over the page.
import { BASE } from '../lib/harness.mjs';
import { mock } from '../lib/content.mjs';
import upload from './upload-diagnosis.mjs';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');



const sheet = (t) => {
  const row = (tag, color, name, meta) => `<div class="demo-file" style="display:flex;align-items:center;gap:14px;padding:12px 4px;border-bottom:1px solid #eee">
      <div style="width:42px;height:42px;border-radius:8px;background:${color};color:#fff;font:700 12px sans-serif;display:flex;align-items:center;justify-content:center">${tag}</div>
      <div><div style="font:500 16px sans-serif;color:#222">${name}</div><div style="font:13px sans-serif;color:#777">${meta}</div></div></div>`;
  const el = document.createElement('div');
  el.id = 'demo-picker';
  el.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;opacity:0;transition:opacity .3s';
  el.innerHTML = `<div style="background:#fff;width:100%;border-radius:18px 18px 0 0;padding:10px 20px 28px;transform:translateY(40px);transition:transform .3s">
      <div style="width:40px;height:4px;border-radius:2px;background:#ccc;margin:0 auto 14px"></div>
      <div style="font:600 18px sans-serif;color:#222;margin-bottom:6px">${t.title}</div>
      <div style="font:13px sans-serif;color:#777;margin-bottom:4px">${t.recent}</div>
      ${row('PDF', '#d93025', 'genetic-report.pdf', '214 KB · ' + t.dl)}
      ${row('JPG', '#1a73e8', 'IMG_2041.jpg', '2.1 MB · ' + t.cam)}
      ${row('PDF', '#d93025', 'school-form.pdf', '96 KB · ' + t.dl)}
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; el.firstElementChild.style.transform = 'none'; });
};

export default {
  ...upload,
  name: 'upload-file',

  async run({ page, lang, VP, wait, cue, click, begin }) {
    await page.goto(`${BASE}/patients`);
    await page.waitForSelector('app-diagnosis-tab', { timeout: 30000 });
    await begin();
    await page.mouse.move(VP.width / 2, VP.height / 2);

    cue('patient'); await wait(2000);
    await page.locator('app-diagnosis-tab').scrollIntoViewIfNeeded();
    cue('instructions'); await wait(5000);

    cue('add');
    const chooser = page.waitForEvent('filechooser');
    await click(page.locator('app-diagnosis-tab .g-btn.primary').first());
    const fc = await chooser;
    await page.evaluate(sheet, mock(lang).picker);
    cue('picker'); await wait(2500);
    await click(page.locator('#demo-picker .demo-file').first());
    await wait(400);
    await page.evaluate(() => document.getElementById('demo-picker')?.remove());
    await fc.setFiles({ name: 'genetic-report.pdf', mimeType: 'application/pdf', buffer: PDF });

    cue('processing'); await wait(6000);
    await page.waitForFunction(() => !document.querySelector('app-diagnosis-tab mat-spinner'), null, { timeout: 30000 }).catch(() => {});
    await page.locator('app-diagnosis-tab').scrollIntoViewIfNeeded();
    cue('review'); await wait(4500);
  },
};
