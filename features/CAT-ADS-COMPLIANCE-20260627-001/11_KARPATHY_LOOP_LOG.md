# CAT-ADS-COMPLIANCE-20260627-001 — Karpathy Loop Log

> Hypothesis → Experiment → Measure → Keep/Discard → Log.
> See protocol: docs/ways-of-working/CATALYST_KARPATHY_LOOP.md

---

## Loop entries

## [LOOP-001] "ads compliance" means Atlassian Design System, not advertising

**Date:** 2026-06-27
**Phase:** Discovery
**Hypothesis:** In this repo "ADS" = Atlassian Design System compliance (tokens, components), not advertising.
**Experiment:** Reviewed recent git log + project memory + Agent 1 tooling inventory.
**Evidence:** Recent commits all `ads-parity` / `ADS-13` / color-scanner; memory tracks ADS scanner + token parity; tooling is `no-hardcoded-colors`, `design-governance`, `ads-token-map.md`. No advertising code anywhere.
**Decision:** KEEP
**Reason:** Overwhelming, consistent signal.
**Next step:** Scope feature as ADS (Atlassian Design System) compliance.

## [LOOP-002] ADS tooling already exists and is mature

**Date:** 2026-06-27
**Phase:** Discovery
**Hypothesis:** We need to build a compliance scanner.
**Experiment:** Agent 1 + Agent 4 inventoried scripts/, design-governance/, eslint.config.js, CI.
**Evidence:** Scanner, 4-validator audit, field-compliance gate, eslint bans, 3 CI workflows all exist. Gap is enforcement wiring (pre-commit `exit 0`, tsc no-op bug, audit not in main CI).
**Decision:** DISCARD (the "build a scanner" hypothesis)
**Reason:** Building would duplicate mature tooling. Effort is enforcement + remediation.
**Next step:** Frame slices around enforcement hardening and unblocked remediation.

## [LOOP-003] The big remediation buckets are BLOCKED

**Date:** 2026-06-27
**Phase:** Discovery
**Hypothesis:** We can bulk-wrap the remaining 574 bare-hex into ADS tokens now.
**Experiment:** Agent 5 + Agent 6 cross-checked `references/ads-token-map.md` and the PARITY feature folder.
**Evidence:** 265 of 574 hexes are UNMAPPED; CLAUDE.md forbids self-inventing mappings; a prior auto-wrap attempt (PR7–PR9) had to be reverted (RED FLAG). Status pills / Jira-parity hexes are intentionally protected. ~200 Tailwind arbitraries are not var()-wrappable and need an architecture decision.
**Decision:** DISCARD (the "bulk-wrap now" hypothesis)
**Reason:** Unacceptable Jira-parity / dark-mode regression risk without authoritative mappings.
**Next step:** Choose an UNBLOCKED first slice. Candidates: ADS-13 Finding 3 standardization (visual-risk, high blast radius) vs CI enforcement wiring (zero product-code risk).

## [LOOP-004] Lowest-risk highest-leverage first slice = CI enforcement wiring

**Date:** 2026-06-27
**Phase:** Discovery
**Hypothesis:** The safest first slice that still moves the needle is wiring the existing scanner into the dev workflow (no product-code edits).
**Experiment:** Compared Agent 6 slices by (value × unblocked ÷ risk).
**Evidence:** CI wiring touches only `.husky/pre-commit`, a workflow/npm script, and CLAUDE.md docs — no rendered UI changes, no token swaps, no screenshot risk. Finding 3 standardization is higher value but touches 100–120 files with high visual blast radius.
**Decision:** KEEP (as recommended first slice, pending Vikram choice)
**Reason:** Prevents NEW violations immediately at near-zero regression risk; de-risks every later remediation slice by gating regressions.
**Next step:** Present Plan Lock DRAFT with CI-wiring as recommended Slice 1 and Finding 3 as the alternative; STOP for review.
