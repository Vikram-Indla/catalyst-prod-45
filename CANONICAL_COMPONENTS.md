# Canonical Components — Impact & Change Rules

## Purpose
This document enforces that **any structural or behavioral change to a canonical component must propagate to ALL consumers**, with data/content varying per use case.

---

## Discoverability surface: `/admin/components` (shipped 2026-05-17)

The component library is now browseable at **`/admin/components`** under the new **Design system** admin pocket (which also consolidates `/admin/icons` + `/admin/avatars`).

| Tab | What it surfaces |
|---|---|
| **Inventory** | 10 canonical entries seeded from this file + auto-discovered Atlaskit + internal primitives (~504 atlaskit + ~3,292 internal observed). Side-nav by category (atoms / molecules / organisms / pages / patterns), spec card on the right with file path, JSDoc, feature flags, ADS origin link, live preview (light + dark), and consumer file list. |
| **Banned** | All 8 permanently-banned items (MDT Ref, Service Now#, Assessment Feature, Story Points, Development, Automation, AI Sparkles, Notion) with CLAUDE.md anchor + live-reference count (green ✓ at 0, red ⚠ INVESTIGATE otherwise). |
| **Violations** | Live scan of ADS-compliance defects (`scripts/scan-ads-violations.ts`) — hand-rolled dropdowns, deprecated shim imports, banned imports, primitive duplication. Sortable by severity (P0/P1/P2) and category. Each row is a VS Code deep link. |
| **Cascade** | Pick a component + change kind (patch/minor/major) → see every consumer that will be affected. Tick off as reviewed. Copy a markdown checklist into the PR description. Cascade discipline = Rule 2's "audit impact across all consumers" rule, mechanized. |

**Data sources:**
- `src/registry/components.registry.ts` — curated source of truth (10 canonical + 8 banned). **Hand-edit to add a new canonical component.**
- `src/registry/usage-map.generated.ts` — AST scan output. Run `npm run scan:components` after touching imports.
- `src/registry/ads-violations.generated.ts` — violation scan output. Run `npm run scan:ads-violations` after a fix.

**Cascade-change protocol enshrined:**
1. Bump the component's `version` in `components.registry.ts` (patch/minor/major per the kind of change).
2. Open `/admin/components` → Cascade tab → pick the component → pick the change kind.
3. Tick every consumer as you review them.
4. Click "Copy markdown checklist" → paste into your PR description.
5. Reviewer verifies the checklist matches the diff before approving.

v2 candidates (logged in [active/preflight-handover-2026-05-17-admin-components-v1.md](active/preflight-handover-2026-05-17-admin-components-v1.md)): props-knobs sandbox · Storybook embed · Chromatic visual regression · ts-morph codemod path · build-time `npm run scan:components` in CI · component telemetry.

---

## Core Governance Rules (2026-05-17)

### Rule 1: Feature Flags Declare Intent
When a canonical component has optional features (e.g., group create affordance, sticky footer, column reordering), expose those as **feature flag props** at the canonical level, NOT as scattered consumer-specific implementations.

**Bad Pattern** (Silent Divergence):
```typescript
// BacklogPage doesn't use group create, so just doesn't pass onAddToGroup
<JiraTable ... />  // No group create

// RequestTable also doesn't use group create, for different reasons, also doesn't pass it
<JiraTable ... />  // No group create
// Both consumers end up with no group create, but for hidden reasons
```

**Good Pattern** (Explicit Intent):
```typescript
// BacklogPage: explicit flag says "no group create, yes sticky footer"
<JiraTable
  ...
  enableGroupCreateButton={false}
  enableStickyCreateFooter={true}
/>

// RequestTable: explicit flag says "no group create, no sticky footer"
<JiraTable
  ...
  enableGroupCreateButton={false}
  enableStickyCreateFooter={false}
/>
```

**Why:** Code reviewers can instantly see each consumer's intent. Future developers won't accidentally assume "if prop is omitted, feature is disabled" — the flags are explicit. This prevents silent divergence where two consumers have identical outcomes via different code paths.

### Rule 2: Audit Impact Across All Consumers
Before shipping a change to a canonical component, list all consumers and verify the impact:

```
# Canonical change: "Add AI Improve button to JiraTable header"
Impact audit:
- BacklogPage: Will show button ✓ (desired)
- RequestTable: Will show button (undesired — product backlog has different UX)
- SubtasksPanel: Will show button (need to verify — detail context OK?)
---
Action: Add `enableAiImprove={true/false}` feature flag to prevent unintended surface changes
```

### Rule 3: Consumer Changes Require Canonical Backfill
If a consumer needs custom behavior that isn't exposed via the canonical component's feature flags, **add the feature flag first** rather than working around it in the consumer.

```typescript
// Bad: Custom logic in consumer to hide a feature
export function RequestTable(props) {
  const [showAiButton, setShowAiButton] = useState(false);  // Hidden by consumer logic
  return <JiraTable ... />;
}

// Good: Use feature flag on canonical component
export function RequestTable(props) {
  return <JiraTable ... enableAiImprove={false} />;  // Explicit, canonical-controlled
}
```

---

## 1. JiraTable
**Location:** `/src/components/shared/JiraTable/`

**Canonical Exports:**
- `JiraTable` (main component)
- `Column<TRow>`, `RowGroup<TRow>`, `JiraTableProps<TRow>` (types)
- Cell renderers from `cells.tsx`
- Cell editors from `editors.tsx`
- `BulkFooterBar` (bulk action affordance)

**7 Active Consumer Files (as of 2026-05-17):**

| Consumer | Module | Purpose | Feature Flags |
|----------|--------|---------|---|
| `BacklogPage.atlaskit.tsx` | project-work-hub > pages | Project backlog (stories, tasks, epics) | enableGroupCreateButton=false, enableStickyCreateFooter=true |
| `StoryBacklogPage.atlaskit.tsx` | project-work-hub > pages | Backlog grouped/sorted by story status | enableGroupCreateButton=false, enableStickyCreateFooter=false |
| `RequestTable.tsx` | producthub > listing | Product/Investor-Journey request list | enableGroupCreateButton=false, enableStickyCreateFooter=false |
| `ProductBacklogListTable.tsx` | product-backlog > components | Product backlog list view | enableGroupCreateButton=false, enableStickyCreateFooter=false |
| `UWVTable.tsx` | universal-work-view | Universal work view table (all types) | enableGroupCreateButton=false, enableStickyCreateFooter=false |
| `SubtasksPanel/index.tsx` | project-work-hub > components | Subtasks inline list in detail view | enableGroupCreateButton=false, enableStickyCreateFooter=false |
| `IncidentListPage.tsx` | pages > incidenthub | Incident management list | enableGroupCreateButton=false, enableStickyCreateFooter=false |

**Future/Hypothetical Consumers** (mentioned in prior planning, not yet implemented):
- CreateStoryModal, CreateBusinessRequestModal, BrArabicTitleSection, BrAttachmentsSection, AddPeopleModal, useCreateStory (when these features are built)

**Feature Toggles (Props) — CANONICAL LEVEL:**

All inline-create and sticky-footer behavior **MUST be controlled via props in JiraTable.tsx**, not scattered across consumers:

```typescript
interface JiraTableProps<TRow> {
  // ... existing props
  
  // Group create affordances (default: false)
  enableGroupCreateButton?: boolean;
  renderGroupInlineRow?: (groupId: string) => ReactNode | null;
  onAddToGroup?: (groupId: string) => void;
  
  // Sticky footer create affordance (default: false)
  enableStickyCreateFooter?: boolean;
  stickyCreateFooter?: {
    placeholder?: string;
    onActivate: () => void;
    active: ReactNode | null;
  };
  
  // Other features
  enableBulkSelect?: boolean;
  enableColumnReorder?: boolean;
  enableVirtualization?: boolean;
  // ... etc
}
```

**Change Impact Rule:**

If you modify:
- ✅ **Props interface** → must document impact on all 14 consumers
- ✅ **Cell renderer output** (e.g. status pill colors, type icons) → all consumers see it
- ✅ **Sorting/filtering behavior** → all consumers affected
- ✅ **Keyboard navigation** → all consumers affected
- ⚠️ **Default feature flags** → might need to override in specific consumers
- ⚠️ **Row height/density** → check all consumers for visual regression

**Last Changes:**
- 2026-05-17: Removed `renderGroupInlineRow` + `onAddToGroup` from BacklogPage.atlaskit.tsx (commit 9c9322f90)
  - **Impact Audit:** RequestTable never used these props, so no change needed there. But this highlights the gap: both consumers now have no inline create, but for different reasons.
  - **Recommended Fix:** Move feature toggle to JiraTable.tsx so both consumers declare intent explicitly.

---

## 2. CanonicalDescriptionField
**Location:** `/src/components/shared/CanonicalDescriptionField/`

**Canonical Exports:**
- `CanonicalDescriptionField` (main component)
- Description editing + rendering logic

**7 Consumer Files:**

| Consumer | Module | Purpose |
|----------|--------|---------|
| `useCanonicalDescription.ts` | hooks | Hook wrapping field behavior |
| `descriptionApi.ts` | lib | API layer for description persistence |
| `DescriptionEditor.tsx` | components > backlog | Backlog detail description editor |
| `IncidentDescription.tsx` | components > incidents | Incident description field |
| `TaskDescription.tsx` | modules > planner | Planner task description field |
| `DescriptionTab.tsx` | components > planner > task-modal | Task modal description tab |
| `FeatureDescription.tsx` | pages > project | Feature page description |

**Change Impact Rule:**

If you modify:
- ✅ **Editor UI** (toolbar, formatting) → all 7 consumers affected
- ✅ **Validation** (character limits, required state) → all consumers enforced
- ✅ **Serialization** (Markdown format, syntax) → breaking change risk
- ⚠️ **API integration** → check descriptionApi.ts for impact

---

## 3. rich-text (AtlaskitEditor wrapper)
**Location:** `/src/components/shared/rich-text/`

**Canonical Exports:**
- Rich text editor component
- Rendering library (Atlaskit Renderer)

**9 Consumer Files:**

| Consumer | Module | Purpose |
|----------|--------|---------|
| `AtlaskitEditor.tsx` | components > shared | Shared editor wrapper |
| `CatalystDescriptionSection.tsx` | catalyst-detail-views > shared > sections | Issue description rendering |
| `LinkedWorkItemsSection.tsx` | project-work-hub > components | Linked work item descriptions |
| `WorkItemDetailsDrawer.tsx` | project-work-hub > components | Detail drawer content |
| `IssueContentView.tsx` | workhub > issue-view | Work item content view |
| `CreateStoryModal.tsx` | workhub > create-story | Story creation editor |
| `ConfluenceEditor.tsx` | knowledge-hub > editor | Confluence sync editor |
| `CreateDocumentDialog.tsx` | knowledge-hub | Document creation dialog |
| `KnowledgeHubDocumentPage.tsx` | pages | Document page rendering |

**Change Impact Rule:**

If you modify:
- ✅ **Markdown rendering** (syntax, tags) → all consumers affected
- ✅ **Styling** (colors, fonts, spacing) → visual regression on all 9 surfaces
- ⚠️ **Confluence sync** (schema, format) → only KnowledgeHub surfaces affected

---

## 4. jira-description-editor
**Location:** `/src/components/shared/jira-description-editor/`

**Status:** Low usage (1 consumer). Audit needed to determine if truly canonical or candidate for removal.

---

## 5. dynamic-table
**Location:** `/src/components/shared/dynamic-table/`

**Status:** Deprecated/legacy. Only `StoryBacklogPage.tsx` uses it. **Recommend migrating to JiraTable**.

---

## Enforcement Rules

### Rule 1: Feature Parity Across Consumers
Any feature controlled by a **canonical prop** (e.g. `enableInlineGroupCreate`) must work consistently across all consumers. If one consumer needs a different behavior, that's a signal to either:

a) **Move the toggle to the canonical component** (if it's cross-cutting)
b) **Create a consumer-specific wrapper component** (if it's consumer-specific)

❌ **Bad:** BacklogPage removes `renderGroupInlineRow` prop; RequestTable never had it. Silent divergence.

✅ **Good:** JiraTable declares `enableGroupCreateButton: boolean` prop. BacklogPage passes `true`, RequestTable passes `false` or omits it (default `false`).

---

### Rule 2: Change Impact Checklist

Before merging ANY change to a canonical component:

```markdown
## Canonical Component Change Checklist

- [ ] **Modified file:** `/src/components/shared/[COMPONENT]/`
- [ ] **Type of change:** (structural prop / behavior / styling / types)
- [ ] **Consumers audited:** Listed below
- [ ] **Impact on each consumer:** Tested or N/A
- [ ] **Backwards compatibility:** Breaking or non-breaking?
- [ ] **Feature flag added to canonical if needed:** Yes/No
- [ ] **All consumers reviewed:** Code review + visual regression test

### Consumers Reviewed:
- [ ] Consumer 1: `path/to/File.tsx` → tested / not affected
- [ ] Consumer 2: `path/to/File.tsx` → tested / not affected
- [ ] ...
```

---

### Rule 3: Breaking Changes Require Feature Flags

If a change to the canonical component is breaking, add a **feature flag prop**:

```typescript
// BAD: just remove a prop
// JiraTable prop: stickyCreateFooter removed

// GOOD: add a feature flag
// JiraTable prop: enableStickyCreateFooter?: boolean (default: false)
```

Then each consumer declares their intent:
```typescript
// BacklogPage
<JiraTable enableStickyCreateFooter={true} stickyCreateFooter={{...}} />

// RequestTable
<JiraTable enableStickyCreateFooter={false} /> // or omit (default false)
```

---

### Rule 4: Canonical Components Must Export Types

All canonical components **must export their type interfaces** for consumers:

```typescript
// src/components/shared/JiraTable/index.ts
export { JiraTable } from './JiraTable';
export type { JiraTableProps, Column, RowGroup, SortOrder, CellProps } from './types';
```

✅ This forces type-safe usage across all consumers.

---

### Rule 5: Document Per-Consumer Deviations

If a consumer diverges from the canonical behavior, document it explicitly:

```typescript
// src/components/producthub/listing/RequestTable.tsx

/**
 * RequestTable wraps JiraTable with ProductHub-specific behavior:
 * 
 * DEVIATIONS FROM CANONICAL:
 * - ❌ No inline group create (renderGroupInlineRow not passed)
 * - ❌ No sticky footer create (stickyCreateFooter not passed)
 * - ✅ Custom column definitions (initiative_key, roadmap status, etc.)
 * - ✅ Custom MDT→INV key transformation
 * 
 * SHARED BEHAVIORS:
 * - ✅ Sort/filter/group (all canonical features)
 * - ✅ Column visibility picker
 * - ✅ Column width persistence
 * - ✅ Bulk select footer
 */
```

---

## Testing Strategy

### Unit-Level: Canonical Component Tests
Test the canonical component in isolation:
```typescript
// src/components/shared/JiraTable/__tests__/JiraTable.test.tsx
describe('JiraTable', () => {
  it('renders with default props (no create affordances)', () => { ... });
  it('renders inline group create when enableGroupCreateButton=true', () => { ... });
  it('renders sticky footer when enableStickyCreateFooter=true', () => { ... });
});
```

### Integration-Level: Consumer Impact Tests
After canonical changes, spot-check all 14 JiraTable consumers:
```bash
# Quick regression check script
for consumer in \
  BacklogPage \
  RequestTable \
  ProductBacklogListTable \
  UWVTable \
  SubtasksPanel \
  IncidentListPage; do
  echo "Testing $consumer..."
  # Visual regression or screenshot diff
done
```

---

## Audit Timeline

| Date | Canonical | Change | Consumers Checked | Status |
|------|-----------|--------|-------------------|--------|
| 2026-05-17 | JiraTable | Removed renderGroupInlineRow + onAddToGroup from BacklogPage | ⚠️ Incomplete | Backlog: no inline create. RequestTable: never had it. Recommend: move toggle to canonical. |
| 2026-04-28 | JiraTable | StatusPill typography changes | 14 checked | ✅ All consumers see change |
| 2026-05-10 | CanonicalDescriptionField | Validator guard added | 7 checked | ✅ All consumers enforced |

---

## Next Steps

1. **Move inline-create controls to JiraTable canonical**
   - Add `enableGroupCreateButton?: boolean` prop
   - Add `enableStickyCreateFooter?: boolean` prop
   - Update BacklogPage and RequestTable to declare intent explicitly

2. **Audit remaining canonical components** (CanonicalDescriptionField, rich-text)
   - Document all consumers
   - Add feature flags where needed
   - Create regression test script

3. **Enforce change checklist**
   - Add to PR template: "Canonical Component Change Checklist"
   - Require audit of all consumers before merge

4. **Deprecate/migrate legacy tables**
   - `dynamic-table`: Migrate StoryBacklogPage.tsx to JiraTable
   - `jira-description-editor`: Consolidate into CanonicalDescriptionField

