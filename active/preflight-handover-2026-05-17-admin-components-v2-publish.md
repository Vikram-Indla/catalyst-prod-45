# Handover — /admin/components v2 (Publish + Apply + Reset)

**Owner:** Vikram
**Status:** 3 PRs open, sequenced; PR-1 must merge before PR-2; PR-2 before PR-3
**Date:** 2026-05-17

---

## The user's original question (verbatim)

> http://localhost:8080/admin/components — how do we ensure that we apply the tables and application by publishing the components, from here and it applies everywhere in catalyst and also can reset back. Once delivered provide me the application of this and their details?

## The answer (what v2 ships)

A three-layer mechanism that lets you change canonical component config from `/admin/components` and have it cascade to every consumer at runtime, with one-click rollback.

### Layer 1 — Storage (`component_config` table)

Two Supabase tables, applied live to `lmqwtldpfacrrlvdnmld`:

```
component_config
  component_id    TEXT PRIMARY KEY           -- 'jira-table', 'catalyst-status-pill', ...
  active_version  TEXT                       -- '1.4.0' or any semver
  feature_flags   JSONB                      -- { "enableStickyCreateFooter": true, ... }
  applied_at      TIMESTAMPTZ
  applied_by      UUID → auth.users
  notes           TEXT                       -- audit trail

component_config_history (append-only, trigger-populated)
  id, component_id, version, feature_flags, action, applied_at, applied_by, notes
  action IN ('publish','update','rollback','reset','delete')
```

RLS: authenticated users SELECT config (every component reads it); admin role required to write config + read/write history.

### Layer 2 — Runtime resolver (`useComponentConfig` hook)

Every canonical component imports this hook and reads its resolved config. Precedence:

```
1. caller prop                    (explicit consumer intent always wins)
2. component_config row           (the runtime publish)
3. registry default               (components.registry.ts)
```

Returns `{ activeVersion, flags, sources }` where `sources[flagName]` is `'prop' | 'runtime' | 'registry'`. In dev mode, every override is logged: `[components] jira-table v1.4.0 — overrides: enableStickyCreateFooter=true (runtime)`.

### Layer 3 — Admin UI (`/admin/components` Publish + History tabs)

**Publish tab:**
- Pick a canonical component from the dropdown
- See current published config vs registry defaults (badged with "Published v1.4.0" or "Registry default")
- Edit feature-flag toggles (changed flags get a blue background)
- Edit active version (semver textfield, validated by DB CHECK constraint)
- Add notes (audit trail — what Jira issue / why / rollout plan)
- **Publish** → UPSERT into `component_config` + history INSERT via trigger + react-query cache invalidated → every JiraTable consumer (or whichever canonical) re-renders with the new config on next mount
- **Reset to registry default** → DELETE the runtime row → falls back to registry defaults

**History tab:**
- Append-only log filtered by component or "All components"
- Columns: When · Component · Action (Publish/Update/Rollback/Reset) · Version · Notes · Rollback
- **Rollback** opens a **dry-run modal** showing:
  - Affected consumer count ("47 files import JiraTable")
  - Flag-by-flag diff (current → after rollback, with added/changed/removed badges)
  - Confirm/Cancel
- Confirming UPSERTs the historical row back into `component_config` → trigger writes a new history row with `action='rollback'`

---

## Application of this — what changes in Catalyst

**After PR-1 merges:**
- `/admin/components` has 6 tabs (Inventory, Banned, Violations, Cascade, **Publish**, **History**)
- Publishing has no visible effect yet because no canonical reads from `useComponentConfig`
- The schema is live; the admin can test the round-trip (publish → see in history → rollback) without affecting any rendered component

**After PR-2 merges (JiraTable wired):**
- Visit `/admin/components` → Publish tab → JiraTable → toggle `enableStickyCreateFooter` to true → Publish
- Open `/project-hub/BAU/backlog` → the sticky footer "What needs to be done?" row now appears, even though BacklogPage doesn't pass `enableStickyCreateFooter={true}` explicitly
- Open dev console → `[components] jira-table v1.4.0 — overrides: enableStickyCreateFooter=true (runtime)` is logged
- /admin/components → History → click Rollback on the publish row → dry-run shows the diff → Confirm → backlog footer disappears
- Same flow works for any of the 7+ JiraTable consumers: BacklogPage, StoryBacklogPage, RequestTable, ProductBacklogListTable, UWVTable, SubtasksPanel, IncidentListPage

**After PR-3 merges:**
- The registry is corrected (removed non-existent `enableBulkSelect` from JiraTable; actual prop is `selectable`)
- CANONICAL_COMPONENTS.md documents the publish/rollback protocol
- The remaining 9 canonicals stay on registry-default behavior until they get true publish-toggleable flags in v3 (CatalystViewBase's `fullPageMode` and CatalystKeyDetails's `showPriority` are consumer-contract markers, not runtime-toggleable — they describe what the call site needs to declare, not what an admin should flip)

---

## Three PRs (sequenced)

| # | PR | Branch | Status |
|---|---|---|---|
| 1 | [#177 v2 publish + rollback (PR-1 of 3)](https://github.com/Vikram-Indla/catalyst-prod-45/pull/177) | `feat/admin-components-v2-publish-rollback` | Open — needs merge first |
| 2 | [#178 JiraTable consumes useComponentConfig (PR-2 of 3)](https://github.com/Vikram-Indla/catalyst-prod-45/pull/178) | `feat/admin-components-v2-wire-jiratable` | Open — base = PR-1 |
| 3 | (this PR) Registry correction + CANONICAL_COMPONENTS.md update | `feat/admin-components-v2-wire-remaining` | Open — base = PR-2 |

Merge in order PR-1 → PR-2 → PR-3.

---

## Operational details for Vikram

### Example: making JiraTable show a sticky footer everywhere

1. Browse to `/admin/components` → **Publish** tab
2. Select "JiraTable (registry v1.4.0)"
3. The `enableStickyCreateFooter` row shows `Default: false`
4. Toggle to ON
5. Notes: `Trial sticky footer on all backlog surfaces — BAU-XXXX`
6. Click **Publish v1.4.0**
7. Toast confirms: `Published JiraTable v1.4.0`
8. Every JiraTable consumer that doesn't pass `enableStickyCreateFooter` as a prop now shows the footer

### Example: rolling back

1. `/admin/components` → **History** tab
2. Find the publish row from yesterday
3. Click **Rollback**
4. Modal shows: `1 flag will change. enableStickyCreateFooter: true → false (changed)`
5. Click **Confirm rollback**
6. Toast: `Rolled back jira-table to v1.4.0` (the version is the same; only the flag flipped)
7. New history row: `Action: Rollback` written by the trigger

### Example: pinning a specific version (no flag changes)

1. Publish tab → JiraTable → leave flags unchanged
2. Change "Active version" textfield from `1.4.0` to `1.5.0` (you bumped the registry yesterday)
3. Click Publish
4. Now `useComponentConfig` returns `activeVersion: '1.5.0'` even though the registry still says `1.4.0`

### Resetting completely

- Publish tab → click **Reset to registry default**
- DELETEs the `component_config` row entirely
- All consumers fall back to whatever the registry currently declares

### Who can do this

- READ on component_config: any authenticated user (every component needs to read its config at runtime)
- WRITE on component_config: admin role only (enforced by RLS)
- READ + WRITE on history: admin role only

---

## v3 candidate list (carried forward)

1. **Per-route scoping** — `enable on /backlog only, not on /allwork`. Use the existing `feature_flags.route` column.
2. **CI gate on registry drift** — fail PRs that mutate `components.registry.ts` without running `npm run scan:components`.
3. **ts-morph codemod path** — when a prop is renamed/removed in the registry, auto-rewrite consumers via codemod.
4. **Telemetry on override usage** — track which runtime overrides are actually exercising consumers in prod.
5. **Wire the remaining 9 canonicals** — most don't have publish-toggleable flags yet, but version pinning still has audit value. Cost: a hook call per consumer per render (JiraIssueTypeIcon renders ~1000× per backlog page).
6. **Storybook + Chromatic embed** — visual regression gate at component boundary.
7. **Banned-orphan-file CI linter** — block re-imports of permanently-banned components in PRs.

---

## Known limitations

- **Publish is global only.** No per-route scoping. v3 candidate #1.
- **`useComponentConfig` triggers a react-query fetch on first mount.** 5-min staleTime + shared cache across consumers, so the cost is once per session, not per-render. But cold-start latency adds <50ms before the first canonical component renders. Live measured on the JiraTable in PR-2.
- **The dev-mode logger fires once per resolver call.** In a 1000-row table, that's 1000 logs. Production builds skip the logger entirely (gated by `import.meta.env.DEV`).
- **Rollback works on flag-by-flag granularity, not on version-pinning history.** If you rolled back to a historical state with a different `active_version`, the trigger writes `action='rollback'` only when the new version sorts LESS than the old one. Otherwise it's `action='update'`. This is good enough for v2 — v3 may add explicit "this is a rollback" intent capture.

---

## Copy-paste block (next session first message)

```
Catalyst /admin/components v2 (publish + rollback) shipped across 3 sequenced PRs:
  PR #177 — schema + hook + Publish/History tabs (read-only, no consumer wiring)
  PR #178 — JiraTable wired to useComponentConfig (proof-point, 7+ consumers)
  PR #179 — registry correction + CANONICAL_COMPONENTS.md update (this branch)

Merge order: 177 → 178 → 179.

Schema applied live to lmqwtldpfacrrlvdnmld: component_config + component_config_history with RLS + audit trigger.

Runtime: every canonical that wires useComponentConfig('component-id', { ...props }) gets prop → runtime → registry-default resolution + dev-mode override logging.

Currently wired: JiraTable only. Remaining 9 canonicals deferred to v3 unless/until they have publish-toggleable flags (most don't — CatalystViewBase's fullPageMode is consumer-contract, not admin-toggleable).

Open work in v3: per-route scoping, CI gate on registry drift, ts-morph codemod, override-usage telemetry.

Handover: active/preflight-handover-2026-05-17-admin-components-v2-publish.md
```
