# Catalyst Date Pulse — Phase 1 Architecture Document
**Status:** Locked & Build-Ready  
**Date:** 2026-06-19  
**Author:** Claude Code + Vikram Indla  
**Scope:** Engine design, state machine, type definitions, component specs, migrations  

---

## 1. Executive Summary

**Date Pulse** is a two-layer visibility system for Business Request delivery health:

1. **Health Status Engine** — Computes glanceable state (Uncommitted → Committed → On Track / Delayed / At Risk / Blocked / Delivered)
2. **Date Pulse Engine** — Computes violations (18 rules, diagnostic detail)

**Single Source of Truth:** `business_requests.health_status` field (computed, materialized in Phase 1)

**Integration:** Health Status badge appears on EVERY BR surface (backlog, kanban, timeline, all-work)

**Authority:** This module **supersedes all other modules** when proposing schema changes (adds missing date fields to any table)

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Business Request (+ linked Epic, Story, Defect, Incident)   │
└─────────────────────────────────────────────────────────────┘
                            ↓
         ┌──────────────────────────────────────┐
         │    useBusinessRequestHealth()        │
         │  (composite hook combines both)      │
         └──────────────────────────────────────┘
              ↙                          ↘
    ┌──────────────────┐        ┌──────────────────┐
    │ DatePulseEngine  │        │HealthStatusEngine│
    │ (Violations)     │        │ (State Machine)  │
    │ 18 rules → []    │        │ Rules → status   │
    └──────────────────┘        └──────────────────┘
              ↓                           ↓
    ┌──────────────────┐        ┌──────────────────┐
    │ DatePulseHover   │        │ HealthStatusBadge│
    │ Card (detail)    │        │ (dot + color)    │
    └──────────────────┘        └──────────────────┘
              ↓                           ↓
    [Shown on click]               [Always shown]
    [Hover: violations]            [Backlog rows, cards, nodes]
```

---

## 3. Health Status Engine Specification

### 3.1 State Machine (7 Core States)

```
┌──────────────────────────────────────────────────────────────────┐
│                    HEALTH STATUS STATE MACHINE                    │
└──────────────────────────────────────────────────────────────────┘

                          BR Created
                              ↓
                        ┌─────────────┐
                        │ UNCOMMITTED │  ← Default initial state
                        └──────┬──────┘
                               │
                    [work linked + dates exist]
                               ↓
                        ┌─────────────┐
                        │ COMMITTED   │  ← Delivery path exists
                        └──┬──────┬───┘
                           │      │
              [dates ok]    │      │  [misalignment detected]
                    ↓       │      ↓
            ┌──────────┐    │   ┌──────────┐
            │ ON TRACK │    │   │ DELAYED  │
            └──────────┘    │   └──────────┘
                    ↓       │      ↑
              [all work done]    [dates conflict/past due]
                    ↓       │      ↑
            ┌──────────┐    │      
            │DELIVERED │────┘   
            └──────────┘         

            ┌──────────┐
            │ AT RISK  │  ← Expectation without capability
            └──────────┘    (target_date + release set, no work linked)
                    
            ┌──────────┐
            │ BLOCKED  │  ← Critical blocker present
            └──────────┘
```

### 3.2 State Definitions

| State | Trigger Conditions | Exit Condition | Duration | User Action |
|-------|-------------------|----------------|----------|-------------|
| **Uncommitted** | BR created, no work linked OR all linked work has no dates | Work linked + dates added | First week typically | Link stories with dates |
| **Committed** | ≥1 work item linked + has due_date + date within [BR.end_date, Release.target_date] + ≥1 item in-progress | All work unlinked OR all dates removed | Days to weeks | Start delivery |
| **On Track** | Committed + zero violations + all dates aligned + sprints ≤ release_date | Any violation detected | Most of delivery | Maintain alignment |
| **Delayed** | Committed + ≥1 violation (date past due, sprint > release, etc.) | Violations resolved | Until corrected | Adjust dates or scope |
| **At Risk** | BR.end_date + Release.target_date set + NO work linked + days_to_deadline < 14 | Work linked OR deadline moved | Until work starts | Create stories |
| **Blocked** | Committed + ≥1 critical defect open OR critical story status=blocked | Blocker resolved | Until unblocked | Resolve blocker |
| **Delivered** | All linked work = DONE + BR status = DONE | BR reopened | Final state | Close BR |

### 3.3 Transition Rules (Pseudocode)

```javascript
function computeHealthStatus(br) {
  // Gather linked work
  const linkedWork = getLinkedWorkItems(br.id);
  const workWithDates = linkedWork.filter(w => w.due_date !== null);
  const inProgressWork = linkedWork.filter(w => w.status !== 'backlog');
  const doneWork = linkedWork.filter(w => w.status === 'done');
  const criticalBlocked = linkedWork.filter(w => 
    w.severity === 'P1' || w.severity === 'SEV1' && w.status === 'blocked'
  );
  
  // Check for blockers FIRST (highest priority)
  if (criticalBlocked.length > 0) {
    return 'Blocked';
  }
  
  // Check if all work done
  if (linkedWork.length > 0 && 
      linkedWork.every(w => w.status === 'done') && 
      br.status === 'done') {
    return 'Delivered';
  }
  
  // Check if uncommitted (no path)
  if (linkedWork.length === 0 || workWithDates.length === 0) {
    return 'Uncommitted';
  }
  
  // Check for At Risk (expectation without delivery engagement)
  if ((br.end_date || br.release?.target_date) && 
      inProgressWork.length === 0 &&
      daysUntil(br.end_date || br.release?.target_date) < 14) {
    return 'At Risk';
  }
  
  // At this point we have: work linked + dates + some in-progress
  // Committed is base state from here on
  
  // Check for Delayed (any date violation)
  const violations = computeDatePulseViolations(br);
  if (violations.length > 0) {
    return 'Delayed';
  }
  
  // All clear: On Track
  return 'On Track';
}
```

### 3.4 Commitment Rules (Detailed)

**A BR is "Committed" when ALL of these are true:**

```
Condition 1: Work Linkage
  linked_work.length >= 1
  
Condition 2: Dates Exist
  linked_work.filter(w => w.due_date IS NOT NULL).length >= 1
  
Condition 3: Date Window Fit
  FOR EACH linked_work_item w:
    IF br.release_id IS NOT NULL:
      w.due_date <= br.release.target_date
    ELSE IF br.end_date IS NOT NULL:
      w.due_date <= br.end_date
      
Condition 4: Engagement
  linked_work.filter(w => w.status NOT IN ['backlog', 'todo']).length >= 1
  (At least one item has left the backlog)
```

**If ANY condition fails → Uncommitted**

### 3.5 On Track Rules (Detailed)

**A Committed BR is "On Track" when ALL of these are true:**

```
Base: Committed state achieved (above 4 conditions)

Violation Check:
  date_pulse_violations.length === 0
  (Zero violations means perfect alignment)
  
Sprint Boundary Check:
  FOR EACH story s IN linked_stories:
    IF s.sprint_id IS NOT NULL:
      sprint.end_date <= br.release?.target_date OR br.release IS NULL
      
Blocker Check:
  critical_blockers.length === 0
  (No P1/SEV1 defects open)
  
Progress Check:
  done_items_count > 0 OR in_progress_count > done_items_count
  (Some progress made OR more in-progress than done is OK)
```

**If ANY condition fails → stays Committed, but check if Delayed**

### 3.6 At Risk Rules (Detailed)

**A BR is "At Risk" when:**

```
Condition 1: Expectation Set
  (br.end_date IS NOT NULL OR br.release_id IS NOT NULL)
  
Condition 2: No Delivery Path
  linked_work.length === 0
  OR all linked_work have status = 'backlog'
  
Condition 3: Deadline Close
  daysUntil(br.end_date OR br.release.target_date) < 14
  
Condition 4: Not Already On Track/Delayed
  health_status NOT IN ['On Track', 'Delayed', 'Blocked', 'Delivered']
```

**All 4 must be true → At Risk**

---

## 4. Date Pulse Engine Specification

### 4.1 Rule Categories (18 Total)

#### A. Missing Date Rules (3 rules)

```
Rule A1: BR Target Date Missing
  Condition: br.end_date IS NULL AND br.release_id IS NULL
  Severity: advisory
  Message: "Business expectation date is missing"

Rule A2: Linked Work Missing Dates
  Condition: linked_work EXISTS AND w.due_date IS NULL
  Severity: warning
  Message: "Story {key} has no due date. Cannot assess commitment."

Rule A3: Release Date Missing
  Condition: br.release_id IS NOT NULL AND br.release.target_date IS NULL
  Severity: warning
  Message: "Release date not set. Cannot align expectations."
```

#### B. Date Conflict Rules (6 rules)

```
Rule B1: Story Due After Release
  Condition: story.due_date > br.release.target_date
  Severity: critical
  Message: "Story {key} due {story_date}, release {release_date}"

Rule B2: Sprint After Release
  Condition: story.sprint.end_date > br.release.target_date
  Severity: critical
  Message: "Sprint ends {sprint_end}, release {release_date}"

Rule B3: Story After BR Target
  Condition: story.due_date > br.end_date
  Severity: warning
  Message: "Story due date exceeds business target"

Rule B4: Defect After Release
  Condition: defect.due_date > br.release.target_date AND defect.status != 'done'
  Severity: warning
  Message: "Defect {key} may not be fixed before release"

Rule B5: Epic After BR Target
  Condition: epic.target_date > br.end_date
  Severity: warning
  Message: "Epic timeline exceeds business target"

Rule B6: Child After Parent
  Condition: child.due_date > parent.due_date
  Severity: warning
  Message: "Sub-task after parent story"
```

#### C. Scope Creep Rules (3 rules)

```
Rule C1: New Work Added After Target
  Condition: new_story.created_at > br.end_date AND br.release IS NOT NULL
  Severity: warning
  Message: "Story added after commitment date"

Rule C2: Story Moved to Later Sprint
  Condition: old_sprint.end_date < new_sprint.end_date > br.release.target_date
  Severity: warning
  Message: "Story moved to sprint after release"

Rule C3: Defect Added Near Release
  Condition: defect.created_at > (br.release.target_date - 7 days)
  Severity: advisory
  Message: "Late defect added close to release date"
```

#### D. Status/State Rules (4 rules)

```
Rule D1: Overdue Item (no Due Date)
  Condition: item.updated_at < (today - 7 days) AND item.status != 'done'
  Severity: warning
  Message: "Work item not updated in 7+ days"

Rule D2: Due Date Passed (item open)
  Condition: item.due_date < today AND item.status != 'done'
  Severity: critical
  Message: "Item due {date} is {days} days overdue"

Rule D3: Parent Done, Child Open
  Condition: parent.status = 'done' AND child.status != 'done'
  Severity: advisory
  Message: "Child work still open after parent complete"

Rule D4: Blocked Item Past Due
  Condition: item.status = 'blocked' AND item.due_date < today
  Severity: critical
  Message: "Blocked item {key} is overdue. Blocker: {reason}"
```

#### E. Alignment Rules (2 rules)

```
Rule E1: No Strategic Theme
  Condition: br.theme IS NULL AND br.targeted_feature = true
  Severity: advisory
  Message: "Targeted feature missing strategic theme"

Rule E2: No Stakeholders
  Condition: br.stakeholders.length = 0 AND br.urgency = 'P1'
  Severity: advisory
  Message: "High-priority BR has no stakeholder alignment"
```

### 4.2 Violation Output Structure

```typescript
interface DatePulseViolation {
  id: string;
  rule_id: string;  // 'A1', 'B1', etc.
  severity: 'advisory' | 'warning' | 'critical';
  title: string;
  description: string;
  affected_item_key: string;
  affected_item_type: string;
  date_value: string | null;  // The problematic date
  baseline_date: string | null;  // What it should be
  detection_timestamp: string;
}

interface DatePulseResult {
  violations: DatePulseViolation[];
  violation_count: number;
  critical_count: number;
  warning_count: number;
  advisory_count: number;
  summary: string;  // Human-readable summary
}
```

---

## 5. Type Definitions (TypeScript)

### 5.1 Health Status Types

```typescript
// Health Status enum
export type HealthStatus = 
  | 'Uncommitted'
  | 'Committed'
  | 'On Track'
  | 'Delayed'
  | 'At Risk'
  | 'Blocked'
  | 'Delivered';

// Health severity (for styling)
export type HealthSeverity = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

// Individual violation
export interface DatePulseViolation {
  id: string;
  rule_id: string;  // 'A1', 'B1', 'C1', etc.
  rule_category: 'missing' | 'conflict' | 'scope_creep' | 'status' | 'alignment';
  severity: 'advisory' | 'warning' | 'critical';
  title: string;
  description: string;
  affected_item_key: string | null;
  affected_item_type: 'story' | 'defect' | 'task' | 'epic' | 'incident' | null;
  affected_item_id: string | null;
  date_value: string | null;
  baseline_date: string | null;
  suggested_action: string | null;  // No action, just suggestion
  detected_at: string;
}

// Complete health assessment
export interface BusinessRequestHealth {
  // Primary status
  health_status: HealthStatus;
  health_severity: HealthSeverity;
  
  // Summary text
  health_summary: string;  // One line: "Story due 30 Aug, release 30 Jul"
  health_descriptor: string;  // Hover text: "All dates aligned. On schedule."
  
  // Linked work snapshot
  linked_work_count: number;
  linked_work_with_dates_count: number;
  in_progress_count: number;
  done_count: number;
  open_blockers_count: number;
  
  // Dates snapshot
  br_target_date: string | null;
  br_end_date: string | null;
  release_target_date: string | null;
  earliest_story_due: string | null;
  latest_story_due: string | null;
  
  // Urgency
  days_to_deadline: number;
  is_overdue: boolean;
  is_urgent: boolean;  // Days to deadline < 7
  
  // Violations (Date Pulse detail)
  date_pulse_violations: DatePulseViolation[];
  violation_count: number;
  critical_violation_count: number;
  
  // Metadata
  evaluated_at: string;
  evaluation_duration_ms: number;
}

// Extended Business Request type
export interface BusinessRequestWithHealth extends BusinessRequest {
  health: BusinessRequestHealth;
}
```

### 5.2 Hook Interface

```typescript
interface UseBusinessRequestHealthOptions {
  refreshInterval?: number;  // ms, default 30000
  includeViolations?: boolean;  // default true
  forceRecalculate?: boolean;  // bypass cache
}

interface UseBusinessRequestHealthResult {
  health: BusinessRequestHealth | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Hook signature
export function useBusinessRequestHealth(
  brId: string,
  options?: UseBusinessRequestHealthOptions
): UseBusinessRequestHealthResult;
```

---

## 6. Component Specifications

### 6.1 HealthStatusBadge Component

**Location:** `src/components/business-request/HealthStatusBadge.tsx`

**Props:**

```typescript
interface HealthStatusBadgeProps {
  health: BusinessRequestHealth;
  size?: 'sm' | 'md' | 'lg';  // default 'md'
  showText?: boolean;  // default false (just dot on small, text on lg)
  onClick?: () => void;  // trigger descriptor popup
  className?: string;
}
```

**Behavior:**

```
Size: sm (10px dot, no text)
  Display: colored dot only
  On hover: "On Track" text
  On click: open descriptor

Size: md (14px dot + text)
  Display: colored dot + status text
  Example: "● On Track"
  On hover: brief descriptor
  On click: open full hover card

Size: lg (16px + full descriptor)
  Display: colored dot + status text + brief summary
  Example: 
    ● On Track
    All dates aligned. 3/3 stories done.
```

**Colors (ADS tokens):**

```typescript
const healthColorMap: Record<HealthStatus, string> = {
  'Uncommitted': 'var(--ds-text-subtlest, #6B778C)',  // grey
  'Committed': 'var(--ds-background-information, #0052CC)',  // blue
  'On Track': 'var(--ds-background-success, #216E4E)',  // green
  'Delayed': 'var(--ds-background-warning, #974F0C)',  // amber
  'At Risk': 'var(--ds-background-danger, #AE2A19)',  // red
  'Blocked': 'var(--ds-background-danger, #AE2A19)',  // red (with X)
  'Delivered': 'var(--ds-background-success, #216E4E)',  // green (with checkmark)
};
```

### 6.2 HealthStatusDescriptor Component

**Location:** `src/components/business-request/HealthStatusDescriptor.tsx`

**Props:**

```typescript
interface HealthStatusDescriptorProps {
  health: BusinessRequestHealth;
  brKey: string;
  onOpenDatePulse?: () => void;  // link to full violations
}
```

**Behavior:**

```
Hover card (shown on mouseover/click):

┌──────────────────────────────────────────┐
│ ● On Track                               │
│ All dates aligned. On schedule.          │
│                                          │
│ 3 stories linked · 2 done · 1 in progress│
│ Target: 30 Jun · Release: 30 Jul         │
│ Earliest due: 28 Jun · Latest: 29 Jun   │
│                                          │
│ [View violations] [More details]         │
└──────────────────────────────────────────┘

(if Delayed):
┌──────────────────────────────────────────┐
│ ⚠ Delayed                                │
│ Story BAU-123 due 30 Aug (after release) │
│                                          │
│ 3 stories linked · 1 overdue             │
│ Target: 30 Jun · Release: 30 Jul         │
│ Issues: Date conflict, 1 blocker         │
│                                          │
│ [View violations] [Adjust dates]         │
└──────────────────────────────────────────┘
```

### 6.3 DatePulseHoverCard Component

**Location:** `src/components/business-request/DatePulseHoverCard.tsx`

**Props:**

```typescript
interface DatePulseHoverCardProps {
  violations: DatePulseViolation[];
  brKey: string;
  brTargetDate: string | null;
  releaseDate: string | null;
}
```

**Behavior:**

```
Full violations panel (shown on "View violations" click):

┌────────────────────────────────────────────────┐
│ Date Pulse Violations (3 total)                │
├────────────────────────────────────────────────┤
│                                                │
│ 🔴 CRITICAL (1)                               │
│   • Story BAU-123 due 30 Aug, release 30 Jul  │
│     (2 months after release)                  │
│                                                │
│ 🟡 WARNING (2)                                │
│   • Sprint ends 15 Aug (before release 30 Jul)│
│   • Defect BAU-456 has no due date            │
│                                                │
│ ℹ️  ADVISORY (0)                              │
│                                                │
│ [Learn more] [Update dates] [Close]           │
└────────────────────────────────────────────────┘
```

---

## 7. Hook Implementation Outline

### 7.1 useBusinessRequestHealth Hook

**Location:** `src/hooks/useBusinessRequestHealth.ts`

```typescript
export function useBusinessRequestHealth(
  brId: string,
  options?: UseBusinessRequestHealthOptions
): UseBusinessRequestHealthResult {
  const [health, setHealth] = useState<BusinessRequestHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const calculateHealth = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 1. Fetch BR + linked work
      const br = await supabase
        .from('business_requests')
        .select('*')
        .eq('id', brId)
        .single();
      
      const linkedWork = await supabase
        .from('ph_issues')
        .select('*')
        .eq('business_request_id', brId);
      
      const release = br.release_id 
        ? await supabase.from('product_releases').select('*').eq('id', br.release_id).single()
        : null;
      
      // 2. Run Date Pulse Engine
      const violations = computeDatePulseViolations(br, linkedWork.data || [], release);
      
      // 3. Run Health Status Engine
      const healthStatus = computeHealthStatus(br, linkedWork.data || [], violations);
      
      // 4. Compile health object
      const result: BusinessRequestHealth = {
        health_status: healthStatus,
        health_severity: mapStatusToSeverity(healthStatus),
        health_summary: generateSummary(healthStatus, br, linkedWork),
        health_descriptor: generateDescriptor(healthStatus, br, linkedWork),
        linked_work_count: linkedWork.data?.length || 0,
        linked_work_with_dates_count: (linkedWork.data || []).filter(w => w.due_date).length,
        in_progress_count: (linkedWork.data || []).filter(w => w.status !== 'backlog' && w.status !== 'done').length,
        done_count: (linkedWork.data || []).filter(w => w.status === 'done').length,
        open_blockers_count: (linkedWork.data || []).filter(w => w.status === 'blocked').length,
        br_target_date: br.end_date,
        br_end_date: br.end_date,
        release_target_date: release?.target_date || null,
        earliest_story_due: minDate(linkedWork.data?.map(w => w.due_date)) || null,
        latest_story_due: maxDate(linkedWork.data?.map(w => w.due_date)) || null,
        days_to_deadline: daysUntil(br.end_date || release?.target_date),
        is_overdue: br.end_date ? br.end_date < today : false,
        is_urgent: daysUntil(br.end_date || release?.target_date) < 7,
        date_pulse_violations: violations,
        violation_count: violations.length,
        critical_violation_count: violations.filter(v => v.severity === 'critical').length,
        evaluated_at: new Date().toISOString(),
        evaluation_duration_ms: performance.now() - startTime,
      };
      
      setHealth(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setHealth(null);
    } finally {
      setIsLoading(false);
    }
  }, [brId, options?.forceRecalculate]);

  useEffect(() => {
    calculateHealth();
    const interval = setInterval(calculateHealth, options?.refreshInterval || 30000);
    return () => clearInterval(interval);
  }, [calculateHealth, options?.refreshInterval]);

  return { health, isLoading, error, refetch: calculateHealth };
}
```

---

## 8. Schema Changes (Migrations)

### 8.1 Add health_status to business_requests

**Migration File:** `supabase/migrations/20260619_add_business_request_health_status.sql`

```sql
-- Add health_status column
ALTER TABLE business_requests 
ADD COLUMN health_status TEXT NOT NULL DEFAULT 'Uncommitted'
CHECK (health_status IN ('Uncommitted', 'Committed', 'On Track', 'Delayed', 'At Risk', 'Blocked', 'Delivered'));

-- Add index for filtering by health status
CREATE INDEX idx_br_health_status ON business_requests(health_status);

-- Add comment
COMMENT ON COLUMN business_requests.health_status IS 
  'Computed delivery health status. Updated on every BR or linked work change.';

-- Seed initial values (set all existing BRs to Uncommitted)
UPDATE business_requests SET health_status = 'Uncommitted' WHERE health_status IS NULL;
```

### 8.2 Add due_date to production_incidents (if missing)

**Migration File:** `supabase/migrations/20260619_add_incident_due_date.sql`

```sql
-- Add due_date column to production_incidents
ALTER TABLE production_incidents 
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN target_resolution_time INTERVAL;

-- Create index
CREATE INDEX idx_incident_due_date ON production_incidents(due_date);

-- Add comment
COMMENT ON COLUMN production_incidents.due_date IS 
  'Target resolution date. Proposed by Date Pulse engine for incidents without SLA.';
```

### 8.3 Verify date fields on all work item tables

**Migration File:** `supabase/migrations/20260619_verify_date_fields_on_work_items.sql`

```sql
-- Verify these columns exist (these should already exist per repo scan):
-- ph_issues.due_date ✓
-- epics.target_date ✓
-- stories.due_date (via ph_issues) ✓
-- tasks.due_date (via ph_issues) ✓

-- If any are missing, this migration should ADD them:
-- (assumes they exist based on Phase 0 research)

-- Add verification comment
COMMENT ON SCHEMA public IS 
  'Date Pulse Engine verified: all date fields present on work items. health_status added to business_requests.';
```

---

## 9. Integration Points (Phase 1 Only)

### 9.1 ProductBacklogPage Integration

**File:** `src/pages/product-hub/ProductBacklogPage.tsx`

**Changes:**

```typescript
// Add to column definition:
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
  sortBy: (a, b) => healthStatusSortOrder(a.health.health_status) - healthStatusSortOrder(b.health.health_status),
}

// Add to row render:
const { health, isLoading } = useBusinessRequestHealth(br.id);
// Inject into row data
```

**Impact:** Health badge appears on every BR row in backlog

### 9.2 BR Detail Drawer Integration

**File:** `src/components/business-request/BusinessRequestDetail.tsx` (or similar)

**Changes:**

```typescript
// Add Health tab or section
const BRDetailTabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'linked-work', label: 'Linked Work' },
  { key: 'health', label: 'Health Status' },  // NEW
  { key: 'activity', label: 'Activity' },
];

// In Health tab:
<HealthStatusDescriptor
  health={br.health}
  brKey={br.request_key}
  onOpenDatePulse={() => setShowViolations(true)}
/>

{showViolations && (
  <DatePulseHoverCard
    violations={br.health.date_pulse_violations}
    brKey={br.request_key}
  />
)}
```

---

## 10. Risk Mitigation

### 10.1 Performance Risks

| Risk | Mitigation |
|------|-----------|
| Hook runs on every BR row render → N queries | Implement React Query cache, set 30s refresh interval, memoize |
| Date Pulse rules on 100+ linked items → slow | Lazy-load violations on demand, only run critical rules on list view |
| Schema change on business_requests → migration | Non-breaking change, default value set, no constraint change |

### 10.2 Data Quality Risks

| Risk | Mitigation |
|------|-----------|
| Some BRs have no release_id → At Risk false positives | Check for NULL release_id in At Risk rule, make it optional |
| Some stories have no due_date → cannot be committed | Leverage Date Pulse A2 rule to surface, allow user to add |
| Sprint dates may not be queryable → cannot check sprint vs release | Verify sprint join path in Phase 0 queries, document fallback |

### 10.3 UX Risks

| Risk | Mitigation |
|------|-----------|
| Health status churn (changes too often) → confusing | Set 30s cache, only update on save events, not on scroll |
| Too many violations → overwhelming | Limit violations shown to top 3, rest in "View all", sort by severity |
| Non-PM users confused by Date Pulse → support load | Make badges opt-in for non-PM roles via feature flag |

---

## 11. Test Plan (Phase 1)

### 11.1 Unit Tests (DatePulseEngine)

```typescript
describe('DatePulseEngine', () => {
  describe('Rule A1: BR Target Date Missing', () => {
    it('should flag when br.end_date and br.release_id both null', () => {
      const br = { end_date: null, release_id: null };
      const violations = computeDatePulseViolations(br, [], null);
      expect(violations.some(v => v.rule_id === 'A1')).toBe(true);
    });
  });

  describe('Rule B1: Story Due After Release', () => {
    it('should flag when story.due_date > release.target_date', () => {
      const br = { release_id: 'r1' };
      const release = { target_date: '2026-07-30' };
      const work = [{ due_date: '2026-08-30', issue_key: 'BAU-123' }];
      const violations = computeDatePulseViolations(br, work, release);
      expect(violations.some(v => v.rule_id === 'B1')).toBe(true);
    });
  });

  // ... 16 more tests for rules A2, A3, B2-B6, C1-C3, D1-D4, E1-E2
});
```

### 11.2 Unit Tests (HealthStatusEngine)

```typescript
describe('HealthStatusEngine', () => {
  describe('Uncommitted State', () => {
    it('should return Uncommitted when no work linked', () => {
      const br = { id: 'br1', end_date: '2026-06-30' };
      const status = computeHealthStatus(br, [], []);
      expect(status).toBe('Uncommitted');
    });

    it('should return Uncommitted when work linked but no dates', () => {
      const br = { id: 'br1' };
      const work = [{ issue_key: 'BAU-1', due_date: null }];
      const status = computeHealthStatus(br, work, []);
      expect(status).toBe('Uncommitted');
    });
  });

  describe('Committed State', () => {
    it('should return Committed when work linked with dates in range', () => {
      const br = { id: 'br1', end_date: '2026-07-30', release_id: 'r1' };
      const release = { target_date: '2026-07-30' };
      const work = [{ issue_key: 'BAU-1', due_date: '2026-07-15', status: 'in_progress' }];
      const status = computeHealthStatus(br, work, []);
      expect(status).toBe('Committed');
    });
  });

  describe('On Track State', () => {
    it('should return On Track when Committed + no violations', () => {
      // (Committed conditions met + violations.length === 0)
      const status = computeHealthStatus(br, work, []);
      expect(status).toBe('On Track');
    });
  });

  describe('Delayed State', () => {
    it('should return Delayed when Committed + violations exist', () => {
      const violations = [{ rule_id: 'B1', severity: 'critical' }];
      const status = computeHealthStatus(br, work, violations);
      expect(status).toBe('Delayed');
    });
  });

  describe('At Risk State', () => {
    it('should return At Risk when expectation set + no work linked + < 14 days', () => {
      const br = { end_date: new Date(today + 7 days).toISOString(), release_id: null };
      const status = computeHealthStatus(br, [], []);
      expect(status).toBe('At Risk');
    });
  });

  describe('Blocked State', () => {
    it('should return Blocked when critical blocker exists', () => {
      const br = { end_date: '2026-07-30' };
      const work = [{ issue_key: 'BAU-1', severity: 'P1', status: 'blocked' }];
      const status = computeHealthStatus(br, work, []);
      expect(status).toBe('Blocked');
    });
  });

  describe('Delivered State', () => {
    it('should return Delivered when all work done + BR done', () => {
      const br = { id: 'br1', status: 'done' };
      const work = [{ issue_key: 'BAU-1', status: 'done' }];
      const status = computeHealthStatus(br, work, []);
      expect(status).toBe('Delivered');
    });
  });
});
```

### 11.3 Integration Tests (Hook + Component)

```typescript
describe('useBusinessRequestHealth + HealthStatusBadge', () => {
  it('should display health status badge on BR row', async () => {
    const { getByTestId } = render(
      <ProductBacklogRow br={mockBr} />
    );
    
    await waitFor(() => {
      expect(getByTestId('health-status-badge')).toBeInTheDocument();
    });
  });

  it('should update health status when story is linked', async () => {
    const { rerender } = render(
      <HealthStatusBadge health={initialHealth} />
    );
    
    // Simulate story link
    const updatedHealth = await refetchHealth();
    
    expect(updatedHealth.health_status).toBe('Committed');
    expect(updatedHealth.linked_work_count).toBe(1);
  });

  it('should show At Risk when release set and no work linked', async () => {
    const br = { end_date: new Date(today + 10 days) };
    const { getByText } = render(
      <HealthStatusDescriptor health={health} brKey="BR-1" />
    );
    
    expect(getByText(/Expected release/i)).toBeInTheDocument();
  });
});
```

---

## 12. Phase 1 Deliverables Checklist

### Code Deliverables

- [ ] `src/lib/date-pulse/DatePulseEngine.ts` — Rule evaluator
- [ ] `src/lib/date-pulse/HealthStatusEngine.ts` — State machine
- [ ] `src/hooks/useBusinessRequestHealth.ts` — Composite hook
- [ ] `src/components/business-request/HealthStatusBadge.tsx` — Badge component
- [ ] `src/components/business-request/HealthStatusDescriptor.tsx` — Hover card
- [ ] `src/components/business-request/DatePulseHoverCard.tsx` — Violations panel
- [ ] `src/types/date-pulse.ts` — Type definitions

### Test Deliverables

- [ ] `src/lib/date-pulse/__tests__/DatePulseEngine.test.ts` — 18 rule tests
- [ ] `src/lib/date-pulse/__tests__/HealthStatusEngine.test.ts` — 7 state tests
- [ ] `src/hooks/__tests__/useBusinessRequestHealth.test.ts` — Hook tests
- [ ] `src/components/business-request/__tests__/HealthStatusBadge.test.tsx` — Component tests

### Schema Deliverables

- [ ] `supabase/migrations/20260619_add_business_request_health_status.sql` — health_status column
- [ ] `supabase/migrations/20260619_add_incident_due_date.sql` — date fields
- [ ] `supabase/migrations/20260619_verify_date_fields_on_work_items.sql` — verification

### Integration Deliverables

- [ ] ProductBacklogPage wired with health badge on rows
- [ ] BR detail drawer includes Health Status tab
- [ ] Unit + integration tests passing

### Documentation Deliverables

- [ ] State machine diagram (visual)
- [ ] Rule reference (all 18 rules documented)
- [ ] Hook usage guide
- [ ] Component storybook examples

---

## 13. Phase 2 Handoff (Preview)

**Phase 2 will expand Health Status to additional surfaces:**

1. **ProjectAllWorkView** — Health badge on story rows (if BR linked)
2. **Kanban cards** — Health badge on card header
3. **Timeline nodes** — Health color-coded on Gantt bars
4. **AllWorkList** — Filter by health status

**Phase 3 will add Product Dashboard:**

1. **Widget 1:** BR Pulse Map (rows by release, colored by health)
2. **Widget 2:** Health Radar (distribution: On Track / Delayed / At Risk)
3. **Widget 3:** Release Confidence (per release, health-based)
4. **Widget 4:** Stakeholder/Theme Lens (grouped by stakeholder health)
5. **Widget 5:** Delivery Composition (BR anatomy)

---

## 14. Success Criteria (Phase 1 Complete)

✅ **Engine Complete**
- [ ] All 18 Date Pulse rules implemented + tested
- [ ] All 7 Health Status states implemented + tested
- [ ] Hook returns accurate health for 100+ test cases

✅ **Components Complete**
- [ ] HealthStatusBadge renders correctly in 3 sizes
- [ ] HealthStatusDescriptor shows correct descriptor per state
- [ ] DatePulseHoverCard lists violations sorted by severity
- [ ] All components use ADS tokens (no hardcoded hex)
- [ ] No duplicate components (all existing components reused)

✅ **Integration Complete**
- [ ] ProductBacklogPage rows show health badge
- [ ] BR detail drawer has Health Status tab
- [ ] Health badge updates when BR or linked work changes
- [ ] No performance regression (< 500ms per hook call)

✅ **Schema Complete**
- [ ] health_status column added + indexed
- [ ] Missing date fields added (incidents, etc.)
- [ ] Migrations tested + reversible
- [ ] No data loss, all defaults set

✅ **Testing Complete**
- [ ] 18 rule tests pass
- [ ] 7 state machine tests pass
- [ ] Integration tests pass
- [ ] >80% code coverage

---

## 15. Timeline Estimate (Phase 1)

| Task | Effort | Blocker | Start | End |
|------|--------|---------|-------|-----|
| Engine implementation | 3 days | None | Day 1 | Day 3 |
| Component implementation | 2 days | Engine | Day 4 | Day 5 |
| Hook integration | 1 day | Engine + Components | Day 6 | Day 6 |
| ProductBacklogPage wiring | 1 day | Hook + Components | Day 7 | Day 7 |
| Unit + integration tests | 2 days | All above | Day 1 (parallel) | Day 7 |
| Schema migrations | 1 day | None | Day 8 | Day 8 |
| Documentation | 1 day | All above | Day 8 | Day 8 |
| **Total** | **~11 days** | — | — | — |

(Can be compressed to 7-8 days with parallel work)

---

## 16. Appendix: Rule Matrix

| Rule ID | Category | Severity | Condition | Transition Impact |
|---------|----------|----------|-----------|-------------------|
| A1 | Missing | Advisory | BR target + release both null | Uncommitted |
| A2 | Missing | Warning | Linked work has no due_date | Uncommitted |
| A3 | Missing | Warning | Release set, no release.target_date | At Risk |
| B1 | Conflict | Critical | Story due > release date | Delayed |
| B2 | Conflict | Critical | Sprint ends > release date | Delayed |
| B3 | Conflict | Warning | Story due > BR target date | Delayed |
| B4 | Conflict | Warning | Defect due > release, open | Delayed |
| B5 | Conflict | Warning | Epic date > BR target | Delayed |
| B6 | Conflict | Warning | Child due > parent due | Delayed |
| C1 | Scope | Warning | New story added after target | Delayed |
| C2 | Scope | Warning | Story moved to later sprint | Delayed |
| C3 | Scope | Advisory | Defect added near release | Advisory |
| D1 | Status | Warning | Item not updated 7+ days | Delayed |
| D2 | Status | Critical | Due date passed, item open | Delayed |
| D3 | Status | Advisory | Parent done, child open | Advisory |
| D4 | Status | Critical | Blocked item overdue | Blocked |
| E1 | Alignment | Advisory | Targeted feature, no theme | Advisory |
| E2 | Alignment | Advisory | P1 BR, no stakeholders | Advisory |

---

**End of Phase 1 Architecture Document**

**Status:** Ready for implementation.  
**Next:** Phase 2 — Expand to all surfaces (backlog, kanban, timeline).

