# B4 — Traceability Model

> STATUS: 🟢 DRAFT. Bidirectional, on proven links.

## Trace-To (from test artifact → work item)
- tm_test_cases → tm_requirement_links (external_key) → ph_issues (story/epic/defect/incident).
- Resolves to the real work item; show issue_key, summary, status, type icon.

## Trace-From (from work item → test artifacts)
- Given ph_issues.issue_key → tm_requirement_links where external_key=issue_key → cases → runs → defects.
- Coverage chip (covered/uncovered), exec status chip, linked defects, related incidents.

## Many-to-many
- A case can link multiple work items; a story can have multiple cases. Show counts.

## UX surfaces (where to expose) — proposal, consent-gated (B7)
| Surface | Add |
|---|---|
| Story detail (ph_issues view) | Trace-From panel: coverage chip + linked cases + runs + defects |
| Epic/BR detail | rolled-up coverage + child story trace |
| Defect (QA Bug) detail | Trace-From: failed runs that produced it |
| Production Incident detail | Trace-From: related tests + missing-coverage flag |
| Test case detail (tm_*) | Trace-To: the story/epic it covers |

## Today's reality
Structurally proven; data exists only for the seeded Senaei BAU set (14 links). Broader seeding or real usage needed for full traceability.
