// Shared chapter player. Each chapter page loads journey.js, its own demo.js (window.DEMO) and this file.
// DEMO = { id, step (1-based), langs: { en: { name, title, d:[], m:[], cap:[], cards?:[{icon,title,text}] } } }
(() => {
  const J = window.JOURNEY, D = window.DEMO, $ = (id) => document.getElementById(id);
  const root = '../';
  const v = $('v'), vm = $('vm'), seek = $('seek'), pp = $('pp'), sel = $('lang'), steps = $('steps'),
    time = $('time'), err = $('err'), stage = $('stage');
  let lang = new URLSearchParams(location.search).get('lang') || localStorage.getItem('rettx-demo-lang') || 'en';
  if (!D.langs[lang]) lang = 'en';
  let mode = 'both';
  const ui = () => J.ui[lang] || J.ui.en;
  const fmt = (s) => (isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00');
  const tr = (o) => o[lang] || o.en;
  const cards = D.kind === 'cards';

  function chrome() {
    const u = ui(), n = J.steps.length;
    $('title').textContent = D.langs[lang].title;
    $('home').textContent = tr(J.title);
    $('home').href = root + '?lang=' + lang;
    $('stepper').innerHTML = J.steps.map((s, i) =>
      `<a href="${root}${s.id}/?lang=${lang}" class="${i + 1 === D.step ? 'on' : i + 1 < D.step ? 'done' : ''}"><b>${i + 1 < D.step ? '✓' : i + 1}</b><span>${tr(s.title)}</span></a>`).join('');
    const prev = J.steps[D.step - 2], next = J.steps[D.step];
    $('nav').innerHTML = (prev ? `<a href="${root}${prev.id}/?lang=${lang}">← ${u.prev}: ${tr(prev.title)}</a>` : `<a href="${root}?lang=${lang}">← ${u.all}</a>`) +
      (next ? `<a class="next" href="${root}${next.id}/?lang=${lang}">${u.next}: ${tr(next.title)} →</a>` : `<a class="next" href="${root}?lang=${lang}">${u.all}</a>`);
    document.documentElement.lang = lang;
    document.title = 'rettX – ' + D.langs[lang].title;
    if (!cards) {
      document.querySelectorAll('#views button').forEach((b) => (b.textContent = u[b.dataset.m]));
      $('stepsH').textContent = u.steps;
    }
  }

  // desktop time <-> mobile time, piecewise-linear between matching cues
  const map = (t, a, b) => {
    if (t <= a[0]) return a[0] ? (t * b[0]) / a[0] : t;
    for (let i = 1; i < a.length; i++) if (t <= a[i]) return b[i - 1] + ((t - a[i - 1]) * (b[i] - b[i - 1])) / (a[i] - a[i - 1]);
    return b[b.length - 1] + (t - a[a.length - 1]);
  };
  const toM = (t) => map(t, D.langs[lang].d, D.langs[lang].m);
  const fromM = (t) => map(t, D.langs[lang].m, D.langs[lang].d);

  function renderCards() {
    $('cards').innerHTML = D.langs[lang].cards.map((c) =>
      `<div class="card${c.note ? ' note' : ''}"><div class="ic" aria-hidden="true">${c.icon}</div><h3>${c.title}</h3><p>${c.text}</p></div>`).join('');
  }

  for (const k in D.langs) sel.add(new Option(D.langs[k].name, k));

  if (cards) {
    sel.value = lang;
    sel.onchange = () => { lang = sel.value; localStorage.setItem('rettx-demo-lang', lang); chrome(); renderCards(); };
    chrome(); renderCards();
    return;
  }

  const master = () => (mode === 'mobile' ? vm : v);
  const slave = () => (mode === 'mobile' ? v : vm);
  const now = () => (mode === 'mobile' ? fromM(vm.currentTime) : v.currentTime);
  const total = () => (mode === 'mobile' ? fromM(vm.duration) : v.duration);
  const setT = (t) => { v.currentTime = t; vm.currentTime = toM(t); };
  function sync() {
    const s = slave(); if (s.readyState < 1) return;
    const want = mode === 'mobile' ? fromM(vm.currentTime) : toM(v.currentTime);
    if (Math.abs(s.currentTime - want) > 0.25) s.currentTime = want;
    if (master().paused !== s.paused && !master().ended) master().paused ? s.pause() : s.play().catch(() => {});
  }
  function load(l) {
    lang = l; sel.value = l; localStorage.setItem('rettx-demo-lang', l); err.style.display = 'none';
    v.src = `media/${D.id}-${l}.webm`; vm.src = `media/${D.id}-${l}-m.webm`; v.load(); vm.load();
    steps.innerHTML = '';
    D.langs[l].d.forEach((t, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<b>${i + 1}</b><span>${D.langs[l].cap[i]}</span>`;
      li.onclick = () => { setT(t); play(); };
      steps.append(li);
    });
    chrome(); update();
  }
  function update() {
    const t = now(), T = total(); let c = -1;
    D.langs[lang].d.forEach((x, i) => { if (t >= x) c = i; });
    seek.value = T ? (t / T) * 1000 : 0; time.textContent = fmt(t) + ' / ' + fmt(T);
    [...steps.children].forEach((li, i) => li.classList.toggle('on', i === c));
  }
  const loop = () => { sync(); update(); requestAnimationFrame(loop); };
  const play = () => { v.play().catch(() => {}); vm.play().catch(() => {}); pp.textContent = '❚❚'; };
  const pause = () => { v.pause(); vm.pause(); pp.textContent = '▶'; };
  const playing = () => !master().paused && !master().ended;
  const toggle = () => (playing() ? pause() : play());
  const done = () => { pp.textContent = '▶'; slave().pause(); };
  v.addEventListener('ended', () => { if (mode !== 'mobile') done(); });
  vm.addEventListener('ended', () => { if (mode === 'mobile') done(); });
  for (const x of [v, vm]) x.addEventListener('error', () => { err.textContent = `Could not load a video file for "${lang}" (media/${D.id}-${lang}[-m].webm).`; err.style.display = 'block'; });
  pp.onclick = toggle; v.onclick = toggle; vm.onclick = toggle;
  seek.oninput = () => { const T = total(); if (T) setT((seek.value / 1000) * T); };
  sel.onchange = () => { pause(); load(sel.value); };
  function setMode(m) {
    const t = now(), was = playing(); mode = m; stage.className = 'stage mode-' + m;
    document.querySelectorAll('#views button').forEach((b) => b.classList.toggle('on', b.dataset.m === m));
    setT(t); if (was) play();
  }
  document.querySelectorAll('#views button').forEach((b) => (b.onclick = () => setMode(b.dataset.m)));
  setMode('both'); load(lang); loop();
})();
