# Admin overhaul — critique of the brief, phased plan, risk register

Generated 2026-04-29 (re-created 2026-04-30 after branch wipe).

## Critique of the original brief (10 points)

1. **"Rebuild the whole admin in one sprint" was unrealistic.** The legacy
   tree has 35+ pages with non-trivial schemas. A clean-slate big-bang
   would freeze every other product workstream for weeks.
2. **Audit was missing from the original brief.** Without an audit trail,
   we can't reason about who changed which permission/role when something
   breaks. Phase 0 must ship audit.
3. **The brief assumed RLS was already correct.** It wasn't.
   `jira_auth_credentials` was unprotected — actual API tokens behind RLS = `false`.
4. **Feature flag gating was an afterthought.** Without the flag, we'd
   have shipped half-built sections to all admins. The flag at
   `admin_v2_enabled` lets us flip individual users in dev / staging.
5. **No clear contract for writes.** Every page free-handing supabase
   `.update()` is exactly how we got 12 orphan tables. `useAdminMutation`
   is the choke point that makes the audit trail reliable.
6. **The brief had no story for the orphan tables.** Renaming to `_zz_`
   for one sprint is reversible and surfaces real consumers (cron, RPCs).
7. **Tight Atlaskit coupling was a known foot-gun.** The brief did not
   specify whether direct `@atlaskit/*` imports were OK in admin v2.
   Locking down to `@/components/ads` via an ESLint hard-error per file
   removes the question.
8. **Bare hex literals would re-introduce theme drift.** Admin v2 is the
   next surface where dark mode will land; banning hex literals up front
   is cheaper than retrofitting.
9. **Raw `<button>` / `<input>` / `<select>` JSX would silently regress
   accessibility.** Atlaskit's primitives carry the focus rings, ARIA,
   and dark-theme contrast for free. Forcing the wrappers is a 10-minute
   rule that prevents months of bug reports.
10. **No clear story for the 18 dead pages.** Soft-delete to
    `src/_graveyard/admin/` (rather than `git rm`) keeps git blame
    intact and gives one sprint of observation before final removal.

## Four-phase plan

### Phase 0 — foundation (this sprint)

- Soft-delete 18 stale pages to `src/_graveyard/admin/`
- Soft-delete 3 orphan hooks to `src/_graveyard/hooks/admin/`
- Hard-delete `Users.tsx` (exact duplicate)
- Patch `FullAppRoutes.tsx`: remove 17 lazies + 18 routes
- Build `useAdminMutation` (writes through audit) + `useAdminV2Flag` (gate)
- Build `AdminV2Shell` (IA shell w/ side nav) + `AdminV2OverviewPage` + `AuditLogPage`
- Add `/admin/v2` route block (sibling of `/admin`)
- Patch `eslint.config.js` to enforce admin v2 wiring contract
- SQL bundle: RLS hardening (4 tables) + orphan rename (12 tables) + `admin_action_audit` table + `admin_v2_enabled` flag

### Phase 1 — work-items CRUD (this sprint, alongside Phase 0)

- 1a: Custom fields page (`/admin/v2/work-items/custom-fields`)
- 1b: Statuses page (`/admin/v2/work-items/statuses`) — collapses 3 legacy pages
- 1c: Work types page (`/admin/v2/work-items/types`)

### Phase 2 — workflows + screens + notifications (next sprint)

- Workflows: rebuild on top of `WorkflowAdminPage` schema, route to `/admin/v2/work-items/workflows`
- Screens: new schema `ph_screens` + `ph_screen_field_layouts`
- Notifications: collapse `NotificationTriggers.tsx` into v2

### Phase 3 — users / groups / roles / permissions (sprint after)

- Users list (collapses `UsersManagement` + `UserAccessPage`)
- Groups (new — currently no admin surface)
- Roles (collapses `RolesPermissions`)
- Permissions matrix

## Wiring contract (non-negotiable)

Every admin v2 page MUST satisfy:

1. Reads via Supabase client with RLS enforced (no service_role from client)
2. Writes via `useAdminMutation(table, action)` — auto-logs to `admin_action_audit`
3. 100% Atlaskit primitives via `@/components/ads` barrel — ESLint enforces
4. Colors via `var(--ds-*)` or `token()` — no hex literals (DB-stored hexes excepted with eslint-disable + reason)
5. Forms via `Textfield` / `Select` / `Checkbox` from `@/components/ads`
6. Page root has `data-testid="admin-v2/<section>/<page>"`
7. Uses `Modal` + `ModalHeader` + `ModalTitle` + `ModalBody` + `ModalFooter` for dialogs
8. Has loading state, empty state, error state
9. Reachable from the side nav in `AdminV2Shell.tsx` (flip `disabled: true` to enabled when shipping)
10. Audit reason captured in every create / update / delete form (Textfield, optional, max 500 chars)

## Risk register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Hidden consumers of "orphan" tables (cron, triggers, RPCs) | M | M | Rename to `_zz_` for one sprint instead of dropping. |
| RLS hardening breaks read paths in unrelated surfaces | L | H | Authenticated reads stay open on `custom_field_defs` and `admin_nav_modules`; only writes locked to admin/owner. |
| Branch wipes losing the work | M | H (re-occurred 2026-04-30) | Commit foundation files at the end of every turn; never leave the working tree dirty across `git checkout`. |
| `admin_action_audit` insert failure surfacing as mutation failure | L | M | `useAdminMutation` swallows audit insert errors with `console.warn`. Audit is observability, not gating. |
| Custom fields page deletes orphaning `custom_field_values` | L | M | Delete confirm modal warns explicitly that values are preserved but unreachable. |
| Status slug renamed orphans historical work items | L | M | Slug field is locked on edit. New slugs only on create. |
| `useAdminV2Flag` query failure flips the gate open | L | H | Hook returns `false` on error (fail-closed). Tested. |
| Direct `@atlaskit/*` imports leak in via auto-imports | M | L | ESLint at "error" severity for admin v2 paths catches in CI. |
