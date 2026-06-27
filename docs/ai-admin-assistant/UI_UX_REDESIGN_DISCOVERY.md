# AI Admin Assistant — UI/UX Redesign Discovery

> Feature Work ID: `CAT-ADMIN-AI-CMD-CENTER-20260627-001`
> Date: 2026-06-27
> Author: Claude Code

---

## 1. Current State Analysis

### 1.1 Route & Files

| Asset | Path | Lines |
|---|---|---|
| Page | `src/pages/admin/AiAccessPage.tsx` | 387 |
| Hook | `src/hooks/useAdminAiAssistant.ts` | 137 |
| Edge function | `supabase/functions/ai-admin-assistant/index.ts` | 541 |
| Route | `/admin/ai-assistant` (lazy via `FullAppRoutes.tsx`) | — |

### 1.2 Current Page Visual State

- **Layout:** Centered flex column, 800px max-width, isolated from full admin width
- **Empty state:** Full-page centered "suggest commands" carousel dominates screen
- **Messages area:** Simple bubble chat — left (assistant), right (user), no structure
- **Input:** Single Atlaskit `Textfield` with Send button; no label/helper text
- **Status indicators:** Spinner inline, `Lozenge` for step status, `SectionMessage` warning when awaiting confirm
- **Header:** Plain title + subtitle + "New session" button
- **No:** command library, action plan panel, stats strip, recent activity, 3-column layout, environment badge, risk indicators

### 1.3 Current Hook State Machine

```
idle → loading → awaiting_confirm → executing → idle
              ↘ idle (if no plan returned)
```

### 1.4 Current Types (from hook)

```typescript
type AssistantStatus = 'idle' | 'loading' | 'awaiting_confirm' | 'executing'
type CommandStep = { id, label, action_type, params, rollback_label? }
type CommandPlan = { summary, steps: CommandStep[], warnings }
type StepResult = { id, label, status, error? }
type ChatMessage = { id, role, text, plan?, steps?, rolled_back? }
```

---

## 2. Edge Function Analysis

### 2.1 Tables Accessed

| Table | Operations |
|---|---|
| `user_roles` | SELECT (admin check) |
| `profiles` | SELECT (user count, lookup by email/name) |
| `product_roles` | SELECT, INSERT, UPDATE, DELETE |
| `user_product_roles` | SELECT, INSERT, DELETE |
| `product_role_permissions` | SELECT, INSERT, UPSERT, DELETE |

### 2.2 Edge Functions Called from Edge Function

| Function | Purpose |
|---|---|
| `user-invite-send` | Send invitation email |
| `user-delete` | Delete user account |
| `reset-user-password` | Trigger password reset link |

### 2.3 Supported Action Types (Phase 2 execution)

- `invite_user`
- `assign_product_role`
- `remove_from_role`
- `create_role`
- `update_permissions`
- `deactivate_role`
- `delete_user`
- `reset_password`

### 2.4 P0 Bugs Found

| Severity | Location | Bug |
|---|---|---|
| **CRITICAL** | `index.ts:237` | Hardcoded `role: 'developer'` on every invite regardless of plan step |
| **CRITICAL** | `index.ts:263-264` | `assign_product_role` DELETES existing role then inserts — destroys multi-role users |
| **MEDIUM** | `index.ts:458-468` | Admin check does `maybeSingle()` but doesn't assert `.role === 'admin'` explicitly |
| **MEDIUM** | `index.ts:305` | `create_role` always sets `scope: 'Product'` (hardcoded) |
| **LOW** | `index.ts:237` | No email format validation before calling `user-invite-send` |
| **LOW** | `index.ts:380` | `reset-user-password` — unclear if it receives `userId` or `email`; should be verified |

---

## 3. Admin Shell Architecture

### 3.1 Layout Chain

```
/admin → AdminLayout (flex column shell, just an Outlet)
  └── AdminSidebar (self-contained, stays mounted, NOT re-rendered per page)
  └── [page content] — each page owns its own content area
```

### 3.2 Critical Rules

- **NO second sidebar** on the redesigned page
- **NO second AdminLayout wrapper** — routes file warns explicitly
- Admin shell is `height: 100%`, `display: flex`, `flexDirection: column` — page content gets remaining height
- Sidebar is separate from page content; pages only control the main content div

### 3.3 Existing Page Layout Patterns

| Pattern | Example Pages | Width |
|---|---|---|
| Single full-width column | PermissionsAdminPage, CapacityDepartments | 100%, padding 24px 32px |
| 2-column sidebar + main | RolesAdminPage | 240px fixed left + flex right |
| Responsive auto-fill grid | AdminOverview (cards) | `repeat(auto-fill, minmax(280px, 1fr))` |
| 3-column | **NONE** in admin today | — |

---

## 4. Canonical Components Available

### 4.1 ADS Components (from `@/components/ads`)

| Component | Use in redesign |
|---|---|
| `Button`, `IconButton` | Send, Confirm, Cancel, command clicks |
| `Lozenge` | Risk level badges (Low/Medium/High/Critical) |
| `StatusLozenge` | Step status (todo/inProgress/done) — 3-colour guardrail only |
| `LegacyBadge` | Environment badge, safe mode badge |
| `Modal`, `ModalHeader`, `ModalTitle`, `ModalBody`, `ModalFooter` | High-risk confirmation modal |
| `SectionMessage` | Warning banners (awaiting_confirm, risk alerts) |
| `Spinner` | Loading states, resolving states |
| `EmptyState` | Compact idle state |
| `ProgressBar` | Execution progress |
| `Flag`, `FlagGroup` | Toast notifications |
| `Textfield` | Command composer input |
| `Avatar`, `AvatarGroup` | Recent actions actor display |
| `Tooltip` | Risk level tooltips, table action hints |
| `Heading` | Section headings |
| `CatalystTag` | Impacted table lozenges, permission group chips |

### 4.2 Admin Components (from `src/components/admin`)

| Component | Use in redesign |
|---|---|
| `AdminGuard` | Already wrapping page — keep |
| `RbacRolesTable` | May be referenced for role data display |

### 4.3 Shared Components

| Component | Use in redesign |
|---|---|
| `JiraTable` | Recent actions table |
| `Timeline` | Execution step timeline |

### 4.4 What Does NOT Exist (custom needed with proof)

| Need | Canonical candidate | Verdict |
|---|---|---|
| 3-column cockpit layout | CSS grid / flexbox (no canonical) | Custom allowed — pure CSS, no component |
| Command library panel | No canonical | Custom — documented below |
| Action plan panel | No canonical "plan card" | Custom — documented below |
| Metric cards strip | `SummaryMetricCards` in releases/ | Reuse pattern, adapt locally |
| Risk level indicator | `Lozenge` with risk-specific appearances | Use Lozenge — no new component needed |
| Execution stepper | `ProgressBar` + custom step rows | Custom step rows; ProgressBar for bar |

---

## 5. Design Token Reference

### 5.1 Token Object Pattern (used in all admin pages)

```tsx
const T = {
  text:              'var(--ds-text, #172B4D)',
  subtle:            'var(--ds-text-subtle, #44546F)',
  subtlest:          'var(--ds-text-subtlest, #626F86)',
  border:            'var(--ds-border, #DCDFE4)',
  borderSubtle:      'var(--ds-border-subtle, #EBECF0)',
  surface:           'var(--ds-surface, #FFFFFF)',
  surfaceSunken:     'var(--ds-surface-sunken, #F7F8F9)',
  surfaceRaised:     'var(--ds-surface-raised, #FFFFFF)',
  bgNeutral:         'var(--ds-background-neutral, #F1F2F4)',
  bgHover:           'var(--ds-background-neutral-hovered, #F1F2F4)',
  bgSelected:        'var(--ds-background-selected, #E9F2FF)',
  bgDanger:          'var(--ds-background-danger, #FFECEB)',
  bgSuccess:         'var(--ds-background-success, #DCFFF1)',
  bgWarning:         'var(--ds-background-warning, #FFF7D6)',
  textDanger:        'var(--ds-text-danger, #AE2A19)',
  textSuccess:       'var(--ds-text-success, #216E4E)',
  textWarning:       'var(--ds-text-warning, #974F0C)',
  textBrand:         'var(--ds-link, #0C66E4)',
  shadow:            'var(--ds-shadow-raised, 0 1px 4px rgba(9,30,66,0.14))',
};
```

### 5.2 Dark Mode

- Selector: `.dark` on `<html>` (ThemeProvider applies this)
- All `var(--ds-*)` tokens automatically adapt
- No page-level dark mode handling needed — use tokens only

### 5.3 Auth Role Enum (app_role)

```typescript
"admin" | "program_manager" | "team_lead" | "user"
// NOTE: 'developer' is NOT in this enum — P0 bug in edge function
```

### 5.4 Approval Status Enum

```typescript
"PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "DISABLED"
```

---

## 6. Identified Visual States to Implement

| # | State | Trigger |
|---|---|---|
| 1 | Idle command center | Page load, no messages |
| 2 | User entered command | Input focused/typed |
| 3 | AI resolving entities | Status = 'loading' |
| 4 | Ambiguous user clarification | AI response has clarification_needed |
| 5 | Missing scope clarification | AI response missing required fields |
| 6 | Ready for confirmation | Status = 'awaiting_confirm', plan present |
| 7 | High-risk confirmation modal | plan.warnings.length > 0 or risk = 'High'/'Critical' |
| 8 | Execution in progress | Status = 'executing' |
| 9 | Success | All steps status = 'success' |
| 10 | Partial success | Some steps failed, some succeeded |
| 11 | Failure | All steps failed, rolled_back = true |
| 12 | No permission | Edge function returns 403 |
| 13 | State changed before execution | Edge function returns 409 |
| 14 | Reset password flow | plan step type = 'reset_password' |
| 15 | Invite duplicate warning | plan.warnings contains pending invite |

---

## 7. UX Behavior Requirements

### 7.1 "Add Vikram as Product Owner" flow

```
1. Show plan card:
   - Intent: assign_product_role
   - Target: profile matching 'Vikram' (if ambiguous → clarification card)
   - Current state: current role(s) listed
   - Proposed: ADD Product Owner (not REPLACE)
   - Preserve: existing roles listed
   - Scope: ask if business_lines required by schema
2. Confirmation → execution → audit
3. NEVER delete existing roles unless "replace" explicitly stated
```

### 7.2 Permission change flow

```
1. Show affected user count from product_role_permissions
2. Mark risk = 'High' if > 10 users affected
3. Require modal confirmation (not just button)
4. Show before/after rows per permission group
```

### 7.3 Password reset flow

```
1. NEVER generate/display password
2. Show "will send reset link to email"
3. Confirm → calls reset-user-password (userId, not email)
```

### 7.4 Invitation flow

```
1. Validate email format
2. Check for existing profile (profiles.email)
3. Check for pending invite (user_invitations status='pending')
4. Resolve role from plan step params (NOT hardcode 'developer')
5. Show duplicate warning if pending invite found
```

---

## 8. Backend Safety Contract

```
Browser sends:   { message } → intent parse
Server returns:  { plan_id, plan } (no execution)

Browser sends:   { plan_id, confirmed: true }
Server does:
  1. Reload plan from store (or re-derive from plan_id)
  2. Re-check DB state vs plan's current_state snapshot
  3. If state changed → return 409 (ask admin to refresh)
  4. Execute allowlisted operations only
  5. Write audit record
  6. Return step results
```

**Current gap:** The hook sends the FULL plan object back for execution — the server should validate a `plan_id` instead. This is a Phase 2 backend hardening task. Phase 1 (UI redesign) can prepare the plan_id field.

---

## 9. File Change Plan

### 9.1 Files to CREATE

```
src/pages/admin/ai-assistant/
  AiAdminAssistantPage.tsx       — main page, replaces AiAccessPage.tsx
  AiCommandHeader.tsx             — top header with badges
  AiAdminStatsStrip.tsx           — 4 metric cards
  AiCommandLibrary.tsx            — left panel: command catalogue
  AiConversationTimeline.tsx      — center: message history
  AiActionPlanPanel.tsx           — right: live action plan
  AiExecutionProgress.tsx         — step-by-step progress tracker
  AiConfirmationModal.tsx         — high-risk modal
  AiRecentActions.tsx             — audit panel
  AiCommandComposer.tsx           — sticky bottom composer
  aiAdminAssistant.types.ts       — all shared types
```

### 9.2 Files to MODIFY (minimal)

```
src/pages/admin/AiAccessPage.tsx   — becomes a re-export to AiAdminAssistantPage
src/hooks/useAdminAiAssistant.ts   — extend types for new plan fields; add plan_id
supabase/functions/ai-admin-assistant/index.ts — fix P0 bugs only
```

### 9.3 Files FORBIDDEN from modification

```
src/routes/FullAppRoutes.tsx        — route stays as-is
src/pages/admin/AdminSidebar.tsx    — sidebar stays as-is
src/pages/admin/AdminLayout.tsx     — shell stays as-is
Any other admin page                — no cross-page changes
```

---

## 10. Risk Map

| Risk | Severity | Mitigation |
|---|---|---|
| Admin shell regression | P0 | No second sidebar; no AdminLayout wrapper in new page |
| Light mode regression | P0 | Use only `var(--ds-*)` tokens; no hardcoded colors |
| Edge function P0 bugs unfixed | P0 | Fix hardcoded role + delete-not-replace in same PR |
| Hand-rolled UI | P1 | Use canonical components; document all exceptions here |
| ADS token violation | P1 | Run ads-validator after each component |

---

## 11. Component File Decision

**Repo convention check:**
- All admin page components live directly in `src/pages/admin/` as single files
- No sub-folders exist for admin features (CapacityDepartments, RolesAdminPage are flat files)
- Exception: RBAC components live in `src/components/admin/rbac/`

**Decision:** Follow repo convention. Sub-components go in `src/components/admin/ai-assistant/`. Main page remains `src/pages/admin/AiAccessPage.tsx` (no route change needed).
