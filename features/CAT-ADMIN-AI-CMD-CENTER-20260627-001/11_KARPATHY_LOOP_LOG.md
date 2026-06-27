# 11 — Karpathy Loop Log

Pattern: Hypothesis → Experiment → Measure → Keep/Discard → Log

---

## Loop 001 — Current state of AiAccessPage

**Hypothesis:** Page is a simple centered chat with no command context, action planning, or risk visibility.
**Experiment:** Read AiAccessPage.tsx (387 lines), useAdminAiAssistant.ts (137 lines).
**Measure:** Confirmed. Page is a `max-width: 800px` flex column with bubble messages, one textfield, one send button. No stats, no plan panel, no command library.
**Decision:** KEEP hypothesis. Full redesign required.
**Date:** 2026-06-27

## Loop 002 — Edge function P0 bugs

**Hypothesis:** Edge function has P0 bugs that would break the new UI even if the UI is perfect.
**Experiment:** Read supabase/functions/ai-admin-assistant/index.ts (541 lines).
**Measure:** Confirmed. Line 237: `role: 'developer'` hardcoded. Lines 263-264: DELETE + INSERT (destroys multi-role state). Admin check at 458-468 is imprecise.
**Decision:** KEEP hypothesis. Fix in same PR — UI + backend fixes bundled.
**Date:** 2026-06-27

## Loop 003 — 3-column layout in admin

**Hypothesis:** No 3-column layout exists in admin today, so we'll need custom CSS grid.
**Experiment:** Searched all admin page files for 3-column grid patterns.
**Measure:** Confirmed. Only 1-col and 2-col found. AdminOverview uses `repeat(auto-fill, minmax(280px, 1fr))`.
**Decision:** KEEP hypothesis. CSS grid with `grid-template-columns: 240px 1fr 300px` is the approach. Document as approved custom layout.
**Date:** 2026-06-27

## Loop 004 — Canonical components coverage check

**Hypothesis:** Atlaskit primitives cover 90%+ of what's needed; very few custom components required.
**Experiment:** Audited `src/components/ads/` exports + admin components.
**Measure:** Confirmed. Button, Lozenge, Modal, SectionMessage, Spinner, EmptyState, ProgressBar, Flag, JiraTable all exist. Only thing missing: "Action Plan Card" and "Command Library Panel" structures. Those are layout compositions, not new primitives.
**Decision:** KEEP hypothesis. Custom UI surface area is minimal.
**Date:** 2026-06-27

## Loop 005 — app_role vs product role type confusion

**Hypothesis:** The edge function confuses `app_role` (invite system role) with product role codes (e.g., 'developer' in product_roles.code).
**Experiment:** Checked Supabase types, user_invitations.role column, product_roles table data (26 rows).
**Measure:** Confirmed. `app_role` enum = { admin, program_manager, team_lead, user }. 'developer' does NOT exist in this enum. But there IS a product_role with code='developer' (DEVOPS row). Edge function incorrectly uses product role code as app_role.
**Decision:** KEEP hypothesis. Fix: invite should use `app_role` for system role, then separately call `assign_product_role` for the product role if specified.
**Date:** 2026-06-27
