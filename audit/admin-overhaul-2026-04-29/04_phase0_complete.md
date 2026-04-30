# Admin overhaul — Phase 0 + 1 complete

Generated 2026-04-29 (re-created 2026-04-30 after branch wipe).

This is the rollup of what shipped in Phase 0 + Phase 1a/b/c. Use this as the handover into Phase 2.

## Files created

### Hooks

- `src/hooks/admin/useAdminMutation.ts` — single mutation wrapper. Snapshots `before_state`, runs the supplied `mutationFn`, then writes to `admin_action_audit` best-effort. Invalidates `['admin','audit']` plus the caller's keys.
- `src/hooks/admin/useAdminV2Flag.ts` — reads `feature_flags` by `module_key`, returns `enabled || is_enabled`. 5-minute staleTime. Fails closed on error.

### Pages — admin v2 surface

- `src/pages/admin/v2/AdminV2Shell.tsx` — IA shell with 6-section side nav (System / Work items / Spaces / Users / Apps / Audit). Gates on `useAdminV2Flag('admin_v2_enabled')`.
- `src/pages/admin/v2/AdminV2OverviewPage.tsx` — landing card. `data-testid="admin-v2/overview/page"`.
- `src/pages/admin/v2/AuditLogPage.tsx` — reads `admin_action_audit` DESC limit 100. Lozenge appearance map per action. `data-testid="admin-v2/audit/page"`.
- `src/pages/admin/v2/work-items/CustomFieldsPage.tsx` — Phase 1a CRUD on `custom_field_defs`. Filter by entity_type, grouped table, full create/edit/delete via `useAdminMutation`. Locks entity_type and field_type on edit. `data-testid="admin-v2/custom-fields/page"`.
- `src/pages/admin/v2/work-items/StatusesPage.tsx` — Phase 1b. Tabbed CRUD on `epic_statuses` / `feature_statuses` / `theme_statuses`. Color picker maps to Lozenge appearance. Slug locked on edit. `data-testid="admin-v2/statuses/page"`.
- `src/pages/admin/v2/work-items/WorkTypesPage.tsx` — Phase 1c. Per-project CRUD on `ph_work_types`. Auto-selects first project. `data-testid="admin-v2/work-types/page"`.

## Files moved to `src/_graveyard/`

### `src/_graveyard/admin/` (18)

```
Announcements.tsx
BusinessProcesses.tsx
CreateMenuConfig.tsx
DeliveryPlatforms.tsx
DetailsPanels.tsx
GeneralSettings.tsx
ImportData.tsx
KBAdminPage.tsx
ModuleMatrixPage.tsx
ResourceCountries.tsx
ResourceLocations.tsx
ResourceUtilization.tsx
ResourceVendors.tsx
RiskSeverityLevels.tsx
SlackIntegrationPage.tsx
Users.tsx                  (intended hard-delete; landed in graveyard due to host file lock)
WikiAdminPage.tsx
WikiDiagnosticPage.tsx
```

### `src/_graveyard/hooks/admin/` (3)

```
useResourceCountries.ts
useResourceLocations.ts
useResourceVendors.ts
```

`src/hooks/admin/useJiraSyncConfig.ts` was kept — still consumed by `JiraSyncControlPanel`.

## Files patched

### `src/routes/FullAppRoutes.tsx`

- Removed 18 lazy import lines (KBAdminPage, WikiAdminPage, WikiDiagnosticPage, DetailsPanels, GeneralSettings, Announcements, ModuleMatrixPage, ResourceLocationsPage, ResourceCountriesPage, ResourceVendorsPage, BusinessProcesses, ImportData, ResourceUtilizationPage, SlackIntegrationPage, CreateMenuConfig, DeliveryPlatforms, RiskSeverityLevels, SoftwareLicensesPage)
- Removed 19 `<Route>` lines (the 18 above plus the duplicate `kb` / `kb/*` routes that share a lazy)
- Added 6 lazy imports for admin v2 (`AdminV2Shell`, `AdminV2Overview`, `AdminV2AuditLog`, `AdminV2CustomFields`, `AdminV2Statuses`, `AdminV2WorkTypes`)
- Added a sibling `<Route path="/admin/v2">` block (5 routes inside) wrapped in `<AdminGuard>`

### `eslint.config.js`

- Extended `adsMigratedFiles` with admin v2 globs so direct `@atlaskit/*` imports become hard errors there
- Added `adminV2Rules` block: bare hex literals, `rgb()` / `rgba()` literals, raw `<input>` / `<select>` / `<button>` JSX, and direct supabase mutations are all `error` severity
- Bound `adminV2Rules` to `src/pages/admin/v2/**`, `src/components/admin/v2/**`, `src/hooks/admin/useAdminMutation.{ts,tsx}`, `src/hooks/admin/useAdminV2*.{ts,tsx}`

## Files written

- `RUN_THIS_IN_LOVABLE_admin_overhaul_phase0_rls.sql` — 6-section idempotent SQL bundle (RLS / orphan rename / audit table / feature flag / cache reload / smoke verify)

## Sanity gates

- `tsc --noEmit` exit 0 — verified at end of Phase 1c
- `eslint src/pages/admin/v2/**/*.tsx` exit 0 — verified at end of Phase 1c

## Operator runbook

1. **Pull this branch.**
2. **Open Lovable → SQL runner.** Paste the contents of `RUN_THIS_IN_LOVABLE_admin_overhaul_phase0_rls.sql` and run. Copy the section F output back to confirm the smoke verify passes.
3. **Flip the flag (per env)** via:
   ```sql
   UPDATE public.feature_flags
   SET enabled = true, is_enabled = true
   WHERE module_key = 'admin_v2_enabled';
   ```
   Currently dark-launched (default false) so you can ship the code without exposing the surface.
4. **Visit `/admin/v2`** as an admin/owner. The overview card should render. Side nav should highlight Audit + the three Work items pages as enabled; everything else is "Soon".
5. **Make a test edit** under Work items → Custom fields. Confirm the change appears at `/admin/v2/audit` within 30 seconds.

## Phase 2 hand-off

Next up:
- `/admin/v2/work-items/workflows` — rebuild on top of `WorkflowAdminPage` schema
- `/admin/v2/work-items/screens` — new tables `ph_screens` + `ph_screen_field_layouts`
- `/admin/v2/work-items/notifications` — collapse `NotificationTriggers.tsx`
