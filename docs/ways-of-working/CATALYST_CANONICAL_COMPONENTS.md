# CATALYST CANONICAL COMPONENTS

> Rules for component reuse. Search internal before building. Prove unsuitability with evidence.

---

## CANONICAL-FIRST RULE

Before writing any component, primitive, hook, util, or wrapper:

**Step 0 — Search:**
```bash
# Search Catalyst-internal
grep -r "<concept>" src/components src/lib src/hooks

# Check Storybook MCP
# ToolSearch → catalyst-storybook MCP → query component name

# Check @atlaskit
ls node_modules/@atlaskit/ | grep <concept>
```

If found → reuse or extend. Do NOT rebuild.

---

## HIERARCHY

Use this order — no skipping:

1. **Existing Catalyst canonical component** — `src/components/shared/`, `src/components/ui/`, `src/lib/`
2. **Existing Catalyst wrapper** — any component that wraps ADS primitives with Catalyst styling
3. **Catalyst Storybook component** — query `catalyst-storybook` MCP for the canonical story
4. **Atlassian Design System primitive** — `@atlaskit/*` packages
5. **Hand-rolled** — only with explicit Vikram written approval

---

## KNOWN CANONICAL COMPONENTS

| Need | Use |
|---|---|
| Work item table/list | `JiraTable` (`src/components/shared/JiraTable/`) |
| Detail view shell | `CatalystViewBase` |
| Sidebar field rows | `CatalystSidebarDetails` |
| Inline editable assignee | `EditableAssignee` |
| Inline editable priority | `EditablePriority` |
| Inline editable reporter | `EditableReporter` |
| Inline editable date | `CatalystDueDateField` / `makeDateEditCell` |
| Status pill (interactive) | `StatusTransitionDropdown` |
| Status pill (display) | `CatalystStatusPill` / `StatusPill` |
| Work item type icon | `JiraIssueTypeIcon` (`src/lib/jira-issue-type-icons`) |
| Parent linker | `CatalystParentLinker` |
| Watchers chip | `WatchersChip` |
| AI CTA | `AIIntelligenceButton` / `CatyRainbowCTA` |
| Key details rail | `CatalystKeyDetails` |
| Avatar | `@atlaskit/avatar` |
| Button | `@atlaskit/button` |
| Dropdown/menu | `@atlaskit/dropdown-menu` |
| Select | `@atlaskit/select` |
| Modal | `@atlaskit/modal-dialog` |
| Text input | `@atlaskit/textfield` |
| Tabs | `@atlaskit/tabs` |
| Lozenge/badge | `@atlaskit/lozenge` |
| Spinner | `@atlaskit/spinner` |
| Tooltip | `@atlaskit/tooltip` |
| Popup | `@atlaskit/popup` |
| Rich text editor | `@atlaskit/editor-core` + `AtlaskitRenderer` |
| Inline edit | `@atlaskit/inline-edit` |
| Date picker | `@atlaskit/datetime-picker` |
| Side navigation | `@atlaskit/side-navigation` |
| Checkbox | `@atlaskit/checkbox` |
| Toast/flag | `@atlaskit/flag` |

---

## JIRATABLЕ RULE

**`JiraTable` is mandatory for any surface listing work items, issues, epics, features, incidents, requests, or any Jira-derived entity.**

Before building any table/list:
1. Ask: "Does `JiraTable` already support this?"
2. Check its cell factory functions: `makeKeyCell`, `makeStatusCell`, `makeAssigneeCell`, `makeParentCell`, `makePriorityCell`, `makeDateCell`, `makeLabelsCell`, `makeRowMenuCell`, etc.
3. Check its editor factories: `makeSummaryInlineEditCell`, `makeAssigneeEditCell`, `makeStatusEditCellAkPopup`, `makePriorityEditCell`, `makeParentEditCell`, `makeDateEditCell`

If a feature is missing from JiraTable → **extend JiraTable**. Do NOT build a parallel table.

No custom `<table>`, CSS grid table, or flex table unless explicitly approved after written proof.

**JiraTable is also the first candidate for enterprise admin lists** (role tables, user tables, permission matrices).

---

## HOW TO PROVE A COMPONENT IS UNSUITABLE

"Overkill" is not evidence. Prove unsuitability by:

1. **API audit** — show the component's props/API and list exactly which requirements it cannot meet
2. **Usage evidence** — grep all existing usages and show what each usage does
3. **Storybook evidence** — screenshot or describe the Storybook story and show the gap
4. **Written statement** — "I cannot use `JiraTable` because [specific prop/API gap] cannot be solved without a breaking change. The required feature is [X] and the closest approach is [Y]."

Submit this evidence to Vikram for approval. Verbal "it doesn't fit" is rejected.

---

## FORKING BANNED

Forking a canonical component to fit a new data source is **banned**.

Parameterise via prop/adapter instead.

Example: if `JiraTable` is wired to `ph_issues`, add an adapter prop that maps your data source to the same shape. Do NOT fork `JiraTable` into `MyNewTable`.

---

## ADOPTION PATTERN

When a screen must look like an existing Catalyst screen:

1. Identify the canonical interactive components the reference screen uses
2. Mount those exact components
3. Feed them your data through an adapter (map your data shape → component's expected props)
4. Do NOT recreate markup with raw `@atlaskit/*` primitives

"Visual clone" that recreates markup instead of mounting the real component will always drift — it has none of the canonical component's icons, affordances, colors, keyboard nav, a11y, or edge-case handling.
