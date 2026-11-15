import { BASE, onboardedProfile } from '../lib/harness.mjs';
import { spainOption } from '../lib/langs.mjs';

export default {
  name: 'create-patient',

  initialState: (lang) => ({ profile: onboardedProfile(lang), patients: [] }),

  api({ method, path, body, state }) {
    if (path === '/user/profile') return state.profile;
    if (method === 'GET' && path === '/patients') return state.patients;
    if (method === 'POST' && path === '/patients') {
      const p = {
        rettxid: 'RE-DEMO-0001', name: `${body.given_name} ${body.family_name}`, given_name: body.given_name,
        family_name: body.family_name, date_of_birth: body.date_of_birth, country_of_birth: body.country_of_birth,
        gender: body.gender, relationship: body.relationship, deceased: false, deceased_date: null,
        mutations: [], medications: [], files: [], surveys: [],
        lifecycle: { state: 'DRAFT', reason_code: 'NONE' },
        capabilities: { edit: { allowed: true }, delete: { allowed: true }, upload_diagnosis: { allowed: true }, request_correction: { allowed: false } },
      };
      state.patients.push(p);
      return p;
    }
    if (path.startsWith('/patients/')) return state.patients[0] || {};
    if (path.startsWith('/patients')) return state.patients;
  },

  async run({ page, lang, VP, wait, cue, click, pick, begin }) {
    await page.goto(`${BASE}/patients`);
    await page.waitForSelector('button.btn-rettx-primary', { timeout: 30000 });
    await begin();
    await page.mouse.move(VP.width / 2, VP.height / 2);

    cue('home'); await wait(2500);
    await click(page.locator('button.btn-rettx-primary').first());
    await page.waitForSelector('input[title=given_name]');

    cue('names'); await wait(1200);
    await click(page.locator('input[title=given_name]')); await page.keyboard.type('Lia', { delay: 120 });
    await click(page.locator('input[title=family_name]')); await page.keyboard.type('Demo', { delay: 120 });

    cue('details');
    await click(page.locator('mat-select[formcontrolname=gender]')); await wait(700);
    await pick(page.locator('mat-option').first()); await wait(600);
    await click(page.locator('mat-select[formcontrolname=country_of_birth]')); await wait(700);
    await pick(spainOption(page, lang)); await wait(600);

    cue('birthdate');
    await click(page.locator('mat-datepicker-toggle button')); await wait(800);
    await click(page.locator('.mat-calendar-period-button')); await wait(700);
    await pick(page.locator('.mat-calendar-body-cell').filter({ hasText: /^\s*2016\s*$/ })); await wait(600);
    await pick(page.locator('.mat-calendar-body-cell').nth(2)); await wait(600);
    await pick(page.locator('.mat-calendar-body-cell').filter({ hasText: /^\s*14\s*$/ })); await wait(800);

    cue('relationship');
    await click(page.locator('mat-select[formcontrolname=relationship]')); await wait(700);
    await pick(page.locator('mat-option').first()); await wait(1200);

    cue('next');
    await click(page.locator('button[matStepperNext]'));
    await page.waitForSelector('.scrollable-content');

    cue('consent'); await wait(2500);
    await page.locator('.scrollable-content').evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
    await wait(2500);
    cue('accept');
    await click(page.locator('mat-dialog-content button').filter({ hasText: /\S/ }).last());

    await page.waitForSelector('.confirmed-banner, .genetics-card, .genetics', { timeout: 20000 }).catch(() => {});
    cue('created'); await wait(4500);
  },};
