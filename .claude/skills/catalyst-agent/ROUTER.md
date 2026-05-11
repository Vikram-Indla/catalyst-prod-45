# /catalyst-agent — Router

Companion to `SKILL.md`. This is the decision matrix the router consults
in step 5 of the pipeline. Every row is data, not logic — extend by adding
rows, do not edit `SKILL.md` to add a new task type.

---

## Surface classification cheatsheet

Use the strongest match. If two surfaces match, pick the row with more
specific signals.

| File / area | Surface |
|---|---|
| `BacklogPage*`, `JiraTable*`, `cells.tsx`, `editors.tsx`, group headers, inline create rows | `ui-bug-fix` or `ui-feature` (depending on operation) |
| `CatalystView*`, `CatalystKeyDetails`, `CatalystSidebarDetails`, modal mode, panel mode | `ui-bug-fix` or `ui-feature` |
| `ProjectHub*`, sidebars, Recent lists, notification rails | `ui-feature` or `ui-refactor` |
| `/admin/*` pages | `atlassian-admin` (WorkHub-proxied) or `ui-feature` (Catalyst-specific) |
| `ph_*` tables, RLS, migrations, `supabase/functions/` | `backend-migration` |
| Pure look/feel: ADS tokens, lozenges, typography, status pills | `design-only` |
| Handover notes, lesson appends, CLAUDE.md edits | `knowledge-save` |
| Multi-surface refactors crossing >2 of the above | `cross-cutting` |

---

## Operation classification

| Verb pattern in user text | Operation |
|---|---|
| "fix", "broken", "doesn't work", "wrong", "regressed" | `fix-bug` |
| "add", "new", "create", "build" | `add-feature` |
| "remove", "delete", "drop" | `remove-feature` |
| "audit", "compare", "match jira", "parity" | `audit` |
| "refactor", "clean up", "consolidate", "unify" | `refactor` |
| "optimize", "speed up", "bundle", "perf" | `optimize` |
| "test", "coverage", "vitest", "playwright" | `test` |
| "migrate", "schema", "RLS", "policy" | `migrate` |

---

## The decision matrix

Each row: `surface × operation × dominant signal → wrapper(s) + agents`.

### UI bug fixes

| # | Signals | Wrapper | Primary | Augments | Always-on |
|---|---|---|---|---|---|
| 1 | `dynamic table`, `JiraTable`, sort/filter/group/select | preflight + jira-compare | engineering-frontend-developer | design-ui-designer | reality-checker, evidence-collector, code-reviewer |
| 2 | `CatalystView*` modal/panel, detail view | preflight + jira-compare | engineering-frontend-developer | project-management-jira-workflow-steward | reality-checker, evidence-collector, code-reviewer |
| 3 | sidebar / right rail field, Field row | preflight + jira-compare | engineering-frontend-developer | project-management-jira-workflow-steward (schema check) | evidence-collector, code-reviewer |
| 4 | status pill / lozenge / typography drift | design-intelligence + design-critique | design-ui-designer | design-brand-guardian | evidence-collector |
| 5 | hover card / popover / dropdown / menu | preflight | engineering-frontend-developer | testing-accessibility-auditor (keyboard / ARIA) | evidence-collector, code-reviewer |
| 6 | inline create row / inline edit cell | preflight + jira-compare | engineering-frontend-developer | testing-reality-checker (React 17 synthetic event trap, CLAUDE.md 2026-05-08) | evidence-collector, code-reviewer |
| 7 | breadcrumb / navigation / openDetail wiring | preflight | engineering-frontend-developer | engineering-codebase-onboarding-engineer | reality-checker, code-reviewer |

### UI features

| # | Signals | Wrapper | Primary | Augments | Always-on |
|---|---|---|---|---|---|
| 8 | new page / new component / new admin surface | preflight (full) | engineering-software-architect | engineering-frontend-developer, design-ux-architect | accessibility-auditor, evidence-collector, code-reviewer |
| 9 | new field in detail view / rail / panel | preflight + jira-compare | engineering-frontend-developer | project-management-jira-workflow-steward (anti-pattern #18 schema-probe gate) | code-reviewer |
| 10 | new admin page under `/admin/*` | preflight | engineering-software-architect | engineering-security-engineer (AdminGuard coverage), engineering-database-optimizer | code-reviewer, accessibility-auditor |

### Schema / backend

| # | Signals | Wrapper | Primary | Augments | Always-on |
|---|---|---|---|---|---|
| 11 | new `ph_*` table | preflight | engineering-database-optimizer | engineering-security-engineer (RLS), engineering-backend-architect | code-reviewer |
| 12 | RLS policy / 42501 / permission scheme | preflight | engineering-security-engineer | engineering-database-optimizer | code-reviewer |
| 13 | edge function (Deno, supabase/functions/) | preflight | engineering-backend-architect | engineering-security-engineer (CORS, secrets) | code-reviewer |
| 14 | migration with CASCADE / child policies | preflight | engineering-database-optimizer | engineering-security-engineer (CLAUDE.md 2026-05-09 cascade lesson) | code-reviewer |

### Parity / audit

| # | Signals | Wrapper | Primary | Augments | Always-on |
|---|---|---|---|---|---|
| 15 | "compare to jira", parity audit, drift check | jira-compare (full 3-lane) | project-management-jira-workflow-steward | engineering-frontend-developer, engineering-database-optimizer | reality-checker, evidence-collector |
| 16 | regression after a fix on a shared component | jira-compare (regression mode) | testing-reality-checker | engineering-frontend-developer | evidence-collector |

### Design

| # | Signals | Wrapper | Primary | Augments | Always-on |
|---|---|---|---|---|---|
| 17 | "audit design", "ADS compliance", token violations | design-intelligence | design-ux-architect | design-brand-guardian | evidence-collector |
| 18 | "looks wrong", visual drift, "is this Jira-aligned" | design-intelligence + design-critique | design-ui-designer | design-brand-guardian, design-ux-architect | evidence-collector |
| 19 | "review this design", heuristic scoring | design-critique | design-ui-designer | design-ux-researcher | evidence-collector |

### Accessibility

| # | Signals | Wrapper | Primary | Augments | Always-on |
|---|---|---|---|---|---|
| 20 | "WCAG", "a11y", "keyboard", "screen reader" | design-critique | testing-accessibility-auditor | design-inclusive-visuals-specialist | evidence-collector |

### Performance

| # | Signals | Wrapper | Primary | Augments | Always-on |
|---|---|---|---|---|---|
| 21 | "slow", "bundle size", "TTI", "perf" | preflight | testing-performance-benchmarker | engineering-frontend-developer | reality-checker |

### Testing

| # | Signals | Wrapper | Primary | Augments | Always-on |
|---|---|---|---|---|---|
| 22 | "vitest failing", "flaky test", "playwright fails" | preflight | testing-test-results-analyzer | engineering-senior-developer | reality-checker |
| 23 | "add test coverage" | preflight | engineering-senior-developer | testing-tool-evaluator | code-reviewer |

### Refactor

| # | Signals | Wrapper | Primary | Augments | Always-on |
|---|---|---|---|---|---|
| 24 | consolidate components, replace hand-rolled with @atlaskit/* | preflight | engineering-minimal-change-engineer | engineering-frontend-developer | reality-checker, code-reviewer |
| 25 | rename / extract / split file | preflight | engineering-minimal-change-engineer | engineering-code-reviewer | reality-checker |

### MCP / integrations

| # | Signals | Wrapper | Primary | Augments | Always-on |
|---|---|---|---|---|---|
| 26 | "MCP server", "Atlassian MCP", "Rovo", "tool def" | preflight | specialized-mcp-builder | engineering-backend-architect | code-reviewer |

### Git / PR / handover

| # | Signals | Wrapper | Primary | Augments | Always-on |
|---|---|---|---|---|---|
| 27 | "PR", "branch", "merge", "rebase" | direct | engineering-git-workflow-master | engineering-technical-writer | — |
| 28 | "handover", "next session", "context dump" | preflight `--handover` | engineering-technical-writer | engineering-git-workflow-master | — |

### Fallback

| # | Signals | Wrapper | Primary | Augments | Always-on |
|---|---|---|---|---|---|
| 29 | (no row matches) | preflight | agents-orchestrator | engineering-senior-developer | code-reviewer |

---

## CLAUDE.md ban detection (HALT before activation)

Step 2 of the pipeline. Any of these in the task text → halt, no router
selection, no agent activation. Cite the CLAUDE.md anchor in the halt
message.

| Banned signal in user text | Anchor | Halt message |
|---|---|---|
| "Story Points" + "add"/"re-add" | CatalystSidebarDetails.tsx:422 (in-code, 2026-04-16) | Permanently banned platform-wide. |
| "MDT Ref" + add/show | CLAUDE.md 2026-05-05 | Permanently banned from ALL views, every type. |
| "Service Now#" + add/show | CLAUDE.md 2026-05-07 | Permanently banned. |
| "Assessment Feature" + add/show | CLAUDE.md 2026-05-07 | Permanently banned. |
| "Catalyst Intelligence" / "AI Sparkles" inline | CLAUDE.md 2026-05-07 | Permanently banned. Only entry point is ImproveIssueDropdown right rail. |
| "Development section" / "Automation section" / "Automate ⚡ button" | CLAUDE.md 2026-05-06 | NEVER implement. Out of scope. Do not ask. |
| "Notion" + Projects module | CLAUDE.md "Banned integrations" | Notion permanently out of scope for Projects. |
| "preview_*" tool usage on Catalyst | CLAUDE.md preflight rules | Chrome MCP only. No Claude preview tools. |
| "localhost:8081" or port other than 8080 | CLAUDE.md "Dev Server" | Port 8080 lock. Any other port → halt. |
| "Claude executes SQL" / autonomous migration | CLAUDE.md "Lovable SQL" | SQL goes to Lovable editor, manual paste only. |

---

## Wrapper composition rules

When multiple wrappers are chained:

1. **`preflight` always runs first** when present. Phase 0 + 0.5 + 1 are
   evidence acquisition that downstream wrappers need.
2. **`jira-compare` runs second** when present. It consumes preflight
   Phase 1 evidence as its starting state.
3. **`design-intelligence` runs in parallel with `jira-compare`** if both
   are present — they operate on different evidence streams.
4. **`design-critique` runs last** — it gates closure with heuristic
   scoring + arrow annotation.

Composition examples:

- `preflight + jira-compare` → preflight Phase 0/0.5/1, then jira-compare 3 lanes consume the evidence, then preflight Phase 3 plan, then preflight Phase 4 execute, then jira-compare CRUD gate, then preflight Phase 5-7.
- `design-intelligence + design-critique` → DI scan first (token violations), then DC scores the heuristics (DI's findings become DC's pre-scan input).
- `preflight` alone → standard 0→7 phases.

---

## Always-on verifier selection rules

Add these automatically based on what the task touches:

| Trigger | Always-on agent |
|---|---|
| Any UI surface | `testing-evidence-collector` (before/after screenshots; SVG arrows per Phase 5) |
| Any code change | `engineering-code-reviewer` (final gate before commit) |
| Layer-ambiguous bug, shared component, breadcrumb, openDetail | `testing-reality-checker` (CLAUDE.md 2026-05-11: probe before TDD'ing the wrong layer) |
| Anything a screen reader / keyboard user touches | `testing-accessibility-auditor` |
| Any new public API, edge function, or RPC | `engineering-security-engineer` |

Cap at 2 always-on agents per task. If 3+ would apply, keep the two with the most CLAUDE.md anchors.

---

## How to extend the matrix

When a new lesson lands in CLAUDE.md:

1. Identify the signal that should trigger the new behaviour (a file
   path, a keyword, a verb pattern).
2. Add a new row to the appropriate section above (or a new section if
   the surface is genuinely new).
3. Cite the CLAUDE.md anchor inline in the row's "augments" or
   "always-on" cell so the reasoning stays traceable.
4. If the lesson contradicts an existing row, REPLACE that row — do not
   leave both. The router needs unambiguous answers.

No code change is needed to extend. The matrix is the surface.

---

## See also

- `SKILL.md` — pipeline definition and worked examples
- `INDEX.md` — every agent in `~/.claude/agents/` with relevance flag
- `../AGENT_PIPELINE.md` — activation line format (shared across all 4 wrapped skills)
- `../preflight/RUBRIC.md` — tier classification (trivial / standard / high-stake)
- `CLAUDE.md` (project root) — bans + lessons (every row should cite an anchor when applicable)
