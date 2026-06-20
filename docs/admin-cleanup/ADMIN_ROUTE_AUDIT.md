# Admin Module Route Audit

**Scan Date:** 2026-06-20  
**Scanner:** Claude Code Phase -1 Discovery  
**Status:** BASELINE

---

## Executive Summary

**Total Admin Routes:** 27 (+ 1 KB admin redirect)  
**Active Destinations:** 3 primary endpoints  
**Deprecated/Redirect Routes:** 24 (legacy redirects)  
**Coverage:** WorkHub (Jira connection), general admin (/admin/access)

---

## Route Tree

### Primary Routes (Active)

| Path | Component | Status | Notes |
|------|-----------|--------|-------|
| `/admin` | AdminLayout | ✅ ACTIVE | Root admin container |
| `/admin/access` | AdminAccessPage | ✅ ACTIVE | User access control |
| `/admin/workhub/jira-connection` | (WorkHubAdmin) | ✅ ACTIVE | Jira connection config |

### Redirect Routes (Legacy/Deprecated)

**All routes below redirect to `/admin/access`:**
- `overview` → `/admin/access`
- `user-access` → `/admin/access`  
- `roles-permissions` → `/admin/access`
- `feature-flags` → `/admin/access`
- `resource-assignments` → `/admin/access`
- `settings/notifications` → `/admin/access`
- `notification-triggers` → `/admin/access`
- `components` → `/admin/access`
- `departments` → `/admin/access`
- `business-owners` → `/admin/access`

**Deprecated WorkHub routes (consolidate to `/admin/workhub/jira-connection`):**
- `workhub-connection` → `/admin/workhub/jira-connection`
- `workhub` → `/admin/workhub/jira-connection`
- `workhub/user-mapping` → `/admin/workhub/jira-connection`
- `jira-user-sync` → `/admin/workhub/jira-connection`
- `workhub/sync-logs` → `/admin/workhub/jira-connection`
- `workhub/jira-sync-control` → `/admin/workhub/jira-connection`
- `workhub/activity-sync` → `/admin/workhub/jira-connection`
- `workhub/*` (catch-all) → `/admin/workhub/jira-connection`

**Other redirects:**
- `/admin/v2/*` → `/admin/access`
- `/admin/governance` ← `/ads-validator`
- `/admin/resources` ← `/project-hub/resources` + `/project-hub/resources-v2`

---

## Classification

### KEEP (Active, no changes)
- `/admin` (root container)
- `/admin/access` (main access control page)
- `/admin/workhub/jira-connection` (Jira connection config)

### DEPRECATE (Remove after cleanup complete)
All legacy redirect routes listed above. Each should:
1. Be tested for inbound links (grep codebase)
2. Have a migration note in the deprecation plan
3. Remain as a redirect for 1-2 releases before hard removal

### PHASE 0+ (Future, not in scope yet)
- `/admin/work-hierarchy` (new hierarchy management page)
- `/admin/jira-sync` (new Jira sync governance page)

---

## Findings

**P0 Issues:**
- No direct route to hierarchy mapping (currently mounted but hard to find)
- WorkHub routes are scattered across multiple old paths (user-mapping, sync-logs, etc.) — all redirect to jira-connection but naming is confusing

**P1 Issues:**
- `AdminLayout` component path not documented in route
- No visible top-level "Design System Governance" admin entry point

**P2 Issues:**
- Many redirect routes create confusion — should hard-remove old aliases after deprecation period

---

## Next Steps

1. **Inventory:** Which routes are actually linked from sidebars/navs?
2. **Cleanup:** Remove redirect routes and update all inbound links
3. **New routes:** Add `/admin/work-hierarchy` and `/admin/jira-sync` after Phase -1 cleanup complete
