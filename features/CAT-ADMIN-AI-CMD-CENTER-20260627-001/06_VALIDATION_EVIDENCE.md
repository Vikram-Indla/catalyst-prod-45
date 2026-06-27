# 06 — Validation Evidence
## CAT-ADMIN-AI-CMD-CENTER-20260627-001

---

## TypeScript
```
npx tsc --noEmit → No errors found
```

## Lint
```
npm run lint -- src/components/admin/ai-assistant/ src/pages/admin/AiAccessPage.tsx
ESLint: No issues found
```
All 18 `no-restricted-imports` warnings fixed (moved @atlaskit/* → @/components/ads).
1 unused-expression error fixed (ternary inside Set.delete → if/else).

## ADS Color Scan
```
grep -rn "#[0-9A-Fa-f]{3,6}\|rgb(" src/components/admin/ai-assistant/
```
All matches are `var(--ds-*, #fallback)` — compliant. No bare hardcoded colors.

---

## Screenshot Checklist

| # | State | Result | Notes |
|---|-------|--------|-------|
| SS1 | Idle — empty timeline, commands panel | ✅ PASS | 3-col grid renders. Stats: 61 users, 26 roles, 32 perm groups, 5 depts (live DB data). Risk badges visible. Empty timeline shows "Ready for your command". Right panel shows "Action plan will appear here". |
| SS2 | All command categories expanded | 🔲 PENDING | Collapsed: Manage permissions, Reset passwords, Manage departments |
| SS3 | Plan card populated | 🔲 PENDING | Requires sending a command to AI |
| SS4 | Ambiguous user match | 🔲 PENDING | Send query with ambiguous user name |
| SS5 | High-risk confirmation modal | 🔲 PENDING | Requires High/Critical risk plan |
| SS6 | Execution progress strip | 🔲 PENDING | Requires confirming a plan |
| SS7 | Success result in timeline | 🔲 PENDING | After successful execution |
| SS8 | Failure + rollback in timeline | 🔲 PENDING | After failed execution |
| SS9 | Reset password selected + sent | 🔲 PENDING | Use reset password command |
| SS10 | Recent actions bar expanded | 🔲 PENDING | After completing operations |

SS1 confirmed live at: 2026-06-27. Dev server localhost:8080.

---

## P0 Bug Fixes Applied

### Bug 1 — Hardcoded `role: 'developer'` on invite
- **File**: `supabase/functions/ai-admin-assistant/index.ts`
- **Fix**: `role: (p.system_role as string) ?? 'user'` — uses AI-extracted param with safe fallback
- **Root cause**: 'developer' not in `app_role` enum; enum is `admin|program_manager|team_lead|user`

### Bug 2 — `assign_product_role` deleted ALL user roles
- **File**: `supabase/functions/ai-admin-assistant/index.ts`
- **Fix**: Idempotent check first; INSERT only (no DELETE); rollback tracks `added_role_id` not `prev_role_id`

### Bug 3 (rollback) — rollback for assign_product_role deleted all rows
- **Fix**: Split `assign_product_role` + `remove_from_role` rollback cases; delete specific row by `role_id`
