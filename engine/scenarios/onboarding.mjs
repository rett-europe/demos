import { BASE, merge, demoEmail } from '../lib/harness.mjs';
import { langIndex, spainOption } from '../lib/langs.mjs';

export default {
  name: 'onboarding',

  initialState: (lang) => ({
    profile: {
      user_id: 'auth0|demo-user', email: demoEmail(lang), given_name: '', family_name: '',
      user_metadata: { onboarding_complete: false, preferences: {}, location: {} }, privacy_policy_accepted: false,
    },
  }),

  api({ method, path, body, state }) {
    if (path === '/user/profile') {
      if (method === 'PATCH') state.profile = merge(state.profile, body || {});
      return state.profile;
    }
    if (path === '/privacy-policy/accept') { state.profile.privacy_policy_accepted = true; return {}; }
    if (path.startsWith('/patients')) return [];
  },

  async run({ page, lang, VP, wait, cue, click, move, pick, begin }) {
    await page.goto(`${BASE}/onboarding/language`);
    await page.waitForSelector('mat-select', { timeout: 30000 });
    await begin();
    await page.mouse.move(VP.width / 2, VP.height / 2);

    cue('language'); await wait(2500);
    await click(page.locator('mat-select').first()); await wait(900);
    await pick(page.locator('mat-option').nth(langIndex(lang))); await wait(1500);
    cue('language-next');
    await click(page.locator('button').filter({ hasText: /\S/ }).last());

    await page.waitForURL('**/onboarding/profile'); await page.waitForSelector('#name');
    cue('profile'); await wait(2000);
    await click(page.locator('#name')); await page.keyboard.type('Alex', { delay: 120 });
    await click(page.locator('#surname')); await page.keyboard.type('Demo', { delay: 120 });
    cue('profile-location');
    await click(page.locator('#country')); await wait(800);
    await pick(spainOption(page, lang)); await wait(800);
    await click(page.locator('#region')); await wait(800);
    await pick(page.locator('mat-option').first()); await wait(1000);
    await page.locator('button.btn-rettx-primary').scrollIntoViewIfNeeded(); await wait(1200);
    cue('profile-next');
    await click(page.locator('button.btn-rettx-primary'));

    await page.waitForURL('**/onboarding/privacy-policy'); await page.waitForSelector('.privacy-policy-content');
    cue('privacy'); await wait(2000);
    for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 250); await wait(250); }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(800);
    cue('privacy-accept');
    await click(page.locator('button.btn-rettx-primary').last());

    await page.waitForURL('**/patients**', { timeout: 20000 }).catch(() => console.log('  no /patients; at', page.url()));
    cue('done'); await wait(4000);
  },
};
