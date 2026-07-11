---
name: fable
description: Goal-accuracy skill. Given any stated objective, decomposes it into explicit falsifiable Definition-of-Done criteria, runs a blind-spot pass before planning, drives execution through the existing Catalyst skill stack, and refuses to call anything "done" until every criterion has direct evidence — not confidence. Use when a goal/objective is handed over and the ask is fidelity to exactly what was requested, not an approximation of it. Triggers on "/fable <objective>", "achieve this goal", "make sure this matches the objective exactly", "close the loop on this".
version: 0.1.0
metadata:
  category: engineering
  ported_from: Ishan7390/fable-skill (discovery-interview / blind-spot / explainer+quiz phases)
  tags:
    - goal-accuracy
    - blind-spot-analysis
    - verification
    - plan-lock
  maturity: beta
---

# /fable — Goal-Accuracy Skill

## Why this exists

An audit of this repo's skill stack (`.Codex/skills/*`) surfaced four repeat gaps that let "looks finished" ship instead of "matches the objective" (the "bound spots" this skill closes):

1. **No objective → criteria translation.** Plan Lock captures scope, but nothing turns the raw objective sentence into a numbered, falsifiable checklist before work starts. Ambiguity gets silently resolved by whoever is coding, rather than surfaced.
2. **Verification is self-graded.** Screenshot evidence (`CATALYST_UI_UX_ACCEPTANCE.md`) proves a screen rendered; it does not prove the stated objective was met. No skill re-reads the original ask at the end and checks it item-by-item.
3. **No dedicated blind-spot gate before commitment.** `advanced-council` and `preflight` run councils/probes, but there is no required "what don't we know yet" pass that must be answered — or explicitly deferred with a stop-and-ask — before the Plan Lock is written.
4. **"Done" is declared by confidence, not evidence.** Nothing blocks marking a task complete while explicit criteria remain unverified.

`/fable` does not replace `preflight` / `catalyst-agent` / `systematic-debugging` / `design-critique` — it wraps them with an objective-in, evidence-out contract, and will not report an objective as complete until every criterion derived from it is verified.

## What "100% accurate" honestly means here

Not a guarantee against unknown-unknowns — no skill can promise that. It means: **100% of the explicit, falsifiable Definition-of-Done items derived from the stated objective are verified with direct evidence (test output, DOM probe, query result, or screenshot per the UI acceptance rules) before this skill will say "done".** Any item that cannot be verified is reported as an open gap, never rounded up or marked complete on confidence. Ambiguity in the objective is resolved by asking (per AGENTS.md's zero-assumption rule), never by silently picking the most likely interpretation.

## Activation signals

- The user hands over a goal/objective and wants it achieved exactly, not approximately.
- A prior attempt at the same objective drifted from what was actually asked.
- The task explicitly asks for verification, acceptance criteria, or "make sure this is right."

## Phases

### Phase 0 — Objective Intake & Restatement
- Restate the objective in your own words before doing anything else.
- Decompose it into a numbered Definition-of-Done (DoD) list. Every item must be binary — verifiable true/false, never subjective ("looks good", "should work").
- List every ambiguous term or unstated constraint under **Open Questions**. Do not silently resolve one that changes what "done" means — stop and ask.
- Classify the objective: **product/UI/data change** (full AGENTS.md ceremony applies — Feature Work ID, feature folder, Plan Lock, screenshot signoff, commit gate) vs. **tooling/meta work** (e.g. authoring a skill, a script, docs — lighter-weight version of Phases 0-4, no feature-folder ceremony forced onto it). State which, and why, explicitly.

### Phase 1 — Blind-Spot Pass
- Probe for hidden constraints relevant to the objective: existing canonical components, existing skills/agents that already cover part of this ask, schema/RLS constraints, ADS token rules, the slug contract, prior Plan Locks or Drift Logs touching the same area.
- Reuse existing probes instead of re-implementing them — `repo-context-agent` / `code-graph-agent` for structure, `catalyst-agent`'s router probes for Jira/Catalyst parity, `memory-guardrail-agent` for prior lessons.
- Output a short list of "things that would silently break this if ignored." Map each one to a DoD item it constrains, or add it as a new DoD item if it reveals a missing requirement.

### Phase 2 — Plan Lock Synthesis
- For product/UI/data work: produce or update `03_PLAN_LOCK.md` per `CATALYST_PLAN_LOCK_TEMPLATE.md`, with one row per DoD item and its acceptance-evidence method (test / DOM probe / screenshot / query). Every DoD item maps 1:1 to a Plan Lock row — no orphans either direction. Stop before coding; Plan Lock must be reviewed.
- For tooling/meta work: an inline plan (files to touch, why, what's out of scope) stands in for the full Plan Lock ceremony — state this explicitly rather than skipping silently.

### Phase 3 — Execution (Karpathy Loop)
- Implement only approved DoD items, smallest slice first.
- Log each hypothesis → experiment → measure → keep/discard to `11_KARPATHY_LOOP_LOG.md` for feature work, or a plain inline note for tooling work.
- If execution reveals the objective was ambiguous or the DoD was wrong, stop and return to Phase 0 — log the drift, don't patch silently over it.

### Phase 4 — Verification Against the Objective
- Re-open the Phase 0 DoD list. Attach direct evidence to each item:
  - functional → test output, DOM probe, or query result
  - visual → screenshot per `CATALYST_UI_UX_ACCEPTANCE.md` (a screenshot alone never closes a functional item)
- Compute **Goal Accuracy = verified items / total items**. Anything short of 100% is an explicit, itemized gap list — never described as "essentially done."

### Phase 5 — Explainer + Quiz
- Write a plain-English explanation of what changed and why, understandable by someone who never saw the objective.
- Self-administer one check: "if I only read the original objective, would I expect this exact outcome?" A "no" means the objective and the outcome have drifted — reconcile before declaring done.

### Phase 6 — Drift Guard
- If the implementation changes later (this session or a future one), re-run Phase 4 against the same DoD list before re-declaring done. Log divergence to `08_DRIFT_LOG.md`.

## Decision rules

- Objective ambiguous on a point that changes acceptance criteria → stop and ask. Never assume.
- DoD item without real evidence → not done, regardless of confidence.
- Objective implies UI → canonical-component discovery and the hand-rolled-UI ban still apply; Phase 1 folds this in, it does not bypass it.
- Objective is product/UI/data work → full AGENTS.md ceremony applies. Objective is tooling/meta work with no product surface → say so and use the lighter-weight path.

## Output contract

Return, in order:
1. Objective (restated)
2. Definition of Done (numbered, binary)
3. Open Questions (if any — and how each was resolved)
4. Blind spots found
5. Plan reference (Plan Lock path, or inline plan for tooling work)
6. Execution summary
7. Verification table: DoD item → evidence → pass/fail
8. Goal Accuracy: X / Y (100% required to call it done)
9. Explainer + quiz result
10. Residual risk / open gaps

## Failure modes

- Treating "no objections raised" as evidence of correctness.
- Marking a DoD item done because it seems obviously true.
- Skipping Phase 4 because Phase 3 "looked right."
- Silently resolving an ambiguous objective instead of asking.
- Rounding the Goal Accuracy score up.

## Anti-patterns

- Padding the DoD list with items not actually derived from the objective (scope creep in the other direction).
- Restating the objective so vaguely every DoD item is trivially satisfiable.
