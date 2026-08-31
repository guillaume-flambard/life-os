# Design: add-safety

## Distress detection is local, conservative, and never exfiltrated (NFR15)
Screening is a pure Rust function over the text the user just typed — a curated set
of high-risk French and English phrases (suicidal ideation, self-harm, "envie d'en
finir", "me tuer", "plus envie de vivre", etc.). No model, no network: the text
never leaves the function, let alone the device. It is heuristic, not a diagnosis;
it errs toward showing help (false positives are acceptable, a missed crisis is
not). When it fires, the front does NOT run any coaching AI on that text — it
replaces the flow with a calm resources screen.

Resources are hard-coded and offline (from the resources doc): France **3114**
(national suicide-prevention line, 24/7), **SOS Amitié** (09 72 39 40 50),
emergency **112**, and **Find A Helpline** (findahelpline.com) for other countries.

## High-stakes is a nudge, not a gate (NFR16)
The same screen also flags money/health/legal *major* decisions by keyword. That
does not stop anything; it shows a gentle line that a human professional is
precious for the actual call. The product structures the thinking; it never decides
a high-stakes matter.

## Disclaimer (NFR14)
A short, persistent "not a therapist" line is always visible (app footer), and the
settings page restates it next to the crisis resources. It is not a modal to
dismiss once — it stays present.

## Export & erase (FR15)
- Export writes every entity (areas, intentions, decisions with their options,
  deltas, stories, reviews) to a single Markdown file under the user's Downloads,
  and returns the path. Markdown is the open, portable format the PRD names.
- Erase wipes all user rows across every table (keeping the schema and the
  migration record) and is guarded by an explicit confirmation token, since it is
  irreversible. The UI requires a deliberate two-step confirmation.

## Where screening runs
The front screens the free-text entry points most likely to carry distress: the
decision title on open, the "where you are" and "why" texts, a new intention, and a
review learning. Each is screened locally before any coaching AI sees it.

## Out of scope
No cloud crisis escalation, no contacting third parties, no logging of distress
text (it is screened in-memory and, on a hit, the flow is abandoned without saving
that text). No geolocation — resources are the built-in French set plus the
international directory link.
