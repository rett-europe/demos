# rettX demos

Interactive HTML demos of rettX, published with GitHub Pages.

| Demo | Path |
| --- | --- |
| How onboarding works (desktop, mobile, side by side; EN, ES) | [`onboarding/`](onboarding/index.html) |

All data shown is synthetic. No patient or personal data is used, and rettX is not a medical device.

## How the demos are made

The recordings are generated from the real rettxweb app, with Auth0 and the API mocked, by the capture
scripts in [`rettxweb/tools/onboarding-demo`](https://github.com/rett-europe/rettxweb/tree/main/tools/onboarding-demo).
Re-run them when the UI changes, then copy `player/` output into the matching folder here.
