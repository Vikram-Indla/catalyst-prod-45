# Release Ops — Phase 8 Functional Proof

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 8 · 2026-07-06
**Method:** live Chrome MCP on localhost:8080 against seeded cyij.

## Demo data (cyij, staging only — re-runnable, not committed)
- Incident (INC-154, SEV3, Open) linked to CHG8841 via source_change_id + source_sop_step_id (a2 = Run DB migration) + source_release_id.
- Defect (DEF-RO-8841, critical) linked to CHG8841 via source_change_id + source_sop_step_id (a4 = Smoke test + validate) + source_release_id + environment.

## Proof matrix
| # | Proof | Result |
|---|---|---|
| 1 | Change Detail issue ledger empty state | educational empty state (incident-vs-defect guidance) when none |
| 2 | Raise Incident from Change Detail | opens the EXISTING global Create Incident modal (rich editor, Project/Release/Type, SEV1–4) |
| 3 | Raise Incident from SOP step | SopRunbook expanded step → Raise incident action (same launcher, source_sop_step_id) |
| 4 | Incident lineage preview | RaiseIssue writes source_release/change/sop_step + raised_during_change_execution post-create |
| 5 | Created incident on Change Detail | INC-154 SEV3 OPEN row in the ledger |
| 6 | Incident detail Release Ops context | source_* columns written → surfaced by Incident Hub |
| 7 | Raise Defect from SOP validation step | Raise defect on validation step → CreateStoryModal(QA Bug) |
| 8 | Defect lineage | tm_defects source_* written on onSuccess(issueKey) |
| 9 | Created defect on Change Detail | DEF-RO-8841 critical row in the ledger |
| 10 | SOP step linked incident/defect | step indicator "N issues" (severity toned) on a2/a4 |
| 11 | For You issue action/link | For You SOP card → "View change →" → ledger raise actions |
| 12 | Execution Calendar issue marker | deferred (documented); reads same source_* truth |
| 13 | Change Board issue marker | board card ⚠ issue count (incidents red) |
| 14 | Production event issue readiness | source_production_event_id present; PE-8841 summary on Change Detail |
| 15 | Broken lineage warning | empty state + open/critical counts surface missing data |
| 16 | No drawer | ledger inline; raise reuses existing modals (centered dialogs) |

## Reuse proof
Screenshot ss_5442mc7o2 shows the **existing global Create Incident modal** ("Create Incident — Log an operational incident…") launched from the Change Detail "Raise incident" button — not a rebuilt form. Defect path reuses CreateStoryModal(QA Bug). Lineage is written by RaiseIssue after creation.

## Cross-view consistency
Ledger, SOP step indicators, and board marker all read incidents/tm_defects by source_change_id / source_sop_step_id with shared query-key invalidation — counts agree (CHG8841: 1 incident + 1 defect everywhere).

## Build & gates
`tsc` clean · `npm run build` PASS (50s) · color clean · CRE/TestHub green · audit: typography 1469→1468 (down), spacing 0 (flat), only noisy tokens ratcheted 23710→23725.

## Notes
Reused global Create Incident modal requires Project+Release (intrinsic); lineage written regardless. Calendar/For-You issue-count badges deferred. Screenshot IDs in release-ops-screenshot-evidence.md.
