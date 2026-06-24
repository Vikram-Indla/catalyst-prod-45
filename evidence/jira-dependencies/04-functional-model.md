# Jira Dependencies — Functional Model

**Purpose:** Infer the data model, business logic, and API contract from observed behavior  
**Source:** Reference screenshots + reverse-engineered interaction flow  
**Status:** PROPOSED (requires confirmation with product)

---

## Core Concepts

### Dependency

A directed relationship between two work items indicating a constraint or sequence dependency.

```typescript
interface Dependency {
  id: string;                    // Unique identifier (UUID)
  plan_id: string;               // Parent plan/scenario
  source_issue_key: string;      // Source issue (e.g., "MMS-13")
  relationship_type: 'blocks' | 'is_blocked_by' | /* other types */;
  target_issue_key: string;      // Target issue (e.g., "MMS-76")
  created_by?: string;           // User UUID
  created_at?: timestamp;
  updated_at?: timestamp;
  deleted_at?: timestamp;        // Soft delete support
}
```

### Relationship Types

**Observable types:**
- `blocks` — Source blocks target; target cannot start until source is complete
- `is_blocked_by` — Inverse of blocks

**Likely additional types (not observed, but standard in Jira):**
- `duplicates` — Issues are duplicates
- `relates_to` — General relationship
- `clones` — Issue clones another
- `is_cloned_by` — Inverse of clones
- `blocks_by` — Alternative naming for is_blocked_by

**Assumption:** The four primary types in Jira are: blocks, is_blocked_by, duplicates, relates_to. Others may be available but less relevant for planning.

---

## Domain Entities

### Plan/Scenario

Jira Plans organizes dependencies into scenarios (planning contexts). A plan has multiple scenarios.

```typescript
interface Plan {
  id: string;
  name: string;                  // e.g., "Tahommena"
  space_key?: string;            // Project/space this plan belongs to
  created_by: string;
  created_at: timestamp;
}

interface Scenario {
  id: string;
  plan_id: string;
  name: string;                  // e.g., "Scenario 1"
  description?: string;
  created_at: timestamp;
}
```

### Work Item (for dependency context)

A work item is an issue in Jira. For dependency purposes, we need:

```typescript
interface WorkItem {
  key: string;                   // "MMS-13" (primary key)
  summary: string;               // "MOJ Integration"
  issue_type: string;            // "Story", "Task", "Incident", etc.
  status: string;                // "TO DO", "IN PROGRESS", "DONE", etc.
  priority?: string;             // "Highest", "High", "Medium", "Low", "Lowest"
  assignee?: string;             // User UUID
  due_date?: date;               // Date, if set
  start_date?: date;             // Date, if set
  parent_key?: string;           // Parent issue, if this is a child
  project_key: string;           // "MMS" (for scoping)
}
```

---

## Observable Data Flow

### Create Dependency Flow

**User action:** Clicks "+ Add a dependency"  
**1. Modal opens**
- First field: focus on "source issue" selector
- Middle field: "blocks" (default relationship type)
- Third field: "target issue" selector
- Add button: disabled until both issues selected

**2. User selects source issue**
- Clicks first dropdown → results list appears
- Searches/selects (e.g., "MMS-13")
- Field updates with selected issue key + icon

**3. User can optionally change relationship type**
- Clicks middle field
- Selects from options (e.g., "is blocked by", "duplicates")
- Field updates

**4. User selects target issue**
- Clicks third dropdown → results list appears
- Searches/selects (e.g., "MMS-76")
- Field updates with selected issue key + icon

**5. User clicks "Add"**
- Button likely shows spinner/loading state
- Request sent to backend: `POST /dependencies`
- Modal closes on success
- Dependency appears in timeline/table view

**6. Validation rules**
- Both source and target must be selected (Add button disabled otherwise)
- Source and target cannot be the same (?)
- Duplicate dependencies prevented (?)
- Cyclic dependencies prevented (?)

### Read Dependency Flow

**Timeline view:**
- User navigates to Dependencies tab
- Sees all dependencies for the scenario in graph form
- Can apply filters (Roll-up, Group by, etc.) to reorganize
- Hovers over cards to see actions

**Table view:**
- Switches from timeline to table
- Sees hierarchical list of items with dependency counts
- Can expand/collapse groups
- Can see aggregated stats (total blocked, total blocking, etc.)

### Delete Dependency Flow

**Hover actions:**
- User hovers over dependency card or row
- Context menu appears with "Remove" option
- Clicks remove
- Likely confirmation modal (not shown in screenshots)
- Dependency deleted (soft or hard delete?)
- View updates

---

## Search/Filter Behavior

### Source/Target Issue Selection

**Observed behavior:**
- Dropdown shows pre-populated list of issues
- User can likely type to search/filter
- Results show: icon + key (monospace, colored) + summary
- Results are scoped to current plan's project(s)

**Likely API query:**
```
GET /search/issues?jql=project IN (MMS) AND ...
```

**Filtering logic:**
- Scoped by current plan's project scope
- May exclude certain issue types (e.g., Epic, Feature if "Roll-up to Story")
- May exclude already-completed issues
- Ordering: by key, recent, or relevance

### Relationship Type Filtering

**Observed:** User selects "blocks" in the middle field

**Assumption:** Not all relationship types are valid for all issue type combinations. E.g.:
- "blocks" is valid for Story → Story, Task → Story, etc.
- "duplicates" is valid for Issue → Issue (any type)
- Constraints may be configurable or hardcoded

---

## Counted Fields (Observable in Table)

| Field | What it counts | Notes |
|---|---|---|
| "Blocked by" | # of unique issues that block this issue | Scope: current plan? all plans? |
| "Blocks" | # of unique issues this issue blocks | Scope: current plan? all plans? |
| "#" | Sequential number or issue count | Unclear from screenshot |

**Likely behavior:** Counts are scoped to the current plan/scenario (not global to Jira).

---

## State Model: Add Dependency Modal

```
IDLE
  ↓ (user clicks "+ Add a dependency")
OPEN
  source: null, type: 'blocks', target: null
  Add button: DISABLED
  ↓ (user selects source)
  source: 'MMS-13', type: 'blocks', target: null
  Add button: DISABLED
  ↓ (user changes type)
  source: 'MMS-13', type: 'is_blocked_by', target: null
  Add button: DISABLED
  ↓ (user selects target)
  source: 'MMS-13', type: 'is_blocked_by', target: 'MMS-76'
  Add button: ENABLED
  ↓ (user clicks "Add")
  SAVING
  source: 'MMS-13', type: 'is_blocked_by', target: 'MMS-76'
  Add button: DISABLED (spinner shown)
  ↓ (success response from API)
  CLOSED
  dependency { source: 'MMS-13', type: 'is_blocked_by', target: 'MMS-76' } created
  ↓
  IDLE (timeline/table view updated)
```

**Error states:**
- If save fails: modal stays OPEN, error message shown, user can retry or cancel
- If validation fails: form field shows error, Add button stays DISABLED

---

## API Contract (Inferred)

### POST /dependencies (Create)

**Request:**
```json
{
  "plan_id": "1",
  "scenario_id": "1",
  "source_issue_key": "MMS-13",
  "relationship_type": "blocks",
  "target_issue_key": "MMS-76"
}
```

**Response (201 Created):**
```json
{
  "id": "dep-abc123",
  "plan_id": "1",
  "scenario_id": "1",
  "source_issue_key": "MMS-13",
  "relationship_type": "blocks",
  "target_issue_key": "MMS-76",
  "created_by": "user-123",
  "created_at": "2026-06-24T10:30:00Z"
}
```

**Error responses:**
- 400 Bad Request: missing fields, invalid type
- 409 Conflict: duplicate dependency, cyclic dependency
- 403 Forbidden: permission denied
- 404 Not Found: issue not found in plan

### GET /dependencies

**Query:**
```
GET /dependencies?plan_id=1&scenario_id=1&source_issue_key=MMS-13
```

**Response:**
```json
{
  "dependencies": [
    {
      "id": "dep-abc123",
      "source_issue_key": "MMS-13",
      "relationship_type": "blocks",
      "target_issue_key": "MMS-76",
      "created_at": "2026-06-24T10:30:00Z"
    },
    {
      "id": "dep-abc124",
      "source_issue_key": "MMS-13",
      "relationship_type": "is_blocked_by",
      "target_issue_key": "MMS-205",
      "created_at": "2026-06-24T10:35:00Z"
    }
  ],
  "total": 2
}
```

### DELETE /dependencies/:id

**Request:**
```
DELETE /dependencies/dep-abc123
```

**Response (204 No Content):**
```
(empty body)
```

### GET /issues/search (for dependency selectors)

**Query:**
```
GET /issues/search?jql=project=MMS&type IN (Story, Task, Bug)&maxResults=20&text=MOJ
```

**Response:**
```json
{
  "issues": [
    {
      "key": "MMS-13",
      "summary": "MOJ Integration",
      "type": "Story",
      "status": "TO DO",
      "priority": "Highest",
      "icon_url": "..."
    },
    {
      "key": "MMS-14",
      "summary": "NIC Integration",
      "type": "Story",
      "status": "IN PROGRESS",
      "priority": "High",
      "icon_url": "..."
    }
  ],
  "total": 2
}
```

---

## Permissions Model (Observed vs. Assumed)

**Observable:** No permission errors or locked states visible in reference screenshots

**Assumptions:**
- User must have **Edit** access to the Plan/Scenario to add dependencies
- User must have **View** access to both source and target issues
- Admin users can delete any dependency
- Regular users can only delete their own dependencies (?)

**Likely Jira constraint:**
- Dependencies respect the project access control for the issues involved
- If an issue becomes inaccessible, the dependency may be hidden or archived

---

## Data Persistence (Catalyst Implementation)

### Supabase Table: dependencies

```sql
CREATE TABLE public.dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  source_issue_key TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('blocks', 'is_blocked_by', 'duplicates', 'relates_to')),
  target_issue_key TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  -- Ensure source and target are not the same
  CHECK (source_issue_key != target_issue_key),
  
  -- Ensure no duplicate dependencies (soft delete aware)
  UNIQUE (plan_id, scenario_id, source_issue_key, relationship_type, target_issue_key, COALESCE(deleted_at, '1970-01-01'::timestamptz))
);

CREATE INDEX idx_dependencies_plan ON public.dependencies(plan_id);
CREATE INDEX idx_dependencies_scenario ON public.dependencies(scenario_id);
CREATE INDEX idx_dependencies_source ON public.dependencies(source_issue_key);
CREATE INDEX idx_dependencies_target ON public.dependencies(target_issue_key);
```

### RLS Policies

```sql
-- Users can read dependencies for plans they can access
CREATE POLICY "Users can view dependencies for accessible plans"
  ON public.dependencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = dependencies.plan_id
      AND (
        p.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.plan_members pm
          WHERE pm.plan_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )
  );

-- Users can create dependencies if they can edit the plan
CREATE POLICY "Users can create dependencies in editable plans"
  ON public.dependencies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = dependencies.plan_id
      AND (p.created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.plan_members pm WHERE pm.plan_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'editor'))
    )
  );

-- Users can delete dependencies they created
CREATE POLICY "Users can delete their own dependencies"
  ON public.dependencies FOR DELETE
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.plans WHERE id = plan_id AND created_by = auth.uid()));
```

---

## Known Unknowns (Require Product Confirmation)

1. **Cyclic dependency detection:** Does Jira prevent A→B + B→A? (likely yes, but not observed)
2. **Self-reference prevention:** Does Jira prevent A→A? (checkbox in DB constraint, so yes)
3. **All relationship types:** Only "blocks" observed. Are there others? (likely duplicates, relates_to)
4. **Scope constraints:** Are dependencies scoped to project or global to plan? (assumed per-plan)
5. **Soft vs. hard delete:** Are deleted dependencies soft-deleted or hard-deleted? (assumed soft for audit trail)
6. **Cascading:** If an issue is deleted in Jira, what happens to its dependencies in Catalyst? (assumed stays, becomes orphaned)
7. **Async search:** What project scope is applied when showing issue results? (assumed current plan's projects)
8. **Timeline rendering:** What graph layout algorithm? (Sugiyama/ELK likely, not confirmed)
9. **Responsive behavior:** How does timeline render on mobile? (not observed, likely not tested)
10. **Validation messages:** What errors show on validation failure? (not observed)

---

## Behavioral Rules (Inferred)

1. **Source ≠ Target:** Issue cannot depend on itself
2. **No duplicates:** Cannot create two identical dependencies
3. **Type validation:** Relationship type must be from predefined list
4. **Access control:** Both issues must be accessible to the user
5. **Plan scope:** Dependency is owned by a specific plan/scenario
6. **Audit trail:** created_by and created_at are immutable
7. **Soft delete:** Deleted dependencies are retained for audit/undo (assumed)

