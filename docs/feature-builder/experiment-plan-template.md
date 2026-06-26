# Experiment Plan: <feature-slug>

> Copy to: docs/feature-builder/features/<feature-slug>/experiment-roadmap.md
> Defines all planned experiments in order. Filled after gap analysis approves.

---

## Phase 0 — Research (no code changes)

Research experiments produce documentation only. Any code touched during research = scope violation.

| ID | Title | Purpose | Status |
|---|---|---|---|
| exp-001 | Catalyst pattern discovery | What Catalyst already has | not-started |
| exp-002 | Current state audit | Existing implementation health | not-started |
| exp-003 | External benchmark research | Domain gold standard | not-started |
| exp-004 | Gap analysis | What is missing | not-started |
| exp-005 | Target Catalyst design | Catalyst-native design proposal | not-started |

**Phase 0 gate:** All 5 complete + human approval before build starts.

---

## Phase 1 — Core Loop (minimum viable)

_Defined after Phase 0 approves. This is the smallest path to end-to-end working feature._

**Definition of done for Phase 1:**
_One sentence describing the minimum journey a real user can complete with real data._

| ID | Title | Files touched | Key acceptance criteria | Status |
|---|---|---|---|---|
| exp-006 | _fill_ | _fill_ | _fill_ | not-started |
| exp-007 | _fill_ | | | not-started |

**Phase 1 gate:** Core user journey works end-to-end. Human approval before Phase 2.

---

## Phase 2 — Full Feature Coverage

_Defined after Phase 1 ships._

| ID | Title | Key acceptance | Status |
|---|---|---|---|
| exp-xxx | _fill_ | _fill_ | not-started |

---

## Phase 3 — Admin + AI + Edge Cases

_Defined after Phase 2 ships._

| ID | Title | Key acceptance | Status |
|---|---|---|---|
| exp-xxx | _fill_ | _fill_ | not-started |

---

## Canonical Components to Reuse (Check Before Each Experiment)

Before each build experiment, verify these are being mounted not rebuilt:

| Need | Use | Source |
|---|---|---|
| Work item list | `JiraTable` | `src/components/shared/JiraTable/` |
| Detail drawer/page | `CatalystViewBase` | `src/components/shared/` |
| Right-rail fields | `CatalystSidebarDetails` | shared |
| Status badge | `CatalystStatusPill` | shared |
| Work item type icon | `JiraIssueTypeIcon` | `src/lib/jira-issue-type-icons.tsx` |
| Avatar | `@atlaskit/avatar` | atlaskit |
| Dropdown (safe) | `@atlaskit/dropdown-menu` | atlaskit |
| Dropdown (overflow parent) | portal pattern | CLAUDE.md 2026-06-13 |
| Toast | `@atlaskit/flag` | atlaskit |
| Spinner | `@atlaskit/spinner` | atlaskit |
| Modal | `@atlaskit/modal-dialog` | atlaskit |

---

## Approval Required Before These Experiments Start

| Experiment | Requires approval for |
|---|---|
| _fill_ | DB schema change |
| _fill_ | New edge function |
| _fill_ | AI feature |
| _fill_ | Cross-hub integration |
