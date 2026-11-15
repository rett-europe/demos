// Builds the published site from content/*.yaml and the recordings.
// Usage: node build.mjs [--out <dir>] [--recordings <dir>]
//   --out          site folder (default ../_site). Media already in it are reused, so a text-only change
//                  needs no recordings: check out the gh-pages branch there and build.
//   --recordings   folder written by record.mjs (default ./recordings). Newer recordings replace published media.
import fs from 'node:fs';
import path from 'node:path';
import { ENGINE, REPO, LANGUAGES, STORY, STORY_LANGS } from './lib/content.mjs';
import { CHAPTERS, CARD_ICONS } from './lib/plan.mjs';
import { shrink } from './lib/ffmpeg.mjs';

const arg = (name, dflt) => { const i = process.argv.indexOf('--' + name); return path.resolve(i > 0 ? process.argv[i + 1] : dflt); };
const OUT = arg('out', path.join(REPO, '_site'));
const REC = arg('recordings', process.env.RECORDINGS || path.join(ENGINE, 'recordings'));
const LANGS = Object.keys(LANGUAGES);
const round = (n) => Math.round(n * 1000) / 1000;
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const warnings = [];
let encoded = 0;

/**
 * Publishes one recording as <dir>/<name>.webm + .json (timeline) and returns the timeline.
 * Re-encodes only when the recording differs from the one already published; falls back to the published copy.
 */
function media(recBase, dir, name) {
  const dest = path.join(dir, name);
  if (fs.existsSync(recBase + '.webm') && fs.existsSync(recBase + '.json')) {
    const st = fs.statSync(recBase + '.webm');
    const stamp = `${st.size}-${Math.round(st.mtimeMs)}`;
    const old = fs.existsSync(dest + '.json') && fs.existsSync(dest + '.webm') ? readJson(dest + '.json') : null;
    if (old?.stamp === stamp) return old;
    fs.mkdirSync(dir, { recursive: true });
    console.log('  encoding', name);
    shrink(recBase + '.webm', dest + '.webm');
    encoded++;
    const meta = { ...readJson(recBase + '.json'), stamp };
    fs.writeFileSync(dest + '.json', JSON.stringify(meta));
    return meta;
  }
  return fs.existsSync(dest + '.json') && fs.existsSync(dest + '.webm') ? readJson(dest + '.json') : null;
}

// ---------- chapter pages (desktop + mobile side by side) ----------
const SHELL_HEAD = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>rettX demo</title><link rel="stylesheet" href="../assets/player.css"></head><body>
<header><h1><a id="home" href="../"></a> · <span id="title"></span></h1>
<div class="hr">`;
const VIEWS = `<div class="seg" id="views" role="group" aria-label="View"><button data-m="desktop">Desktop</button><button data-m="mobile">Mobile</button><button data-m="both">Side by side</button></div>`;
const LANG_SEL = `<select id="lang" aria-label="Language"></select></div></header>
<nav class="stepper" id="stepper" aria-label="Steps"></nav>`;
const SCRIPTS = `<script src="../assets/journey.js"></script><script src="demo.js"></script><script src="../assets/player.js"></script></body></html>`;
const VIDEO_PAGE = `${SHELL_HEAD}${VIEWS}${LANG_SEL}
<main><section>
<div class="stage mode-both" id="stage">
<div class="dev desk" id="dd"><video id="v" playsinline preload="auto" muted></video></div>
<div class="dev phone" id="dm"><video id="vm" playsinline preload="auto" muted></video></div></div>
<div class="ctl"><button id="pp" aria-label="Play">▶</button><input id="seek" type="range" min="0" max="1000" value="0" aria-label="Seek"><span id="time">0:00 / 0:00</span><button id="fs" aria-label="Fullscreen">⛶</button></div>
<div id="err"></div><div class="nav" id="nav"></div></section>
<aside><h2 id="stepsH">Steps</h2><ul id="steps"></ul></aside></main>
${SCRIPTS}`;
const CARDS_PAGE = `${SHELL_HEAD}${LANG_SEL}
<main style="grid-template-columns:1fr"><section><div class="cards" id="cards"></div><div class="nav" id="nav"></div></section></main>
${SCRIPTS}`;
const LANDING = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>rettX demos</title>
<script>location.replace('onboarding/' + location.search);</script>
<meta http-equiv="refresh" content="0; url=onboarding/"></head><body><a href="onboarding/">rettX demos</a></body></html>
`;

fs.mkdirSync(OUT, { recursive: true });
write(path.join(OUT, '.nojekyll'), '');
write(path.join(OUT, 'index.html'), LANDING);
for (const f of ['player.js', 'player.css']) write(path.join(OUT, 'assets', f), fs.readFileSync(path.join(ENGINE, 'player', f)));

const tx = (l) => LANGUAGES[l].chapters;
const byLang = (fn) => Object.fromEntries(LANGS.map((l) => [l, fn(l)]));
const journey = {
  title: byLang((l) => tx(l).title),
  steps: CHAPTERS.map((c) => ({ id: c.id, kind: c.cards ? 'cards' : 'video', title: byLang((l) => tx(l).steps[c.id]) })),
  extras: [],
  ui: byLang((l) => tx(l).ui),
};
write(path.join(OUT, 'assets', 'journey.js'), `// Generated by engine/build.mjs\nwindow.JOURNEY = ${JSON.stringify(journey, null, 1)};\n`);

for (const [i, ch] of CHAPTERS.entries()) {
  const dir = path.join(OUT, ch.id);
  const langs = {};
  if (ch.cards) {
    for (const l of LANGS) {
      const cards = tx(l).validation;
      langs[l] = { name: LANGUAGES[l].name, title: tx(l).steps[ch.id],
        cards: cards.map((c, k) => ({ icon: CARD_ICONS[k], title: c.title, text: c.text, ...(k === cards.length - 1 && { note: true }) })) };
    }
    write(path.join(dir, 'index.html'), CARDS_PAGE);
    write(path.join(dir, 'demo.js'), `window.DEMO = ${JSON.stringify({ id: ch.id, step: i + 1, kind: 'cards', langs }, null, 1)};\n`);
    continue;
  }
  const mediaDir = path.join(dir, 'media');
  for (const l of LANGS) {
    const rec = path.join(REC, ch.id, `${ch.id}-${l}`);
    const d = media(rec, mediaDir, `${ch.id}-${l}`);
    if (!d) { warnings.push(`${ch.id}: no recording for ${l}, language left out`); continue; }
    let m = media(rec + '-m', mediaDir, `${ch.id}-${l}-m`);
    if (!m) { // no mobile recording: show the desktop one in the phone frame
      fs.copyFileSync(path.join(mediaDir, `${ch.id}-${l}.webm`), path.join(mediaDir, `${ch.id}-${l}-m.webm`));
      m = d;
    }
    const captions = tx(l).captions[ch.id];
    const cap = Array.isArray(captions) ? captions : d.timeline.map((c) => captions[c.id] ?? '');
    langs[l] = { name: LANGUAGES[l].name, title: tx(l).steps[ch.id], d: d.timeline.map((c) => round(c.t)), m: m.timeline.map((c) => round(c.t)), cap };
  }
  write(path.join(dir, 'index.html'), VIDEO_PAGE);
  write(path.join(dir, 'demo.js'), `window.DEMO = ${JSON.stringify({ id: ch.id, step: i + 1, langs }, null, 1)};\n`);
  console.log(ch.id + ':', Object.keys(langs).join(','));
}

// ---------- mobile story (/story/) ----------
const STORY_OUT = path.join(OUT, 'story');
const storyMedia = path.join(STORY_OUT, 'media');
function story(lang) {
  const t = LANGUAGES[lang].story;
  const clips = {};
  const items = [];
  for (const s of STORY) {
    if (s.card) {
      const c = t.cards[s.card];
      items.push({ kind: 'card', step: s.step, url: s.url, end: s.end, title: c.title, text: c.text, kick: c.kick });
      continue;
    }
    const meta = clips[s.clip] ||= media(path.join(REC, s.clip, `${s.clip}-${lang}-m`), storyMedia, `${s.clip}-${lang}`);
    if (!meta) { warnings.push(`story: no mobile recording of ${s.clip} for ${lang}, language left out`); return null; }
    const cues = Object.fromEntries(meta.timeline.map((c) => [c.id, c.t]));
    const at = (id, dflt) => {
      if (!id) return dflt;
      if (cues[id] === undefined) throw new Error(`story.yaml: no cue "${id}" in the ${s.clip} recording (${lang}). Cues: ${Object.keys(cues).join(', ')}`);
      return cues[id];
    };
    items.push({ kind: 'clip', src: `media/${s.clip}-${lang}.webm`, from: round(at(s.from, 0)), to: round(at(s.to, meta.total)) });
  }
  return items;
}
const stories = Object.fromEntries(STORY_LANGS.map((l) => [l, story(l)]).filter(([, s]) => s));
const keep = new Set(Object.values(stories).flat().filter((i) => i.src).flatMap((i) => { const b = path.basename(i.src, '.webm'); return [b + '.webm', b + '.json']; }));
for (const f of fs.existsSync(storyMedia) ? fs.readdirSync(storyMedia) : []) if (!keep.has(f)) fs.rmSync(path.join(storyMedia, f));
const storyUi = Object.fromEntries(Object.keys(stories).map((l) => [l, LANGUAGES[l].story.ui]));
write(path.join(STORY_OUT, 'story.js'), `// Generated by engine/build.mjs\nwindow.STORIES = ${JSON.stringify(stories, null, 1)};\nwindow.STORY_UI = ${JSON.stringify(storyUi)};\n`);
fs.cpSync(path.join(ENGINE, 'story-player'), STORY_OUT, { recursive: true });
console.log('story:', Object.keys(stories).map((l) => `${l} ${stories[l].length} items`).join(', '));

for (const w of warnings) console.warn('⚠', w);
console.log(`built ${OUT} (${encoded} videos encoded)`);
