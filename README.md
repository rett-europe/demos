# rettX demos

Interactive HTML demos of how families register on rettX, published at **https://rett-europe.github.io/demos/**.

| Demo | Link |
| --- | --- |
| Home page listing all demos | [/demos/](https://rett-europe.github.io/demos/) |
| Step-by-step chapters (desktop, mobile, side by side), 19 languages | [/demos/onboarding/](https://rett-europe.github.io/demos/onboarding/) |
| Mobile story (tap through, like an app), 7 languages | [/demos/story/](https://rett-europe.github.io/demos/story/) |

Story links accept `?lang=fr` (en, es, fr, de, it, pl, gr) and `?fs=1` (start in full screen).

The videos are recordings of the **real rettxweb app**, with sign-in and the API replaced by fake responses.
All data shown is synthetic: no patient or personal data is used. rettX is not a medical device.

## How it works

This is "demo as code": the texts and the story are plain files, and a script records the app and builds the site.

```
content/
  home.yaml               the home page: one card per demo
  story.yaml              the mobile story: order of explanation cards and video clips
  languages/<lang>.yaml   every text, one file per language
engine/                   recorder and site builder (developers only)
.github/workflows/        "Check content" on every PR, "Publish demos" on demand
```

The published site lives on the `gh-pages` branch, which is rebuilt from scratch on every publish.
Don't edit it by hand.

## Common changes

### Fix or improve a text

1. Open `content/languages/<lang>.yaml` on GitHub and click the pencil (Edit).
2. Change the text between the quotes. Keep the keys (the words before `:`) as they are.
3. Choose **Create a new branch and start a pull request**. The *Check content* check tells you if something is off.
4. After merging, a maintainer runs **Actions → Publish demos → Run workflow** with *languages* left empty.
   This republishes the texts in a couple of minutes, without re-recording any video.

### Add the mobile story to a language

Copy the `story:` and `mock:` sections from `en.yaml` into the language file, translate them, open a PR.
After merging, run *Publish demos* with that language in *languages* (e.g. `pt`), so its videos are recorded.

- `story` holds the explanation cards between clips.
- `mock` holds the parts of the videos that are not the rettX app: the sign-up page and the phone's file picker,
  plus the example email address. Anything left out falls back to English.

### Add a language

Copy `en.yaml` to `<code>.yaml`, translate it, set `name:` (the language in itself, e.g. `Français`).
`story` and `mock` are optional: without them, the language gets the chapters only.
The rettxweb app must support the language too, or the recording will show English.

### Change the home page or add a demo to it

Edit `content/home.yaml`: each demo has a title, a short text, tags and a poster (a frame from a published
video, e.g. `story/media/signup-en.webm#5` = second 5). The link and the number of languages of the built-in demos
are filled in automatically; a new kind of demo can point anywhere with `link:`.

### Change the story

Edit `content/story.yaml`. Each item is either

- a **card** (`card: <id>`, `step: <number>`), whose texts are under `story.cards.<id>` in every language file;
- a **clip** of a recording (`clip: <name>`), optionally cut with `from:` / `to:`, the names of moments marked in the
  recording script `engine/scenarios/<name>.mjs` (e.g. `cue('upload-start')`).

New cards need their texts in `en.yaml` (required) and in the other story languages.

## For developers

Requirements: Node 22, a checkout of [rettxweb](https://github.com/rett-europe/rettxweb) next to this repo
(`C:\rettx\rettxweb` / `../rettxweb`, or set `RETTXWEB_DIR`), with its `src/environments/environment.ts`.

```bash
# 1. serve the app on port 3000 (in rettxweb)
npx ng serve --port 3000

# 2. record (in engine/), then build the site into ../_site
npm install
node record.mjs --langs en,fr            # or --langs all; --scenarios signup; --mobile-only
node build.mjs
npx http-server ../_site -p 8080         # preview at http://localhost:8080
```

- `node check.mjs` validates the content (also run on every PR).
- `build.mjs` only re-encodes recordings that changed. To build on top of the published videos, clone the
  `gh-pages` branch into `_site` first.
- Recording scripts are in `engine/scenarios/`, the fake API and sign-in in `engine/lib/harness.mjs`,
  and the fake documents (genetic reports, policies) in `engine/documents/`.
- Players: `engine/player/` (chapters) and `engine/story-player/` (mobile story).

### Publishing

**Actions → Publish demos → Run workflow**:

| Input | Meaning |
| --- | --- |
| languages | Languages to re-record (`en,fr` or `all`). Empty: texts only, keep the current videos. |
| scenarios | Only these recordings (e.g. `onboarding,signup`). Empty: all. |
| rettxweb_ref | rettxweb tag or branch to record. Empty: the latest release. |

Re-record after a rettxweb release that changes the screens shown in the demos.
The workflow needs the repository secret `RETTXWEB_TOKEN`: a fine-grained token with read access to
`rett-europe/rettxweb` contents.
