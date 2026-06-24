# React Flow Discovery — Critical Finding for Diagram Implementation

**Date**: 2026-06-24 (discovered during Phase 5 Catalyst inventory audit)  
**Significance**: Changes component strategy for dependency diagram from "build custom SVG" to "reuse React Flow"

---

## Discovery Summary

While auditing Catalyst's `package.json` and codebase during Phase 5 inventory:

**Finding**: Catalyst has `@xyflow/react` v12.10.2 already installed in dependencies.

**Existing Use**: `CatalystWorkflowBuilder.tsx` (`/src/pages/admin/workflows/`) implements a full workflow status diagram using React Flow with:
- Custom node component (StatusNode)
- Custom edge component (with labels and styling)
- Background grid, Controls, and MiniMap
- Dark/light theme support
- Node selection, connection handling, state management

**Impact**: Dependencies diagram can follow the exact same architectural pattern, avoiding need for custom SVG or alternative graph library.

---

## Technical Details

### Package Information
- **Package**: `@xyflow/react`
- **Version**: 12.10.2
- **Status**: Production-ready (already in use in CatalystWorkflowBuilder)
- **License**: MIT/Apache (permissive for Catalyst use)

### What React Flow Provides

1. **Core Components**:
   - `ReactFlow` — main canvas container
   - `Background` — grid/dots background
   - `Controls` — zoom/pan controls
   - `MiniMap` — overview panel
   - `Handle` — connection points on nodes

2. **State Management**:
   - `useNodesState(initialNodes)` — state for all nodes + handlers
   - `useEdgesState(initialEdges)` — state for all edges + handlers
   - `useReactFlow()` — access to ReactFlow instance

3. **Custom Components**:
   - `NodeProps` — type for custom node components
   - `EdgeProps` — type for custom edge components
   - `BaseEdge` — base class for custom edges
   - `EdgeLabelRenderer` — render edge labels

4. **Features**:
   - Drag-and-drop nodes
   - Pan and zoom
   - Node/edge selection and interaction
   - Customizable styling (CSS classes, inline styles)
   - TypeScript support

---

## Implementation Strategy: Adapt CatalystWorkflowBuilder Pattern

### Reference File
Location: `/src/pages/admin/workflows/CatalystWorkflowBuilder.tsx`

Key sections to reference:
1. **Node definition and rendering** (lines 73-100+) — StatusNode component
2. **Edge definition** — Custom edge with labels
3. **Dark palette and colors** (lines 44-71) — NODE_COLORS map
4. **State management** — useNodesState, useEdgesState
5. **Styling** — CSS for react-flow__* classes
6. **Controls and background** — standard React Flow UI

### Adaptation Plan for Dependencies

#### 1. Create WorkItemNode Component
**Based on**: StatusNode from CatalystWorkflowBuilder

**Differences**:
- Display work item data: issue key, title, status badge (not just status name)
- Node width: ~250px (larger to show full issue title)
- Node height: ~100px (accommodate icon + key + title + status)
- Colors: Use issue type icon colors (story=blue, bug=red, etc.)
- No "initial status" concept (different domain)

**Structure**:
```tsx
function WorkItemNode({ data, selected }: NodeProps) {
  const d = data as {
    key: string;
    title: string;
    status: string;
    issueType: string;
    avatarUrl?: string;
  };
  // Render: icon + key + title + status badge
}
```

#### 2. Create DependencyEdge Component
**Based on**: Edge rendering in CatalystWorkflowBuilder

**Differences**:
- Label: "blocks" or "is blocked by" (not status transition name)
- Arrow: Solid arrow with triangle marker (direction matters)
- Styling: Single-color lines with label badge

**Structure**:
```tsx
function DependencyEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({...});
  // Render: bezier curve + label badge ("blocks" or "is blocked by")
}
```

#### 3. Dependency Diagram View Component
**Pattern**: Similar to ReactFlow wrapper in CatalystWorkflowBuilder

**Structure**:
```tsx
function DependencyDiagram({ dependencies }: { dependencies: Dependency[] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  return (
    <ReactFlow nodes={nodes} edges={edges} onNodesChange={...} onEdgesChange={...}>
      <Background variant="dots" />
      <Controls />
      <MiniMap />
      <Panel>
        {/* Toolbar: filters, grouping, etc. */}
      </Panel>
    </ReactFlow>
  );
}
```

---

## Advantages of This Approach

1. **Proven Pattern**: CatalystWorkflowBuilder is already in production, so React Flow patterns are validated
2. **No New Dependencies**: `@xyflow/react` already in package.json (no bloat)
3. **Full Interactivity**: Supports drag, zoom, pan, selection (better than static SVG)
4. **Type Safety**: React Flow provides TypeScript types for Node, Edge, NodeProps, EdgeProps
5. **Styling**: Can use ADS tokens + Catalyst dark/light mode seamlessly
6. **Performance**: React Flow handles optimization for large graphs
7. **Customization**: Custom node/edge components give full control over appearance

## Disadvantages (Minor)

1. **Learning Curve**: Need to understand React Flow API (mitigated by existing CatalystWorkflowBuilder reference)
2. **Bundle Size**: React Flow adds ~50-60KB (gzipped), but already paid via other features
3. **Licensing**: xyflow is MIT (permissive), no restrictions

---

## Implementation Checklist

### Phase 7a: React Flow Setup (NEW)
- [ ] Copy CatalystWorkflowBuilder structure as template
- [ ] Create WorkItemNode component (copy StatusNode, adapt for work items)
- [ ] Create DependencyEdge component (copy edge pattern, change labels)
- [ ] Create DependencyDiagram wrapper (copy ReactFlow pattern)
- [ ] Import `@xyflow/react/dist/style.css`

### Phase 7b: Work Item Node Styling
- [ ] Define node colors based on issue type (Story=blue, Bug=red, Task=gray, etc.)
- [ ] Use JiraIssueTypeIcon for work item type indicator
- [ ] Add status badge (use CatalystStatusPill if available)
- [ ] Handle selection state (border highlight)
- [ ] Add click handler (navigate to detail view?)

### Phase 7c: Dependency Edge Styling
- [ ] Label rendering ("blocks" or "is blocked by")
- [ ] Arrow styling (solid, triangle marker)
- [ ] Hover effects
- [ ] Label positioning (above/below/side based on layout)

### Phase 8: Data Wiring
- [ ] Query dependencies from Catalyst DB
- [ ] Convert Dependency rows to Node/Edge format
- [ ] Handle add/delete in diagram (real-time updates)
- [ ] Re-layout after adding dependency (use React Flow layout utilities)

---

## Questions Resolved

1. **Do I need to build a custom SVG diagram?**  
   ❌ No. React Flow is already available.

2. **Is React Flow overkill for this feature?**  
   ✅ No. It's proven in production (CatalystWorkflowBuilder), provides interactivity, and requires minimal additional size.

3. **Can I match Jira's appearance with React Flow?**  
   ✅ Yes. Custom node/edge components give full control.

4. **Should I use a different graph library (Cytoscape, D3, etc.)?**  
   ❌ No. React Flow is already in the stack and proven.

---

## Next Steps

1. **Finalize Phase 5 inventory** — confirm no other blocking dependencies or architectural issues
2. **Review CatalystWorkflowBuilder code** — understand exact React Flow patterns used
3. **Design work item node** — sketch layout (icon, key, title, status)
4. **Implement Phase 7** with React Flow confidence

