# /preflight — Surface → Skill Matrix

Read this in Phase 2 of `/preflight`. Skills marked **Required** must appear as plan rows. Skills marked Recommended should appear unless the task body explicitly excludes them.

This matrix is human-editable and version-controlled. Append entries when a new task surface emerges in Catalyst — do not modify SKILL.md to encode them.

## Matrix

| Surface | Required skills | Recommended skills | Notes |
|---|---|---|---|
| `ui-feature` (new) | `catalyst-feature`, `ads-validator` | `jira-compare`, `design-critique`, `impeccable`, `ui-ux-pro-max` | catalyst-feature handles the end-to-end TDD + Playwright loop; ads-validator gates token drift. |
| `ui-bug-fix` | `regression`, `ads-validator` | `jira-compare` | regression scopes evidence-only; ads-validator catches token drift introduced by the fix. |
| `ui-refactor` | `gitmerge` | `save-memory`, `ads-validator`, `jira-compare` | gitmerge for branch hygiene. ads-validator if the refactor touches styles. |
| `backend-migration` (Supabase) | (Lovable SQL execution) | `save-memory` | Pre-authorized SQL migrations are autonomous per CLAUDE.md. Browser clicks need inline user OK. |
| `design-only` (no code) | `design-critique`, `ads-validator` | `impeccable`, `ui-ux-pro-max`, `huashu-design` | design-critique runs the heuristic scoring; ads-validator confirms the proposed design fits the token system. |
| `knowledge-save` | `save-memory` | `recall-memory`, `consolidate-memory` | save-memory writes Obsidian; consolidate-memory dedupes when the corpus drifts. |
| `handover` (context end) | `save-memory` | `consolidate-memory` | One handover note per session. consolidate-memory only when CLAUDE.md exceeds 100 entries or has duplicates. |
| `atlassian-admin` (Jira / Forge config) | (manual) | `jira-compare` | Plan must mark these rows as user-only. No autonomous execution available. |
| `cross-cutting` (multiple surfaces in one task) | union of all rows above per surface touched | union of all rows above | Plan must declare which surfaces are in scope; halt if scope balloons mid-plan. |

## Rationale slot

Every skill row in the Phase 2 plan must include a **one-line justification** — why this skill, on this task, at this step. Examples:

- `ads-validator: catches token drift before merge — CLAUDE.md 2026-04-28 anti-pattern #18`
- `jira-compare: confirms parity with live Jira before declaring done — CLAUDE.md 2026-05-04`
- `regression: scopes evidence-only audit, files defects on BAU board — CLAUDE.md 2026-04-28 v4 skill rewrite`
- `design-critique: heuristic scoring before code — required for design-only surface`

If you can't justify a skill in one line, it doesn't belong in the plan.

## Halts

If a Required skill is omitted from a plan, halt synthesis and re-plan. The omission is the bug; do not "fix forward."

## Updating this matrix

Append-only. New surface types are added at the bottom with their first observed task. Do not delete or rewrite existing rows — they encode lessons. If a surface type is renamed, add a `## Aliases` section linking the old name to the new.

Last updated: 2026-05-08 (initial creation).
