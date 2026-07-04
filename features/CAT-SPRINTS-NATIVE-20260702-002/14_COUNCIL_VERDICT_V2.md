# COUNCIL VERDICT V2 — Resumption Review (2026-07-02, evening)

**Trigger:** JK requested full re-discovery + council re-run after side work landed.
**Discovery evidence:** local main was 25 commits behind origin/main; fast-forwarded to 826fb72e1. DB probes re-run on staging.

## What the delta discovery found

**SHIPPED on origin/main + APPLIED to staging (probe-verified live):**
| Slice | Commit | DB evidence |
|---|---|---|
| S0.1a slug/columns/routing | d61da1b6a | new columns live (name_mode, approval_policy, deleted_at…) |
| S0.1b native transition trigger | 47fe25223 | 2 native rows (jira_changelog_id NULL) |
| S0.2a FK backfill + progress repoint | 5b79a337b | — |
| S0.2b membership repoint + changelog trigger | ef1830e72 | trigger live, 0 rows yet (no membership events) |
| S0.3 status vocabulary | 672b74407 | completed:25 / planning:1 / archived:1 |
| S0.4 dead-data purge | e85c1682b | 25 soft-deleted, 2 live |
| S1.1a JiraTable list | 826fb72e1 | — |
| S1.3a auto-name util + SQL | 1dca56aa0 | migration 20260703210000 applied |
| S1.3b create/edit modal | b0bd6ec13 | 1 native test sprint in 'planning' |
| Health Engine (unplanned) | ea0ade4f3 | own folder CAT-HEALTH-ENGINE-20260702-001; sprint adapter UNVERIFIED post-restart |
| Release-detail loading fix (claimed) | a64130b1b | contradicts health handover ("fix did not resolve root cause") — UNVERIFIED |

**NOT shipped:** S1.1b group-by/toolbar, S1.2 progress, S1.4 release link (ph_release_sprints absent — probed), S2.1–2.3 DoD+approvals (ph_sprint_dod absent — probed), S3.1–3.5 analytics, RLS tightening, prod strategy (prod still has NO ph_jira_sprints).

## Where the panel agrees
1. **Do not revert — but do not trust either.** The code is real and followed the slice plan; "committed" ≠ "verified". Every shipped slice passes its acceptance check before being marked done.
2. **The ledger is the disease** (Root-Cause): the folder said "nothing executed" while a sixth of the plan shipped. Every future session rehydrates from the folder → reconciliation is the first action, derived from git + DB probes, not memory.
3. **Four Plan Lock decisions were answered silently by code** (sync discriminator, draft status, prod path, BR exclusion) — extract the implicit answers from the diffs, ratify or revert explicitly in 09_DECISIONS.md.
4. **Two "done" claims are actually unverified:** health sprint adapter (never re-checked post-restart) and the release-detail fix (a commit claims what the handover denies).

## Where the panel clashes
- **Q5 says cut Phase 2 (DoD/approvals) and S1.4** as vision-doc items, not observed needs. **Overruled in synthesis:** JK's brief marks DoD + approvals as non-negotiable requirements; JK is the requirement source. They stay — but sequenced after usability parity (S1.1b/S1.2) per Action Coach.
- Health Engine keep/remove: Q1 wants an explicit decision. Synthesis: KEEP — sprint health is a JK requirement and the engine is its cheapest path (Opportunity: S3.4 is ~2h of verification, not a build).

## What the panel caught
- Trust-by-slice-ID fallacy; sunk-cost laundering risk in retroactive logs (mitigation: verification-first reconciliation, honest drift entry).
- **Q2 systemic pattern: environment mutated first, record written later or never** (slug out-of-band → schema drift → phase shipped with empty logs). Predicted next failure: prod incident. **Structural fix: CI staging↔repo schema drift gate, modeled on the color ratchet.** Logged as recommended new feature (own Work ID).
- Native transitions accrue daily → every week before Phase 3 makes efficiency data richer (no urgency penalty for gating).

## RECOMMENDATION
**Proceed-with-conditions — resume at verification, not at code.**
Conditions: (1) verification gate passes for all shipped slices; (2) drift recorded honestly; (3) four implicit decisions ratified as-built (or reverted) + Plan Lock re-locked as-built; (4) RLS tightening not deferred past session S-C; (5) prod strategy decided before any "usable by JK's team" claim — everything so far is staging-only.

## END-TO-END PHASE PLAN (as of this verdict)
- **Phase 0 Foundations — SHIPPED, verification pending** (6/6 slices).
- **Phase 1 List+Create — 3/6 shipped** (S1.1a, S1.3a, S1.3b); remaining: S1.1b group-by/toolbar, S1.2 progress, S1.4 release link.
- **Phase 2 Lifecycle (DoD → awaiting_approval → approvals) — 0/5, next build phase** (JK non-negotiable).
- **Phase 3 Insights — S3.4 health ≈ verification-only; S3.1/3.2/3.3/3.5 gated-but-unblocked** (gate leg 2 now passes; data accruing).
- **Phase 4 Hardening — RLS tightening, prod migration strategy, CI schema-drift gate (new), Jira-parity screenshot signoff sweep.**

### Session map
- **S-A (next):** verification gate (DOM+DB probes on all shipped slices, auto-name edge cases, rename/membership test, health sprint re-check, release-bug re-test) + ratify 4 decisions + S1.1b.
- **S-B:** S1.4 release link + S1.2 progress polish.
- **S-C:** S2.1a/b DoD + RLS tightening.
- **S-D:** S2.2–2.3 approvals flow; **S-E:** S3.4 claim + S3.1 cache; then S3.2/3.3/3.5.

## THE ONE THING TO DO RIGHT NOW
Run the verification gate on the shipped slices — starting with the two contradicted claims (release-detail fix, health sprint adapter) — before a single line of new code.
