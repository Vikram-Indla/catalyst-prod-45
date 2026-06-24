# Jira Dependencies Feature — Investigation Plan

**Date:** 2026-06-24  
**Feature:** Jira Plans > Dependencies view  
**Target URL:** `https://ministryofinvesment.atlassian.net/jira/plans/1/scenarios/1/dependencies?groupBy=project&rollupBy=hierarchy&rollupHierarchyLevel=0`  
**Catalyst Target:** Project Hub > Issue detail > Side panel "Dependencies" sub-item

---

## User Journey Map

1. **Discover dependencies tab/entry point** — Where is "Dependencies" accessible? (plan view, issue view, detail rail?)
2. **View existing dependencies** — How are dependencies listed and rendered?
3. **Add a dependency** — Click "Add dependency" → Modal opens → Search for issue → Select type → Confirm
4. **Search/select issue** — Type issue key or summary → Results appear → Navigate and select
5. **Select dependency type** — Choose from "blocks", "is blocked by", other types
6. **Confirm and save** — Click "Add" → Loading state → Success or error
7. **View created dependency** — Dependency appears in list/timeline view
8. **Edit/remove dependency** — Hover actions → Remove option → Confirm deletion
9. **Timeline view** — Visual graph representation of dependencies
10. **Table view** — Tabular representation with dependency counts

---

## Expected UI States to Capture

| # | State | Purpose |
|---|---|---|
| 01 | Entry point default | Where/how user accesses Dependencies |
| 02 | Empty state | No dependencies exist |
| 03 | Add button hover | CTA affordance |
| 04 | Add button focus | Keyboard accessibility |
| 05 | Modal open | Add dependency dialog |
| 06 | Search field focused | First field in modal |
| 07 | Search results loading | Async search in progress |
| 08 | Search results visible | List of work items |
| 09 | Result hover | Highlight behavior |
| 10 | Result keyboard focus | Tab/arrow navigation |
| 11 | Result selected/clicked | Visual confirmation |
| 12 | Dependency type selector | "blocks" / "is blocked by" / other |
| 13 | Save/Add button state | Confirm action |
| 14 | Loading after save | Server processing |
| 15 | Success state | Dependency created |
| 16 | Dependency row rendered | How it appears in list |
| 17 | Dependency row hover | Edit/remove actions appear |
| 18 | Remove menu/confirmation | Delete flow |
| 19 | Timeline view | Visual dependency graph |
| 20 | Table view | Tabular summary |
| 21 | Error state | Validation or API failure |
| 22 | Disabled/unavailable state | Permission or constraint |

---

## Expected Interactions to Test

- [ ] Click "Add dependency" button
- [ ] Type in search field → observe async search behavior
- [ ] Navigate search results with keyboard (arrow keys, Enter)
- [ ] Click a result → is it immediately selected or requires confirmation?
- [ ] Verify dependency type options and default
- [ ] Click Add/Save → observe loading indicator and success
- [ ] Hover over created dependency row
- [ ] Click remove → is there a confirmation dialog?
- [ ] Test Escape key behavior in modal
- [ ] Test outside-click dismissal of modal
- [ ] Test switching between timeline and table views
- [ ] Test responsive behavior (if applicable)

---

## Expected DOM/CSS Areas to Inspect

1. **Modal dialog** — backdrop, container, close button, form layout
2. **Search field** — input styling, placeholder, focus/error states, autocomplete
3. **Search results list** — container, item styling, hover/focus, keyboard indicators
4. **Result item** — issue key color, icon, summary, truncation, selection indicator
5. **Dependency type dropdown** — current selection, options, styling
6. **Add/Save button** — disabled state, loading spinner, text change
7. **Dependency row** — key link, summary, type badge, remove action
8. **Row hover menu** — visibility, button styling, positioning
9. **Timeline/graph** — SVG or canvas rendering, node styling, edge styling
10. **Table view** — column headers, cell styling, grouping, totals

---

## Screenshot Naming Convention

Format: `{step:02d}-{state-name}.png`

Examples:
- `01-entry-point-dependencies-tab.png`
- `05-modal-search-field-focused.png`
- `09-search-results-visible.png`
- `15-save-loading-state.png`
- `19-timeline-view-graph.png`

---

## Evidence Ledger Format

For each screenshot, record:

```markdown
### {step:02d} — {state-name}

**Screenshot:** {filename}  
**Trigger/Action:** What user did to reach this state  
**Changed visually:** What's different from previous state  
**Visible controls:** Buttons, inputs, dropdowns, menus  
**Observed behavior:** Click targets, affordances, feedback  
**Open questions:**
  - Is this Atlaskit Modal or custom?
  - How are async results handled?
  - What's the dependency type logic?
  - [...]
```

---

## Phase Deliverables

1. **00-investigation-plan.md** (this file)
2. **01-behavior-map.md** — Detailed behavior observations from all captured screenshots
3. **02-dom-css-a11y-inspection.md** — DOM hierarchy, CSS, ARIA, events
4. **03-atlassian-component-map.md** — Mapped Atlaskit components, evidence, confidence
5. **04-functional-model.md** — Entities, fields, actions, state model, API contract
6. **05-catalyst-implementation-plan.md** — Catalyst route/component changes, data model, implementation steps
7. **06-evidence-ledger.md** — Citation of all major claims to source screenshots/inspections

---

## Assumptions to Confirm with User

- [ ] Dependencies are issue-to-issue links, not other entity types
- [ ] "blocks" and "is blocked by" are the main dependency types (confirm if others exist)
- [ ] Dependencies are read/write (not view-only) in the observed context
- [ ] Modal behavior: is it a standard Atlaskit Modal or custom?
- [ ] Search: is it real-time as-you-type or search-on-submit?
- [ ] Can a user create a dependency on the same issue (self-reference)?
- [ ] Are there permission checks that hide the feature?
- [ ] Is the timeline view SVG, Canvas, or DOM-based?

---

## Next Step

→ Phase 2: Navigate to Jira URL and capture behavior screenshots using computer-use.
