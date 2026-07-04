# Rankings Over Time — Dataset Specification v1

Every race is a single JSON file in `/data/<id>.json`. The engine treats data as
config: adding or upgrading a dataset must never require a code change.

## Schema

```jsonc
{
  "id": "atp-weeks",                  // kebab-case, matches filename
  "title": "Weeks at World No. 1",    // display title, ≤ 40 chars
  "shortTitle": "ATP No. 1",          // for cards / nav, ≤ 18 chars
  "category": "tech",                 // tech | sports | culture | science | wildcard
  "unit": {
    "label": "Cumulative weeks",      // shown under the clock
    "format": "plain",                // plain | si | percent
    "prefix": "",                     // e.g. "$"
    "suffix": " wks",                 // e.g. "B", "%", " m"
    "decimals": 0                     // decimals at full magnitude
  },
  "scale": "linear",                  // linear | log  (log for FLOPS-style ranges)
  "topN": 10,                         // bars visible at once (8–12)
  "timeLabel": "year",                // year | yearMonth (how t renders on the clock)
  "blurb": "Two–three sentences written for THIS dataset. Specific, not templated.",
  "source": {
    "name": "ATP Tour",
    "url": "https://www.atptour.com/en/rankings",
    "note": "Optional one-line methodology caveat."
  },
  "dataQuality": "sourced",           // sourced | illustrative — be honest
  "lastUpdated": "2026-07-03",
  "entities": [
    { "id": "djokovic", "label": "Novak Djokovic", "color": "#4C8DFF" }
  ],
  "keyframes": [
    { "t": 1973.6, "values": { "nastase": 12, "smith": 4 } }
  ],
  "milestones": [
    { "t": 2004.1, "title": "Federer era begins", "text": "≤140 chars of context shown as a callout when the playhead crosses this moment." }
  ]
}
```

## Rules

1. **`t` is a decimal year** (e.g. `2007.5` = mid-2007). Keyframes strictly
   ascending. The engine interpolates between keyframes — do NOT interpolate
   yourself.
2. **Keyframe density**: annual for most series (25–80 keyframes). Every 4
   years for Olympics, irregular for record-style series (tallest buildings).
   More keyframes at dramatic stretches is good.
3. **`values`**: numbers only, never strings. An entity absent from a keyframe
   means "not present / zero" at that time — omit rather than writing 0,
   EXCEPT write an explicit 0 (or small value) at the keyframe immediately
   before an entity's first appearance so it grows in rather than teleporting.
4. **Entity coverage**: include every entity that ever cracks the top `topN`
   during the timespan. Typically 12–25 entities.
5. **Cumulative series must never decrease.** Snapshot series (market share,
   MAU, market cap) may rise and fall.
6. **Milestones**: 4–8 per race. The single most famous overtake/moment in the
   series MUST be one of them (e.g. Google passes Yahoo, T-Series passes
   PewDiePie). `title` ≤ 40 chars, `text` ≤ 140 chars.
7. **Blurb**: 2–3 sentences, written specifically for the dataset — what's
   being measured, why the race is interesting. No boilerplate.
8. **`dataQuality`**: `"sourced"` only when the series tracks real published
   figures (Olympics, ATP, TOP500, F1, UN population). Use `"illustrative"`
   for reconstructed/estimated series (early social-media MAUs, franchise box
   office splits) and say so in `source.note`. Accuracy beats drama: for
   sourced sets, get the famous numbers right (Djokovic 428 weeks, Burj
   Khalifa 828 m, USA leading Olympic golds, etc.).
9. **Colors**: each entity gets a distinct hex, vivid enough to read on a
   near-black background (#0B0E14). Use iconic brand/team colors where they
   exist (Ferrari red, Spotify green, Google blue, Brazil yellow). Otherwise
   pick from this palette, never using the same swatch twice in one dataset:
   `#4C8DFF #2FB4FF #67E8F9 #23C8A8 #34D399 #A3E635 #FFD84D #FFB020 #FF8C42
    #FF5C4D #F43F5E #FF6FA5 #E879F9 #B388FF #8B5CF6 #6E7BFF #94A3B8 #C4B5A0
    #FCA5A5 #FDE68A #86EFAC #D4D4D8 #E2B93B #B45309`
   Avoid two near-identical hues among entities likely to be adjacent at the
   top of the board.
10. **Log scale** (`"scale": "log"`) only for series spanning ≥ 4 orders of
    magnitude (supercomputer FLOPS). Values must then all be > 0.
11. Keep each file under ~60 KB. Round values sensibly (market caps to whole
    $B, shares to 0.1 %).

## Validation

`node scripts/validate-data.mjs` must pass. It checks schema shape, ascending
`t`, numeric values, entity references, color uniqueness, and milestone bounds.
