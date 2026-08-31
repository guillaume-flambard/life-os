# OpenSpec conventions for Life OS

This directory is the artifact backbone of the project. It mirrors OpenSpec:
`specs/` holds the current truth; `changes/` holds proposals not yet merged.

## Directory layout

```
openspec/
  project.md          # project context (read first)
  AGENTS.md           # this file
  specs/              # current truth, one folder per capability
    <capability>/
      spec.md         # Requirements + GIVEN/WHEN/THEN scenarios
  changes/            # one folder per change proposal
    <change-id>/
      proposal.md     # the WHY
      design.md       # the strategy / technical decisions
      tasks.md        # checkable task list
      specs/          # spec DELTAS this change introduces
        <capability>/
          spec.md
```

## Change lifecycle

`propose → review → apply → archive`. When a change is applied, its spec deltas
merge into `specs/` and the change folder is archived. Nothing in `specs/` is
edited directly; all changes flow through `changes/`.

## Delta format

A change's `specs/<capability>/spec.md` declares operations on requirements:

- `## ADDED Requirement: <name>` — a new requirement.
- `## MODIFIED Requirement: <name>` — an amended requirement.
- `## REMOVED Requirement: <name>` — a retired requirement.

Every requirement carries at least one scenario:

```
#### Scenario: <short name>
- GIVEN <precondition>
- WHEN <action>
- THEN <observable outcome>
```

## Naming

Change ids are kebab-case verbs: `add-foundations`, `add-compass`,
`add-guided-decision`. Capability names are kebab-case nouns: `secure-storage`,
`local-ai`, `app-shell`.

## Life mapping (engine ↔ human façade)

Never leak engine vocabulary into human-mode UI. Reference table:

| Engine | Human façade |
|---|---|
| Life-Spec | "your compass" |
| Domain | a life area ("Your close ones", "Your body"…) |
| Requirement | "an intention" / "what matters" |
| MUST / SHOULD / MAY | red line / would-like / bonus |
| GIVEN/WHEN/THEN scenario | "when [situation], I [action]" |
| Change proposal | "a decision to make" |
| delta ADDED/MODIFIED/REMOVED | "what changes: you add / change / stop" |
| story | "your next small step" |
| apply / archive | "it's settled" |
| QA / review | "this week's check-in" |
| agent roles | one voice; moments, not characters |
