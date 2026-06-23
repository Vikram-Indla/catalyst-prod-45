# RELEASES + SPRINTS FEATURE — COMPLETE SPECIFICATION

**Date:** 2026-06-23  
**Status:** Ready for Phase 3 Implementation  
**Confidence:** 95% (all discovery + API + schema complete)

---

## 1. DATA MODEL

### releases table
- `id` (uuid PK)
- `project_id` (uuid FK → projects, ON DELETE CASCADE)
- `name` (text, unique per project, max 255)
- `description` (text, nullable)
- `start_date` (date, nullable)
- `release_date` (date, nullable, must be >= start_date)
- `status` (enum: 'unreleased' | 'released' | 'archived', default 'unreleased')
- `sequence` (int, for drag-reorder)
- `archived_at` (timestamptz, nullable, soft-delete marker)
- `created_at`, `updated_at` (timestamptz)
- **RLS:** SELECT all auth in project, INSERT/UPDATE/DELETE admin/product_owner/managed/project_manager only
- **Trigger:** update_releases_updated_at

### sprints table
- `id` (uuid PK)
- `project_id` (uuid FK → projects, ON DELETE CASCADE)
- `release_id` (uuid FK → releases, NOT NULL, ON DELETE RESTRICT)
- `name` (text, unique per project, max 255)
- `description` (text, nullable)
- `start_date` (date, nullable)
- `end_date` (date, nullable, must be >= start_date)
- `capacity` (int, nullable, must be > 0)
- `status` (enum: 'planned' | 'active' | 'completed' | 'archived', default 'planned')
- `sequence` (int, order within release)
- `archived_at` (timestamptz, nullable, soft-delete)
- `created_at`, `updated_at` (timestamptz)
- **RLS:** SELECT all auth, INSERT/UPDATE/DELETE admin/product_owner/managed/project_manager only
- **Trigger:** prevent_sprint_release_change_if_stories (cannot reassign release_id if stories linked)

### story_sprints junction table
- `story_id` (uuid FK → stories, ON DELETE CASCADE)
- `sprint_id` (uuid FK → sprints, ON DELETE CASCADE)
- `created_at` (timestamptz)
- **PK:** (story_id, sprint_id)
- **RLS:** SELECT all auth in project, INSERT/DELETE all auth in project

### stories (extended)
- `release_id` (uuid FK → releases, NOT NULL)
- Sprints resolved via story_sprints junction (many-to-many)
- **Constraint:** all sprints in story_sprints must have sprint.release_id == story.release_id (enforced by trigger validate_story_sprints_match_release)

### business_requests (extended)
- `release_id` (uuid FK → releases, ON DELETE SET NULL, NULLABLE)

### production_incidents (extended)
- `release_id` (uuid FK → releases, ON DELETE SET NULL, NULLABLE)

---

## 2. PIXEL-PERFECT UI SPECIFICATIONS

### Typography (Atlassian Sans ONLY)
- **Body text:** 14px / 400 weight / var(--ds-text, #292A2E)
- **Subtle text (buttons, labels):** 14px / 500 weight / var(--ds-text-subtle, #505258)
- **Subtlest text:** var(--ds-text-subtlest, #6B6E76)
- **Section headers:** 16px / 600 weight / var(--ds-text)

### Colors (ADS tokens ONLY)
- **Primary text:** `var(--ds-text, #292A2E)`
- **Subtle text:** `var(--ds-text-subtle, #505258)`
- **Subtlest text:** `var(--ds-text-subtlest, #6B6E76)`
- **Done status (progress):** #6A9A23 (rgb(106, 154, 35))
- **In-progress status (progress):** #669EF1 (rgb(102, 158, 241))
- **Border:** rgba(11, 18, 14, 0.14)
- **Surface:** #FFFFFF

### Spacing Grid (4/8/16/24/32px ONLY)
- **Cell padding:** 4px vertical, 8px horizontal
- **Button padding:** 6px vertical, 0px horizontal (button exception)
- **Row height:** 48px
- **Progress bar height:** 10px
- **Section gaps:** 16px or 24px
- **Modal padding:** 24px

### Component Measurements
- **Progress bar:** 10px height, 5px border-radius, 4 segments
- **Button:** 3px border-radius, 6px 0px padding
- **Input:** 3px border-radius, 4px 6px padding
- **Table row:** 48px height
- **Modal:** ~600px width

---

## 3. API ENDPOINTS (14 total)

### Release CRUD
```
GET    /api/projects/:key/releases               → List (grouped by status)
POST   /api/releases                              → Create
PUT    /api/releases/:id                          → Update
DELETE /api/releases/:id                          → Soft-delete (archive)
```

### Release-Sprint Linkage
```
POST   /api/releases/:id/sprints/:sprint_id       → Link sprint
DELETE /api/releases/:id/sprints/:sprint_id       → Unlink sprint (reassign required)
PUT    /api/releases/:id/sprints/reorder          → Drag-reorder sprints
```

### Sprint CRUD
```
GET    /api/projects/:key/sprints                 → List sprints
POST   /api/sprints                               → Create (release_id required)
PUT    /api/sprints/:id                           → Update
DELETE /api/sprints/:id                           → Soft-delete
```

### Story Linkage
```
POST   /api/stories                               → Create with release_id + sprint_ids
PUT    /api/stories/:id                           → Update release + sprints
GET    /api/releases/:id/sprints/:sprint_id/issues → Get issues in Release>Sprint combo
```

**All endpoints return:**
- HTTP status codes (200/201/204/400/403/404/409)
- Error response structure: `{ error: string, code: string, details?: object }`
- Validation: field-level checks (unique, FK, date ranges, enum, not-null)
- Permission: role-gated RLS (admin/product_owner/managed/project_manager)

---

## 4. UI COMPONENTS

### Release Hub List (`/projects/:key/releases`)
- **Base:** CatalystViewBase (project layout wrapper)
- **Table:** JiraTable (canonical, NOT custom)
- **Columns:** Release name (link), Status (lozenge), Progress (bar), Start date, Release date, Description, Actions (kebab)
- **Sections:** UNRELEASED (expanded), RELEASED (collapsed), ARCHIVED (collapsed)
- **Controls:** Search box, Status filter, Create Release CTA, Drag-reorder
- **Lozenge appearance:** unreleased=inprogress (blue), released=success (green), archived=default (gray), overdue=removed (red)

### Release Create Modal
- **Component:** CatalystModal + CatalystForm (NOT custom)
- **Fields:** Name (required, max 255), Description (optional), Start Date, Release Date (>= start), Link Sprints
- **Buttons:** "Create Release" (primary), "Cancel" (subtle)
- **Validation:** Name required + unique, date constraint, release_date >= start_date

### Release Edit Modal
- **Same as Create, pre-filled with current values**
- **Button:** "Update Release"
- **Constraint:** Cannot change status (use Release/Unrelease actions)

### Release Confirmation Modal (Release action)
- **Header:** "Release {name}?"
- **Content:** Unresolved items gate (count issues), Action options (move to next version or ignore), Release date picker, Create release notes checkbox
- **Buttons:** "Release" (primary), "Cancel"

### Sprint Linker (embedded in Release edit)
- **Component:** @atlaskit/select multi-select (FilterableSelect)
- **Label:** "Link Sprints"
- **Display:** Chip list of currently linked sprints (removable)
- **Options:** All sprints for project (not archived)
- **Reorder:** Drag-reorder via @atlaskit/pragmatic-drag-and-drop

### Story Create Modal — Dual-Listbox
- **Release field:** @atlaskit/select SingleSelect (required, filters sprints)
- **Sprint field:** @atlaskit/select multi-select (required, filtered to release's sprints, ≥1)
- **Validation:** release_id required, sprint_ids required + all must match release_id
- **Warning on Release change:** "Removing X sprints from selection"

### Story Detail — Release + Sprint Fields (sidebar)
- **Release field:** Link to Release detail, edit via SingleSelect
- **Sprint field:** Chip list of sprint names (clickable), edit via multi-select

### BR/PI Detail — Release Field (sidebar)
- **Release field:** Optional (nullable), Link to Release, Side effect: show "Linked Sprints" section

---

## 5. HARD CONSTRAINTS (NON-NEGOTIABLE)

### ❌ BANNED
- Custom buttons → use @atlaskit/button
- Custom modals → use CatalystModal / @atlaskit/modal-dialog
- Custom dropdowns → use @atlaskit/select
- Custom menus → use @atlaskit/dropdown-menu
- Custom form fields → use Atlaskit inputs
- Hardcoded colors → use ADS tokens ONLY (var(--ds-*))
- Non-grid spacing → 4/8/16/24/32px ONLY
- Hand-rolled table → use JiraTable canonical
- Hand-rolled validation → use CatalystForm / Atlaskit validation

### ✅ MANDATORY
- Every component cites @atlaskit/* package
- Every color is var(--ds-*) token or ADS-mapped hex
- Every spacing is 4/8/16/24/32px (except 6px 0px on buttons)
- Zero custom CSS (ADS tokens + Atlaskit only)

---

## 6. HOOKS SPECIFICATION

```typescript
// Get all releases for project
useReleases(projectKey: string) → { releases: Release[], isLoading, error }

// Get sprints filtered by release
useSprintsForRelease(releaseId: string) → { sprints: Sprint[], isLoading }

// Create release
useCreateRelease() → useMutation(payload)

// Update release
useUpdateRelease() → useMutation({ releaseId, payload })

// Link/unlink sprints
useLinkUnlinkSprints() → useMutation({ releaseId, sprintId })

// Reorder sprints
useReorderSprints() → useMutation({ releaseId, sprints })

// Create sprint
useCreateSprint() → useMutation(payload)

// Update story with release + sprints
useUpdateStoryReleaseSprints() → useMutation({ storyId, release_id, sprint_ids })
```

---

## 7. ROUTES

- `/projects/:key/releases` → Release Hub list page
- Story creation modal → extend with Release + Sprint fields (modal context)
- BR/PI sidebar → add Release field (sidebar context)

---

## 8. PERMISSIONS

| Operation | Roles | Gate |
|-----------|-------|------|
| Release SELECT | All auth (in project) | project_members |
| Release INSERT/UPDATE/DELETE | admin, product_owner, managed, project_manager | user_roles |
| Sprint CRUD | admin, product_owner, managed, project_manager | user_roles |
| Story linkage | All auth (in project) | project_members |

---

## 9. DATA INTEGRITY RULES

1. **Sprint.release_id NOT NULL** → every sprint belongs to exactly one release
2. **Story.release_id NOT NULL** → every story has a release
3. **Story.sprints ⊆ Release.sprints** → all story sprints match release (trigger enforced)
4. **Release.release_date >= Release.start_date** (if both set)
5. **Sprint.end_date >= Sprint.start_date** (if both set)
6. **Sprint.capacity > 0** (if set)
7. **Soft-delete:** archived_at IS NULL for active records
8. **CASCADE:** DELETE Release → RESTRICT Sprints (error if sprints exist) → unlinks Stories
9. **DELETE Sprint → unlinks Stories via cascade on story_sprints**

---

## 10. IMPLEMENTATION CHECKLIST

### Components (9 total)
- [ ] Release Hub List (JiraTable + cells)
- [ ] Release Create Modal (CatalystModal + form)
- [ ] Release Edit Modal (CatalystModal + form)
- [ ] Release Archive/Delete Dialogs (@atlaskit/modal-dialog)
- [ ] Release Confirmation Modal (Release action)
- [ ] Sprint Linker (multi-select embedded)
- [ ] Story Create Modal Extension (dual-listbox)
- [ ] Story Detail Extension (Release + Sprint fields)
- [ ] BR/PI Detail Extension (Release field)

### Hooks (8 total)
- [ ] useReleases
- [ ] useSprintsForRelease
- [ ] useCreateRelease
- [ ] useUpdateRelease
- [ ] useLinkUnlinkSprints
- [ ] useReorderSprints
- [ ] useCreateSprint
- [ ] useUpdateStoryReleaseSprints

### Routes
- [ ] /projects/:key/releases
- [ ] Story modal integration
- [ ] BR/PI sidebar integration

### Testing
- [ ] Release CRUD flows
- [ ] Sprint linkage
- [ ] Story integration
- [ ] Validation (unique, dates, required)
- [ ] Error handling (409, 403, 404)
- [ ] design-governance audit (0 violations)

---

## 11. REFERENCE LINKS

- **Schema migrations:** `supabase/migrations/20260623120*.sql` (5 files)
- **API contracts:** Outlined above (14 endpoints)
- **Pixel-perfect source:** Phase 0 DOM probe (Jira Releases page, 2026-06-23)
- **Phase 1 schema:** Complete with RLS + triggers
- **Phase 2 API:** All payloads + validation rules
- **Phase 3 scope:** Components + hooks + integration

---

**Ready for Phase 3 implementation. Zero ambiguity. Build against this spec.**
