// Records the real rettxweb app (served at DEMO_BASE_URL, default http://localhost:3000) into recordings/.
// Usage: node record.mjs [--langs en,es|all] [--scenarios onboarding,signup] [--mobile-only|--desktop-only]
import { record } from './lib/harness.mjs';
import { LANGUAGES } from './lib/content.mjs';
import { recordingsFor } from './lib/plan.mjs';

const arg = (name) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : undefined; };
const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);
const langs = !arg('langs') || arg('langs') === 'all' ? Object.keys(LANGUAGES) : list(arg('langs'));
const only = list(arg('scenarios'));
const unknown = langs.filter((l) => !LANGUAGES[l]);
if (unknown.length) { console.error(`No content/languages/<lang>.yaml for: ${unknown.join(', ')}`); process.exit(1); }

const failed = [];
for (const lang of langs) {
  const jobs = recordingsFor(lang).filter((j) => (!only.length || only.includes(j.scenario))
    && !(process.argv.includes('--mobile-only') && !j.mobile) && !(process.argv.includes('--desktop-only') && j.mobile));
  for (const { scenario: name, mobile } of jobs) {
    const scenario = (await import(`./scenarios/${name}.mjs`)).default;
    const label = `${name} ${lang}${mobile ? ' mobile' : ''}`;
    // The app sometimes loads slowly; one retry avoids most flaky runs
    for (let attempt = 1; ; attempt++) {
      try { await record(scenario, lang, mobile); break; } catch (e) {
        console.error(`✗ ${label} (attempt ${attempt}): ${e.message.split('\n')[0]}`);
        if (attempt === 2) { failed.push(label); break; }
      }
    }
  }
}
if (failed.length) { console.error('Failed:', failed.join('; ')); process.exit(1); }
