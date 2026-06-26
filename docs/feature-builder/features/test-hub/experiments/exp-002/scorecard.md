# Experiment Scorecard: test-hub / exp-002

**Title:** Test Hub Data Contract & Schema Truth Audit
**Date:** 2026-06-26
**Type:** research

> Research experiment. Scorecard adapted for documentation quality + completeness of findings.

---

## Scorecard

| Dimension | Max | Score | Notes |
|---|---:|---:|---|
| Schema family resolution: tm_* vs th_* definitive | 25 | 25 | 100% of active code confirmed tm_* only. th_* dormancy proven via static analysis. Zero ambiguity. |
| RPC mapping: all active RPCs identified + status | 20 | 18 | 19 active RPCs mapped with types.ts line refs. 1 suspect flagged. 1 dead identified. -2: tm_get_requirement_test_cases unverified without DB probe. |
| Hook-to-table mapping complete | 15 | 15 | All 28 hooks catalogued. Table reads per hook documented with evidence. |
| Broken/orphaned paths named + graded | 10 | 9 | 4 deferred items documented. -1: test-plans wire/delete decision deferred (requires Vikram input). |
| Safe-for-audit page list complete | 10 | 10 | All 16 routed pages assessed. All confirmed safe for UI audit. |
| Exp-003 recommendation concrete + actionable | 10 | 9 | Staging DB probe + types regen path clear. -1: th_* cleanup priority needs Vikram decision. |
| Constraints honored: no src/, no DB, no migrations | 10 | 10 | All 7 constraint checks pass. |
| **Total** | **100** | **96** | |

**Threshold:** ≥ 80 = keep · 65–79 = revise · < 65 = reject

---

## Hard Fail Check

| Check | Pass/Fail | Notes |
|---|---|---|
| No `src/` files modified | ✅ PASS | Read-only access only |
| No DB queries executed | ✅ PASS | Static analysis only |
| No routes added | ✅ PASS | Research only |
| No migrations run | ✅ PASS | Research only |
| No Test Hub UI implemented | ✅ PASS | Research only |
| Canonical schema family identified | ✅ PASS | tm_* confirmed via code analysis |
| allowed-edit-surface.md filled before work | ✅ PASS | Pre-filled |
| Evidence-backed claims (no speculation) | ✅ PASS | Every finding has file:line citation |
| Decision supported by evidence | ✅ PASS | All findings from types.ts + source reads |

---

## Final Score

```
Total: 96 / 100
Hard fails: 0
Threshold met: YES (>= 80)
```

## Decision

**keep** — canonical schema identified, all RPCs mapped, all 16 pages safe for UI audit, one suspect RPC flagged for exp-003 DB probe.
