// Checks content/ for mistakes before anything is built: missing or extra texts, unknown story cards, bad YAML.
// Usage: node check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ENGINE } from './lib/content.mjs';

const errors = [];
let LANGUAGES, STORY;
try { ({ LANGUAGES, STORY } = await import('./lib/content.mjs')); } catch (e) { console.error('✗ cannot read content:', e.message); process.exit(1); }

const en = LANGUAGES.en;
if (!en) { console.error('✗ content/languages/en.yaml is required (it is the reference)'); process.exit(1); }

/** Every text in `ref` must exist in `obj` with the same shape; nothing extra (catches typos in keys). */
function same(ref, obj, where, out, optional = false) {
  if (typeof ref === 'string') {
    if (typeof obj !== 'string' || !obj.trim()) out.push(`${where}: missing text`);
    return;
  }
  if (Array.isArray(ref)) {
    if (!Array.isArray(obj)) return out.push(`${where}: should be a list of ${ref.length}`);
    if (obj.length !== ref.length) out.push(`${where}: has ${obj.length} entries, English has ${ref.length}`);
    ref.forEach((r, i) => i < obj.length && same(r, obj[i], `${where}[${i + 1}]`, out));
    return;
  }
  if (!obj || typeof obj !== 'object') return out.push(`${where}: missing section`);
  for (const k of Object.keys(ref)) if (k in obj || !optional) same(ref[k], obj[k], `${where}.${k}`, out, optional);
  for (const k of Object.keys(obj)) if (!(k in ref)) out.push(`${where}.${k}: not in English (typo?)`);
}

for (const [l, doc] of Object.entries(LANGUAGES)) {
  const f = `languages/${l}.yaml`;
  if (!doc || typeof doc !== 'object') { errors.push(`${f}: empty`); continue; }
  if (!doc.name) errors.push(`${f}: name: missing (the language as written in itself, e.g. Français)`);
  for (const k of Object.keys(doc)) if (!['name', 'chapters', 'story', 'mock'].includes(k)) errors.push(`${f}: ${k}: unknown section`);
  same(en.chapters, doc.chapters, `${f}: chapters`, errors);
  if (doc.story) same(en.story, doc.story, `${f}: story`, errors);
  if (doc.mock) same(en.mock, doc.mock, `${f}: mock`, errors, true); // mock texts may be partial; English fills the gaps
}

const used = new Set();
STORY.forEach((s, i) => {
  const where = `story.yaml item ${i + 1}`;
  if (s.card) {
    used.add(s.card);
    if (!en.story.cards[s.card]) errors.push(`${where}: card "${s.card}" has no text in languages/en.yaml (story.cards.${s.card})`);
    if (!Number.isInteger(s.step)) errors.push(`${where}: card "${s.card}" needs a step number`);
  } else if (s.clip) {
    if (!fs.existsSync(path.join(ENGINE, 'scenarios', s.clip + '.mjs'))) errors.push(`${where}: no recording script engine/scenarios/${s.clip}.mjs`);
  } else errors.push(`${where}: needs "card:" or "clip:"`);
});
for (const id of Object.keys(en.story.cards)) if (!used.has(id)) errors.push(`languages/en.yaml: story.cards.${id} is not used in story.yaml`);

if (errors.length) {
  for (const e of errors) console.error('✗', e);
  console.error(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}
console.log(`✓ content OK: ${Object.keys(LANGUAGES).length} languages, ${STORY.length} story items`);
