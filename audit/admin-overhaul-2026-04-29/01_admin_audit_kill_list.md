# Admin overhaul — kill list

Generated 2026-04-29 (re-created 2026-04-30 after branch wipe).
Surface audited: `/admin` route tree + `src/pages/admin/**` + `src/components/admin/**` + the four tables they touched.

## Routes / pages going to the graveyard (18)

Each line: file → route(s) it served → why it's leaving.

1. `Announcements.tsx` → `/admin/announcements` → never wired to consumers; placeholder content only.
2. `BusinessProcesses.tsx` → `/admin/business-processes` → superseded by Workflows; zero usage in the last 90 days of analytics.
3. `CreateMenuConfig.tsx` → `/admin/create-menu-config` → config moved into `module_packages` schema two phases ago; page is dead.
4. `DeliveryPlatforms.tsx` → `/admin/business/DeliveryPlatforms` → values now stamped on `projects.delivery_platform`; CRUD page redundant.
5. `DetailsPanels.tsx` → `/admin/details-panels` → replaced by `/admin/v2/work-items/custom-fields`.
6. `GeneralSettings.tsx` → `/admin/general-settings` → orphan; never had real settings to manage.
7. `ImportData.tsx` → `/admin/notion` → Notion importer was removed; page is a stub.
8. `KBAdminPage.tsx` (`src/pages/`) → `/admin/kb` + `/admin/kb/*` → KB admin moved into the AI plugin surface; old page is unreachable.
9. `ModuleMatrixPage.tsx` (`src/components/admin/`) → `/admin/module-matrix` → snapshot view for a one-off migration audit; obsolete.
10. `ResourceCountries.tsx` → `/admin/resource-countries` → Resource 360 owns this now.
11. `ResourceLocations.tsx` → `/admin/resource-locations` → Resource 360 owns this now.
12. `ResourceUtilization.tsx` → `/admin/resource-utilization` → utilization is computed in dashboards; this admin page has no writes.
13. `ResourceVendors.tsx` → `/admin/resource-vendors` → Resource 360 owns this now.
14. `RiskSeverityLevels.tsx` → `/admin/business/RiskSeverity` → severity values are now seed data; CRUD is unused.
15. `SlackIntegrationPage.tsx` → `/admin/slack` → Slack config is in the integrations panel; this older surface is duplicative.
16. `Users.tsx` (HARD-DELETE) → no route → exact duplicate of `UsersManagement.tsx`; zero imports.
17. `WikiAdminPage.tsx` → `/admin/wiki` → Wiki feature was removed; page is a stub.
18. `WikiDiagnosticPage.tsx` → `/admin/wiki-diagnostic` → ditto.

## Hooks going to the graveyard (3)

19. `useResourceCountries.ts` → consumed only by `ResourceCountries.tsx`.
20. `useResourceLocations.ts` → consumed only by `ResourceLocations.tsx`.
21. `useResourceVendors.ts` → consumed only by `ResourceVendors.tsx`.

KEEP `useJiraSyncConfig.ts` — still consumed by `JiraSyncControlPanel`.

## Tables flagged for orphan rename (12)

Renamed to `_zz_<name>` for one full sprint of observation. After 2 weeks
with no errors, drop. NOT included: `jira_auth_credentials` — still in use.

```
disposable_email_domains
drawer_tab_configs
enterprise_grid_user_state
feature_flag_audit
generation_events
generation_items
home_migration_metrics
mask_rules
module_packages
ph_hierarchy_overrides
project_sync_summary
template_workspaces
```

## RLS gaps

Found 4 admin-touched tables with weak or missing RLS:

- `jira_auth_credentials` — **CRITICAL**: API tokens stored unprotected. Hardened in Phase 0 SQL section A.1.
- `custom_field_defs` — anyone authenticated could write. Tightened to admin/owner only.
- `admin_permission_audit` — read open. Tightened to admin/owner only.
- `admin_nav_modules` — write open. Tightened to admin/owner only.

## What's leaving the side-nav

17 lazy imports + 18 `<Route>` lines removed from `src/routes/FullAppRoutes.tsx`. The `software-licenses` route was also removed (its lazy import is preserved elsewhere because the file lives in `modules/budget/` and may have other consumers).

The legacy admin tree at `/admin` keeps these still-live surfaces:
overview, modules-packages, user-access, users, roles-permissions, theme-groups, programs, portfolios, departments, capacity-departments, resource-assignments, jira-user-sync, business-owners, business/ProcessStep, business/EpicStatus, business/FeatureStatus, business/ThemeStatus, product-settings, incidents/*, workflows, workhub/*, notification-triggers, settings/notifications, feature-flags.

The new tree at `/admin/v2` ships in Phase 1 — see `02_ia_mapping_jira.md`.
