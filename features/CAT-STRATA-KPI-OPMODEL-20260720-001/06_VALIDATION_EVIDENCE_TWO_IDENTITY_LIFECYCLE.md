# Two-identity Assignment lifecycle — staging proof (for Aiden)

Feature: **CAT-STRATA-KPI-OPMODEL-20260720-001** · Environment: **staging** `cyijbdeuehohvhnsywig`.
Not committed / not pushed / no PR / production untouched. Date 2026-07-22.

Two distinct authenticated identities, asserted via `request.jwt.claims` (the project's authenticated-E2E
idiom — `auth.uid()` and `strata_has_role` resolve to the real user + real granted roles), committed (not rolled back):
- **Maker** = Vikram Indla `6bbd0863-2736-42e0-aa9b-c98e946c6fd4` (strategy_office)
- **Checker** = Jahanara Khan `9537a670-b73e-4905-9835-b68085478cbc` (strategy_office, distinct)

## Chain of custody (each step through the real governed RPC)

| Step | Actor | RPC | Result |
|---|---|---|---|
| Classify KPI → project_outcome + KR-eligible | maker | `strata_classify_kpi` | usage_class=project_outcome, kr_eligible=true |
| Approve a target (Q2 FY2026) | maker | `strata_create_kpi_target` | target v1 approved |
| Assign approver = checker | maker | `strata_assign_kpi_approver` | assigned_approver=Jahanara |
| Submit KPI | maker | `strata_submit_record` | draft → pending_approval |
| **Approve KPI** | **checker** | `strata_approve_kpi` | approved (approver = assigned approver, ≠ creator); blockers `[]` |
| **Create + submit Assignment** | **maker** | `strata_create_kpi_assignment` + `strata_submit_kpi_assignment` | `KA-D0D522D2F4`, strategic, kr_eligible, scope=Objective, status=submitted, submitted_by=Vikram |
| **Approve Assignment** | **checker** | `strata_approve_kpi_assignment` | status=approved, approved_by=Jahanara — **distinct_maker_checker=true** (SoD passed with a genuinely different identity) |
| **Link Assignment → originating KR** | maker (strategy_office) | `strata_link_kr_assignment` | KR `E2E onboarding rate`.strategic_assignment_id = KA-D0D522D2F4 (KR editable — parent OKR draft; assignment approved + KR-eligible; KPI KR-eligible) |
| **Submit observation** (value 20, Q2 FY2026) | maker | `strata_submit_assignment_observation` | obs `debc84c6`, status=pending, submitted_by=Vikram |
| **Validate observation** | **checker** | `strata_validate_assignment_observation` | status=validated, validated_by=Jahanara — **distinct_submitter_validator=true** (2nd SoD boundary) |

## Official KPI-backed progress + reportability

`strata_kr_reportability('E2E onboarding rate')` →
```json
{"reportable": true, "kind": "assignment_backed", "label": "Reportable",
 "assignment_id": "d0d522d2…", "observation_id": "debc84c6…"}
```
`strata_okr_official_progress('J Theme-Owned OKR E2E')` → `reportable_krs: 1, excluded_krs: 0`.
The KR now contributes to official progress **only** because it is backed by an approved, KR-eligible
Strategic KPI Assignment with a validated observation — not a manual KR value.

## Provenance (all names, no UUIDs surfaced)

| Field | Value |
|---|---|
| Key Result | E2E onboarding rate |
| OKR | J Theme-Owned OKR E2E 20260719 |
| Objective | Digitize the End-to-End Investor Journey |
| Backing Assignment | KA-D0D522D2F4 (strategic, **approved**) |
| KPI Definition | CPQ quote cycle time reduction — **approved, KR-eligible** |
| Assignment submitted by → approved by | **Vikram Indla → Jahanara Khan** |
| Observation submitted by → validated by | **Vikram Indla → Jahanara Khan** |
| Observation | value 20, **validated** |

## SoD summary
- Assignment: submitter (Vikram) ≠ approver (Jahanara) — enforced, positive path proven; self-approve
  previously proven blocked (`OWNER_SOD_CONFLICT`).
- Observation: submitter (Vikram) ≠ validator (Jahanara) — enforced.

## KR-page provenance surfaced (Aiden condition #1 — FIXED)

The KR detail page's **Strategic KPI Assignment** panel now renders the **resolved Assignment
observation** the official value comes from, with full maker-checker provenance — previously only the
backing assignment key was shown, and the KR's own observation ledger (a different set) was ambiguous.

Change (UI-only, ADS-compliant): `StrataKrDetailPage.tsx` new `ResolvedAssignmentObservation`
component reads `assignmentObservations` + `strata_kr_reportability` (resolved `observation_id`), plus
`StrataKrReportability` type reconciled to include the `assignment_backed` variant (`assignment_id`,
`observation_id`). Live render on `/strata/krs/kr-a8d6c2e4a206`:

> Officially backed by **KA-D0D522D2F4** — official actuals come from this assignment's observations…
> Resolved assignment observation & provenance
> **20** `VALIDATED` `OFFICIAL SOURCE` · as of 22 Jul 2026 · **submitted by Vikram Indla · validated by Jahanara Khan**

Gates after change: `npm run build` ✅ (2m51s) · `lint:colors:changed:ci` ✅ · `audit:ads:gate` ✅
(no category above baseline) · full KPI/OKR guard suite ✅ 19/19 files, 125/125 tests.

## Aiden condition #2 — two actual signed-in browser sessions (BLOCKED on credentials)

The maker actions can be driven in the live browser as the signed-in Vikram session. Signing in as a
**second** real user (the checker) requires entering another person's credentials — which I will not do
(credential entry is a prohibited action, and the QA identities' passwords are vaulted, not available to
me). This must be completed by a human: open a second authenticated session as the checker (Jahanara or a
TEST approver) and perform the approve step through the UI. The server-side SoD + role enforcement it
would exercise is already proven at the RPC layer with two distinct real user IDs (above), and the UI
provenance now renders it.

## Staging residue (non-destructive governed test records, left in place)
- KPI `CPQ quote cycle time reduction` (cb9e7bd3) — approved, KR-eligible.
- Assignment `KA-D0D522D2F4` (d0d522d2) — approved, backing KR `E2E onboarding rate`.
- Observation `debc84c6` — validated.
On the draft OKR `J Theme-Owned OKR E2E 20260719`.
