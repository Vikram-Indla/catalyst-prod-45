

# ADF Table Rendering — CSS Class Mismatch Fix

## Root Cause Identified

The `AdfDescriptionRenderer` component wraps its output in a `<div className="adf-description-content">` but all table CSS styles in the codebase are scoped to different class names:

| CSS selector scope | Where defined | Status |
|---|---|---|
| `.adf-content table` | `src/index.css:5185` | **Never applied** — no component uses `adf-content` wrapper class |
| `.adf-editor-content table` | `story-detail-extensions.css:985` + `SubtasksPanel.css:478` | Applied only inside TipTap editor containers |
| `[data-sdm-scope] .adf-editor-content table` | `story-detail-extensions.css:985` | Applied only inside StoryDetailModal scope |
| `.adf-description-content table` | **NOWHERE** | ← The actual class used by `AdfDescriptionRenderer` — **zero CSS rules exist** |

**Result:** Tables rendered by `adfToHtml()` inside `AdfDescriptionRenderer` have **no borders, no padding, no header backgrounds, no cell styling**. They render as raw unstyled HTML tables — which is exactly what screenshot 1 shows (cramped, no structure, unreadable).

Screenshot 2 (Jira) shows the correct rendering: clean borders, grey header row, proper cell padding, readable column widths.

## Implementation Plan

### Single Fix — Add `.adf-description-content` table styles to `index.css`

Add a new CSS block in `src/index.css` (right after the existing `.adf-content` block at line ~5252) that targets `.adf-description-content table` with Jira-exact parity:

**Styles to apply (matching Jira screenshot 2):**
- `border-collapse: collapse` + `width: 100%`
- `border: 0.556px solid #DDDEE1` (Jira's thin border)
- Header cells (`th`): `background: #F4F5F7`, `font-weight: 600`, `color: #172B4D`
- Body cells (`td`): `background: #FFFFFF`, `padding: 8px 10px`, `vertical-align: top`
- `table-layout: auto` (not `fixed`) so columns size to content naturally — matching Jira's proportional column widths
- `word-wrap: break-word` for long Arabic/English text
- Hover: `tr:hover td { background: #FAFBFC }`
- Dark mode variants using NOCTURNE tokens

### Alternative approach (also do)

Additionally, add `adf-content` as a **second** className to the `AdfDescriptionRenderer` wrapper div so that the existing `.adf-content` styles in `index.css` also apply. This provides immediate coverage without duplicating CSS:

```tsx
// In AdfDescriptionRenderer.tsx — change className from:
className="adf-description-content"
// to:
className="adf-description-content adf-content"
```

This is a **one-line change** in `AdfDescriptionRenderer.tsx` (applied at lines 253, 271, 303) plus minor CSS refinements in `index.css` to ensure `table-layout: auto` (not `fixed`) for natural column sizing.

### Files to Touch
1. `src/modules/project-work-hub/components/AdfDescriptionRenderer.tsx` — Add `adf-content` class (3 occurrences)
2. `src/index.css` — Change `table-layout: fixed` → `table-layout: auto` in `.adf-content table` block (line 5191) for proper column proportions matching Jira

### No New Files, No Schema Changes

