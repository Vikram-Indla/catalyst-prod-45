# Release Ops — Phase 7: Sign-off Visual + Emergency Override UX

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 7
**Date:** 2026-07-06 · **DB:** staging cyij · **Build:** `tsc` clean · `npm run build` PASS. No drawers. No migration (uses Phase 2 signoff/override schema).

## Files delivered
- `src/hooks/useSignoffGraph.ts` (new) — release→change→gate tree from `rh_release_signoffs` + `rh_change_signoffs` + `rh_change_release_links` + `rh_emergency_overrides`, plus a flat queue; unified `useSignoffAction` (approve/reject on the correct table by scope; reject requires comment), `useRequestSignoff` (duplicate-pending guard), `useRequestOverride`, `useDecideOverride`. All invalidate shared `release-hub` keys → cross-view consistency.
- `src/components/releasehub/signoff/SignoffDependencyGraph.tsx` (new) — interactive approval map; release/change/gate nodes, state colouring, override bypass badge, inline approve/reject.
- `src/components/releasehub/signoff/RequestSignoffModal.tsx` (new) — request a sign-off (scope/entity/role/approver/due/reason).
- `src/components/releasehub/signoff/EmergencyOverrideModal.tsx` (new) — request an emergency override (gate + reason; audited exception).
- `src/pages/releasehub/SignOffQueuePage.tsx` — rewritten: Visual/Table modes, 8 filters, search, request-sign-off, pending-override approvals.
- `src/pages/releasehub/ChangeDetailPage.tsx` — header actions "Request sign-off" + "Request override".

## Sign-off operating model (§2)
Two linked layers: **release-level** gates (`rh_release_signoffs`) and **change-level** gates (`rh_change_signoffs`). A release rolls up its own gates + its linked changes' gates — a release cannot look healthy while a linked change is rejected/overdue. Overrides never erase the gate; they appear as a distinct bypass path.

## Sign-off Queue (§3)
Visual + Table modes; filters: Pending / Overdue / Rejected / Approved / Release-level / Change-level / Emergency / Assigned-to-me; search; Request-sign-off; a pending **emergency-override-requests** panel with Approve/Reject (decision comment required). Table fallback lists every gate (scope, entity, role, approver, status/overdue) with inline approve/reject.

## Visual dependency model (§4)
Hierarchical approval map: **Release node** (rollup-coloured) → release-level gates + **Change nodes** → change-level gates → **Gate node** (role + approver avatar + state). Node states: Pending, Approved, Rejected (severe + reason), Overdue (urgent), Overridden, Skipped, Unassigned-approver. **Emergency override** renders as a dashed bypass badge, visually distinct from approval. Nodes expand inline (no drawer); release/change titles link to full detail; gate nodes carry inline Approve / Reject (reject → inline reason). Verified live: 8 July + Q3 Platform releases with OVERDUE/APPROVED release gates; CHG8841 expanded to 6 change gates (Pending/Approved/Overdue/Rejected-with-reason) + APPROVED override bypass.

## Release- & change-level sign-off UX (§5, §6)
Release gates visible in the queue graph + Release Detail; change gates in the queue, Change Detail (sign-off summary), and (rolled up) on the release. Both show role, approver, status, due, decision comment, and blocking impact. Production/high-risk changes surface gate state prominently; the Change Board's invalid-transition toast already cites the blocking sign-off via `validateChangeTransition`.

## Approve / reject (§7)
`useSignoffAction` writes `status`, `actioned_by`, `actioned_at`, `decided_at`, `comment` to the scope's table. Approve = optional comment; **reject requires a comment** (enforced). Approver identity comes from the authenticated user (no faked authorization — `canManage` gates the action buttons; unassigned approver is shown, not invented). Updates invalidate the shared keys so queue/detail/board/timeline agree immediately.

## Request sign-off (§8)
Manager picks scope + entity + required role (+ optional approver, due, note). Requires entity + role. **Duplicate pending gate for the same scope/role is rejected**. New gate appears in the queue and every roll-up.

## Emergency override (§9)
Request captures scope, change/release ref, bypassed gate, reason (mandatory) → `status: requested`. Product Owner / Admin approves or rejects from the queue with a mandatory decision comment; approval also flags the change (`is_emergency_override`, `override_approver_id`) for marker consistency. The **original gate is never removed** — the override is an auditable bypass shown everywhere (graph badge, Change Detail marker, board/timeline/For You). Verified live: a requested override on CAT-CHG-21 in the queue's approval panel + an approved override bypass badge under CHG8841.

## Overdue & blocked (§10)
Overdue = pending + due date passed → red state + queue filter. Blocking gates (pending/rejected required) drive the release/change rollup colour and the graph. Verified: OVERDUE gates on both releases and inside CHG8841.

## Cross-view consistency (§11)
All sign-off/override reads and writes hit the same `rh_*_signoffs` / `rh_emergency_overrides` rows with shared React-Query invalidation. Approving in the queue updates Change Detail's sign-off summary, the board's transition validation, the timeline's markers, and For You prompts — one source of truth.

## Empty / broken states (§12)
No sign-offs (educational graph empty state), no gates on a change ("No approvers required"), unassigned approver (flagged, not faked), no due date ("No due date"), rejected-with-reason, override reason mandatory, changes-not-linked-to-release grouped separately. No blank queue.

## Deferred to Phase 8+
Incident creation modal, defect creation flow, production event replay, training/admin manuals; plus release-level override request from Release Detail, and per-approver authorization rules (current UI gates on `canManage` and shows approver identity honestly).

## ADS compliance
Canonical only (ads/Modal, ads/SectionMessage, CatalystAvatar, @atlaskit select/textarea/textfield/button). Zero bare colors (grep clean); zero new INVALID_SPACING. No drawers — graph is inline expansion; actions are inline or centered ads/Modal.
