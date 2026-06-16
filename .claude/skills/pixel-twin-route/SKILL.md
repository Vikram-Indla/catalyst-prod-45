---
name: pixel-twin-route
description: Create an isolated, pixel-faithful twin of a source route into a target route while preserving source artifacts, discovering all UI behavior, and rewiring target data independently.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Edit
  - Write
---

# Pixel Twin Route Skill

## Purpose

This skill creates an isolated target route that visually and behaviorally mirrors a source route while keeping the source route fully protected.

Use this skill when the user wants to clone, replicate, twin, duplicate, mirror, or port a screen, route, page, module, hub, list screen, dashboard, or feature area from one route to another.

The goal is:

- Same visual layout.
- Same components.
- Same design-system usage.
- Same labels and microcopy unless entity-specific.
- Same modals, drawers, actions, filters, hooks, inline editing, and micro-interactions.
- Same runtime behavior.
- Different route.
- Different entity/data source/field/status wiring.
- Zero mutation of the source route artifacts.

This is not a normal copy task. It is a protected, discovery-first, checklist-driven, target-only cloning workflow.

---

# Mandatory Operating Principle

Replicate everything by default.

Only change what the user explicitly marks as different:

- target route
- target entity name
- target data source
- target table/collection/API endpoint
- target field mappings
- target status values
- target permission keys
- target navigation label
- user-approved exclusions

If the user says "clone all", "all", "everything", or equivalent, clone every discovered source behavior and artifact into the target route, except for data-source and entity-specific mappings that require confirmation.

---

# Absolute Source Shield

The source route is read-only.

Never edit, format, refactor, rename, move, delete, simplify, optimize, or otherwise mutate any source artifact.

Source artifacts include but are not limited to:

- source route files
- source page files
- source local components
- source local hooks
- source local constants
- source local types
- source schemas
- source stores
- source tests
- source stories
- source mock data
- source query keys
- source route-specific utilities
- source route registration behavior
- source navigation behavior

Before implementation, record source file hashes.

After implementation, verify source hashes are unchanged.

If any source artifact changed, immediately revert that source file, stop the clone, and report a SOURCE SHIELD VIOLATION.

All fixes after cloning must be target-only.

---

# Target Autonomy Rule

The target route must be autonomous.

The target route must not import route-specific files from the source route.

Forbidden examples:

```ts
import { useProjectHubFilters } from "@/pages/project-hub/hooks/useProjectHubFilters";
import { ProjectHubStatusBadge } from "@/pages/project-hub/components/ProjectHubStatusBadge";
import { projectStatusOptions } from "@/pages/project-hub/constants/projectStatusOptions";
```

Required pattern:

```ts
import { useProductHubFilters } from "@/pages/product-hub/hooks/useProductHubFilters";
import { ProductHubStatusBadge } from "@/pages/product-hub/components/ProductHubStatusBadge";
import { productStatusOptions } from "@/pages/product-hub/constants/productStatusOptions";
```

Shared generic packages and design-system dependencies may be reused.

Shared application components may be reused only if they are truly generic and require no modification.

If a shared component requires modification, do not edit it automatically. Surface a proposal and wait for explicit approval. See "Component Strategy — Mount, Don't Copy" below for the resolution.

---

# Component Strategy — Mount, Don't Copy (the core doctrine)

This is the single most important rule in this skill. Copying a shared/canonical component into the target folder is BANNED. It is the documented #1 cause of parity drift in this codebase (CLAUDE.md: "ADOPT CANONICAL COMPONENTS — DO NOT REIMPLEMENT"; 18 parity defects from `BrSidebarDetails`).

Classify every rendered component, then act by class:

- **shared / atlaskit / design-system** → **MOUNT** the exact component in the target route. Feed it target data through a thin **adapter** (maps target row → the component's expected props). Never copy its markup. Never fork it.
- **route-local leaf** (component defined inside the source route folder, with no other consumer) → **CLONE** it into the target folder and rewire its data. There is nothing to mount.

If a shared component cannot be mounted because it is hardwired to the source data source (e.g. hardwired to `ph_issues`), the fix is to **parameterise its data source** via a prop/adapter — NOT to fork it. Because the source is read-only (Source Shield), that parameterisation is a **PROPOSAL to the user**, never an automatic edit. Print the proposed source change, get approval, then apply it as an explicit, intentional change.

Why mount beats copy on efficiency too: a copy is more lines to maintain and silently loses every future upstream fix; an adapter is small and inherits fixes for free.

---

# Dependency Graph Resolution (run before any cloning)

Do not hand-grep the source route. Run the resolver:

```bash
node .claude/skills/pixel-twin-route/scripts/resolve-graph.mjs \
  --entry <source-route-entry.tsx> --routeDir <source-route-dir> > .source-graph.json
```

It walks the import graph (alias `@/` aware), recurses only into route-local files, and classifies every rendered component as `route-local | shared | atlaskit | external`. The output drives the clone plan: route-local → clone, everything else → mount.

---

# Fidelity Coverage Gate (blocks completion)

A component OR a prop that did not reach the destination is a defect. After cloning, run the gate:

```bash
node .claude/skills/pixel-twin-route/scripts/coverage-gate.mjs \
  --sourceEntry <src-entry> --sourceDir <src-dir> \
  --destEntry   <dst-entry> --destDir   <dst-dir>
```

For every source-rendered component and every prop at its call sites, the gate confirms it was reproduced in the destination. Any miss prints a gap with a **source-side fix proposal** (read-only, needs approval) and a **dest-side fix**, and exits non-zero.

Honesty rule (enforced by the gate, do not override): props behind `{...spread}`, and components rendered behind a spread, are reported as **UNVERIFIABLE** and listed for manual confirmation — never silently counted as covered. A gate that claims 100% while blind to spreads is the audit-fraud pattern (CLAUDE.md 2026-05-19).

The clone is not done while any P0 (missing component) or P1 (dropped prop) gap is unresolved. Resolve it, or `--ignore <Name>` only with an explicit, stated reason.

---

# Schema Pre-Check (run before writing any adapter)

The #1 silent defect in Catalyst is reading a column that does not exist → empty render, no error (CLAUDE.md Assumption Class 2; raw rows are snake_case, Assumption Class 4). Verify every target column the adapter will read BEFORE generating binding code:

```bash
node .claude/skills/pixel-twin-route/scripts/schema-check.mjs \
  --table <target-table> --columns col_a,col_b,col_c
```

It emits an `information_schema` query. Run that query via the Supabase MCP `execute_sql`. **Any returned row is a missing column** — do not write `row.<missing>`; fix the mapping or add a migration first. Real example: checking `business_requests` for `status,summary,owner_id` returns all three as missing (the table uses different column names) — exactly the mapping error that would have shipped a blank UI.

---

# Computed-Style Parity (replaces manual pixel checkboxes)

Do not eyeball parity. Measure it. On the source route, then the target route, run the browser probe via Chrome MCP `javascript_tool`:

```js
// paste scripts/probe-styles.js, then:
__probeStyles(['[data-testid="catalyst-status-pill-trigger"]', '.cv-drawer-sidebar', 'table thead th'])
```

Save each blob (`source.json`, `dest.json`) and diff offline:

```bash
node .claude/skills/pixel-twin-route/scripts/style-diff.mjs --source source.json --dest dest.json
```

px properties tolerate ±1; colors / font-weight (incl. Jira's 653) / text-transform must match exactly. Any mismatch → fix the TARGET only. This is the objective replacement for the parity checklist — never claim parity without a clean style-diff.

---

# Design-System Fidelity Shield

The cloned route must preserve the exact design-system implementation of the source route.

If the source uses Atlaskit or Atlassian Design System components, the target must use the same Atlaskit components and supported prop patterns.

Do not replace Atlaskit components with:

- custom HTML
- Tailwind approximations
- local substitutes
- invented components
- image/div replacements
- non-Atlaskit lookalikes

For each detected Atlaskit component, clone:

- package import
- component usage
- prop structure
- visual role
- layout relationship
- accessibility props
- interaction behavior
- design token usage
- avatar/icon/lozenge/badge/menu/modal/select/button behavior

Only remap entity-specific data bindings such as:

- name
- avatar URL
- owner field
- status field
- options
- IDs
- query outputs
- mutation inputs

Protected Atlassian/ADS areas:

- do not change Atlaskit package versions
- do not change theme provider setup
- do not change token provider setup
- do not change Atlassian CDN references
- do not change CSP/security headers
- do not hardcode unapproved external URLs
- do not bypass existing asset loaders
- do not corrupt avatar/image source wiring
- do not move remote assets locally unless source already does so

Allowed shared dependencies include examples such as:

```txt
@atlaskit/avatar
@atlaskit/button
@atlaskit/select
@atlaskit/modal-dialog
@atlaskit/lozenge
@atlaskit/tokens
@atlaskit/icon
@atlaskit/dropdown-menu
@atlaskit/tooltip
@atlaskit/textfield
```

---

# Interaction Discovery Shield

Discover every visible and hidden interaction from the source screen.

Do not rely only on imports.

Scan for:

- onClick
- onChange
- onSubmit
- onOpen
- onClose
- onSelect
- onBlur
- onFocus
- onKeyDown
- onKeyUp
- onMouseEnter
- onMouseLeave
- onDragStart
- onDragEnd
- onDrop
- useEffect
- useMemo
- useCallback
- custom event handlers
- query hooks
- mutation hooks
- modal state handlers
- drawer state handlers
- toast notifications
- navigation actions
- permission-gated actions
- optimistic update handlers
- rollback handlers

Discover all micro-interactions, including:

- inline editing
- click-to-edit
- double-click editing
- blur-to-save
- Enter-to-save
- Escape-to-cancel
- keyboard navigation
- hover actions
- row hover menus
- context menus
- drag and drop
- column resizing
- column sorting
- column pinning
- expandable rows
- accordion behavior
- popovers
- tooltips
- dropdown behavior
- multi-select behavior
- bulk selection
- validation states
- disabled states
- loading states
- skeleton states
- error states
- empty states
- conditional icons
- conditional labels
- conditional colors
- permission-hidden actions

For each discovered interaction, produce an interaction record before cloning.

Example:

```txt
Interaction: Inline edit status
Trigger: click on status cell
Component: StatusCellEditor
State hook: useInlineEdit
Save action: updateProjectStatusMutation
Cancel behavior: Escape or blur
Validation: status must be valid option
Visual state: yellow border while editing
Target clone rule: clone behavior, remap status field and mutation only
```

---

# Label, Microcopy, and Accessibility Fidelity Shield

Discover and classify all screen text.

Scan for:

- button labels
- column headers
- field labels
- filter labels
- placeholders
- helper text
- tooltip text
- validation messages
- empty-state copy
- toast messages
- dialog titles
- dialog descriptions
- menu labels
- badge text
- status labels
- tab labels
- section titles
- ARIA labels
- screen-reader labels

Classify each label as:

1. Preserve exactly.
2. Remap because entity-specific.
3. Ask user.

Examples:

```txt
"Clear filters" -> preserve exactly
"Project Owner" -> ask/remap to target entity
"No projects found" -> remap to "No products found" if target entity is Product
"Edit project" -> remap to "Edit product"
```

Do not silently drop or rewrite labels.

---

# Color, Token, Badge, and Visual Fidelity Shield

Discover and preserve visual behavior.

Scan for:

- status colors
- badge colors
- Atlaskit Lozenge appearance
- risk colors
- priority colors
- hover colors
- focus ring colors
- selected row colors
- inline edit border colors
- error colors
- warning colors
- success colors
- disabled colors
- icon colors
- chart colors
- conditional row backgrounds
- dark/light mode behavior
- design tokens
- Tailwind classes
- CSS modules
- inline styles
- theme variables
- Atlaskit tokens

Preserve all visual styling unless it is tied to target status mapping.

If source statuses differ from target statuses, ask for a status-to-color mapping.

Do not invent colors.

---

# Discovery Checklist Required Before Coding

Before writing code, produce a clone checklist.

The checklist must include:

```txt
SOURCE ROUTE DISCOVERY CHECKLIST

Route
[ ] source route path
[ ] route registration
[ ] page component
[ ] route params
[ ] navigation entry

Layout
[ ] shell
[ ] header
[ ] toolbar
[ ] filter bar
[ ] list/table/grid
[ ] cards
[ ] empty state
[ ] loading state
[ ] error state
[ ] responsive behavior

Components
[ ] local components
[ ] shared components
[ ] design-system components
[ ] Atlaskit components
[ ] icons
[ ] badges
[ ] avatars
[ ] labels

Hooks
[ ] data hooks
[ ] filter hooks
[ ] mutation hooks
[ ] permission hooks
[ ] state hooks
[ ] inline-edit hooks
[ ] modal/drawer hooks

Actions
[ ] create
[ ] edit
[ ] delete
[ ] duplicate
[ ] export
[ ] import
[ ] bulk actions
[ ] row actions
[ ] context menu actions
[ ] inline save/cancel actions

Modals / Drawers / Popovers
[ ] create modal
[ ] edit drawer
[ ] details drawer
[ ] delete confirmation
[ ] status update modal
[ ] owner/profile popover
[ ] tooltip behavior

Inline Editing / Micro-interactions
[ ] editable cells
[ ] editable labels
[ ] blur behavior
[ ] keyboard behavior
[ ] validation
[ ] optimistic update
[ ] rollback behavior

Data and Wiring
[ ] source data source
[ ] target data source required
[ ] source query keys
[ ] target query keys required
[ ] source fields
[ ] target field mapping required
[ ] source statuses
[ ] target statuses required
[ ] mutations
[ ] cache invalidation

Permissions
[ ] view
[ ] create
[ ] edit
[ ] delete
[ ] export
[ ] admin-only behavior

Tests and Validation
[ ] existing tests
[ ] existing stories
[ ] lint
[ ] typecheck
[ ] build
[ ] runtime probe
[ ] screenshot comparison
```

Then ask the user:

```txt
What do you want to clone?
A) Clone ALL discovered items
B) Clone selected items only
C) Clone all except listed exclusions
```

If the user says "all", proceed with every discovered item.

Still ask for unresolved target mappings.

---

# Required User Mapping Contract

Before implementation, collect or infer and then confirm:

```txt
Source route:
Target route:
Source entity:
Target entity:
Source page/folder:
Target page/folder:
Source data source:
Target data source:
Source primary key:
Target primary key:
Source status field:
Target status field:
Source owner/user field:
Target owner/user field:
Source date fields:
Target date fields:
Source filter fields:
Target filter fields:
Source permissions:
Target permissions:
Source statuses and colors:
Target statuses and colors:
```

If a mapping is unknown and affects data writes, stop and ask.

Never wire target to source tables/endpoints by accident.

---

# Runtime Behavior Probe

When the app can run, probe the source route before cloning and the target route after cloning.

Use available tools and project scripts. Prefer Playwright/Cypress if already present.

Probe:

- initial load
- filter interactions
- dropdown opening
- modal opening
- drawer opening
- inline editing
- row actions
- hover behavior
- click behavior
- keyboard behavior
- save/cancel behavior
- validation behavior
- toast behavior
- permission-based behavior
- responsive behavior

Generate a runtime interaction map.

Example:

```txt
Runtime probe found:
[x] Row hover reveals action menu
[x] Double-click title opens inline editor
[x] Status lozenge opens dropdown
[x] Owner avatar opens profile popover
[x] Delete opens confirmation modal
[x] Save shows success toast
[x] Invalid field shows red validation message
```

If runtime probing is not possible, say so explicitly and continue with static discovery.

---

# Pixel-Parity Verification Loop

After cloning, compare source and target visually where possible.

Check:

- layout dimensions
- visible text
- component positions
- spacing
- colors
- fonts
- icons
- badges
- avatars
- modals
- drawers
- hover states
- inline-edit states
- responsive breakpoints

Produce a parity report:

```txt
PIXEL PARITY REPORT

Desktop 1440px:
[ ] Header layout matched
[ ] Toolbar matched
[ ] Filter bar matched
[ ] Table/list columns matched
[ ] Row height matched
[ ] Avatar component matched
[ ] Status badge colors matched
[ ] Inline edit state matched
[ ] Drawer width matched
[ ] Modal layout matched

Tablet 768px:
[ ] Responsive stacking matched
[ ] Filter collapse behavior matched

Mobile 390px:
[ ] Layout behavior matched if source supports mobile
```

If mismatch exists, fix target only.

Never fix source.

---

# Post-Clone Mandatory Validation

After cloning, run the strongest available validation from the project.

Try these in order, depending on what exists:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
pnpm typecheck
pnpm lint
pnpm test
pnpm build
yarn typecheck
yarn lint
yarn test
yarn build
```

Also run the included helper scripts (in this order):

```bash
# 1. Component + prop coverage — BLOCKING (exit 2 = unreproduced component/prop)
node .claude/skills/pixel-twin-route/scripts/coverage-gate.mjs \
  --sourceEntry <src-entry> --sourceDir <src-dir> \
  --destEntry   <dst-entry> --destDir   <dst-dir>

# 2. Source immutability — BLOCKING (exit 2 = SOURCE SHIELD VIOLATION)
node .claude/skills/pixel-twin-route/scripts/source-shield.mjs verify

# 3. Source-reference leak scan into the target (import + route-string level)
node .claude/skills/pixel-twin-route/scripts/leak-scan.mjs \
  --target <target-folder> --source <source-route> [--routePath /source-route]

# 4. Computed-style parity (after probing both routes with probe-styles.js)
node .claude/skills/pixel-twin-route/scripts/style-diff.mjs --source source.json --dest dest.json
```

`coverage-gate.mjs`, `source-shield.mjs verify`, and `style-diff.mjs` are BLOCKING — a non-zero exit means the clone is not done. `schema-check.mjs` runs earlier (before adapter codegen). If scripts cannot run, explain why.

---

# Forbidden Target Leaks

The target route must not contain:

- source route path
- source route-specific imports
- source page component names
- source hook names
- source query keys
- source table names
- source mutation names
- source status fields
- source permission keys
- source mock data entity names
- source local constants
- source test fixtures
- accidental source database writes

Exception: generic text may remain if it is not entity-specific and was intentionally preserved.

---

# Final Response Required From Claude

At completion, produce:

```txt
PIXEL TWIN ROUTE COMPLETION REPORT
1. Source route
2. Target route
3. Clone mode used
4. Files created
5. Files modified
6. Source files changed: should be 0
7. Source shield status
8. Design-system fidelity status
9. Atlaskit/ADS status
10. Data wiring status
11. Field mapping status
12. Status/color mapping status
13. Interaction parity status
14. Microcopy parity status
15. Validation commands run
16. Validation results
17. Known limitations or items needing manual confirmation
```

Be honest. Do not claim pixel perfection if runtime/screenshot verification was not performed.

---

# Recommended Implementation Workflow

Follow this exact sequence:

1. Parse user request.
2. Identify source route and target route.
3. If missing, ask only for missing route names.
4. Freeze source by recording hashes (`source-shield.mjs snapshot`).
5. Run `resolve-graph.mjs` on the source entry → `.source-graph.json`.
6. Read the graph: route-local files = clone closure; shared/atlaskit = mount list.
7. Identify route-specific vs shared artifacts FROM THE GRAPH, not by hand-grep.
8. Discover components.
9. Discover hooks.
10. Discover actions.
11. Discover modals/drawers/popovers.
12. Discover inline editing and micro-interactions.
13. Discover labels/microcopy.
14. Discover colors/tokens/styles.
15. Discover Atlaskit/ADS usage.
16. Discover data wiring.
17. Discover permissions.
18. Produce clone checklist.
19. Ask clone scope: all / selected / exclusions.
20. Ask unresolved mapping questions only (present an INFERRED draft, not a blank form).
20b. Run `schema-check.mjs` on the target table via Supabase MCP — confirm every mapped column exists BEFORE writing the adapter.
21. Build the target route shell. MOUNT shared/atlaskit components via adapters; CLONE only route-local leaves (per the graph classification).
22. Rename route/entity symbols.
23. Rewire target data through the adapter.
24. Rewire target query keys and mutations.
25. Rewire target permissions.
26. Update target route registration only.
27. Do not modify source route registration behavior.
28. Run `coverage-gate.mjs` — resolve every P0/P1 gap before proceeding.
29. Run leak scan.
30. Run source hash verification (`source-shield.mjs verify`).
31. Run typecheck/lint/build/tests.
32. Run runtime probe if possible.
33. Probe both routes with `probe-styles.js`, diff with `style-diff.mjs` (objective parity).
34. Fix mismatches in target only.
35. Produce completion report.

---

# Failure Rules

Stop and report if:

- source route cannot be found
- target route conflicts with existing route and user did not approve overwrite/merge
- target data source is unknown
- field mapping is required for writes and unknown
- source file hash changed
- target imports route-specific source files
- a shared/canonical component was COPIED into the target instead of mounted
- Atlaskit components were replaced by non-Atlaskit components
- coverage-gate.mjs reports an unresolved P0/P1 gap
- validation fails and cannot be fixed without source modification

---

# User Invocation Examples

```txt
/pixel-twin-route
Source route: /project-hub
Target route: /product-hub
Clone all. Ask me only for target data source, fields, statuses, and permissions.
Do not touch the source route.
```

```txt
/pixel-twin-route
Clone /demand-hub into /initiative-hub.
Create an isolated twin route.
Keep the UI, filters, inline editing, modals, drawers, labels, colors, and Atlaskit usage identical.
Only change the entity and database wiring.
```

```txt
/pixel-twin-route
Source: /project-hub
Target: /product-hub
Clone all except delete action and export action.
```
