// What gets recorded and published. Chapter pages are desktop + mobile in every language;
// the mobile story needs the mobile recording of every clip it uses, in the languages that have story texts.
import { LANGUAGES, STORY, STORY_LANGS } from './content.mjs';

export const CHAPTERS = [
  { id: 'onboarding' },
  { id: 'create-patient' },
  { id: 'upload-diagnosis' },
  { id: 'validation', cards: true },
  { id: 'completed' },
];
export const CARD_ICONS = ['🔎', '📄', '⏳', '✉️', '✅', 'ℹ️'];
export const STORY_CLIPS = [...new Set(STORY.filter((s) => s.clip).map((s) => s.clip))];

/** [{ scenario, mobile }] to record for one language */
export function recordingsFor(lang) {
  const list = [];
  if (LANGUAGES[lang]) for (const c of CHAPTERS) if (!c.cards) list.push({ scenario: c.id, mobile: false }, { scenario: c.id, mobile: true });
  if (STORY_LANGS.includes(lang)) for (const clip of STORY_CLIPS) if (!list.some((r) => r.scenario === clip && r.mobile)) list.push({ scenario: clip, mobile: true });
  return list;
}
