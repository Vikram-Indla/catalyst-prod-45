# 03 — Plan Lock

Feature Work ID: `CAT-ADMIN-AI-CMD-CENTER-20260627-001`
Status: **DRAFT — AWAITING VIKRAM APPROVAL**

> No implementation may begin until this Plan Lock is approved by Vikram.

---

## Objective

Redesign `/admin/ai-assistant` from blank chat → enterprise AI Admin Command Center.
Fix 2 P0 bugs in edge function in the same PR.

---

## Non-Scope

- No new route
- No second admin sidebar
- No second AdminLayout wrapper
- No i18n/RTL
- No other admin pages modified
- Backend plan_id hardening deferred to Phase 2
- No cross-page component changes

---

## Timebox

**2-hour slices, 3 slices planned:**

| Slice | Duration | Scope |
|---|---|---|
| Slice 1 — Types + Layout shell | 2h | Types file, page layout structure, header, stats strip |
| Slice 2 — Command library + Timeline + Plan panel | 2h | Left panel, center messages, right plan card |
| Slice 3 — Composer + Modal + Edge function fixes | 2h | Sticky composer, high-risk modal, 2 P0 bug fixes |

After each slice: screenshot evidence required before starting next slice.

---

## Canonical Components Selected

| Need | Component | Source |
|---|---|---|
| Page structure | CSS grid (`240px 1fr 300px`) | Custom (approved — no canonical 3-col exists) |
| Page header | Inline `<h1>` + `<p>` pattern | Admin page convention |
| Environment badge | `Lozenge` appearance="new" | `@/components/ads` |
| Safe mode badge | `Lozenge` appearance="moved" | `@/components/ads` |
| Stats strip cards | Custom pattern (adapted from SummaryMetricCards) | Local adaptation |
| Risk level badges | `Lozenge` (Low=success, Med=moved, High=removed, Critical=removed isBold) | `@/components/ads` |
| Step status | `StatusLozenge` (todo/inProgress/done) | `@/components/ads` |
| High-risk modal | `Modal`, `ModalHeader`, `ModalTitle`, `ModalBody`, `ModalFooter` | `@/components/ads` |
| Warning banners | `SectionMessage` appearance="warning" | `@/components/ads` |
| Input | `Textfield` (existing) | `@atlaskit/textfield` |
| Buttons | `Button` appearance="primary/subtle/danger" | `@/components/ads` |
| Spinner | `Spinner` size="small/medium" | `@/components/ads` |
| Empty state | `EmptyState` headingSize=2 | `@/components/ads` |
| Flag/toast | `Flag`/`FlagGroup` | `@/components/ads` |
| Recent actions table | `JiraTable` | `@/components/shared/JiraTable` |
| Execution steps | Custom step rows with StatusLozenge | Local (no stepper component) |
| Impacted table chips | `CatalystTag` | `@/components/ads` |

---

## Files to Create

```
src/components/admin/ai-assistant/
  aiAdminAssistant.types.ts         — all shared types (replaces types in hook)
  AiCommandHeader.tsx               — page header with badges
  AiAdminStatsStrip.tsx             — 4 metric cards
  AiCommandLibrary.tsx              — left panel: grouped command catalogue
  AiConversationTimeline.tsx        — center: structured message cards
  AiActionPlanPanel.tsx             — right: live action plan card
  AiExecutionProgress.tsx           — step-by-step progress tracker
  AiConfirmationModal.tsx           — high-risk confirmation modal
  AiRecentActions.tsx               — recent activity panel
  AiCommandComposer.tsx             — sticky bottom composer
```

---

## Files to Modify (minimal, surgical)

| File | Change | Lines estimate |
|---|---|---|
| `src/pages/admin/AiAccessPage.tsx` | Replace body with new 3-column layout using sub-components | Rewrite 387 → ~100 (thin orchestrator) |
| `src/hooks/useAdminAiAssistant.ts` | Extend types to include `plan_id`, `risk_level`, `affected_entities`, `current_state_snapshot` | +30 lines |
| `supabase/functions/ai-admin-assistant/index.ts` | Fix P0: hardcoded role + delete-all assign_product_role | ~15 lines changed |

---

## Files FORBIDDEN from modification

```
src/routes/FullAppRoutes.tsx
src/pages/admin/AdminSidebar.tsx
src/pages/admin/AdminLayout.tsx
src/pages/admin/AdminAccessPage.tsx
src/pages/admin/RolesAdminPage.tsx
src/pages/admin/PermissionsAdminPage.tsx
src/pages/admin/CapacityDepartments.tsx
Any file outside src/pages/admin/ and src/components/admin/ai-assistant/
  (except the edge function)
```

---

## UI/UX Rules

1. ADS tokens ONLY — no bare hex colors
2. No Tailwind color utilities (bg-slate-*, text-gray-*)
3. No second sidebar
4. No second AdminLayout wrapper
5. Sticky composer anchored inside center column (not page-fixed)
6. Dark mode works via `var(--ds-*)` token system — no extra code needed
7. Keyboard: Enter sends, Shift+Enter newline (composer), Tab navigates command library
8. All interactive elements have aria-label or visible text
9. Progress updates use `aria-live="polite"` region
10. Modal traps focus per ADS Modal behavior
11. Risk level: Low=Lozenge success, Medium=moved, High=removed, Critical=removed isBold

---

## Data / Backend Rules

1. `useApprovedProfiles()` for user count
2. `useProductRoles()` for role count
3. `useAllRolePermissions()` for permission group count + override count
4. `useCapacityDepartments()` (from capacity module) for department count
5. Supabase client direct query for recent 5 actions (from `email_log` or a new `admin_ai_audit_log` view — if no audit table, show last 5 messages from session only)
6. Edge function path unchanged: `functions.invoke('ai-admin-assistant', ...)`
7. Plan confirmation sends `{ plan_id, confirmed: true }` — plan_id is echoed back by server (add field to CommandPlan type)
8. Hook sends full plan as before (Phase 1) but type includes plan_id stub

---

## P0 Bug Fixes (edge function)

### Bug 1: Hardcoded invite role
**Current (line 237):**
```typescript
role: 'developer',
```
**Fix:**
```typescript
// app_role for system access level; product role assigned separately
role: (p.system_role as AppRole) ?? 'user',
```
Gemini prompt must be updated to distinguish `system_role` (app_role enum: admin/program_manager/team_lead/user) from `product_role_name` (product_roles.name).

### Bug 2: assign_product_role deletes all existing roles
**Current (lines 263-264):**
```typescript
await supabaseAdmin.from('user_product_roles').delete().eq('user_id', userId)
await supabaseAdmin.from('user_product_roles').insert({ user_id: userId, role_id: roleId })
```
**Fix:**
```typescript
// Only upsert; do NOT delete. Deduplication via unique constraint.
const { error } = await supabaseAdmin.from('user_product_roles').upsert(
  { user_id: userId, role_id: roleId },
  { onConflict: 'user_id,role_id', ignoreDuplicates: true }
)
// Rollback: delete this specific row (not all rows for user)
rollbackState.prev_role_entry = { user_id: userId, role_id: roleId };
```
Note: schema must have `UNIQUE(user_id, role_id)` on `user_product_roles` for this to work. If not, use INSERT with conflict ignore. Verify constraint first.

---

## Page Layout Spec

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: AI Admin Assistant  [Dev]  [Confirmation Required]  [Admin] │
├───────────┬─────────────────────────────────────────────┬────────────┤
│ STATS:    │ 61 Users  │  26 Roles  │  33 Perm Groups  │ 5 Depts    │
├───────────┴─────────────────────────────────────────────┴────────────┤
│ ┌─────────────────┐  ┌───────────────────────────┐  ┌────────────┐  │
│ │ COMMAND LIBRARY │  │ CONVERSATION TIMELINE     │  │ ACTION     │  │
│ │                 │  │                           │  │ PLAN       │  │
│ │ Invite users    │  │ [empty state: compact]    │  │            │  │
│ │ Assign roles    │  │                           │  │ No active  │  │
│ │ Manage perms    │  │                           │  │ plan       │  │
│ │ Reset passwords │  │                           │  │            │  │
│ │ Manage depts    │  │                           │  │            │  │
│ │                 │  ├───────────────────────────┤  │            │  │
│ │                 │  │ COMPOSER (sticky bottom)  │  │            │  │
│ └─────────────────┘  └───────────────────────────┘  └────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│ RECENT ACTIONS (collapsible)                                         │
└─────────────────────────────────────────────────────────────────────┘
```

**CSS grid:** `grid-template-columns: 240px 1fr 300px`
**Gap:** 16px
**Height:** `calc(100vh - 200px)` (subtracts header + stats + recent)
**Overflow:** each column scrolls independently

---

## Integration / Wiring Rules

1. Stats strip: `useApprovedProfiles`, `useProductRoles`, `useAllRolePermissions`, `useCapacityDepartments`
2. Command library: static data (no API needed) — `aiAdminAssistant.types.ts` exports `COMMAND_CATALOG`
3. Timeline: reads `messages` from `useAdminAiAssistant()`
4. Plan panel: reads `pendingPlan` from hook, renders if present
5. Composer: calls `sendMessage()` and `confirmPlan()` from hook
6. Confirmation modal: opens when plan.risk_level ∈ { 'High', 'Critical' } OR plan.warnings.length > 0
7. Recent actions: last 5 assistant messages with `steps` field (from `messages` state, client-only in Phase 1)

---

## Screenshot Checklist (validation gate)

- [ ] S1: Idle command center — full 3-column, stats strip populated
- [ ] S2: Command library expanded with risk badges
- [ ] S3: "Add Vikram as Product Owner" plan card in right panel
- [ ] S4: Ambiguous user clarification card in timeline
- [ ] S5: High-risk permission modal open
- [ ] S6: Execution progress steps (7 deterministic steps)
- [ ] S7: Success result card
- [ ] S8: Failure + rollback result card
- [ ] S9: Reset password plan (no password shown)
- [ ] S10: Recent actions panel

---

## Validation Commands

```bash
# TypeScript check
npx tsc --noEmit

# Lint
npm run lint -- src/components/admin/ai-assistant/ src/pages/admin/AiAccessPage.tsx

# ADS color scan (no hardcoded hex)
grep -rn "#[0-9A-Fa-f]\{3,6\}\|rgb(" src/components/admin/ai-assistant/

# No second AdminLayout
grep -rn "AdminLayout" src/pages/admin/AiAccessPage.tsx
```

---

## Stop Conditions

- Stop if any validation command finds ADS violations
- Stop if layout breaks admin shell (screenshot required before commit)
- Stop if any hardcoded color added
- Stop if second sidebar appears
- Stop if edge function P0 bugs are NOT fixed before UI goes live

---

## Drift / Rebaseline Rules

If during execution the right panel layout proves too narrow at 300px, adjust to `300px → 320px`. Document in 08_DRIFT_LOG.md.

If `useCapacityDepartments` import path changes, update import and document.

If `upsert` on `user_product_roles` fails due to missing UNIQUE constraint, fallback to INSERT with explicit duplicate check before insert. Document in 09_DECISIONS.md.

---

## Parallel Execution Plan

Slice 1 (sequential, 1 agent):
1. Write `aiAdminAssistant.types.ts`
2. Write `AiCommandHeader.tsx`
3. Write `AiAdminStatsStrip.tsx`
4. Rewrite `AiAccessPage.tsx` shell (layout only, placeholders for other panels)

Slice 2 (3 agents in parallel):
- Agent A: `AiCommandLibrary.tsx`
- Agent B: `AiConversationTimeline.tsx`
- Agent C: `AiActionPlanPanel.tsx`

Slice 3 (sequential):
1. `AiCommandComposer.tsx`
2. `AiConfirmationModal.tsx`
3. `AiExecutionProgress.tsx`
4. `AiRecentActions.tsx`
5. Edge function P0 fixes

Wire all components into `AiAccessPage.tsx` after each slice.

---

## Approval

- [ ] Vikram reviewed and approved this Plan Lock
- [ ] Implementation started

**Implementation BLOCKED until Vikram approves.**
