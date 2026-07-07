---
name: delegate
description: >
  Cost-aware model routing for Claude Code subagent work. Use whenever the
  session is running on an expensive/high-taste model (Opus, Fable) and is
  about to do bulk, mechanical, or high-volume work (codebase reads, data
  extraction, migrations, repetitive file edits, log/output triage) that
  doesn't need that model's taste or judgment. Trigger phrases: "/delegate",
  "delegate this", "route this to a cheaper model", "which model should
  handle this", "cost-aware model routing", "use the model cost table",
  "should this be opus or sonnet", "spawn cheap subagents", "don't burn
  premium tokens on this". Do NOT trigger for UI/UX work, copy, API design,
  or anything user-facing — those stay on the current model regardless of
  cost.
---

# /delegate — cost-aware model routing

## What this actually is

This is a **procedure the orchestrating model follows**, not a mechanism
that auto-detects "cheap work" for you. Claude Code has no way to
conditionally load instructions based on which model is active, and no
hook can semantically judge whether a task is mechanical or taste-critical
— that judgment call belongs to the model reading this skill. What backs
it mechanically is:

- **`.claude/hooks/record-session-model.sh`** (SessionStart) — best-effort
  records the active model to `.claude/logs/session-model`, when Claude
  Code's SessionStart payload includes one (not guaranteed).
- **`.claude/hooks/delegation-guard.sh`** (PreToolUse on the `Agent` tool)
  — logs every subagent call to `.claude/logs/delegation-log.jsonl`, and
  blocks (once, cheaply fixable) an `Agent` call that targets a
  known-bulk `subagent_type` with no explicit `model` set, if the session
  is known to be running Opus/Fable. It cannot verify the choice was
  *correct* — only that it was conscious.

If you're running under Sonnet or Haiku already, this whole skill is a
no-op: there's no cost delta worth chasing.

## The cost table

Tune these to your own plan — the routing rules below read from this
table, so edit it if pricing changes.

| model        | cost | intelligence | taste |
|--------------|------|--------------|-------|
| haiku-4.5    | 2    | 5            | 4     |
| sonnet-5     | 6    | 5            | 7     |
| opus-4.8     | 4    | 8            | 8     |
| fable-5      | 2    | 9            | 9     |

> A cross-vendor leg (e.g. routing to GPT via a Codex-bridge plugin) is
> **not** included here. Whether such a plugin exists and is safe to
> install has not been independently verified — don't wire it in without
> checking the package yourself first (github.com, not an AI tool's say-so).

## Procedure

1. **Classify the task**: is it bulk/mechanical (codebase reading, log
   triage, data migration, repetitive edits, research fan-out) or
   user-facing (UI, copy, API design, architectural judgment)?
2. **User-facing → do it yourself**, on the current model. Taste must be
   >= 7 for anything that ships to a user; don't delegate it away.
3. **Bulk/mechanical → delegate**, using the `Agent` tool's `model`
   parameter (or `Workflow`'s `model`/`agentType` options for multi-step
   fan-out):
   - Prefer `haiku` for pure mechanical work (grep/read/summarize).
   - Use `sonnet` when the task needs more judgment but still isn't
     user-facing.
   - Escalate back to `opus`/`fable` only if a cheaper pass's output
     doesn't meet the bar — rerun, don't patch around weak output.
4. **Always set `model` explicitly** on bulk-type agents
   (`general-purpose`, `Explore`, `repo-context-agent`,
   `token-efficiency-agent`, `tool-output-agent`, `code-graph-agent`) when
   you're aware you're running as Opus/Fable — `delegation-guard.sh` will
   block the call otherwise and tell you exactly what to add.
5. **Reviews of plans/implementations** — send to `fable` or `opus`, not
   the cheap tier; review quality is exactly where taste pays for itself.

## Auditing (the actual enforcement loop)

Hooks can't guarantee the *right* model was picked, only that a choice was
made. The real check is periodic, human-in-the-loop:

```bash
cat .claude/logs/delegation-log.jsonl | python3 -c "
import sys, json, collections
c = collections.Counter()
for line in sys.stdin:
    d = json.loads(line)
    c[(d['subagent_type'], d['model'])] += 1
for k, v in c.most_common():
    print(v, k)
"
```

If Opus/Fable keep showing up against bulk `subagent_type`s in this log,
the fix is to sharpen this skill's wording or the hook's bulk-type list —
not to expect the hook alone to keep improving on its own.
