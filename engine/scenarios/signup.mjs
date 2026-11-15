import fs from 'node:fs';
import { BASE, demoEmail } from '../lib/harness.mjs';
import { mock } from '../lib/content.mjs';


// Inlined: the mock page is served as https, so an http://localhost image would be blocked as mixed content
const LOGO = 'data:image/png;base64,' + fs.readFileSync(new URL('./rettxlogo.png', import.meta.url)).toString('base64');

// Stand-in for Auth0 Universal Login with passwordless email: "Create Your Account" (screen_hint=signup),
// then "Verify Your Identity" (one-time code). One page, two views.
const AUTH0_SIGNUP = (lang) => { const t = mock(lang).signup; return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${t.title}</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:#f1f1f4;color:#1e212a;min-height:100vh;display:flex;align-items:center;justify-content:center}
main{background:#fff;width:400px;max-width:100%;padding:40px 32px 32px;border-radius:5px;box-shadow:0 12px 40px rgba(0,0,0,.12);text-align:center}
@media(max-width:480px){body{align-items:stretch;background:#fff}main{box-shadow:none;border-radius:0;padding-top:56px}}
img{height:52px;margin-bottom:24px}h1{font-size:24px;font-weight:400;margin:0 0 16px}
p{font-size:14px;line-height:1.5;color:#2d333a;margin:0 0 24px}b{font-weight:600}
.f{position:relative;margin-bottom:24px;text-align:left}
input{width:100%;height:52px;border:1px solid #c9cace;border-radius:3px;padding:16px;font-size:16px;outline:none}
#code{letter-spacing:.2em}
input:focus{border-color:#435bd0;box-shadow:0 0 0 1px #435bd0}
label{position:absolute;left:12px;top:-8px;background:#fff;padding:0 4px;font-size:12px;color:#65676e}
button{width:100%;height:52px;border:0;border-radius:3px;background:#435bd0;color:#fff;font-size:16px;cursor:pointer}
.alt{font-size:14px;margin-top:20px;color:#2d333a}.alt a{color:#435bd0;font-weight:600;text-decoration:none}
[hidden]{display:none}
</style></head><body><main>
<img src="${LOGO}" alt="rettX">
<section id="signup">
<h1>${t.title}</h1>
<p>${t.sub}</p>
<form onsubmit="document.getElementById('signup').hidden=true;document.getElementById('verify').hidden=false;document.title=document.querySelector('#verify h1').textContent;return false">
<div class="f"><label for="email">${t.email}</label><input id="email" type="email" autocomplete="email"></div>
<button id="next" type="submit">${t.next}</button></form>
<div class="alt">${t.have} <a href="#">${t.login}</a></div>
</section>
<section id="verify" hidden>
<h1>${t.verify}</h1>
<p>${t.sent}<br><b>${demoEmail(lang)}</b></p>
<form onsubmit="return false"><div class="f"><label for="code">${t.code}</label><input id="code" inputmode="numeric" autocomplete="one-time-code"></div>
<button id="go" type="submit">${t.next}</button></form>
<div class="alt">${t.none} <a href="#">${t.resend}</a></div>
</section>
</main></body></html>`; };

export default {
  name: 'signup',
  anonymous: true,
  auth0: AUTH0_SIGNUP,

  initialState: () => ({}),
  api: ({ path }) => (path.startsWith('/public') || path.startsWith('/stats') ? {} : undefined),

  async run({ page, lang, VP, wait, cue, click, move, begin }) {
    await page.goto(`${BASE}/`);
    const join = page.locator('[data-testid="hero-cta-primary"]');
    await join.waitFor({ timeout: 30000 });
    await begin();
    await page.mouse.move(VP.width / 2, VP.height / 3);

    cue('landing'); await wait(3000);
    await move(join); await wait(1200);
    cue('join');
    await click(join);

    await page.waitForURL('https://login.rettx.eu/**', { timeout: 20000 });
    await page.waitForSelector('#email');
    cue('account'); await wait(2500);
    await click(page.locator('#email')); await wait(400);
    await page.keyboard.type(demoEmail(lang), { delay: 90 }); await wait(900);
    await click(page.locator('#next'));

    await page.waitForSelector('#code');
    cue('code'); await wait(3000);
    await click(page.locator('#code')); await wait(400);
    await page.keyboard.type('482915', { delay: 220 }); await wait(900);
    await click(page.locator('#go')); await wait(1500);
  },
};
