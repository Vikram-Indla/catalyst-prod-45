# /catalyst-agent — Router (v2, probe-first)

Companion to `SKILL.md`. Two matrices:

1. **Probe Matrix** — which probe agents to invoke based on signals (step 4)
2. **Implementer Matrix** — which wrapper + implementer agents to pick based on the gap report (step 6)

Every row is data, not logic. Extend by adding rows; do not edit `SKILL.md` to add new task types.

---

## CLAUDE.md ban detection (step 2 — runs BEFORE probe)

Any of these in the task text → halt, no probe, no agent activation. Cite the CLAUDE.md anchor.

| Banned signal | Anchor | Halt message |
|---|---|---|
| "Story Points" + add/re-add | CatalystSidebarDetails.tsx:422 (2026-04-16) | Permanently banned platform-wide. |
| "MDT Ref" + add/show | CLAUDE.md 2026-05-05 | Permanently banned from ALL views, every type. |
| "Service Now#" + add/show | CLAUDE.md 2026-05-07 | Permanently banned. |
| "Assessment Feature" + add/show | CLAUDE.md 2026-05-07 | Permanently banned. |
| "Catalyst Intelligence" / "AI Sparkles" inline | CLAUDE.md 2026-05-07 | Banned. Only entry: ImproveIssueDropdown right rail. |
| "Development section" / "Automation section" / "Automate ⚡" | CLAUDE.md 2026-05-06 | NEVER implement. Out of scope. |
| "Notion" + Projects module | CLAUDE.md "Banned integrations" | Notion permanently out of scope for Projects. |
| "preview_*" tool on Catalyst | CLAUDE.md preflight rules | Chrome MCP only. No Claude preview tools. |
| "localhost:8081" or other port | CLAUDE.md "Dev Server" | Port 8080 lock. |
| Autonomous SQL execution | CLAUDE.md "Lovable SQL" | SQL → Lovable manual paste only. |

---

## Probe Matrix (step 4 — what probes to run)

For every signal, which lanes fire and which agent owns each lane.

| # | Dominant signals | Lane A (Jira) | Lane B (Catalyst DOM) | Lane C (Supabase) | Lane D (codebase) |
|---|---|---|---|---|---|
| 1 | `dynamic table`, `JiraTable`, sort/filter/group | jira-workflow-steward: list view columns + sort mechanism | frontend-developer: DOM probe sort handler + state + render | — | codebase-onboarding-engineer: trace BacklogPage→JiraTable→state |
| 2 | `CatalystView*`, detail modal/panel | jira-workflow-steward: screen scheme + workflow + fields | frontend-developer: DOM probe rail fields + interactions | — | codebase-onboarding-engineer: trace view→sections |
| 3 | sidebar / right rail field | jira-workflow-steward: field metadata via `getJiraIssueTypeMetaWithFields` | frontend-developer: DOM probe field rendering | — | codebase-onboarding-engineer: find FieldRow definitions |
| 4 | status pill / lozenge / typography | — | frontend-developer: `getComputedStyle` on Jira + Catalyst pills | — | codebase-onboarding-engineer: locate pill component |
| 5 | popover / dropdown / menu | — | frontend-developer: focus trap + ARIA + keyboard nav probe | — | codebase-onboarding-engineer: locate self-rolled vs Atlaskit |
| 6 | inline create / inline edit | jira-workflow-steward: inline create allowed types | frontend-developer: probe creation flow + React synthetic event | — | codebase-onboarding-engineer: locate InlineCreate row |
| 7 | breadcrumb / openDetail / navigation | — | frontend-developer: probe click → state propagation | — | codebase-onboarding-engineer: trace openDetail call chain |
| 8 | new page / new component | — | frontend-developer: probe similar existing pages | (if backend) database-optimizer: similar table patterns | codebase-onboarding-engineer: find route registry + layout |
| 9 | new field in detail view | jira-workflow-steward: confirm field in screen scheme (anti-pattern #18!) | frontend-developer: probe current rail rendering | — | codebase-onboarding-engineer: locate rail component |
| 10 | new admin page | — | frontend-developer: probe AdminGuard + similar admin pages | database-optimizer: RLS for new tables if needed | codebase-onboarding-engineer: admin route patterns |
| 11 | new `ph_*` table | — | — | database-optimizer: parent table FKs + RLS patterns | codebase-onboarding-engineer: locate hook patterns |
| 12 | RLS / policy / 42501 | — | — | database-optimizer: dump existing policies + cascade tree | codebase-onboarding-engineer: trace query→policy gap |
| 13 | edge function (Deno) | — | — | database-optimizer: existing functions inventory | codebase-onboarding-engineer: function patterns |
| 14 | migration with CASCADE | — | — | database-optimizer: child tables + their DELETE policies | — |
| 15 | parity audit / compare to jira | jira-workflow-steward: full surface metadata | frontend-developer: full surface DOM probe | (if data) database-optimizer | codebase-onboarding-engineer: surface anchors in CLAUDE.md |
| 16 | regression on shared component | — | frontend-developer: probe 3 most adjacent surfaces | — | codebase-onboarding-engineer: list adjacent surfaces |
| 17 | design audit / ADS compliance | — | frontend-developer: `getComputedStyle` against ADS tokens | — | codebase-onboarding-engineer: token usage in target file |
| 18 | accessibility / WCAG | — | frontend-developer: keyboard nav + ARIA + contrast probe | — | codebase-onboarding-engineer: locate handler patterns |
| 19 | performance / bundle / slow | — | frontend-developer: probe network + render timing + TTI | — | codebase-onboarding-engineer: chunk strategy in vite.config |
| 20 | flaky test / vitest fails | — | — | — | codebase-onboarding-engineer: locate failing test + recent changes |
| 21 | refactor / consolidate hand-rolled | — | frontend-developer: list adjacent self-rolled patterns | — | codebase-onboarding-engineer: grep hand-rolled usages |
| 22 | MCP server / tool def | — | — | — | codebase-onboarding-engineer: existing MCP patterns |
| 23 | git / PR / branch | — | — | — | codebase-onboarding-engineer: branch state + PR listing |
| 24 | (no match) | jira-workflow-steward: project-level probe | frontend-developer: surface URL probe | — | codebase-onboarding-engineer: best-effort grep |
| 25 | `ADS compliance` / `design system scan` / `ads audit` / Step 4.5 auto-trigger | — | frontend-developer: `getComputedStyle` sweep for hardcoded hex + Tailwind + non-atlaskit + off-grid spacing + uppercase labels | — | codebase-onboarding-engineer: run `node design-governance/cli/index.js audit src/[path]` + grep for banned patterns |

**Probe budget rules:**
- Each lane has a 90-second wall-clock budget. If exceeded → mark `partial`, continue.
- Lane B always runs on `localhost:8080` (CLAUDE.md port lock).
- Probe agents are READ-ONLY. They never write code, never mutate Jira, never run SQL.

---

## Implementer Matrix (step 6 — what to do after the probe)

Once the gap report is in hand, pick wrappers + implementers from the **actual gap**, not the original task text.

### Routing Council Gate (Phase 2.5 — MANDATORY for high-stake / ambiguous)

**When Phase 2.5 council activates:** Only when the gap report is **ambiguous** (2+ wrapper paths are equally valid) OR the task classified as **high-stake** (per RUBRIC.md).

**Phase 2.5 council composition:**
- `engineering-software-architect` (architecture risk assessment)
- `engineering-senior-developer` (complexity + velocity assessment)
- `project-management-jira-workflow-steward` (Jira scope confirmation)
- `engineering-code-reviewer` (code review risk assessment)
- `agents-orchestrator` (chair: synthesize into one composition order)

**When to SKIP Phase 2.5:**
- Trivial tier classification (per RUBRIC.md) — skip to Phase 3 directly
- Only one wrapper path matches Implementer Matrix (unambiguous)
- `--quick` mode
- `--skip-probe` flag

The council deliberates for 5-10 minutes and outputs a binding wrapper composition order + rationale. If no council is needed (unambiguous + standard tier), catalyst-agent proceeds straight to Phase 3 (Wrapper Selection).

### Gap pattern → wrapper composition

| Gap pattern | Wrapper(s) — execution order | Phase 2.5 council? |
|---|---|---|
| UI handler bug, no schema change | preflight (Phase 0.5 only) → jira-compare (CRUD gate) | No (single path) |
| UI visual drift only | design-intelligence → design-critique | No (single path) |
| Missing column / field in Catalyst that's in Jira scheme | preflight (Phase 0.5 + 1) → jira-compare (full 3-lane + CRUD) | No (single path) |
| New table + UI | preflight (full) → Lovable SQL manual paste | **Yes** (multiple layers, high-stake) |
| New admin page | preflight (full) — includes AdminGuard check, no jira-compare | No (single path) |
| RLS policy bug | preflight (Phase 0.5 only) → Lovable SQL manual paste | **Yes** (security + schema, high-stake) |
| Pure parity audit | jira-compare (full 3-lane only, no preflight) | No (single path) |
| Pure design audit (no functional change) | design-intelligence → design-critique | No (single path) |
| Accessibility audit | design-critique with accessibility lens | No (single path) |
| Performance fix | preflight (Phase 0.5 + 1) | No (single path) |
| Test flake | preflight (direct, no wrappers nested) | No (single path) |
| Refactor consolidation | preflight (full) → jira-compare (regression sweep) | **Yes** (cross-cutting, high-stake) |
| Banned signal (caught in step 2) | NONE — halt | No (pre-phase 2) |
| ADS compliance scan (Step 4.5 — hex/Tailwind/non-atlaskit/spacing/uppercase) | design-intelligence → design-critique | No (single path — value-added, not blocking) |
| Ambiguous gap (e.g., could be design-only OR preflight + jira-compare) | Council deliberates, picks one or composition | **Yes** (mandatory for ambiguous) |

### Implementer agents (by gap type)

For each wrapper composition, who runs the actual code change.

#### UI handler / state bugs

| Sub-pattern | Primary | Augments (0-2) | Always-on verifiers |
|---|---|---|---|
| useMemo / useEffect dep array | engineering-frontend-developer | engineering-senior-developer | reality-checker, evidence-collector, code-reviewer |
| Self-rolled popup missing ARIA | engineering-frontend-developer | testing-accessibility-auditor | evidence-collector, code-reviewer |
| Escape key bubbling closing parent modal | engineering-frontend-developer | — | reality-checker, code-reviewer |
| React 17+ synthetic event trap | engineering-frontend-developer | testing-reality-checker | code-reviewer |
| openDetail wiring with wrong id field | engineering-frontend-developer | engineering-codebase-onboarding-engineer | reality-checker, code-reviewer |

#### Visual drift / ADS compliance

| Sub-pattern | Primary | Augments | Verifiers |
|---|---|---|---|
| Hardcoded hex/RGB not ADS token | engineering-frontend-developer | design-brand-guardian | evidence-collector |
| Typography drift | design-ui-designer | engineering-frontend-developer | evidence-collector |
| Spacing / padding drift | design-ui-designer | engineering-frontend-developer | evidence-collector |
| Lozenge / status pill colors | engineering-frontend-developer | design-brand-guardian | evidence-collector |
| Coloured dots for type indicator (2026-05-09 ban) | engineering-frontend-developer | — | reality-checker, code-reviewer |
| Tailwind utility class replacing ADS token (Step 4.5 find) | engineering-frontend-developer | design-ui-designer | evidence-collector |
| Non-atlaskit component (hand-rolled select/modal/menu — Step 4.5 find) | engineering-frontend-developer | engineering-minimal-change-engineer | reality-checker, code-reviewer |
| Off-grid spacing (Step 4.5 find — e.g. padding: 12px) | design-ui-designer | engineering-frontend-developer | evidence-collector |
| Uppercase label violation (Step 4.5 find) | design-ui-designer | — | evidence-collector |

#### Missing Jira-side feature in Catalyst

| Sub-pattern | Primary | Augments | Verifiers |
|---|---|---|---|
| Field in Jira screen scheme, missing in Catalyst rail | engineering-frontend-developer | project-management-jira-workflow-steward | code-reviewer + ASK-BEFORE-ADD |
| Column missing from list view | engineering-frontend-developer | design-ui-designer | evidence-collector, code-reviewer |
| Section in Jira detail view, missing in Catalyst | engineering-frontend-developer | project-management-jira-workflow-steward | code-reviewer + ASK-BEFORE-ADD |

#### Schema / backend

| Sub-pattern | Primary | Augments | Verifiers |
|---|---|---|---|
| New `ph_*` table | engineering-database-optimizer | engineering-security-engineer, engineering-backend-architect | code-reviewer |
| RLS policy + cascade | engineering-database-optimizer | engineering-security-engineer | code-reviewer |
| Edge function | engineering-backend-architect | engineering-security-engineer | code-reviewer |
| Migration with DELETE child policies | engineering-database-optimizer | engineering-security-engineer | code-reviewer |

#### Performance / refactor

| Sub-pattern | Primary | Augments | Verifiers |
|---|---|---|---|
| Bundle size spike | testing-performance-benchmarker | engineering-frontend-developer | reality-checker |
| Slow render | engineering-frontend-developer | testing-performance-benchmarker | reality-checker |
| Replace hand-rolled with @atlaskit/* | engineering-minimal-change-engineer | engineering-frontend-developer | reality-checker, code-reviewer |

#### Testing / git / handover

| Sub-pattern | Primary | Augments | Verifiers |
|---|---|---|---|
| Vitest failing | testing-test-results-analyzer | engineering-senior-developer | reality-checker |
| Add test coverage | engineering-senior-developer | testing-tool-evaluator | code-reviewer |
| Branch / commit / PR ceremony | engineering-git-workflow-master | engineering-technical-writer | — |
| Obsidian handover | engineering-technical-writer | engineering-git-workflow-master | — |

#### Fallback

| Sub-pattern | Primary | Augments | Verifiers |
|---|---|---|---|
| Unmatched gap, ambiguous | agents-orchestrator | engineering-senior-developer | code-reviewer |

---

## Wrapper composition rules

When multiple wrappers chain:

1. **preflight always runs first** when present. Phases 0 + 0.5 consume the probe envelope.
2. **jira-compare consumes preflight Phase 1 evidence** as its lane starting state.
3. **design-intelligence runs parallel to jira-compare** when both are present.
4. **design-critique runs last** — gates closure with heuristic score + arrow annotation.

When the router has already done the probe (step 4):

- preflight Phase 0.5 receives the probe envelope and **skips redundant evidence acquisition**.
- jira-compare receives Lane A + B output and **skips its own initial probes**.
- This is the value of probe-first routing — wrappers don't re-do work the router already did.

---

## Always-on verifier rules

Add automatically based on what the gap touches:

| Gap touches | Always-on agent |
|---|---|
| Any UI surface | testing-evidence-collector |
| Any code change | engineering-code-reviewer |
| Layer-ambiguous bug, shared component, breadcrumb, openDetail | testing-reality-checker (CLAUDE.md 2026-05-11) |
| Screen reader / keyboard impact | testing-accessibility-auditor |
| New public API / edge function / RPC | engineering-security-engineer |

Cap at 2 always-on per task. If 3+ would apply, drop the one with the fewest CLAUDE.md anchors.

---

## How to extend the matrix

When a new CLAUDE.md lesson lands:

1. Identify the signal that should trigger new behaviour (file path, keyword, verb pattern).
2. Add a row to the Probe Matrix (if it changes WHAT to probe) AND/OR the Implementer Matrix (if it changes WHO fixes).
3. Cite the CLAUDE.md anchor in the row.
4. If the lesson contradicts an existing row, REPLACE — don't leave both.

No code change is needed to extend. The matrix is the surface.

---

## See also

- `SKILL.md` — pipeline definition, worked examples
- `INDEX.md` — all 184 agents categorised
- `PREFLIGHT_VS_AGENT.md` — comparison + composition patterns
- `../AGENT_PIPELINE.md` — shared activation protocol
- `../preflight/RUBRIC.md` — tier classification
- `CLAUDE.md` (project root) — bans + lessons
