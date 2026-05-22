# ADS Checkpoint — Shared Audit · Gate · Fix · Verify Protocol

**Used by:** `/catalyst-agent` (Steps 4.5 + 4.6 + post-fix verify) and `/jira-compare` (ADS Extended Resource Check + fix gate)

---

## Qualified Resource Library

### TIER 1 — Always fetch (every surface, every audit)

| Resource | URL | What to extract |
|---|---|---|
| Atlassian Design System | https://atlassian.design/ | Canonical component for every UI slot under review; confirm @atlaskit/* equivalent exists |
| ADS Design Tokens | https://atlassian.design/components/tokens/all-tokens | Exact token name · light value · dark value · semantic use-case. **Cite in the Fix column for every color/spacing/border gap.** |

### TIER 2 — Signal-gated (fetch only when the matching signal is detected on the surface)

| Signal detected | Resource | URL |
|---|---|---|
| description / comment / rich text / "ADF" | ADF structure | https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/ |
| ADF test data or structure validation | ADF playground | https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/ |
| description field in **edit/write** mode | @atlaskit/editor-core | https://www.npmjs.com/package/@atlaskit/editor-core |
| description field in **read/display** mode | @atlaskit/renderer | https://www.npmjs.com/package/@atlaskit/renderer |
| ADF traversal or programmatic manipulation | @atlaskit/adf-utils | https://www.npmjs.com/package/@atlaskit/adf-utils |
| kanban / backlog rank / any drag-drop | Pragmatic DnD | https://atlassian.design/components/pragmatic-drag-and-drop |
| DnD implementation detail needed | Pragmatic DnD GitHub | https://github.com/atlassian/pragmatic-drag-and-drop |
| installing a new @atlaskit/* package | Atlaskit portal | https://atlaskit.atlassian.com/get-started |

### BANNED — Never fetch, never use

| Resource | Reason |
|---|---|
| `@atlaskit/dynamic-table` (direct) | **BANNED** for work-item surfaces — `JiraTable` is canonical (CLAUDE.md). Flag any direct `@atlaskit/dynamic-table` import as P0. |
| `@atlassian/aui` | Legacy; not used in Catalyst. |
| Forge design tokens & theming | Forge/Marketplace apps only; irrelevant to Catalyst. |
| `@atlaskit/tokens` npm changelog | Install the package; docs live on atlassian.design; changelog is not actionable for audits. |

---

## Phase 1 — AUDIT

### 1A — CLI scan (always, on every file touched)

```bash
node design-governance/rules/audit.js src/<file-or-dir>
```

**What the scanner catches (3 validators):**

| Validator | Violation types |
|---|---|
| ADS Token Scanner | `RAW_HEX` · `RAW_RGB_HSL` · `TAILWIND_CLASS` · `HARDCODED_PX` · `BANNED_COMPONENT` · `BANNED_FIELD` · `BANNED_COLUMN_HEADER` · `ATLASKIT_LEGACY` · `CSS_FILE_IMPORT` · `HAND_ROLLED_MENU` · `BANNED_TOAST` |
| Typography Enforcer | `UPPERCASE_LABEL` · `INVALID_FONTWEIGHT` · `WRONG_FONTSIZE` |
| Spacing Grid Validator | Off-grid px values (valid: 0 / 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 px) |

**Escape hatch** (use sparingly — only for intentional design-system exemplars):
```typescript
// ads-scanner:ignore-next-line
// ads-scanner:ignore-file  ← top of file only
```

### 1B — Signal-gated resource fetch

Detect signals from the surface (file names, component names, field names, DOM probe results). Use `WebFetch` for each triggered URL. Always fetch TIER 1. Fetch TIER 2 only when signal matches.

**Resource check block (emit before compliance scan table):**

```
ADS RESOURCE CHECK — {surface} — {date}

Resource                                              | Tier   | Status      | Finding
atlassian.design/                                    | 1      | FETCHED     | <canonical component confirmed or gap noted>
atlassian.design/components/tokens/all-tokens        | 1      | FETCHED     | <token · light · dark for each gap>
developer.atlassian.com/.../document/structure/      | 2-ADF  | FETCHED/N/A | <ADF node type verified or not triggered>
developer.atlassian.com/.../document/playground/     | 2-ADF  | FETCHED/N/A | <sample generated or not triggered>
npmjs.com/@atlaskit/editor-core                      | 2-edit | FETCHED/N/A | <version + EditorContext wired or not triggered>
npmjs.com/@atlaskit/renderer                         | 2-read | FETCHED/N/A | <version + ReactRenderer props or not triggered>
npmjs.com/@atlaskit/adf-utils                        | 2-ADF  | FETCHED/N/A | <traverse/map API or not triggered>
atlassian.design/components/pragmatic-drag-and-drop  | 2-dnd  | FETCHED/N/A | <DnD pattern confirmed or not triggered>
github.com/atlassian/pragmatic-drag-and-drop         | 2-dnd  | FETCHED/N/A | <implementation detail or not triggered>
atlaskit.atlassian.com/get-started                   | 2-pkg  | FETCHED/N/A | <package install pattern or not triggered>
```

A TIER 1 row left `NOT FETCHED` → audit is incomplete → the current audit cycle does not count toward the cycle cap until fetched.

### 1C — DOM computed-style sweep (Chrome MCP, always for UI surfaces)

```js
// Run via mcp__Claude_in_Chrome__javascript_tool on localhost:8080/<surface-path>
(function adsComputedStyleSweep() {
  const results = [];
  // Check every element with inline styles or className for violations
  document.querySelectorAll('[style], [class]').forEach(el => {
    const s = getComputedStyle(el);
    const style = el.getAttribute('style') || '';
    const cls = el.getAttribute('class') || '';
    const issues = [];
    // Hardcoded hex (outside var())
    if (/#[0-9a-fA-F]{3,6}\b/.test(style) && !style.includes('var(')) issues.push('RAW_HEX');
    // Tailwind utilities
    if (/\b(text-sm|text-xs|text-lg|bg-slate|text-gray|p-\d|m-\d|gap-\d|rounded)\b/.test(cls)) issues.push('TAILWIND');
    // uppercase labels
    if (s.textTransform === 'uppercase') issues.push('UPPERCASE_LABEL');
    // Off-grid font sizes (not in [11,12,14,16,18,20,24,28,32,36])
    const fsNum = parseFloat(s.fontSize);
    const validFs = new Set([11,12,14,16,18,20,24,28,32,36,48]);
    if (fsNum && !validFs.has(Math.round(fsNum))) issues.push('OFF_GRID_FONTSIZE:' + fsNum);
    if (issues.length) results.push({
      tag: el.tagName, id: el.id, cls: cls.slice(0,60), issues
    });
  });
  return results.slice(0, 30); // cap output
})();
```

---

## Phase 2 — GATE

After Phase 1, classify all findings:

| Severity | Criteria | Gate effect |
|---|---|---|
| **P0** | `BANNED_FIELD` · `BANNED_COMPONENT` · `BANNED_COLUMN_HEADER` · direct `@atlaskit/dynamic-table` import · `RAW_HEX` or `TAILWIND_CLASS` in production render path · `UPPERCASE_LABEL` on user-visible labels | **GREEN SIGNAL dimension 8 FAIL.** Surface is blocked. Fix before execution proceeds. |
| **P1** | `RAW_HEX` in non-critical helper · `HARDCODED_PX` off-grid · `ATLASKIT_LEGACY` · `CSS_FILE_IMPORT` · `HAND_ROLLED_MENU` · missing ADS URL citation in Fix column | Surfaced to user. Offer to fix in current session. Does not block GREEN SIGNAL. |
| **P2** | `OFF_GRID_FONTSIZE` · minor spacing deviations · `BANNED_TOAST` (no usage) | Logged only. User decides whether to include in scope. |

**ADS Compliance Scan table (emit after resource check block):**

```
ADS COMPLIANCE SCAN — {Surface} ({file:line range})

# | Element / File           | Violation type      | Current value         | ADS fix (with URL)                             | Severity
--|--------------------------|--------------------|-----------------------|------------------------------------------------|--------
1 | FilterPanel.tsx:42       | RAW_HEX            | #1F845A               | var(--ds-background-success-bold, #1F845A)     | P1
2 | AllWorkToolbar.tsx:18    | TAILWIND_CLASS     | text-slate-500        | var(--ds-text-subtle, #42526E)                 | P1
3 | ColumnPicker.tsx:91      | HARDCODED_PX       | padding: 12px         | padding: 8px or 16px (ADS grid)               | P2
4 | SomeModal.tsx:5          | BANNED_COMPONENT   | from 'react-select'   | @atlaskit/select (https://atlaskit.atlassian.com/...) | P0

Total: N violations — P0: X · P1: Y · P2: Z
ADS GATE: PASS (no P0) | FAIL (X P0 violations — fix required before GREEN SIGNAL)
```

---

## Phase 3 — FIX

**Routing matrix — which agent handles which violation type:**

| Violation type | Agent to route to | Fix pattern |
|---|---|---|
| `RAW_HEX` · `RAW_RGB_HSL` · `TAILWIND_CLASS` | `engineering-frontend-developer` | Replace with `var(--ds-*, fallback)` from token page |
| `HARDCODED_PX` | `engineering-frontend-developer` | Snap to nearest grid value (0/4/8/12/16/24/32) |
| `BANNED_COMPONENT` | `engineering-frontend-developer` | Replace with `@atlaskit/*` equivalent |
| `BANNED_FIELD` · `BANNED_COLUMN_HEADER` | `engineering-frontend-developer` | Remove entirely; no replacement |
| `UPPERCASE_LABEL` | `design-ui-designer` + `engineering-frontend-developer` | Remove `textTransform: 'uppercase'`; use sentence case |
| `ATLASKIT_LEGACY` | `engineering-frontend-developer` | Migrate to `@atlaskit/button/new` |
| `CSS_FILE_IMPORT` | `engineering-frontend-developer` | Replace with CSS-in-JS using `var(--ds-*)` |
| `HAND_ROLLED_MENU` | `engineering-frontend-developer` | Replace with `@atlaskit/dropdown-menu` |
| `BANNED_TOAST` | `engineering-frontend-developer` | Replace with `@atlaskit/flag` |
| Typography drift | `design-ui-designer` | Apply ADS type scale from atlassian.design/foundations/typography |
| `direct @atlaskit/dynamic-table` import (work item surface) | `engineering-frontend-developer` | Replace with `JiraTable` from `src/components/shared/JiraTable/` |

**Per-fix commit format:**
```
fix(ads): <violation-type> in <ComponentName> — use <ADS token or @atlaskit/* component>
```

---

## Phase 4 — VERIFY

After every fix batch:

1. **Re-run CLI:**
   ```bash
   node design-governance/rules/audit.js src/<file-or-dir>
   ```
2. **Take screenshot:** `mcp__computer-use__screenshot` at `localhost:8080/<surface-path>`
3. **Re-run DOM sweep** (Phase 1C script) — confirm no residual violations in rendered output
4. **Emit VERIFY block:**

```
ADS VERIFY — {Surface} — after fix
   CLI result:       PASS (0 violations) | FAIL (N remaining)
   Screenshot:       [attached]
   P0 fixed:         N (list: violation types)
   P1 fixed:         N (list)
   P2 fixed:         N (list)
   Remaining open:   N (list with reason — deferred / Vikram-approved skip)
   ADS GATE:         CLEAR | STILL BLOCKED (list P0 remaining)
```

A fix is not done until the VERIFY block shows `ADS GATE: CLEAR` for all P0 items.
