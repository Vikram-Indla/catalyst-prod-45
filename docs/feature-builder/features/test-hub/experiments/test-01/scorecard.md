# Experiment Scorecard: test-hub / test-01

**Title:** Discovery: Existing Catalyst Test Hub, AIO Benchmark, and Catalyst-Native UX Opportunity Scan
**Date:** 2026-06-26
**Type:** research

> This is the Catalyst equivalent of Karpathy AutoResearch's val_bpb.
> Fill AFTER experiment, BEFORE calling finish-experiment.sh.

---

> Research experiment — scorecard adapted to Evidence Quality Score (EQS) per hypothesis.md.
> Dimensions: Source coverage (25), Accuracy of findings (25), Relevance to Test Hub objective (20),
> Decision usefulness (20), Traceability to files/docs (10). Minimum acceptable: 90/100.

---

## Scorecard (Evidence Quality Score)

| Dimension | Max | Score | Notes |
|---|---:|---:|---|
| Source coverage | 25 | 23 | All 5 lanes completed; 16 Test Hub pages audited; 18 canonical patterns; AIO entity model + 14 capability categories; 20 AI use cases; 3 UI options. Deduction: AIO PDF individual content not exhaustively read (HTML + KB used instead). |
| Accuracy of findings | 25 | 23 | CaseDrawer verdict confirmed (custom portal, NOT CatalystViewBase); useAIGeneration dead code confirmed; 4 canonical thin wrappers confirmed. Deduction: TraceabilityPage content not fully verified (file exists; quality unknown); SetDetailPage not fully read. |
| Relevance to Test Hub objective | 20 | 20 | Every finding maps directly to: what to rebuild, what to reuse, what is missing, what AI can do. Gap matrix produced with 65 features. Recommended direction selected. |
| Decision usefulness | 20 | 19 | Outputs are immediately actionable: 6 build experiments specified, component plan per screen, 6 MVP AI use cases, Hybrid B+C recommendation with rationale. Deduction: Test Plans wire-vs-delete decision still open (requires Vikram). |
| Traceability to files/docs | 10 | 9 | Most claims have file:line or command evidence. Deduction: UI/UX options (Lane 5) are design research with no file:line cites — by design. |
| **Total** | **100** | **94** | |

**Threshold:** ≥ 90 = keep · 75–89 = revise · < 75 = reject
**Result: 94/100 — KEEP ✅**

---

## Hard Fail Check (research-adapted)

| Check | Pass/Fail | Notes |
|---|---|---|
| No src/ files modified | ✅ PASS | Zero src/ changes throughout |
| No DB queries executed | ✅ PASS | Research via file reads only |
| No routes added or modified | ✅ PASS | Research experiment |
| No migrations created | ✅ PASS | Research experiment |
| No Edge Function modifications | ✅ PASS | Research experiment |
| allowed-edit-surface.md filled before work | ✅ PASS | Filled at experiment start |
| AIO docs accessible (not blocked) | ✅ PASS | HTML + KB + 152 PDFs confirmed |
| All 5 research lanes completed | ✅ PASS | All agents returned full findings |
| All deliverable files written | ✅ PASS | 7 feature docs + 5 experiment docs |
| Recommended target option selected | ✅ PASS | Hybrid B+C; target-catalyst-design.md |
| Decision supported by evidence | ✅ PASS | Every finding citable to file:line or AIO docs |

---

## Final Score

```
Total: 94 / 100
Hard fails: 0
Minimum threshold (90) met: YES ✅
```

## Decision

**keep** — EQS 94/100 exceeds 90 minimum. Zero hard fails. All 5 lanes complete. Recommended direction actionable. Gate 3 approval needed before build experiments.
