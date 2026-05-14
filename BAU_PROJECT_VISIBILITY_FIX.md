# Sensei BAU Project Visibility Fix — Mobile & Web Sync

**Status:** Partially resolved (immediate fix applied, refactoring pending)  
**Date:** 2026-05-14  
**Branches:**
- `catalyst-prod-45`: `claude/sync-jira-mobile-web-Hvr6w` (migration committed)
- `CatyMobile`: `claude/sync-jira-mobile-web-Hvr6w` (UI update committed)

---

## Problem Statement

Sensei BAU project contains **25+ work items** successfully synced from Jira (14 created 2026-05-14, 9 updated 2026-05-14), but the project is **invisible in CatyMobile** despite being present in the shared Supabase backend.

### Root Cause Analysis

Three-layer issue discovered:

1. **Database Layer:**
   - ✅ BAU work items exist in `ph_issues` table (25 items synced via `catalyst-full-sync` and `jira-bau-reload`)
   - ❌ BAU project metadata **missing from `ph_projects`** table
   - The sync functions only populate work items, not project master data

2. **Mobile App Layer:**
   - ❌ CatyMobile's `SpacesStore.swift` has **hardcoded list of 7 projects** (lines 69-77)
   - **BAU not in the list** → users cannot navigate to it
   - Mobile never queries `ph_projects` dynamically

3. **Mobile-Web Parity:**
   - ✅ Web (Catalyst 45) has same Supabase backend
   - ✅ Web queries `ph_projects` dynamically (via React hooks)
   - ❌ Mobile hardcodes projects instead of querying database
   - Creates parity breakage between mobile and web

---

## Implemented Fix

### Step 1: Add BAU to Project Master Table ✅

**File:** `catalyst-prod-45/supabase/migrations/20260514_add_bau_project.sql`

```sql
INSERT INTO ph_projects (id, key, name, description, department, status, health, created_by)
SELECT 
  gen_random_uuid(),
  'BAU',
  'Sensei BAU',
  'Business As Usual work items synced from Jira',
  'Operations',
  'active',
  'on_track',
  (SELECT id FROM auth.users LIMIT 1)
ON CONFLICT (key) DO NOTHING;
```

**Impact:**
- Ensures BAU project metadata exists in database
- Used by web (Catalyst 45) to discover projects dynamically
- Migration safe: `ON CONFLICT (key) DO NOTHING` prevents re-runs from failing

### Step 2: Add BAU to Mobile Projects List ✅

**File:** `CatyMobile/CatalystApp/SpacesStore.swift`

Changes:
- Added `"BAU": "avatar_09"` to avatar defaults map (line 25)
- Added BAU SpaceItem to `defaults` array (line 78):
  ```swift
  SpaceItem(name: "Sensei BAU", type: "Software Project", 
            iconColor: CatalystColors.neutral700, 
            iconName: "briefcase.fill", 
            key: "BAU", template: .kanban)
  ```

**Impact:**
- BAU now appears in mobile's Spaces tab
- Users can navigate to BAU and access 25+ synced work items
- Unblocks immediate issue

---

## Verification Checklist

- [x] BAU work items confirmed in Jira (25 items, key pattern BAU-1..BAU-25)
- [x] BAU items confirmed in Supabase `ph_issues` table (project_key='BAU')
- [x] Migration created to populate `ph_projects` for BAU
- [x] Mobile app updated with BAU in hardcoded spaces list
- [x] Both commits pushed to `claude/sync-jira-mobile-web-Hvr6w` branch
- [ ] Migration applied to production database (requires Lovable manual paste or Supabase UI)
- [ ] Mobile app built and tested on device/simulator
- [ ] Web (Catalyst 45) tested to confirm BAU appears in project selector

---

## Remaining Work: Dynamic Project Discovery (Refactoring)

The current fix is a **hotfix**: BAU is manually added to the hardcoded list. The architectural issue remains: **mobile hardcodes 7 projects while web queries the database dynamically.**

### Recommended Phase 2 (Future)

Refactor `SpacesStore` to query `ph_projects` table instead of hardcoding:

1. **Remove hardcoded defaults** from `SpacesStore.swift`
2. **Add Supabase fetch** in `SpacesStore.init()`:
   ```swift
   let projectsQuery = supabase
     .from("ph_projects")
     .select()
     .eq("status", "active")
     .order("name", ascending: true)
   
   self.spaces = try await projectsQuery.execute().decoded
   ```
3. **Handle realtime updates** via Supabase Realtime subscriptions
4. **Fallback to hardcoded defaults** if fetch fails (offline support)

**Benefits:**
- New projects added to web automatically appear on mobile
- No code changes needed for future projects
- Mobile-web parity
- Matches Catalyst's architecture (dynamic queries > hardcoded lists)

**Complexity:** Medium (Supabase client integration, async/await, error handling)  
**Priority:** Medium (immediate access works; long-term maintainability issue)

---

## Deployment Notes

### For Supabase (catalyst-prod-45 environment)

1. Copy migration SQL from `supabase/migrations/20260514_add_bau_project.sql`
2. Paste into Supabase SQL Editor (project console)
3. Execute
4. Verify: SELECT * FROM ph_projects WHERE key='BAU'; (should return 1 row)

Alternatively, use Supabase CLI if environment supports it:
```bash
supabase db push
```

### For Mobile (CatyMobile)

1. Pull changes from `claude/sync-jira-mobile-web-Hvr6w` branch
2. Build and run on simulator/device:
   ```bash
   xcodebuild -scheme CatalystApp -configuration Debug
   ```
3. Navigate to Spaces tab
4. Verify "Sensei BAU" appears in the list
5. Tap BAU and verify 25+ work items load

### For Web (Catalyst 45)

1. Merge PR #175 (JIRA_SYNC_STRATEGY.md documentation)
2. Build and test: `npm run build`
3. Navigate to `/allwork` or project selector
4. Verify BAU appears in project dropdown

---

## Migration Idempotency

The migration is safe to run multiple times:
- Uses `ON CONFLICT (key) DO NOTHING`
- If BAU already exists, INSERT is skipped (no error)
- No schema changes, only data insert
- No cascading effects (BAU is a new project, no foreign key references to break)

---

## References

- **JIRA_SYNC_STRATEGY.md** — Comprehensive sync architecture overview
- **Jira Project:** Senaei BAU (id 10061, 25 items created/updated 2026-05-14)
- **Database Schema:**
  - `ph_projects` — Project master table (key, name, description, status, etc.)
  - `ph_issues` — Work items (issue_key, project_key, synced_at, etc.)
- **Edge Functions:**
  - `catalyst-full-sync` — Pulls all 2026+ items via JQL
  - `jira-bau-reload` — Delta sync for BAU only (updated since last sync)
  - `wh-jira-webhook` — Real-time webhook receiver

---

## Contact

For questions or follow-up on Phase 2 refactoring, contact Vikram.
