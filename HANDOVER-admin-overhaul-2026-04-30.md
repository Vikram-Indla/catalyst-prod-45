# HANDOVER — Admin overhaul Phase 0 + 1 (2026-04-30)

## What just happened

A branch switch (or branch reset) on `theme/phase-0-1-unblock` wiped uncommitted work from the previous session. Everything below was completed end-to-end with `tsc --noEmit` exit 0 and `eslint` exit 0 on the new admin v2 paths. None of it was committed. None of it remains in the working tree on the current branch.

Branch state at handover time:
- Current branch: `theme/phase-0-1-unblock`
- `feat/theme-tristate-toggle`: remote-only, does NOT have the admin work (it has the in-flight Create-modal cycle 6 work)
- No stashes, no commits referencing the admin overhaul
- Survivor: a stubbed `src/pages/admin/v2/work-items/WorkTypesPage.tsx` returning `null` (placeholder only — re-implement)

## What WAS shipped (and now needs re-doing)

### Phase 0 — cleanup + foundation (1 sprint of work, was complete)

#### A. Route soft-deletes (18 files moved to `src/_graveyard/admin/`, 35 lines deleted from `FullAppRoutes.tsx`)

Files to move out of `src/pages/admin/` (and `src/pages/KBAdminPage.tsx` and `src/components/admin/ModuleMatrixPage.tsx`):

```
Announcements.tsx
BusinessProcesses.tsx
CreateMenuConfig.tsx
DeliveryPlatforms.tsx
DetailsPanels.tsx
GeneralSettings.tsx
ImportData.tsx
KBAdminPage.tsx                        (in src/pages/, not src/pages/admin/)
ModuleMatrixPage.tsx                   (in src/components/admin/)
ResourceCountries.tsx
ResourceLocations.tsx
ResourceUtilization.tsx
ResourceVendors.tsx
RiskSeverityLevels.tsx
SlackIntegrationPage.tsx
Users.tsx                              (HARD-DELETE — duplicate of UsersManagement.tsx, zero imports)
WikiAdminPage.tsx
WikiDiagnosticPage.tsx
```

Routes to remove from `src/routes/FullAppRoutes.tsx` (17 lazy-import lines + 18 `<Route>` lines):
- `details-panels`, `module-matrix`, `create-menu-config`, `notion`, `announcements`
- `wiki`, `wiki-diagnostic`, `kb`, `kb/*`
- `business/DeliveryPlatforms`, `business/RiskSeverity`, `business-processes`
- `slack`, `software-licenses`
- `resource-utilization`, `resource-locations`, `resource-countries`, `resource-vendors`
- `general-settings`

Plus the `WikiAdminPage`, `WikiDiagnosticPage`, `KBAdminPage` block at lines 13-17 (wrapped in `ENABLE_AI` / `ENABLE_WIKI` guards).

#### B. Orphan-hook sweep (3 files moved to `src/_graveyard/hooks/admin/`)

These hooks had only the just-graveyarded resource pages as consumers:
- `src/hooks/admin/useResourceCountries.ts`
- `src/hooks/admin/useResourceLocations.ts`
- `src/hooks/admin/useResourceVendors.ts`

KEEP `src/hooks/admin/useJiraSyncConfig.ts` — still consumed by `JiraSyncControlPanel`.

#### C. SQL bundle — `RUN_THIS_IN_LOVABLE_admin_overhaul_phase0_rls.sql`

Idempotent. Run via Lovable's SQL runner. Sections:

**A. RLS hardening** for 4 tables — admin-only writes via `EXISTS … user_product_roles JOIN product_roles WHERE name IN ('admin','owner')`:
- `jira_auth_credentials` — CRITICAL (was unprotected API keys)
- `custom_field_defs` — admin write, authenticated read
- `admin_permission_audit` — admin select, admin insert
- `admin_nav_modules` — admin write, authenticated read

**B. Orphan rename** — 12 tables renamed to `_zz_<name>` for one-sprint observation:
```
disposable_email_domains, drawer_tab_configs, enterprise_grid_user_state,
feature_flag_audit, generation_events, generation_items,
home_migration_metrics, mask_rules, module_packages,
ph_hierarchy_overrides, project_sync_summary, template_workspaces
```
(NOT `jira_auth_credentials` — still in active use, just got RLS in section A.)

**C. New table `admin_action_audit`** for the useAdminMutation hook:
```sql
CREATE TABLE public.admin_action_audit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action          text NOT NULL,
  table_name      text NOT NULL,
  row_id          text NULL,
  before_state    jsonb NULL,
  after_state     jsonb NULL,
  reason          text NULL,
  ip_address      inet NULL,
  user_agent      text NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- 3 indexes on actor_id+created_at, table_name+created_at, created_at
-- RLS: select admin-only, insert WITH CHECK (actor_id = auth.uid())
-- GRANT SELECT, INSERT ON ... TO authenticated, anon, service_role, authenticator;
```

**D. Feature flag insert** (use the actual schema — `module_key + label + module_name + enabled + is_enabled`):
```sql
INSERT INTO public.feature_flags (
  module_key, label, module_name, description, category, status,
  enabled, is_enabled, route, group_name, icon_name, icon_color,
  sort_order, updated_by_name
) VALUES (
  'admin_v2_enabled', 'Admin v2', 'admin_v2',
  'Phase 0 — gates the /admin/v2 re-architected admin surface.',
  'admin', 'beta', false, false, '/admin/v2', 'admin', 'shield', '#0C66E4',
  0, 'system'
)
ON CONFLICT (module_key) DO NOTHING;
```
**The legacy `useFeatureFlag` hook is BROKEN** — it queries `flag_key` which doesn't exist in this table. Don't use it; build `useAdminV2Flag` (below) that queries `module_key`.

**E. PostgREST cache reload** via `COMMENT ON TABLE` DDL nudge + `NOTIFY pgrst, 'reload schema'` per CLAUDE.md L1b.

**F. Smoke verify** — five `SELECT` blocks the user pastes back to confirm: RLS enabled, orphans renamed, flag exists, policies installed, audit table queryable.

#### D. Foundation files

##### `src/hooks/admin/useAdminMutation.ts`

Single mutation wrapper. Every admin v2 write routes through this. Key behaviors:
- Snapshots `before_state` from `typedQuery(table).select('*').eq('id', rowId).maybeSingle()` (or null when `skipBeforeSnapshot: true` — for creates, or RLS-blocked tables)
- Calls the supplied `mutationFn(variables)`
- After success, reads `auth.getUser()` and inserts to `admin_action_audit` with `actor_id, action, table_name, row_id, before_state, after_state, reason, user_agent`
- Audit insert is wrapped in try/catch — observability, not gating
- Always invalidates `['admin', 'audit']` plus caller's `invalidate` list
- Wraps `useMutation` from `@tanstack/react-query`

Signature:
```ts
export interface AdminMutationContext<T = unknown> {
  action: 'create' | 'update' | 'delete' | 'toggle' | 'restore' | 'archive';
  table: string;
  rowId?: string | null;
  reason?: string;
  invalidate?: ReadonlyArray<readonly unknown[]>;
  skipBeforeSnapshot?: boolean;
}
export function useAdminMutation<TVariables, TResult>(
  context: AdminMutationContext<TResult>,
  mutationFn: (vars: TVariables) => Promise<TResult>,
  options?: ...
)
```

##### `src/hooks/admin/useAdminV2Flag.ts`

```ts
export function useAdminV2Flag(moduleKey: string): boolean {
  const { data } = useQuery({
    queryKey: ['admin-v2-flag', moduleKey],
    queryFn: async () => {
      const { data, error } = await typedQuery('feature_flags')
        .select('enabled, is_enabled')
        .eq('module_key', moduleKey)
        .maybeSingle();
      // ...
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
  if (!data) return false;
  return Boolean(data.enabled || data.is_enabled);
}
```

##### `src/pages/admin/v2/AdminV2Shell.tsx`

IA shell mirroring the Jira admin-settings screenshot. Side nav with 6 sections (System / Work items / Spaces / Users / Apps / Audit). Uses `useAdminV2Flag('admin_v2_enabled')` to gate; if false, renders `<EmptyState>` "Admin v2 is dark-launched". `<Outlet>` for child routes.

Imports ONLY from `@/components/ads` (Heading, EmptyState) and `react-router-dom`. Uses inline styles with `var(--ds-*, #FALLBACK)` patterns. NavLink children for enabled items, plain divs with `aria-disabled="true"` for disabled.

Nav items in this order (Audit's `Action log` is the only non-disabled in Phase 0):
- System: General, Security, Appearance, Announcements (all disabled)
- Work items: Work types, Workflows, Screens, Custom fields, Statuses, Notifications (all disabled in Phase 0; flip Custom fields, Statuses, Work types to enabled in 1a/b/c)
- Spaces: Portfolios, Programs, Products, Themes (all disabled)
- Users: List, Groups, Roles, Permissions (all disabled)
- Apps: Jira sync, Slack (all disabled)
- Audit: Action log (ENABLED — the Phase 0 page)

##### `src/pages/admin/v2/AdminV2OverviewPage.tsx`

Landing card. `Heading "Catalyst admin"` + `SectionMessage` explaining Phase 0. `data-testid="admin-v2/overview/page"`.

##### `src/pages/admin/v2/AuditLogPage.tsx`

Reads `admin_action_audit` ordered by `created_at DESC limit 100`. Renders a native `<table>` with columns: When, Action, Table, Row, Actor, Reason. Action column uses `<Lozenge>` with appearance map: `create→success, update→inprogress, delete→removed, archive→moved, toggle→new, restore→success`. Empty state, loading state, error state all handled. `data-testid="admin-v2/audit/page"`. queryKey `['admin', 'audit']`.

#### E. Routes wired into `src/routes/FullAppRoutes.tsx`

```tsx
// Lazy imports near other admin lazies (around line 290):
const AdminV2Shell = lazy(() => import("../pages/admin/v2/AdminV2Shell"));
const AdminV2Overview = lazy(() => import("../pages/admin/v2/AdminV2OverviewPage"));
const AdminV2AuditLog = lazy(() => import("../pages/admin/v2/AuditLogPage"));
const AdminV2CustomFields = lazy(() => import("../pages/admin/v2/work-items/CustomFieldsPage"));
const AdminV2Statuses = lazy(() => import("../pages/admin/v2/work-items/StatusesPage"));
const AdminV2WorkTypes = lazy(() => import("../pages/admin/v2/work-items/WorkTypesPage"));

// Route block — sibling of /admin (NOT child), so it has its own shell:
<Route path="/admin/v2" element={<S><AdminGuard><AdminV2Shell /></AdminGuard></S>}>
  <Route index element={<S><AdminV2Overview /></S>} />
  <Route path="audit" element={<S><AdminV2AuditLog /></S>} />
  <Route path="work-items/custom-fields" element={<S><AdminV2CustomFields /></S>} />
  <Route path="work-items/statuses" element={<S><AdminV2Statuses /></S>} />
  <Route path="work-items/types" element={<S><AdminV2WorkTypes /></S>} />
</Route>
```

#### F. ESLint rules added to `eslint.config.js`

1. `adsMigratedFiles` extended with:
```js
"src/pages/admin/v2/**/*.{ts,tsx}",
"src/components/admin/v2/**/*.{ts,tsx}",
"src/hooks/admin/useAdminMutation.{ts,tsx}",
"src/hooks/admin/useAdminV2*.{ts,tsx}",
```

2. New `adminV2Rules` block applied to admin v2 paths — bans (severity = error):
   - bare hex literals (`'#FFFFFF'`)
   - bare `rgb()` / `rgba()` literals
   - raw `<input>`, `<select>`, `<button>` JSX elements
   - direct supabase mutations: `.from(x).update/.delete/.insert/.upsert`

3. New config block at the end of `eslint.config.js`:
```js
{
  files: [
    "src/pages/admin/v2/**/*.{ts,tsx}",
    "src/components/admin/v2/**/*.{ts,tsx}",
    "src/hooks/admin/useAdminMutation.{ts,tsx}",
    "src/hooks/admin/useAdminV2*.{ts,tsx}",
  ],
  rules: { ...adminV2Rules },
},
```

### Phase 1a — Custom Fields CRUD page (was complete)

`src/pages/admin/v2/work-items/CustomFieldsPage.tsx` — ~480 lines. Full CRUD on `custom_field_defs`. Schema:
```
id, name, entity_type (text), field_type (enum: text|number|date|select|multi_select|boolean),
required, description, display_order, is_active, options_json, default_value, placeholder
```

Page anatomy:
- Filter Select at top: All work types | Story | Epic | Feature | Task | Subtask | QA Bug / Defect | Production Incident | Business Request
- Create button (top-right)
- Grouped table per entity_type with columns: Name, Type (Lozenge appearance map: text→default, number→inprogress, date→new, select|multi_select→success, boolean→moved), Required, Status (active/inactive), Description, Actions (Activate/Deactivate, Edit, Delete)
- Create + Edit modal — fields: name, entity_type (Select, locked on edit), field_type (Select, locked on edit), required (Checkbox), placeholder, description, options (textarea, only when type is select/multi_select), reason (audit log)
- Delete confirm modal with warning: "Field values stored in custom_field_values are not deleted. They become unreachable but remain in the database for recovery."

Every write through `useAdminMutation`. queryKey `['admin', 'custom-field-defs', entityFilter ?? 'ALL']`.

### Phase 1b — Statuses CRUD page (was complete)

`src/pages/admin/v2/work-items/StatusesPage.tsx` — ~510 lines. Collapses 3 legacy pages (`EpicStatuses`, `FeatureStatuses`, `ThemeStatuses`) into one. Schemas are identical:
```
id, value, label, color, is_active, sort_order, created_at, updated_at
```

Page anatomy:
- Top tab strip: Epic / Feature / Theme (toggles between `epic_statuses` / `feature_statuses` / `theme_statuses`)
- Toolbar: description + Create button
- Table: Order (sort_order), Preview (Lozenge with appearance from color → STATUS_COLORS map), Label, Slug, State (Active/Inactive), Actions
- Create + Edit modal: Label (auto-derives slug until user touches slug), Slug (locked on edit — orphan risk), Color picker (6 swatches mapped to Lozenge appearances: default/success/inprogress/removed/moved/new), Active checkbox, Reason
- Delete confirm with warning that historical items keep their status string

`STATUS_COLORS` palette is wrapped in `eslint-disable no-restricted-syntax` block — the hex values are DB-stored data, not styling literals.

The color swatch picker uses `<div role="button" tabIndex={0} onKeyDown>` instead of `<button>` — `<Button>` chrome would destroy the swatch grid.

### Phase 1c — Work types CRUD page (was in progress; ~95% done)

`src/pages/admin/v2/work-items/WorkTypesPage.tsx` — ~520 lines. Per-project CRUD on `ph_work_types`:
```
id, name, level, icon, color, position, is_enabled, project_id, created_at
```

Page anatomy:
- Project picker at top (Select, queries `projects` where `is_archived=false`)
- Auto-selects first project on load
- Create button (disabled until a project is selected)
- Table: Position, Name, Level (Lozenge), Icon (code), Color (chip + hex code), State (Enabled/Disabled), Actions
- Create + Edit modal: Name, Level (Select with 9 options: initiative→request), Icon (Select with 7 common slugs), Color (text + chip preview), Position (number), Enabled (Checkbox), Reason
- Delete confirm with warning that existing items keep their type reference

queryKey `['admin', 'work-types', 'list', effectiveProjectId]`.

LEVELS array: initiative, epic, feature, story, task, subtask, defect, incident, request.
ICON_OPTIONS array: epic, feature, story, task, subtask, bug, incident.

### Audit reports (also lost)

Three markdown files were saved to `audit/admin-overhaul-2026-04-29/`:

1. `01_admin_audit_kill_list.md` — 22-row route kill list + 13 orphan tables + RLS gaps
2. `02_ia_mapping_jira.md` — Catalyst → Jira IA crosswalk + proposed `/admin/v2` tree
3. `03_critique_and_phased_plan.md` — 10-point critique of the brief + 4-phase plan + wiring contract + risk register
4. `04_phase0_complete.md` — Phase 0 summary

These can be reconstructed from conversation history by next agent or the user.

## Recommended next-session plan

1. **Open the conversation transcript** for the original Phase 0 turn — every file's full source is there. Copy verbatim.
2. **Re-create files in this order** (dependency-aware):
   1. `src/hooks/admin/useAdminMutation.ts`
   2. `src/hooks/admin/useAdminV2Flag.ts`
   3. `src/pages/admin/v2/AdminV2Shell.tsx`
   4. `src/pages/admin/v2/AdminV2OverviewPage.tsx`
   5. `src/pages/admin/v2/AuditLogPage.tsx`
   6. `src/pages/admin/v2/work-items/CustomFieldsPage.tsx`
   7. `src/pages/admin/v2/work-items/StatusesPage.tsx`
   8. `src/pages/admin/v2/work-items/WorkTypesPage.tsx` (replace stub)
3. **Re-write `RUN_THIS_IN_LOVABLE_admin_overhaul_phase0_rls.sql`** at repo root.
4. **Patch `eslint.config.js`** — add `adminV2Rules` block + extend `adsMigratedFiles`.
5. **Patch `src/routes/FullAppRoutes.tsx`** — add 6 lazy imports + the `<Route path="/admin/v2">` block.
6. **Soft-delete the 18 stale routes** to `src/_graveyard/admin/` and remove their FullAppRoutes entries.
7. **Re-write the 3 audit markdowns** to `audit/admin-overhaul-2026-04-29/`.
8. **Run `tsc --noEmit`** + `eslint src/pages/admin/v2/**/*.tsx` — both must exit 0.
9. **CRITICAL: commit immediately** before any branch switch:
   ```bash
   git add -A
   git commit -m "feat(admin/v2): Phase 0 + Phase 1a-1c — re-creation after branch wipe"
   ```

## Critical context for next agent

1. **CLAUDE.md L1**: All Supabase work goes via Lovable's SQL runner. Generate `RUN_THIS_IN_LOVABLE_<topic>.sql` files at repo root. NEVER attempt direct DB connections.
2. **CLAUDE.md L1b**: PostgREST cache reload escalation ladder: `NOTIFY pgrst` → `COMMENT ON TABLE` DDL nudge → Lovable redeploy.
3. **`.git/index.lock` is held by host process** (likely GitHub Desktop). User must run `git add` / `git commit` from their host terminal.
4. **The Atlaskit/ADS contract** for admin v2: import only via `@/components/ads` barrel. Direct `@atlaskit/*` imports are blocked by ESLint at `error` severity in admin v2 paths.
5. **Stack**: Vite + React + TypeScript + Atlaskit + Supabase. ~40 `@atlaskit/*` deps already installed.
6. **No `<button>` JSX** in admin v2 — use `Button`/`IconButton` from `@/components/ads`. Exception: visual-first elements like color swatches → `<div role="button" tabIndex={0} onKeyDown>`.
7. **No bare hex literals** in admin v2 — use `var(--ds-*, #FALLBACK)`. Exception: DB-stored hex values (status colors, work-type colors) → wrap in `eslint-disable no-restricted-syntax` block with reason comment.

## Wiring contract (non-negotiable)

Every admin v2 page MUST satisfy:
1. Reads via Supabase client with RLS enforced (no service_role from client)
2. Writes via `useAdminMutation(table, action)` — auto-logs to `admin_action_audit`
3. 100% Atlaskit primitives via `@/components/ads` barrel — ESLint enforces
4. Colors via `var(--ds-*)` or `token()` — no hex literals (DB-stored hexes excepted)
5. Forms via `Textfield`, `Select`, `Checkbox` from `@/components/ads`
6. Page root has `data-testid="admin-v2/<section>/<page>"`
7. Uses `Modal` + `ModalHeader` + `ModalTitle` + `ModalBody` + `ModalFooter` for dialogs
8. Has loading state, empty state, error state
9. Reachable from the side nav in `AdminV2Shell.tsx` (flip its `disabled: true` to enabled when shipping)
10. Audit reason captured in every create/update/delete form (Textfield, optional, max 500 chars)
