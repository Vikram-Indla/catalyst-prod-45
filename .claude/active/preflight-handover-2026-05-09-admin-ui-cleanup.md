# Admin UI Cleanup — Preflight Handover
**Date:** 2026-05-09
**Branch:** `claude/eloquent-vaughan-300353`
**Worktree:** `/Users/jahanarakhan/Documents/GitHub/catalyst-prod-45/.claude/worktrees/eloquent-vaughan-300353`
**Status:** ALL WAVES COMPLETE ✅

---

## Executive Summary

Complete ADS (Atlassian Design System) conversion of all `/admin/*` routes in the catalyst-prod-45 codebase. 8 commits, 0 TypeScript errors, 0 Tailwind color violations remaining across all registered admin route pages.

---

## Wave Progress (All Complete ✅)

| Wave | Description | Commit | Status |
|------|-------------|--------|--------|
| 0 | Dead wood: 18 dead sidebar links, 7 incident routes, /admin/v2 shell | `fd627bbbe` | ✅ |
| 1 | AdminSidebarV2 + AdminLayout full ADS conversion | `b6c35315f` | ✅ |
| 2 | AdminOverview: ADS conversion + 5 dead pocket-card links fixed | `8aed0f23c` | ✅ |
| 3 | Users & Access: 6 pages (RolesPermissions, CapacityDepts, ResourceAssignments, UserAccessPage, UsersManagement✓, JiraUserSync✓) | `1e5d88f48` | ✅ |
| 4 | General: ModulesPackages, NotificationTriggers, UserNotificationSettingsPage | `1d54e2c0d` | ✅ |
| 5 | Field Config: 9 pages (Programs, Portfolios, Departments, BusinessOwners, ThemeGroups, ProcessSteps, EpicStatuses, FeatureStatuses, ThemeStatuses) | `4ddff2e19` | ✅ |
| 6+8 | WorkHub (JiraActivitySyncPage) + FeatureFlagsPage | `6eed6ceff` | ✅ |
| 7 | WorkflowsAdminPage — already clean, no changes needed | — | ✅ |
| Sweep | Final cleanup: ResourceAssignments Select, UserAccessPage Select, JiraSyncAuditLog, WorkflowEditor | `8342234d8` | ✅ |

---

## Key Technical Decisions

### ADS Token Map (canonical for all admin pages)
```ts
const T = {
  surface:        'var(--ds-surface, #FFFFFF)',
  border:         'var(--ds-border, #DCDFE4)',
  borderLayout:   'var(--ds-border-layout, #EBECF0)',
  borderSelected: 'var(--ds-border-selected, #0C66E4)',
  text:           'var(--ds-text, #172B4D)',
  textSubtle:     'var(--ds-text-subtle, #44546F)',
  textSubtlest:   'var(--ds-text-subtlest, #626F86)',
  textBrand:      'var(--ds-text-brand, #0C66E4)',
  bgPage:         'var(--ds-background-accent-gray-subtlest, #F7F8F9)',
  bgNeutralHover: 'var(--ds-background-neutral-hovered, #F1F2F4)',
  bgBrandBold:    'var(--ds-background-brand-bold, #0C66E4)',
  bgDanger:       'var(--ds-background-danger-bold, #CA3521)',
  bgSelected:     'var(--ds-background-selected, #E9F2FF)',
  iconBrand:      'var(--ds-icon-brand, #0C66E4)',
  iconSubtle:     'var(--ds-icon-subtle, #44546F)',
}
```

### Component Replacement Map
| shadcn | ADS replacement |
|--------|----------------|
| `Button` from `@/components/ui/button` | `import Button from '@atlaskit/button/new'` |
| `Input` from `@/components/ui/input` | `import Textfield from '@atlaskit/textfield'` |
| `Switch` from `@/components/ui/switch` | `import Toggle from '@atlaskit/toggle'` |
| `Select/*` from `@/components/ui/select` | `import AdsSelect from '@atlaskit/select'` |
| `Card/*` from `@/components/ui/card` | Plain `<div>` with ADS token inline styles |
| `Label` from `@/components/ui/label` | Plain `<label>` with ADS font styles |
| `Separator` from `@/components/ui/separator` | `<hr>` with `borderTop: '1px solid var(--ds-border-layout)'` |
| `Collapsible/*` from `@/components/ui/collapsible` | State-driven `{open && ...}` + `onClick={() => setOpen(p => !p)}` |
| `Dialog/*` + `AlertDialog/*` | **KEPT as shadcn** (modal migration is a separate wave) |

### Hover Pattern (canonical)
```tsx
const [hoveredRow, setHoveredRow] = useState<string | null>(null);
// on row:
onMouseEnter={() => setHoveredRow(id)}
onMouseLeave={() => setHoveredRow(null)}
style={{ background: hoveredRow === id ? 'var(--ds-background-neutral-hovered, #F1F2F4)' : 'transparent' }}
```

### Dead Links Fixed in AdminOverview (Wave 2)
| Old path (dead) | Fixed path (registered) |
|-----------------|------------------------|
| `/admin/teams` | `/admin/departments` |
| `/admin/jira-config` | `/admin/workhub/jira-connection` |
| `/admin/activity` (audit card) | `/admin/workhub/sync-logs` |
| `/admin/security` | `/admin/roles-permissions` |
| "View all" → `/admin/activity` | `/admin/workhub/sync-logs` |

---

## What Remains (Future Waves)

1. **Dialog/AlertDialog migration** — All shadcn `Dialog` and `AlertDialog` usages in admin pages were intentionally kept for safety. A dedicated wave should migrate these to `@atlaskit/modal-dialog`.
2. **SVG BEFORE/AFTER screenshots** — Chrome MCP was not connected during this session; visual gates were not captured. Run these manually before merging to main.
3. **Regression tests** — Node 22 required for vitest 4. Run `npx vitest run` with Node 22 to verify.
4. **Push + PR** — gh CLI not installed; push manually.

---

## How to Push + PR

```bash
# Push the branch
git -C /Users/jahanarakhan/Documents/GitHub/catalyst-prod-45/.claude/worktrees/eloquent-vaughan-300353 push origin claude/eloquent-vaughan-300353

# Create PR (after push, open GitHub and create from branch)
# Or install gh CLI: brew install gh && gh auth login
# Then: gh pr create --title "fix(admin): full ADS conversion + dead link cleanup" --body "..."
```

---

## Sidebar Parity Test

The parity test at `src/components/admin/__tests__/admin-sidebar-parity.test.ts` verifies every sidebar path is in `REGISTERED_ADMIN_ROUTES`. Run:

```bash
npx vitest run src/components/admin/__tests__/admin-sidebar-parity.test.ts
```

---

## Vikram's Decisions (from Wave 0)
1. ✅ Delete all 18 dead sidebar entries — done
2. ✅ Delete all 7 incident routes — done (routes removed from FullAppRoutes.tsx; incident page files still exist but unreachable)
3. ✅ /admin/v2 shell is dead experiment → redirect all /admin/v2/* to /admin/overview — done