# CATALYST OPERATING SYSTEM

> The full operating protocol for the Catalyst product team.
> TRIAD roles, two-hour delivery loop, Plan Lock, drift control, commit gate.

---

## PURPOSE

Catalyst is an enterprise work-management platform. All Claude Code work must operate through Catalyst canonical components, Atlassian Design System, Feature Work IDs, Plan Lock, multi-agent execution, screenshot acceptance, and explicit handover.

---

## TRIAD ROLES

| Role | Person | Responsibilities |
|---|---|---|
| **JK** | Product Owner | Vision, scope approval, screenshot signoff, Plan Lock approval |
| **Aiden** | Engineering Lead | Architecture decisions, migration approval, integration sign-off |
| **Claude Code** | AI implementer | Discovery, planning, parallel execution, validation, handover |

Claude Code does not merge to main without TRIAD approval on UI-heavy or schema-touching changes.

---

## TWO-HOUR DELIVERY LOOP

```
1. READ         → pre-flight + feature folder + Plan Lock + handover
2. DISCOVER     → spawn parallel agents (Canonical + UI Critic + Integration + Data Guard)
3. LOCK         → write/confirm Plan Lock (03_PLAN_LOCK.md)
4. EXECUTE      → implement per Plan Lock, surgical files only
5. VALIDATE     → run validation commands, capture screenshots
6. HANDOVER     → update 07_HANDOVER.md + 08_DRIFT_LOG.md
7. COMMIT GATE  → confirm all gates before staging files
```

Each loop = max 2 hours. If it cannot finish, stop at step 6 and hand over.

---

## PLAN LOCK

Plan Lock is the binding implementation contract for one slice.

- Written **before** any code
- Defines: objective, non-scope, timebox, canonical components, canonical screens, files to modify, files forbidden, UI/UX rules, data rules, integration rules, parallel plan, screenshot checklist, validation commands, stop conditions, drift rules
- Approved by Vikram (or implicit if session continues without pushback after review)
- **No code without Plan Lock. No exceptions.**

---

## DRIFT CONTROL

Drift = any deviation from Plan Lock during execution.

When drift is detected:
1. Stop immediately
2. Document in `08_DRIFT_LOG.md`: what drifted, why, evidence, options
3. Ask Vikram for rebaseline decision
4. Do not continue until rebaseline is explicit

**Never silently patch drift.**

---

## REBASELINE RULE

After one correction loop (fix attempt):
- **Accept** — deviation is acceptable, update Plan Lock
- **Split** — break into smaller slice
- **Rebuild** — discard and restart slice
- **Stop/Revert** — revert changes, handover

No third or fourth attempt on the same correction. If one correction loop doesn't resolve it, escalate.

---

## KARPATHY LOOP FOR CATALYST

**Karpathy Loop for Catalyst means Hypothesis → Experiment → Measure → Keep/Discard → Log.**

Every discovery and implementation decision runs through this loop. No assumptions. No post-hoc evidence. Log every entry to `11_KARPATHY_LOOP_LOG.md`.

See full protocol: [`CATALYST_KARPATHY_LOOP.md`](CATALYST_KARPATHY_LOOP.md)

---

## PARALLEL AGENT MODEL

**Parallel agents are mandatory for non-trivial Catalyst work.**

See full agent definitions: [`CATALYST_PARALLEL_AGENTS.md`](CATALYST_PARALLEL_AGENTS.md)

Discovery agents (run in parallel before Plan Lock):
- Canonical Component Discovery
- Canonical Screen Discovery
- UI/UX Critic
- Integration Architect
- Data/Safety Guard
- Implementation Planner
- QA/Screenshot Validator

Review agents (run after implementation):
- Plan Drift Reviewer
- Canonical Reuse Reviewer
- ADS/Design Token Reviewer
- Regression Reviewer
- Handoff Writer

No agent may silently change files outside Plan Lock. If two agents need the same file, consolidate intentionally.

---

## CANONICAL COMPONENT HIERARCHY

```
1. Existing Catalyst canonical component
2. Existing Catalyst wrapper
3. Catalyst Storybook component
4. Atlassian Design System primitive (@atlaskit/*)
5. Hand-rolled component — ONLY with explicit written approval
```

**Hand-rolled UI is rejected by default.**

**JiraTable is mandatory for Jira/work-item tables and the first candidate for enterprise admin lists.**

See full rulebook: [`CATALYST_CANONICAL_RULEBOOK.md`](CATALYST_CANONICAL_RULEBOOK.md)

---

## ADS TOKEN AUTHORITY

**Bare colors are banned.** Only `var(--ds-*)` tokens or ADS `token()` helper.

No hex, no rgb/rgba/hsl, no Tailwind color utilities, no custom color constants.

---

## SCREENSHOT SIGNOFF

Screenshots are mandatory for UI/UX acceptance.

Required for: any visible layout change, any color change, any component swap, any new surface.

Screenshots do NOT prove functionality. They prove visual acceptance only.

Functional validation requires: DOM probes, API responses, DB query results, test output.

---

## CONTEXT HANDOVER

At context risk (long session, context approaching limit, or task handoff):

1. Write/update `07_HANDOVER.md`
2. Write/update `08_DRIFT_LOG.md`
3. Record next exact prompt in handover
4. Stop cleanly

Incoming session must read handover + Plan Lock before any action.

---

## COMMIT GATE

**No commit unless all gates pass:**

| Gate | Check |
|---|---|
| Plan Lock approved | `03_PLAN_LOCK.md` reviewed and not superseded |
| Raw validation | Validation commands run and output recorded |
| Screenshot acceptance | Screenshots captured and accepted for UI changes |
| Guardrails confirmed | No banned colors, no hand-rolled UI, no assumption defaults |
| File list approved | Exact staged files match Plan Lock file list |
| Commit message approved | Conventional commit, approved by Vikram |

Stage explicit files only. Never `git add -A` or `git add .`.
