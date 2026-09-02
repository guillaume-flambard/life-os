# Change: add-review

## Why

This closes the loop. With a compass (add-compass) and decisions-as-change-proposals
(add-guided-decision), the missing piece is "the check-in" — a periodic, kind review
that replays the person's intentions and asks, without judging, whether life
followed; and that *integrates* a confirmed decision so its change becomes the new
normal in the compass. This is Epic 5 (FR7, FR8) and it is what actually proves the
4-week thesis: Epics 1-3 alone never close the review loop.

The tone is non-negotiable: compassionate QA, never a tribunal. No debt/failure
language; "too early to tell" is a first-class answer; the review opens a
conversation, it doesn't tick boxes.

## What changes

- **review** — a new capability:
  - Start a check-in over a period.
  - Replay each active intention in plain words ("when [situation] happened, did
    you [action]?") and record an outcome — better / as intended / less than I'd
    have liked / too early — plus one learning. No judgment.
  - Integrate a proposed decision: applying its delta updates the compass
    (added → new intention, modified → updated intention, removed → archived
    intention); the delta is marked applied, the decision becomes applied, and the
    history is kept.

## Impact

- New capability: `review`.
- New code: a review repo (over the existing `reviews` / `review_items` tables),
  decision integration (`apply_decision` resolving each delta onto the compass),
  new Tauri commands, and a functional "Le point" surface.
- Builds on all prior changes. No migration — `reviews`, `review_items`, `deltas`,
  `intentions` already exist. Applying a delta reuses the compass caps (adding an
  intention past the cap is still refused).
