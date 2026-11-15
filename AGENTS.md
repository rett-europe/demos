# AGENTS.md — rett-europe/demos

Instructions for AI coding agents (Copilot, Claude, others) and a map for humans. Read this before changing anything.

## What this repo is

Interactive HTML demos that show families how to register on **rettX** (the European Rett syndrome registry),
published at https://rett-europe.github.io/demos/.

The idea is **demo as code**:

- The videos are **recordings of the real rettxweb app** (Angular), driven by Playwright scripts. Sign-in (Auth0)
  and the rettX API are **mocked** in the browser, so no account, backend or real data is involved.
- Everything people see is **text in YAML** (`content/`), so translators and non-developers can improve the demos
  from the GitHub web editor with a pull request.
- A small Node engine (`engine/`) records the app and **builds a static site**; a manual GitHub workflow
  publishes it to the `gh-pages` branch.

Current demos: the **home page** (`/`), the **step-by-step chapters** (`/onboarding/` … `/completed/`, desktop +
mobile side by side, 19 languages) and the **mobile story** (`/story/`, tap-through, 7 languages, `?lang=` and `?fs=1`).

## Non-negotiables

1. **Synthetic data only.** Never put real or realistic personal/patient data anywhere: mocks, documents, texts,
   screenshots, fixtures. Use the existing fake identities (`Lia Demo`, `RE-DEMO-0001`, `your.email@email.com`).
2. **rettX is not a medical device.** No diagnostic or medical claims in any text.
3. **No secrets in the repo.** The only secret is `RETTXWEB_TOKEN` (repo secret, read access to rettxweb). Never
   commit rettxweb's `environment.ts` or tokens.
4. **Never commit videos or the built site to `main`.** `main` is source only. `engine/recordings/`, `_site/`
   and `node_modules/` are git-ignored. The site exists only on `gh-pages`, which is a single commit force-replaced
   by each publish. Never edit `gh-pages` by hand.
5. **English is the reference.** Every text in `content/languages/en.yaml` must exist with the same structure in
   every other language file (`story` and `mock` sections are optional per language). `node engine/check.mjs`
   enforces this and runs on every PR.
6. **Keep it simple.** This is a small tool for a small team. No frameworks, bundlers, test suites or extra
   dependencies (the engine depends on `playwright` and `yaml` only). Plain HTML/CSS/JS in the players.
7. **Show the real app.** Don't fake rettX screens in HTML. Only things outside rettxweb are drawn by mocks
   (the Auth0 sign-up page, the phone's file picker, the example documents).

## Layout

```
content/                      ← what contributors edit
  home.yaml                   home page cards (demo: chapters|story, or link:)
  story.yaml                  mobile story: ordered list of card / clip items
  languages/<code>.yaml       all texts for one language: name, chapters, story?, mock?
engine/                       ← developers
  record.mjs                  records scenarios into engine/recordings/<scenario>/<scenario>-<lang>[-m].webm|.json
  build.mjs                   builds ../_site from content + recordings (+ media already in _site)
  check.mjs                   validates content/ (CI on every PR and push)
  lib/content.mjs             loads YAML: LANGUAGES, STORY, STORY_LANGS, HOME, mock(lang)
  lib/plan.mjs                CHAPTERS (order of chapters), what to record per language
  lib/harness.mjs             Playwright recorder, Auth0 + API mocks, cursor, cues
  lib/ffmpeg.mjs              ffmpeg lookup and VP9 shrink
  scenarios/<name>.mjs        one recording script per scenario
  documents/                  fake documents shown in the app (privacy policy, consent form, genetic reports)
  player/                     chapter player (player.js/.css)
  story-player/               mobile story player (index.html, logo, fonts)
.github/workflows/
  check.yml                   content check on PR/push
  publish.yml                 manual: record (optional) → build → force-push gh-pages
```

Language codes follow the **rettxweb app** codes (`cz`, `dk`, `ge`, `gr`, `se`, `ua`, …), not ISO codes.

## How to proceed

Always finish with `cd engine && node check.mjs`. If you can, also build and look at the result (below).

| Task | Where | Notes |
| --- | --- | --- |
| Fix or improve a text | `content/languages/<code>.yaml` | Only change values, never keys. Republish with *languages* empty (no re-record). |
| Add a language | copy `en.yaml` → `<code>.yaml`, set `name:` | rettxweb must support the language. Needs a re-record of that language. |
| Add the story to a language | add `story:` (+ `mock:`) sections | Same keys as `en.yaml`. Re-record that language (story clips are mobile recordings). |
| Reorder/add story cards | `content/story.yaml` + `story.cards.<id>` in **every** story language | `step:` is the number shown. New card ids must exist in `en.yaml`. |
| Cut a clip differently | `from:` / `to:` in `story.yaml` | Values are cue ids from the scenario (`cue('code')`). No re-record needed if the cue exists. |
| Change what a video shows | `engine/scenarios/<name>.mjs` | Needs a re-record of every language using it. Keep cue ids stable or update `story.yaml`. |
| New chapter | new scenario + `CHAPTERS` in `lib/plan.mjs` + `chapters.steps/captions` in every language | Caption keys = cue ids (or a list in cue order). |
| Change the home page / add a demo | `content/home.yaml` | `poster: <site path>.webm#<second>` takes a frame from a published video. |
| Change players or layout | `engine/player/`, `engine/story-player/`, `build.mjs` | Build locally and check desktop + phone sizes. |

### Writing a scenario

A scenario exports `{ name, initialState(lang), api({method, path, query, body, state}), run(ctx) }`:

- `api` answers every rettX API call (return an object to reply, `undefined` for the harness default). Mirror the
  real rettxapi response shapes; don't invent fields.
- `run` gets `{ page, lang, mobile, VP, state, wait, cue, move, click, begin }`. Wait for the app to be ready, call
  `begin()` to start the timeline, then drive the UI with `click`/`move` (visible cursor) and `wait`.
- `cue('<id>')` marks a moment: chapters use cues for captions, the story uses them for `from`/`to`.
- Use stable selectors from rettxweb (classes, `formcontrolname`, roles), never translated text, so the same
  script works in every language. Language-specific option lookups live in `lib/langs.mjs`.

### Local workflow

Requires Node 22 and rettxweb checked out next to this repo (`../rettxweb`, or set `RETTXWEB_DIR`) with
`src/environments/environment.ts`, served on port 3000 (`npx ng serve --port 3000`).

```bash
cd engine
npm install
node record.mjs --langs en --scenarios signup --mobile-only   # record only what you changed
node build.mjs                                                # → ../_site, re-encodes only changed recordings
npx http-server ../_site -p 8080
```

To build on top of the published videos without recording, first `git clone --depth 1 -b gh-pages
https://github.com/rett-europe/demos.git _site`.

### Publishing

Manual only: **Actions → Publish demos**. Inputs: `languages` (empty = texts only; `all`; or `en,fr`),
`scenarios` (subset to re-record), `rettxweb_ref` (default: latest rettxweb release). Re-record after a rettxweb
release that changes the screens in the demos. Agents must not trigger publishing or force-push `gh-pages`
unless the user asks.

## Git conventions

- Branch from `main`: `content/<topic>`, `feat/<topic>`, `fix/<topic>`. Small PRs; the *Check content* check must pass.
- Commit or push only when the user asks.
- Don't add new top-level folders or tooling without a clear need.
