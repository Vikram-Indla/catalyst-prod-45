# Decision: test-hub / exp-001

**Title:** Feature intake and Catalyst pattern discovery
**Date:** 2026-06-26
**Type:** research

---

## DECISION: keep

**REASON:** Research foundation complete. AIO docs accessible (152 PDFs + knowledge base). 8 canonical Catalyst patterns mapped. Test Hub footprint documented (14 routes, 19 pages, 18 hooks). Scorecard 96 of 100, 0 hard fails. Proceeding to exp-002 page-by-page audit.

---

## Decision Rules

| Rule | Applied? |
|---|---|
| scorecard.md total >= 80 | yes — 96 of 100 |
| Zero hard fails in scorecard.md | yes — 0 hard fails |
| allowed-edit-surface.md filled before work started | yes — pre-filled |
| Screenshot provided (if UI build) | N/A — research experiment |

---

## What exp-002 Must Do

Exp-002 blocked on these open questions:
- Page-by-page audit of all 19 testhub pages (canonical components or parallel impls?)
- CaseDrawer audit (uses CatalystViewBase or custom parallel implementation?)
- CATY AI wiring audit (useAIGeneration connected to any UI button?)
- ActivityPanel wiring audit (present in CaseDrawer?)

Exp-002 scope: deep page/hook/component audit, no code changes.

---

## Human Approval

- [ ] Vikram reviewed and approved
- **Approved:** _pending_
