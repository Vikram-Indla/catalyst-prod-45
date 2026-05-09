# preflight

Universal pre-flight planner for Catalyst engineering tasks.

## What it does

Replaces ad-hoc session-start planning with a structured five-phase flow:

1. **Phase 0 — Bootstrap.** Reads `CLAUDE.md` gates, lists installed skills, scans recent council transcripts, classifies the task per `RUBRIC.md`.
2. **Phase 0.5 — Evidence acquisition.** When the task is comparative (parity, drift, audit, regression), delegates probes to existing skills: `jira-compare` (Chrome MCP DOM diff), Atlassian MCP (schema metadata), `ads-validator` (token / hex scan), `regression` (functional). Council never deliberates from text alone for parity work.
3. **Phase 1 — Council (conditional).** Skipped for trivial. Skipped by default for standard (opt-in via `--council`). Mandatory full 5-advisor + peer review for high-stake tasks. Chairman MUST cite probe evidence.
4. **Phase 2 — Plan synthesis.** Ordered task list. Every row tagged with task / tool / skill (justified) / suggested model / gate / verification metric. Mandatory rows enforced: failing-test, ads-validator, ask-Vikram, jira-compare, re-probe.
5. **Phase 5 — Handover.** Writes `active/preflight-handover-{date}-{slug}.md` incrementally from Phase 2 onward — survives context exhaustion.

## Triggers

- `/preflight [topic]` — full pre-flight cycle for a non-trivial task.
- `/preflight --council [topic]` — invoke 5-advisor council in Phase 1.
- `/preflight --quick [topic]` — skip Phase 0 bootstrap; plan-only mode.
- `/preflight --handover` — Phase 5 only; produce the handover note for the current session.

## Hard rules (non-negotiable)

1. ADS gate — any UI plan must include `ads-validator` row.
2. TDD gate — failing test row precedes implementation row.
3. Ask-before-add/remove — explicit "ask Vikram" row for any user-visible field/component change.
4. Lovable SQL — pre-authorized migrations are autonomous; browser clicks need inline OK.
5. Sub-agent model — suggestion only (markdown can't switch the active model; user routes via `Task` tool).
6. Jira-parity — `jira-compare` row required before declaring any UI feature done.
7. Re-probe — comparative tasks loop probe → fix → re-probe (cap 5 cycles per CLAUDE.md jira-compare protocol).

## Files

- `skills/preflight/SKILL.md` — main skill prompt.
- `skills/preflight/references/RUBRIC.md` — three-tier task classification with concrete Catalyst examples.
- `skills/preflight/references/MATRIX.md` — surface → required/recommended skill mapping with justification slots.

## What this plugin does NOT do

- Does not enforce branch logic (markdown limitation — branching is suggested, not deterministic).
- Does not switch the active Claude model (harness controls that — plan suggests, user routes via `Task`).
- Does not auto-write to `CLAUDE.md` or auto-invoke `/save-memory` (requires explicit user approval per ask-before-add rule).
- Does not run skills itself (it suggests skills; user invokes when ready).

## Why this exists

Every Catalyst regression in CLAUDE.md history has the same root cause: a plan was synthesized without first acquiring the evidence the plan should have been grounded in. `/preflight` makes that impossible by gating Phase 1 council on Phase 0.5 probe results.

## Install

Drop the `.plugin` file into Cowork. After install, every new Cowork session will see `/preflight` in `<available_skills>`.

## License

MIT
