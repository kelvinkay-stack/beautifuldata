# Overtake — Rankings Over Time

A destination site built around one interaction: watching rankings reorder
themselves over time as animated bar chart races. Static, dependency-free at
runtime, deployable to Netlify.

**55 races across 9 categories** — Tech & Business, Sports, Entertainment &
Culture, Science & Infrastructure, Money & Markets, World & Nations, Games &
Play, and Wildcard.

## How it works

- **Data is config.** Every race is one JSON file in `data/<id>.json`
  (schema in [docs/DATA-SPEC.md](docs/DATA-SPEC.md)). Adding or upgrading a
  race never requires a code change.
- **The engine** (`js/engine/`) renders on a 2D canvas at 60fps: monotone
  cubic interpolation between keyframes (`model.js`), a critically-damped rank
  spring with overtake pulses (`controller.js`), and a scoreboard renderer
  (`renderer.js`). Respects `prefers-reduced-motion` with keyframe stepping.
- **The build** (`scripts/build.mjs`) generates the hub, one page per race,
  `sitemap.xml`, `robots.txt`, and an OG card per race. Engine modules are
  cache-busted via a content-hash import map so redeploys never serve a stale
  module against a fresh page.

## Commands

```sh
npm run validate   # check every dataset against the spec
npm run build      # validate, then generate all pages + OG images
npm run serve      # local static server on :8123
```

Run `npm install` once (pulls `@resvg/resvg-js` for OG PNG rendering; without
it the build writes OG SVGs instead).

## Adding a race

1. Write `data/<id>.json` following `docs/DATA-SPEC.md`.
2. Add `{ "id": "<id>", "category": "<cat>" }` to `race`s in `site.config.json`.
3. `npm run build`. The hub, race page, sitemap and OG image appear
   automatically.

To add a category, add it to `categories` in `site.config.json` (with an
`accent`, `accentSoft`, and a `motif` that maps to an icon in `build.mjs`).

## Data quality

Each dataset declares `dataQuality: "sourced"` or `"illustrative"`, shown as a
badge on the card and race page. Sourced sets track real published figures
(World Bank, SIPRI, Forbes, IOC, TOP500, UN, etc.); illustrative sets are
clearly-labelled reconstructions and can be upgraded later as a config swap.
