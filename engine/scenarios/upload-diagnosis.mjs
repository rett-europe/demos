import { BASE, onboardedProfile } from '../lib/harness.mjs';

const patient = (lifecycle, allowUpload) => ({
  rettxid: 'RE-DEMO-0001', name: 'Lia Demo', given_name: 'Lia', family_name: 'Demo',
  date_of_birth: '2016-03-14', country_of_birth: 'ES', gender: 'female', relationship: 'mother',
  deceased: false, deceased_date: null, mutations: [], medications: [], files: [], surveys: [],
  lifecycle,
  capabilities: {
    edit: { allowed: allowUpload }, delete: { allowed: allowUpload },
    upload_diagnosis: { allowed: allowUpload }, request_correction: { allowed: false },
  },
});

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');

export default {
  name: 'upload-diagnosis',

  initialState: (lang) => ({
    profile: onboardedProfile(lang),
    patient: patient({ state: 'DRAFT', reason_code: 'NONE' }, true),
    uploaded: false,
  }),

  api({ method, path, state }) {
    if (path === '/user/profile') return state.profile;
    if (method === 'GET' && path === '/patients') return [state.patient];
    if (/\/upload-file-info$/.test(path)) {
      state.uploaded = true;
      return {
        expiration: new Date(Date.now() + 3600e3).toISOString(), file_id: 'demo-file-1',
        file_url: 'https://demo-blob.example.org/genetic-report.pdf', patient_id: state.patient.rettxid,
      };
    }
    if (path.endsWith('/mutations-status')) {
      if (state.uploaded) {
        state.patient = patient({ state: 'UNDER_REVIEW', reason_code: 'NONE' }, false);
        return { state: 'PENDING_VALIDATION', allow_upload: false, show_instructions: false, show_status: true, show_mutation_list: false, last_file_id: 'demo-file-1', last_updated_at: new Date().toISOString(), validation_status: null, validation_description: null };
      }
      return { state: 'NO_FILE', allow_upload: true, show_instructions: true, show_status: false, show_mutation_list: false, last_file_id: null, last_updated_at: new Date().toISOString(), validation_status: null, validation_description: null };
    }
    if (path.endsWith('/mutations') || path.endsWith('/files')) return [];
    if (/^\/patients\/[^/]+$/.test(path)) return state.patient;
  },

  async run({ page, VP, wait, cue, click, begin }) {
    await page.goto(`${BASE}/patients`);
    await page.waitForSelector('app-diagnosis-tab', { timeout: 30000 });
    await begin();
    await page.mouse.move(VP.width / 2, VP.height / 2);

    cue('patient'); await wait(3000);
    await page.locator('app-diagnosis-tab').scrollIntoViewIfNeeded();
    cue('instructions'); await wait(7000);

    cue('add');
    const btn = page.locator('app-diagnosis-tab .g-btn.primary').first();
    await click(btn);
    cue('source'); await wait(6000);
    await page.locator('app-diagnosis-tab input[type=file]').first()
      .setInputFiles({ name: 'genetic-report.pdf', mimeType: 'application/pdf', buffer: PDF });

    cue('processing'); await wait(9000);
    await page.waitForFunction(() => !document.querySelector('app-diagnosis-tab mat-spinner'), null, { timeout: 30000 }).catch(() => {});
    cue('review'); await wait(5000);
    if (process.env.DEMO_SHOT) await page.screenshot({ path: process.env.DEMO_SHOT });
  },};
