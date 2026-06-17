---
name: regression
version: 1.0.0
description: Defect-log triage + fix engine for Catalyst. Ingests a defect log (docx/xlsx/pasted/screenshots), fans out parallel READ-ONLY investigators that root-cause each defect at file:line, PUSHES BACK on anything that isn't a real defect, builds a master understanding table with regression blast-radius, proposes an ADS-safe fix plan, and only after explicit goahead fixes one cluster per commit — verifying every fix with DOM/DB/wiring probes (never screenshots) + ADS validators. Discover → Relay → Plan → Propose → Fix → Improve.
author: "Vikram x Claude, 2026-06-18"
metadata:
  category: orchestration
  tags: [defect-triage, root-cause, regression, ads-scan, probe-first, pushback, cluster-fix]
  maturity: stable
  triggers: ["/regression", "triage these defects", "defect log", "fix these bugs", "root cause these", "regression cycle", "work through this defect log"]
  banned_tools: ["testsprite_*", "preview_*"]
  design_system: "@atlaskit/* + var(--ds-*) tokens exclusively"
  supabase_project: lmqwtldpfacrrlvdnmld
  dev_port: 8080
  companion_skills: [hermes-regression-sweep, jira-compare, design-critique, catalyst-agent]
---

# /regression — Defect Discovery → Relay → Plan → Propose → Fix → Improve

Probe-first defect engine. Turns a raw defect log into root-caused, regression-safe,
ADS-clean fixes — one cluster per commit, never proceeding without explicit goahead.

**Golden rule:** a defect report is a HYPOTHESIS, not a verdict. Push back before you patch.
Silence beats a lie; a wrong "fixed" is worse than an open defect.

---

## PHASE 1 — DISCOVER (parse the source)

1. Accept any input: `.docx` / `.xlsx` (unzip → parse `word/document.xml` or sheets), pasted
   text, or "Image N" screenshot references. Extract every defect into a normalised row:
   `{ id, area, observed, expected, priority, evidence }`.
2. For `.docx`: `unzip -o -q file.docx -d /tmp/x` then parse paragraphs from `word/document.xml`
   (split on `</w:p>`, pull `<w:t>` text, unescape entities). Do NOT trust Word's own priority —
   re-rank yourself in Phase 3.
3. Output the raw defect list back to the user so scope is shared before any probing.

## PHASE 2 — RELAY (parallel read-only investigation)

1. Cluster defects by surface/subsystem (e.g. filters-routing, backlog, auth, status-pills).
2. Spawn ONE `general-purpose` (or `Explore`) subagent per cluster, **READ-ONLY — no edits**.
   Each agent MUST return, per defect:
   - **VERDICT**: `real defect` / `not a defect` / `cannot confirm` — pushback is MANDATORY.
   - **ROOT CAUSE**: precise, with `file:line` refs and the exact broken expression.
   - **BLAST RADIUS**: every other consumer of the touched handler/query/component.
   - **ADS-SAFE FIX REC**: smallest change; `@atlaskit/*` + `var(--ds-*)` only; for un-built
     actions recommend hide/disable (no false affordance).
3. Keep the conclusions, not the file dumps. Run clusters concurrently (one message, many calls).

> **Lesson (2026-06-18):** subagents hallucinate file paths. DEF-002's investigation cited a
> `RecommendedProjectsStrip.tsx` + query that did not exist. **Before editing on any subagent
> claim, re-verify the cited file:line yourself.** If the file/symbol is absent → re-probe, do
> not patch on a false model.

## PHASE 3 — PLAN (the understanding table — the deliverable)

Present a single master table the user reads first:

| ID | Pri (theirs→mine) | Verdict | Root cause (file:line) | Blast radius | ADS-safe fix |

Rules:
- **Lead with the uncomfortable truth** — mis-priorities, "most of this works", "cannot confirm".
- Re-rank priority on impact (e.g. "only X can log in" = P0, not the P1 it was filed as).
- Cluster shared root causes ("fix-once" groups) so one change clears several defects.
- Add a **regression-safety read**: which fixes touch shared components; how each stays additive.
- Surface **decisions only the user can make** (product forks) via `AskUserQuestion` — DB-vs-derived
  source of truth, preserve-access-vs-privacy-message, extend-vs-disable, confirm-vs-treat-as-not-a-defect.

## PHASE 4 — PROPOSE (risk-ranked plan, then STOP)

1. Order clusters lowest-risk-first; highest-blast (e.g. "touches every pill") last + isolated.
2. State what "done" looks like per cluster + the verify method.
3. **HARD STOP.** Do not write code until the user gives an explicit goahead. Re-confirm the
   product-fork answers from Phase 3 are locked.

## PHASE 5 — FIX (one cluster, one commit)

Per cluster:
1. **Re-verify** the subagent's claims at the exact lines (Phase 2 lesson).
2. TDD where a harness exists; if none (edge functions, big TSX) say so explicitly and mirror a
   known-good in-repo pattern.
3. Make the **smallest additive change**. Gate new behavior so untouched paths are byte-identical.
4. **Self-audit for regressions you introduce** — e.g. a loading gate that hangs on query error;
   a prop the target component doesn't accept; a stale-closure in a memo. Fix before committing.
5. **Verify functionally, never by screenshot** (CLAUDE.md P0): DOM/`getComputedStyle`, Supabase
   `execute_sql`, edge logs, code trace. Screenshots only for pure cosmetic text/color.
6. `npx tsc --noEmit` filtered to touched files + `node design-governance/rules/audit.js <file>`
   — confirm AUDIT PASSED. Pre-existing violations far from your edit: flag, ask leave-or-fix.
7. **`git status` BEFORE every commit.** Stage ONLY explicit task paths — never `git add -A`/`.`.
   The working tree routinely carries foreign uncommitted changes from other sessions; staging
   them silently reverts shipped work. Verify only your files are staged.
8. Run `hermes-regression-sweep` on shared-component edits.
9. Commit per cluster with a `CAT-DEF-NNN`-tagged message; end with the Co-Authored-By trailer.
   Commit/push only when the user asks. Outward-facing/irreversible actions (auth backfills, mass
   email, schema) need explicit per-action approval — a one-user canary first, then batch.

## PHASE 6 — IMPROVE (close the loop)

1. Append a CLAUDE.md lesson for any new failure class (with the corrected diagnostic step).
2. Log what the original report got wrong (mis-priority, false "not working", hallucinated path).
3. Update THIS skill with new pushback patterns / probe recipes discovered.
4. Surface remaining parked items (deferred re-probes, edge cases, deploy-needed) explicitly.

---

## HARD GUARDRAILS (non-negotiable, every run)

- **Push back first.** Every defect gets a real verdict; "cannot confirm" is a valid, honest answer.
- **Zero-assumption / silence-over-lie** (CLAUDE.md): never render a plausible-wrong default.
- **Reuse-first**: extend canonical components; never fork or rebuild.
- **ADS validators are a gate, not a suggestion** — `@atlaskit/*` + `var(--ds-*)` only; spacing grid
  {0,4,8,12,16,24,32,40,48}; Atlassian fonts only.
- **Probe, don't screenshot** for any functional claim.
- **Explicit-path commits only**; `git status` before each.
- **No proceed without goahead**; product forks via `AskUserQuestion`.
- **One logical change at a time**; one cluster per commit; verify each before the next.

## CONTEXT GUARD

At ~80% context: finish the current cluster, commit, write a handover (clusters done + commit
SHAs + remaining table + locked decisions), stop. Each cluster is self-contained so a resume
re-enters at Phase 4 for the next cluster with no lost state.
