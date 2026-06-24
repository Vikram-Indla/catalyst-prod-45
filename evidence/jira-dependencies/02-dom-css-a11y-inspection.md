# Jira Dependencies — DOM, CSS, A11y Inspection

**Based on:** Visual analysis of reference screenshots  
**Method:** Reverse-engineered from observable behavior and styling  
**Verification status:** INFERRED (requires live Chrome DevTools inspection to confirm)

---

## Modal Dialog Structure

### Inferred DOM Hierarchy

```html
<div role="presentation" class="atlaskit-modal-dialog">
  <!-- Modal backdrop -->
  <div class="atlaskit-modal-dialog-backdrop" 
       style="opacity: 0.5; background-color: rgba(0,0,0,0.5)">
  </div>
  
  <!-- Modal container -->
  <div class="atlaskit-modal-dialog-content" role="alertdialog" aria-modal="true">
    <!-- Header -->
    <div class="atlaskit-modal-dialog-header">
      <h1 class="atlaskit-heading-large">Add dependency</h1>
      <button class="atlaskit-button-close" aria-label="Close">×</button>
    </div>
    
    <!-- Body -->
    <div class="atlaskit-modal-dialog-body">
      <p>Dependencies in your plan help you sequence work in the right order.</p>
      
      <!-- Form: Source Issue Selector -->
      <div class="form-field">
        <label for="source-issue" class="form-label">Issue A</label>
        <div class="atlaskit-select-container">
          <input type="text" id="source-issue" 
                 placeholder="Choose a work item..."
                 aria-autocomplete="list"
                 aria-controls="source-issue-options"
                 role="combobox">
          <!-- Async dropdown results -->
          <ul id="source-issue-options" role="listbox" class="dropdown-list">
            <li role="option" class="option-item">
              <span class="issue-icon">📑</span>
              <span class="issue-key">MMS-14</span>
              <span class="issue-summary">NIC integration</span>
            </li>
            <!-- ... more items ... -->
          </ul>
        </div>
      </div>
      
      <!-- Middle: Relationship Type Selector -->
      <div class="form-field">
        <label for="link-type" class="form-label">Type</label>
        <div class="atlaskit-select-container">
          <select id="link-type">
            <option value="blocks">blocks</option>
            <option value="is-blocked-by">is blocked by</option>
            <!-- other relationship types -->
          </select>
        </div>
      </div>
      
      <!-- Form: Target Issue Selector -->
      <div class="form-field">
        <label for="target-issue" class="form-label">Issue B</label>
        <div class="atlaskit-select-container">
          <input type="text" id="target-issue" 
                 placeholder="Choose a work item..."
                 aria-autocomplete="list"
                 aria-controls="target-issue-options"
                 role="combobox">
          <!-- Async dropdown results -->
          <ul id="target-issue-options" role="listbox" class="dropdown-list">
            <!-- ... results ... -->
          </ul>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="atlaskit-modal-dialog-footer">
      <button class="atlaskit-button atlaskit-button-subtle">Cancel</button>
      <button class="atlaskit-button atlaskit-button-primary" disabled>Add</button>
    </div>
  </div>
</div>
```

### Key Elements & Attributes

| Element | Role | ARIA Attributes | Expected Class |
|---|---|---|---|
| Modal container | alertdialog | `aria-modal="true"` | `atlaskit-modal-dialog-content` |
| Title | heading | `aria-level="1"` | `atlaskit-heading-large` |
| Close button | button | `aria-label="Close"` | `atlaskit-button-close` |
| Source input | combobox | `aria-autocomplete="list"`, `aria-controls="id"` | `atlaskit-textfield` |
| Source options | listbox | — | `dropdown-list` |
| Option items | option | `aria-selected="true"` (if active) | `option-item` |
| Type dropdown | listbox (or select) | — | `atlaskit-select` |
| Target input | combobox | `aria-autocomplete="list"`, `aria-controls="id"` | `atlaskit-textfield` |
| Target options | listbox | — | `dropdown-list` |
| Cancel button | button | — | `atlaskit-button-subtle` |
| Add button | button | — | `atlaskit-button-primary` |

---

## CSS Model — Inferred

### Modal Container

```css
.atlaskit-modal-dialog-content {
  display: flex;
  flex-direction: column;
  width: ~500px;  /* estimated from screenshot */
  background: white;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(9, 30, 66, 0.25);
  z-index: 1000;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

### Modal Header

```css
.atlaskit-modal-dialog-header {
  padding: 20px 24px;
  border-bottom: 1px solid #DFE1E6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.atlaskit-heading-large {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #172B4D;
  line-height: 1.2;
}

.atlaskit-button-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #626F86;
  padding: 0;
  width: 24px;
  height: 24px;
}
```

### Modal Body

```css
.atlaskit-modal-dialog-body {
  padding: 20px 24px;
  flex: 1;
  overflow-y: auto;
}

.atlaskit-modal-dialog-body > p {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: #626F86;
  line-height: 1.5;
}
```

### Form Fields

```css
.form-field {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: #44546F;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.atlaskit-select-container {
  position: relative;
}

/* Input/Select focus state */
.atlaskit-select-container input:focus,
.atlaskit-select-container select:focus {
  outline: none;
  border-color: #0052CC;
  box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
}
```

### Dropdown List

```css
.dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 300px;
  overflow-y: auto;
  background: white;
  border: 1px solid #DFE1E6;
  border-top: none;
  border-radius: 0 0 4px 4px;
  list-style: none;
  margin: 0;
  padding: 0;
  z-index: 10;
  box-shadow: 0 1px 4px rgba(9, 30, 66, 0.13);
}

.option-item {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border-bottom: 1px solid #F1F2F4;
}

.option-item:hover {
  background-color: #F1F2F4;
}

.option-item[aria-selected="true"] {
  background-color: #E9F2FE;
  color: #0052CC;
}

.issue-icon {
  font-size: 16px;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.issue-key {
  color: #0052CC;
  font-weight: 600;
  font-family: 'Atlassian Mono', monospace;
  font-size: 12px;
  min-width: 60px;
}

.issue-summary {
  color: #172B4D;
  font-size: 13px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### Modal Footer

```css
.atlaskit-modal-dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid #DFE1E6;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.atlaskit-button {
  padding: 8px 16px;
  border-radius: 3px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.1s ease-in-out;
}

.atlaskit-button-subtle {
  background-color: transparent;
  color: #0052CC;
  border: 1px solid #DFE1E6;
}

.atlaskit-button-subtle:hover {
  background-color: #F1F2F4;
}

.atlaskit-button-primary {
  background-color: #0052CC;
  color: white;
}

.atlaskit-button-primary:hover:not(:disabled) {
  background-color: #0747A6;
}

.atlaskit-button-primary:disabled {
  background-color: #DFE1E6;
  color: #626F86;
  cursor: not-allowed;
}
```

---

## Timeline View DOM Structure

### Inferred Structure

```html
<div class="dependencies-timeline-container">
  <!-- Toolbar -->
  <div class="timeline-toolbar">
    <button class="rollup-button" data-rollup="story">
      Roll-up to: <strong>Story</strong>
    </button>
    <button class="groupby-button" data-groupby="space">
      Group by: <strong>Space</strong>
    </button>
    <select class="filter-space">
      <option>Space</option>
    </select>
    <select class="filter-sprint">
      <option>Sprint</option>
    </select>
    <!-- ... more filters ... -->
    <button class="reset-button">Reset</button>
  </div>
  
  <!-- Graph/Timeline Area -->
  <div class="timeline-graph" role="region" aria-label="Dependency timeline">
    <svg class="graph-svg" width="1200" height="800">
      <!-- Connection lines -->
      <line x1="..." y1="..." x2="..." y2="..." class="dependency-line" />
      <text x="..." y="..." class="dependency-label">blocks</text>
    </svg>
    
    <!-- Issue Cards -->
    <div class="issue-card" style="position: absolute; left: 100px; top: 100px;">
      <div class="card-header">
        <a href="..." class="issue-key">MMS-14</a>
        <button class="card-menu-trigger">⋯</button>
      </div>
      <div class="card-body">
        <h3 class="card-title">NIC</h3>
        <span class="card-meta">Start -</span>
      </div>
      <div class="card-footer">
        <a href="#" class="card-action">Add dependency</a>
      </div>
      
      <!-- Context Menu (on hover) -->
      <div class="context-menu" style="display: none;">
        <a href="#">Add dependency</a>
        <a href="#">Filter by this work item</a>
        <a href="#">Highlight related work item</a>
        <a href="#">Locate work item in timeline</a>
      </div>
    </div>
    
    <!-- More cards... -->
  </div>
</div>
```

### Issue Card CSS

```css
.issue-card {
  background: white;
  border: 1px solid #DFE1E6;
  border-radius: 3px;
  min-width: 220px;
  box-shadow: 0 1px 2px rgba(9, 30, 66, 0.1);
}

.issue-card:hover {
  box-shadow: 0 4px 8px rgba(9, 30, 66, 0.15);
}

.card-header {
  padding: 8px 12px;
  border-bottom: 1px solid #F1F2F4;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.issue-key {
  color: #0052CC;
  font-weight: 600;
  font-family: 'Atlassian Mono', monospace;
  text-decoration: none;
}

.card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #172B4D;
}

.card-meta {
  font-size: 12px;
  color: #626F86;
}

.card-action {
  color: #0052CC;
  text-decoration: none;
  font-size: 12px;
}

.context-menu {
  position: absolute;
  background: white;
  border: 1px solid #DFE1E6;
  border-radius: 3px;
  padding: 4px 0;
  min-width: 200px;
  box-shadow: 0 4px 8px rgba(9, 30, 66, 0.25);
  z-index: 100;
}

.context-menu a {
  display: block;
  padding: 8px 12px;
  color: #0052CC;
  text-decoration: none;
  font-size: 13px;
}

.context-menu a:hover {
  background-color: #F1F2F4;
}
```

### Dependency Line CSS

```css
.dependency-line {
  stroke: #0052CC;
  stroke-width: 2px;
  fill: none;
  marker-end: url(#arrowhead);
}

.dependency-label {
  font-size: 12px;
  font-weight: 600;
  color: #172B4D;
  background: white;
  padding: 0 4px;
}
```

---

## Table View DOM Structure

### Inferred Structure

```html
<table class="dependencies-table">
  <thead>
    <tr>
      <th class="col-work-item">Work item</th>
      <th class="col-number">#</th>
      <th class="col-blocked-by">Blocked by</th>
      <th class="col-blocks">Blocks</th>
      <th class="col-priority">Priority</th>
      <th class="col-start-date">
        <span>Start date</span>
        <button aria-label="Toggle column">D</button>
      </th>
      <th class="col-due-date">
        <span>Due date</span>
        <button aria-label="Toggle column">D</button>
      </th>
      <th class="col-team">Team</th>
    </tr>
  </thead>
  <tbody>
    <!-- Project group -->
    <tr class="group-row" role="button" aria-expanded="true">
      <td class="indent-0">
        <span class="group-toggle">▼</span>
        <span class="project-icon">📊</span>
        <strong>MM Support</strong>
      </td>
      <td></td>
      <td>1 Work item</td>
      <td>1 Work item</td>
      <td>2 Highest prior...</td>
      <td>Mar 30, 2026</td>
      <td>Mar 30, 2026</td>
      <td>0 Teams</td>
    </tr>
    
    <!-- Subgroup: Type -->
    <tr class="subgroup-row" role="button" aria-expanded="true">
      <td class="indent-1">
        <span class="group-toggle">▼</span>
        <span class="type-icon">📑</span>
        Story - 2 work items
      </td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    
    <!-- Leaf rows -->
    <tr class="item-row" role="button" aria-expanded="false">
      <td class="indent-2">
        <a href="#" class="issue-key">MMS-13</a>
        <span class="issue-summary">MOJ Integration</span>
      </td>
      <td></td>
      <td></td>
      <td>1 Work item</td>
      <td>
        <span class="priority-badge priority-highest">
          <span class="priority-icon">⬆</span> Highest
        </span>
      </td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    
    <!-- More rows... -->
  </tbody>
</table>
```

### Table CSS

```css
.dependencies-table {
  width: 100%;
  border-collapse: collapse;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

.dependencies-table th {
  background-color: #F7F8F9;
  color: #172B4D;
  font-weight: 600;
  font-size: 12px;
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #DFE1E6;
}

.dependencies-table td {
  padding: 12px;
  border-bottom: 1px solid #F1F2F4;
  color: #172B4D;
}

.group-row {
  background-color: #F7F8F9;
  font-weight: 600;
  cursor: pointer;
}

.subgroup-row {
  background-color: white;
  font-weight: 500;
  cursor: pointer;
}

.item-row {
  background-color: white;
}

.item-row:hover {
  background-color: #F1F2F4;
}

.indent-0 { padding-left: 12px; }
.indent-1 { padding-left: 24px; }
.indent-2 { padding-left: 36px; }

.group-toggle {
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-right: 4px;
  cursor: pointer;
}

.issue-key {
  color: #0052CC;
  font-weight: 600;
  font-family: 'Atlassian Mono', monospace;
  text-decoration: none;
  margin-right: 8px;
}

.priority-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
}

.priority-badge.priority-highest {
  background-color: #FFECEB;
  color: #AE2A19;
}

.priority-icon {
  display: inline-block;
  font-size: 10px;
}
```

---

## Accessibility Considerations

### Likely ARIA Roles & Attributes

| Component | ARIA Role | Attributes |
|---|---|---|
| Modal | dialog | `aria-modal="true"`, `aria-labelledby="modal-title"` |
| Dropdown | listbox / combobox | `aria-expanded`, `aria-controls`, `aria-autocomplete` |
| Option items | option | `aria-selected` |
| Timeline region | region | `aria-label="Dependency timeline"` |
| Table | table | — |
| Group rows | button | `aria-expanded="true/false"` |
| Status badges | — | (semantic via color + text) |

### Likely Keyboard Interactions

| Context | Key | Behavior |
|---|---|---|
| Modal input | Tab | Move to next field |
| Modal input | Shift+Tab | Move to previous field |
| Dropdown open | ArrowDown | Next option |
| Dropdown open | ArrowUp | Previous option |
| Dropdown open | Enter | Select option |
| Dropdown open | Escape | Close dropdown |
| Modal | Escape | Close modal |
| Table rows | Enter | Expand/collapse group |
| Buttons | Space / Enter | Activate |

### Likely Screen Reader Announcements

- Modal title on open: "Dialog, Add dependency, modal"
- Option selected: "MMS-14 NIC integration, selected"
- Dependency added: "Dependency created: MMS-13 blocks MMS-76"
- Count updates: "Blocked by 1 work item"

---

## CSS Variables (ADS Tokens) — Inferred

| Token | Inferred Value | Usage |
|---|---|---|
| `--ds-text` | #172B4D | Primary text color |
| `--ds-text-subtle` | #626F86 | Secondary text, subtitles |
| `--ds-text-subtlest` | #44546F | Labels, muted text |
| `--ds-link` | #0052CC | Links, issue keys, primary actions |
| `--ds-background-neutral` | #F1F2F4 | Hover states, subtle backgrounds |
| `--ds-background-neutral-subtle` | #F7F8F9 | Group headers, table headers |
| `--ds-surface` | #FFFFFF | Modal, cards, default background |
| `--ds-surface-overlay` | #FFFFFF | Modal backdrop content |
| `--ds-border` | #DFE1E6 | Borders, dividers |
| `--ds-border-neutral` | #DFE1E6 | Form input borders |
| `--ds-background-information` | #DEEAFF | Information state |
| `--ds-background-success` | #DFFCF0 | Success state |
| `--ds-background-danger` | #FFECEB | Error/danger state |
| `--ds-text-danger` | #AE2A19 | Danger text |
| `--ds-shadow` | `0 1px 4px rgba(9,30,66,0.13)` | Card shadows |

---

## Verification Checklist

- [ ] Live Chrome DevTools inspection of modal DOM
- [ ] Live CSS computed styles for all major elements
- [ ] Live ARIA attributes and roles
- [ ] Keyboard navigation testing in browser
- [ ] Screen reader testing (NVDA, JAWS, VoiceOver)
- [ ] Responsive behavior on mobile/tablet
- [ ] Dark mode styling (if applicable)
- [ ] Focus indicators visibility
- [ ] Color contrast ratios (WCAG AA compliance)

