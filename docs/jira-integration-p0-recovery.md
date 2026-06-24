# Jira Integration — P0 Recovery (architecture discovery + plan)

Route: `/admin/connections/jira` → `src/pages/admin/connections/JiraSyncPage.tsx`
Mounted under `<AdminLayout/>` (FullAppRoutes.tsx:953 `<Route path="/admin">`). Renders into the admin Outlet — no own shell.

## 1. Static/fake-data audit (Task 1)

Production route (`JiraSyncPage.tsx`) findings:
- **No** hardcoded `313` / `SYNCED` / `1 day ago`. Those values render from real `ph_issues`/health queries, but appear next to "Not configured" because **nothing is gated on a backend readiness state** → contradictory states.
- **Hardcoded constants `TYPE_MAP` / `STATUS_MAP` / `FIELD_MAP`** (lines 53/64/71) — violate §7–9 (must be DB-driven from metadata cache + Catalyst config).
- No mockup/fixture imports in the prod route (clean).
- `/connections/jira/mockup` (FullAppRoutes:956) — **not dev-guarded** (§1).

## 2. Existing infrastructure (reuse-first, CLAUDE.md P0)

### Edge functions (already deployed; staging via main push, prod via production push)
| Function | Purpose | Reuse for |
|---|---|---|
| `wh-test-connection` / `jira-test-connection` | test Jira auth (verified HTTP 200 on staging) | §3 Connection test |
| `wh-save-connection` | server-side encrypted credential save | §3 Configure |
| `jira-fetch-projects` | project discovery | §4 Metadata discovery |
| `wh-jira-bulk-sync` | proven paginated sync (POST /search/jql + fields + cursor) | §13 Full sync |
| `jira-manual-sync` | manual sync (hardened this session) | §12 dry-run / §13 incremental |
| `jira-refresh-data` | destructive refresh | §15 Refresh Data |
| `jira-webhook-receiver` / `wh-jira-webhook` | webhook receiver | §14 Webhook control |
| `jira-issue-type-resolver` | issue-type metadata | §4 type discovery |

### Tables
| Table | Role |
|---|---|
| `ph_jira_connection` | connection (singular, `.single()`) — status/site_url/accessible_projects/project_count |
| `jira_connections` | legacy plural connection table (empty — DO NOT USE) |
| `ph_jira_projects` | project cache: project_key/name/is_active/sync_config/last_synced_at |
| `ph_issues` | synced work items (source='jira') — natural key issue_key; NO jira_issue_id column |
| `jira_field_mappings` | field mappings (connection_id FK) |
| `jira_project_mappings` | project→target mappings |
| `jira_sync_mappings` | type/status mappings (environment-scoped) — from admin-module migration |
| `jira_project_sync_filters` | per-project filters — from admin-module migration |
| `jira_webhook_control` | webhook on/off per env — from admin-module migration |
| `jira_refresh_data_audit` | refresh audit — from admin-module migration |
| `ph_sync_log` | sync run history (started_at/status/sync_type/issues_upserted) |
| `ph_sync_health` / `ph_jira_sync_log` | health + jira-specific log |

### Environment
- Staging `cyijbdeuehohvhnsywig` (dev server target via `.env.development.local`).
- Prod `lmqwtldpfacrrlvdnmld` (connected, 2003 jira issues / 7 projects — verified via MCP).
- `resolveJiraEnvironment()` (src/lib/jira-integration/environmentResolver.ts) detects env from `VITE_SUPABASE_URL`.
- Edge functions detect env from `SUPABASE_URL` and never cross environments.

## 3. Gaps to close (sequenced)

1. **[done this session]** Sync pipeline made to actually write (hardened transform, POST+fields, dropped nonexistent column). `jira-manual-sync` returns `recordsAdded:100` on staging.
2. **[this increment]** Kill the Overview lie — gate every "synced/ready/mappings-complete" state on real connection status. Dev-guard `/mockup`.
3. Backend `validateJiraSyncReadiness` (§11) — single source of readiness, enforced server-side inside sync functions.
4. Discovery wiring (§4) — `jira-fetch-projects` → cache to `ph_jira_projects` + type/status/field caches.
5. DB-driven Type/Status/Field mapping tabs with CRUD (§7–9) — replace hardcoded constants.
6. Per-project filters CRUD (§6), Projects governance (§5).
7. Dry-run (§12), readiness-gated sync (§13), webhook control (§14), safe refresh (§15).
8. Schema tab from real schema (§10), Backup&Logs from real tables (§19).
9. Design audit (§18), full test pass (§21).

## Status log
- Connection pipeline verified working on staging (test-connection 200, manual-sync recordsAdded:100).
- This is a multi-increment recovery; no "done" claim until the route works as real software per §21.
