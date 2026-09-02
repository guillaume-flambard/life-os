# Tasks — redesign-conversational-ui

## Foundation
- [x] React 19 + Chakra UI v3 + pnpm 11 toolchain; theme (warm paper + teal
      needle accent), light/dark via semantic tokens
- [x] Provider (Chakra + next-themes), hash router, framer-motion transitions
- [x] Shared states: loading / empty / error via a single async helper

## Conversation
- [x] Conversation engine (say / ask / input / widget) + calm one-column thread
- [x] First-run onboarding folded into the first turns (no wizard)
- [x] Branches: a decision, what matters (compass), a note
- [x] Progressive reveal: navigation menu appears after the first act
- [x] Returning-user recap + pending-step follow-through
- [x] "Faire le point" branch: integrate a ready decision, or reflect, in-thread
- [x] Local distress screening surfaces resources in-thread

## Reasoning display
- [x] Backend streams local-model thinking over `ai-reasoning` events
- [x] Live reasoning timeline (steps on a rail, timer) → folds to "reasoning"
- [x] Robust splitting of the streamed thinking into legible steps

## Surfaces
- [x] Compass, notebook (with decision detail), review, today, settings, distress
      restyled on one design system with a shared page header
> Note: `harden-core` later made these surfaces honest (failed writes report a
> real error instead of a canned success), cleaned up timer/flow lifecycle, kept
> the distress affordance always reachable, and fixed the last façade leak in
> Settings. The three open items below are unaffected and still genuinely open.
- [x] Guided decision parity: pre-mortem, explicit "none of these", editing —
      `branchDecision` now collects every field the engine's `finalize` requires
      (≥2 real options + an explicit null option, chosen option + pre-mortem,
      10/10/10 distance, the why, one next small step) and finalizes for real;
      the old flow added a single option and silently swallowed the resulting
      `incomplete`. Verified by `guided_decision_flow_finalizes_without_a_delta`.
- [~] End-to-end verification with the Tauri backend + local model (Ollama) —
      AI layer verified live via `live_structured_calls_are_schema_valid` (all 7
      structured calls schema-valid against a real model); the full click-through
      GUI pass on a desktop build is still pending.

## Release
- [x] CI builds the React + pnpm + Tauri app on Windows + macOS
- [ ] Merge to main and cut the next release once verified live
