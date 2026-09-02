# Redesign: a conversational, hand-held front-end

## Why

The first UI was a dashboard: a sidebar and five screens, forms up front. It
worked but asked the user to understand the whole app before doing anything —
the opposite of the product's promise (a coach that lightens, meets you where
you are, never over-systematizes).

This change reshapes the human-mode front-end into a single guided conversation.
The first run has no wizard: one warm line, then one choice. Each step does the
smallest useful thing and hands the wheel back. The user's world (compass,
notebook, review) is revealed progressively, as they create things — the field
of possibility grows instead of being dumped at once.

It also makes the local model's reasoning visible: when an assist runs, its
thinking streams in as a live timeline, then folds to "thought for N s". This is
transparency (NFR: local AI, no black box), not decoration.

The engine, commands, and data model are unchanged. This is a presentation-layer
change: React + a component library, the human façade over the same engine.

## What changes

- The home becomes a conversation (the guided thread), not a dashboard.
- Onboarding folds into the first turns of that conversation.
- The shell drops the always-visible sidebar; navigation is revealed after the
  first act and lives behind a compact menu.
- AI-assisted moments stream the model's reasoning inline (live timeline →
  collapsed "reasoning" disclosure).
- Every surface (compass, notebook, review, today, settings, distress) is
  restyled on one calm, editorial design system; states (loading / empty /
  error) are handled uniformly.

## Non-goals

- No change to the engine, Tauri commands, DB schema, or safety model.
- No new capabilities in the domain sense — this is how the existing
  capabilities are presented.

## Impact

- Façade rule still holds: engine vocabulary never appears in human mode.
- Expert mode still reveals mechanics inline.
- The AI stays optional: every assisted step has a manual fallback, and the
  reasoning display simply does not appear when no model is present.
