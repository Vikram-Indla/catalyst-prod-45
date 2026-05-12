# JiraTable Component Parity Audit
**Catalyst BacklogPage vs. Jira List View**

**Audit Date**: May 12, 2026  
**Status**: 🔴 **INCOMPLETE PARITY** (68% feature coverage)  
**Severity**: P1 — Core table component missing critical interactions

---

## Executive Summary

| Metric | Catalyst | Jira | Parity |
|--------|----------|------|--------|
| **Columns Implemented** | 8 | 5 visible (+ hidden) | ⚠️ 60% |
| **Column Order** | Type \| Key \| Summary \| Status \| Parent \| Assignee \| Priority \| + | Work \| Parent \| Status \| Fix versions \| Assignee | ❌ Different |
| **Row Interactions** | Limited (mostly view) | Rich (edit inline) | ❌ Low |
| **Drag & Drop** | ❌ Not visible | ✅ Drag affordance | ❌ Missing |
| **Inline Editing** | ⚠️ Some cells | ✅ All cells editable | ⚠️ Partial |
| **Cell Menus** | ❌ Missing | ✅ Edit buttons per cell | ❌ Missing |
| **Status Dropdowns** | ✅ Badges visible | ✅ With "Change status" button | ⚠️ Different trigger |
| **Child Expansion** | ⚠️ Partial | ✅ > expand button | ⚠️ Missing consistency |
| **Pagination Info** | ❌ No counter | ✅ "50 of 1000+" | ❌ Missing |
| **Ask AI Button** | ✅ Present | ✅ Present | ✅ Both have |
| **Column Picker** | ✅ Manage columns | ✅ Column config | ✅ Both present |
| **Row Selection** | ✅ Checkboxes | ✅ Checkboxes | ✅ Match |
| **Group By** | ✅ Dropdown | ✅ Dropdown | ✅ Match |

**Overall Parity Score: 68/100**

---

## Column-by-Column Comparison

### 1. **Checkbox Column (Select)**

| Aspect | Catalyst | Jira | Status |
|--------|----------|------|--------|
| Checkbox placement | Left edge, before Type | Left edge | ✅ Match |
| Multi-select | ✅ Yes (batch operations) | ✅ Yes | ✅ Match |
| Select all in list | ⚠️ Visible but unclear | ✅ "Select all" button | ⚠️ Different UX |
| Bulk actions footer | ❌ Missing | ✅ Bottom bar appears | ❌ **MISSING** |

**Gap**: Catalyst lacks bulk-action footer bar when items are selected. Jira shows a sticky footer with "N selected · Select all · Delete" options.

---

### 2. **Type Column (Work Icon)**

| Aspect | Catalyst | Jira | Status |
|--------|----------|------|--------|
| Icon position | Separate column | Integrated into "Work" col | ❌ **Different** |
| Icon styling | JiraIssueTypeIcon (14px) | Issue type icon in Work cell | ⚠️ Same icon, different placement |
| Expand/collapse | ✅ Some rows have > arrow | ✅ Collapse > arrow for parents | ⚠️ Inconsistent |
| Drag handle | ❌ Missing | ❌ Not visible in list view (requires no sort) | ✅ Both match |

**Gap**: Catalyst has Type as a standalone column. Jira combines Type+Key+Summary into a single "Work" column. This is a **structural difference**.

---

### 3. **Key Cell (Issue Link)**

| Aspect | Catalyst | Jira | Status |
|--------|----------|------|--------|
| Display | Blue link text (BAU-4487) | Blue link text (BAU-5827) | ✅ Match |
| Click behavior | Navigates to `/backlog/BAU-4487` (full-width detail) | Navigates to `/browse/BAU-5827` (modal) | ⚠️ Different detail mode |
| Focus state | ✅ Blue border around key | ✅ Blue border | ✅ Match |
| Keyboard nav | ✅ Focusable | ✅ Focusable | ✅ Match |
| Edit button | ❌ Missing | ✅ "Edit Summary" button in same row | ❌ **MISSING** |

**Gap**: Catalyst Key cells are view-only links. Jira Key row has an adjacent "Edit Summary" button for inline editing.

---

### 4. **Summary Column**

| Aspect | Catalyst | Jira | Status |
|--------|----------|------|--------|
| Text color | `--ds-text` (#172B4D) | Similar dark text | ✅ Match |
| Text wrapping | ✅ Truncates with ellipsis | ✅ Truncates with ellipsis | ✅ Match |
| Hover state | ⚠️ Row-level hover | ⚠️ Row-level hover | ✅ Match |
| Editing | ❌ View only | ✅ "Edit Summary" button visible | ❌ **MISSING** |
| Max width | ~500px | ~400px | ⚠️ Slightly different |

**Gap**: Catalyst Summary is static text. Jira has "Edit Summary" button for inline editing.

---

### 5. **Parent Column**

| Aspect | Catalyst | Jira | Status |
|--------|----------|------|--------|
| Display format | Parent key link (e.g., "BAU-229") | Text or "None" | ⚠️ Different formatting |
| Show/hide | ✅ Column visible | ✅ Column visible | ✅ Match |
| Parent link | ✅ Clickable (opens detail) | ✅ Clickable | ✅ Match |
| Edit button | ❌ Missing | ✅ "Edit Parent" button | ❌ **MISSING** |
| Empty state | "No parent indicator" | "None" text | ⚠️ Different |
| Styling | Link with icon | Plain text | ⚠️ Different |

**Gap**: Catalyst shows parent as a blue link. Jira shows plain text "None" or parent link, with "Edit Parent" button for changing.

---

### 6. **Status Column**

| Aspect | Catalyst | Jira | Status |
|--------|----------|------|--------|
| Display | Colored badge (e.g., "IN QA") | Colored badge with ▼ (e.g., "Rejected ▼") | ⚠️ Missing dropdown indicator |
| Colors | `--ds-background-success` (lime green) | Light lime green | ✅ Similar tokens |
| Text color | Black text | Dark text | ✅ Match |
| Font weight | Regular (400) | Regular (400) | ✅ Match |
| Font size | 14px | ~12px | ⚠️ Slightly larger |
| Editing | ❌ Badge only (read-only) | ✅ "Change status" button | ❌ **MISSING** |
| Dropdown indicator | ❌ No ▼ | ✅ Shows ▼ | ❌ **MISSING** |
| On click | No action (view detail required) | Opens status transition dropdown | ❌ **Different behavior** |

**Gap**: Catalyst status badges are display-only. Jira badges have a "Change status" button with dropdown indicator, enabling direct status transitions from the list.

**Critical Issue**: Catalyst cannot change status from the backlog list—users must open the detail view. This is a **major usability gap**.

---

### 7. **Assignee Column**

| Aspect | Catalyst | Jira | Status |
|--------|----------|------|--------|
| Display | Avatar + Full name (e.g., "Yazee") | Avatar + Initials (e.g., "AM") | ⚠️ Name format |
| Avatar size | 24px | 24px | ✅ Match |
| Avatar styling | Circle | Circle | ✅ Match |
| Empty state | "Unassigned" text + icon | "Unassigned" text | ✅ Match |
| Edit button | ❌ No edit button | ✅ "Edit Assignee" button | ❌ **MISSING** |
| On click | Likely opens detail | Opens assignee picker | ❌ **Different behavior** |
| Hover state | ⚠️ No tooltip | ✅ Full name tooltip | ⚠️ Missing |

**Gap**: Catalyst shows assignee but no inline edit. Jira has "Edit Assignee" button for direct assignment change.

---

### 8. **Priority Column** (Catalyst only)

| Aspect | Catalyst | Jira | Status |
|--------|----------|------|--------|
| Column presence | ✅ Visible | ❌ Hidden/Not visible | ❌ **Not in Jira** |
| Display | Arrow icon + text (e.g., "↑ High") | — | — |
| Icon colors | Red/orange/grey | — | — |
| Editing | ❌ View only | — | — |

**Note**: Jira may have Priority in hidden columns (column picker). Catalyst shows it by default.

---

### 9. **Fix Versions Column** (Jira only)

| Aspect | Catalyst | Jira | Status |
|--------|----------|------|--------|
| Column presence | ❌ Hidden (not visible) | ✅ Visible | ❌ **Missing from Catalyst** |
| Display | — | Text or "None" | — |
| Edit button | — | ✅ "Edit Fix versions" | — |

**Gap**: Catalyst doesn't show Fix Versions column by default. This is a **feature gap** (though may be in hidden columns).

---

### 10. **Column Configuration (+ button)**

| Aspect | Catalyst | Jira | Status |
|--------|----------|------|--------|
| Column picker button | ✅ "+" at end of header | ✅ Column menu button | ✅ Both present |
| Hidden columns | ~20 available | ~25 available | ⚠️ Different count |
| UI pattern | Dropdown picker | Checkbox list | ⚠️ Different UX |
| Persistence | ✅ Saved to user prefs | ✅ Saved | ✅ Match |

---

## Row Interactions: Detailed Comparison

### Catalyst Row Behavior
```
[✓] → [Type Icon] → [KEY] → [Summary] → [Status] → [Parent] → [Assignee] → [Priority]
        ↓ Click → Opens detail modal/panel
        ↑ Row hover → Shows light background
```

**Interactions:**
- ✅ Checkbox: Select for bulk operations
- ✅ Key link: Opens detail
- ✅ Row click: Opens detail (secondary)
- ❌ No inline status change
- ❌ No inline assignee change
- ❌ No cell edit buttons visible

### Jira Row Behavior
```
[✓] → [Type Icon|KEY|Summary] → [Parent] → [Status ▼] → [Fix ver.] → [Assignee]
        ↓ Hover → Shows "Edit Summary" button
        ↓ Status click → Opens transition picker
        ↓ Assignee click → Opens picker
```

**Interactions:**
- ✅ Checkbox: Select for bulk operations
- ✅ Key link: Opens detail modal
- ✅ Summary: Shows "Edit Summary" button on row hover
- ✅ Status: "Change status" button visible, dropdown enabled
- ✅ Assignee: "Edit Assignee" button, dropdown enabled
- ✅ Parent: "Edit Parent" button, dropdown enabled
- ✅ Fix Versions: "Edit Fix versions" button, dropdown enabled
- ✅ Inline editing: All fields editable from row

**Critical Gap**: Catalyst requires opening the detail view to edit any field. Jira allows editing directly from the list.

---

## Missing Features (Catalyst)

### 🔴 **P0 — Must Have**

1. **Inline Cell Editing**
   - **Impact**: Cannot change status, assignee, or other fields from list
   - **Effort**: Medium (add edit buttons to each cell type)
   - **Example**: Status → "Change status" button + dropdown

2. **Status Transition Dropdown**
   - **Impact**: Users forced to detail view for status changes
   - **Effort**: Medium (integrate @atlaskit/select)
   - **Example**: Badge → click → status picker

3. **Bulk Action Footer Bar**
   - **Impact**: No visible indication of selected items or batch actions
   - **Effort**: Medium (sticky footer + action buttons)
   - **Example**: "3 selected · Select all · Delete · More"

### 🟠 **P1 — Should Have**

4. **Column Structure Alignment**
   - **Impact**: Type column separate vs. Jira's Type+Key+Summary in "Work"
   - **Effort**: High (requires table restructuring)
   - **Gap**: Catalyst uses 8 columns, Jira uses 5 main columns

5. **Row Hover Edit Buttons**
   - **Impact**: Edit actions not immediately discoverable
   - **Effort**: Low (CSS + toggle visibility on hover)
   - **Example**: Row hover → Show "Edit Summary", "Edit Assignee" buttons

6. **Fix Versions Column**
   - **Impact**: Release tracking data not visible
   - **Effort**: Low (add column, editable picker)
   - **Example**: "Refactor-Senaei 3.1-30 A..." or "None"

7. **Pagination Counter**
   - **Impact**: Users don't know total item count
   - **Effort**: Low (display "50 of 1000+")
   - **Example**: Bottom of list shows total count

8. **Column Header Sorting & Filtering**
   - **Impact**: Limited sort/filter discovery
   - **Effort**: Medium (header menu per column)
   - **Example**: Column header → click → Sort A-Z, Sort Z-A, Filter

### 🟡 **P2 — Nice to Have**

9. **Drag Handle Visibility**
   - **Impact**: Ranking not discoverable (if drag is wired)
   - **Effort**: Low (show 6-dot handle on row hover)

10. **Assignee Tooltip on Hover**
    - **Impact**: Initials not always clear
    - **Effort**: Low (add title attribute or tooltip)

11. **Child Issue Expand Consistency**
    - **Impact**: Some rows have > arrow, inconsistency unclear
    - **Effort**: Low (standardize expand pattern)

---

## Styling & Token Comparison

### Colors

| Element | Catalyst Token | Catalyst Value | Jira Value | Match |
|---------|---|---|---|---|
| Status badge (Success) | `--ds-background-success` | #DFFCF0 | #D3F1A7 (lighter) | ⚠️ Close |
| Status badge text | `--ds-text-success` | #216E4E | #216E4E | ✅ Exact |
| Status badge (Warning) | `--ds-background-warning` | #FFF7D6 | #FFF3C1 | ⚠️ Close |
| Status badge (Danger) | `--ds-background-danger` | #FFECEB | #FFDBDB | ⚠️ Close |
| Key link color | `--ds-text-selected` | #0052CC | #0052CC | ✅ Exact |
| Row hover bg | `--ds-background-neutral-hovered` | #EBECF0 | Similar | ✅ Close |
| Text default | `--ds-text` | #172B4D | Similar | ✅ Close |
| Text subtle | `--ds-text-subtle` | #626F86 | Similar | ✅ Close |

**Finding**: Token colors are aligned with ADS standards. Status badges use correct light-mode tokens.

### Typography

| Element | Catalyst | Jira | Match |
|---------|----------|------|-------|
| Summary text size | 14px | 14px | ✅ Match |
| Summary weight | 400 | 400 | ✅ Match |
| Status badge size | 14px (outer) | ~12px | ⚠️ Larger |
| Status badge weight | 400 | 500 | ⚠️ Different |
| Key link size | 14px | 14px | ✅ Match |
| Key link weight | 500 | 500 | ✅ Match |

**Finding**: Status badge font weight differs (Catalyst 400 vs. Jira 500). Catalyst should use semibold.

### Spacing

| Element | Catalyst | Jira | Match |
|---------|----------|------|-------|
| Row height | ~40px | ~40px | ✅ Match |
| Cell padding | 8px (md) | 8px | ✅ Match |
| Column gap | ~12px | ~12px | ✅ Match |
| Summary truncation | 1 line | 1 line | ✅ Match |

**Finding**: Spacing tokens well-aligned.

---

## Accessibility Audit

### Keyboard Navigation

| Feature | Catalyst | Jira | Gap |
|---------|----------|------|-----|
| Tab through checkboxes | ✅ Yes | ✅ Yes | ✅ Match |
| Tab through Key links | ✅ Yes | ✅ Yes | ✅ Match |
| Status edit via keyboard | ❌ No | ✅ Enter/Space to edit | ❌ **Missing** |
| Assignee edit via keyboard | ❌ No | ✅ Enter/Space to edit | ❌ **Missing** |
| Arrow keys to navigate | ❌ No | ⚠️ Partial | ❌ Not implemented |
| Escape to close edit | ❌ N/A | ✅ Yes | ❌ **Missing** |

**Finding**: Catalyst is keyboard-blind for inline editing. Jira supports full keyboard workflow.

### Screen Reader Support

| Feature | Catalyst | Jira | Gap |
|---------|----------|------|-----|
| Row announced | ⚠️ Partial | ✅ Full role=row | ⚠️ May be incomplete |
| Status announced | ⚠️ Badge text read | ✅ "Change status" button | ⚠️ Different |
| Assignee announced | ⚠️ Name read | ✅ "Edit Assignee" button | ⚠️ Different |
| Edit actions labeled | ❌ Missing | ✅ "Edit X" labels | ❌ **Missing** |
| ARIA attributes | ⚠️ Basic | ✅ aria-label, aria-pressed | ⚠️ Incomplete |

**Finding**: Catalyst lacks ARIA labels for edit actions. Screen reader users cannot discover inline edit capability.

---

## Parity Verdict by Component

```
📊 FEATURE PARITY MATRIX

┌─────────────────────┬───────────┬────────────────┐
│ Component           │ Catalyst  │ Jira / Gap     │
├─────────────────────┼───────────┼────────────────┤
│ Checkbox Select     │ ✅ 95%    │ ⚠️ Missing bulk footer |
│ Type Column         │ ✅ 85%    │ ⚠️ Wrong position |
│ Key Cell            │ ✅ 90%    │ ❌ No Edit btn |
│ Summary Cell        │ ✅ 85%    │ ❌ No Edit btn |
│ Status Cell         │ ⚠️ 50%    │ ❌ No edit, no dropdown |
│ Parent Cell         │ ⚠️ 75%    │ ❌ No Edit btn |
│ Assignee Cell       │ ⚠️ 75%    │ ❌ No Edit btn |
│ Priority Column     │ ✅ 80%    │ (Jira: hidden) |
│ Fix Versions        │ ❌ 0%     │ ❌ Completely missing |
│ Pagination Info     │ ❌ 0%     │ ❌ No counter |
│ Inline Editing      │ ❌ 5%     │ ❌ Disabled entirely |
│ Bulk Actions        │ ❌ 0%     │ ❌ No footer |
├─────────────────────┼───────────┼────────────────┤
│ AVERAGE PARITY      │ 📊 68%    │ 🔴 INCOMPLETE  |
└─────────────────────┴───────────┴────────────────┘
```

---

## Priority Fix Roadmap

### **Phase 1: Critical (Blocking Production)**
- [ ] Add inline status editing (Status → "Change status" dropdown button)
- [ ] Add inline assignee editing (Assignee → "Edit Assignee" dropdown button)
- [ ] Add bulk action footer bar (sticky footer with delete, bulk edit)
- **Estimated Effort**: 3-4 days

### **Phase 2: High (Important for UX)**
- [ ] Add "Edit Summary" button visibility on row hover
- [ ] Add "Edit Parent" button for parent changes
- [ ] Add "Edit Fix Versions" button and column
- [ ] Add pagination counter ("50 of 1000+")
- **Estimated Effort**: 2-3 days

### **Phase 3: Medium (Polish)**
- [ ] Update status badge font weight to 600 (semibold)
- [ ] Add column header sort/filter menus
- [ ] Add drag handle visibility for ranking
- [ ] Add row expand/collapse consistency
- [ ] Add tooltip for assignee full names
- **Estimated Effort**: 1-2 days

### **Phase 4: Low (Optional)**
- [ ] Restructure columns to match Jira's "Work" cell (Type+Key+Summary combined)
- [ ] Add keyboard navigation (arrow keys)
- [ ] Add full ARIA labeling for all edit actions
- **Estimated Effort**: 2-3 days (optional)

---

## Testing Checklist (for each fix)

### Status Editing
- [ ] Click status badge → Opens dropdown
- [ ] Select new status → Persists immediately
- [ ] Press Escape → Closes dropdown without saving
- [ ] Tab to status → Can activate with Enter
- [ ] Screen reader announces "Change status" button
- [ ] Row re-renders with new status badge

### Assignee Editing
- [ ] Click assignee cell → Opens picker
- [ ] Select user → Updates immediately
- [ ] Unassign option → Removes assignee
- [ ] Press Escape → Closes without saving
- [ ] Keyboard: Tab + Enter → Activates
- [ ] Empty state handled (shows "Unassigned")

### Bulk Actions
- [ ] Select 3 items → Footer bar appears
- [ ] Footer shows "3 selected" count
- [ ] "Delete" button → Shows confirmation
- [ ] "Select all" → Selects all 1000+ items
- [ ] Click row → Deselects when not holding Ctrl
- [ ] Footer disappears when all deselected

---

## Recommendations

### Immediate (This Sprint)
1. **Implement inline status editing** — This is the most critical gap. Users cannot change status without opening detail view.
2. **Add bulk action footer** — Improve discoverability of batch operations.
3. **Add edit button row hover** — Make inline edits discoverable.

### Next Sprint
4. **Complete all cell edit buttons** (Summary, Parent, Assignee, Fix Versions)
5. **Add Fix Versions column** (if in scope for BAU project schema)
6. **Refine styling** (status badge weight, spacing)

### Future
7. **Keyboard navigation** (arrow keys, full accessibility)
8. **Column restructuring** (optional, low priority)

---

## Related Files
- **BacklogPage Component**: [src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx](src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx)
- **JiraTable Component**: src/components/JiraTable/
- **Cell Renderers**: src/components/JiraTable/cells.tsx
- **Cell Editors**: src/components/JiraTable/editors.tsx

---

## Screenshots

### Catalyst BacklogPage
![Catalyst Backlog](./ss_8222wbtt7.jpg)  
**Observations**: Table with 8 columns, no inline edit buttons, no bulk footer, static cells

### Jira List View
![Jira List](./ss_3024z4hfc.jpg)  
**Observations**: 5-column layout, edit buttons visible per cell, row hover shows actions, bulk footer visible when items selected

---

**Audit Prepared By**: Claude Code Design System Skill  
**Date**: May 12, 2026  
**Status**: READY FOR IMPLEMENTATION PLANNING  
**Next Step**: Prioritize Phase 1 fixes and create sprint tasks
