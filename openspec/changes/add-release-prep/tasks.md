# Tasks: add-release-prep

## 1. OSS docs
- [x] 1.1 Public-quality `README.md` (pitch, what it does, run, privacy, links)
- [x] 1.2 `CONTRIBUTING.md` (principles that constrain contributions, workflow, DCO)
- [x] 1.3 `CLA.md` (DCO + optional relicensing grant for a future sync server)
- [x] 1.4 `CODE_OF_CONDUCT.md` (Contributor Covenant)
- [x] 1.5 `SECURITY.md` (real threat model + private reporting)

## 2. desktop-ui design system
- [x] 2.1 Token system (cool paper + deep-teal accent, type scale, radii, motion), light + dark
- [x] 2.2 Native feel: no chrome text-select, no overscroll, focus-visible rings, themed scrollbars, reduced-motion
- [x] 2.3 Unified controls (buttons/fields/messages), sidebar "needle" active state, polished cards & empty states
- [x] 2.4 Disambiguate sidebar (`.sidebar`) from the stepper action row (`.nav`)

## 3. Verification
- [x] 3.1 Front typechecks
- [x] 3.2 Live: the app reads as a calm, finished desktop product — verified on-screen in light (needle nav, single accent CTA per view, focus rings, refined type/cards); dark palette defined by construction (guarded tokens)
