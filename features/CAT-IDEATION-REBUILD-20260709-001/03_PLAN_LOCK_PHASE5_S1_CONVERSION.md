# PLAN LOCK — Phase 5 Slice S1: Conversion (Approved → Business Request)

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ self-approved (goal directive) 2026-07-11 · **Timebox**: 2h

## Objective
The P0 "governed exit" (04 §C.8/§E): an approved idea converts to a real `business_requests` row, audited via `idn_conversions`, with `idn_ideas.workflow_status_key` advancing to `converted` and `converted_business_request_id`/`converted_at`/`converted_by` populated. Minimal UI: a "Convert to Business Request" action on the Detail page, visible when `workflow_status_key === 'approved'`.

## Non-scope
- **Full conversion wizard / AI-draft prefill** (04 §C.8's multi-step `ModalDialog` with guard-checklist rendering) — this slice does a direct, single-step conversion (title + problem statement → BR title + description). The wizard UX is its own larger slice.
- **Reusing `CreateBusinessRequestModal.tsx` directly** — checked its props (`isOpen/onClose/productId/onWorkTypeChange`, no prefill/initialValues input). Forcing prefill support into that shared, broadly-used component risks regressing every other caller — out of scope for a surgical change. This slice writes directly to `business_requests` instead (open INSERT RLS, matches the column set the modal itself would produce for a minimal BR).
- **Deep-link to the created BR** — the existing pattern (`/product-hub/${productCode}/backlog/${request_key}`) needs a resolved product code; `idea.product_id` is optional and may be null. Rather than construct a URL that could 404, this slice shows the created `request_key` as confirmation text only.
- **`converted → delivered` auto-close** (04 P1 item, "BR terminal → idea Delivered ≤5min") — needs a DB trigger on `business_requests.process_step` reaching terminal; a migration, correctly out of scope here.

## Known limitation (not silently hidden)
`idn_conversions` INSERT requires `idn_has_role(['approver','admin'])`; `business_requests` INSERT is open to any authenticated user (pre-existing policy, not ideation's to change). If a signed-in-but-non-approver user reaches this action (UI shows it to any approved user per the same RLS-is-the-backstop posture as S1's Decision UI) and the `idn_conversions` insert is denied, the mutation compensates by deleting the just-created `business_requests` row rather than leaving it orphaned — best-effort, not a real DB transaction (would need an RPC/migration for that, out of scope).

## Files to modify
- `src/hooks/useIdeationConvert.ts` (new) — the conversion mutation.
- `src/modules/ideation/pages/DetailPage.tsx` — Convert action, visible when `workflow_status_key === 'approved'`.

**Files forbidden**: `CreateBusinessRequestModal.tsx` (shared, broadly used — see non-scope), any migration.

## Data rules
- Zero-assumption: `description` on the created BR is only the idea's problem-statement plain text (already have `adfToPlainText` from S1's Inbox hook) — no fabricated fields.
- ADS tokens only.

## Validation
- [ ] `npx tsc --noEmit` clean · `npm run lint:colors` 0 hits
- [ ] Real DB proof on a real `approved` staging idea: `business_requests` row created with `source_idea_id` set, `idn_conversions` row created, `idn_ideas.workflow_status_key='converted'` + `converted_business_request_id`/`converted_at`/`converted_by` populated — all DB-verified after the click, not just UI-asserted
- [ ] Screenshot: Convert button on an approved idea, then the converted state

## Stop conditions
Any DB schema change needed → stop, re-plan.
