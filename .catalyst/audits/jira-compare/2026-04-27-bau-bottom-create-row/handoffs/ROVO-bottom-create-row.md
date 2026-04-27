# ROVO HANDOFF — Bottom-anchored "+ Create" inline row pattern

**Status:** PENDING — paste the prompt below into Rovo and feed the answer back.

**Where to paste:**
1. Open https://digital-transformation.atlassian.net
2. Click the Rovo sparkle icon (top-right next to profile menu)
3. Navigate to the BAU List view: `/jira/software/c/projects/BAU/list?direction=DESC&sortBy=key`
4. Paste the prompt block below
5. When Rovo replies, paste the response back into the Catalyst chat

---

## PASTE-READY ROVO PROMPT (latest refined version, Apr 27, 2026)

```
ROVO IN-FLIGHT PROMPT — Jira list-view bottom-anchored "+ Create" inline row (Business List)

How to run:
1) Open https://digital-transformation.atlassian.net
2) Navigate to:
   https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list?direction=DESC&sortBy=key
3) Scroll to the bottom-left of the table and inspect the "+ Create" row/trigger.
4) Use DevTools:
   - Elements: inspect the "+ Create" trigger and expanded inline row DOM
   - Computed: capture typography (font-family/size/line-height/weight), borders, colors
   - Sources: search for the provided data-testid strings (below) to identify owning modules/components
   - If sourcemaps aren't available: search for the literal testid string and walk up the callsite/chunk

Context:
I'm porting Jira's project list view to Catalyst (a Jira-clone using @atlaskit/* exclusively).
I'm replicating Jira's bottom-of-table "+ Create" inline row pattern visible at:
https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list

In that view, clicking "+ Create" expands an inline row with:
  [type-picker dropdown trigger | "What needs to be done?" input | assignee picker | Create button + ↵]

Type-picker dropdown must show ALL configured work types for the project:
Feature, Epic, Story, Task, QA Bug, Business Gap, Production Incident, API Requirement, Change Request
and includes a footer link: "Manage work types".

Probed DOM clues (testids / hints):
- Table: class includes "BaseTable__table BaseTable__table-main", role="grid"
- Filter button: data-testid="business-filters.ui.filters.trigger.button-wrapper"
- Group button: data-testid="business-list.ui.list-view.header-actions.group-by-dropdown.trigger.button-wrapper"
- Settings: data-testid="business-settings-menu.ui.settings-menu.settings-menu-core.trigger.trigger"
- Drag handle: data-testid="business-list.ui.list-view.select-row-cell.drag-handle.drag-handle-container"
- Row navigation cell: data-testid="business-list.ui.list-view.cell-navigation.cell-container"
- Comments unread dot: data-testid="business-list.ui.list-view.comments-cell.unread"

STRICT output requirements (must follow):
A) Answer ALL questions Q1–Q11.
B) For EACH answer:
   1) Provide the exact @atlaskit/<pkg> name(s) + sub-export(s) (e.g., @atlaskit/popup -> Popup)
   2) Provide the ADS spec link for each component (https://atlassian.design/components/<name>)
      - If the exact package has no ADS component page, say "No ADS page found" and link the closest equivalent.
   3) Mark confidence as one of: CONFIRMED / LIKELY / UNKNOWN
   4) Provide evidence with citations:
      - observed DOM attributes (data-testid, role, aria-*, href, class names),
      - computed styles,
      - or literal strings found in Sources
C) If you cite ADS changelog entries from the last 12 months:
   - include the URL and the specific entry title/date
   - if none exist, explicitly say "No relevant ADS changelog entry found".

Questions (answer all):

Q1) Which @atlaskit/* package(s) compose the bottom "+ Create" inline row?
    Is it:
      (a) @atlaskit/dynamic-table footer row / footer slot,
      (b) a custom React row appended below a BaseTable implementation, or
      (c) an inline-create primitive (if it exists)?
    Name exact package + sub-export(s), with evidence.

Q2) The type-picker dropdown trigger is icon-only and opens a menu listing work types.
    Is this:
      (a) @atlaskit/dropdown-menu with custom item rendering,
      (b) @atlaskit/popup with a custom MenuList,
      (c) @atlaskit/menu directly,
      (d) something else?
    Cite ADS spec page(s) + DOM/Sources evidence.

Q3) The "What needs to be done?" input:
    Is this @atlaskit/textfield with appearance="subtle" (or another appearance),
    or a custom input that shows border only on focus?
    Identify the appearance variant, and cite evidence (DOM props, classnames, computed styles).

Q4) The assignee picker (small avatar before Create button):
    Is it:
      - @atlaskit/user-picker,
      - @atlaskit/smart-user-picker,
      - or @atlaskit/avatar + popup/dropdown?
    Provide exact package(s) + evidence (aria roles, DOM structure, Sources string hits).

Q5) The Create button shows a "↵" keyboard hint to the right.
    Is this:
      (a) @atlaskit/button with iconAfter,
      (b) an Atlaskit keyboard key primitive (if any),
      (c) a plain inline element styled to look like a keycap?
    Name the exact pattern + evidence, and provide the closest ADS spec link.

Q6) Validations enforced on submit (list each rule + client/server split):
    - Summary required?
    - Summary min/max length?
    - Required fields besides summary?
    - Type-specific gating (e.g., epic requirements)?
    - Permission gating before showing "+ Create" row?
    Provide observed error messages and whether enforced client-side, server-side, or both.

Q7) "Manage work types" footer link:
    Provide the exact href and destination.
    Is it Jira issue type scheme / project settings / global settings?
    Mark CONFIRMED/LIKELY/UNKNOWN.

Q8) Is the bottom "+ Create" trigger persistent (always visible below the table)
    or conditional (only appears on hover/scroll position)?
    Provide evidence and the data-testid for the trigger if present.

Q9) Dismiss behavior:
    When inline row is open and user clicks outside or presses Esc:
      - does it collapse back to "+ Create"?
      - does it stay open?
      - does Esc close, or just clear input?
    Provide the exact behavior with evidence.

Q10) Horizontal scrollbar implementation:
     Is it native overflow-x:auto on the wrapper, or a custom/virtualized horizontal scroll component?
     If custom, name the package (best-effort via Sources search).

Q11) Typography + tokens (Catalyst gap):
     For:
       - the "+ Create" trigger
       - the inline create row input
       - the type dropdown trigger
       - the Create button + "↵"
     capture:
       - font-family (Atlassian Sans vs system)
       - font-size / line-height / font-weight
       - text color and background
       - border color + radius
       - focus ring color/width
     If you can map them to ADS tokens (typography tokens, color tokens, border/radius tokens), do so.
     Cite:
       - ADS foundations pages
       - and the computed CSS values from DevTools

Required ADS reference links (use as citations when relevant):
- Typography: https://atlassian.design/foundations/typography
- Tokens: https://atlassian.design/foundations/tokens
- Dynamic table: https://atlassian.design/components/dynamic-table
- Dropdown menu: https://atlassian.design/components/dropdown-menu
- Popup: https://atlassian.design/components/popup
- Menu: https://atlassian.design/components/menu
- Textfield: https://atlassian.design/components/textfield
- Button: https://atlassian.design/components/button
- Avatar: https://atlassian.design/components/avatar
- Inline dialog (legacy): https://atlassian.design/components/inline-dialog

User context (must use):
<user_context>
<document>
- product: jira
  tenantId: 66b89222-afbe-4e02-b5bf-e49dcc583d3d
  subproduct: software
  category: object
  containerId: 10061
  objectId: 10061
  resourceType: list
  preview:
    href: https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list/embed?originUrl=https://object-resolver-service.us-east-1.sp.prod.atl-paas.net&direction=DESC&sortBy=key
  name: Senaei BAU | List
  atlassian:ari: ari:cloud:jira:66b89222-afbe-4e02-b5bf-e49dcc583d3d:project/10061
  url: https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list?direction=DESC&sortBy=key
</document>
</user_context>

Also:
- If you can identify Jira frontend module/file names from Sources (best-effort), include them.
- If you cannot access Jira monorepo file/line citations, say so explicitly (do not invent).
```

---

## What I expect back from Rovo

Rovo's response should answer Q1–Q11 with one of:
- **CONFIRMED** — direct DOM / Sources evidence
- **LIKELY** — strong inference
- **UNKNOWN** — insufficient evidence (this is fine — we'll work around it)

Each answer must include:
1. Exact `@atlaskit/<pkg>` + sub-export
2. ADS spec link
3. Confidence label
4. Evidence (DOM testid / className / computed style / Sources string)

## Acceptance once Rovo answers

- [ ] Audit report saved to `.catalyst/audits/jira-compare/2026-04-27-bau-bottom-create-row.md`
- [ ] CC Task Brief covers all 11 questions with concrete primitives + spec links
- [ ] Validation rules cited with file/line if Rovo provides them
- [ ] Patches land in one surgical pass
- [ ] Typography tokens (Q11) used directly — no hardcoded font-size/line-height in the inline-create row

## Pre-stage items (no Rovo blocker — can do in parallel)

- [ ] Confirm `useStoryBacklog` write path supports `issue_type=QA Bug | Production Incident`
- [ ] Confirm `getProjectIssueTypesMetadata` Atlassian MCP tool can populate the type-picker live
- [ ] Decide whether to deprecate the existing per-group `<InlineCreateRow>` or keep it as a fallback

## Reference links (kept handy)

- Jira BAU list view: https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list?direction=DESC&sortBy=key
- ADS Typography: https://atlassian.design/foundations/typography
- ADS Tokens: https://atlassian.design/foundations/tokens
- ADS Textfield: https://atlassian.design/components/textfield
- ADS Button: https://atlassian.design/components/button
- ADS Popup: https://atlassian.design/components/popup
- ADS Dropdown menu: https://atlassian.design/components/dropdown-menu
- ADS Menu: https://atlassian.design/components/menu
