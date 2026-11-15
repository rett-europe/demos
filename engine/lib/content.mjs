// Loads the editable texts in content/ (see README).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = path.resolve(ENGINE, '..');
const CONTENT = path.join(REPO, 'content');
const DIR = path.join(CONTENT, 'languages');
const load = (f) => YAML.parse(fs.readFileSync(f, 'utf8'));

/** { code: parsed languages/<code>.yaml }, English first, then by language name. */
export const LANGUAGES = Object.fromEntries(fs.readdirSync(DIR).filter((f) => f.endsWith('.yaml'))
  .map((f) => [path.basename(f, '.yaml'), load(path.join(DIR, f))])
  .sort(([a, x], [b, y]) => (a === 'en' ? -1 : b === 'en' ? 1 : x.name.localeCompare(y.name))));

/** Structure of the mobile story: [{card, step, url?, end?} | {clip, from?, to?}] */
export const STORY = load(path.join(CONTENT, 'story.yaml'));

/** The home page: { title, intro, note, demos: [{demo|link, title, text, tags?, poster?}] } */
export const HOME = load(path.join(CONTENT, 'home.yaml'));

/** Languages that have story texts, i.e. appear in the mobile story. */
export const STORY_LANGS = Object.keys(LANGUAGES).filter((l) => LANGUAGES[l].story);

/** Texts drawn by the mocks (email, Auth0 screens, file picker); English for anything not translated. */
export function mock(lang) {
  const en = LANGUAGES.en.mock, m = LANGUAGES[lang]?.mock || {};
  return { email: m.email || en.email, signup: { ...en.signup, ...m.signup }, picker: { ...en.picker, ...m.picker } };
}
