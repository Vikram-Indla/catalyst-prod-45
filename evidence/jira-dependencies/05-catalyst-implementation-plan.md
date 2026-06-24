# Catalyst Dependencies Feature — Implementation Plan

**Feature:** Issue-to-issue dependency management (blocks, is blocked by, duplicates, relates to)  
**Target location:** Project Hub > Issue Detail > Side panel "Dependencies" sub-item  
**Scope:** Create, read, delete dependencies within a project context  
**Estimated complexity:** Medium (requires custom graph rendering for timeline view)  
**Timeline estimate:** 3-4 weeks for MVP (modal + table view; timeline deferred)

---

## 1. Summary of Jira Dependency Behavior

The Jira dependencies feature allows users to create and visualize relationships between work items to model project sequencing and identify blockers.

**Key behaviors:**
- **Add modal:** User selects source issue + relationship type (blocks/is blocked by/etc.) + target issue
- **Timeline view:** Visual graph showing issues as cards with connecting lines
- **Table view:** Hierarchical table with aggregated dependency counts per issue
- **Context actions:** Inline "Add dependency" and "Remove" options
- **Scope:** Dependencies are plan/scenario-scoped (not global to Jira)

---

## 2. Evidence-Backed UI/UX Requirements

### Functional Requirements

1. **Create dependency:**
   - ✅ Modal dialog with 3 fields: source issue, relationship type, target issue
   - ✅ Async search for both issue fields (scope to current project)
   - ✅ Add button disabled until both issues selected
   - ✅ Relationship type defaulted to "blocks"
   - ✅ Cancel/Add buttons with clear affordance

2. **View dependencies (table view):**
   - ✅ Hierarchical table: project > type > items
   - ✅ Columns: work item, count (blocked by), count (blocks), priority, dates, team
   - ✅ Counts aggregate at parent levels
   - ✅ Expand/collapse groups (chevron toggle)

3. **View dependencies (timeline view - MVP candidate for deferral):**
   - ✅ Graph visualization with issue cards and dependency lines
   - ⚠️ Hover actions (context menu with Add/Remove/Filter/Highlight)
   - ⚠️ Toolbar filters (Roll-up, Group by, etc.)
   - ⚠️ Line labels (relationship type)

4. **Remove dependency:**
   - ✅ Hover action or context menu "Remove"
   - ✅ Likely confirmation (not shown in screenshot, but standard pattern)
   - ✅ Dependency removed from view

5. **Search/filter:**
   - ✅ Issue selector async search (pre-filtered by project scope)
   - ✅ Results show: icon + key + summary
   - ✅ Type-to-filter behavior

### Non-Functional Requirements

1. **Accessibility (WCAG 2.1 AA):**
   - Modal has `aria-modal="true"` and clear focus management
   - Form fields have labels and error states
   - Keyboard navigation (Tab, Escape, Enter)
   - Screen reader support for counts and badges

2. **Performance:**
   - Search results load in <500ms
   - Table renders 1000+ rows smoothly (virtualization if needed)
   - Timeline render time <2s even with 100+ dependencies

3. **Responsiveness:**
   - Modal scales on mobile (likely full-screen on <600px viewports)
   - Table re-flows to single-column on small screens (not observed, assumed)
   - Timeline may not be optimal on mobile (candidate for hiding on small screens)

---

## 3. Catalyst Routes & Screens Affected

### New Routes

| Route | Component | Purpose |
|---|---|---|
| `/project-hub/:key/dependencies` | `DependenciesPage` | Dedicated dependencies view (if needed) |
| (modal route) | `AddDependencyModal` | Mounted on issue detail view |

### Modified Routes/Components

| Component | Change | Reason |
|---|---|---|
| `CatalystViewBase` | Add "Dependencies" side panel item | Issue detail view entry point |
| `IssueDetailSidebar` | Add "Dependencies" link/button | Navigate to dependencies view |
| `DependenciesPanel` | New component | Side panel showing issue's dependencies |
| `DependenciesTable` | New component | Hierarchical table of dependencies |
| `DependencyCard` | New component | Timeline/graph card (for timeline view) |
| `DependencyGraph` | New component | SVG/canvas rendering of dependency graph |

---

## 4. Catalyst Components to Reuse

| Atlaskit Component | Usage | Notes |
|---|---|---|
| `@atlaskit/modal-dialog` | Add dependency modal | Standard for modals in Catalyst |
| `@atlaskit/select` | Issue picker (source/target) | AsyncSelect for search |
| `@atlaskit/button` | Add/Cancel/Reset buttons | Standard button component |
| `@atlaskit/dynamic-table` | Dependency list table | Supports grouping/hierarchies |
| `@atlaskit/dropdown-menu` | Context menus | Add/Remove/Filter actions |
| `@atlaskit/lozenge` | Status badges | For priority display |
| `@atlaskit/spinner` | Loading state | During search/save |
| `JiraIssueTypeIcon` | Issue type indicators | From Catalyst's icon library |
| `CatalystViewBase` | Detail view shell | Reuse existing pattern |

---

## 5. New Catalyst Components Required

| Component | Purpose | Complexity |
|---|---|---|
| `AddDependencyModal` | Modal for creating dependencies | Medium (form + async search) |
| `DependencyRow` | Single dependency in table | Low |
| `DependencyTable` | Hierarchical list of dependencies | Medium (grouping logic) |
| `DependencyCard` | Issue card in timeline view | Medium (positioning, styling) |
| `DependencyGraph` | SVG/canvas graph renderer | High (graph layout algorithm) |
| `DependenciesPanel` | Side panel wrapper | Low |
| `DependencyContextMenu` | Hover actions menu | Low |

### Component Dependency Graph

```
DependenciesPage
├── DependencyTable
│   ├── DependencyRow (recurse for nesting)
│   └── DependencyContextMenu
├── DependencyGraph (timeline view)
│   ├── DependencyCard (× many)
│   └── SVG layer (lines, labels)
└── AddDependencyModal
    ├── @atlaskit/select (async source)
    ├── @atlaskit/select (relationship type)
    └── @atlaskit/select (async target)
```

---

## 6. Data Model Proposal

### Supabase Tables

#### `dependencies` (Core table)

```sql
CREATE TABLE public.dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_key TEXT NOT NULL,          -- Scope to project (e.g., "BAU")
  source_issue_key TEXT NOT NULL,     -- Source issue (e.g., "BAU-5757")
  relationship_type TEXT NOT NULL,    -- 'blocks' | 'is_blocked_by' | 'duplicates' | 'relates_to'
  target_issue_key TEXT NOT NULL,     -- Target issue (e.g., "BAU-5758")
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,             -- Soft delete for audit trail
  
  CONSTRAINT source_not_target CHECK (source_issue_key != target_issue_key),
  UNIQUE (project_key, source_issue_key, relationship_type, target_issue_key, COALESCE(deleted_at, '1970-01-01'::timestamptz))
);

CREATE INDEX idx_dependencies_project ON public.dependencies(project_key);
CREATE INDEX idx_dependencies_source ON public.dependencies(source_issue_key);
CREATE INDEX idx_dependencies_target ON public.dependencies(target_issue_key);
CREATE INDEX idx_dependencies_created_by ON public.dependencies(created_by);
```

#### `dependency_counts` (Materialized view for performance)

```sql
CREATE MATERIALIZED VIEW public.dependency_counts AS
SELECT 
  project_key,
  issue_key,
  COUNT(CASE WHEN relationship_type = 'blocks' THEN 1 END) AS blocks_count,
  COUNT(CASE WHEN relationship_type = 'is_blocked_by' THEN 1 END) AS blocked_by_count,
  MAX(updated_at) AS last_updated
FROM public.dependencies
WHERE deleted_at IS NULL
GROUP BY project_key, issue_key;

CREATE INDEX idx_dependency_counts_issue ON public.dependency_counts(project_key, issue_key);
```

### TypeScript Types

```typescript
interface Dependency {
  id: string;
  project_key: string;
  source_issue_key: string;
  relationship_type: 'blocks' | 'is_blocked_by' | 'duplicates' | 'relates_to';
  target_issue_key: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

interface DependencyCountSummary {
  issue_key: string;
  blocks_count: number;
  blocked_by_count: number;
}
```

---

## 7. Supabase RLS Policies

```sql
-- Users can view dependencies for issues in their accessible projects
CREATE POLICY "Users can view dependencies in their projects"
  ON public.dependencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ph_projects p
      WHERE p.key = dependencies.project_key
      AND EXISTS (
        SELECT 1 FROM public.ph_project_members m
        WHERE m.project_id = p.id AND m.user_id = auth.uid()
      )
    )
  );

-- Users can create dependencies if they can edit the project
CREATE POLICY "Users can create dependencies in editable projects"
  ON public.dependencies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ph_projects p
      WHERE p.key = dependencies.project_key
      AND EXISTS (
        SELECT 1 FROM public.ph_project_members m
        WHERE m.project_id = p.id AND m.user_id = auth.uid() AND m.role IN ('editor', 'admin')
      )
    )
  );

-- Users can delete dependencies they created or if they're project admins
CREATE POLICY "Users can delete their dependencies or as admins"
  ON public.dependencies FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.ph_projects p
      WHERE p.key = dependencies.project_key
      AND EXISTS (
        SELECT 1 FROM public.ph_project_members m
        WHERE m.project_id = p.id AND m.user_id = auth.uid() AND m.role = 'admin'
      )
    )
  );
```

---

## 8. API/Service Layer Changes

### New Service: `DependencyService`

```typescript
// src/services/dependencies.ts

export class DependencyService {
  // Create dependency
  async createDependency(dep: Omit<Dependency, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<Dependency>
  
  // Get dependencies for an issue
  async getDependenciesForIssue(projectKey: string, issueKey: string): Promise<Dependency[]>
  
  // Get all dependencies in project (for table/timeline view)
  async getDependenciesInProject(projectKey: string): Promise<Dependency[]>
  
  // Delete dependency
  async deleteDependency(dependencyId: string): Promise<void>
  
  // Get counts for an issue
  async getIssueDependencyCounts(projectKey: string, issueKey: string): Promise<DependencyCountSummary>
  
  // Search issues (for modal autocomplete)
  async searchIssues(projectKey: string, query: string): Promise<WorkItem[]>
}
```

### New Hooks: `useDependencies`

```typescript
// src/hooks/dependencies/useDependencies.ts

export function useDependencies(projectKey: string) {
  // Get all dependencies
  const { data: dependencies, isLoading, error } = useQuery([...], ...)
  
  // Create dependency mutation
  const { mutate: createDependency, isPending } = useMutation([...])
  
  // Delete dependency mutation
  const { mutate: deleteDependency, isPending } = useMutation([...])
  
  // Dependency counts for issue
  const getCounts = (issueKey: string) => { ... }
  
  return { dependencies, createDependency, deleteDependency, getCounts, isLoading, isPending, error }
}

export function useIssueDependencies(projectKey: string, issueKey: string) {
  // Get dependencies for specific issue
  const { data, isLoading } = useQuery([...])
  return { dependencies: data, isLoading }
}
```

---

## 9. Frontend State Management

### React Query / TanStack Query

```typescript
// Cache keys
const dependencyKeys = {
  all: ['dependencies'] as const,
  byProject: (projectKey: string) => [...dependencyKeys.all, projectKey] as const,
  byIssue: (projectKey: string, issueKey: string) => [...dependencyKeys.byProject(projectKey), issueKey] as const,
  counts: (projectKey: string) => [...dependencyKeys.byProject(projectKey), 'counts'] as const,
}

// Invalidation on mutation:
// - Create: invalidate byProject, byIssue, counts
// - Delete: invalidate byProject, byIssue, counts
```

---

## 10. Add Dependency Modal Flow

### Component: `AddDependencyModal`

```typescript
function AddDependencyModal({ projectKey, isOpen, onClose, onSuccess }: Props) {
  const [sourceKey, setSourceKey] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<RelationType>('blocks');
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { mutate: createDependency, isPending: isSaving } = useDependencies(projectKey).createDependency;
  const { data: searchResults, isLoading: isSearching } = useSearchIssues(projectKey, searchQuery);
  
  const isFormValid = sourceKey && targetKey && sourceKey !== targetKey;
  
  const handleSubmit = async () => {
    await createDependency({
      project_key: projectKey,
      source_issue_key: sourceKey,
      relationship_type: relationType,
      target_issue_key: targetKey
    }, {
      onSuccess: () => {
        onClose();
        onSuccess?.();
      }
    });
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add dependency">
      <Form>
        <IssueSelect
          label="Source Issue"
          value={sourceKey}
          onChange={setSourceKey}
          searchResults={searchResults}
          isLoading={isSearching}
          onSearch={setSearchQuery}
        />
        <RelationTypeSelect
          value={relationType}
          onChange={setRelationType}
        />
        <IssueSelect
          label="Target Issue"
          value={targetKey}
          onChange={setTargetKey}
          searchResults={searchResults}
          isLoading={isSearching}
          onSearch={setSearchQuery}
        />
      </Form>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button appearance="primary" isDisabled={!isFormValid || isSaving} onClick={handleSubmit} isLoading={isSaving}>
          Add
        </Button>
      </ModalFooter>
    </Modal>
  );
}
```

---

## 11. Remove Dependency Flow

### Pattern: Context Menu

```typescript
function DependencyRow({ dependency, onRemove }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { mutate: deleteDependency, isPending } = useMutation(...);
  
  const handleRemove = () => {
    deleteDependency(dependency.id, {
      onSuccess: onRemove
    });
  };
  
  return (
    <>
      <Row>
        <Cell>{dependency.source_issue_key}</Cell>
        <Cell>{dependency.relationship_type}</Cell>
        <Cell>{dependency.target_issue_key}</Cell>
        <Cell>
          <DropdownMenu trigger={<Button>⋯</Button>}>
            <DropdownItem onClick={() => setShowConfirm(true)}>Remove</DropdownItem>
          </DropdownMenu>
        </Cell>
      </Row>
      {showConfirm && (
        <ConfirmDialog
          title="Remove dependency?"
          message={`Remove dependency: ${dependency.source_issue_key} ${dependency.relationship_type} ${dependency.target_issue_key}?`}
          onConfirm={handleRemove}
          onCancel={() => setShowConfirm(false)}
          isPending={isPending}
        />
      )}
    </>
  );
}
```

---

## 12. Search/Select Behavior

### Issue Selector Component

```typescript
function IssueSelect({ projectKey, value, onChange, isLoading }: Props) {
  const [input, setInput] = useState('');
  const { data: results } = useSearchIssues(projectKey, input);
  
  const options = results?.map(issue => ({
    label: `${issue.key} ${issue.summary}`,
    value: issue.key,
    icon: <JiraIssueTypeIcon type={issue.issue_type} />,
  })) || [];
  
  return (
    <Select
      isMulti={false}
      isAsync
      isLoading={isLoading}
      options={options}
      value={value ? options.find(o => o.value === value) : null}
      onChange={(option) => onChange(option?.value)}
      onInputChange={setInput}
      placeholder="Choose a work item..."
      filterOption={null}  // Use server-side search instead
    />
  );
}
```

---

## 13. Table View Structure

### DependencyTable Component

```typescript
interface GroupedDependencies {
  [issueType: string]: {
    count: number;
    items: DependencyRow[];
  };
}

function DependencyTable({ projectKey }: Props) {
  const { dependencies } = useDependencies(projectKey);
  const grouped = useMemo(() => groupByIssueType(dependencies), [dependencies]);
  
  return (
    <DynamicTable
      head={{
        cells: [
          { key: 'issue', content: 'Issue' },
          { key: 'blocks', content: 'Blocks' },
          { key: 'blocked_by', content: 'Blocked By' },
          { key: 'actions', content: '' },
        ]
      }}
      rows={createTableRows(grouped)}
      rowsPerPage={50}
    />
  );
}

function createTableRows(grouped: GroupedDependencies): Row[] {
  const rows: Row[] = [];
  
  Object.entries(grouped).forEach(([type, group]) => {
    // Group header row
    rows.push({
      key: `group-${type}`,
      cells: [
        { content: `${type} (${group.count})`, isExpanded: true },
        { content: null },
        { content: null },
        { content: null },
      ],
      isExpandable: true,
    });
    
    // Item rows
    group.items.forEach((dep, idx) => {
      rows.push({
        key: `${type}-${idx}`,
        cells: [
          { content: <IssueLink issueKey={dep.source_issue_key} /> },
          { content: dep.blocks_count },
          { content: dep.blocked_by_count },
          { content: <ContextMenu dependency={dep} /> },
        ],
      });
    });
  });
  
  return rows;
}
```

---

## 14. Error, Loading, & Empty States

### Loading state (modal save)

```tsx
<Button isLoading={isSaving} isDisabled={isSaving}>
  {isSaving ? 'Adding...' : 'Add'}
</Button>
```

### Empty state (no dependencies)

```tsx
{dependencies.length === 0 ? (
  <EmptyState
    icon={<LinkIcon />}
    title="No dependencies yet"
    description="Create a dependency to track issue relationships and avoid delays."
    action={<Button onClick={openModal}>Create dependency</Button>}
  />
) : (
  <DependencyTable ... />
)}
```

### Error state (save failed)

```tsx
{error && (
  <InlineMessage appearance="error" title="Failed to create dependency">
    {error.message}
  </InlineMessage>
)}
```

### Validation errors

```tsx
{sourceKey === targetKey && (
  <InlineMessage appearance="warning">
    Source and target issues cannot be the same.
  </InlineMessage>
)}
```

---

## 15. Permission Rules

### Who can view dependencies?
- Any project member can view dependencies for their projects

### Who can create dependencies?
- Project editors and admins only
- Both source and target issues must exist
- Must be in the same project (or related projects?)

### Who can delete dependencies?
- The user who created the dependency
- Project admins
- Never: auto-delete if issue is deleted (orphaned dependencies remain for audit)

---

## 16. Accessibility Requirements

1. **Modal accessibility:**
   - `aria-modal="true"` on modal dialog
   - `aria-labelledby` pointing to title
   - Focus trap (Tab stays within modal)
   - Escape key closes modal
   - First field focused on open

2. **Form accessibility:**
   - All inputs have associated `<label>` tags
   - Error states announced via `aria-invalid` and `aria-describedby`
   - Required fields marked with `aria-required="true"`

3. **Table accessibility:**
   - Table has `role="table"` or semantic `<table>` tag
   - Headers have `scope="col"`
   - Row groups have `role="rowgroup"`
   - Counts are text (not color-only)

4. **Keyboard navigation:**
   - Tab to navigate form fields
   - Arrow keys to navigate dropdown results
   - Enter to select
   - Escape to close dropdown or modal

---

## 17. RTL & Internationalization (deferred for MVP)

- **Not required for MVP**
- Plan for future:
  - Text strings in i18n keys (not hardcoded)
  - Flex layout (not left-only)
  - Icons should not contain text

---

## 18. Dark/Light Mode (deferred for MVP)

- **Use ADS tokens** for all colors (automatically dark-mode compatible)
- No custom hex values
- Icons and badges inherit theme via token system

---

## 19. Playwright Verification Plan

### Test scenarios:

```typescript
// Open modal
test('User can open Add dependency modal', async ({ page }) => {
  await page.click('[data-testid="add-dependency-button"]');
  await expect(page.locator('[role="dialog"]')).toBeVisible();
});

// Search issues
test('Search results appear when typing in source field', async ({ page }) => {
  const input = page.locator('[data-testid="source-issue-input"]');
  await input.fill('MMS');
  await expect(page.locator('[data-testid="search-result"]')).toBeTruthy();
});

// Create dependency
test('User can create dependency', async ({ page }) => {
  await selectIssue(page, 'source', 'MMS-13');
  await selectIssue(page, 'target', 'MMS-76');
  await page.click('[data-testid="add-button"]');
  await expect(page.locator('[data-testid="dependency-row"]')).toContainText('MMS-13');
});

// Remove dependency
test('User can remove dependency', async ({ page }) => {
  await page.hover('[data-testid="dependency-row"]');
  await page.click('[data-testid="remove-button"]');
  await page.click('[data-testid="confirm-remove"]');
  await expect(page.locator('[data-testid="dependency-row"]')).not.toBeVisible();
});

// Validation
test('Add button disabled until both issues selected', async ({ page }) => {
  const addButton = page.locator('[data-testid="add-button"]');
  await expect(addButton).toBeDisabled();
  
  await selectIssue(page, 'source', 'MMS-13');
  await expect(addButton).toBeDisabled();
  
  await selectIssue(page, 'target', 'MMS-76');
  await expect(addButton).toBeEnabled();
});

// Error handling
test('Error message shown on duplicate dependency', async ({ page }) => {
  // Create first dependency
  await createDependency(page, 'MMS-13', 'blocks', 'MMS-76');
  
  // Try to create duplicate
  await createDependency(page, 'MMS-13', 'blocks', 'MMS-76');
  
  await expect(page.locator('[role="alert"]')).toContainText('already exists');
});
```

---

## 20. Screenshot-Based Acceptance Criteria

### Modal dialog
- ✅ Title "Add dependency" visible
- ✅ Three form fields visible (source, type, target)
- ✅ Add button visible and disabled initially
- ✅ Search results appear when typing

### Table view
- ✅ Hierarchical grouping (by issue type)
- ✅ Dependency counts displayed
- ✅ Expand/collapse chevrons work
- ✅ Hover shows context menu

### Empty state
- ✅ Message "No dependencies yet" shown
- ✅ "+ Create dependency" button visible and clickable

### Success state
- ✅ Created dependency appears in table immediately
- ✅ Counts updated
- ✅ Modal closes

---

## 21. Risks & Unknowns

### High Risk

1. **Graph rendering performance:** Large dependency graphs (100+ items) may be slow in SVG. Mitigation: defer timeline view to Phase 2, use virtual/lazy rendering.

2. **Cyclic dependencies:** Users could create circular chains (A→B→C→A). Mitigation: validate on server-side before save.

3. **Orphaned dependencies:** If an issue is deleted in Jira, dependency still exists. Mitigation: soft delete in Catalyst, sync job to clean up.

### Medium Risk

1. **Search scope ambiguity:** Should search include all issues or only those "valid" for dependencies? Mitigation: clearly document scope in help text.

2. **Timeline view complexity:** Different graph layout algorithms (ELK vs. D3 vs. custom) have different trade-offs. Mitigation: defer timeline to MVP 2, choose library based on perf testing.

3. **RLS edge cases:** Multi-project dependencies (A in project X depends on B in project Y) may have permission gaps. Mitigation: clarify scope (single project only for MVP).

### Low Risk

1. **UI responsiveness:** Modal may need adjustments on mobile. Mitigation: test on small screens early.

2. **Accessibility gaps:** Screen reader testing may reveal unlabeled elements. Mitigation: manual a11y audit before shipping.

---

## 22. Decisions Needed from Product

1. **Scope:** Single project only, or cross-project dependencies?
2. **Timeline view:** Include in MVP or defer to Phase 2?
3. **Relationship types:** Which relationship types to support? (blocks, is_blocked_by only, or add duplicates/relates_to?)
4. **Cyclic prevention:** Block A→B if B→A exists?
5. **Self-reference:** Allow A→A or block it?
6. **Soft delete:** Keep deleted dependencies in DB (audit trail) or hard delete?
7. **Graph layout:** Which algorithm/library for timeline view? (ELK, D3, Cytoscape, custom)

---

## 23. Implementation Phases

### Phase 1 (MVP) — 2 weeks

- ✅ Add dependency modal
- ✅ Dependency table (hierarchical, no timeline)
- ✅ Remove dependency
- ✅ Basic RLS and validation
- ✅ Playwright tests
- ✅ Unit tests for DependencyService

### Phase 2 — 2 weeks

- ⚠️ Timeline/graph view
- ⚠️ Advanced filters (Roll-up, Group by)
- ⚠️ Bulk operations
- ⚠️ Performance optimization (memoization, virtualization)

### Phase 3 — Future

- ⚠️ Cross-project dependencies
- ⚠️ Dependency path visualization
- ⚠️ Export/import dependencies
- ⚠️ Dependency templates

---

## 24. Files to Create/Modify

### New files:

```
src/components/dependencies/
├── AddDependencyModal.tsx
├── DependencyTable.tsx
├── DependencyRow.tsx
├── DependencyContextMenu.tsx
├── DependencyCard.tsx (timeline view)
├── DependencyGraph.tsx (timeline view)
├── __tests__/
│   ├── AddDependencyModal.test.ts
│   ├── DependencyTable.test.ts
│   └── DependencyRow.test.ts

src/hooks/dependencies/
├── useDependencies.ts
├── useIssueDependencies.ts
└── useSearchIssues.ts

src/services/
├── dependencyService.ts

src/pages/project-hub/
├── DependenciesPage.tsx (new or integrated into issue detail)

supabase/migrations/
├── 20260624_create_dependencies_table.sql
└── 20260624_create_dependency_counts_view.sql
```

### Modified files:

```
src/routes/FullAppRoutes.tsx  # Add dependencies route
src/components/layout/ReleaseHubSidebar.tsx  # Add dependencies link if applicable
src/pages/project-hub/ReleasesPage.tsx  # Add dependencies panel if integrated
```

