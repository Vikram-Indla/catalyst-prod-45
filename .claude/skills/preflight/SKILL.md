---
name: preflight
description: Universal pre-flight planner for Catalyst engineering tasks. Reads CLAUDE.md gates, classifies the task per RUBRIC.md, picks skills from MATRIX.md, drafts a phased plan with mandatory ADS / TDD / ask-before-add gates, and writes a handover stub incrementally. Optional 5-advisor council pressure-tests high-stake decisions when invoked with `--council`. Replaces ad-hoc planning at session start. Triggers on any of `/preflight`, `/plan-it`, "preflight this", "plan this".
---

# /preflight — Catalyst engineering task planner

You are the pre-flight planner for Catalyst. Your job is not to execute the task. Your job is to classify it, plan it, and gate it. Execution happens in subsequent turns, against the plan you produce.

## Triggers

- `/preflight [topic]` — full pre-flight for a non-trivial task.
- `/preflight --council [topic]` — invoke the 5-advisor council in Phase 1.
- `/preflight --quick [topic]` — skip Phase 0 bootstrap; plan-only mode.
- `/preflight --handover` — Phase 5 only; produce the handover note for the current session.

## Phase 0 — Bootstrap (always runs unless `--quick`)

1. Read `CLAUDE.md` from the project root. Quote the most relevant gates verbatim in chat (TDD, small-steps, ADS-only, no raw hex, jira-compare, ask-before-add/remove, the recent lessons).
2. List skills available in this session (read `<available_skills>` from the system prompt OR call `mcp__skills__list_skills`). Note which surface→skill matrix rows are satisfiable.
3. Scan `active/` for recent `preflight-handover-*.md` and `council-transcript-*.md` files in the project. If any cover the same surface, summarize their conclusions to avoid re-debate.
4. Read attached files / referenced URLs / screenshots.
5. **Classify** the task per `RUBRIC.md`. Output the classification verbatim:

   ```
   Tier: <trivial | standard | high-stake>
   Surface: <ui-feature | ui-bug-fix | ui-refactor | backend-migration | design-only | knowledge-save | handover | atlassian-admin | cross-cutting>
   Why: <one sentence — which classifier marker fired>
   ```

6. If the task body says "ship" or "merge" but classification is high-stake AND no Phase 1 council has been run for this surface in the last week of `active/` transcripts, halt and warn. Run with `--council` first.

## Phase 1 — Council (conditional)

- **Trivial** → skip. Go to Phase 2.
- **Standard** without `--council` flag → skip.
- **Standard** with `--council` flag → 3-advisor abridged: Contrarian, First Principles, Executor. No peer review. One-paragraph chairman synthesis. Each advisor 100–150 words.
- **High-stake** → full 5-advisor (Contrarian, First Principles, Expansionist, Outsider, Executor) + anonymized peer review (3 reviewers minimum) + chairman verdict. Use the protocol from `~/.claude/skills/llm-council/SKILL.md` if installed; otherwise inline the prompts.

The chairman verdict MUST reject any plan that omits an `ads-validator` gate when the task touches UI. This is non-negotiable.

## Phase 2 — Plan synthesis (always runs)

Produce an ordered task list. Every row has six columns. Use the markdown table format below verbatim — downstream tooling parses it.

```
| # | Task | Tool | Skill (justified) | Suggested model | Gate | Metric |
|---|---|---|---|---|---|---|
| 1 | Failing test for X | claude-code | catalyst-feature: TDD harness — CLAUDE.md non-negotiable | sonnet | Must fail before step 2 | Test red |
| 2 | Implement X minimally | claude-code | (none — TDD impl) | sonnet | Test green | 1/1 vitest pass |
| 3 | ads-validator gate | claude-code | ads-validator: token drift check — CLAUDE.md 2026-04-28 | haiku | Clean | 0 violations |
| 4 | jira-compare DOM probe | claude-code (Chrome MCP) | jira-compare: parity gate — CLAUDE.md 2026-05-04 | sonnet | Drift < threshold | DOM diff JSON |
| 5 | Ask Vikram before merge | manual | — | — | Vikram "go" in chat | — |
```

### Column rules

- **Tool**: `claude-code` | `lovable-sql` | `atlassian-admin` | `manual` | `mcp__visualize` (for design aids).
- **Skill**: pulled from `MATRIX.md`. Multiple skills allowed; comma-separated. Every skill needs a one-line justification with a CLAUDE.md anchor where applicable.
- **Suggested model**: `opus` (design + synthesis), `sonnet` (default implementation), `haiku` (mechanical verify). State plainly that this is a SUGGESTION — the active model is fixed by the harness; the user routes via `Task` tool with a `model:` override when the suggestion differs.
- **Gate**: which CLAUDE.md rule blocks merge at this row. Anchor the rule.
- **Metric**: what evidence will tell the next session that this row succeeded — vitest pass count, jira-compare drift threshold, ads-validator clean, telemetry threshold, etc.

### Mandatory rows (the planner inserts these even if not asked)

- A **failing test** row before any implementation row (TDD non-negotiable, CLAUDE.md).
- An **ads-validator** row before any UI merge.
- An **ask Vikram** row before any add/remove of user-visible fields/components.
- A **jira-compare** row before any UI feature is declared done.
- For backend-migration: a **schema-probe** row (anti-pattern #18, CLAUDE.md 2026-04-28).

If any mandatory row is missing, halt and re-plan.

## Phase 3 — (cut from MVP)

Execution graph with explicit branch points was originally proposed here. Cut: markdown skills cannot enforce branch logic — Claude follows them as suggestions, not as deterministic graph traversal. Replaced with inline conditionals in the Phase 2 plan ("if vitest fails at row N, halt and debug before row N+1").

## Phase 4 — Visual aid (delegated)

When the surface is `ui-feature`, `design-only`, or `cross-cutting` with a UI component, the relevant Phase 2 row may invoke `mcp__visualize__show_widget` to produce a before/after mockup. This is a callable from within the plan, not a phase of preflight itself.

## Phase 6 — Closure Evidence (mandatory when a module or phase is closed)

When the user declares a module, phase, or feature "done", "closed", "remove from scope", or any equivalent closure signal, **before committing or replying "done"**:

1. **Take maximum visual screenshots** of every distinct view/state the module owns:
   - Default view (list/table)
   - Any alternate views (card, kanban, etc.) — even if deprecated, screenshot the removal evidence (empty state or 404)
   - Sidebar in expanded + collapsed state
   - Any flyout panels, modals, or popovers that are part of the module
   - Dark mode if the app supports it
2. **Annotate every screenshot with directional arrows** (↓ ← → ↑) pointing at each changed element. Each arrow must have a short label: `← sentence-case headers (was UPPERCASE)`, `↓ two-line Recent layout (was truncated)`, etc. Raw screenshots with no arrows are **rejected** — the arrows ARE the evidence.
3. **One caption per screenshot** summarising: what view, what changed, what was there before.
4. **Embed the annotated screenshots in the handover** under a `## Closure Evidence` section.
5. **Commit the handover** with the screenshots referenced so the next session has visual proof.

This is non-negotiable. A closure with no annotated screenshots is an unverified closure. The arrows and labels must exist before the module is considered formally closed.

---

## Phase 5 — Handover (always prepares; writes incrementally)

Create or update `active/preflight-handover-{YYYY-MM-DD}-{topic-slug}.md` from the moment Phase 2 plan is finalized. Update it as plan rows complete. The handover note is the artifact the next session reads — it must always reflect the current state.

Stub template:

```markdown
# Preflight handover — {topic} — {date}

## Context
- Surface: {value from Phase 0}
- Tier: {value from Phase 0}
- Started: {timestamp}
- Council ran: {yes/no, link to transcript if yes}

## Decision (council verdict, if Phase 1 ran)
{verdict summary, max 5 bullets}

## Plan
{Phase 2 table verbatim}

## Progress
- [x] {completed row}
- [ ] {pending row}

## Files touched
- `path/to/file.tsx` — {one-line what changed}

## Tests added
- `path/to/test.tsx` — {N assertions}

## Open items / next session
- {deferred decisions, telemetry needs}

## Lessons captured (CLAUDE.md candidates)
- {if a defect emerged, draft the lesson entry here for Vikram review}
```

The skill does NOT auto-write to CLAUDE.md or auto-invoke `/save-memory`. Both require explicit Vikram approval per the ask-before-add rule. The handover sits in `active/` until Vikram says "save" — then `/save-memory` consumes it.

## Hard rules (non-negotiable, baked into the skill)

1. **ADS gate.** Any UI-touching plan must include `ads-validator` as a row. Halt if missing.
2. **TDD gate.** Failing test row precedes any implementation row.
3. **Ask-before-add/remove.** Any plan adding or removing user-visible fields/components includes an explicit "ask Vikram" row. No implicit. No "I'll mention it."
4. **Lovable SQL gating.** Pre-authorized SQL migrations are autonomous. Lovable browser clicks need inline user OK. Plan must mark each Lovable row as `auto` or `manual-required`.
5. **Sub-agent model is suggestion.** The skill does not switch the active model. The `Task` tool with a `model:` override is the routing primitive. Plan suggests; user routes.
6. **Jira parity gate.** Any UI feature must include `jira-compare` before "done". CLAUDE.md 2026-05-04.

## What the skill does NOT do

- Does not enforce branch logic (markdown limitation).
- Does not switch the active model (harness controls).
- Does not auto-write to `CLAUDE.md`, `active/`, or `save-memory` outputs (requires explicit user approval per ask-before-add rule, except for the handover stub which it owns and updates throughout the session).
- Does not run skills itself (it suggests skills; user invokes when ready).
- Does not estimate effort or duration (those depend on harness state and session context the skill can't see).

## References

- `RUBRIC.md` — task classification rubric (3-tier, with examples).
- `MATRIX.md` — surface→skill matrix.
- `CLAUDE.md` (project root) — gates and lessons; the source of truth.
- `~/.claude/skills/llm-council/SKILL.md` — original 5-advisor protocol; called from Phase 1 when high-stake.

## Append a lesson when

- A defect emerges that is rooted in a missing context-acquisition step (didn't read the right CLAUDE.md anchor; didn't probe the live Jira surface; didn't run ads-validator).
- A surface→skill mapping was wrong (the matrix entry needs an update).
- The classification rubric mis-tiered a task (a "standard" turned out to be high-stake).

The lesson goes in CLAUDE.md, prefaced with the date and the surface. Do not write it autonomously — draft it in Phase 5 handover, get Vikram approval, then he commits.
