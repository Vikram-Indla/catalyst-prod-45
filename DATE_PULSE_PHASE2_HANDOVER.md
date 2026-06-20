# Catalyst Date Pulse — Phase 2 Handover
**Status:** Ready for Implementation  
**Date Completed:** 2026-06-19  
**For:** Next Session (Phase 2 Build)  
**Estimated Duration:** 7-11 days

---

## 🎯 What This Handover Contains

1. **Decision Summary** — What was locked in Phase 1
2. **Architecture Files** — Two docs that ARE your spec
3. **Phase 2 Scope** — Exactly what to build
4. **Quick Setup Checklist** — Verify before starting
5. **File Locations** — Where to write code
6. **Test Strategy** — How to verify correctness
7. **Known Risks** — Watch out for these
8. **Success Criteria** — When Phase 2 is done

---

## 📋 What Was Decided (Phase 0 + 1)

### Architecture Locked ✅

**Two-Layer System:**
- **Health Status Engine** → Computes glanceable state (7 states: Uncommitted, Committed, On Track, Delayed, At Risk, Blocked, Delivered)
- **Date Pulse Engine** → Computes violations (18 rules, diagnostic detail)

**Key Constraints (Vikram-Approved):**
1. ✅ Health Status is **Business Request ONLY** (not on work items)
2. ✅ Date Pulse is **diagnostic** (shows misalignment, does NOT fix or assign blame)
3. ✅ Module **supersedes** other modules for schema changes (can add due_date to any table)
4. ✅ Health Status badge appears on **EVERY BR surface** (backlog rows, kanban cards, timeline nodes, all-work list)
5. ✅ Uncommitted → Committed requires work linked + dates present + dates fit window
6. ✅ Violations drive state transitions (zero violations = On Track, any violation = Delayed)
7. ✅ ADS design system mandatory (no hardcoded colors, reuse existing badge/icon components)

### Schema Changes Approved ✅

- Add `health_status` column to `business_requests` (7 enum values)
- Add `due_date` to `production_incidents` (if missing)
- Verify all work items have date fields

### Components Approved ✅

1. **HealthStatusBadge** (dot + optional text, 3 sizes)
2. **HealthStatusDescriptor** (hover card, 2-3 lines)
3. **DatePulseHoverCard** (violations list, full detail)

---

## 📁 Read These Files First (Phase 1 is Your Spec)

### 1. Architecture Document (Complete Build Spec)
**File:** `DATE_PULSE_ARCHITECTURE_PHASE_1.md`

**Sections to read in order:**
- Section 1: Executive Summary
- Section 3: Health Status Engine (3.1 state machine, 3.2 state definitions, 3.3 pseudocode)
- Section 4: Date Pulse Engine (4.1 rule categories, 4.2 violation structure)
- Section 5: Type Definitions (your TypeScript interfaces)
- Section 6: Component Specs (HealthStatusBadge, HealthStatusDescriptor, DatePulseHoverCard)
- Section 7: Hook Implementation (useBusinessRequestHealth)
- Section 8: Schema Changes (copy these migrations)
- Section 9: Integration Points (ProductBacklogPage wiring)

### 2. Research Document (Context + Data Model)
**File:** `DATE_PULSE_RESEARCH_PHASE_0.md`

**Use this for:**
- Section 3: Issue/Work Item Type Inventory (for rule edge cases)
- Section 4: Data Relationships (understand BR → Story → Sprint → Release)
- Section 5: Existing Component Patterns (identify what to reuse)

### 3. Vikram's Strategic Brief (Why This Matters)
**In this conversation:** Search for "On top of this, I want you to add some very important thing"

**Key points:**
- Health Status is the **glanceable signal** (does this BR ship on time? yes/no/maybe)
- Date Pulse is the **diagnostic detail** (why not? show violations)
- This module is **not about fixing**; it's about **surfacing facts**
- Product Dashboard is a **separate strategic design** (not just Date Pulse UI)

---

## 🚀 Phase 2 Scope (What to Build)

### Phase 2A: Core Engine + Components (Days 1-7)

**What:** Implement everything in `DATE_PULSE_ARCHITECTURE_PHASE_1.md` Sections 5-11

**Deliverables:**
1. **Engine files** (2):
   - `src/lib/date-pulse/DatePulseEngine.ts` — All 18 rules
   - `src/lib/date-pulse/HealthStatusEngine.ts` — State machine

2. **Hook** (1):
   - `src/hooks/useBusinessRequestHealth.ts` — Composite hook

3. **Components** (3):
   - `src/components/business-request/HealthStatusBadge.tsx`
   - `src/components/business-request/HealthStatusDescriptor.tsx`
   - `src/components/business-request/DatePulseHoverCard.tsx`

4. **Types** (1):
   - `src/types/date-pulse.ts`

5. **Migrations** (3):
   - `supabase/migrations/20260619_add_business_request_health_status.sql`
   - `supabase/migrations/20260619_add_incident_due_date.sql`
   - `supabase/migrations/20260619_verify_date_fields_on_work_items.sql`

6. **Tests** (4 files):
   - `src/lib/date-pulse/__tests__/DatePulseEngine.test.ts` — 18 rule tests
   - `src/lib/date-pulse/__tests__/HealthStatusEngine.test.ts` — 7 state tests
   - `src/hooks/__tests__/useBusinessRequestHealth.test.ts` — Hook tests
   - `src/components/business-request/__tests__/HealthStatusBadge.test.tsx` — Component tests

7. **ProductBacklogPage Integration** (1):
   - Add health badge column to BR rows in backlog
   - Wire useBusinessRequestHealth hook
   - Test: Badge renders, updates, no perf regression

### Phase 2B: Surface Expansion (Phase 3, NOT this session)

✋ **DO NOT DO IN PHASE 2** — Save for Phase 3:
- Kanban card wiring
- Timeline node wiring
- All-Work list wiring
- Filter by health status
- Dashboard widgets

---

## ✅ Quick Setup Checklist (Before Starting)

Run these to verify environment:

```bash
# 1. Verify symlink exists (per CLAUDE.md)
ls -la ~/catalyst/src > /dev/null && echo "✅ Symlink OK" || echo "❌ Missing symlink"

# 2. Verify git status is clean
cd ~/catalyst && git status
# Should show: "On branch main" + "working tree clean" or just untracked files

# 3. Verify Node/npm
node --version  # Should be 20+
npm --version   # Should be 9+

# 4. Verify TypeScript
npx tsc --version  # Should be 5.x

# 5. Verify test runner
npx vitest --version  # Should exist

# 6. Verify Supabase CLI
supabase --version  # Should exist (for migrations)

# 7. Verify rtk (token optimization)
rtk --version  # Should be 0.42.4+
rtk gain      # Should show savings stats
```

**If any fail, stop and fix before starting Phase 2.**

---

## 📂 File Locations & Structure

### Create These Directories (if don't exist)

```
src/lib/date-pulse/
  └─ __tests__/

src/components/business-request/
  └─ __tests__/

supabase/migrations/
```

### Architecture Files Already Exist ✅

```
DATE_PULSE_RESEARCH_PHASE_0.md          ← Context + data model
DATE_PULSE_ARCHITECTURE_PHASE_1.md      ← Build spec (THIS IS YOUR GUIDE)
DATE_PULSE_PHASE2_HANDOVER.md           ← This file
```

---

## 🔨 Build Order (Critical)

**Do NOT skip steps. Do NOT reorder.**

### Step 1: Types (Day 1 start)
**File:** `src/types/date-pulse.ts`

**What:** Copy Section 5 (Type Definitions) from ARCHITECTURE_PHASE_1.md

**Why first:** Components and hooks depend on these types existing

**Verify:**
```bash
npx tsc --noEmit
# Should have 0 errors related to date-pulse types
```

---

### Step 2: DatePulseEngine (Days 1-2)
**File:** `src/lib/date-pulse/DatePulseEngine.ts`

**What:** Implement all 18 rules (A1-A3, B1-B6, C1-C3, D1-D4, E1-E2)

**Copy from:** ARCHITECTURE_PHASE_1.md Section 4.1 (each rule has condition + severity + message)

**Pseudocode location:** Section 4.2 shows violation output structure

**Key function:**
```typescript
export function computeDatePulseViolations(
  br: BusinessRequest,
  linkedWork: WorkItem[],
  release: Release | null
): DatePulseViolation[]
```

**Verify:**
```bash
npm test -- DatePulseEngine.test.ts
# Should pass all 18 rule tests
```

---

### Step 3: HealthStatusEngine (Days 2-3)
**File:** `src/lib/date-pulse/HealthStatusEngine.ts`

**What:** Implement state machine (7 states, all transitions)

**Copy from:** ARCHITECTURE_PHASE_1.md Section 3 (3.3 has pseudocode)

**Key function:**
```typescript
export function computeHealthStatus(
  br: BusinessRequest,
  linkedWork: WorkItem[],
  violations: DatePulseViolation[]
): HealthStatus
```

**State transitions:** Section 3.1 has the visual diagram

**Verify:**
```bash
npm test -- HealthStatusEngine.test.ts
# Should pass all 7 state tests
```

---

### Step 4: Hook (Days 3-4)
**File:** `src/hooks/useBusinessRequestHealth.ts`

**What:** React hook that calls both engines, returns composite result

**Copy from:** ARCHITECTURE_PHASE_1.md Section 7 (full implementation outline)

**Key contract:**
```typescript
export function useBusinessRequestHealth(
  brId: string,
  options?: UseBusinessRequestHealthOptions
): UseBusinessRequestHealthResult
```

**Verify:**
```bash
npm test -- useBusinessRequestHealth.test.ts
# Should pass all integration tests
```

---

### Step 5: Components (Days 4-6)
**Files:**
- `src/components/business-request/HealthStatusBadge.tsx`
- `src/components/business-request/HealthStatusDescriptor.tsx`
- `src/components/business-request/DatePulseHoverCard.tsx`

**Copy specs from:** ARCHITECTURE_PHASE_1.md Section 6

**HealthStatusBadge:**
- Props: `health`, `size`, `showText`, `onClick`
- Colors: Use ADS tokens (`var(--ds-background-success)`, etc.)
- Sizes: sm (10px dot), md (dot+text), lg (dot+text+descriptor)

**HealthStatusDescriptor:**
- Hover card format (Section 6.2 shows mockup)
- Use Atlassian `@atlaskit/popover` or custom portal (per CLAUDE.md)
- NO action buttons (just informational)

**DatePulseHoverCard:**
- List of violations, sorted by severity
- Show only top 3, rest in "View all"
- Use @atlaskit/badge for severity chips

**Verify:**
```bash
npm test -- HealthStatusBadge.test.tsx
# Should pass component render + interaction tests
```

---

### Step 6: Schema Migrations (Day 6-7)
**Files:**
- `supabase/migrations/20260619_add_business_request_health_status.sql`
- `supabase/migrations/20260619_add_incident_due_date.sql`
- `supabase/migrations/20260619_verify_date_fields_on_work_items.sql`

**Copy from:** ARCHITECTURE_PHASE_1.md Section 8

**Run migrations:**
```bash
supabase migration up
# Verify: SELECT health_status FROM business_requests LIMIT 1;
# Should have column, default 'Uncommitted'
```

---

### Step 7: Integration to ProductBacklogPage (Day 7-8)
**File:** `src/pages/product-hub/ProductBacklogPage.tsx`

**What:** Add health badge column to BR rows

**Change:** ARCHITECTURE_PHASE_1.md Section 9.1

**Key changes:**
```typescript
// In column definition:
{
  key: 'health',
  title: 'Health',
  width: 120,
  render: (br) => (
    <HealthStatusBadge
      health={br.health}
      size="sm"
      onClick={() => setSelectedBrForDetails(br.id)}
    />
  ),
}

// In row data:
const { health } = useBusinessRequestHealth(br.id);
// Inject health into row object
```

**Verify:**
```bash
npm run dev
# Open http://localhost:8080/product-hub/backlog
# Should see health badge on each BR row
# Click badge → descriptor appears
```

---

## 🧪 Test Strategy (Critical)

### Unit Tests (80% coverage target)

**DatePulseEngine:**
- 18 tests (1 per rule)
- Each test: given conditions → assert rule fires
- Example: Rule B1 test: `story.due_date > release.target_date` → violation flags

**HealthStatusEngine:**
- 7 tests (1 per state)
- Each test: given state conditions → assert correct state returns
- Example: Uncommitted test: no work linked → 'Uncommitted'

**Hook:**
- 5 tests: fetch, compute, cache, refetch, error handling
- Mock supabase calls, verify hook returns correct shape

**Components:**
- 3 tests: render, props apply, click handlers
- Mock hook, verify badge shows correct color + text

**Run:**
```bash
npm test -- --run
# Must pass all tests before proceeding
# Coverage: npx vitest --coverage
```

### Integration Tests (ProductBacklogPage)

**Manual smoke test:**
```
1. Open http://localhost:8080/product-hub/backlog
2. Look for health badge on each BR row
3. Click badge → descriptor appears
4. Verify color matches state (green = On Track, etc.)
5. Add a story to a BR → badge updates to Committed
6. Verify no console errors
```

---

## ⚠️ Known Risks & Mitigation

### Risk 1: Query Performance
**Problem:** Hook runs on every BR row → N Supabase queries

**Mitigation:**
- Implement React Query cache (30s TTL)
- Memoize hook results
- Only run critical rules on list view (defer D/E rules to detail view)

**Test:** ProductBacklogPage with 50 BRs should load < 2s

### Risk 2: Missing Date Fields
**Problem:** Some work items may not have `due_date` column

**Mitigation:**
- Migrations ADD missing columns with NULL defaults
- Rule A2 flags missing dates → user can add

**Test:** After migrations, check table schema:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name='ph_issues' AND column_name='due_date';
-- Should return 1 row
```

### Risk 3: Sprint Join Complexity
**Problem:** Sprint membership query path unclear

**Mitigation:**
- Assume: story → sprint via `ph_issues.sprint_id` FK
- If missing, defer sprint rules to Phase 3
- Document in code comment

**Test:** Verify sprint data available:
```sql
SELECT story.issue_key, sprint.name, sprint.end_date
FROM ph_issues story
JOIN sprints sprint ON sprint.id = story.sprint_id
LIMIT 1;
```

### Risk 4: Schema Migration Conflict
**Problem:** Another migration may have touched business_requests in parallel

**Mitigation:**
- Check migration name doesn't conflict: `20260619_*`
- Always add `IF NOT EXISTS` where possible
- Test migrations locally before pushing

**Test:** `supabase migration up` should succeed with no conflicts

---

## 📝 Commit Strategy

**One commit per complete step:**

```
Step 1: feat(date-pulse): add type definitions
Step 2: feat(date-pulse): implement DatePulseEngine with 18 rules
Step 3: feat(date-pulse): implement HealthStatusEngine state machine
Step 4: feat(date-pulse): implement useBusinessRequestHealth hook
Step 5: feat(date-pulse): add HealthStatusBadge, Descriptor, HoverCard components
Step 6: chore(database): add health_status to business_requests + date fields
Step 7: feat(product-hub): wire health status badge to ProductBacklogPage
```

**Each commit should:**
- ✅ Have tests passing
- ✅ Have no TypeScript errors
- ✅ Reference this handover doc
- ✅ Include `Co-Authored-By: Claude + Vikram` (per CLAUDE.md)

**Push strategy:** Push to `main` only after all tests pass (no PR review needed per scope)

---

## 🎯 Success Criteria (Phase 2 Complete)

✅ **Engines**
- [ ] DatePulseEngine evaluates all 18 rules correctly
- [ ] HealthStatusEngine computes all 7 states correctly
- [ ] Tests pass (80%+ coverage)

✅ **Hook**
- [ ] useBusinessRequestHealth returns correct shape
- [ ] Handles missing data gracefully (null checks)
- [ ] Caches results (no duplicate queries)
- [ ] Errors caught + logged

✅ **Components**
- [ ] HealthStatusBadge renders in 3 sizes with correct colors
- [ ] HealthStatusDescriptor shows on hover/click
- [ ] DatePulseHoverCard lists violations sorted by severity
- [ ] All use ADS tokens (no hardcoded hex)
- [ ] No duplicate components (reused existing badges/icons)

✅ **Schema**
- [ ] health_status column exists on business_requests
- [ ] Missing date fields added (incidents, etc.)
- [ ] Migrations applied locally + reversible

✅ **Integration**
- [ ] ProductBacklogPage displays health badge on BR rows
- [ ] Badge updates when BR or linked work changes
- [ ] No console errors
- [ ] No performance regression (< 500ms per badge)

✅ **Testing**
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual smoke test on ProductBacklogPage passes
- [ ] Coverage > 80%

✅ **Documentation**
- [ ] Code commented (especially state machine transitions)
- [ ] Hook usage documented
- [ ] Component storybook examples created
- [ ] README.md updated with Date Pulse overview

---

## 🔄 Phase 3 Preview (After Phase 2 Complete)

**Phase 3 will expand to other surfaces** (NOT Phase 2 scope):

1. **ProjectAllWorkView** — Wire health badge to story rows (if BR linked)
2. **Kanban cards** — Add health badge to card header
3. **Timeline** — Color-code Gantt nodes by health status
4. **Filters** — Add filter by health status
5. **Dashboard** — 5 new widgets (BR Pulse Map, Health Radar, Release Confidence, Stakeholder Lens, Delivery Composition)

**Phase 2 output is the foundation for all of this.** Do not scope it; lock the core engine + ProductBacklogPage integration first.

---

## 📞 If Stuck

### Before asking Vikram, check:

1. **Type errors?** → Read Section 5 (Type Definitions) again
2. **State machine confusion?** → Draw out Section 3.1 diagram on paper
3. **Rule not firing?** → Check pseudocode in Section 4.2
4. **Component rendering wrong?** → Verify ADS token usage, not hardcoded hex
5. **Query too slow?** → Implement React Query cache
6. **Test failing?** → Check Section 11 (Test Plan) for expected test structure

### Questions for next conversation:

- "Does the sprint join path work?" (verify Sprint → Story FK)
- "Should defects linked AFTER release be excluded from commitment check?" (clarify post-prod defects)
- "Any existing Badge/Icon components I should reuse?" (verify component inventory)

---

## 🎬 Next Session Checklist

**When you pick up Phase 2, do this first:**

1. ✅ Run setup checklist (verify node, npm, supabase CLI, rtk)
2. ✅ Read ARCHITECTURE_PHASE_1.md Sections 1-7 (10 min)
3. ✅ Verify git status clean, on main branch
4. ✅ Create directories: `src/lib/date-pulse/__tests__`, `src/components/business-request/__tests__`
5. ✅ Read Section 5 (Type Definitions) first
6. ✅ Start with Step 1: Types file

**Then follow build order (Steps 1-7) in sequence.**

---

## 📊 Token Budget Summary

**Phase 0 Research:** ~40k tokens
**Phase 1 Architecture:** ~65k tokens
**Total Used:** ~105k tokens

**Phase 2 Implementation:** ~60-80k tokens (estimated)
**Phase 3 Expansion:** ~50-70k tokens (estimated)

**Recommendation:** Start Phase 2 in fresh session with clean context window.

---

## 🔗 Files in This Repo

```
DATE_PULSE_RESEARCH_PHASE_0.md
  └─ Read for context + data model

DATE_PULSE_ARCHITECTURE_PHASE_1.md
  └─ YOUR BUILD SPEC — Copy sections 5-11 to implement

DATE_PULSE_PHASE2_HANDOVER.md
  └─ This file (checklist + step-by-step)
```

---

**END OF HANDOVER**

**Next session: Pick up with "Quick Setup Checklist" and follow Steps 1-7.**

**Estimated time: 7-11 days, can compress to 7 days with parallel testing.**

**Questions? Check ARCHITECTURE_PHASE_1.md Section 10 (Risk Mitigation) + Section 14 (Appendix).**

Good luck. This is a solid spec. 🚀
