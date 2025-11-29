# Backlog Module - Missing Features Implementation Plan

## Critical Missing UI Controls

Based on Jira Align documentation verification, the following UI controls are missing from the backlog interface:

---

## 1. VIEWING DROPDOWN (Work Item Type Selector)

### Jira Align Requirement
**Source:** https://help.jiraalign.com/hc/en-us/articles/115000154693-Manage-the-backlog

> "Use the Viewing dropdown to select what you want to view: Themes, Epics, Capabilities, Features, Stories, or Defects"

### Current State
- ✅ Backend: `type` parameter tracked in URL and state
- ✅ Context-aware routing working
- ❌ **Missing: UI dropdown component to switch types**

### Implementation Required

**Location:** `src/modules/backlog/components/BacklogHeader.tsx`

```tsx
// Add to BacklogHeader.tsx

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Inside component:
const { type, setType, scope } = useBacklogState();

// Get allowed types based on scope
const getAllowedTypes = (scope: BacklogScope): BacklogType[] => {
  switch (scope) {
    case 'enterprise':
    case 'portfolio':
      return ['theme', 'epic', 'capability', 'objective'];
    case 'program':
      return ['epic', 'capability', 'feature', 'objective'];
    case 'team':
      return ['story', 'defect', 'task', 'objective'];
    default:
      return ['epic'];
  }
};

const allowedTypes = getAllowedTypes(scope);

// Render in header toolbar:
<div className="flex items-center gap-2">
  <span className="text-sm text-muted-foreground">Viewing:</span>
  <Select value={type} onValueChange={(value) => setType(value as BacklogType)}>
    <SelectTrigger className="w-[180px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {allowedTypes.includes('theme') && (
        <SelectItem value="theme">Themes</SelectItem>
      )}
      {allowedTypes.includes('epic') && (
        <SelectItem value="epic">Epics</SelectItem>
      )}
      {allowedTypes.includes('capability') && (
        <SelectItem value="capability">Capabilities</SelectItem>
      )}
      {allowedTypes.includes('feature') && (
        <SelectItem value="feature">Features</SelectItem>
      )}
      {allowedTypes.includes('story') && (
        <SelectItem value="story">Stories</SelectItem>
      )}
      {allowedTypes.includes('defect') && (
        <SelectItem value="defect">Defects</SelectItem>
      )}
      {allowedTypes.includes('task') && (
        <SelectItem value="task">Tasks</SelectItem>
      )}
      {allowedTypes.includes('objective') && (
        <SelectItem value="objective">Objectives</SelectItem>
      )}
    </SelectContent>
  </Select>
</div>
```

**Estimate:** 2-3 hours
**Priority:** 🔴 HIGH

---

## 2. TIME DROPDOWN (PI/Sprint Selector)

### Jira Align Requirement
**Source:** https://help.jiraalign.com/hc/en-us/articles/115000173967-Navigate-to-the-backlog

> "Use the Time dropdown to select a time period for your backlog"

### Current State
- ✅ Backend: `timeboxType` and `timeboxId` tracked in state
- ✅ PI selectors exist in sidebars
- ❌ **Missing: Time dropdown in backlog header**
- ❌ **Missing: Filtering by selected timebox**

### Implementation Required

**Option A: Add to BacklogHeader**

```tsx
// Add to BacklogHeader.tsx

const { timeboxType, timeboxId, setTimebox } = useBacklogState();

// Fetch available PIs/sprints
const { data: programIncrements } = useQuery({
  queryKey: ['program-increments'],
  queryFn: async () => {
    const { data } = await supabase
      .from('program_increments')
      .select('id, name, code')
      .order('start_date', { ascending: false });
    return data || [];
  },
});

// Render time dropdown:
<div className="flex items-center gap-2">
  <span className="text-sm text-muted-foreground">Time:</span>
  <Select 
    value={timeboxId || 'all'} 
    onValueChange={(value) => {
      if (value === 'all') {
        setTimebox('all', null);
      } else {
        setTimebox('pi', value);
      }
    }}
  >
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="All Time" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Time</SelectItem>
      {programIncrements?.map((pi) => (
        <SelectItem key={pi.id} value={pi.id}>
          {pi.name || pi.code}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**Option B: Connect Sidebar PI Selector**

Alternatively, sync the sidebar's PI selector with backlog filtering:

```tsx
// In JiraAlignShell or parent component
const [selectedPI, setSelectedPI] = useState<string | null>(null);

// Pass to both sidebar and backlog:
<PortfolioRoomSidebar 
  selectedPI={selectedPI}
  onPIChange={setSelectedPI}
/>

<BacklogWorkspace 
  filterByPI={selectedPI}
/>
```

**API Integration Required:**

Update backlog API query to filter by timebox:

```tsx
// In backlogApi.ts or query hook:
.eq(timeboxId ? 'pi_id' : '', timeboxId || '')
```

**Estimate:** 3-4 hours
**Priority:** 🔴 HIGH

---

## 3. CSV IMPORT COMPLETION

### Current State
- ✅ BacklogImportDialog.tsx created
- ⚠️ Needs validation, error handling, testing

### Implementation Required

**Tasks:**
1. CSV parsing with validation
2. Field mapping UI
3. Error handling for invalid rows
4. Preview before import
5. Batch insert with progress indicator
6. Rollback on failure

**Estimate:** 4-6 hours
**Priority:** 🟡 MEDIUM

---

## 4. BULK OPERATIONS UI

### Jira Align Requirement
**Source:** Implicit from standard grid operations

### Implementation Required

```tsx
// Add to BacklogToolbar.tsx

const [selectedItems, setSelectedItems] = useState<string[]>([]);

// Selection UI:
<Checkbox 
  checked={selectedItems.length > 0}
  onCheckedChange={(checked) => {
    if (checked) {
      setSelectedItems(items.map(i => i.id));
    } else {
      setSelectedItems([]);
    }
  }}
/>

// Bulk actions when selection active:
{selectedItems.length > 0 && (
  <div className="flex items-center gap-2">
    <span className="text-sm">{selectedItems.length} selected</span>
    <Button onClick={() => handleBulkMove(selectedItems, targetPI)}>
      Move to PI
    </Button>
    <Button variant="destructive" onClick={() => handleBulkDelete(selectedItems)}>
      Delete
    </Button>
  </div>
)}
```

**Estimate:** 6-8 hours
**Priority:** 🟡 MEDIUM

---

## 5. SPRINT VIEW MODE

### Jira Align Requirement
**Source:** https://help.jiraalign.com/hc/en-us/articles/115000154693

> "Sprint view for sprint-scoped items"

### Implementation Required

New view mode with sprint columns instead of PI sections.

**Tasks:**
1. Add 'sprint' to BacklogViewType union
2. Create SprintView component similar to BacklogListView
3. Group items by sprint instead of PI
4. Fetch sprint data from iterations table
5. Drag-drop to assign to sprints

**Estimate:** 8-10 hours
**Priority:** 🟢 LOW

---

## IMPLEMENTATION PRIORITY ORDER

### Sprint 1 (Critical - Week 1)
1. **Viewing Dropdown** (2-3 hours) - Essential for type switching
2. **Time Dropdown** (3-4 hours) - Essential for timebox filtering
3. **Test & Verify** (2 hours) - Ensure dropdowns work correctly

**Total:** ~8 hours

### Sprint 2 (Important - Week 2)
4. **CSV Import Completion** (4-6 hours)
5. **Bulk Operations UI** (6-8 hours)

**Total:** ~12 hours

### Sprint 3 (Enhancement - Week 3+)
6. **Sprint View Mode** (8-10 hours)
7. **Advanced Filter Presets** (4-6 hours)
8. **Timeline/Gantt View** (12-16 hours)

---

## SUCCESS CRITERIA

After implementing Sprint 1 critical features:

✅ Users can switch work item types via UI dropdown
✅ Users can filter by PI/sprint via UI dropdown
✅ No manual URL editing required for basic navigation
✅ 100% compliance with Jira Align backlog navigation spec

---

## TESTING CHECKLIST

### Viewing Dropdown
- [ ] Displays only allowed types for current scope
- [ ] Switches type and updates URL parameter
- [ ] Reloads backlog data with new type
- [ ] Preserves other filters during switch

### Time Dropdown
- [ ] Lists all available PIs/sprints
- [ ] "All Time" option shows unfiltered backlog
- [ ] Filters backlog items by selected timebox
- [ ] Updates URL parameter correctly

### CSV Import
- [ ] Parses CSV with all required fields
- [ ] Validates data types and required fields
- [ ] Shows preview before importing
- [ ] Handles errors gracefully
- [ ] Imports in batches for large files

### Bulk Operations
- [ ] Multi-select with checkboxes
- [ ] Bulk move to PI
- [ ] Bulk delete (soft delete)
- [ ] Selection persists across pagination
- [ ] Clear selection button

---

**Document Owner:** Engineering Team
**Last Updated:** 2024
**Status:** APPROVED - Ready for Sprint Planning
