# BAU Backlog Table — Probe Report

**Date:** 2026-05-11
**Mode:** `/catalyst-agent --probe-only`
**Surfaces compared:**
- Catalyst: `http://localhost:8080/project-hub/BAU/backlog`
- Jira: `https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list?jql=project%20%3D%20BAU%20ORDER%20BY%20created%20DESC`

---

## TL;DR

| Question | Answer |
|---|---|
| Are the typography + row height in parity? | ✅ Yes — both 12px / 653 weight / none transform / ~40px row |
| Are the column SETS the same? | ❌ No — see below |
| Is the column STRUCTURE the same? | ❌ No — Jira merges Type+Key+Summary into one "Work" column; Catalyst splits them |
| Are sort affordances the same? | ⚠️ Different idioms — both functional |
| Underlying rendering primitive? | Both `<table>` (Catalyst rewrote off @atlaskit/dynamic-table in Round H) |

---

## Catalyst DOM (live probe)

- `<table role="grid">`
- 12 columns rendered (8 data + 4 utility)
- Header: 12px / fontWeight 653 / textTransform: none
- Row height: 40px
- 15 rows visible
- 6 sort indicators (SVG) on headers
- No grouped rows visible

Data columns (in order): **Type · Key · Summary · Status · Comments · Parent · Assignee · Priority**

Source: `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx:508`
```js
const DEFAULT_VISIBLE_COLUMNS = ['key', 'summary', 'status', 'assignee', 'priority', 'comments', 'parent'];
```

## Jira DOM (live probe)

- `<table>` (no role="grid")
- 9 columns rendered (7 data + 2 utility — expand + "Configure columns" gear)
- Header: 12px / fontWeight 653 / textTransform: none ← identical to Catalyst
- Row height: 40.5px ← essentially identical
- 49 rows visible
- Sort: per-header context menu with text ("Sort A to Z", "Sorted newest to oldest")
- Currently sorted: **Created · DESC**

Data columns (in order): **Work (Type+Key+Summary combined, 538px) · Parent (357px) · Status (340px) · Fix versions (222px) · Assignee (159px) · Created (201px)**

## Jira schema (Atlassian MCP)

BAU project has 14 issue types:

| Level | Types |
|---|---|
| 2 (top) | Feature |
| 1 | Epic |
| 0 (Story-tier) | Story, Task, QA Bug, Business Gap, Production Incident, API Requirement, Change Request |
| -1 (Sub-task) | Sub-task, Integration, Backend, Frontend, Figma |

---

## Column comparison (side-by-side)

| Column | Catalyst | Jira | Δ |
|---|---|---|---|
| Type | separate (108px) | inline in "Work" | **structural** |
| Key | separate (120px) | inline in "Work" | **structural** |
| Summary | separate (70px — looks compressed) | inline in "Work" | **structural** |
| Status | 144px | 340px | width Δ — Jira 2.4× wider |
| Parent | 156px | 357px | width Δ — Jira 2.3× wider |
| Assignee | 120px | 159px | close |
| Comments | 144px | not in default | **Catalyst-only** |
| Priority | 96px | not in default | **Catalyst-only** |
| Fix versions | not in default | 222px | **Jira-only** |
| Created | not in default | 201px (sorted DESC) | **Jira-only** |

---

## Gap summary

### Missing on Catalyst (currently visible by default on Jira)

1. **"Work" combined column** — Jira renders Type icon + Key + Summary inside one 538px column. Catalyst splits into three narrower columns (108 + 120 + 70 = 298px total — and 70px for Summary is critically narrow).
2. **Fix versions column** — present in Jira default, absent in Catalyst.
3. **Created column visible by default** — Catalyst hides per 2026-04-27 CLAUDE.md lesson; Jira shows + sorts on it.

### Present on Catalyst (not in Jira default view)

1. **Priority column** — Catalyst shows; Jira hides by default.
2. **Comments column** — Catalyst shows; Jira hides by default.

### Same on both (verified parity)

- Header typography (12px / 653 / none)
- Row height (~40px)
- Rendering primitive (`<table>` element)

### Different idioms but both valid

- Sort: Catalyst uses inline SVG indicators; Jira uses per-header context menu with text labels.
- Column config: Catalyst has `+` picker; Jira has gear icon labeled "Configure columns".

---

## CLAUDE.md anchors relevant to this surface

- **2026-04-27** Created/Updated columns removed from Catalyst defaults — drove the visibility gap above
- **2026-05-07** Jira BAU list re-probe (Type | Key | Summary | Status | Comments | Parent | Assignee | Due date | Priority | Labels) — older Jira state, may have changed since
- **2026-05-08** Key cell focused-state border full-width (block display)
- **2026-05-08** StatusPill 11px/653/uppercase/letterSpacing:0.165px (vs Catalyst 14px/400/none)
- **2026-05-08** Group inline-create row invisible when collapsed (fixed)
- **2026-04-18** JiraTable Round H rewrite — `@atlaskit/dynamic-table` → plain `<table>` for column resize / sticky header / column reorder

---

## What this report does NOT do

- Does NOT propose a fix or invoke implementer agents (`--probe-only` mode).
- Does NOT measure pixel-level cell content (use `hermes-pixel-probe` for that).
- Does NOT test functional parity (use `jira-compare` 3-lane for that — includes CRUD gate).
- Does NOT touch any code.

---

## If you want to act on this

Drop the `--probe-only` flag and rerun. Likely routing:

```
wrappers:    preflight (Phase 0.5) → jira-compare (3-lane + CRUD)
agents:      engineering-frontend-developer (primary — combined-column refactor)
             design-ui-designer (column header design alignment)
             testing-evidence-collector (before/after screenshots)
             engineering-code-reviewer (gate)
gates:       TDD, ADS validator, ask-before-add (Fix versions + Created visibility)
```

But that's a real refactor — combined "Work" column is structural, not cosmetic. Probably warrants its own scoped PR.
