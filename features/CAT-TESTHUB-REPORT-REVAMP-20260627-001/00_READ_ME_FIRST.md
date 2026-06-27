# CAT-TESTHUB-REPORT-REVAMP-20260627-001 — READ ME FIRST

> **Iteration entry point.** Read this at the start of EVERY iteration.
> Defines the canonical read-order, the status board, and the hard stop gates.
> Discovery-first. Evidence-first. Zero-assumption. No code, no schema until Plan Lock + approvals.

---

## Feature Work ID
`CAT-TESTHUB-REPORT-REVAMP-20260627-001`

## One-line objective
Re-center Catalyst Test Hub reporting into a **management-grade testing command center** keyed on
Project / Release / Sprint / Product (Business Request) status, coverage, traceability, defects,
incidents, tester + team performance, governance mismatch, and factual AI insight — built
discovery-first with no schema change until approved.

## Relationship to the lab feature
- `CAT-TESTHUB-REPORTS-20260627-001` = **UI lab prototype** (Phase 4–7, seeded data, route `/testhub/reports-lab`). Keep it; do not delete.
- This feature = the **revamp** = discovery, ERD, taxonomy, business rules, upstream impact, Phase-8 wiring readiness. Bigger scope; governs the lab's next phase.

---

## CANONICAL READ-ORDER (every iteration, top to bottom)

| # | File | Why |
|---|---|---|
| 1 | `00_READ_ME_FIRST.md` (this) | Status board + gates |
| 2 | `01_OBJECTIVE.md` | What done looks like |
| 3 | `contract/QUESTIONS_QUEUE.md` | **Open questions blocking progress — answer first** |
| 4 | `contract/UNKNOWNS_REGISTER.md` | Tracked unknowns + who owns the answer |
| 5 | `contract/DECISION_LOG.md` | Already decided — don't re-litigate |
| 6 | `discovery/D0_DISCOVERY_INDEX.md` | Discovery completion map → jump to the live D-file |
| 7 | `03_PLAN_LOCK.md` | Whether execution is allowed |
| 8 | `07_HANDOVER.md` | Where last session stopped |
| 9 | `08_DRIFT_LOG.md` | Any drift from plan |
| 10 | `11_KARPATHY_LOOP_LOG.md` | Hypotheses tried + results |

Then open the specific `discovery/` or `blueprint/` file the current task touches.

---

## FOLDER MAP

```
CAT-TESTHUB-REPORT-REVAMP-20260627-001/
├── 00_READ_ME_FIRST.md          ← iteration entry (this file)
├── 01_OBJECTIVE.md              ← scope, acceptance, non-scope
├── 02_CANONICAL_DISCOVERY.md    ← canonical component/screen findings
├── 03_PLAN_LOCK.md              ← STOP gate; no code until APPROVED
├── 04_EXECUTION_LOG.md          ← what changed, when
├── 05_UI_UX_REVIEW.md           ← ADS + heuristic scoring
├── 06_VALIDATION_EVIDENCE.md    ← raw probe/test/DOM output
├── 07_HANDOVER.md               ← context handover between sessions
├── 08_DRIFT_LOG.md              ← drift + rebaseline
├── 09_DECISIONS.md              ← decision pointer (detail in contract/)
├── 10_SCREENSHOT_CHECKLIST.md   ← UI acceptance shots
├── 11_KARPATHY_LOOP_LOG.md      ← hypothesis→experiment→measure→keep/discard
├── 12_AGENT_OUTPUTS.md          ← parallel discovery agent results
│
├── discovery/   (CURRENT STATE — evidence only, no proposals)
│   ├── D0_DISCOVERY_INDEX.md     ← read first; status of D1–D16
│   ├── D1_REPORT_INVENTORY.md
│   ├── D2_ROUTE_COMPONENT_INVENTORY.md
│   ├── D3_TABLE_INVENTORY.md
│   ├── D4_TECHNICAL_ERD.md
│   ├── D5_FUNCTIONAL_ERD.md
│   ├── D6_DATA_FLOW.md
│   ├── D7_DUMMY_DATA_AUDIT.md
│   ├── D8_SPRINT_RELEASE_LINK_AUDIT.md
│   ├── D9_TEST_ARTIFACT_LINK_AUDIT.md
│   ├── D10_DEFECT_INCIDENT_LINK_AUDIT.md
│   ├── D11_COVERAGE_CAPABILITY_AUDIT.md
│   ├── D12_TRACEABILITY_CAPABILITY_AUDIT.md
│   ├── D13_PERSONAL_TEAM_REPORTING_AUDIT.md
│   ├── D14_GAP_LIST.md
│   ├── D15_CONTRADICTION_LIST.md
│   └── D16_DATA_QUALITY_RISKS.md
│
├── contract/   (ZERO-ASSUMPTION CO-BUILD GOVERNANCE — living registers)
│   ├── QUESTIONS_QUEUE.md        ← open questions (answer first)
│   ├── UNKNOWNS_REGISTER.md      ← every unknown + owner + status
│   ├── DECISION_LOG.md           ← id, question, answer, impact
│   ├── BUSINESS_RULES_100.md     ← 100 rules, validate/refute vs reality
│   ├── RELATIONSHIP_MAP.md       ← object→object links: proven / assumed / asked
│   ├── STATUS_MAPPING.md         ← every status → meaning (approval-gated)
│   ├── DATE_SOURCES.md           ← every date field → exact source
│   ├── FORMULAS.md               ← coverage/exec/risk formulas (approval-gated)
│   └── CONSENT_GATES.md          ← every invasive change needs logged consent
│
├── blueprint/  (PROPOSED — Phase 2/3, approval-gated, no build)
│   ├── B1_REPORT_TAXONOMY.md
│   ├── B2_SCOPE_MODEL.md
│   ├── B3_COVERAGE_MODEL.md
│   ├── B4_TRACEABILITY_MODEL.md
│   ├── B5_GOVERNANCE_MODEL.md
│   ├── B6_AI_INSIGHT_MODEL.md
│   ├── B7_UPSTREAM_IMPACT.md
│   └── B8_APPROVAL_CHECKLIST.md
│
├── evidence/   (screenshots, query dumps, DOM probes)
└── sessions/   (NNN_purpose.md per session)
```

---

## STATUS BOARD (update at the end of every iteration)

| Phase | Name | Status |
|---|---|---|
| 1 | Discovery (D1–D16) | 🟡 FIRST PASS (D1,D2,D3,D8,D9,D14,D16 done; D4/D5/D6/D7/D10–D13 pending) — BLOCKED on Q-001..Q-003 |
| 2 | Functional blueprint | 🔴 NOT STARTED |
| 3 | Report taxonomy redesign | 🔴 NOT STARTED |
| 4 | Upstream impact proposal | 🔴 NOT STARTED |
| 5 | Data model approval pack | 🔴 NOT STARTED |
| 6 | UI lab / prototype | 🟡 PARTIAL (lab feature exists) |
| 7 | User review + design approval | 🔴 NOT STARTED |
| 8 | Real wiring | ⛔ BLOCKED (gated on 1–7 approval) |

---

## HARD STOP GATES (never bypass)

1. **No schema change** (table/column/view/RPC/trigger/RLS) without a logged consent in `contract/CONSENT_GATES.md`.
2. **No production change.** Dev/staging-safe only.
3. **No assumption.** Unknown business meaning → `UNKNOWNS_REGISTER.md` + `QUESTIONS_QUEUE.md`, then stop and ask.
4. **No dummy data presented as real.** Mark seeded/mock everywhere.
5. **No upstream view-model change** (story/feature/defect/incident) without consent.
6. **No code before Plan Lock** is `APPROVED`.
7. **Phase 8 blocked** until `blueprint/B8_APPROVAL_CHECKLIST.md` fully ticked by user.
8. ADS tokens only, canonical components only, JiraTable for work-item lists.

---

## How to continue

```
continue feature CAT-TESTHUB-REPORT-REVAMP-20260627-001
```

## NEXT ACTION
Phase 1 discovery. Spawn parallel discovery agents, populate `discovery/D1–D16` from real Catalyst
evidence, log unknowns as they surface, then draft `03_PLAN_LOCK.md`. **Stop before any code.**
