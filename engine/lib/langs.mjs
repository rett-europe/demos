// Same order as AVAILABLE_LANGUAGES in the app (it drives the language dropdown)
export const LANGS = ['es', 'en', 'fr', 'it', 'pt', 'de', 'ge', 'gr', 'hu', 'tr', 'ua', 'se', 'dk', 'pl', 'nl', 'lt', 'lv', 'fi', 'cz'];

// Spain as rendered by assets/i18n/masterdata/countries.<lang>.json
export const SPAIN = {
  es: 'España', en: 'Spain', fr: 'Espagne', it: 'Spagna', pt: 'Espanha', de: 'Spanien', ge: 'ესპანეთი', gr: 'Ισπανία', hu: 'Spanyolország',
  tr: 'İspanya', ua: 'Іспанія', se: 'Spanien', dk: 'Spanien', pl: 'Hiszpania', nl: 'Spanje', lt: 'Ispanija', lv: 'Spānija', fi: 'Espanja', cz: 'Španělsko',
};

export const langIndex = (lang) => LANGS.indexOf(lang);
export const spainOption = (page, lang) => page.locator('mat-option').filter({ hasText: SPAIN[lang] }).first();
