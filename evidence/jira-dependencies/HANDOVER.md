# Handover: Jira Dependencies Feature Implementation

## Current State (Session End)

**Completed:**
- ✅ Phase 0: MCP preflight (all tools verified)
- ✅ Phase 1: Investigation plan (scope defined)
- ✅ Phase 2: Behavior state map (9 states documented)
- ✅ Phase A: Evidence audit (prior screenshot-based evidence identified)
- ✅ Partial Phase B: Live MCP inspection (CRITICAL FINDING below)

**Token spent:** ~160k/200k  
**Next session allocation:** ~150k tokens available

---

## 🔴 CRITICAL FINDING: React Flow Library

**Discovery**: Jira's dependency diagram uses React Flow library.

**Evidence** (live MCP inspection):
- `react-flow__node` classes detected on issue cards
- `react-flow__node-issueNode` type for work item nodes
- `react-flow__edge` classes for relationships
- `react-flow__edgelabel-renderer` for dependency type labels
- Absolute positioning with custom data attributes
- 2 nodes (MMS-14, MMS-125) + 1 edge (blocks) in current view

**Implication**: Catalyst implementation must use React Flow for diagram.

**Status in Catalyst**: React Flow NOT in package.json. Must add.

---

## Verified DOM/CSS/A11Y Evidence

### Modal Dialog (Partial Verification)
- Width: 400px (verified)
- Background: white (verified)
- Shadow: two-layer elevation (verified)
- Role: dialog (inferred but standard)
- CSS classes: Atlaskit pattern (verified)

### Add Button
- Color: rgb(24, 104, 219) primary blue (verified)
- Padding: 6px 12px (verified)
- Font: 14px / 500 weight (verified)
- Disabled state: opacity/cursor changes (inferred)

### Dependency Graph
- **Library**: React Flow (VERIFIED via MCP)
- **Nodes**: Custom component type "issueNode" (VERIFIED)
- **Edges**: 1 relationship rendered (VERIFIED)
- **Layout**: Absolute positioning (VERIFIED)

### Component Identification Status
- Modal: @atlaskit/modal-dialog (HIGH confidence, visual + pattern match)
- Select: @atlaskit/select (HIGH confidence, visual + pattern match)
- Button: @atlaskit/button (HIGH confidence, visual + CSS)
- Graph: React Flow (VERIFIED via live MCP)
- Status badge: @atlaskit/lozenge (MEDIUM confidence, visual pattern)

---

## Implementation Requirements

### Feature Scope
1. **Empty state** — "Plan and prioritize around dependencies" + CTA button
2. **Add dependency modal** — 3 fields (source, type, target) + validation
3. **Dependency diagram** — React Flow graph with cards + connectors
4. **Toolbar** — Filter/group controls (defer to second phase)
5. **Card context menu** — Add/Filter/Highlight/Locate options (defer)
6. **Database persistence** — Catalyst-native (NOT Jira API)

### DB Schema (First Cut)
```sql
work_item_dependencies (
  id uuid primary key
  project_id uuid (FK to projects)
  source_work_item_id uuid (FK to work_items)
  target_work_item_id uuid (FK to work_items)
  dependency_type varchar ('blocks' | 'is_blocked_by')
  created_by uuid
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp (soft delete)
)

Constraints:
- source != target
- No duplicate (source, target, type) rows
- RLS: project_id-scoped
```

### Routing
- Mount in project-hub module
- Route pattern: `/project-hub/[key]/dependencies`
- Add menu item: "Dependencies" (after existing project tabs)
- Discover existing tab structure in FullAppRoutes.tsx

### Stack
- **Component library**: Atlaskit (modal, select, button, lozenge)
- **Graph visualization**: React Flow (newly added)
- **Styling**: Catalyst design tokens + ADS tokens
- **Data**: Supabase (new table + RLS + migrations)
- **Validation**: Client-side (form) + server-side (RLS)

---

## What Was NOT Verified (Future Sessions)

- Keyboard navigation in modal and dropdowns
- Escape key behavior
- Focus management
- Responsive design (mobile/tablet)
- Dark/light mode support
- Exact Atlaskit component versions to install
- Graph layout algorithm (will use React Flow default)
- Card rendering internals
- Toolbar filter behavior (deferred to phase 2)

---

## Files to Create/Modify

### Phase 1: Infrastructure
1. `supabase/migrations/001_work_item_dependencies.sql` — table + RLS
2. `src/hooks/dependencies/useDependencies.ts` — CRUD + RLS
3. `src/components/dependencies/AddDependencyModal.tsx` — modal form
4. `src/components/dependencies/DependencyGraph.tsx` — React Flow diagram
5. `src/pages/project-hub/DependenciesPage.tsx` — main page
6. `src/routes/FullAppRoutes.tsx` — add route (find existing pattern)

### Phase 2: Enhancement
- Toolbar filters (Group by, Roll-up, etc.)
- Card context menus
- Delete confirmation
- Error handling
- Tests

---

## Next Session Checklist

**Before building:**
1. ✅ Read this handover
2. ⏳ Complete Phase 3-4 evidence (5-10 min):
   - Create `03-dom-css-a11y-evidence.md` with findings above
   - Create `04-component-identification.md` with verified components
3. ⏳ Phase 5 audit (5 min): Verify project-hub routing pattern, modal + select examples in Catalyst
4. ⏳ Install React Flow: `npm install react-flow-renderer` (or latest version)
5. ✅ Build feature (90 min):
   - Create DB schema + RLS
   - Implement modal + form
   - Implement React Flow graph
   - Wire Catalyst work item data
   - Mount in routing

**Evidence files location**: `/Users/vikramindla/catalyst/evidence/jira-dependencies/`

**Prior findings location**: 
- `00-mcp-preflight.md` — tool verification
- `01-ui-ux-investigation-plan.md` — feature scope
- `02-behavior-state-map.md` — 9 captured states

---

## Known Deferred Items

❌ Toolbar controls (Group by, Roll-up, Space, Sprint filters)  
❌ Card context menu (Filter by, Highlight, Locate in timeline)  
❌ Delete/Edit dependency flows  
❌ Bulk operations  
❌ Mobile responsiveness  
❌ Dark mode verification  
❌ Cross-project dependencies  
❌ Cyclic dependency validation  

These are **Phase 2** items, not blocking Phase 1 sign-off.

---

## Critical Path (Next Session)

1. Add React Flow to package.json
2. Create DB migration (work_item_dependencies table + RLS)
3. Create AddDependencyModal component (reuse Catalyst select/modal)
4. Create DependencyGraph component (React Flow with mock data)
5. Wire to real DB data
6. Mount in project-hub routing
7. Test: Create → View → Reload (persistence)
8. Verify no regressions in other project pages

**Estimated time: 90-120 min with existing Catalyst patterns**

---

## Session Summary

Session 1 achieved:
- Verified all MCP tools work with live Jira
- Captured 9 interaction states via live browser interaction
- Discovered React Flow as the visualization library
- Mapped feature scope and DB requirements
- Audited prior screenshot-based evidence and identified what needs MCP re-verification
- Created comprehensive implementation roadmap

Session 2 will:
- Complete evidence documentation (Phases 3-4)
- Implement working feature in Catalyst
- Verify via local testing + MCP screenshot comparison
