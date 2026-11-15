import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { ENGINE, REPO, mock } from './content.mjs';
import { ffmpeg } from './ffmpeg.mjs';

export const BASE = process.env.DEMO_BASE_URL || 'http://localhost:3000';
export const RECORDINGS = path.resolve(process.env.RECORDINGS || path.join(ENGINE, 'recordings'));
const API = 'https://rettx.azurewebsites.net/**';
const DOCS = 'https://demo-assets.example.org/**';

// The fake Auth0 session must use the same client id and audience as the running app
const APP_ENV = path.join(process.env.RETTXWEB_DIR || path.join(REPO, '..', 'rettxweb'), 'src', 'environments', 'environment.ts');
const envText = fs.existsSync(APP_ENV) ? fs.readFileSync(APP_ENV, 'utf8') : '';
const envValue = (key, dflt) => envText.match(new RegExp(`${key}:\\s*'([^']+)'`))?.[1] || dflt;
const CLIENT_ID = envValue('clientId', 'Rj436ZUWu8XnEGbvujfDLzQIwpGJ38No');
const AUDIENCE = envValue('audience', 'https://rett-europe.eu.auth0.com/api/v2/');
const SCOPE = 'openid profile email offline_access';

// Language code -> file code used by rett-europe/templates
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const fakeJwt = (p) => `${b64({ alg: 'none', typ: 'JWT' })}.${b64(p)}.sig`;

export const merge = (t, s) => {
  for (const k of Object.keys(s)) {
    if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) t[k] = merge(t[k] || {}, s[k]);
    else t[k] = s[k];
  }
  return t;
};

/** Placeholder email shown in the demos (content/languages/<lang>.yaml, mock.email). */
export const demoEmail = (lang) => mock(lang).email;

/** Profile of a user who already finished onboarding (chapters 2+). */
export const onboardedProfile = (lang) => ({
  user_id: 'auth0|demo-user', email: demoEmail(lang), given_name: 'Alex', family_name: 'Demo',
  user_metadata: { onboarding_complete: true, preferences: { language: lang }, location: { country: 'ES', region: 'Madrid' } },
  privacy_policy_accepted: true,
});

function authSeed(lang) {
  const user = { sub: 'auth0|demo-user', email: demoEmail(lang), email_verified: true, name: 'Demo User' };
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...user, iss: 'https://login.rettx.eu/', aud: CLIENT_ID, iat: now, exp: now + 86400 };
  const idToken = fakeJwt(claims);
  return {
    [`@@auth0spajs@@::${CLIENT_ID}::${AUDIENCE}::${SCOPE}`]: {
      body: {
        access_token: fakeJwt({ sub: user.sub, aud: AUDIENCE, exp: now + 86400 }),
        id_token: idToken, scope: SCOPE, expires_in: 86400, token_type: 'Bearer',
        decodedToken: { claims, user }, audience: AUDIENCE, client_id: CLIENT_ID,
      },
      expiresAt: now + 86400,
    },
    [`@@auth0spajs@@::${CLIENT_ID}::@@user@@`]: { id_token: idToken, decodedToken: { claims, user } },
  };
}

function documentHtml(type, lang) {
  const dir = /consent/i.test(type) ? 'consent_form' : 'privacy_policy';
  const f = path.join(ENGINE, 'documents', dir, `${lang}.html`);
  const html = fs.readFileSync(f, 'utf8');
  return (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];
}

function cursorScript(seed) {
  for (const [k, v] of Object.entries(seed)) if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(v));
  window.addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;z-index:999999;width:22px;height:22px;border-radius:50%;background:rgba(124,58,237,.55);border:2px solid #fff;box-shadow:0 0 8px rgba(0,0,0,.4);pointer-events:none;left:-50px;top:-50px;transition:transform .05s';
    document.body.appendChild(c);
    document.addEventListener('mousemove', (e) => { c.style.left = e.clientX - 11 + 'px'; c.style.top = e.clientY - 11 + 'px'; }, true);
    document.addEventListener('mousedown', () => { c.style.transform = 'scale(.6)'; }, true);
    document.addEventListener('mouseup', () => { c.style.transform = 'scale(1)'; }, true);
  });
}

/**
 * Records one scenario.
 * scenario = { name, initialState(), api({method, path, query, body, state}) -> body | undefined, run(h) }
 */
export async function record(scenario, lang, mobile) {
  const VP = mobile ? { width: 390, height: 780 } : { width: 1280, height: 800 };
  const out = path.join(RECORDINGS, scenario.name);
  fs.mkdirSync(out, { recursive: true });
  const suf = mobile ? '-m' : '';

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: VP, hasTouch: mobile, deviceScaleFactor: 1, locale: { cz: 'cs', ge: 'ka', dk: 'da', gr: 'el', se: 'sv', ua: 'uk' }[lang] || lang,
    recordVideo: { dir: out, size: VP },
  });
  await ctx.addInitScript(cursorScript, scenario.anonymous ? {} : authSeed(lang));
  if (scenario.init) await ctx.addInitScript(scenario.init);

  const state = scenario.initialState(lang);
  const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });

  await ctx.route(API, (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const p = u.pathname.replace(/\/+/g, '/').replace(/^\/v2(?=\/)/, '');
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (p === '/compliance-document') {
      const type = u.searchParams.get('type') || 'privacy-policy';
      return json(route, { id: `demo-${type}`, content_url: `https://demo-assets.example.org/${type}.html` });
    }
    const body = scenario.api({ method: req.method(), path: p, query: u.searchParams, body: req.postDataJSON?.() ?? null, state });
    if (body !== undefined) return json(route, body);
    console.log('  [unmatched api]', req.method(), p);
    return json(route, req.method() === 'GET' ? [] : {});
  });
  await ctx.route(DOCS, (r) => {
    const type = new URL(r.request().url()).pathname.replace(/^\/|\.html$/g, '');
    return r.fulfill({ status: 200, contentType: 'text/html', headers: CORS, body: documentHtml(type, lang) });
  });
  // Stands in for the Azure Blob Storage upload target
  await ctx.route('https://demo-blob.example.org/**', (r) => r.fulfill({ status: 201, headers: CORS, body: '' }));
  await ctx.route('https://login.rettx.eu/**', (r) => {
    if (scenario.auth0) return r.fulfill({ status: 200, contentType: 'text/html', body: scenario.auth0(lang) });
    console.log('  [auth0 hit]', r.request().url()); return r.abort();
  });

  const tStart = Date.now();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  // The app boots blank; begin() marks the first rendered frame and everything before it is trimmed off
  let t0 = tStart;
  const timeline = [];
  const wait = (ms) => page.waitForTimeout(ms);
  const h = {
    page, lang, mobile, VP, wait, state,
    begin: async () => { await wait(400); t0 = Date.now(); },
    cue: (id) => timeline.push({ id, t: (Date.now() - t0) / 1000 }),
    move: async (loc) => { const b = await loc.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 25 }); await wait(300); },
  };
  h.click = async (loc) => { await loc.waitFor(); await loc.scrollIntoViewIfNeeded(); await wait(500);   await h.move(loc); await loc.click({ timeout: 4000 }).catch(() => loc.click({ force: true })); };
  h.pick = async (loc) => { await loc.scrollIntoViewIfNeeded(); await h.move(loc); await loc.click(); };

  // A failed attempt must not leave Chromium running, or the process never exits
  try { await scenario.run(h); } catch (e) { await browser.close().catch(() => {}); throw e; }

  const total = (Date.now() - t0) / 1000;
  const video = page.video();
  await ctx.close();
  const dest = path.join(out, `${scenario.name}-${lang}${suf}.webm`);
  const raw = path.join(out, `raw${suf}-${lang}.webm`);
  await video.saveAs(raw);
  await browser.close();
  // The recorder may start a little after newPage(), so align from the end: the run finishes at the end of the raw video
  const tmp = raw.replace(/\.webm$/, '-probe.webm');
  const probe = ffmpeg(['-i', raw, '-c', 'copy', tmp]);
  fs.rmSync(tmp, { force: true });
  const hms = [...probe.matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop();
  const rawDur = hms ? +hms[1] * 3600 + +hms[2] * 60 + +hms[3] : 0;
  const trim = Math.max(0, rawDur ? rawDur - total : (t0 - tStart) / 1000).toFixed(3);
  // Encoded at final site quality here (recordings run in parallel per language), so build.mjs only copies
  ffmpeg(['-ss', trim, '-i', raw, '-c:v', 'libvpx-vp9', '-crf', '40', '-b:v', '0', '-deadline', 'good', '-cpu-used', '4', '-an', dest], 'trim');
  fs.rmSync(raw);
  fs.writeFileSync(path.join(out, `${scenario.name}-${lang}${suf}.json`), JSON.stringify({ lang, total, timeline, shrunk: true }, null, 2));
  console.log('saved', dest, timeline.length, 'cues');
}
