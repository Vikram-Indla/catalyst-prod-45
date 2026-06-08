# Jira Dashboard Configure Panel — Full Specification

## Source: Deep web research + DOM probe of live Jira Cloud (2026-06-08)

---

## Panel Structure

The configure panel appears **inline below the gadget header** when clicking "Configure" in edit mode. It **replaces the gadget content area** — the data table is hidden until Save/Cancel.

Header notice: "Required fields are marked with an asterisk *"

---

## Fields (top to bottom)

### 1. Saved Filter (required *)
- **Control**: Typeahead/search dropdown
- **Categories**: Starred → Recently viewed → All filters
- **"Advanced Search" link**: Navigates AWAY from dashboard to Issue Navigator (`/issues/?filter=ID`) — NOT inline JQL editor
- **API**: `GET /rest/api/3/filter/favourite`, `/filter/my`, `/filter/search`
- **Stored as**: `filterId` (integer)

### 2. Number of Results (required *)
- **Control**: Text input (type="number")
- **Default**: 10
- **Validation**: Integer > 0 and <= 50 (hard server max)
- **Stored as**: `num` (integer)

### 3. Columns to Display (required *)
- **Control**: Ordered list with drag-drop reorder
- **Per-row**: `[6-dot drag handle] [Column name] [🗑 trash icon]`
- **Help text**: "Drag-drop to reorder the fields."
- **Default**: Issue Type, Key, Summary
- **Stored as**: `columnNames` — pipe-separated string e.g. `"issuekey|customfield_10130|summary|status|assignee|created"`
- **Min columns**: At least 1 must remain
- **Available fields**: Same set as Issue Navigator column picker (all system + custom fields with Search Template)

### 4. Add Columns to Display
- **Control**: Typeahead dropdown
- **Behavior**: Selecting a field appends to bottom of column list
- **Shows field ID**: Yes — "(customfield_10130)" for custom fields

### 5. Auto Refresh
- **Classic**: Checkbox "Update every 15 minutes"
- **Modern**: Dropdown: Never / 15 min / 30 min / 1 hr / 2 hr / Custom
- **Stored as**: `refresh` (boolean or interval)

### 6. Save / Cancel
- **Save**: Primary button, persists to gadget properties
- **Cancel**: Subtle button, discards changes

---

## REST API

```
GET  /rest/api/3/dashboard/{id}/gadgets                           — list gadgets
GET  /rest/api/3/dashboard/{id}/items/{itemId}/properties         — list property keys
GET  /rest/api/3/dashboard/{id}/items/{itemId}/properties/config  — get config
PUT  /rest/api/3/dashboard/{id}/items/{itemId}/properties/config  — set config
```

Config JSON:
```json
{
  "filterId": 12345,
  "num": 30,
  "columnNames": "issuekey|customfield_10130|summary|status|assignee|created",
  "refresh": true,
  "isConfigured": true
}
```

---

## Catalyst Implementation Plan

### Already installed:
- `@atlaskit/pragmatic-drag-and-drop` (v1.7.5) — for column reorder
- `@atlaskit/select` — for typeahead dropdowns (saved filter, add column)
- `@atlaskit/textfield` — for number input
- `@atlaskit/checkbox` — for auto-refresh
- `@atlaskit/button` — for Save/Cancel
- `@atlaskit/form` — for required field asterisks + validation

### Build in GadgetSettingsPanel.tsx:
1. Add "Columns to display" section with pragmatic-DnD vertical list
2. Add "Add columns to display" typeahead from available fields
3. Add "Number of results" input (1-50)
4. Add "Auto refresh" checkbox
5. Panel renders inline in gadget body (replaces content while configuring)
