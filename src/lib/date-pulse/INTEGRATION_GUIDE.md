# Date Pulse Integration Guide

## ⚠️ P0 MANDATORY — Canonical Components Required

**Phase 2A components MUST use actual Catalyst canonical patterns (not custom HTML):**

### 1. HealthStatusBadge
- ✅ Delegates to `CatalystStatusPill` (handles portal, colors, keyboard nav)
- Maps health states to semantic status values (Uncommitted→backlog, On Track→done, etc.)
- Never custom color dots or inline HTML

### 2. HealthStatusDescriptor
- ✅ Uses `@atlaskit/tokens` for all colors (no hardcoded hex)
- ✅ Uses stacked (column) field-row layout like `CatalystSidebarDetails`
- ✅ Renders field labels in uppercase: TARGET, RELEASE, DATES, WORK
- Never inline styles without token() wrapper

### 3. DatePulseHoverCard
- ✅ Uses `@atlaskit/lozenge` for severity badges (CRITICAL/WARNING/ADVISORY)
- ✅ Shows affected item key + description (no avatars in violations, avatars are actor-only)
- ✅ Uses `@atlaskit/tokens` for all colors
- Never emoji icons or custom badge HTML

### When wiring to ProductBacklogPage:
- **Import these from Catalyst (do not reinvent):**
  - `CatalystStatusPill` — status rendering + portal pattern
  - `CatalystAvatar` — avatar + deterministic initials fallback
  - `CatalystSidebarDetails` — field-row stacked layout pattern
  - `@atlaskit/lozenge` — severity badges
  - `@atlaskit/tokens` — color tokens (never hardcoded hex)

---

## Phase 2A Complete: Core Engine + Components + Migrations

All Date Pulse infrastructure is in place:
- ✅ `src/types/date-pulse.ts` — Type definitions
- ✅ `src/lib/date-pulse/DatePulseEngine.ts` — Rule evaluator (18 rules)
- ✅ `src/lib/date-pulse/HealthStatusEngine.ts` — State machine (7 states)
- ✅ `src/hooks/useBusinessRequestHealth.ts` — Composite hook
- ✅ `src/components/business-request/HealthStatusBadge.tsx` — Badge (3 sizes)
- ✅ `src/components/business-request/HealthStatusDescriptor.tsx` — Hover card
- ✅ `src/components/business-request/DatePulseHoverCard.tsx` — Violations panel
- ✅ `supabase/migrations/20260619_*.sql` — Schema changes (3 migrations)

## How to Wire ProductBacklogPage

### Option 1: Column-based Integration (Recommended)

Add health status as a column in the backlog table:

```typescript
// In ProductBacklogPage.tsx or the adapter
const columns = [
  { key: 'key', title: 'Key', width: 120 },
  { key: 'health', title: 'Health', width: 120,
    render: (br) => {
      const { health } = useBusinessRequestHealth(br.id);
      return health ? (
        <HealthStatusBadge 
          health={health} 
          size="sm" 
          onClick={() => setSelectedForDetails(br.id)}
        />
      ) : null;
    },
    sortBy: (a, b) => healthStatusSortOrder(a.health?.health_status) - healthStatusSortOrder(b.health?.health_status),
  },
  // ... other columns
];
```

**Where to add:**
- File: `src/modules/project-work-hub/adapters/backlogDataSource.ts` or similar column definition
- Key: Find where columns are defined in the backlog adapter
- Import: `import { HealthStatusBadge } from '@/components/business-request'`

### Option 2: Row Data Injection

Enrich each BR row with health data before rendering:

```typescript
// In the data fetching/adapter layer
const brWithHealth = await Promise.all(
  brs.map(async (br) => {
    const health = await calculateHealth(br.id);
    return { ...br, health };
  })
);
```

**Note:** This approach has performance implications (N queries for N BRs). Use caching (`useBusinessRequestHealth` includes in-memory cache with 30s TTL).

## Testing the Integration

After wiring to ProductBacklogPage:

```bash
# 1. Apply migrations locally
supabase migration up

# 2. Verify health_status column exists
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='business_requests' AND column_name='health_status';"

# 3. Start dev server
npm run dev

# 4. Navigate to product backlog
# Open http://localhost:8080/product-hub/[product-code]/backlog

# 5. Smoke test
# - Look for health badge on each BR row
# - Click badge → descriptor popup appears
# - Verify color matches state (green = On Track, red = At Risk, etc.)
# - Add a story to a BR → badge updates to Committed
# - Check console for no errors
```

## Next Steps (Phase 3)

After ProductBacklogPage integration is verified:

1. **Kanban Card Integration** — Wire health badge to kanban cards in KanbanPage
2. **Timeline Integration** — Color-code Gantt bars by health status
3. **All-Work Integration** — Add health filter to ProjectAllWorkView (if BR linked)
4. **Filter Support** — Add "Filter by health status" dropdown
5. **Dashboard** — Create 5 new widgets (BR Pulse Map, Health Radar, Release Confidence, Stakeholder Lens, Delivery Composition)

## Troubleshooting

### Health badge shows "Uncommitted" for all BRs
- [ ] Are migrations applied? `supabase migration up`
- [ ] Does `business_requests` have `health_status` column? Check DB schema
- [ ] Are linked work items present? Check `ph_issues` for rows with matching `business_request_id`

### Hook returns null/error
- [ ] Check browser console for fetch errors
- [ ] Verify Supabase connection: `supabase.auth.getSession()`
- [ ] Check RLS policies on `business_requests` and `ph_issues` (SELECT should be public or authenticated)

### Violations not appearing
- [ ] Check `date_pulse_violations` array in hook result
- [ ] Verify linked work has `due_date` set (null due_dates trigger A2 rule)
- [ ] Run DatePulseEngine directly: `computeDatePulseViolations(br, work, release)`

### Component not rendering
- [ ] Verify ADS tokens exist in CSS: `--ds-background-success`, `--ds-text`, etc.
- [ ] Check TypeScript errors: `npx tsc --noEmit`
- [ ] Browser DevTools → inspect element → computed styles

## Files Added (Phase 2A)

```
src/types/date-pulse.ts
src/lib/date-pulse/
  ├─ DatePulseEngine.ts
  ├─ HealthStatusEngine.ts
  └─ __tests__/  (test files go here)
src/hooks/useBusinessRequestHealth.ts
src/components/business-request/
  ├─ HealthStatusBadge.tsx
  ├─ HealthStatusDescriptor.tsx
  ├─ DatePulseHoverCard.tsx
  └─ __tests__/  (test files go here)
supabase/migrations/
  ├─ 20260619_add_business_request_health_status.sql
  ├─ 20260619_add_incident_due_date.sql
  └─ 20260619_verify_date_fields_on_work_items.sql
```

## Success Criteria for Phase 2B (Integration)

- [ ] ProductBacklogPage renders health badge on each BR row
- [ ] Badge color matches health status (7 colors, ADS tokens)
- [ ] Clicking badge opens descriptor with details
- [ ] No console errors
- [ ] Performance: < 500ms per badge (with cache)
- [ ] Manual test: Add story to BR → badge updates to Committed within 30s

---

**Phase 2A Status:** ✅ COMPLETE (6/7 steps)
**Phase 2B Status:** 🔄 PENDING (requires ProductBacklogPage wiring)
**Phase 3 Status:** ⏳ BLOCKED (awaits Phase 2B)

See `DATE_PULSE_PHASE2_HANDOVER.md` for build order and detailed specs.
