---
name: start
description: Proceed-gated master orchestration skill. Use when the user types /start to classify the request, recommend the exact skills/capabilities, wait for proceed, then apply only the selected skills and end with a Benefit Report.
---

# /start — Proceed-Gated Claude Code Orchestrator

## Mission

When the user types `/start [request]`, do not execute the work immediately.

Only:
1. Understand the intent.
2. Classify the work type.
3. Recommend the exact skills/agents/capabilities to use.
4. Explain why each is needed.
5. Explain what each will do after `proceed`.
6. State what will not be used.
7. Wait for the user to say `proceed`.

After the user says `proceed`, apply only the selected skills/capabilities from the previous `/start`.

End every `proceed` run with a Benefit Report.

## Core flow

### `/start [request]`

Output:

## Intent understood
[One sentence.]

## Work type
[Investigation / Audit / Feature replication / Debugging / Implementation planning / Implementation / UI-DOM analysis / Design audit / Validation / Guardrail update / Tooling setup.]

## I would use these skills
- [Skill / capability]&#58; [Why it is needed.] It will [what it will do after proceed].

## I would not use these
- [Skill / capability]&#58; [Why it is not needed now.]

## Approval gate
I will wait for you to say `proceed`. After that, I will apply only the selected skills/capabilities above.

## Expected output after proceed
[Investigation report / source-target map / implementation spec / validation report / code-change plan / implementation summary.]

## Benefit report note
After `proceed`, I will end with a Benefit Report showing what each selected skill contributed and the estimated token/context budget impact.

Then stop.

### `proceed`

When user says `proceed`:
1. Apply only the skills/capabilities recommended in the previous `/start`.
2. Confirm repo/path and branch when relevant.
3. Check git status before implementation.
4. Do not run destructive commands.
5. Do not install tools unless explicitly approved.
6. Produce the main deliverable.
7. End with the mandatory Benefit Report.

If user says `proceed` without a prior `/start`, ask them to run `/start [request]` first.

## Skill selection rules

### Investigation / audit
Use:
- repo-context-agent
- token-efficiency-agent
- memory-guardrail-agent
- code-graph-agent if dependency impact matters
- ui-dom-probe-agent if UI behavior matters
- tool-output-agent if commands/logs/large output are likely

### Feature replication
Use:
- repo-context-agent
- code-graph-agent
- token-efficiency-agent
- memory-guardrail-agent
- implementation-planner-agent
- ui-dom-probe-agent if UI is involved
- tool-output-agent if validation or command output is likely

### Debugging
Use:
- systematic-debugging (primary): multi-phase loop — symptom collection → root-cause isolation → fix → verification. Use when cause is unknown, prior fix failed, bug spans layers, or fix must be defensible.
- repo-context-agent
- token-efficiency-agent
- tool-output-agent
- safety-change-control-agent
- code-graph-agent if shared logic is involved

### Implementation planning
Use:
- repo-context-agent
- code-graph-agent
- token-efficiency-agent
- memory-guardrail-agent
- implementation-planner-agent
- safety-change-control-agent

### Implementation
Use:
- safety-change-control-agent
- repo-context-agent
- code-graph-agent
- token-efficiency-agent
- memory-guardrail-agent
- implementation-planner-agent
- tool-output-agent
- ui-dom-probe-agent if UI is involved

### UI / DOM analysis
Use:
- ui-dom-probe-agent
- repo-context-agent
- token-efficiency-agent
- tool-output-agent if browser/DOM output is large
- Context Mode capability if available
- design-critique if visual quality scoring is needed alongside DOM analysis

### Design audit / UX scoring
Use:
- design-critique (primary): scores surface against 10 Nielsen + ADS heuristics. Produces findings table, P0/P1/P2 severity ratings, closure evidence with screenshots. Consults catalyst-storybook MCP before scoring. Mandatory before any UI surface is declared done.
- ui-dom-probe-agent: provides DOM/computed-style data for design-critique to score against
- repo-context-agent: maps which components are in scope
- token-efficiency-agent
- tool-output-agent if screenshot or MCP output is large

### Validation
Use:
- tool-output-agent
- safety-change-control-agent
- RTK capability if terminal output may be large
- design-critique if validation includes visual/design correctness (not just functional)

### Guardrail / memory update
Use:
- memory-guardrail-agent
- safety-change-control-agent
- Memsearch capability if available

## External capability awareness

External repos are not automatically available just because they are listed.

Before claiming an external capability is usable, check:
- `.claude/start-orchestrator/registry/repos.json`
- `.claude/start-orchestrator/registry/how-claude-gets-skills.md`
- `.claude/vendor/<repo-name>/`
- CLI availability, if relevant

Label every capability as one of:
- Native local agent
- External repo cloned
- External CLI/MCP available
- External missing; native fallback will be used

If missing, say:
"Capability not installed/cloned. I will use the native fallback."

## Known local skills

design-critique:
- Path: `.claude/skills/design-critique/SKILL.md` (both repo-local and global `~/.claude/skills/`)
- Availability: Native local skill
- Use for: heuristic UX/UI scoring (10 heuristics, P0/P1/P2), ADS token compliance spot-check, Catalyst Storybook MCP queries, screenshot closure evidence. Triggers on: "design critique", "UX review", "audit the design", "heuristic review", "design score", "does this look right", "rate the UI".

systematic-debugging:
- Path: `.claude/skills/systematic-debugging/SKILL.md` (repo-local, distributed via git)
- Availability: Native local skill
- Use for: ambiguous failures, regressions spanning multiple layers, noisy logs, cases where fix must be proved not guessed. Runs multi-phase loop: symptom collection → root-cause isolation → patch → verification.

## Known external repo capabilities

RTK:
- Repo: https://github.com/rtk-ai/rtk.git
- Use for terminal/log/test/build output compression.
- Your screenshot shows RTK CLI is available at `/opt/homebrew/bin/rtk`.

Caveman:
- Repo: https://github.com/JuliusBrussee/caveman.git
- Use for concise response style if available.
- If active as a Claude plugin but not on PATH, do not mark it missing only because CLI check fails.

Claude Context:
- Repo: https://github.com/zilliztech/claude-context.git
- Use for semantic repo discovery if installed/configured.

Code Review Graph:
- Repo: https://github.com/tirth8205/code-review-graph.git
- Use for dependency graph and blast-radius analysis if installed/configured.

Token Savior:
- Repo: https://github.com/Mibayy/token-savior.git
- Use for symbol-level reads and avoiding full-file loading if installed/configured.

Context Mode:
- Repo: https://github.com/mksglu/context-mode.git
- Use for large DOM/browser/MCP/API/JSON output isolation if installed/configured.

Memsearch:
- Repo: https://github.com/zilliztech/memsearch.git
- Use for persistent memory and guardrail retrieval if installed/configured.

## Catalyst guardrails

Always apply:
1. Reuse existing implementation before creating anything new.
2. Do not create a new component library.
3. Do not change theme, typography, colors, spacing, layout conventions, or design system unless explicitly requested.
4. Do not duplicate business logic.
5. Do not hardcode data where dynamic data exists.
6. Inspect source implementation before replication.
7. Inspect target module before proposing changes.
8. Prefer minimal diffs.
9. Preserve existing React + TypeScript + Tailwind patterns.
10. Preserve existing Supabase/data-access patterns.
11. Preserve existing route patterns.
12. Preserve existing drawer, dialog, tab, table, filter, kanban, roadmap, and form conventions.
13. For filters, scoring, workflow, roadmap, OKR, dashboard, and governance logic, preserve existing business rules unless explicitly changed.
14. For implementation, provide impact analysis before editing.
15. For risky changes, provide rollback guidance.
16. Never run destructive commands without explicit approval.
17. Never alter schema, migrations, env files, secrets, credentials, commits, or pushes without explicit approval.

## Mandatory Benefit Report

After every `proceed`, include:

## Benefit Report

### Skills/capabilities used
| Skill / Capability | Availability | Used for | Benefit delivered |
|---|---|---|---|

### Token / context budget impact
- Files searched:
- Files fully read:
- Files partially inspected:
- Large outputs avoided or summarized:
- Commands run:
- Raw output suppressed/summarized:
- Exact token metrics available: Yes/No
- Estimated context saved:
- Token budget status: Low risk / Moderate risk / High risk

If exact token metrics are unavailable, say:
"Exact token usage is not exposed in this run. This is an evidence-based estimate based on visible actions such as files read, partial reads, commands run, and large outputs summarized."

### Benefit summary
- What was achieved.
- What risk was reduced.
- What unnecessary work was avoided.
- What is ready next.
- What still needs approval or validation.
