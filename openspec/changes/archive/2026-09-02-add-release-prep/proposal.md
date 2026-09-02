# Change: add-release-prep

## Why

Phase 2 heads toward an open-source release and a Show HN. Two things gate that: the
repo must be welcoming and safe to contribute to, and the app must *look* like a
finished, calm desktop product rather than a functional prototype. This change adds
the OSS contribution scaffolding and reshapes the UI into a deliberate,
desktop-native design system.

## What changes

- **OSS docs** — a public-quality `README`, `CONTRIBUTING.md`, `CLA.md` (DCO +
  optional relicensing grant for a future sync-server module), `CODE_OF_CONDUCT.md`,
  and `SECURITY.md` (with the real threat model: encryption at rest, no exfiltration,
  snapshot encryption, distress safety). License is already AGPL-3.0.
- **desktop-ui** — a calm design system ("the needle"): a cool-neutral paper ground
  with a single deep-teal accent used with restraint, a refined type scale, hairline
  structure, light + dark themes, and native desktop behaviors — no text selection on
  the chrome, no overscroll rubber-band, crisp focus-visible rings, themed
  scrollbars, tuned hover/active/disabled states, short reduced-motion-aware
  transitions, and polished empty states. The sidebar's active item shows a small
  accent "needle"; the accent otherwise marks only the primary action and focus.

## Impact

- New docs at the repo root; no code behavior change from them.
- `src/styles/app.css` rewritten as a design system; `main.ts` sidebar class renamed
  (`.nav` → `.sidebar`) to stop colliding with the stepper's action row. No change to
  data, commands, or the façade rule — human mode still shows zero jargon.
