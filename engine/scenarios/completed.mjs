import { BASE, onboardedProfile } from '../lib/harness.mjs';

const PATIENT = {
  rettxid: 'RE-DEMO-0001', name: 'Lia Demo', given_name: 'Lia', family_name: 'Demo',
  date_of_birth: '2016-03-14', country_of_birth: 'ES', gender: 'female', relationship: 'mother',
  deceased: false, deceased_date: null, medications: [], files: [], surveys: [],
  mutations: [{
    mutation_data: {
      variant_type: 'SNV', genome_assembly: 'GRCh38',
      primary_transcript: {
        hgvs_transcript_variant: 'NM_004992.4:c.916C>T',
        protein_consequence_slr: 'NP_004983.1:p.(R306C)',
      },
      genomic_coordinates: [{ assembly: 'GRCh38', hgvs: 'NC_000023.11:g.154030912G>A' }],
    },
  }],
  lifecycle: { state: 'CONFIRMED', reason_code: 'NONE' },
  capabilities: {
    edit: { allowed: false }, delete: { allowed: false },
    upload_diagnosis: { allowed: false }, request_correction: { allowed: true },
  },
};

export default {
  name: 'completed',

  initialState: (lang) => ({ profile: onboardedProfile(lang) }),

  api({ method, path, state }) {
    if (path === '/user/profile') return state.profile;
    if (method === 'GET' && path === '/patients') return [PATIENT];
    if (path.endsWith('/mutations-status')) {
      return { state: 'VALID_MUTATION', allow_upload: false, show_instructions: false, show_status: false, show_mutation_list: true, last_file_id: 'demo-file-1', last_updated_at: new Date().toISOString(), validation_status: null, validation_description: null };
    }
    if (path.endsWith('/mutations') || path.endsWith('/files')) return [];
    if (/^\/patients\/[^/]+$/.test(path)) return PATIENT;
  },

  async run({ page, VP, wait, cue, move, click, begin }) {
    await page.goto(`${BASE}/patients`);
    await page.waitForSelector('.confirmed-banner', { timeout: 30000 });
    await begin();
    await page.mouse.move(VP.width / 2, VP.height / 2);

    cue('patient'); await wait(3000);
    cue('banner');
    await page.locator('.confirmed-banner').scrollIntoViewIfNeeded(); await wait(4000);

    cue('mutation');
    const head = page.locator('.mutation-card .mc-head');
    if ((await head.getAttribute('aria-expanded')) !== 'true') await click(head);
    else await move(head);
    await wait(5500);
    if (process.env.DEMO_SHOT) await page.screenshot({ path: process.env.DEMO_SHOT });
  },};
