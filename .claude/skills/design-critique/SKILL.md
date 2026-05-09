---
name: design-critique
description: >-
  Heuristic UX/UI scoring skill for Catalyst surfaces. Given a screenshot or
  live URL, scores against 10 heuristics derived from Nielsen + Atlassian
  Design System guidelines. Produces a structured findings table, severity
  ratings (P0/P1/P2), and a closure evidence block with annotated screenshots.
  Mandatory before any design-only surface is declared done.
  Triggers on: "design critique", "UX review", "audit the design", "heuristic
  review", "design score", "does this look right", "rate the UI".
version: 1.0.0
author: preflight × Vikram × Claude, 2026-05-09
metadata:
  category: design-quality
  tags: [design, ux, heuristics, audit, closure, ads, atlaskit]
  maturity: stable
---

# Design Critique — Heuristic UX/UI Scoring

## Purpose

Stop subjective "looks good" sign-offs. Produce a scored, evidence-backed
design audit against 10 measurable heuristics before any UI surface is
declared done. Pairs with `jira-compare` (pixel parity) and `ads-validator`
(token compliance) to form the full UI quality gate.

---

## The 10 Heuristics (scored 0–3 per surface)

| # | Heuristic | What passes |
|---|---|---|
| H1 | **Visibility of system status** | User always knows what's loading, synced, errored |
| H2 | **Match between system and real world** | Labels, icons, terminology match user's mental model (Jira vocabulary where applicable) |
| H3 | **User control and freedom** | Undo, cancel, escape — no dead ends |
| H4 | **Consistency and standards** | ADS tokens used; same component for same pattern throughout |
| H5 | **Error prevention** | Destructive actions confirm; required fields validate before submit |
| H6 | **Recognition over recall** | State visible in UI without requiring memory; no hidden columns |
| H7 | **Flexibility and efficiency** | Power users: keyboard shortcuts, bulk actions; beginners: discoverable defaults |
| H8 | **Aesthetic and minimalist design** | No redundant info, no banned columns, density matches Jira benchmark |
| H9 | **Typography and visual hierarchy** | ADS token stack (12px/600 headers, 14px/400 body, sentence-case labels, `token()` colours) |
| H10 | **Help and documentation** | Empty states have a call-to-action; error messages name the fix |

Score per heuristic: **3** = fully met · **2** = minor gap · **1** = significant gap · **0** = failing

---

## Critique Protocol

### Step 1 — Screenshot all states
Capture screenshots of the surface in:
- Default loaded state
- Empty state (no data)
- Loading state (skeleton or spinner)
- Error state (network failure or permission denied)
- Expanded / collapsed variants (sidebar, panels)
- Dark mode (if supported)

### Step 2 — Score each heuristic
For each heuristic, state:
- **Score**: 0–3
- **Evidence**: what you observed (DOM probe or visual)
- **Finding**: what's wrong (if score < 3)
- **Severity**: P0 (blocks ship) / P1 (fix before next release) / P2 (polish backlog)

### Step 3 — Produce findings table

```
| Heuristic | Score | Finding | Severity | Fix |
|---|---|---|---|---|
| H4 Consistency | 1 | Three-dots uses shadcn DropdownMenu; rest of app uses AKDropdownMenu | P0 | Replace with AKDropdownMenu |
| H9 Typography | 2 | Column headers UPPERCASE (text-transform: uppercase) vs Jira sentence-case | P1 | Set text-transform: none; sentence-case label strings |
```

### Step 4 — Closure Evidence (MANDATORY — same rule as preflight Phase 6)

When the critique is complete and findings are resolved:

1. **Take maximum visual screenshots** covering every state listed in Step 1.
2. **Inject SVG arrow annotations directly on the live page** (↓ ← → ↑) via `javascript_tool`. Every arrow carries a before/after label: `← AKDropdownMenu (was shadcn, dead)`. Raw screenshots with no arrows are **rejected**.
3. **Display each annotated screenshot inline in the chat** — the conversation IS the artefact. No file export, no folder, no disk storage. Caption each image in chat: surface · heuristic(s) fixed · severity resolved.
4. Update the preflight handover under `## Design Closure Evidence` with the **caption list only** — visuals live in the chat session above.
5. Commit before declaring the surface design-complete.

A critique that closes without annotated screenshots has NOT closed.

---

## Mandatory Gates

This skill is a **blocking prerequisite** before:
- Any `ui-feature` or `design-only` surface is marked done in the preflight handover
- Any PR description claims "design complete" or "UX reviewed"

If the score is below **22 / 30** (< 73%), the surface MUST NOT ship. Halt and file P0/P1 findings as tasks.

---

## Hard Rules (non-negotiable)

1. **No banned columns** — Type/Pipe, Category, Space URL, Templates are permanently banned from Projects module. Flagging one of these as "present" is an instant P0.
2. **ADS tokens only** — any raw hex or `text-slate-*` Tailwind class is an H4/H9 violation.
3. **No `text-transform: uppercase` on column headers** — sentence-case only (jira-compare lesson 2026-05-09).
4. **Row density** — target 48px row height (Jira benchmark). Anything ≥ 56px is H8 P1.
5. **Sidebar Recent** — two-line layout (summary line 1, KEY line 2) is the canonical pattern. Single-line truncation is H6 P1.

---

## References

- `CLAUDE.md` — gates, banned columns, ADS-token rules, jira-compare lessons
- `jira-compare` skill — pixel parity gate (pairs with this skill)
- `ads-validator` skill — token compliance gate
- `preflight` Phase 6 — closure evidence protocol (same arrow/annotation rule)
- Atlassian Design System: https://atlassian.design/
