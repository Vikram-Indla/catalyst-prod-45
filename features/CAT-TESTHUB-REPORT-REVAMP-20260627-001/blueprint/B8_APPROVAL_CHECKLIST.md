# B8 — Approval Checklist (Phase-8 gate)

> Phase 8 (real wiring into product UI, beyond seed) is BLOCKED until every box is ticked by Vikram.

## Design approvals
- [x] B1 report taxonomy (11 groups) approved (D-008)
- [x] B2 scope model approved (D-008)
- [x] B3 coverage model approved (D-008)
- [x] B4 traceability model approved (D-008)
- [x] B5 governance rules approved (D-008)
- [x] B6 AI insight behavior approved (D-008)

## Data / contract approvals
- [ ] STATUS_MAPPING confirmed (In QA / Done / Ready per object)
- [ ] DATE_SOURCES confirmed (sprint/release/exec/defect dates)
- [ ] QA-team derivation rule (U-009) confirmed
- [ ] Coverage denominator confirmed (D-006 = stories) ✅ done

## Build approvals (per slice)
- [ ] Which route(s) to wire first (recommend: Coverage + Governance, Senaei BAU)
- [ ] Consent for any read-only views (B7 non-invasive)
- [ ] Consent for any upstream view-model edit (B7 invasive)
- [ ] Seed breadth decision (more projects vs Senaei-only)

## Gates (always)
- [ ] ADS tokens only, canonical components, JiraTable for lists
- [ ] Screenshot signoff per UI surface
- [ ] tsc + lint:colors:gate green
