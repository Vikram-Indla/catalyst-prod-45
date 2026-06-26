# Catalyst Feature Builder — Quality Scorecard

**Version:** 1.0 (Generic)
**Date:** 2026-06-26

This is the Catalyst equivalent of Karpathy AutoResearch's `val_bpb` metric.
One composite score per experiment. Keep/revise/reject decision driven by this score.

---

## Composite Formula

```
Composite = (ADS × 0.25) + (Parity × 0.30) + (Functional × 0.30) + (Reuse × 0.15)
```

| Score | Decision |
|---|---|
| ≥ 80 | PASS — eligible for keep |
| 65–79 | REVISE — fix issues, re-score |
| < 65 | FAIL — reject, start fresh |
| Any P0 violation | AUTOMATIC FAIL — regardless of composite |

---

## Dimension 1 — ADS Compliance (25%)

**What it measures:** Zero design system violations in files touched by this experiment.

**How to measure:**
```bash
node design-governance/rules/audit.js <touched-files> 2>&1 | tail -20
```

**Scoring:**
| Violations in touched files | Score |
|---|---|
| 0 | 100 |
| 1–2 | 80 |
| 3–5 | 60 |
| 6–10 | 40 |
| > 10 | 0 |

**P0 violations** (any = automatic FAIL):
- Hardcoded hex color (raw `#XXXXXX` outside `var(...)` fallback)
- Non-ADS font import
- Tailwind color/typography utility class
- Banned component (react-select, hand-rolled dropdown, etc.)

---

## Dimension 2 — External Benchmark Parity (30%)

**What it measures:** How well this experiment's output matches the domain benchmark.

**How to measure:** Compare against `external-benchmark-research.md` findings.
Rate each benchmark feature that this experiment covers: implemented correctly vs missing/wrong.

**Scoring:**
| Benchmark features correctly implemented | Score |
|---|---|
| 100% of in-scope features | 100 |
| 90–99% | 90 |
| 75–89% | 75 |
| 50–74% | 50 |
| < 50% | 25 |
| No benchmark (Catalyst-native) | Score as 100 if acceptance criteria pass |

**Parity evidence required:**
- Feature-by-feature comparison against benchmark findings
- For UI: screenshot showing visual match or intentional Catalyst-native deviation
- For data: query result showing correct data model

---

## Dimension 3 — Functional Completeness (30%)

**What it measures:** Acceptance criteria pass rate for this experiment.

**How to measure:** Count passing acceptance criteria from `hypothesis.md`.

**Scoring:**
| Acceptance criteria passing | Score |
|---|---|
| 100% | 100 |
| 90–99% | 85 |
| 75–89% | 70 |
| 50–74% | 50 |
| < 50% | 20 |

**P0 functional failures** (any = automatic FAIL):
- CRUD write path broken (data does not persist)
- RLS policy blocks valid user access
- Route unreachable (404 on registered route)
- Typed domain fallback in rendered data (banned zero-assumption code)

---

## Dimension 4 — Reuse Compliance (15%)

**What it measures:** Did this experiment mount canonical components or rebuild them?

**How to measure:** Check what was imported and mounted vs what was built from scratch.

**Scoring:**
| Compliance | Score |
|---|---|
| All canonical components used correctly; nothing rebuilt that exists | 100 |
| One minor deviation with justification | 80 |
| One parallel implementation of existing canonical | 40 |
| Multiple parallel implementations | 0 |

**P0 reuse violations** (any = automatic FAIL):
- Built new `<table>` HTML for work items instead of `JiraTable`
- Built new detail view layout instead of `CatalystViewBase`
- Built new status component instead of `CatalystStatusPill`
- Used `react-select` directly instead of `@atlaskit/select`
- Forked a canonical component instead of parameterising

---

## Scorecard Worksheet (Copy Per Experiment)

```
Experiment: <feature-slug> / <experiment-id>
Date: YYYY-MM-DD

Dimension 1 — ADS Compliance
  Violations in touched files: _
  Score: _ / 100
  Weighted (×0.25): _ / 25

Dimension 2 — External Benchmark Parity
  In-scope features: _
  Correctly implemented: _
  Score: _ / 100
  Weighted (×0.30): _ / 30

Dimension 3 — Functional Completeness
  Acceptance criteria total: _
  Passing: _
  Score: _ / 100
  Weighted (×0.30): _ / 30

Dimension 4 — Reuse Compliance
  Canonical components used: _
  Parallel implementations: _
  Score: _ / 100
  Weighted (×0.15): _ / 15

COMPOSITE: _ / 100
P0 VIOLATIONS: _ (0 = eligible for keep)

DECISION: keep | revise | reject | blocked
```
