

## Three Targeted Fixes — Defects Module

### FIX 1 — DefectTable.tsx: Jira key display in KEY column
**File:** `src/components/defects/g25/DefectTable.tsx`, line 54

Replace the simple `{d.defect_key}` span with conditional logic:
- If `d.jira_source && d.jira_key`: show Jira icon + linked jira_key as primary, defect_key as secondary smaller text
- Otherwise: show defect_key as before

The `Defect` type already includes `jira_key`, `jira_source`, and `external_url` — no type changes needed.

### FIX 2 — useDefects.ts: Add jira_key to search filter
**File:** `src/hooks/test-management/useDefects.ts`, line 164

Append `,jira_key.ilike.%${filters.search}%` to the existing `.or()` string so searching "BAU-001" finds Jira-sourced defects.

### FIX 3 — DefectFilters.tsx: Update search placeholder
**File:** `src/components/defects/g25/DefectFilters.tsx`, line 20

Change placeholder from `"Search defects..."` to `"Search by title, key, Jira ID..."`.

### Files touched (3 only)
- `src/components/defects/g25/DefectTable.tsx`
- `src/hooks/test-management/useDefects.ts`
- `src/components/defects/g25/DefectFilters.tsx`

### Verification
After changes, read back the three modified sections to confirm correctness.

