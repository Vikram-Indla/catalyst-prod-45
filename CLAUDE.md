# WAYS OF WORKING — MANDATORY FOR ALL IMPLEMENTATION

These rules apply to every implementation task. No exceptions. **Applies to ALL agents, skills, and subagents** — main session, catalyst-agent, design-critique, jira-compare, preflight, code-review, every subagent. No exceptions.

---

## 🔤 FONTS BANNED EXCEPT ADS (P0, Non-Negotiable — added 2026-06-09)

**Only the Atlassian Design System CDN and Atlassian-hosted font families are allowed in Catalyst. Every other font source — Google Fonts, Typekit, Fontsource npm packages, self-hosted woff2, system stacks declared as primary — is permanently banned across CSS, TSX, HTML, inline styles, npm dependencies, and CDN links.**

### Allowed (the ONLY allowed sources)

- **Font families (CSS values)**: `var(--ds-font-family-body)`, `var(--ds-font-family-heading)`, `var(--ds-font-family-code)`, `'Atlassian Sans'`, `'Atlassian Mono'`, `'Charlie Display'`, `'Charlie Text'`, `'Charlie Code'`, `inherit`, `unset`. System fallback stacks (`ui-sans-serif`, `-apple-system`, `system-ui`, `Segoe UI`, etc.) are allowed ONLY as fallbacks AFTER an Atlassian family in the same stack — never as the primary family.
- **CDN hosts**: `ds-cdn.prod-east.frontend.public.atl-paas.net`, `*.atl-paas.net`, `*.atlassian.com`, `*.atlassian.design`. Nothing else.
- **`@font-face` declarations**: allowed ONLY when `src: url(...)` points to an Atlassian CDN host above. Self-hosted `/fonts/*.woff2` is banned.

### Banned (no exceptions, no per-case asks)

- ❌ `@import url('https://fonts.googleapis.com/...')` / `fonts.gstatic.com` / `use.typekit.net` / `use.fontawesome.com` / `fontshare.com` / `cdnfonts.com` / `rsms.me/inter`
- ❌ `@fontsource/*` and `@fontsource-variable/*` npm packages (Inter, Roboto, JetBrains Mono, Sora, Plus Jakarta Sans, etc.) — `import '@fontsource-variable/inter'` is a direct violation
- ❌ `<link rel="stylesheet|preconnect|preload" href="<non-Atlassian font CDN>">`
- ❌ `@font-face { src: url('/fonts/inter.woff2') }` (self-hosted woff2)
- ❌ `font-family: 'Inter' | 'Roboto' | 'Open Sans' | 'Sora' | 'Plus Jakarta Sans' | 'JetBrains Mono' | 'Helvetica' | 'Arial' | 'Georgia' | 'Times New Roman' | 'Courier'` as primary
- ❌ Tailwind `font-sans|font-serif|font-mono|font-[Inter]` utilities on any element (also banned by the existing ADS-token Tailwind rule)
- ❌ Dynamic URL strings referencing banned CDNs: `const URL = 'https://fonts.googleapis.com/...'`

### Enforcement (5 layers)

1. **`design-governance/rules/font-import-enforcer.js`** — scans `.css`, `.html`, `.tsx`, `.ts`, `.jsx` for `@import url(...)`, `@font-face { src: url(...) }`, `<link href=...>`, and dynamic font-CDN URL strings. Emits `BANNED_FONT_IMPORT`, `BANNED_FONT_FACE`, `BANNED_FONT_LINK`, `BANNED_FONT_CDN_URL`.
2. **`design-governance/rules/typography-enforcer.js`** — bans `font-family: 'Inter' | 'Sora' | ...` in inline styles (existing `BANNED_FONT_FAMILY` rule).
3. **`design-governance/rules/ads-token-scanner.js`** — bans Tailwind `font-*` utilities (existing `TAILWIND_UTILITY` rule).
4. **`index.html` CSP meta tag** — `font-src` allowlist limits the browser to Atlassian CDN + localhost (Vite HMR). Any non-Atlassian font request is blocked at the browser level with a console error.
5. **`design-governance/scripts/self-test.mjs`** — 9 fixtures pin the font lockdown rules so the scanners cannot regress silently.

### Adding a new font weight or script

The only allowed path is to add it via the Atlassian CDN `@font-face` block in `index.html`. If a glyph or weight is missing from Atlassian Sans/Mono/Charlie, raise it with Vikram — do NOT install a Fontsource package or link to Google Fonts as a workaround.

### Removing a banned font

When the scanner flags `@fontsource-variable/inter` or similar:
1. Remove the `import '@fontsource-variable/...'` line from `src/main.tsx` (or wherever).
2. Uninstall the npm package: `npm uninstall @fontsource-variable/inter`.
3. Grep for any `font-family: 'Inter'` left behind and replace with `var(--ds-font-family-body)`.
4. Re-run `node design-governance/rules/audit.js src/` — should report 0 font violations.

### Why this rule exists

Pre-2026-06-09, `src/main.tsx` imported `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono` (lines 8–9) — non-Atlassian fonts bundled into the production bundle. The comment claimed Inter "registers weight 653 for parity" but Atlassian Sans v4 (already loaded in `index.html` from the official CDN) provides weight 653 natively. Inter was redundant AND a parity drift from Jira's actual rendering. Without a scanner rule, the import had been shipping un-flagged.

**Severity:** P0 — non-ADS fonts cannot ship. Every PR that introduces one is blocked by the audit CI gate.

---

## ♻️ REUSE FIRST — NEVER REBUILD WHAT CATALYST ALREADY HAS (P0, Non-Negotiable)

**Before writing ANY component, primitive, hook, util, or wrapper — search the Catalyst codebase AND `@atlaskit/*` for an existing implementation. Reuse it. Do not rebuild.**

### The Rule

1. **Step 0 of every build task** — BEFORE writing code, run:
   - `grep -r "<concept>" src/components src/lib src/hooks` (Catalyst-internal)
   - Check `node_modules/@atlaskit/` and the catalyst-storybook MCP for an ADS primitive
   - Search canonical components: `JiraTable`, `CatalystSidebarDetails`, `CatalystKeyDetails`, `CatalystViewBase`, `JiraIssueTypeIcon`, `CatalystStatusPill`, `EditableAssignee/Priority/Reporter`, `CatalystParentLinker`, `CatalystDueDateField`, `WatchersChip`, `ImproveIssueDropdown`, `AIIntelligenceButton`, `CatyRainbowCTA`, `InlineCreateWithAI`, `FilterDropdown`, `GroupByControl`, `ColumnManager`, `CatalystDescriptionSection`, `LinkedWorkItemsSection`, `SubtasksPanel`, `ActivityPanel`, `RecommendedPanel`, `AskCaty` surfaces, `ReactionStrip`, `ph_comments` helpers.
   - Atlaskit equivalents always preferred over hand-rolled: `@atlaskit/button`, `@atlaskit/dropdown-menu`, `@atlaskit/select`, `@atlaskit/modal-dialog`, `@atlaskit/textfield`, `@atlaskit/tabs`, `@atlaskit/avatar`, `@atlaskit/lozenge`, `@atlaskit/spinner`, `@atlaskit/tooltip`, `@atlaskit/popup`, `@atlaskit/editor-core` (rich text), `@atlaskit/renderer`, `@atlaskit/dynamic-table` (only outside work-item lists), `@atlaskit/inline-edit`, `@atlaskit/datetime-picker`, `@atlaskit/side-navigation`, `@atlaskit/breadcrumbs`, `@atlaskit/checkbox`, `@atlaskit/radio`, `@atlaskit/toggle`, `@atlaskit/flag`.

2. **Common reuse traps (never reimplement these):**
   - Rich text editor → `@atlaskit/editor-core` + `AtlaskitRenderer` (NOT TipTap from scratch, NOT contenteditable)
   - Avatar → `@atlaskit/avatar` (NOT `<img>` with border-radius)
   - Work item type icon → `JiraIssueTypeIcon` from `src/lib/jira-issue-type-icons` (NOT colored dots, NOT custom SVG)
   - Status pill → `CatalystStatusPill` / `StatusPill` (NOT `<span>` with bg color)
   - Work item table → `JiraTable` (NOT new `<table>`, NOT raw `@atlaskit/dynamic-table` for work items — see canonical-table rule)
   - Detail view shell → `CatalystViewBase` (NOT bespoke modal layout)
   - Sidebar field rows → `CatalystSidebarDetails` (NOT raw form fields)
   - Inline editable field → `EditableAssignee/Priority/Reporter` / `makeXEditCell` factories (NOT always-open select)
   - Menu/dropdown → `@atlaskit/dropdown-menu` (NOT hand-rolled — WCAG violation; see 2026-05-10 lesson)
   - Watcher chip → `WatchersChip` (NOT new popover)
   - AI CTA → `AIIntelligenceButton` / `CatyRainbowCTA` (NOT new rainbow border — see 2026-06-07 lesson)
   - Date field → `CatalystDueDateField` / `makeDateEditCell` (NOT raw `<input type="date">`)
   - Toasts → `@atlaskit/flag` (NOT `sonner`, NOT custom)

3. **If you think you need to build something new** — STOP and ask Vikram: *"I searched [X, Y, Z] and didn't find an existing component for [need]. Should I extend [closest existing] or build new?"* Never silently build a parallel implementation.

4. **Forking a canonical component to fit a new data source is BANNED.** Parameterise via prop/adapter instead (see 2026-06-01 adopt-canonical-components lesson — product All Work reimplementation cost 18 parity defects).

### Why this rule exists

- 2026-05-19 — `CatalystJiraListView` (~1,300 LOC) built from scratch, then `JiraTable` discovered to already have every feature. Whole session wasted, component deleted same day.
- 2026-06-01 — `BrSidebarDetails` / `BrListPanel` reimplemented project-hub surfaces from raw `@atlaskit/select` instead of mounting `CatalystSidebarDetails` + `StatusTransitionDropdown`. 18 parity defects.
- 2026-05-10 — Hand-rolled dropdown in `CatalystViewBase` ⋯ menu = WCAG 2.1 AA failure. Should have used `@atlaskit/dropdown-menu`.
- Every reimplementation drifts. The canonical component has icons, affordances, colours, keyboard nav, ARIA, a11y, and edge-case handling the new code will miss.

**Severity:** P0 — building parallel implementations of existing components is the documented #1 cause of session-wasting defects and parity drift. Reuse first. Extend second. Build new only with explicit Vikram approval.

---

## 🎨 CATALYST DESIGN SYSTEM — SINGLE SOURCE OF TRUTH (P0, Non-Negotiable)

**The canonical Catalyst Design System lives in the published Storybook, exposed as an MCP server. It is the ONLY source of truth for Catalyst component design, ADS token usage, and visual contracts.**

### The endpoint

```
catalyst-storybook MCP → https://main--6a22d4960f743958c893234b.chromatic.com/mcp
```

Registered in `.mcp.json` as `catalyst-storybook` (type: http). Use `ToolSearch` to load its tools, then query it for any Catalyst component, foundation token, pattern, or page layout BEFORE designing, building, or critiquing a UI surface.

### The rule

1. **Before building or restyling ANY component**, query the `catalyst-storybook` MCP for the canonical story of that component (or its nearest design-system equivalent). The Storybook story is the reference — match its tokens, spacing, typography, states, and structure.
2. **The Storybook + Atlassian Design System (https://atlassian.design/) are the two — and only — design authorities.** Storybook is the Catalyst-specific instantiation; ADS is the upstream primitive/token catalogue. Nothing else (no ad-hoc hex, no Figma export, no screenshot inference) overrides them.
3. **The design system tree** (query the MCP to browse): Foundations (Colors, Typography, Spacing, Elevation, Motion) · Components (Button, Badge, Avatar, Status, Tag, Dropdown, Modal, Drawer, Spinner, Tooltip) · Enterprise Components (Dynamic Table, Rich Text Editor canonical+custom, Kanban Board, Sprint Board, Release/Portfolio Selector, Work Item Hierarchy Tree, Activity Section, Child Issues, Linked Issues) · Patterns (CRUD, Bulk Edit, Approval, Workflow) · Pages (Business Request, Epic, Feature, Story, Subtask) · Catalyst AI & Feed (Caty Insight Card, Caty Rainbow CTA, AI Intelligence Button, Jira Issue Type Icon, For You Row).
4. **When a story exists for a surface you're touching, ADOPT it** — do not reimplement (see "ADOPT CANONICAL COMPONENTS" rule below). When a story does NOT exist, the closest ADS primitive + token map is the fallback, never invented values.
5. **design-critique and catalyst-agent MUST consult this MCP** as their design authority before scoring or routing any UI work.

**Severity:** P0 — building or critiquing UI without first consulting the canonical Storybook MCP is a process violation. The Storybook is the contract; drift from it is a defect.

---

## 📵 SCREENSHOT CHECKS BANNED FOR FUNCTIONALITY BUILDING (P0, Non-Negotiable)

**When building or verifying any FUNCTIONAL behavior, use MCP / DOM / CSS / Atlassian REST / Supabase probes — NEVER screenshots.**

- ❌ Do NOT use screenshots to verify wiring, data flow, CRUD, routing, state, or any functional logic.
- ✅ Use: Atlassian REST (`/rest/agile/1.0/*`, `/rest/api/3/*`), Chrome MCP DOM/`getComputedStyle` probes, Supabase MCP (`execute_sql`, `list_tables`), code archaeology.
- ✅ Screenshots permitted ONLY for **cosmetic text changes** or **color/visual-only changes**.

**Why:** Functional defects (broken handlers, undefined fields, RLS 403s, wrong FK targets) are invisible to a screenshot — they require structural probing. A screenshot proves appearance, never behavior. (Vikram, 2026-06-01)

**Severity:** P0 — a "looks right" screenshot is not evidence a feature works.

---

## 🔁 ADOPT CANONICAL COMPONENTS — DO NOT REIMPLEMENT (P0, Non-Negotiable)

**When a product-hub surface must "look exactly like" a project-hub surface, REUSE the canonical interactive components via a data adapter. NEVER build a parallel reimplementation.**

### Why this rule exists (2026-06-01)

The product All Work + Business Request detail view were built as **parallel reimplementations** (`BrSidebarDetails`, `BrListPanel`) using raw `@atlaskit/Select` + plain `Avatar` + a non-interactive status `<span>`. A DOM/CSS probe vs the project reference (`/project-hub/BAU/allwork`) found **18 evidence-backed parity defects** from this one decision:
- Right-rail fields rendered as always-open react-select controls instead of click-to-edit inline (project uses `EditableAssignee` / `EditablePriority` / `EditableReporter` / `CatalystDueDateField`).
- Status pill was a non-interactive `<span>` (could not change status) instead of the functional `StatusTransitionDropdown`; wrong colour (`rgb(239,255,214)`), double-rendered, wrong width.
- Navigator cards lost the assignee avatar that `WorkListPanel` shows.
- Priority lost its `PriorityIcon`; Assignee/Reporter lost their avatars; "Assign to me" link absent.

A "visual clone" that re-creates markup instead of mounting the real component will ALWAYS drift — it has none of the canonical component's icons, affordances, colours, or behaviour.

### The rule

1. **Identify the canonical component the project surface uses** (`CatalystSidebarDetails`, `StatusTransitionDropdown`, `WorkListPanel`, `EditableAssignee/Priority/Reporter`, `CatalystDueDateField`, `JiraTable`, etc.).
2. **Mount that exact component** on the product surface, feeding it product data through an adapter (map `business_requests` → the component's expected props). Do NOT re-create its markup with raw `@atlaskit/*` primitives.
3. **If the canonical component is hardwired to `ph_issues`**, the correct fix is to parameterise its data source (adapter/prop), NOT to fork it. Forking = drift.
4. **Naming parity:** product nav/labels mirror project labels by role — "Project Work" → **"Product Work"** (not "All Work"); "Project Backlog" → "Product Backlog"; etc.
5. **Verify by DOM/CSS probe against the project reference** before declaring parity — same selectors, side-by-side, measured values. "Looks similar" is not parity.

**Severity:** P0 — superficial cloning is the documented cause of repeated product-module regressions. Adopt, don't reimplement.

---

## 🏢 ENTERPRISE UI GUARDRAIL — NEVER IMPLEMENT CONSUMER ANIMATIONS (P0, Non-Negotiable)

**Catalyst is an enterprise work-management platform.** Every UI decision must pass the enterprise benchmark.

### The Rule

Before implementing any animation, visual effect, or interaction pattern, ask: **"Does Jira, Salesforce, Workday, or ServiceNow do this?"** If the answer is no, **STOP and ask Vikram** — do not implement.

### Permanently banned enterprise UI anti-patterns:
- ❌ **Spinning / rotating containers** — applying `transform: rotate()` or animation to a wrapper that contains text/buttons (the content rotates with the container)
- ❌ **Conic-gradient ANIMATIONS** on buttons, pills, or any clickable surface (the gradient itself or its container rotates/animates)
- ❌ **Pulsing glows, neon outlines, particle effects, "AI aura" effects**
- ❌ Any animation applied to a wrapper that contains text — text must never rotate, scale, or blur
- ❌ Rainbow / multi-colour gradient borders on interactive controls (buttons, pills, lozenges) — **EXCEPT the AI CTA carve-out below**

### Carve-out — Static rainbow border on AI CTAs ONLY (added 2026-05-31, amended same day)

A **static** (non-animated, non-rotating) conic-gradient rainbow border is permitted **exclusively** on AI-branded CTAs (Ask Caty / CATY surfaces) as a permanent visual marker that the control is the AI affordance. Strict conditions:

- ✅ ONLY on AI-branded CTAs — NEVER on generic buttons. Approved components: `AIIntelligenceButton` (R360 toolbar / Ideation page), `SuggestReplyTile` in `RecommendedPanel.tsx` (Ask Caty on mentions), `ReplyComposer.tsx` Ask Caty button (notifications reply composer), per-card "Ask Caty" summarize pill in `RecommendedPanel.tsx`, panel-header "Ask Caty — summarize N" digest CTA in `RecommendedPanel.tsx`, modal header pill in `SummarizeDigestModal.tsx`, "Ask Caty - Themify" CTA in `AssignedPanel.tsx` + matching modal header in `ForYouPage.atlaskit.tsx`. `AskCatalystPill` (top-nav) was DELISTED 2026-05-31 when the component was removed from the global header — AI is now strictly contextual, never global. `Caty Focus` tab was DELISTED 2026-05-31 when the tab was removed from `FOR_YOU_TAB_ORDER` and its functionality moved into the Themify modal.
- ✅ ALWAYS visible (idle + processing) — the rainbow is the AI signifier, not a processing indicator
- ✅ MUST be `animation: none` — pure static gradient, no rotation, no shift, no shimmer, ever
- ✅ Processing state inside the button uses `@atlaskit/spinner` + label "Thinking…" + `aria-busy={true}` — these are independent of the rainbow border
- ✅ MUST use 2px padding-wrapper pattern (not negative-inset position:absolute)
- ❌ NEVER replicate this pattern on non-AI buttons (regular submit, cancel, save, delete, etc.)
- ❌ NEVER add rotation, animation, or any motion to the gradient
- ❌ NEVER apply to button text (only to the wrapper background)

Approved reference implementation: `src/components/ui/AIIntelligenceButton.tsx`
Approved palette: `#FF3CAC → #784BA0 → #2B86C5 → #00C9FF → #92FE9D → #FFD700`

### Approved loading/processing indicators for buttons:
- ✅ `@atlaskit/spinner` (`size="small"`, `appearance="invert"`) replacing the icon — the ADS canonical pattern
- ✅ `disabled={true}` + `cursor: not-allowed` while awaiting a response
- ✅ Label change ("Loading…") with `aria-busy={true}`
- ✅ `opacity: 0.7` on the button while non-interactive
- ✅ Subtle hover via `filter: brightness(1.08)` — NOT scale/transform on the button itself

### Incident: 2026-05-31 — Spinning rainbow on "Ask Caty" button

**What happened:** Claude was asked to add a rainbow ring to the Ask Caty button. Instead of flagging that this pattern is consumer/gaming UI (not enterprise), Claude implemented a `conic-gradient` rotating wrapper that caused:
1. The ENTIRE button including its "Ask Caty" text label to rotate 360° continuously
2. "Ask Caty" appearing **upside-down and spinning** in the global nav bar
3. A full revert was required

**What Claude should have done:** Stopped at the request and said: *"A spinning rainbow border is consumer UI. Enterprise apps use `@atlaskit/spinner` for loading state. Do you want a spinner inside the button instead?"* Then asked for confirmation before touching any code.

### Clarify before implementing AI/animation features

If a request involves any visual effect, motion, or AI-state indicator that isn't in the ADS component catalogue, **ask first**:
- "Which specific button/component should this apply to?"
- "Enterprise pattern would be X — is that what you want, or something different?"
- "This would use [pattern] — should I proceed?"

**Never assume consent for a visual pattern because it was mentioned in conversation context.**

---

## 🔒 WORK ITEM TYPE ICONS — LOCKED REGISTRY (P0, Non-Negotiable)

**Every work item type icon in Catalyst is rendered by `JiraIssueTypeIcon` from `src/lib/jira-issue-type-icons.tsx`. The type string passed to the `type` prop MUST match the canonical registry. No guessing, no mapping from subtypes.**

### Canonical icon registry (source of truth: `/admin/icons`)

| Work item type | `type` prop value | Icon | Asset |
|---|---|---|---|
| Story | `'Story'` | Blue bookmark | `story.svg` |
| Epic | `'Epic'` | Purple lightning | `epic.svg` |
| Feature | `'Feature'` | Green hexagon | `feature.svg` |
| Task | `'Task'` | Blue checkbox | `task.svg` |
| Sub-task | `'Sub-task'` | Blue mini-checkbox | `sub-task.svg` |
| QA Bug / Defect | `'QA Bug'` or `'Defect'` | Red circle | `qa-bug.svg` |
| Production Incident | `'Production Incident'` | Red flame | `production-incident.svg` |
| Change Request | `'Change Request'` | Amber arrows | `change-request.svg` |
| **Business Request** | **`'Business Request'`** | **Amber lightbulb** | `business-request.svg` |
| Business Gap | `'Business Gap'` | Orange gap | `business-gap.svg` |
| Backend | `'Backend'` | Grey gear | `backend.svg` |
| Frontend | `'Frontend'` | Blue monitor | `frontend.svg` |
| Integration | `'Integration'` | Blue chain | `integration.svg` |
| Idea | `'Idea'` | Yellow bulb | `idea.svg` |

### Rules

1. **ALL Business Requests use `type='Business Request'` (amber lightbulb).** Never pass the `request_type` subtype (feature/gap/integration/data_request) — those are field values, not work item types.
2. **Sidebar recent items, navigator cards, table key cells, detail view headers** — every surface that shows a work item icon MUST use `JiraIssueTypeIcon` with the canonical `type` string from the table above.
3. **When in doubt about which icon to use:** open `/admin/icons` in the browser and match the visual. The registry in `jira-issue-type-icons.tsx` is authoritative.
4. **Never add a new type icon without updating this table** and the registry file simultaneously.

### Why this rule exists (2026-06-01)

`ProductHubSidebar` had a `mapBrTypeToIconType` function that mapped `request_type` values (`'feature'`→Feature icon, `'gap'`→Business Gap icon, etc.) — showing the wrong icon for every BR. A Feature-type BR showed the blue Feature checkbox instead of the amber BR lightbulb. The function was a wrong abstraction: `request_type` is a field inside a Business Request, not a work item type.

**Severity:** P0 — wrong icons break type recognition across the entire product module.

---

## THE FOUR RULES — UNIVERSAL BASELINE (P0, Non-Negotiable)

These four rules govern HOW every other rule in this file is applied. They precede all Catalyst-specific guardrails below. If a project-specific rule and one of these four ever appear to conflict, stop and ask Vikram — do not silently choose.

### Rule 1 — Think Before Coding

Before writing a single line:
- State your assumptions explicitly.
- If multiple valid interpretations exist, present them instead of silently choosing one.
- If something is unclear, stop and ask. Never guess and barrel ahead.
- If you are confused, say so rather than pushing forward.

### Rule 2 — Simplicity First

Write the simplest solution that meets the requirements:
- No abstractions the task doesn't require.
- No features you weren't asked for.
- No future-proofing for hypothetical requirements.
- No extra error handling for edge cases that aren't in the spec.

### Rule 3 — Surgical Changes

Touch only what the task requires:
- Do not refactor adjacent code you weren't asked to touch.
- Do not rename variables, functions, or files unless asked.
- Do not add comments unless requested.
- Do not reorganize imports or formatting.
- Do not improve things that weren't broken.

### Rule 4 — Goal-Driven Execution

- State what "done" looks like before writing any code.
- Verify the goal is met before stopping.
- Do not mark a task complete based on effort — only on outcome.
- If you can't verify done, say so explicitly rather than declaring success.

### Note on the Extended 12-Rule Version

An extended 12-rule variant exists (originally published by @mnilax / Mnimiy on 2026-05-09 after testing across 30 codebases — reportedly took mistakes from 41% down to 3%). Rules 5–12 target: dependency assumptions, test verification, rollback planning, context drift in long sessions, API contract checking, file scope isolation, output format consistency, and completion signaling. The original 4 above are the universal baseline for Catalyst. Adopt from Rules 5–12 only when a specific failure pattern justifies it, and only after Vikram approval.

---

## 🚫 HARDCODED COLORS BANNED — ADS TOKENS MANDATORY (Non-Negotiable, P0)

**Every color value in every file MUST use an ADS design token. Hardcoded hex, raw rgb(), rgba(), and hsl() values are permanently banned from all UI surfaces.**

### The Rule

- ✅ `var(--ds-surface, #FFFFFF)` — token first, ADS-specified fallback only
- ✅ `token('color.background.neutral', '#F1F2F4')` — Atlaskit `token()` helper
- ✅ `var(--ds-text-subtle, #42526E)` — any `--ds-*` token with its canonical fallback
- ❌ `background: '#E9F2FE'` — bare hex, banned
- ❌ `color: 'rgb(41,42,46)'` — bare rgb(), banned (wrap in a token: `var(--ds-text, rgb(41,42,46))`)
- ❌ `background: 'rgba(9,30,66,0.06)'` — bare rgba() as a standalone value, banned
- ❌ `className="bg-slate-100 text-gray-500"` — Tailwind color utilities, banned

### Canonical ADS Token Map for Common Surface Values

| Use case | Correct token | Light fallback |
|---|---|---|
| Page / module background | `var(--ds-surface, #FFFFFF)` | `#FFFFFF` |
| Elevated card / modal | `var(--ds-surface-overlay, #FFFFFF)` | `#FFFFFF` |
| Sunken / recessed area | `var(--ds-surface-sunken, #F7F8F9)` | `#F7F8F9` |
| Neutral fill | `var(--ds-background-neutral, #F1F2F4)` | `#F1F2F4` |
| Subtle neutral fill | `var(--ds-background-neutral-subtle, #F7F8F9)` | `#F7F8F9` |
| Row hover | `var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))` | see token |
| **Selected / active row** | `var(--ds-background-selected, #E9F2FE)` | `#E9F2FE` ← ONLY for selection state, not page bg |
| Primary text | `var(--ds-text, #172B4D)` | `#172B4D` |
| Subtle text | `var(--ds-text-subtle, #42526E)` | `#42526E` |
| Subtlest text | `var(--ds-text-subtlest, #6B778C)` | `#6B778C` |
| Border default | `var(--ds-border, #DFE1E6)` | `#DFE1E6` |
| Brand blue | `var(--ds-link, #0052CC)` | `#0052CC` |

### Semantic Correctness is Mandatory

Using the wrong token is a violation even if the visual fallback color looks similar:
- `--ds-background-selected` → ONLY for selection state (highlighted rows, active nav items)
- `--ds-surface` → ONLY for page/module backgrounds
- These are NOT interchangeable even though both may resolve to blue-ish or white values in some themes

### When You're Working on Any Feature

1. **Search before writing**: look up the correct ADS token for the use case above.
2. **Audit your own diff**: run `node design-governance/cli/index.js audit src/<your-file>` before committing.
3. **Fix violations you encounter**: if you touch a file and see nearby hardcoded values, fix them in the same commit.

### Why This Rule Exists

On 2026-05-21, `BacklogPage.atlaskit.tsx` had `BG_DEFAULT = 'var(--ds-background-selected, #E9F2FE)'` as its page background — a selection-state token used as a page surface color. The blue tint `#E9F2FE` was added to match a Jira DOM probe but the semantically correct token for a page background is `var(--ds-surface, #FFFFFF)`. The wrong token had been shipping for weeks because there was no explicit ban on token misuse. Fixed in `BAU-backlog-background-fix-01`.

**Severity:** P0 — wrong tokens produce incorrect visual states that ship silently. The design system audit CI gate enforces this rule on every PR.

---

## 🗂️ CANONICAL TABLE COMPONENT — JIRATABLЕ (Non-Negotiable)

**`src/components/shared/JiraTable/` is the ONLY approved table component for any surface that lists work items, issues, epics, features, incidents, requests, or any Jira-derived entity.**

### Rule
- ✅ Use `JiraTable` — import from `src/components/shared/JiraTable/`
- ✅ Use its cell factory functions: `makeKeyCell`, `makeStatusCell`, `makeStatusEditCell`, `makeAssigneeCell`, `makeParentCell`, `makeCommentsCell`, `makePriorityCell`, `makeDateCell`, `makeLabelsCell`, `makeFixVersionsCell`, `makeRowMenuCell`, `makeCaretCell`, `makeDragHandleCell`
- ✅ Use its editor factories for inline editing: `makeSummaryInlineEditCell`, `makeAssigneeEditCell`, `makeStatusEditCellAkPopup`, `makePriorityEditCell`, `makeParentEditCell`, `makeDateEditCell`, `makeLabelsEditCell`
- ❌ NO new `<table>` HTML from scratch for work item lists
- ❌ NO `@atlaskit/dynamic-table` directly for work item surfaces
- ❌ NO shadcn `<Table>` for work item surfaces
- ❌ NO CSS Grid / Flex custom table layouts for work item surfaces

### Before building any list/table surface
**First question every time:** "Does `JiraTable` already support this?"
- Column schema is fully customizable — any column combination is possible
- Grouping, sorting, pagination, inline editing, bulk select, column reorder/resize, row virtualization, keyboard nav are all built in
- If a feature is genuinely missing from JiraTable, extend JiraTable — do NOT build a parallel table

### Why
A session in 2026-05-19 built `CatalystJiraListView` (~1,300 LOC wrapping `@atlaskit/dynamic-table`) from scratch, ran a full jira-compare + design-critique cycle on it, then discovered `JiraTable` already existed with 20+ columns, inline editing, grouping, virtualization, keyboard nav, and column reorder — all features the new component lacked. The entire session was wasted. The new component was deleted in the same session.

**Severity:** P0 — building a competing table is a session-wasting defect, not a style preference.

---

## 🎯 DESIGN SYSTEM GUARDRAIL — ENFORCED AT CI GATE (Non-Negotiable)

**All code generation in Catalyst MUST respect the Atlassian Design System v4 as the exclusive design system.** This guardrail is enforced at three points:

### Immediate Requirements
1. **Use `@atlaskit/*` components exclusively**
   - ✅ `@atlaskit/button`, `@atlaskit/dropdown-menu`, `@atlaskit/select`, `@atlaskit/modal-dialog`, `@atlaskit/textfield`, `@atlaskit/modal-dialog`, `@atlaskit/tabs`
   - ❌ NO `react-select`, `react-modal`, `react-dropdown`, hand-rolled menus/dropdowns/modals

2. **Use `var(--ds-*)` ADS tokens exclusively**
   - ✅ `var(--ds-text)`, `var(--ds-background-information)`, `var(--ds-border-neutral)`, etc.
   - ❌ NO hardcoded hex colors (`#FF0000`), NO Tailwind classes (`text-slate-500`), NO raw RGB values

3. **Use spacing grid: 4px / 8px / 16px / 24px / 32px only**
   - ✅ `padding: 8px`, `margin: 16px`, `gap: 4px`
   - ❌ NO arbitrary px values (`padding: 12px`, `margin: 18px`, `gap: 6px`)

4. **Use sentence-case labels only**
   - ✅ "Create new issue", "Edit assignment"
   - ❌ NO `text-transform: uppercase` on any labels

5. **Never render permanently banned fields/components**
   - ❌ Story Points, MDT Ref, Assessment Feature, Service Now#
   - ❌ Standalone Type column (type icon goes INSIDE Key cell)
   - ❌ Category column, Space URL column, Templates column

### Enforcement Points

**1. CI Gate (GitHub Actions) — BLOCKS PRs**
- On every push/PR to main, `.github/workflows/design-system-audit.yml` runs `node design-governance/rules/audit.js src/`
- If violations found → workflow fails, PR merge is BLOCKED
- Exit code 1 = violations detected → cannot merge
- Exit code 0 = clean → can proceed

**2. Pre-Commit Hook (Local)**
- `.husky/pre-commit` runs audit locally before commit
- Informational only (does not block commits), but violations are flagged

**3. CLI Tool (Developer)**
- Run before committing: `node design-governance/cli/index.js audit src/`
- Shows all violations with file, line, type, and fix suggestion

### Before Writing Component Code

**Every Claude session (and every developer) MUST follow this sequence:**

1. **Check if @atlaskit/* has the primitive**
   ```bash
   # Get canonical ADS setup
   node design-governance/cli/index.js info
   ```
   - If the primitive exists in Atlaskit, use it
   - If it doesn't exist, ask Vikram before rolling your own

2. **Check ADS tokens for colors/spacing**
   - Theme colors: `var(--ds-background-information)`, `var(--ds-text-danger)`, etc.
   - Spacing: 4/8/16/24/32px only
   - Never use custom hex or Tailwind

3. **Write component using ONLY Atlaskit + ADS tokens**
   - Example:
   ```tsx
   // ✅ CORRECT
   import Button from '@atlaskit/button';
   
   <Button appearance="primary" onClick={handleClick}>
     Create issue
   </Button>
   
   // ❌ WRONG
   import { Button as UIButton } from 'react-ui-lib';  // NOT Atlaskit
   <UIButton style={{ color: '#FF0000' }}>Create issue</UIButton>  // Hardcoded hex
   ```

4. **Validate immediately**
   ```bash
   node design-governance/cli/index.js audit src/components/MyComponent.tsx
   ```
   - If violations → regenerate with fixes
   - If clean → proceed to commit

5. **Commit only after audit passes**
   - Pre-commit hook will verify again
   - If it fails, fix and recommit

### What Happens If Violations Ship

- ✅ Local pre-commit hook catches them (informational warning)
- ✅ GitHub Actions CI detects them and fails the PR
- ✅ PR cannot merge until violations are fixed
- ❌ Violations are never allowed on main

### Design System Files

- **Policy**: `design-governance/GOVERNANCE_POLICY.md` — master policy document
- **Audit Rules**: `design-governance/rules/audit.js` + `ads-token-scanner.js`, `typography-enforcer.js`, `spacing-grid-validator.js`
- **CLI Tool**: `design-governance/cli/index.js` — run `node design-governance/cli/index.js [command]`
- **Rollout Plan**: `design-governance/reports/ROLLOUT_PLAN.md` — developer checklist and timeline

---

## 2026-05-17 — Jira packs Type icon INSIDE the "Work" column; no standalone Type column in Jira's list view
**Surface:** UWVTable (`/project-hub/:key/allwork`), IncidentListPage (`/incidents`), BacklogPage (`/project-hub/:key/backlog`)
**Pattern:** Live Jira BAU list screenshot (2026-05-17) showed ONE combined "Work" column rendering `[type icon][BAU-key][summary text]` in a single cell — NO standalone Type column. Catalyst had standalone Type columns in 3 surfaces: `id: '__type'` (width 3) in `UWVTable.tsx:162`, `id: '__type'` (width 4) in `IncidentListPage.tsx:104`, and `id: 'type'` (width 4, label `'Type'`) in `BacklogPage.atlaskit.tsx:1784`. An earlier 2026-04-27 audit note claimed Jira HAS a Type column header (`data-key=issuetype, ~110px`); that audit's reading was either wrong or Jira's UI changed — the 2026-05-17 screenshot is the current ground truth. A pre-existing handover proposed deleting `__type` from "all 7 JiraTable consumers" but the grep showed `__type` exists in only 2 of 7 — the handover's surface mapping was inaccurate. Always re-probe before applying a handover.
**Rule:** Jira's BAU list view shows ONE combined "Work" column with type icon + key + summary. For parity:
1. Catalyst surfaces that have a standalone icon-only Type column (`id: '__type'` or icon-only `id: 'type'`) should remove that column and render the type icon as a leading prefix inside the Key cell.
2. Use `makeKeyCell(getKey, onOpen, getHref, getIcon)` — the 4th positional argument added 2026-05-17 — to pass a per-row icon renderer that lives inside the Key cell.
3. Drop the `makeTypeIconCell` import once the standalone column is removed (utility still exists in `cells.tsx` for any future standalone-icon-column case).
4. BacklogPage's `id: 'type'` column was NOT removed in this cycle (per explicit user scope) — flag for a follow-up parity cycle.
5. Before applying any handover, grep the codebase to verify the handover's claims about which files / which patterns / which line numbers. "Handover says X" is not the same as "X is true now."
**Fix:** Added `getIcon` as optional 4th param to `makeKeyCell` ([cells.tsx:248](src/components/shared/JiraTable/cells.tsx:248)). Removed `__type` column block + `makeTypeIconCell` import from [UWVTable.tsx](src/components/universal-work-view/UWVTable.tsx) and [IncidentListPage.tsx](src/pages/incidenthub/IncidentListPage.tsx); both now pass the type icon into `makeKeyCell` via `getIcon`. Test: [no-type-icon-column.test.ts](src/components/shared/JiraTable/__tests__/no-type-icon-column.test.ts) — 6 source-grep assertions (no `__type`, no `makeTypeIconCell` import, icon source appears within `makeKeyCell(...)` call).
**Severity:** P1 (parity drift — icon-only column was non-Jira convention; H2 affordance gap also; not a CRUD blocker)

---

## 2026-05-16 — STOP AND ASK before classifying entities; never blindly surface data that was stated as out of scope
**Surface:** AllProjectsPage (`/project-hub/projects`), `useProjectHub.ts` `excludedProjectKeys`
**Pattern:** The "Investor Journey" Jira project (key: INV) was synced and displayed in the All Projects table. Vikram had explicitly stated multiple times that Investor Journey is a **product, not a project** and belongs in the Products module, not Projects. The code surfaced it anyway because `excludedProjectKeys` only excluded `TH-DEFAULT` and `MDT`. Additionally, the Members column rendered inconsistently between rows (avatar placeholder vs "Add members" text) because the two rows had different member counts — a discrepancy that could have been caught by asking before shipping. The Key column values (BAU, INV) were also left-aligned while the column header was centered.
**Three concrete mistakes:**
1. **Entity classification** — Displaying INV under Projects without checking if it was classified as a product. Vikram stated it was a product multiple times. This is a **build-without-asking** failure.
2. **Visual inconsistency not raised** — The Members column showed different UI (avatar vs text button) across rows. Should have been logged as a finding before shipping, not discovered post-hoc by Vikram.
3. **Column alignment gap** — Key column header appeared centered (drag grip icon causes visual centering), cells were left-aligned. Never measured or compared against Jira before declaring done.
**Rule:** Before rendering ANY Jira-synced project in a module, check: (1) Is this entity classified by Vikram as belonging to a different module? (2) Are all visible columns rendering consistently across ALL rows, not just the first row? (3) Are cell values aligned to match their column header alignment? When in doubt about classification of an entity, **STOP AND ASK** — do not assume Jira's list is the correct subset for Catalyst's module boundary. Add newly-excluded project keys to `excludedProjectKeys` in `useProjectHub.ts`.
**Fix:** Added `'INV'` to `excludedProjectKeys` in `useProjectHub.ts:37`. Added `textAlign: 'center'` to Key column `<td>` in `AllProjectsTable.tsx:1107`.
**Severity:** P0 (wrong entity shown in wrong module; Vikram had corrected this classification multiple times before)

---

## 2026-05-16 — PRODUCTION INFRASTRUCTURE SNAPSHOT

**Active Supabase Project:** `lmqwtldpfacrrlvdnmld` (Catalyst KSA org)
- **URL:** `https://lmqwtldpfacrrlvdnmld.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtcXd0bGRwZmFjcnJsdmRubWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTkwODEsImV4cCI6MjA5NDQzNTA4MX0.CITWnsiEJEd1B-G4RReYZdaTFbBNvw8NnM8OrRvDX8s`

**Connected Repositories:**
1. `catalyst-prod-45` (web) — owns schema, migrations, edge functions; auto-deploys via git
2. `CatyMobile` (iOS) — client-only; connects via Supabase Swift SDK

**Application Secrets (Supabase):** 7 set
- `ANTHROPIC_API_KEY` — Claude AI for CATY features
- `GEMINI_API_KEY` — Google Gemini for story improvement, similarity, digests
- `JIRA_BASE_URL` — `https://digital-transformation.atlassian.net`
- `JIRA_EMAIL` — `vikramataol@gmail.com`
- `JIRA_API_TOKEN` — stored (rotate after migration)
- `JIRA_WEBHOOK_SECRET` — auto-generated; guards webhook receiver
- `LIFECYCLE_CRON_SECRET` — auto-generated; guards cron triggers
- `RESEND_API_KEY` — OTP email delivery (rotate after migration)

**Edge Functions:** 44 deployed and ACTIVE
- AI functions (`ai-digest`, `ai-improve-story`, `ai-similar-items`, `alignment-story`) — rewired to Google Gemini direct (2026-05-16)
- Jira sync functions — ready for data pull on trigger

**Database State:** Schema complete, zero rows (fresh data from Jira only, no Lovable migration)

---

## 2026-05-16 — Lovable Deprecation Complete

**Status:** ✅ DEPRECATED — Zero Lovable dependency achieved

**What was migrated:**
- ✅ All 918 tables with full DDL (887 in baseline, +31 newer additions)
- ✅ All 2,411 RLS policies verified intact
- ✅ All 1,429 foreign key constraints verified
- ✅ All 4,675 check constraints verified
- ✅ All 454 unique constraints verified
- ✅ All 13 required extensions enabled (pgcrypto, vector, pg_graphql, pg_cron, pg_net, pg_trgm, ltree, moddatetime, uuid-ossp, http, pgjwt, supabase_vault, pg_stat_statements)
- ✅ 690 functions, 655 triggers (via bootstrap migration)

**Git artifacts:**
- `LOVABLE_SCHEMA_EXPORT_HANDOFF.md` — handoff spec delivered to Lovable (2026-05-16)
- `SCHEMA_MANAGEMENT.md` — post-Lovable workflow guide (migrations, RLS, audits, rollback procedures)
- `supabase/migrations/20260516011948_baseline_schema_capture.sql` — snapshot marker (documentation-only)
- `supabase/migrations/20260516120000_bootstrap_full_schema.sql` — complete DDL bootstrap (103,434 lines, Lovable-managed baseline)

**All future schema changes:**
- ✅ Go through git migrations in `supabase/migrations/`
- ✅ Use `supabase migration new <description>` locally
- ✅ RLS policies MUST be included in the same migration as table creation (CLAUDE.md enforced)
- ✅ Use `apply_migration` MCP for deployment (safer, auditable)
- ✅ Commit and push to main → GitHub Actions deploys functions if `supabase/functions/**` changed

**Verification:** Supabase MCP confirms lmqwtldpfacrrlvdnmld schema is complete and consistent with git baseline. No Lovable access required going forward.

**Access Revocation Timeline:**
- ✅ 2026-05-16: Baseline snapshot + git bootstrap migration created and verified
- 2026-05-30: Full revocation (Lovable sandbox access disabled)

---

## Dev Server

The Catalyst local dev server always runs on **http://localhost:8080**. Never use 8081. When navigating in Chrome MCP, always use port 8080.

---

## Claude Preview — Manual Activation Only

**Claude Preview (`preview_*` tools) must NEVER be auto-activated for runtime verification.** Do not call `preview_start`, `preview_screenshot`, `preview_click`, or any preview tool unless:
1. The user explicitly requests verification ("verify this", "test the change", "check if it works")
2. The user clicks the preview button or asks "does this look right?"

**Why:** Preview tools auto-starting silently in the background consume credits and slow down iteration. Verification must be user-initiated.

**Rule:** Implementation code → test locally if needed → stop. Only open preview if the user asks or if the change is definitely visual/interactive. Type checking, tests, and reading source code verify code correctness; preview verifies feature correctness only when explicitly requested.

---

## Shared Agent Library (Team-wide)

All Catalyst team members have access to **184 shared personas** (committed to `./.claude/agents/` in this repo) for use with the catalyst-agent orchestrator:

**Available skills:**
- `/catalyst-agent <task>` — probe-first router for engineering tasks (see `./.claude/skills/catalyst-agent/SKILL.md`)
- `/preflight` — 8-phase strategic planner with multi-agent council
- `/jira-compare` — CRUD parity audits with acceptance gates
- `/design-intelligence` — 1000-IQ design intelligence layer
- `/design-critique` — heuristic UI/UX scoring

**Setup:** After pulling the repo, reload Claude Code (Close → Reopen or restart extension). Skills auto-discover from `./.claude/skills/` and `./.claude/agents/` is accessible to all personas.

**For new machines:** No manual setup needed — agents are version-controlled. Just `git pull` and reload.

---

## 2026-05-12 — Data model split: user_roles (system) vs user_product_roles (product) — ALWAYS fetch both for admin pages
**Surface:** /admin/access, /admin/users, useUsers hook, any admin context showing user roles
**Pattern:** User complained "role values are wrong" on /admin/access page. RCA trace: AdminGuard (permission gate) checks `user_roles` table for system roles (admin, program_manager, team_lead, user). useUsers hook (admin page data layer) checked ONLY `user_product_roles` table (product roles: super_admin, product_manager, product_owner, etc.). This split source-of-truth meant admin page never showed system-level roles — showing only product roles while the gate used system roles, creating silent incompleteness. Jira-compare / design-critique looking at the UI alone would never catch this because it's a query-layer bug: the hook ran successfully but returned incomplete data. Fixed by updating `useUsers.ts` to fetch from BOTH tables and merge `system_role` into `UserProfile`. The two-tier model is deliberate and correct; the bug was querying only one tier.
**Rule:** Catalyst has two role tables by design: (1) `user_roles` stores system-level access control (admin, program_manager, team_lead, user), (2) `user_product_roles` stores product-level capabilities (super_admin, product_manager, product_owner). When building admin views that show user permissions, ALWAYS query BOTH tables and expose both role types in the UserProfile data object. Set `system_role: string | null` in the data model alongside `roles: { role_name: string }[]`. Before calling a query layer complete, spot-check: does this hook load data from all tables that `useUserRole` (the permission gate) checks? If they differ, it's a sync bug waiting to happen.
**Severity:** P1 (silent data incompleteness — no console errors, UI works, but shows wrong scope of roles)

---

## 2026-05-12 — design-critique must audit 360° holistic layout, not just content area in isolation
**Surface:** Any admin page, any module page — applies to ALL design-critique runs
**Pattern:** The design-critique of `/admin/access` scored content quality (tables, tabs, modal) but completely missed that the admin module renders its own independent 240px-wide sidebar NEXT TO the Catalyst global nav, creating a double-sidebar that pushes content to x=512px (31% of viewport consumed by navigation chrome). Regular Catalyst pages start content at x=296px. The 216px dead left gutter was invisible to a critique that only looked at the content panel.
**Rule:** Every design-critique run MUST include a **360° holistic layout check** as Step 0, BEFORE heuristic scoring:
1. Measure where content starts (x position of first meaningful content element)
2. Compare against the standard Catalyst app shell baseline: content starts at ~296px (expanded nav) or ~56px (collapsed)
3. Flag any module that adds its own sidebar container OUTSIDE the standard Catalyst shell pattern — this is always P0
4. Check whether the module sits inside the correct slot of the Catalyst app shell (right-panel / main-content area), not floating in a parallel container
5. Check content/chrome width ratio: content should occupy ≥ 70% of viewport
**The lesson:** A surface can have perfect internal design (good typography, correct tokens, working components) and still be a P0 failure if its macro layout breaks the app shell contract. Layout audit is prerequisite to content audit.
**Severity:** P0 (missed entirely in prior sessions — now blocking gate for all design-critique runs)

---

## 2026-05-11 — Phase 0.5 diagnoses are hypotheses; probe before TDD'ing the wrong layer
**Surface:** Any preflight cross-cutting plan with Phase 0.5 violations
**Pattern:** Phase 0.5 N1 listed "breadcrumb crumb click is no-op → wire `onParentClick → openDetail` in every `CatalystView*`". A unit test reproducing the alleged failure mode PASSED on the first run — the wiring was correct end-to-end. Actual defect was upstream in `ProjectAllWorkView`: its `onOpenItem` called `selectItem(parentEpicKey)`, but AllWork's items list excludes Epic/Feature/Task (CLAUDE.md 2026-04-28), so `activeItem` stayed undefined. Hours of wrong-layer TDD were avoided by probing live + tracing the call chain before writing any test.
**Rule:** Before T-A in a per-type round, run the unit test for the **named** failing layer first. If it passes, stop and trace upstream — don't ship a "fix" that addresses a layer that wasn't broken. Phase 0.5 evidence is a starting hypothesis, not a verdict.
**Severity:** P1

---

## 2026-05-11 — K.11 section header spec is global — fix shared components once
**Surface:** CatalystKeyDetails, CatalystDescriptionSection, SubtasksPanel.css, linked-work-items.css
**Pattern:** K.11 (14px/600/#172B4D section headers) was re-probed on one type (QA Bug) and the fix was planned per-type. But all 4 failing components are SHARED — one fix covers all 9 work item types simultaneously. The per-type round-robin for this spec was unnecessary overhead.
**Rule:** Before scheduling per-type round-robin for a visual spec, grep ALL shared section components for the pattern. If the defect lives in a shared file, fix once and verify across all types in a single regression sweep. Per-type TDD only for per-type divergences.
**Severity:** P1 (process efficiency)

---

## 2026-05-11 — Use window.innerWidth (not container offsetWidth) for breakpoints inside padded card containers
**Surface:** R360Panel responsive layout (For You tab), any panel embedded in a padded card
**Pattern:** R360Panel attempted `ResizeObserver` on the panel's own container `div` to detect wide vs narrow layout. The container reported ~908px while the actual viewport was 965px — a 57px gap eaten by the For You card's padding. The WIDE_THRESHOLD of 900px never triggered because container width underreports.
**Rule:** For layout breakpoints in any panel that lives inside a padded card (For You page, sidebar panels, detail rail wrappers), always measure `window.innerWidth` with a resize event listener — never `offsetWidth` or a ResizeObserver on the panel container itself. The pattern: `const [isWide, setIsWide] = useState(() => window.innerWidth >= THRESHOLD); useEffect(() => { const h = () => setIsWide(window.innerWidth >= THRESHOLD); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);`
**Severity:** P2 (responsive layout silently fails — correct threshold, wrong measurement point).

---

## 2026-05-11 — Never use ph_project_members for a team roster; query resource_inventory directly
**Surface:** R360Panel / `useTeamResourceIds` hook, any capacity or team picker
**Pattern:** `useTeamResourceIds` routed through `ph_project_members` (project membership table) to build the team sidebar roster. The table had only 3 rows — all the admin user — while `resource_inventory` had 38 active resources with `profile_id` set. Result: `teamResources.length === 0` → `hasTeam = false` → sidebar never rendered. Silent empty state with no error.
**Rule:** For resource capacity views, team roster pickers, and any surface that needs "all team members who have an R360 profile", query `resource_inventory` directly: `.eq('is_active', true).not('profile_id', 'is', null).neq('profile_id', myProfileId).order('name')`. `ph_project_members` reflects project-specific assignments and is not kept in sync as a full team roster — do not use it to enumerate team members.
**Severity:** P1 (data model mismatch → silent empty state; feature appears broken with no console error).

---

## 2026-05-10 — Hand-rolled dropdowns must be replaced with @atlaskit/dropdown-menu
**Surface:** CatalystViewBase (all detail views — applies to any surface with a menu)
**Pattern:** The ⋯ more-actions menu in `CatalystViewBase.tsx` was self-rolled: `useState(showDotsMenu)` + outside-click `useEffect` + `div` with inline `onClick` handlers. This violated JIRA_ARCHITECT A4 (hand-rolled interactive element): no `role="menuitem"`, no keyboard navigation, no focus trap, no ARIA. WCAG 2.1 AA keyboard-access failure.
**Rule:** Any menu, dropdown, or action list with 2+ items MUST use `@atlaskit/dropdown-menu` (`DropdownMenu`, `DropdownItem`, `DropdownItemGroup` from `@atlaskit/dropdown-menu`). Never hand-roll a menu. Structure: standard items in the first `DropdownItemGroup`; danger items in a second `DropdownItemGroup` at the bottom with `<span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>` wrapper on the label. The trigger must be an `IconButton` with `appearance="subtle"`. This pattern is now canonical for all surfaces — backlog row menus, project cards, admin tables, and detail view headers all share it.
**Severity:** P0 (WCAG 2.1 AA — keyboard users cannot operate the menu without this).

---

## 2026-05-10 — openDetail must receive issue_key (text), never a UUID
**Surface:** Any sidebar, panel, notification, or list that calls `useGlobalSearchStore.getState().openDetail({ id: ... })`
**Pattern:** Five surfaces (ProjectHubSidebar, SidebarProjectNav, AgeingPanel, ThemeIssueList, NotificationPanel) were passing the UUID `id` column from `ph_issues` — causing `CatalystDetailRouter` to always return "Issue not found". `CatalystDetailRouter` queries `ph_issues` exclusively by `.eq('issue_key', itemId)` (text PK like "BAU-5757"). UUID lookups silently no-op.
**Rule:** Any `openDetail({ id: ... })` call MUST pass the Jira issue key string, never a row UUID. Canonical patterns:
- `user_recent_items` rows: `item.entity_key || item.entity_id`
- `ph_issues` rows queried directly: `row.issue_key` (not `row.id`)
- `WorkItem` objects: `item.id` — only valid if the mapper sets `id: row.issue_key` (not `id: row.id`)
- Notifications: `n.entity_key || n.entity_id` (key first)
Before wiring any new click handler → detail modal, grep `CatalystDetailRouter.tsx` to confirm the lookup field, then trace back to confirm the id source is that field.

---

## 2026-05-09 — Always use JiraIssueTypeIcon for work item type display
**Surface:** Any rail, sidebar, Recent list, card, or row that shows a work item type indicator
**Pattern:** `ProjectHubSidebar.tsx` used a hardcoded `issueTypeColor()` map returning 8px coloured squares (bug→red, story→green, epic→purple, default→blue). This is non-discoverable colour-recall: the user must know the colour→type mapping, which differs from Jira's icon language. `JiraIssueTypeIcon` at `@/lib/jira-issue-type-icons` is the canonical self-labelling component already used in backlog, allwork, notifications, global search, and kanban surfaces. `SidebarProjectNav.tsx` had the same colored-dot pattern (`ITEM_TYPE_COLORS` map + `getTypeColor` function) — fixed 2026-05-09 by replacing with `JiraIssueTypeIcon` and two-line layout.
**Rule:** **Never use coloured dots, squares, or colour-recall maps for work item type display.** Always import `JiraIssueTypeIcon` from `@/lib/jira-issue-type-icons` and render at the appropriate size (14px for compact rails, 16px for rows). `WorkItemIcon.tsx` is a deprecated shim — new code imports directly from `@/lib/jira-issue-type-icons`. This applies to sidebars, Recent lists, notification rails, any hover card, and any table cell that indicates type. When adding a Recent items list to ANY sidebar component, use the canonical two-line layout: summary on line 1 (12px/400/primary text), KEY on line 2 (11px/500/mono/secondary text), with `JiraIssueTypeIcon` as the leading icon at 14px.

---

## 2026-05-09 — design-critique: carry the full violation list across sessions (arrow continuity)
**Surface:** design-critique skill, any session continuation
**Pattern:** When a design-critique session was interrupted (context limit, reload, new conversation) and resumed, Claude re-injected only a small subset of violations — the green/red progression was lost and the user could not see which P0/P1 items had been resolved vs which were still open.
**Rule:** When resuming a design-critique on a surface that was already audited, always re-inject the COMPLETE violation list from the previous session. Mark resolved items `fixed: true` (→ green arrow). Mark still-open items `fixed: false` (→ red arrow). Never start a fresh subset — the before/after colour progression is the primary evidence the user reads. The toggle button ("👁 Arrows", bottom-right corner, z-index 100000) hides/shows the overlay without losing state.

---

## 2026-05-09 — Supabase projects DELETE: RLS cascade + policy self-join bug
**Surface:** AllProjectsTable delete flow (`handleDelete` in `AllProjectsTable.tsx`)
**Pattern:** `projects.delete()` via REST returned 42501 on CASCADE to `hi_statuses` (no DELETE policy). A second policy on `projects` itself had a self-join bug: `project_members.project_id = project_members.id` (compares two columns of the same row) instead of `project_members.project_id = projects.id`. Both fixed via Lovable SQL editor 2026-05-09.
**Rule:** When adding a Supabase RLS DELETE policy on a table that has cascading children (`hi_statuses`, `hi_project_sequences`, `project_members` all cascade from `projects`), add a DELETE policy on EACH child table too, or the cascade will be blocked by RLS. When writing `WITH CHECK` / `USING` clauses that JOIN to another table, always verify the join condition references the parent table's primary key — never two columns of the child row.

---

## Banned integrations — Projects module (`/project-hub/projects`)

**Notion is permanently out of scope for the Projects module.** Do NOT add a Notion column, Notion sync stats, or any Notion data to AllProjectsTable, AllProjectsPage, or any Projects-related component. This was explicitly removed by Vikram 2026-05-09. No exceptions, no re-asks.

---

## Shell Commands — Mandatory Patterns

**Never use `cd /path && git ...`** — this triggers a hardcoded Claude Code security gate that always prompts and cannot be suppressed.

**Always use `git -C /path ...` instead.** Examples:
- `git -C /Users/vikramindla/Documents/GitHub/catalyst-prod-45 log --oneline -5`
- `git -C /Users/vikramindla/Documents/GitHub/catalyst-prod-45 diff src/foo.tsx`
- `git -C /Users/vikramindla/Documents/GitHub/catalyst-prod-45 status`

This applies to ALL git operations in ALL scripts and subagents, no exceptions.

---

## 🚫 `git add -A` / `git add .` PERMANENTLY BANNED (P0, Non-Negotiable)

**Never run `git add -A`, `git add .`, or `git add --all`.** Stage ONLY the explicit file paths the current task touched: `git add path/to/fileA path/to/fileB`.

### Why this rule exists (2026-06-01 — twice in one session)

The working tree on `main` frequently carries **stale, uncommitted changes** from other sessions / Lovable / linters. `git add -A` stages *everything* in the tree, not just your task's files. Twice in one session this swept an unrelated stale copy of a file into a scoped commit and **silently reverted prior shipped work**:

- Commit `fa5931b8d` ("fix br-view") ran `git add -A` and committed a stale `ProductHubSidebar.tsx` that had no "All Work" nav item — reverting the `Products-producthub-rebuild-01` addition. The user caught the missing menu item in the live UI. Restored in `855fedbfb`.

### The rule

1. **Stage explicit paths only.** `git add src/components/Foo.tsx src/index.css` — never `-A`/`.`/`--all`.
2. **Always `git status` BEFORE every commit.** If any file you did NOT intend to touch is modified/staged, STOP. Do not commit. Investigate whether it's a stale working-tree change that would revert someone else's work.
3. **If unexpected modified files exist in the tree**, leave them unstaged. Never assume they're yours. Surface them to Vikram if they block a clean commit.
4. New files created by the task are staged by explicit path too — `git add src/.../NewFile.tsx`.

**Severity:** P0 — `git add -A` is a silent-regression vector. A scoped commit must contain ONLY the task's files, provably, via `git status` inspection before commit.

---

## TDD Cycle (non-negotiable)

1. **Write a failing test first.** No implementation code before a test exists.
2. **Write the minimal code** to make the test pass — nothing more.
3. **Refactor** only after the test is green, and only if needed for clarity.

If asked to implement something without a test path (e.g. UI-only, no test harness), state this explicitly and ask Vikram how to proceed before writing any code.

---

## Small Steps — One Logical Change at a Time

After every single logical change (one test, one implementation unit, one refactor):

1. **Stop.**
2. **Explain** what was done and why.
3. **Suggest a commit message** (imperative, under 72 chars).
4. **Ask for confirmation** before proceeding to the next step.

Do NOT generate full solutions in one go. Do NOT bundle multiple logical changes into one response.

---

## Code Quality Rules

- Prefer **simple, readable, maintainable** code over clever code.
- Follow **clean architecture**: separate concerns, keep components/modules focused on one responsibility.
- No dead code, no speculative abstractions, no features beyond what the spec asks for.
- Default to **no comments** — only add one when the WHY is non-obvious.
- No backwards-compatibility shims for things that don't exist yet.

---

## When Unclear — Ask, Don't Assume

If a spec, requirement, or edge case is ambiguous: **stop and ask Vikram** before writing any code. State exactly what is unclear and offer 2–3 concrete options if possible.

---

## Output Format Per Step

Each response during an implementation session must follow this structure:

```
**Step N — [brief description]**

Test (failing):
[test code]

---
Awaiting approval to proceed with implementation.
```

After approval:

```
**Step N — Implementation**

[minimal implementation code only]

Suggested commit: `<imperative message>`

---
Ready for next step when you confirm.
```

---

# SUPER STRICT GUARDRAIL — 2026 DATA ONLY

**Jira data sync webhook and all Jira functions ONLY process issues with `created` or `updated` timestamps in year 2026.** This is non-negotiable.

**Implementation:**
- Every Jira ingest function (`wh-jira-sync`, `jira-sync-projects`, `jira-webhook-receiver`, etc.) must extract `created` and `updated` timestamps from incoming payloads
- **Reject (do not insert/update) any issue where both `created` AND `updated` are before 2026-01-01T00:00:00Z**
- Webhook receiver must return `{ ok: false, reason: "data outside 2026 window" }` for rejected payloads (log the issue key for audit)
- Functions must log rejections with issue key, created date, updated date so we can track what was excluded
- Backfill and initial sync functions must apply the same 2026 filter to `jira-sync-projects`, `wh-jira-bulk-sync`, etc.

**Why:** Clean slate migration. Old Lovable data (pre-2026) is discarded intentionally. Only live 2026+ Jira data flows into the new project. This prevents stale/test data from polluting the new schema.

**Severity:** P0 — data integrity gate. Missing this filter allows pre-2026 cruft to land in production.

---

# jira-compare — compounding lessons

Append-only. Newest at top. Each entry: date, pattern, rule, surface.

---

## 2026-05-16 — Chrome MCP tabs die when starting from chrome://newtab — navigate from existing real URL only
**Surface:** Chrome MCP tab management across all jira-compare sessions
**Pattern:** `tabs_context_mcp(createIfEmpty: true)` creates a tab at `chrome://newtab/`. The Chrome extension cannot navigate a `chrome://` URL (permission denied). Calling `navigate` immediately after returns "Tab no longer exists" because the extension cannot drive the privileged page. Every attempt to `navigate` from `chrome://newtab` silently kills the tab.
**Fix:** Always ask the user to manually open the target URL in Chrome first, then use `tabs_context_mcp(createIfEmpty: false)` to discover the existing real tab. Alternatively, if a tab already exists at a real URL (any http://), the extension can navigate it freely.
**Rule:** Never start a Chrome MCP probe from `chrome://newtab`. Always have the user open `http://localhost:8080/...` first, THEN connect to that tab. `tabs_context_mcp(createIfEmpty: false)` discovers existing tabs without creating a new blank one.
**Severity:** P1 (blocks all DOM probing until pattern is understood — wastes session budget on tab reconnection loops)

---

## 2026-05-16 — `includes('Sprint')` in sidebar text fires on fix-version names — use structural field check instead
**Surface:** Structural DOM probe (bannedCheck heuristic), any future probe checking for banned field presence
**Pattern:** A banned-field check ran `sidebar.textContent.includes('Sprint')` and returned `true`. This was flagged as "Sprint field shown on PI (not in PI scheme)". The actual source was a fix version VALUE named "Sprint 2.2 - 15 May 2025" — the fix version picker in `CatalystSidebarDetails` correctly shows fix versions for PI, and this project's versions are named after sprints. The naive text search cannot distinguish a field LABEL from a field VALUE.
**Rule:** Never use `includes('fieldName')` on `element.textContent` to check whether a field is rendered. Instead: (1) look for the FieldRow label element specifically (`querySelector('[class*="FieldRow"] label')`), or (2) check the source code — grep the view component for the field name. Text-search on sidebar content produces false positives when field VALUES contain the banned word.
**Severity:** P1 (false positive led to incorrect violation report; wastes probe time and obscures real issues)

---

## 2026-05-16 — CatalystStatusPill uses data-testid, not class — wrong selector causes "status pill missing" false alarm
**Surface:** CatalystStatusPill DOM probe, all jira-compare status pill detection
**Pattern:** DOM probe searched for `[class*="status"],[class*="Status"],[class*="lozenge"],[class*="pill"]` and found nothing — reported as "status pill undetectable / possibly missing". In reality, `CatalystStatusPill` renders a `<button data-testid="catalyst-status-pill-trigger">` with inline styles only — no identifying CSS class. The probe selector was wrong, not the component.
**Rule:** When probing for the status pill, use `[data-testid="catalyst-status-pill-trigger"]` as the selector. Never assume a component is absent just because a class-based selector returns null — check the component source first to discover the correct selector (`data-testid`, `aria-label`, or specific tag+attribute combination).
**Severity:** P1 (false negative — "component missing" report when component is correctly present; undermines audit credibility)

---

## 2026-05-16 — useForYouData and useAgeingItems use DIFFERENT tables for current-user Jira ID
**Surface:** For You / Assigned tab (AssignedPanel) vs For You / Ageing tab (AgeingPanel)
**Pattern:** Ageing tab showed 24 items; Assigned tab showed empty state ("Nothing assigned to you"). Both panels read from `ph_issues` by `assignee_account_id`. Root cause: two different hooks resolve the current user's Jira account ID from different sources:
- `useAgeingItems` → `profiles.jira_account_id` (direct column on profiles table) ✅
- `useForYouData.fetchUserMapping` → `ph_user_mapping.jira_account_id` (separate mapping table) ❌ (no entry existed for the user)
When `ph_user_mapping` has no entry and the name fallback also fails, `jiraAccountIds = []` → `ph_issues` query is skipped → Assigned tab silent empty state with no error.
**Fix:** Added `profiles.jira_account_id` as a final fallback in `fetchUserMapping`: if `ph_user_mapping` lookup returns no IDs, check `profiles.jira_account_id` (the same field `useAgeingItems` uses). Now both hooks align.
**Rule:** Any hook that resolves "current user's Jira account ID" MUST check `profiles.jira_account_id` as a fallback if `ph_user_mapping` returns empty. Never silently swallow an empty `jiraAccountIds` — add a console.warn and the profiles fallback. Before shipping a new panel that queries `ph_issues` by `assignee_account_id`, verify which ID-resolution path it uses and confirm the result is non-empty for the test user.
**Severity:** P1 (silent data incompleteness — empty state with no error, no console warning)

---

## 2026-05-16 — ph_user_mapping miss propagates to edge functions — apply profiles.jira_account_id fallback everywhere
**Surface:** `supabase/functions/ai-digest/themes.ts` (AI Focus / AI Theme tab) · any edge function resolving Jira account ID
**Pattern:** After fixing `useForYouData.fetchUserMapping` (client-side hook), the `ai-digest` edge function's themes handler had the exact same bug — querying only `ph_user_mapping` for the Jira account ID with no fallback. Result: `jiraAccountIds = []` → early return with `totalIssuesAnalyzed: 0` → UI showed "Analysed 0 issues into 0 themes · Not enough activity to theme yet." The 90-day time window was already correct; the issue was purely the missing `ph_user_mapping` entry.
A second co-located bug: `themes.ts` declared `lovableApiKey: string` in its `handleThemesRequest` parameter signature, but `index.ts` dispatched it as `geminiApiKey` (matching the 2026-05-16 Gemini-direct migration). With `lovableApiKey = undefined`, the AI call would have sent `Authorization: Bearer undefined` to the old Lovable gateway — silent 401/500 after the Jira ID fix unblocked the code path.
**Fix:**
1. Added `profiles.jira_account_id` fallback in `themes.ts` (mirrors `useForYouData` fix, commit `1eab16df6`).
2. Renamed `lovableApiKey` → `geminiApiKey` in `handleThemesRequest` signature and body.
3. Switched AI call from `https://ai.gateway.lovable.dev/v1/chat/completions` + `google/gemini-3-flash-preview` to `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` + `gemini-2.5-flash` (Gemini direct, same as `index.ts`).
**Rule:** When the `ph_user_mapping` fallback fix is applied to a client-side hook, **audit all edge functions** for the same pattern immediately — they share the same data model and same missing-entry problem. Use `grep -r "ph_user_mapping" supabase/functions/` to find all callsites. Every callsite needs the `profiles.jira_account_id` fallback. When an edge function is rewired to a new AI provider (Lovable → Gemini), check ALL dispatch callsites AND the handler signature for parameter name consistency — a mismatch is invisible at Deno runtime (no TypeScript compile error) and silently sends `undefined` as the bearer token.
**Severity:** P1 (AI Focus tab always showed empty state for any user without a `ph_user_mapping` entry)

---

## 2026-05-16 — Code archaeology before API troubleshooting — read existing implementations first
**Surface:** wh-jira-bulk-sync edge function · any Jira API integration
**Pattern:** Debugging Jira API search failures, I tested multiple endpoints: `/rest/api/3/search` (returned HTTP 410 deprecated), then `/rest/api/3/issues/search` (returned 0 results). Spent cycles trying alternatives before checking the existing working code. Lovable's `wh-jira-bulk-sync/index.ts` (already deployed and functional) uses `/rest/api/3/search/jql` — the correct endpoint the whole time. The endpoint choice was already proven in production; the failure diagnosis was wrong.
**Rule:** When debugging an integration that has an existing working implementation in the codebase:
1. **Stop debugging immediately**
2. **Read the working code first** — check the exact endpoint, headers, body structure, error handling
3. **Replicate the working pattern exactly** — don't try alternatives until you've confirmed the existing code matches your current state
4. **Only then** debug if the replicated pattern still fails

This applies to ALL integrations with live code: Supabase edge functions, external APIs, webhooks. If Lovable built it and it's deployed, start there, not with curl experiments. The codebase IS the source of truth for "what works."
**Severity:** P1 (wasted debugging cycles; wrong diagnosis; delays critical data sync)

---

## 2026-05-12 — fullPageMode in CatalystViewBase needs body-as-scroll-container, not page-level scroll
**Surface:** CatalystViewBase.tsx (fullPageMode) · BacklogDetailPage, IssueFullPage
**Pattern:** The project hub layout constrains every page container with `height: '100%'; flex: 1; minHeight: 0` — the document never scrolls. `CatalystViewBase` in fullPageMode originally used `overflow: 'visible'` on `cv-drawer-body` and `minHeight: '100%'` on the `MODAL` wrapper. This produced a 1452px tall MODAL inside an 894px viewport with no scroll container — the page was stuck, fields above the fold were unreachable, and the sticky sidebar had no fixed-height parent to stick to.
**Fix (committed ea94ed3b8):**
- `MODAL` in fullPageMode: `height: '100%'; overflow: 'hidden'` (constrains MODAL to parent height)
- `cv-drawer-body`: `flex: 1; minHeight: 0; overflowX: 'hidden'; overflowY: fullPageMode ? 'auto' : 'hidden'` (body IS the scroll container)
- `cv-drawer-sidebar`: `maxHeight: '100%'` not `'100vh'` (sidebar sticks to scroll container, not viewport)
**Rule:** In any fullPageMode detail view mounted inside a height-constrained container (project hub, split-view layouts), the scroll container MUST be an element inside the view — not the document. Pattern: `MODAL { height: 100%; overflow: hidden }` → `cv-drawer-body { flex: 1; minHeight: 0; overflowY: auto }` → `cv-drawer-sidebar { position: sticky; top: 0; maxHeight: 100%; alignSelf: flex-start }`. Never use `overflow: visible` on a flex child that needs to scroll — it produces an unbounded child with no scroll affordance.
**Severity:** P0 (scroll and field interaction completely broken until fixed)

## 2026-05-12 — Back button in fullPageMode must derive route from current URL, not hardcode /list
**Surface:** CatalystViewBase.tsx — `handleBack` callback · BacklogDetailPage route
**Pattern:** `handleBack` in fullPageMode was hardcoded to `navigate('/project-hub/${projectKey}/list')`. BacklogDetailPage mounts at `/project-hub/:key/backlog/:issueKey` — pressing Back sent users to the wrong surface (/list instead of /backlog). The issue wasn't just a wrong path — it reset the backlog scroll position and lost the user's context entirely.
**Fix (committed 70dcdc79c):** `CatalystViewBase` now receives a `projectListHref` prop (defaults to `/project-hub/${projectKey}/list` for backward compatibility). `BacklogDetailPage` passes `projectListHref={/project-hub/${projectKey}/backlog}`. `handleBack` uses `navigate(projectListHref)`.
**Rule:** Any full-page detail view mounted from a non-/list route MUST pass `projectListHref` to `CatalystViewBase`. Never hardcode the back destination — derive it from the route that mounted the view. Before adding a new full-page detail route, check if it needs a custom `projectListHref` and wire it in the mounting page component.
**Severity:** P1 (back button navigated to wrong surface, breaking user flow)

## 2026-05-11 — Catalyst's AI persona is CATY (not Kathy). When Vikram says "Ask Kathy" he means Ask CATY — recognize the phonetic immediately.
**Surface:** Any conversation referencing Catalyst's AI assistant
**Pattern:** Vikram said "Ask Kathy" in chat. Prior session treated it literally, launched a codebase-onboarding agent to "discover" what Kathy was, only to find CATY (Catalyst AI). The codebase has been on CATY naming for months — `src/components/caty-ai-chat/*`, `src/components/caty/CatyPanelV4`, `src/pages/testhub/CatyAIPage.tsx` (route `/caty`), `useCatyAI` hook, 3 live edge functions (`ai-digest`, `ai-improve-story`, `ai-similar-items`). The `src/features/ask-ai/*` mock module was removed 2026-04-01 (never wired). "Kathy" was a phonetic of CATY. Spending an agent cycle to confirm this is wasted context.
**Rule:** Catalyst's AI persona is **CATY** (Catalyst AI). Any "Ask Kathy / Catty / Caddy / Cathy" phonetic from Vikram means **Ask CATY**. When mapping Jira's "✦ Ask AI" toolbar button for parity work, the Catalyst equivalent is the existing CATY panel — wire a new entry point to `CatyAIPage` / `CatyFAB`. Do NOT restore the deleted `src/features/ask-ai/` mock. Also clean 3 stale references to the dead `/releases/ask-ai` route in `ReleasesManagementSidebar.tsx:71`, `releaseModuleFeatureTree.ts:1076`, `releaseModuleDocumentation.ts:763`.
**Severity:** P1 (context-awareness failure — wastes session budget on already-known facts).

---

## 2026-05-11 — Backlog table audit: surface-only DOM probe is REJECTED — must round-robin all 8 issue types AND probe every micro-interaction (drag/menus/bulk/AI/full-width view) before any PASS verdict
**Surface:** BacklogPage list table at /project-hub/BAU/backlog (compared to /jira/software/c/projects/BAU/list)
**Pattern:** Cycle 1 jira-compare audit closed with "ACCEPT CURRENT STATE — no changes required" after only measuring column widths and ARIA labels on ONE row of ONE issue type (Story). Vikram corrected: 70% of micro-interactions were never probed. The audit missed structural features that are core to Jira's table UX:
1. **Row-hover drag handle** — Jira shows a 6-dot drag affordance to the LEFT of each row only when there is no active sort AND no grouping. Catalyst has zero drag affordance for row rank.
2. **3-dot menu (top-right header)** — Jira opens: Apply old List settings · View work items as a chart · Format rules · Hide done toggle · Show hierarchy toggle · Export · Import from CSV · **Bulk change work items** · Go to all work items · Give feedback. Catalyst missing entirely.
3. **Bulk-select footer bar** — When N items checked, Jira shows a bottom-anchored bar: "N selected · Select all (in JQL scope) · …options · Delete · X close". Catalyst has no equivalent.
4. **Bulk-change wizard** — "Bulk change work items" opens 4-step modal/page: Step 2 offers Edit / Move / Transition / Delete / Watch / Stop Watching. Catalyst scope: build Edit + Move + Transition + Delete (Watch / Stop-Watch are explicitly OUT per Vikram).
5. **Column picker — 228 fields** — Jira's right-side column-config dropdown has "My defaults" / "System" tabs, a search input, scrollable list of 228 fields with checkbox toggles, "Create a field" CTA at the bottom showing "33 of 228" count. Catalyst's ColumnManager only exposes ~17 fields with no tabs and no search.
6. **Ask AI button** — Jira renders ✦ Ask AI to the left of search. Catalyst previously had "Ask Kathy" — was removed without RCA. Restore it, connect to the existing Claude / Google Gemini API in Catalyst, structurally identical to Jira's Ask AI flow.
7. **Fix versions cell styling** — Jira renders Fix versions value as a rectangle/pill with border + padding, NOT bare text. Computed style was never measured.
8. **Group By interactions** — Group By dropdown changes the entire table structure (collapsible group headers with expand chevron, in-group inline-create row, group count, group sort). Never exercised across the 8 work-item types.
9. **Row click → full-width detail view** — Jira opens the issue in a FULL-WIDTH (not side-panel) detail view with a breadcrumb back-button that returns to the list. Catalyst opens a narrow side panel. This canonical full-width journey is missing.
10. **Load-more / infinite scroll** — Jira loads 50 of 1000+, scroll triggers next batch smoothly with no jump. Catalyst's scroll behavior, batch size, and skeleton state were never measured.
11. **Per-issue-type round-robin** — Audit only measured Story rows. Production Incident, QA Bug, Change Request, Task, Feature, Backend, API Req, Business Gap each have different cell renderers (parent click target, status options, severity, custom fields). Each MUST be opened and clicked through individually.
12. **Catalyst-only "My Work" button** — Catalyst's toolbar shows "My work" — not in Jira's list view. No RCA on why it was added. Per Vikram's standing rule "if not in Jira, justify or remove" — needs investigation.
13. **MDT Ref + Assessment Feature** — Already banned in CLAUDE.md (2026-05-05, 2026-05-07). Audit failed to verify they are NOT rendered on any of the 8 issue type backlogs.

**Rule:** A jira-compare audit on a TABLE surface is NOT complete until ALL of these are individually probed AND a decision is logged:
- Every column in the picker (full list, not just visible columns)
- Every row-hover affordance (drag handle conditions, hover-only buttons)
- Every cell-renderer for EVERY issue type (round-robin across all 8 BAU types)
- Every toolbar control (Ask AI, Filter, Group, View toggle, Saved filters, Avatar list)
- Every menu (3-dot top-right, action menus on rows, column-header menus)
- Every multi-select interaction (footer bar, bulk-change wizard each step)
- Every click-target outcome (row → detail view variant: side panel vs full-width + back-button)
- Load-more / pagination / virtualization behavior
- Group By scenarios (collapsible groups, in-group create row, group sort, empty groups)
- All Catalyst-only features must be RCA'd against the "if not in Jira, justify or remove" rule

Surface-level "measured X column widths" reports without per-issue-type round-robin + every-micro-interaction probe are **REJECTED as cycle output**. Triple-probe per micro-interaction is mandatory: live DOM + screenshot + Atlassian MCP schema. The audit can only PASS after all 13 items above carry an explicit verdict and any Catalyst gaps have either landed code or a logged Vikram-approved deferral.

**Severity:** P0 (process failure — produced a false PASS verdict; the cycle had to be re-opened by Vikram and 70% of the work is still ahead).

---

## 2026-05-10 — Epic Priority: Key details must use showPriority={false}
**Surface:** CatalystViewEpic (Epic detail view)
**Pattern:** CatalystKeyDetails defaults `showPriority={true}`, rendering Priority in the left Key details block for all types. Epic is the only type where Priority belongs exclusively in the right rail Details section (between Assignee and Reporter) — per CLAUDE.md 2026-05-06 re-probe of BAU-5419. Without `showPriority={false}`, Epic shows Priority twice: once in Key details (left) and once in the right rail (CatalystSidebarDetails). Fixed by passing `showPriority={false}` to `CatalystKeyDetails` in `CatalystViewEpic.tsx`.
**Rule:** `CatalystViewEpic` MUST pass `showPriority={false}` to `CatalystKeyDetails`. All other view types (Story, Task, Feature, Defect, PI, CR, Business Gap) keep `showPriority` at its default (`true`) and show Priority in Key details. Do not remove this prop without a re-probe of the Jira Epic detail view confirming the placement changed.

## 2026-05-10 — Fix versions must be gated per type, not just Epic exclusion
**Surface:** CatalystSidebarDetails (all issue type views)
**Pattern:** Fix versions was gated as `issue_type !== 'Epic'` — meaning it rendered for ALL other types including Feature. Jira Feature screen scheme (10173) does NOT include Fix versions. The guard was expanded to also exclude Feature after Lane B confirmation via `getJiraIssueTypeMetaWithFields`. Epic was later RE-PROBED (2026-05-10 Epic field sweep) — Lane B confirmed `fixVersions` IS in the Epic scheme (type 10000). Epic exclusion removed; Vikram approved 2026-05-10.
**Rule:** Fix versions guard must reflect the actual Jira screen scheme per type. Currently excluded for: **Feature only**. All other types (Epic 10000, Story 10006, Task 10010, Change Request 10305, Production Incident 10045, QA Bug) have Fix versions in their schemes. When adding a new work item type to Catalyst, always check Fix versions membership in the scheme before deciding whether to include it.

## 2026-05-10 — Severity wiring: only Incident/BusinessGap had extraRows; Task was missed
**Surface:** CatalystViewTask (Key details section)
**Pattern:** Severity (`customfield_10125`) is in the Jira Task screen scheme (10010). It was only wired in `CatalystViewIncident` via `extraRows` on `CatalystKeyDetails`. `CatalystViewTask` had no Severity row at all. The omission was caught by the Bucket H sweep (BAU-4852 probe). Fix mirrors the Incident pattern: `useQueryClient` + `CatalystSeverityField` in `extraRows`.
**Rule:** When adding a field via `CatalystKeyDetails extraRows` to one view type, immediately audit all other view types whose Jira screen scheme includes that same custom field. Severity is in: PI (10045), Task (10010), QA Bug (10012 — handled via CatalystDefectKeyRows). Any new issue type added later must get Severity if it's in that type's scheme.

## 2026-05-10 — Labels gate expanded to Story after Vikram approval
**Surface:** CatalystSidebarDetails — Labels FieldRow
**Pattern:** Labels was restored for Task only (Fix J, 2026-05-07). Story screen scheme (10006) also includes `labels`. Bucket H sweep confirmed Labels absent from Story right rail. Vikram approved Story addition 2026-05-10. Gate extended from `issue_type === 'Task'` to `issue_type === 'Task' || issue_type === 'Story'`.
**Rule:** Labels gate is now: Task + Story. All other types remain excluded until explicit Vikram approval + Jira screen scheme confirmation.

## 2026-05-10 — jira-compare exemption: Catalyst-specific admin pages need schema-probe, not jira-compare
**Surface:** All /admin/* non-WorkHub pages (Admin Phase C, 2026-05-09/10)
**Pattern:** CLAUDE.md "jira-compare on every new feature" was written for product surfaces (backlog, allwork, detail views). Admin Phase C applied the ADS icon sweep to pages like Modules & Packages, Resource Assignments, Feature Flags, Reference Data, and Workflow admin. These pages are Catalyst-specific configuration surfaces — they have no Jira equivalent. Running jira-compare produces no signal (no Jira page to compare against) and wastes session budget on dead comparisons.
**Rule:** jira-compare gate is **REQUIRED only for WorkHub admin pages** (which proxy live Jira data: jira-connection, jira-sync-control, hierarchy-mapping, status-mapping, user-mapping, activity-sync) and any admin surface that has a direct Jira equivalent. For Catalyst-specific admin pages, replace the jira-compare gate with a **schema-probe gate**: confirm every UI field has a DB column + RLS policy + hook backing it. Admin security gate: every page reachable under /admin/* must wrap its root JSX in `<AdminGuard>` — enforced by `admin-guard-coverage.test.ts`.

---

## 2026-05-08 — GlobalSearchPanel filter chips: overflow:hidden parent + @atlaskit/popup empty-portal bug; multi-select array truncation; wrong projects table
**Surface:** GlobalSearchPanel / FilterDropdown (global search)
**Pattern:** Three compounding bugs: (1) `@atlaskit/popup` v4.16 has an empty-portal bug on this surface — the popup never renders. GlobalSearchPanel also has `overflow: hidden`, which clips `position: absolute` children. Fix: self-rolled `createPortal` to `document.body` with `position: fixed`, `getBoundingClientRect()` for placement. (2) Click-outside handler in `GlobalSearch.tsx` fired `handleClose()` on every portal click because the portal renders to `document.body`, outside `popupRef`. Fix: add `data-filter-portal="true"` to the portal div and guard with `(t as Element).closest?.('[data-filter-portal]')` in the handler. (3) `ActiveFilters` interface used `project: string | null` / `assignee: string | null` — only the first selected value was passed to the query. Fix: changed to `projects: string[]` / `assignees: string[]` and used `.in()` for projects and `.or()` with `ilike` for assignees. (4) `useProjects()` queried `ph_issues` with limit 500 + client-side dedup — incomplete and inefficient. Fix: query `ph_jira_projects` directly.
**Rule:** Any popup inside a component with `overflow: hidden` MUST use `createPortal` to `document.body` with `position: fixed`. Never use `@atlaskit/popup` on this surface (known empty-portal bug). Always add `data-filter-portal="true"` to portals and guard the parent click-outside handler against them. Multi-select filter state must use arrays with `.in()` / `.or()`, never scalar indexing. Use dedicated tables (`ph_jira_projects`) not aggregated queries with limits.

## 2026-05-08 — Kanban modal code path never audited; modal header overlap from double height context
**Surface:** KanbanBoardPage modal (CatalystDetailRouter / CatalystViewBase modal mode)
**Pattern:** All jira-compare audits target `/allwork?issue=<key>` (panelMode). The kanban card modal path (`KanbanBoardPage.tsx:1353-1363` — no `panelMode` prop → CatalystViewBase modal mode) accumulated regressions that panel-mode audits never caught: (1) modal header overlapped because `height:'90vh'` inside `@atlaskit/modal-dialog`'s ScrollContainer (which already has `overflow:hidden` + its own `max-height`) created a double height context clipping the top bar. (2) Description misalignment: section h2 label is 20px indented (chevron 16px + gap 4px) but `atlaskit-renderer-wrapper` had `paddingLeft:0` — DOM probe: `descLabelLeft:347.87` vs `atlasRendererLeft:327.88`. (3) Swimlane column headers in KanbanBoardPage.tsx had same wrong dot colors + typography as PragmaticBoard.tsx (both fixed, but the kanban-board swimlane path was missed in the prior PragmaticBoard batch). (4) `ph_issue_watchers` table uses `(supabase as any)` cast — table not in generated types, silently returns empty on every query and mutation.
**Rule:** After every `CatalystView*` change, open the kanban card modal AND the allwork panel and spot-check both. They use different rendering branches of `CatalystViewBase`. Never set `height:Xvh` on a div inside `@atlaskit/modal-dialog` — the dialog owns its own height; use `minHeight` only. Description body content must have `paddingLeft` equal to the section header's chevron+gap width (currently 20px) to align with the label text.

## 2026-05-08 — InlineGroupCreateRow type picker: click-to-cycle ≠ Jira; portal dropdown required; JS `.click()` fails React 17+ synthetic events
**Surface:** BacklogPage.atlaskit.tsx — InlineGroupCreateRow type picker
**Pattern:** Original type picker was click-to-cycle (click the icon to advance to next type). Jira renders `aria-label="Select work type. Story currently selected."` — a named trigger opening a listbox with all 9 types. The click-to-cycle pattern is non-discoverable. Fix: replaced with portal dropdown matching `GroupByControl` pattern (L21 portal-empty bug prevents `@atlaskit/dropdown-menu`). Also discovered: in React 17+ with event delegation, `el.click()` does NOT trigger React synthetic handlers. Must use `el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))` to fire React's synthetic onClick. Same applies to all Chrome MCP JS test probes.
**Rule:** Inline create type pickers must be portal dropdowns showing all CREATABLE_TYPES — never click-to-cycle. When testing React component handlers via JS in Chrome MCP, always use `dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window}))` instead of `.click()` — React 17+ event delegation means `.click()` bypasses synthetic handlers.

## 2026-05-08 — StatusPill inner text must be 11px/653/uppercase/letterSpacing:0.165px; summary cell uses makeSummaryInlineEditCell not makeSummaryCell
**Surface:** BacklogPage list table (cells.tsx + editors.tsx)
**Pattern:** StatusPill inner span was set to `14px/400/textTransform:none` — DOM probe of Jira list confirmed inner span is `11px/653/uppercase/letterSpacing:0.165px`. Summary color fix must be applied to `makeSummaryInlineEditCell` readView span in editors.tsx, NOT `makeSummaryCell` in cells.tsx — BacklogPage uses the inline-edit variant. The outer wrapping span from `data-jira-table-editor` inherits `rgb(41,42,46)` from `tbody td`, so finding first span via `querySelector('span')` returns the wrong element; the actual rendered text span is the second/deeper one.
**Rule:** When fixing typography in a cell renderer, always grep for which `make*Cell` variant is actually wired in the page's column definition. `makeSummaryCell` and `makeSummaryInlineEditCell` are different files/functions. Apply the fix to both branches (editable readView + non-editable display) in `makeSummaryInlineEditCell`. Always probe the innermost colored span, not the first span in the tree.

## 2026-05-08 — Status color mapping: use DOM probe, not category assumptions; + button after label; hover-only
**Surface:** BacklogPage.atlaskit.tsx + JiraTable.tsx + backlog.utils.ts
**Pattern:** STORY_STATUS_LOZENGE had `Blocked: 'removed'` (red) and `On Hold: 'moved'` (yellow) and `In Design: 'inprogress'` (blue). DOM probe of Jira BAU 2026-05-08 showed: Blocked = grey `rgb(221,222,225)` (To Do category), On Hold = grey, In Design = grey (BAU-specific To Do category). Group header `+` button was positioned BEFORE the label; Jira places it AFTER. `+` was always visible; Jira makes it hover-only. Group header used `@atlaskit/Lozenge` which renders different hex from Jira (token resolution differs) — StatusPill uses exact measured hex.
**Rule:** Always DOM-probe Jira's `getComputedStyle` for ALL status values before assigning appearance. Never assume "Blocked = red" or "In Design = blue" — status categories are BAU-project-specific config. Group `+` must be (1) after the label and (2) hidden at `opacity:0` with `.jira-group-header-row:hover .jira-group-add-btn { opacity:1 }`. Group header status label must use `StatusPill` (exact hex), NOT `@atlaskit/Lozenge` (token resolution diverges from Jira).

## 2026-05-08 — Group inline-create row invisible when group is collapsed on BacklogPage
**Surface:** BacklogPage.atlaskit.tsx (JiraTable grouped view)
**Pattern:** `renderGroupInlineRow` only renders when `!collapsed`. The `+` button in the group header called `e.stopPropagation()` to avoid toggling the group, so clicking `+` on a collapsed group set `inlineCreateGroup` state but the row never appeared (group stayed collapsed). Also: `JiraTable` independently rendered a `{g.rows.length}` grey pill badge which duplicated a `(N)` text badge added to `labelNode` in BacklogPage — Jira shows NO count badge on group headers at all. Inline create placeholder "What needs to be done in X?" doesn't match Jira's "What needs to be done?".
**Rule:** `onAddToGroup` callback must call BOTH `setInlineCreateGroup` AND `setCollapsedGroups(prev => { next.delete(groupId); return next; })` so clicking `+` on a collapsed group simultaneously expands it and inserts the inline create row. Never add count badges to group headers — Jira's grouped list shows only the status lozenge/label + `+` button with no count. Inline create placeholder must be "What needs to be done?" with no group-name suffix.

## 2026-05-08 — SubtasksPanel inline create invisible when children.length === 0
**Surface:** SubtasksPanel index.tsx (all work item types)
**Pattern:** `InlineCreateWithAI` was rendered inside the `visibleRows.length > 0` IIFE (the JiraTable block). When a work item has zero subtasks and the user clicks "+ Create sub-task", `creating` becomes `true`, the empty state disappears (guarded by `!creating`), but the inline create never appears because the entire table block is skipped. Fix: add a standalone `{creating && canCreate && children.length === 0 && <InlineCreateWithAI … />}` block outside the `visibleRows.length > 0` guard, positioned between the empty state and the filter-empty-state blocks.
**Rule:** When InlineCreateWithAI is only rendered inside a `rows.length > 0` block, creating from an empty list is always broken. Always add a standalone rendering path for the `creating && items.length === 0` case.

## 2026-05-08 — WatchersChip Escape propagates to parent modal without capture-phase guard
**Surface:** WatchersChip.tsx (all detail views)
**Pattern:** The self-rolled popover used `mousedown` for click-outside but had no keyboard handler. Pressing Escape with the watchers popover open closed both the popover AND the entire kanban modal because the keydown event bubbled up to the modal's own Escape handler. Fix: add `document.addEventListener('keydown', handler, true)` in capture phase (beats the modal's bubble-phase listener) that calls `e.stopPropagation()` before `setOpen(false)`.
**Rule:** Self-rolled popovers MUST add a capture-phase `keydown` Escape handler (`addEventListener('keydown', fn, true)`) so Escape only closes the popover, not the parent modal. The bubble-phase handler always loses to the modal's bubble-phase handler.

## 2026-05-12 — Section header spec is PER-SECTION, not a single global value (corrects 2026-05-08 lesson)
**Surface:** CatalystDescriptionSection, CatalystKeyDetails, SubtasksPanel, LinkedWorkItemsSection, ActivityPanel
**Pattern:** 2026-05-08 lesson claimed ALL section headers are 14px/600/#172B4D. 2026-05-11 re-probe then overcorrected to 16px/653 for ALL sections. 2026-05-12 TreeWalker text-node probe (authoritative) on BAU-5609 settled the conflict:
- **Description `<h2>`**: 14px / 500 / rgb(80,82,88) = `var(--ds-text-subtle, #505258)` ← different from all others
- **Key details span** (text node inside collapsible toggle): 16px / 653 / rgb(41,42,46) = `var(--ds-text, #292A2E)` ✅ matches Catalyst
- **Subtasks / Child issues span**: 16px / 653 / rgb(41,42,46) ✅ matches Catalyst `.sp-title` CSS
- **Linked work items `<h2>`**: 16px / 653 / rgb(41,42,46) ✅ already correct
- **Activity span**: 16px / 653 / rgb(41,42,46) ✅ already correct
**Rule:** Description section header is the ONLY one that deviates: `<h2 style={{ margin:0, fontSize:14, fontWeight:500, color:'var(--ds-text-subtle, #505258)' }}>`. All other section headers (Key details, Subtasks, LWI, Activity) correctly use 16px/653. Never group all sections under one spec — always TreeWalker-probe the text node directly in Jira before changing a section header style. The 2026-05-08 and 2026-05-11 measurements both hit wrapper elements, not the text node. Breadcrumb links: 14px/400/#42526E. Rail field labels (stacked): 11px/600/#6B778C. Timestamps: 11px/400/#6B778C.

## 2026-05-05 — Schema-probe before field add, in practice (B4 anti-pattern #18 applied)
**Surface:** CatalystSidebarDetails right rail
**Pattern:** B4 4a/4b spec said "add Time tracking + Components + Due date to right rail." Before coding, ran `getJiraIssueTypeMetaWithFields` for all 9 BAU types (Story 10006 / Task 10010 / QA Bug 10012 / PI 10045 / Business Gap 10035 / Backend 10022 / Feature 10173 / CR 10305 / API Req 10206). Result: `timetracking` and `components` are NOT in ANY BAU type's screen scheme. `duedate` is in Backend (subtask family share screen), Production Incident, Change Request, Epic only. Adding Time tracking + Components would have shipped fields with no Jira backing — anti-pattern #18 violation. Only Due date was added, gated on the 3 confirmed types (Epic already had its own block).
**Rule:** Anti-pattern #18 isn't theoretical. The audit's pending list is a snapshot — re-probe at code time, not just at audit time. The Distilled-note finding "right rail Dev / More fields / Automation trays missing" was framed in terms of standard Jira; the BAU project schemas reject most of that scope. Honor the schema, not the Atlassian stock catalogue.

## 2026-05-05 — EpicDueDateField generalized to non-Epic types
**Surface:** EpicDueDateField + CatalystSidebarDetails (B4 4a)
**Pattern:** B4 needed Due date on Backend / Production Incident / Change Request. The existing `EpicDueDateField` had `if (!isEpic) return null;` as a defensive guard. Removed the guard — the `isEpic` prop is kept on the signature so existing Epic callers don't break, but it no longer affects rendering. Component now renders whenever the caller passes it; the schema gate lives at the call site (`normalizeIssueTypeBucket(issue.issue_type) === 'subtask' || issue.issue_type === 'Production Incident' || issue.issue_type === 'Change Request'`).
**Rule:** When generalizing a component, remove early-return guards rather than passing dummy values from new callers. Keep the prop signature stable so old callers don't break, mark the prop semantically deprecated in the docstring. Don't rename the file just to chase the name — naming churn breaks too many imports.

## 2026-05-05 — Watchers manage-popover (eye glyph + click-outside, B1)
**Surface:** WatchersChip
**Pattern:** Eye glyph swap shipped 2026-05-03. Manage-popover added 2026-05-05: `WatchersChip` opens an absolutely-positioned popover (260-320px wide) listing watchers with avatars + names, plus a primary "Start watching" / subtle "Stop watching" button. Self-rolled `useRef` triggerRef + popupRef + `mousedown` listener for click-outside — `@atlaskit/popup` v4.16 has the empty-portal bug noted in `AllProjectsTable.tsx:19-22`. `useCatalystWatchers` extended to hydrate profile rows from `profiles(id, full_name, avatar_url, email)`.
**Rule:** Self-rolled popups (with `useRef` + mousedown listener) are the canonical pattern in this codebase until @atlaskit/popup is upgraded. Don't introduce yet another popup pattern; mirror `AllProjectsTable`'s `useClickOutside` shape.

## 2026-05-05 — jira-attachment-proxy hardened for performance (D1)
**Surface:** supabase/functions/jira-attachment-proxy
**Pattern:** Old proxy buffered the whole attachment via `arrayBuffer()` (OOM risk on large files), did a `ph_jira_connection` DB hit on every request, and returned generic `{ error: 'Jira returned X' }` for all upstream failures. New proxy: streaming pass-through (`new Response(jiraRes.body)` — no buffering), 5-min connection cache per cold-start worker, ETag/If-None-Match passthrough → 304 short-circuit, HEAD method support for size-checks, tiered error codes (`JIRA_UNAUTHORIZED` / `JIRA_FORBIDDEN` / `JIRA_NOT_FOUND` / `JIRA_UPSTREAM_ERROR` / `INTERNAL_ERROR`).
**Rule:** Edge functions must stream binary content, not buffer it. Connection lookups belong in a per-worker cache. Pass through ETag and conditional headers — let the browser revalidate, don't make the worker round-trip when it doesn't have to.

## 2026-05-05 — Epic ParentAndLabels deleted; CatalystKeyDetails is canonical for all types (C1)
**Surface:** CatalystViewEpic + CatalystKeyDetails + ParentAndLabels (deleted)
**Pattern:** Epic was the last view using the legacy `ParentAndLabels` block (parent only, despite the name; Labels was removed globally 2026-05-05). Replaced with `<CatalystKeyDetails issue=… itemType="epic" />`. The component already routes Parent through CatalystParentLinker (Epic → Business Request via `parentSource="business_request"` per parent-rules.ts) and renders Priority via the canonical `EditablePriority` — Priority placement matches the 2026-05-05 directive (Key details left, never right rail). Deleted `epic/ParentAndLabels.tsx`. Updated CatalystKeyDetails docstring to remove the stale "Future step: unify ParentAndLabels into this" note.
**Rule:** Type-specific legacy blocks die when the canonical primitive can absorb them. Check that the canonical resolves the right `parentSource` via parent-rules.ts before deleting (Epic → BR is the rule; CatalystParentLinker honored it).

## 2026-05-05 — MDT Ref + Labels banned from CatalystSidebarDetails (jira-compare cycle 1)
**Surface:** CatalystSidebarDetails (all issue type views, but caught on BAU-5737 QA Bug)
**Pattern:** Cycle 1 jira-compare audit on BAU-5737. Lane B Rovo `getJiraIssueTypeMetaWithFields(BAU, QA Bug=10012)` returns 11 fields: Assignee, Severity, Assessment Feature, Description, Fix versions, Issue Type, Parent, Priority, Project, Reporter, Summary. **Labels is NOT in the QA Bug screen scheme. MDT Ref is NOT in the QA Bug screen scheme.** Catalyst rendered both globally because the 2026-05-03 "RESTORED" directive (based on a Story-only DOM probe of BAU-5609) was over-generalised to all routing buckets. Vikram caught it: "MDT ref field is banned... how did you leave custom fields of Catalyst on defect when i did not ask for explicitly".
**Rule:** **MDT Ref is permanently banned from ALL Catalyst views and sidebars, for every issue type, forever.** No exceptions, no per-type asks will override this. **Labels removed globally** — add back per type only after Jira screen scheme validation (anti-pattern #18). 2026-05-07: Labels restored for Task type only (Fix J, BAU-5538 re-probe confirmed). **General rule (anti-pattern #18):** Before adding ANY field to CatalystSidebarDetails or any rail Details section, query `getJiraIssueTypeMetaWithFields` for the target issue type and confirm the field is in `fields[].key`. Catalyst-side custom fields require an EXPLICIT per-type ask from Vikram — do NOT generalise from a single Lane A probe to other types.

## 2026-05-07 — Service Now# + Assessment Feature permanently banned from Catalyst
**Surface:** All Catalyst detail views (caught during Production Incident jira-compare audit)
**Pattern:** Jira's Production Incident Key details shows Service Now# and Assessment Feature. Both are Jira-specific custom fields (`customfield_10130` / `customfield_10126`) with no Catalyst data model backing. Vikram directive 2026-05-07: these are banned.
**Rule:** **Service Now# (`CatalystServiceNowDisplay`) and Assessment Feature (`CatalystAssessmentFeatureField`) are permanently banned from ALL Catalyst views, for every issue type, forever.** Do NOT add them to Key details `extraRows`, sidebar children, or any other surface regardless of what the Jira screen scheme returns. The components may remain in the codebase for legacy reasons but must never be rendered.

## 2026-05-07 — Catalyst Intelligence / AI Sparkles inline button permanently banned from all detail views
**Surface:** CatalystQuickActions (shared by all 8 CatalystView* components)
**Pattern:** CatalystQuickActions rendered a ✨ AI Sparkles button beside the `+` Add button, opening a "Catalyst Intelligence / Improve description" popup. Jira's detail view has NO inline AI button at this position — only the `+` Add button. The inline AI button duplicates the `ImproveIssueDropdown` that already lives in the right rail (passed as `improveDropdown` prop to `CatalystSidebarDetails`). Caught after 10+ rounds of jira-compare because the button was subtle and only appeared on hover in some views.
**Rule:** **The AI Sparkles / Catalyst Intelligence inline button is permanently banned from `CatalystQuickActions` and ALL detail view surfaces.** Do NOT re-add `onAiImprove`, `SparklesIcon`, `showAiMenu`, or any inline AI improve button to the `+` button area. The ONLY AI improve entry point in all detail views is `ImproveIssueDropdown` in the right rail. No exceptions.

## 2026-05-05 — Status pill colors: ADS bold tokens ≠ Jira actual colors
**Surface:** CatalystStatusPill (all issue type views)
**Pattern:** ADS `color.background.success.bold` = `#1F845A` (dark forest green). Jira's actual header status pill for "done" category = `rgb(148,199,72)` = `#94C748` (lime green) with dark text `#292A2E` and `fontWeight: 500` — not white text, not 600 weight. ADS bold tokens are too dark and produce white-on-dark contrast, not matching Jira's light-on-lime. Other probed values: `inprogress` = `#669DF1`, `default/todo` = `rgba(5,21,36,0.06)`.
**Rule:** Always DOM-probe Jira's actual `getComputedStyle` for status pill background/color/fontWeight before choosing an ADS token. When no ADS token matches, use exact Jira hex (jira-compare bypass applies — Jira parity overrides ADS-token preference).

## 2026-05-06 — "Assign to me" IS a persistent link in Jira's idle right rail (correction)
**Surface:** CatalystSidebarDetails Assignee field row
**Pattern:** 2026-05-05 rule incorrectly stated "Assign to me" only appears in the hover-picker. Live re-probe 2026-05-06 of BAU-5803 confirms "Assign to me" is a visible blue link directly below the Assignee value in Jira's idle right rail at all times. The `handleAssignToMe` handler already existed in the component; the link was removed based on a wrong probe reading.
**Rule:** "Assign to me" MUST be rendered as a small blue link (`font-size: 11px`) below the Assignee picker in the idle right rail, only when the current user is not the assignee. Priority = Key details left block for all types EXCEPT Epic. For Epic, Priority belongs in the right rail Details section (between Assignee and Reporter) — confirmed by re-probe of BAU-5419 on 2026-05-07.

## 2026-05-06 — Development, Automation, and Automate button: NEVER implement
**Surface:** CatalystSidebarDetails right rail
**Pattern:** Jira shows a "Development" collapsible section (branches/PRs/commits), an "Automation" collapsible section with rule executions, and a ⚡ Automate button in the status header. Vikram explicitly directed these to NEVER be implemented in Catalyst.
**Rule:** NEVER implement the Development section, Automation section, or Automate (⚡) button in Catalyst under any circumstances, for any issue type, in any view. These are permanently out of scope. Do not add them even during a jira-compare parity run. Do not ask Vikram for permission — the answer is always no.

## 2026-05-05 — Section count badges should be plain text, not pill badges
**Surface:** SubtasksPanel, LinkedWorkItemsSection, DefectsSection, IncidentsSection, AttachmentsSection
**Pattern:** Prior sessions "promoted" section header counts to round pill badges and flat box badges (border-radius, background). Jira shows NO styled badge on section headers — counts are plain muted text inline after the heading, or absent entirely.
**Rule:** `.sp-title-count`, `.lwi-header__count`, `.att-badge` must be plain inline text (`display: inline`, no background, no border-radius). Never add pill/badge styling to section header counts.

## 2026-05-05 — Right rail select fields need transparent/borderless idle state
**Surface:** CatalystSidebarDetails right rail (all issue type views)
**Pattern:** `@atlaskit/select` controls in the right rail showed visible borders and ▾ dropdown indicators in idle state, making the rail look like a form. Jira's right rail fields appear as plain clickable text in idle state — no border, no indicator — with subtle bg on hover.
**Rule:** Scope CSS to `.cv-drawer-sidebar [class*="-select__control"]` to set `border-color: transparent; background: transparent; box-shadow: none` in idle, `background: var(--ds-background-neutral-subtle-hovered)` on hover. Hide `__dropdown-indicator` by default, show on `:hover` and `--is-focused`.

## 2026-05-04 — Ask Vikram before adding or removing any field/component
**Surface:** any view, any work item type
**Pattern:** Jira-compare audits identified fields present in Jira but absent in Catalyst (e.g. "Key details", "Development" section) and fields in Catalyst not in Jira. Autonomously adding or removing these breaks the agreed surface contract and may conflict with product decisions.
**Rule:** Before adding any field/component that exists in Jira but not in Catalyst, OR removing anything in Catalyst not present in Jira — STOP and explicitly ask Vikram for permission in chat. Do NOT make these additions/removals autonomously under any circumstances, even during a jira-compare parity run.

---

## 2026-05-04 — Use jira-compare skill for every new feature built
**Surface:** any new feature implementation
**Pattern:** New features shipped without a jira-compare audit accumulated visual and wiring defects that were only caught later, requiring costly retroactive fixes.
**Rule:** Run the `jira-compare` skill on every new feature before marking it complete. No feature is done until jira-compare passes.

## 2026-05-04 — All outputs must be visual maps with before/after comparison
**Surface:** any audit, diff, or parity report
**Pattern:** Text-only diffs and lists of findings were hard to scan and easy to misread, slowing review cycles.
**Rule:** All outputs (audit results, parity reports, defect summaries) must be presented as visual maps showing the before state (current Catalyst) and after state (target Jira parity) side by side. No text-only findings lists.

## 2026-05-04 — Dark/light mode themes must come exclusively from Atlassian Design System
**Surface:** any theming, color, or token change
**Pattern:** Custom or third-party theme tokens were used for dark/light mode, causing inconsistency with ADS primitives and breaking parity with Jira's own theming.
**Rule:** All dark and light mode theme values must come exclusively from https://atlassian.design/ tokens. No custom color values, no third-party theme libraries for theming. If a token doesn't exist in ADS, raise it with Vikram before inventing one.

## 2026-05-04 — Handover: write Obsidian file + copy-paste block for next conversation
**Surface:** any handover request
**Pattern:** Handovers written as plain markdown docs required manual re-mapping in the next session, losing context and wasting warm-up time.
**Rule:** When a handover is requested: (1) write the full handover to the Obsidian vault, (2) produce a self-contained copy-paste block with all file paths, issue keys, component names, and state mapped — ready to paste as the first message of the next conversation. No context should need to be reconstructed manually.

## 2026-05-04 — Warm-up: read Obsidian files first, fall back to Claude memory
**Surface:** session warm-up / context loading
**Pattern:** Claude memory alone was stale or incomplete between sessions; Obsidian files contain the most recent handover state but weren't being consulted first.
**Rule:** At the start of every session, read the relevant Obsidian vault files before consulting Claude memory. Obsidian is the primary source of truth for session state. Claude memory is the fallback for anything not covered by Obsidian.

---

## 2026-04-28 — Handover items can conflict with in-code prohibitions
**Surface:** any patch listed in a handover
**Pattern:** Handover labelled Story Points as the "highest-asked Story-specific field" and option B for the next round. CatalystSidebarDetails.tsx line 422 has the explicit comment `Story Points: BANNED platform-wide. Do NOT re-add.` plus a JSDoc GUARDRAIL — added 2026-04-16 by Lovable co-authored with Vikram, citing Catalyst spec. The handover was written 12 days later and didn't reconcile with the ban. Following the handover blindly would have re-added a field the spec explicitly removed.
**Rule:** Before implementing any handover-listed feature, grep the codebase for negative directives ("BANNED", "Do NOT", "DEPRECATED", "REMOVED") that mention the feature. If a directive exists, halt and surface the conflict to Vikram. In-code directives win over handovers — they were authored against the live codebase, the handover was a snapshot.

## 2026-04-28 — `cv-*-select__*` DOM classes don't mean non-Atlaskit
**Surface:** any Lane A DOM probe that flags Atlaskit compliance
**Pattern:** I saw `cv-priority-select__control` in the rendered DOM and inferred the priority field bypassed `@atlaskit/select`. Wrong. `@atlaskit/select` is a styled wrapper around react-select and forwards `classNamePrefix` to it. The `cv-` prefix here was a deliberate styling override passed to Atlaskit Select (`classNamePrefix="cv-priority-select"` on line 264 of `EditableFields.tsx`, with `import Select from '@atlaskit/select'` on line 9). The DOM class prefix was a developer choice, not a primitive choice.
**Rule:** Before flagging an ADS-compliance defect from DOM classnames, grep the source for the component's `import` statement. `@atlaskit/select` + custom `classNamePrefix` is fine. Only flag a violation when the component imports `react-select` directly (no `@atlaskit/*` wrapper) or rolls its own dropdown.

## 2026-04-28 — CRUD gate is about data flow on each side, not cross-system parity (sync deliberately off)
**Surface:** Defect (QA Bug) right-rail, BAU-5717
**Pattern:** I treated a Catalyst-vs-Jira data divergence (BAU-5717: Status ToDo vs Ready for QA, Assignee Syed Habib vs Yazeed Daraz) as a P0 defect. Vikram corrected: Catalyst is in functionality-mode, wh-jira-sync is intentionally parked, divergence is expected and the risk is accepted. The CRUD gate's job is to prove data FLOWS through CRUD on each side independently — UI → backend → render — not that the two sides agree.
**Rule:** Don't flag stale data as a defect while sync is parked. CRUD-R diff is informational only, not pass/fail. The gate's pass criteria are: CRUD-C lands a row in each side's backend, CRUD-U writes through and renders after reload, CRUD-D removes the row. Cross-system parity is out of scope for this regime. Pick recently-synced tickets (a couple days old) when you want incidental data alignment, but don't make alignment the test.

## 2026-04-28 — Round 1 cross-type patches: 8 self-contained P0 fixes closed 113 of 253
**Surface:** /allwork list + Defect/Incident/Task/Story views
**Pattern:** Audit produced 253 cross-type findings dominated by 8 root-cause clusters (status pill uppercase, footer count, deep-link, lozenge typography, parent rendering, smart-card crash, description font, page H1). Each fix was tiny but repeated across 7 issue types — fixing once at the shared component closed 24+ findings in one shot.
**Rule:** Before patching one type's view, grep for the same legacy component in OTHER type views — if `WorkItemStatusLozenge`, `CatalystParentLinker`, `AtlaskitRenderer` etc. is shared, one edit shuts down findings on all surfaces. Per-type one-offs are a smell.

## 2026-04-28 — Atlaskit Lozenge needs structural CSS override, not prop fix
**Surface:** any lozenge-using surface
**Pattern:** `@atlaskit/lozenge` v11 renders `<span class="css-X"><span class="css-Y">LABEL</span></span>` where the inner span carries `text-transform: uppercase`, `font-weight: 653`, `letter-spacing > 0`. Modern Jira renders sentence case. The lozenge has no prop to disable transform.
**Rule:** Wrap each lozenge in `<span data-cp-lozenge-jira-parity>` and add a global CSS rule overriding the inner span. Don't try to override via props — they don't exist for typography.

## 2026-04-28 — useItemSelection URL race deletes deep-link param on mount
**Surface:** ProjectAllWorkView (and any consumer of useItemSelection)
**Pattern:** URL-sync effect deleted `?issue=KEY` whenever `activeItemId` was null — but null is the default during first render before items have loaded. Hydration ran on the next tick, but the URL param was already gone, so deep-link landings always fell back to default.
**Rule:** Sync-to-URL deletion must guard on `items.some(i => i.jiraKey === current || i.id === current)` — only delete when the param's value is known-stale. For unmatched values, preserve the param so a late refetch can hydrate.

## 2026-04-28 — /allwork list excludes Epic, Feature, Task — non-Defect types unreachable from this surface
**Surface:** /allwork
**Pattern:** Search "BAU-4466" (Epic), "BAU-3726" (Feature), "BAU-4038" (Task) all returned `0 of 1000`. CatalystViewEpic/Feature/Task.tsx exist in code but are unreachable end-to-end through this navigator.
**Rule:** Audit `useProjectAllWorkItems` query for type-filter / page-cap before claiming a per-type view is testable from /allwork. If the row never appears in the list, route the audit through the surface that DOES include the type.

## 2026-04-28 — v4 skill rewrite: 3-lane logical-parallel model
**Surface:** skill itself
**Pattern:** v3 was 1350 lines, screenshot-mandatory, doc-heavy, single-tool (Chrome MCP only). Loop ran open-ended without a hard cap and without a CRUD acceptance test, so audits closed on visual match alone and shipped wiring defects.
**Rule:** Three lanes (Chrome MCP, Rovo/Atlassian MCP, Computer Use) report OBSERVATION before DIFF. CRUD on a canonical entity is the acceptance gate. Loop capped at 5 cycles. No standalone docs — only prompt blocks, MONITOR block, JIRA bug filings, and lessons here.

## 2026-04-24 — Rovo prompts need full probe payload
**Surface:** any
**Pattern:** Asking Rovo "what primitive is this?" without DOM context wastes a round — Rovo cannot infer from a screenshot alone.
**Rule:** Every Rovo prompt block must include the element's className, computed styles, and data-attrs from the Lane A probe. Rovo gets what Claude saw.

## 2026-04-24 — Visual match is not parity
**Surface:** any
**Pattern:** Surfaces declared "parity-complete" on visual match shipped wiring defects (composer doesn't submit, reaction increments visually but doesn't persist).
**Rule:** CRUD parity at C, R, U, D is the acceptance gate. Visual match without CRUD green is a fail. If a surface has no interactive behaviour in scope, state it explicitly and require Vikram sign-off.

---

## 2026-05-08 — Jira list table full parity: key cell border, comment badge, CRUD verified
**Surface:** BacklogPage JiraTable (cells.tsx + JiraTable.tsx + BacklogPage.atlaskit.tsx)
**Pattern:** Full Jira list-view parity audit completed. Key lessons: (1) `makeKeyCell` focused state must use `display: block; width: 100%; box-sizing: border-box` — NOT `inline-block` — so the blue border spans the full column cell width, not just the text width. (2) `makeCommentsCell` needs a 6px blue dot badge (`position: absolute; top: 1; right: 1; borderRadius: 50%; background: --ds-background-information-bold`) on the CommentIcon when `n > 0` — Jira shows this indicator on all rows with comments. (3) `DEFAULT_VISIBLE_COLUMNS` must always match column `defaultVisible: true` flags — Jira BAU default is key/summary/status/comments/parent (no Assignee). (4) The `__drag` structural column shifts `nth-child` selectors by 1 — Type moves from nth-child(2) to nth-child(3).
**Rule:** When a focused-state border must span a full TD cell, switch the element to `display: block; width: 100%` — inline-block shrinks to text width inside a flex container. Always probe `getComputedStyle` on the innermost element of the focused cell to verify width equals TD content width.

---

## 2026-05-07 — StatusPill prior measurement was wrong: 11px/700/uppercase ≠ Jira
**Surface:** BacklogPage list table (all surfaces using StatusPill in cells.tsx)
**Pattern:** A 2026-04-26 re-measurement comment in cells.tsx claimed Jira's lozenge is 11px / fontWeight 700 / textTransform uppercase. Fresh probe 2026-05-07 on digital-transformation.atlassian.net returned fontSize 14px / fontWeight 400 / textTransform none on the actual colored `span` element. The old measurement was taken from the outer wrapper, not the inner pill. Always probe the innermost colored element.
**Rule:** When re-measuring a lozenge/pill, query the specific `span` with background-color set, not the parent wrapper. Use `Array.from(document.querySelectorAll('span')).filter(s => getComputedStyle(s).backgroundColor !== 'rgba(0,0,0,0)')`.

## 2026-05-07 — DEFAULT_VISIBLE_COLUMNS must be updated alongside column `defaultVisible: true`
**Surface:** BacklogPage column picker
**Pattern:** Adding `defaultVisible: true` to a column schema definition is not sufficient — the `DEFAULT_VISIBLE_COLUMNS` constant also controls what columns appear by default and what gets auto-merged into URL-saved column sets (line 505 merge logic). Setting one without the other means new columns never appear for users with a clean URL state.
**Rule:** When adding a column that should be visible by default, add its id to BOTH the column's `defaultVisible: true` AND `DEFAULT_VISIBLE_COLUMNS` array.

## 2026-05-07 — Date cell border/pill styling was Catalyst opinion, not Jira parity
**Surface:** Created/Updated/Due date cells in BacklogPage table
**Pattern:** The makeDateCell renderer added a bordered pill (`border: 1px solid`, `borderRadius: 3`, `padding: 2px 8px`) that was documented as "Jira-parity". Fresh DOM probe shows Jira's date cells have no border — just calendar icon + text with no wrapping box.
**Rule:** Before adding visual chrome to a cell (borders, backgrounds, radius), probe the live Jira DOM first. Catalyst opinions that "look like Jira" often aren't.

---

## 2026-06-11 — Responsive multi-panel layout: sidebar width must NEVER equal hide threshold

**Surface:** ProjectAllWorkView (`/project-hub/BAU/allwork`) — 3-panel split (rail + list + detail)
**Pattern:** First responsive fix used binary `isNarrow` breakpoint. In medium state (split 480–1119px), list shrunk to 260px but detail panel was 632px wide. The `@container (max-width: 440px)` rule hides `cv-drawer-sidebar` only when the cv-drawer-body container ≤ 440px. Sidebar width in panelMode = 440px. So: 632px container → sidebar SHOWS → body = 632 – 440 = 192px. Broken.

**Root cause geometry:**
- Sidebar width and @container hide-threshold were IDENTICAL (both 440px)
- This means sidebar shows in the ENTIRE medium range (any detail width > 440px)
- Sidebar presence collapses body to near-zero width — visually empty

**Fix:**
- Tri-state layout: `'wide' | 'medium' | 'narrow'` via ResizeObserver on split container
- Wide (≥1120px): list=360px, hideSidebar=false → sidebar shows, body gets full room
- Medium (480–1119px): list=260px, hideSidebar=true → sidebar force-hidden, body = full detail width
- Narrow (<480px): list=100% width, detail hidden

**Rule (NEW — applies to ALL future responsive layouts with a collapsible panel):**
1. **Compute the geometry before coding.** For every breakpoint range, calculate: `detail_width = split_width - list_width - gap`. Then: `body_width = detail_width - sidebar_width`. If body_width < 200px for any split value in that range, the sidebar MUST be force-hidden.
2. **Sidebar width and @container threshold are two independent values** — they only happen to match in panelMode. In any custom breakpoint scheme, explicitly compute whether the sidebar will show and whether that leaves the body usable.
3. **`hideSidebar` prop chain:** `ProjectAllWorkView` (tri-state state) → `CatalystDetailRouter` (sharedProps) → all `CatalystView*` destructuring → `<CatalystViewBase hideSidebar={hideSidebar}>` → sidebar `display: hideSidebar ? 'none' : 'flex'`. Every `CatalystView*` component MUST forward `hideSidebar` — it's in `CatalystViewBaseProps`.
4. **Never use binary isNarrow for a 3-panel layout.** Two thresholds are required: wide→medium (hide sidebar but keep list+detail visible) and medium→narrow (collapse to list only).

**Severity:** P0 (broken layout shipped after first fix — required second pass with DOM probe RCA)

---

## 2026-06-03 — BRANCH POLICY (simplified)

**Default: work on `main`.** Every conversation starts on whatever branch is currently checked out (usually `main`). No automatic branch creation.

**Exception: if Vikram specifies a branch name**, create/switch to that branch before writing any code. Otherwise, commit directly to the current branch.

---

## 2026-05-19 — CRUD Phase 5 (RE-PROBE): Design System Governance Admin — Schema Field Name Mismatch Blocks Data Rendering

**Surface:** /admin/design-system (Design System Governance violations table)
**Pattern:** CRUD Phase 5 read-verification revealed violations table rendering empty despite confirmed test data in Supabase database (8 violations). Root cause: TypeScript `Violation` interface had incorrect field names mismatching the actual Supabase database columns:
- Interface declared: `rule: string` — actual column: `rule_name: string`
- Interface declared: `module_id: string` — actual column: does not exist
- Interface declared: `id: string` — actual type: `number` (bigint)

When Supabase API returned objects with actual column names (`rule_name`, no `module_id`), React component attempted to access `violation.rule` (undefined) and `violation.module_id` (undefined), causing silent rendering failure. The data was correctly fetched from the database; the component failed to render it.

**Fix:**
1. **design-audit.ts**: Updated `Violation` interface to match actual Supabase schema:
   ```typescript
   export interface Violation {
     id: number;              // was: string
     surface_id: string;
     rule_name: string;       // was: rule
     severity: 'P0' | 'P1' | 'P2';
     description: string;
     created_at: string;
     updated_at: string;
     // removed: module_id (non-existent column)
   }
   ```
2. **DesignSystemAdmin.tsx**: Updated rendering to use correct field name:
   - Line 530: `{violation.rule_name}` (was: `{violation.rule}`)

**CRUD Verification Results:**
- **Phase 5.1 (Read):** ✅ PASSED — Violations table now displays all 8 project-hub violations after schema fix
- **Phase 5.2 (Update):** ✅ PASSED — SQL UPDATE successfully changed violation id=1 severity from P0 to P1; database confirmed via RETURNING clause
- **Phase 5.3 (Delete):** ✅ PASSED — SQL DELETE successfully removed violation id=1; remaining project-hub violations: 7 records (ids 2,3,4,5,7,8,9)

**Final Database State (project-hub):**
- Total violations: 7 (down from 8)
- P0 blockers: 3 (banned-column-mdt-ref, hardcoded-hex-color, banned-column-story-points)
- P1 issues: 3 (uppercase-labels × 3)
- Compliance score: ~64%

**Lesson:** TypeScript interface field name mismatches between code and database schema are SILENT FAILURES — no compile errors, no console warnings, but complete rendering failure. Before declaring a data-loading feature complete:
1. Verify interface field names match actual database column names via information_schema query
2. Verify all interface fields have corresponding database columns (no phantom fields)
3. Verify field types match (number vs string for numeric PK columns)
4. Test the full READ→DISPLAY path, not just the API query
5. Default to: query the actual Supabase schema first, then define the interface to match, not the reverse

**Severity:** P1 (silent data incompleteness — feature appears non-functional until the interface is corrected)

---

## 2026-05-19 — Admin sidebar must use Jira flat-expanded pattern; never hide leaves behind collapsed pockets

**Surface:** All `/admin/*` pages (AdminSidebarV2 + AdminLayout)
**Reference:** Live DOM probe of `https://digital-transformation.atlassian.net/jira/settings/issues/issue-types` on 2026-05-19.

**Pattern:** Prior `AdminSidebarV2` used `@atlaskit/side-navigation` ButtonItem + ChevronDown to render each pocket as a collapsible group. Leaf items (e.g. "Design Governance" under "Design system") were INVISIBLE until the user clicked the parent pocket open. Vikram directive: "design governance sub section must be in the main side bar what u see" — i.e. visible inline without expanding.

**Jira admin tokens (probed live):**
- **Section header**: 12px / fontWeight 653 / `rgb(107,110,118)` / sentence case / padding 8px 0 8px 6px
- **Nav item**: 14px / 500 / `rgb(80,82,88)` inactive · `rgb(24,104,219)` active with faint blue background + 2px blue left rail
- **Page H1**: 24px / 653 / `rgb(41,42,46)` / Atlassian Sans / lineHeight 28px
- **Page subtitle**: 14px / 400 / `rgb(80,82,88)`
- **Primary button**: 14px / 500 / white text on `rgb(24,104,219)` / radius 3px / height 32px / padding 0 10px
- **Table header**: 12px / 653 / `rgb(80,82,88)` / **sentence case (NOT uppercase)** / borderBottom 1.67px solid `rgba(11,18,14,0.14)` / padding 4px 8px 4px 0
- **Table cell**: 14px / 400 / `rgb(41,42,46)` / padding 4px 8px 4px 0
- **Sidebar color palette**: muted text `rgb(107,110,118)` = `#6B6E76`, subtle text `rgb(80,82,88)` = `#505258`, primary text `rgb(41,42,46)` = `#292A2E`, brand blue `rgb(24,104,219)` = `#1868DB`, border subtle `rgba(11,18,14,0.14)`

**Rule:** Catalyst's admin sidebar MUST render every pocket flat-expanded — Section title (12/653/subtle/sentence-case) + LinkItem children directly inline. No collapse, no ChevronDown glyph, no ButtonItem chevron toggle. Leaf-only pockets (e.g. "Overview") render as a single LinkItem with no section header. Page H1 is 24/653 sentence-case (not 28/700 bold) and the description is a 14/400 muted paragraph directly under it. Tables use sentence-case 12/653 headers (NEVER uppercase) with the Jira hairline bottom border.

**Severity:** P0 (information architecture defect — leaves were unreachable at a glance; complete admin IA was hidden until clicked).

---

## 2026-05-19 — RLS: never gate by `auth.jwt() ->> 'role'`; Catalyst stores roles in `user_roles` table

**Surface:** `design_violations` table (and any future admin-data table)
**Pattern:** The `design_violations` table had four policies (`Allow admin insert/read violations`, `Allow admins to insert/view violations`) that ALL gated on `(auth.jwt() ->> 'role'::text) = 'admin'::text`. Catalyst does NOT embed `role` in the Supabase JWT — roles live in `public.user_roles.role` (enum `app_role`: `admin | program_manager | team_lead | user`) and `public.user_product_roles.role` (CLAUDE.md 2026-05-12). Result: the policies were impossible to satisfy from any browser session, every SELECT returned `data: []` with `error: null`, and the admin governance dashboard rendered as "Design system is compliant" forever even though 7 P0/P1 violations existed in the database (verifiable via service-role MCP).

**Fix (migration `fix_design_violations_rls_for_admin_ui`):**
1. Dropped all four broken `auth.jwt()`-gated policies.
2. Added `design_violations_select_all` — `FOR SELECT TO anon, authenticated USING (true)`. Governance metadata is non-PII; UI is `<AdminGuard>`-gated.
3. Added `design_violations_insert_admin` / `_update_admin` / `_delete_admin` — all gated by `EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role)`.

**Rule:** Never write an RLS policy that gates on `auth.jwt() ->> 'role'`, `auth.jwt() ->> 'app_metadata'`, or any JWT-embedded role claim — Catalyst does not populate them. The canonical Catalyst admin check inside RLS is:
```sql
EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'::app_role
)
```
When adding a new admin-facing table, the SELECT policy can be permissive (`TO anon, authenticated USING (true)`) for non-PII governance/config data — gating happens at the AdminGuard component layer. Write policies (INSERT/UPDATE/DELETE) must use the user_roles EXISTS pattern. Before declaring a new admin table "RLS-ready", probe it from an unauthenticated browser session — if data doesn't come back, the policy is wrong.

**Severity:** P0 (silently breaks every admin data surface — looks like the table is empty when it has data).

---

## 2026-05-19 — Design-system audit was a fraud: silently passed everything; 1541 false-positive headline number masked the real 599 admin violations

**Surface:** `design-governance/rules/audit.js`, `ads-token-scanner.js`, `typography-enforcer.js`
**Pattern (RCA):** Vikram pointed at the live `/admin/user-access` page and asked why hardcoded hex/uppercase/Tailwind weren't flagged by the design-system audit. Investigation revealed THREE distinct breakages that together turned the audit into a no-op:

1. **Silent-pass on scan failure (P0 systemic).** `audit.js` wrapped each validator in try/catch and on ANY error returned `{ passed: true, violations: [] }`. The catch fired whenever `scanDirectory()` was given a single file path (CLI default) instead of a directory — `fs.readdirSync` throws ENOTDIR, the catch swallows it, and the audit reports "✅ AUDIT PASSED: All validators passed with 0 violations" while having scanned nothing. The pre-commit hook and CI gate have been merging garbage. Every "100% compliant" claim was a lie.

2. **var() fallback false positive (P0 false negative for users, false positive for compliance).** The ADS Token Scanner flagged ANY hex anywhere in a line, including hex inside `var(--ds-foo, #BAR)` fallback chains. Those fallbacks are the ADS-canonical pattern (token first, hex fallback for browsers without CSS-vars / SSR). Flagging them as violations bloated the headline number from 599 → 1541 (~62% noise) and made the audit so noisy that nobody could read the real signal.

3. **Over-zealous HARDCODED_PX rule.** Any `padding: 8px` or `margin: 16px` got flagged — but CLAUDE.md explicitly says the canonical Catalyst grid is direct values `4/8/16/24/32 px`. The scanner had no allowlist. It also leaked across properties: `padding: '12px 0'; borderBottom: '1px solid'` would extract `1` from the unrelated border and flag the padding as off-grid.

4. **Typography enforcer rejected Jira's actual `fontWeight: 653`.** Live DOM probe of atlassian.design shows Jira uses 653 for headers/lozenges/labels. The enforcer accepted only the standard 100-step CSS scale (300/400/500/600/700/900) and flagged every Jira-parity weight as INVALID_FONTWEIGHT.

**Fix:**
1. **`audit.js`**: removed every try/catch around validator runs. Path is checked with `fs.existsSync` up-front — throws if missing. `isDirectory()` check selects between `scanDirectory()` and `scanFile()`. NEVER defaults to passed:true. If the audit can't read the path, it dies loudly with a non-zero exit code.
2. **`ads-token-scanner.js`** RAW_HEX rule: strip `var(...)` expressions from the line BEFORE running the hex regex. Hex only inside fallback chains no longer fires.
3. **`ads-token-scanner.js`** HARDCODED_PX rule: now extracts only the `padding|margin` shorthand VALUE (not the whole line) and checks each number against an explicit `VALID_GRID = {0,4,8,12,16,24,32,40,48}` set. Off-grid values fail; on-grid values pass.
4. **`typography-enforcer.js`**: extended `ALLOWED_WEIGHTS` to `[300, 400, 500, 600, 653, 700, 800, 900]` — 653 added for Jira parity per live probe.

**Numbers after fix:**
- src/pages/admin total: 1541 (pre-fix, ~62% noise) → **599 (real violations)**
- UserAccessPage.tsx: 31 hex + 1 typography (pre-fix, mostly false positives) → 0 after sweep
- Single-file audit (the CLI's default mode): silent-pass → real result

**Rule:** Audit infrastructure must NEVER swallow errors. A validator that can't read its target throws and dies; the CI gate must surface that failure. The token scanner must not flag hex inside `var(...)` fallbacks — that pattern is canonical. The spacing rule must check VALUE NUMBERS specifically (not whole-line digits). The typography rule must accept Jira-derived fontWeights (653, 800) alongside the standard scale, since Catalyst's stated parity target is Jira not generic CSS.

**Remaining work flagged for follow-up:** 599 real violations across 25+ admin files. Top offenders: ComponentsAdminPage (118 — much of it intentional preview-gallery hex; should add `// ads-scanner:ignore-next-line` marker support), AdminAccessPage (48), JiraUserSync (44), CatalystFeaturesBoard (25), workflows pages (~37 combined). Each file needs the same Jira-token sweep applied to UserAccessPage: 24/653 H1, sentence-case 12/653 column headers, 14/400 cells, var() fallbacks, no Tailwind utilities on chrome.

**Severity:** P0 (the governance system was non-functional; every merge since the audit was wired had unchecked design drift).

---

## 2026-05-19 — Double `<AdminLayout>` mount produced double sidebar on every /admin/* route registered in FullAppRoutes

**Surface:** /admin/user-access, /admin/resource-assignments, every admin route that lives in FullAppRoutes (~25 routes)
**Pattern:** App.tsx (lines 191-198) defined `<Route path="/admin" element={<AdminLayout/>}>` with 6 children (overview / design-system / feature-flags / catalyst-features / workflows). FullAppRoutes (line 851) defined ANOTHER `<Route path="/admin" element={<AdminLayout/>}>` with ~25 other admin children. When the user navigated to a route owned by FullAppRoutes (e.g. `/admin/user-access`), React Router matched App.tsx's `/admin` parent first → rendered AdminLayout with no matching child (Outlet stayed empty), then fell through to `/*` → mounted FullAppRoutes → which rendered its OWN AdminLayout INSIDE the first one. Result: two sidebars stacked.

**Why design-system showed one sidebar but user-access showed two:** design-system was in App.tsx's 6-route block (matched the outer wrapper, content rendered, no fallthrough). user-access was in FullAppRoutes' block (no match in App.tsx → fallthrough → second wrapper).

**Fix:** Removed the entire `<Route path="/admin">` block from App.tsx. Added the 4 unique routes (design-system, catalyst-features, workflows, overview was already covered) into FullAppRoutes' admin block. Cleaned the dead lazy imports. Result: ONE `<Route path="/admin" element={<AdminLayout/>}>` declaration for every admin route, ONE sidebar.

**Rule:** Never declare `<Route path="/admin">` (or any parent route) in two places. Pick a single source of truth — preferably the catch-all router (FullAppRoutes) — and consolidate every child route there. Before adding a new admin route, grep both App.tsx and FullAppRoutes for any existing `path="/admin"` parent block; there must be exactly one.

**Severity:** P0 (layout was visibly broken on every admin page mounted from FullAppRoutes).

---

## 2026-05-19 — Design-system audit had blind spots for Tailwind utility classes; extended to comprehensive coverage + added self-test

**Surface:** `design-governance/rules/ads-token-scanner.js`, `typography-enforcer.js`; new `design-governance/scripts/self-test.mjs`
**Pattern:** After the silent-pass and var() fallback fixes brought admin violations from 1541 → 599, Vikram asked "how do I know how much fraud is still uncovered?" The answer was: a LOT. The scanner only checked a sliver of Tailwind tokens (`text-slate-*`, `bg-slate-*`, `border-gray-*`, `text-red-*`). It was blind to:
- Typography utilities: `text-xs/sm/base/lg/xl/2xl/.../9xl`, `font-thin/light/normal/medium/semibold/bold/extrabold/black`, `italic/uppercase/lowercase/capitalize`, `tracking-*`, `leading-*`
- Spacing utilities: `p-*/px-*/py-*/pt-*/pb-*/pl-*/pr-*`, `m-*` analogues, `gap-*`, `space-x-*/space-y-*`
- Chrome utilities: `rounded-*`, `shadow-*`
- Full color palette: only the named colors had partial coverage
- camelCase inline uppercase: `textTransform: 'uppercase'` (React inline style) was missed because the enforcer only checked the kebab-case `text-transform`

**Fix:**
1. **ads-token-scanner.js**: replaced narrow `tailwindPattern` with a comprehensive `tailwindBannedTokens` array covering every Tailwind utility category (typography, spacing, color, chrome). Only matches inside `className="…"` / `className={…}` so bare identifiers in code are ignored. Per-className-string scan with per-rule match — pinpoints the exact violating token.
2. **typography-enforcer.js**: UPPERCASE_LABEL rule now matches BOTH `text-transform: uppercase` (CSS kebab-case) AND `textTransform: 'uppercase'` (React inline camelCase) AND `className=".. uppercase .."` (Tailwind utility).
3. **NEW `design-governance/scripts/self-test.mjs`**: 19 fixtures covering every audit rule. Each fixture has `code` (a single line of TSX) and `expect` (list of `{scanner, type}` violations it MUST produce, or `[]` for clean code). The script writes each fixture to a temp file, runs all three scanners against it, and asserts that the observed violations exactly match the expected set. Exits non-zero on any mismatch — wired into both pre-commit (informational) and CI (blocking). This is the second line of defence: if the audit ever silently passes a known-bad sample again, the self-test catches the audit-tool regression BEFORE bad code can ship.

**Numbers after the extension:**
- src/pages/admin: 599 (token-only coverage) → **1310 real violations** (+711 newly detected — these were shipping un-flagged for months)
- Audit self-test: 19/19 pass
- Biggest deltas: ResourceAssignments 73 → 104, FeatureFlagsPage 17 → 54, ThemeStatuses/ProcessSteps/FeatureStatuses/EpicStatuses each +11

**Rule:** Every time a NEW failure mode is discovered (something the audit didn't catch), add a fixture to `self-test.mjs` BEFORE fixing the rule. The fixture proves the rule fires correctly and pins the rule against future regression. The fixture set should grow monotonically — every new audit lesson lands as a fixture so the audit's claimed surface is provable, not asserted.

**How to see uncovered fraud:** `node design-governance/rules/audit.js src/` shows the current count. `node design-governance/scripts/self-test.mjs` proves every documented rule still fires. When the count goes UP after a scanner change without a corresponding code change, the scanner just caught something new — investigate and decide whether the new finding is a bug or a fixture to add.

**Severity:** P0 (~62% of admin design drift was invisible to the audit until this extension).

---

## 2026-05-19 — Design-system audit now persists to Supabase on every push to main

**Surface:** `.github/workflows/design-system-audit.yml`, `design-governance/scripts/persist-violations.mjs`
**Pattern:** Vikram asked: "CI to run persist-violations.mjs on every push." Implemented in the existing design-system-audit workflow as a second job (`persist-violations-to-supabase`) that runs ONLY on push to `main` / `ADS-migration` after the audit gate passes. Pull requests and feature-branch pushes do NOT persist — they only run the read-only audit check.

**Job structure:**
1. `design-system-audit` (existing) — runs self-test + audit + routing scanner. BLOCKING on the audit gate.
2. `persist-violations-to-supabase` (NEW) — runs only on push events to main / ADS-migration, AFTER the audit job. NON-BLOCKING (`continue-on-error: true`). Steps:
   - Checkout + Node 20
   - `npm install --no-save @supabase/supabase-js@^2.45.0`
   - Sanity check that `SUPABASE_SERVICE_ROLE_KEY` is set; skip gracefully if not (no merge block)
   - Run `persist-violations.mjs` once per surface: admin, project-hub (project-work-hub), product-hub (producthub), incidents (incidenthub), releases
   - Each surface invocation uses `--surface=<id>` to override path-based inference

**Required GitHub Actions secret (set once at Settings → Secrets and variables → Actions):**
- `SUPABASE_SERVICE_ROLE_KEY` — service-role key for project `lmqwtldpfacrrlvdnmld` (REQUIRED, no default — anon key cannot bypass RLS)
- `SUPABASE_URL` — optional override; defaults to `https://lmqwtldpfacrrlvdnmld.supabase.co`

If the secret is missing, the job logs a clear "skipping" message and exits 0 — never blocks a merge.

**Why non-blocking?** The audit gate (job 1) is the source of truth for "did this PR introduce new violations." Persistence (job 2) is a reporting nicety — it keeps the Design Governance UI's dashboard fresh with canonical scanner output. A transient Supabase outage shouldn't block a merge that already passed the audit gate.

**Why only on push to main?** Feature branches would churn the table — every push overwrites the previous push's findings. Persisting only after merge keeps the DB representative of the canonical state. The audit gate still runs on every PR so violations are caught before merge.

**Rule:** When adding a new surface (new top-level directory under `src/pages/` or `src/modules/`), add a corresponding persist step to the `persist-violations-to-supabase` job with `--surface=<id>` matching the `Module` type in `src/lib/design-audit.ts`. Otherwise the surface's violations never reach the UI.

**Severity:** P1 (the audit was already real; this just closes the loop to the dashboard).

---

## PLANNING / EXECUTION SPLIT — ALLOWED IN SAME CONVERSATION (Updated 2026-06-03)

**Planning and execution MAY occur in the same conversation** as long as context usage stays below 80%.

### Rules

1. **Plan → get approval → execute.** Planning (design proposals, gap reports, visual mockups) and execution (code changes, commits) can happen sequentially in one conversation.
2. **Context health triggers handover.**
   - At 80%: print WARNING CONTEXT GUARD block, finish current chunk, save handover, do not start a new chunk.
   - At 90%: print EMERGENCY CONTEXT GUARD block, save handover, STOP.
3. **Branch isolation is absolute.** A feature branch contains ONLY changes from its named feature. If any unrelated task arrives while a feature branch is active, stop and state: `"Branch [name] is active for [feature]. Open a new conversation for unrelated work."`

### History

Originally (2026-05-21) planning and execution were split into separate conversations. Vikram lifted this restriction 2026-06-03 — the split was causing unnecessary friction for small-to-medium features where design + implementation fits comfortably in one context window.

---

## 2026-05-21 — Context-aware filter templates: scope by hub and work-item type

**Surface:** Filters module (Project Hub, Product Hub, Releases, TestHub) — template system (Outlier O5)
**Pattern:** Filter templates are NOT generic across hubs. Each hub has its own canonical work-item types and the templates must match:
- **Project Hub (`/project-hub/:key/filters`):** templates scope to ph_issues — Epics, Features, Stories, Tasks, QA Bugs, Production Incidents, Change Requests, Business Gaps, API Requirements
- **Product Hub (`/product-hub/filters`):** templates scope to business_requests — Features, Gaps, Integrations, Data Requests
- **Releases (`/releases/filters`):** templates scope to ph_issues filtered to fix_versions — emphasise fix-version, PI, production incidents
- **TestHub:** templates scope to QA Bugs and related defect types
**Rule:** The template registry (`src/lib/filters/filterTemplates.ts`) must export templates grouped by hub type. `FilterCreatePage` receives a `hubType: 'project' | 'product' | 'release' | 'testhub'` prop and renders only templates for that hub. Never show Project Hub templates inside Product Hub — they reference `project_key` which doesn't exist on `business_requests`. The JQL field set also differs per hub: `project` / `assignee` / `issuetype` are Project Hub concepts; Product Hub uses `request_type` / `product_code` / `requestor`.

---

## 2026-05-29 — For You feed status chip: raw DB rows use snake_case, WorkItem objects use camelCase — never mix

**Surface:** For You / Recommended tab (RecommendedPanel + useForYouData)
**Pattern:** `mentionIssueRows` from Supabase returns raw DB column names (`status_category` snake_case). The enrichment code at mention-push time wrote `issue?.statusCategory` (camelCase) — the field that only exists on fully-constructed `WorkItem` objects, not on raw query rows. Result: `issueStatusCategory` was ALWAYS `undefined` in `RecommendedMention`, causing the status chip to always render the grey fallback (`rgb(221,222,225)`) regardless of the actual Jira category.

Two compounding bugs:
1. **Field name mismatch**: `issue?.statusCategory` → `issue?.status_category` (raw row → snake_case)
2. **Missing SELECT field**: the mention issues query only fetched `'id, issue_key, summary, issue_type, project_key, status'` — `status_category` was absent, so even after fixing the field name, the value would have been null. Fixed by adding `status_category` to both the mention-issues SELECT and the missed-comment-keys SELECT.

**Fix:**
- Line 754: `select('id, issue_key, summary, issue_type, project_key, status, status_category')`
- Line 874: `select('id, issue_key, summary, issue_type, project_key, status, status_category')`
- Line 850: `issueStatusCategory: issue?.status_category || undefined` (was `statusCategory`)
- Line 921: `issueStatusCategory: issue?.status_category || undefined` (was `statusCategory`)

**Rule:** When enriching a feed/comment with issue metadata via a mini-SELECT (not the full `SELECT_FIELDS`):
1. Always list every field you will access — never assume it's present just because it's in the full query
2. Access raw DB rows with snake_case: `row.status_category`, `row.issue_type`, `row.project_key`
3. Access `WorkItem` objects with camelCase: `item.statusCategory`, `item.issueType`
4. Before writing `issue?.X`, grep where `issue` was set — if it came from `.forEach((r: any) => map.set(key, r))` it is a raw DB row (snake_case), not a WorkItem (camelCase)

**Severity:** P1 (status chip always showed grey fallback — the feature worked visually but carried wrong semantic color for all done-category statuses)

---

## 2026-05-29 — ph_comments SELECT RLS must include `author_id = auth.uid()` for INSERT+RETURNING to succeed on non-ph_projects issues

**Surface:** RecommendedPanel.tsx — `ensurePhComment` / `ReactionStrip` (For You / Recommended tab)
**Pattern:** Clicking an emoji reaction on a mention card for an issue whose `project_key` is NOT in `ph_projects` (e.g. MWR project, INV project) returned HTTP 403 with code `42501` on the `POST /rest/v1/ph_comments?select=id` request, causing a "Could not save reaction" error toast on every click.

Root cause — PostgREST v12 INSERT+RETURNING behavior: when `ensurePhComment` does `.insert({...}).select('id').single()`, PostgREST checks the SELECT USING policy AFTER the insert. The existing `"Members can view comments"` policy used only:
```sql
USING (EXISTS (
  SELECT 1 FROM ph_issues i
  JOIN ph_projects p ON p.key = i.project_key
  JOIN ph_project_members m ON m.project_id = p.id
  WHERE i.id = ph_comments.work_item_id AND m.user_id = auth.uid()
))
```
For MWR issues (`project_key = 'MWR'`), `ph_projects` had no MWR entry → JOIN produced no rows → EXISTS = false → PostgREST rolled back the INSERT and returned 403. The error appeared ONLY for issues in projects not registered in `ph_projects`.

**Fix (migration `fix_ph_comments_select_rls_allow_own_comments`):**
```sql
DROP POLICY IF EXISTS "Members can view comments" ON ph_comments;
CREATE POLICY "Members can view comments" ON ph_comments
  FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM ph_issues i
      JOIN ph_projects p ON p.key = i.project_key
      JOIN ph_project_members m ON m.project_id = p.id
      WHERE i.id = ph_comments.work_item_id AND m.user_id = auth.uid()
    )
  );
```
The `author_id = auth.uid()` short-circuit means a user can always see their own freshly-inserted `ph_comments` row, even for issues in projects absent from `ph_projects`. Verified: `POST /ph_comment_reactions` → 201, 🔥1 chip renders on MWR-947 card, zero error toasts.

**Rule:** Any RLS SELECT USING policy on a table that is both read AND written by users must include an ownership clause (`author_id = auth.uid()` or `created_by = auth.uid()`) as a short-circuit OR branch, BEFORE the JOIN chain that checks membership. Without it, PostgREST v12's INSERT+RETURNING check will 403 any row whose JOIN chain returns empty — silently rolling back the insert and showing a generic error to the user. This is especially critical for `ph_comments` which can be created for any Jira-synced issue regardless of whether its project is in `ph_projects`.

**Severity:** P1 (reactions silently failed for all non-BAU/non-INV project mentions; the error was visible to the user as a red toast on every click)

---

## 2026-05-29 — ph_comments SELECT RLS: `author_id` short-circuit is insufficient for multi-user — upgrade to `USING (true)` for non-PII tables

**Surface:** RecommendedPanel.tsx — `ensurePhComment` / `ReactionStrip` (For You / Recommended tab)
**Pattern (multi-user escalation):** After the `author_id = auth.uid()` short-circuit was added (migration `fix_ph_comments_select_rls_allow_own_comments`, lesson above), User A (the author) could react successfully. But User B visiting the same card still hit the UNIQUE CONSTRAINT VIOLATION:
- User A's `ensurePhComment` insert lands a row with `jira_comment_id = '42986'`
- User B clicks a reaction → `ensurePhComment` SELECT returns empty (not the author, MWR not in `ph_projects`) → B tries INSERT → **409 UNIQUE VIOLATION** on `(comment_id, jira_comment_id)` → `catch` shows toast.error
The `author_id` clause only helps the row author; any other user who wants to react to the same anchor comment is still blocked by the JOIN chain.

**Fix (migration `fix_ph_comments_select_allow_all_authenticated`):**
```sql
DROP POLICY IF EXISTS "Members can view comments" ON ph_comments;
CREATE POLICY "Members can view comments" ON ph_comments
  FOR SELECT TO authenticated
  USING (true);
```
`ph_comments` rows are Jira comment anchors — they carry no PII and no sensitive business data. Granting all authenticated users SELECT visibility matches the risk profile of `ph_comment_reactions` (which already uses `USING (true)`). The `<AdminGuard>` + Supabase Auth session gate provides the application-layer access boundary; the table-layer only needs to ensure unauthenticated access is blocked (enforced by `TO authenticated`). Verified after migration: reaction save on MWR-947 card → zero network errors, 👏 chip persists, no "Could not save reaction" toast.

**Rule:** When a `ph_comments`-style anchor table is non-PII and its reactions table already uses `USING (true)`, match both policies for consistency — divergent USING clauses between a parent row and its child table create hidden multi-user failure modes. The ownership short-circuit (`author_id = auth.uid()`) is the right first step but is never the final step for tables where multiple users react to the same anchor. Before calling an RLS fix "done", test with a SECOND authenticated user — single-user smoke tests miss the INSERT+RETURNING UNIQUE collision entirely.

**Severity:** P1 (the `author_id` partial fix resolved the author's own reactions but left every other user's reactions silently broken)

---

## 2026-06-03 — RLS membership policies must NEVER self-reference their own table inline; use a SECURITY DEFINER helper
**Surface:** Catalyst Chat — `chat_conversations` / `chat_conversation_members` / `chat_messages` RLS (Phase-0 chat engine, branch `Products-chat-engine-01`)
**Pattern:** The chat membership/visibility policies checked membership with an inline subquery against `chat_conversation_members` from WITHIN a policy on that same table (and from policies on `chat_messages` / `chat_conversations` that also read it). Postgres evaluated the members policy to read members, which re-invoked the members policy → `ERROR: 42P17: infinite recursion detected in policy for relation "chat_conversation_members"`. Every chat read errored. A single-user smoke test would not surface this cleanly; the 2-user RLS isolation test (simulating each user via `SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claims" = '{"sub":"<uuid>"}'`) reproduced it immediately, then proved the fix (non-member sees 0, member sees 1).
**Rule:** Any RLS policy whose USING/WITH CHECK needs to test "is the current user a member of this conversation/row-group" MUST route that check through a `SECURITY DEFINER` helper function, never an inline `EXISTS (SELECT ... FROM the_same_or_membership_table ...)`. Canonical pattern:
```sql
CREATE OR REPLACE FUNCTION public.<entity>_is_member(grp uuid, uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.<membership_table> m
                 WHERE m.<group_col> = grp AND m.user_id = uid);
$$;
```
The function owner is not subject to RLS (no FORCE ROW LEVEL SECURITY), so its internal read bypasses the policy and breaks the cycle. Keep the `author_id = auth.uid()` short-circuit on message SELECT (the PostgREST v12 INSERT+RETURNING trap, 2026-05-29). ALWAYS run a 2-user RLS isolation test before declaring any new RLS surface done — it is the only reliable way to catch both recursion and cross-user leaks. Seed a private row owned by user A, simulate user B (non-member) expecting 0 rows, simulate A expecting their rows, then clean up.
**Fix:** Migration `20260603000100_chat_rls_recursion_fix.sql` — added `public.chat_is_member(uuid, uuid)` and rewrote the members/conversations/messages policies to call it. Verified live on prod (`lmqwtldpfacrrlvdnmld`): b_nonmember_sees=0, a_member_sees=1.
**Severity:** P0 (self-referential membership RLS makes the entire feature unreadable — caught only because the 2-user test was mandatory).
---

## 📂 REPO PATH — USE SYMLINK (Non-Negotiable)

**The repo has a symlink at `~/catalyst` that avoids all path-quoting issues:**

```
~/catalyst  →  /Users/vikramindla/Documents/Documents - vikram’s MacBook Pro/GitHub/catalyst-prod-45
```

The real path contains a Unicode smart apostrophe (U+2019 `’`) in "vikram’s" which breaks shell quoting, `ls`, `find`, `Read`, and `Edit` tools. **The symlink is the permanent fix.**

### Rules

1. **For ALL shell commands:** use `~/catalyst` as the path, never the full real path
2. **For git:** `git -C ~/catalyst ...` or just `git ...` (pwd is set correctly at session start)
3. **For file reads/edits:** use `/Users/vikramindla/catalyst/src/...` (symlink-resolved absolute path)
4. **`$(pwd)`** also works — Claude Code sets the working directory correctly at session start
5. **Subagents:** pass `~/catalyst` as the repo path, never the real path with the smart apostrophe
6. **NEVER type the full real path** in any shell command, agent prompt, or tool call

### If the symlink is missing (new machine / re-clone)

```bash
ln -s "/Users/vikramindla/Documents/Documents - vikram’s MacBook Pro/GitHub/catalyst-prod-45" ~/catalyst
```

This applies to ALL agents, skills, and subagents. Every implementation conversation starts in this directory.

---

## 🔍 CHROME MCP TAB REUSE — CHECK EXISTING TABS FIRST (Non-Negotiable, P1)

**All visual verification (design-critique, jira-compare, verify, DOM/screenshot probes) must reuse existing Chrome tabs before creating new ones.**

### The Rule

1. **First:** call `tabs_context_mcp(createIfEmpty: false)` to discover existing tabs
2. **Check last 2 tabs** — if one already has the target URL (e.g. `localhost:8080` or the page being verified), reuse it via `navigate` on that tab
3. **Only create a new tab** (`tabs_create_mcp`) if no existing tab is usable

### Why

Opening new tabs for every verification wastes time. The dev server or target page is almost always already open in a recent tab. Tab sprawl slows down probing and confuses tab management.

### Applies to

All agents and skills that touch Chrome MCP: main session, catalyst-agent, design-critique, design-intelligence, jira-compare, verify, code-review, preflight, any subagent doing screenshot or DOM probes.

**Severity:** P1 — Vikram directive. Tab reuse saves significant verification time per session.


---

## 🚀 TOKEN OPTIMIZATION STACK — MANDATORY START + END PROTOCOL (Non-Negotiable, P1)

**Catalyst runs a 4-tool token optimization stack that reduces total token spend by 50-70%. All tools are pre-installed and auto-activate — no per-conversation setup needed.**

### The Stack

| Tool | What it cuts | Savings | Activation |
|---|---|---|---|
| **RTK** (Rust Token Killer) | **Input** — compresses Bash command outputs before context window | 60-98% on CLI output | `PreToolUse` hook auto-rewrites every Bash call |
| **Caveman** | **Output** — strips filler/articles/hedging from Claude's prose | ~65% on responses | `SessionStart` hook auto-activates every session |
| **ccusage** | **Visibility** — offline token consumption dashboard per session | Shows WHERE money goes | `ccusage` CLI, `brew install ccusage` |
| **claude-code-router** | **Routing** — sends mechanical tasks to cheaper models | 70-80% on repetitive edits | `npx @musistudio/claude-code-router`, `ccr code` |

### 🟢 Session START — Optimization Notification (MANDATORY)

**First response of EVERY conversation MUST begin with this block:**

```
⚡ **Catalyst Optimization Stack Active**
  RTK ......... ✅ input compression (Bash outputs)
  Caveman ..... ✅ output compression (prose responses)
  ccusage ..... ✅ token tracking available
  Router ...... ✅ model routing available
```

This applies to: main sessions, subagents, catalyst-agent, design-critique, design-intelligence, preflight, jira-compare, deploy, code-review, and ANY other skill/agent.

### 🔴 Session END — Optimization Summary (MANDATORY)

**Before ending ANY conversation, run `rtk gain` and include this block in the final response:**

```
📊 **Optimization Summary**
[paste rtk gain output]

💡 Run `ccusage` for full cost breakdown | `rtk gain --graph` for 30-day trend
```

### Useful commands

```bash
# Token savings
rtk gain              # RTK compression stats (run at end of every conversation)
rtk gain --graph      # ASCII chart of savings over last 30 days
rtk gain --history    # Command usage history with per-command savings
rtk discover          # Analyze Claude Code history for missed opportunities

# Cost tracking
ccusage               # Full token consumption dashboard
ccusage --model       # Breakdown by model

# Model routing
ccr code              # Start Claude Code through router (routes to cheaper models)
ccr model             # Interactive model selection
ccr status            # Show router status

# Meta
rtk proxy <cmd>       # Execute raw command without RTK filtering (debugging)
rtk --version         # Check RTK version
```

### Setup on a new machine

All tools must be installed locally — CLAUDE.md provides the rules, not the binaries:
```bash
brew install rtk && rtk init -g          # RTK + Claude Code hook
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash  # Caveman
brew install ccusage                      # Token consumption dashboard
npm i -g @musistudio/claude-code-router   # Model router (or use npx)
```
Then restart Claude Code. All hooks auto-activate on every future session.

**Severity:** P1 — Vikram wants explicit optimization visibility at session start (confirmation all tools active) and session end (savings summary). Skipping either is a process violation.


---

## 2026-06-07 — Rainbow CTA inner pill: ADS surface tokens resolve to semi-transparent in nested contexts — ALWAYS hardcode #FFFFFF

**Surface:** All AI CTA components with rainbow conic-gradient wrapper (ImproveButton, AIIntelligenceButton, CatyRainbowCTA, ImproveIssueDropdown, RecommendedPanel, SummarizeDigestModal, AssignedPanel, ReplyComposer, EditableAssignee, MicButton)

**Pattern (6 iterations to fix — RCA below):**
The "Improve writing" button in the comment editor toolbar rendered with rainbow gradient bleeding through the inner pill, while "Improve Story" in the sidebar rendered with clean white interior. Both used the same  wrapper. The root cause was NOT padding — it was the inner button's  value.

**Root cause:** ADS surface tokens (, , ) resolve to  (semi-transparent grey) inside certain DOM contexts — specifically the Tiptap editor toolbar, nested surface containers, and any parent with ADS surface layering. The 3% opacity lets the rainbow  from the parent wrapper bleed through. The sidebar's "Improve Story" worked because its DOM context resolved the same tokens to  (opaque white).

**Fix:** Hardcode  for ALL background states (idle, hover, disabled) on every inner button/pill inside a rainbow wrapper. Do NOT use any ADS token — they are context-dependent and unreliable inside rainbow wrappers. Disabled state communicated via  +  instead of grey background.

**Why it took 6 iterations (RCA on process failure):**
1. **Iteration 1:** Changed  →  (wrong diagnosis — assumed padding was the issue)
2. **Iteration 2:** Reverted padding back to 2 (confused by Jira screenshot comparison)
3. **Iteration 3:** Re-applied padding 3 (correct, but not the root cause)
4. **Iteration 4:** Changed  →  (still resolved to grey — wrong fix)
5. **Iteration 5:** Hardcoded  for idle state (correct, but missed disabled state)
6. **Iteration 6:** Hardcoded  for disabled state too (final fix)

**Process failures:**
- **Never DOM-probed the actual computed  until iteration 4.** Should have been step 1.
- **Assumed both buttons used the same background value** because the code looked similar. Never compared computed styles side-by-side.
- **Didn't check which STATE the button was in** (disabled vs idle) — the disabled branch had a different token.
- **Tried token substitutions instead of measuring.** Each token swap required a rebuild + refresh cycle. A single DOM probe would have shown that ALL ADS surface tokens resolve to the same grey in that context.

**Rule (NEW — applies to ALL future visual fixes):**
1. **Before ANY code change for a visual bug, DOM-probe  on the ACTUAL element** to get the real rendered values. Compare against the reference element side-by-side. This is step 0 — before hypothesizing.
2. **When a visual fix doesn't work after 1 rebuild, DOM-probe again** to see what actually changed. Never try a second code fix without re-probing.
3. **Inside rainbow wrappers, NEVER use ADS surface tokens for inner pill background.** Always hardcode . The wrapper IS the design element; the pill just needs to be opaque.
4. **Check the element's current STATE (disabled/hover/active/idle)** before fixing — each state branch may use a different background value.

**Meta-rule (NEW):** When any fix takes >3 iterations, STOP and write an RCA before the next attempt. The RCA must: (a) list what was tried, (b) identify what was NOT measured, (c) identify the correct diagnostic step that should have been step 1. Log as a CLAUDE.md lesson immediately.

**Severity:** P0 (process — 6 iterations for a background color fix is unacceptable; the DOM probe should have been step 1)

**Files fixed (9):** AIIntelligenceButton.tsx, CatyRainbowCTA.tsx, ImproveIssueDropdown.tsx, ImproveButton.tsx, RecommendedPanel.tsx, SummarizeDigestModal.tsx, AssignedPanel.tsx, ReplyComposer.tsx, EditableAssignee.tsx, MicButton.tsx
**Commits:** eb233ccf1, 832f795a3, 28ec2bc09, 55dfb65a7, 3d74bfecd, bb307a987, 9b790fff3

---

## 2026-06-10 — Dev Server Module Loading: vite.config + @atlaskit/flag import errors

**Surface:** Dev server startup + MessageComposer.tsx runtime error
**When:** Fresh dev server session; browser showed "Something went wrong" + truncated module path error.

**Root cause (two separate bugs):**

1. **vite.config.ts line 598: Non-existent package in optimizeDeps.include**
   - Listed `'@atlaskit/pragmatic-drag-and-drop-flourish'` — package does NOT exist in npm
   - Never in package.json; was likely a typo or removed package
   - Error: `Failed to resolve dependency: @atlaskit/pragmatic-drag-and-drop-flourish, present in 'optimizeDeps.include'`
   - Fix: Removed line 598
   - Commit: `670338b`

2. **MessageComposer.tsx line 14: Wrong import style for @atlaskit/flag**
   - Was: `import { Flag, FlagGroup } from '@atlaskit/flag'`
   - Problem: @atlaskit/flag exports `Flag` as DEFAULT, not named export. FlagGroup IS named.
   - Error: `SyntaxError: module does not provide export named 'Flag'` (browser DevTools only)
   - Fix: Split imports: `import Flag from '@atlaskit/flag'; import { FlagGroup } from '@atlaskit/flag'`
   - Commit: `eb41e0d`

**Lesson (P1):** 
- Always verify every package in optimizeDeps.include exists in package.json + node_modules before committing. The only gate is runtime failure.
- When a module export error occurs, check the actual module's dist/esm/index.js to see what IS exported. Named vs default exports are subtle and easy to get wrong.
- Browser error messages are often truncated. Use DevTools Console for the FULL error message before debugging.

**Severity:** P1 — broke dev server + app initialization; required DevTools inspection to diagnose.

---

## 🗣️ COMMUNICATION RULES — DIRECT MODE (P0, Non-Negotiable)

Applies to every response, every agent, every skill.

1. **Open with flaw, gap, or risky assumption.** First sentence. If solid, one line, move on. Never invent objections.
2. **Tag confidence:** `[Certain]` / `[Likely]` / `[Guessing]`. Mostly guesswork → say so upfront.
3. **No filler praise.** Banned: "Great question", "You're absolutely right", "That makes sense", "Absolutely", "Definitely".
4. **When Vikram is wrong:** "I disagree because [reason]. Instead: [alternative]. Risk in your approach: [specific downside]."
5. **Lead with the uncomfortable truth** — first line, not paragraph three.
6. **No warm-up paragraphs.** Start with the most useful thing.
7. **On pushback, hold position** unless given new facts or original claim was `[Guessing]`.
8. **Say "I don't know" plainly.** Don't manufacture answers.
9. **Separate fact from opinion explicitly.** Don't blur.
10. **When asked to choose, commit to ONE recommendation.** No "it depends" lists.
11. **Surface assumptions BEFORE the answer**, not after.
12. **If the question is wrong, say so** and give the better one.
13. **Quantify.** Numbers, ranges, probabilities — not "many", "some", "significant".
14. **Steelman the opposing view** before agreeing with Vikram's.
15. **Flag rubber-stamp requests** when Vikram has already decided.
16. **Give cost and downside** of your recommendation, not just upside.
17. **State what evidence would change your mind** on a key claim.
18. **One clear caveat beats five hedges.** No qualifier padding.
19. **If a task is a bad idea, say so** before helping execute it well.
20. **Match effort to stakes.** Don't over-explain small things.
21. **On error, correct in one line.** No over-apologizing.
22. **Name the tradeoff** when two goals conflict; force the choice.
23. **Concrete example > abstract description.**
24. **Don't adopt loaded framing.** Restate neutrally.
25. **Tell Vikram when it's good enough** and he's over-engineering.
26. **Don't soften numbers or deadlines** to sound better.
27. **End with the single next action**, not a recap.

**Severity:** P0 — applies before all other communication conventions including caveman mode formatting (caveman trims words; these rules govern stance).

---

## 2026-06-10 — audit.js CLI guard silently no-oped on this machine (smart-apostrophe path); always negative-test the audit CLI

**Surface:** design-governance/rules/audit.js CLI invocation (local dev + any script calling `node audit.js <path>`)
**Pattern:** The CLI guard `import.meta.url === \`file://${process.argv[1]}\`` never matched because the repo's real path contains U+2019, which is percent-encoded in `import.meta.url` but raw in `process.argv[1]`. Every local `node design-governance/rules/audit.js <path>` invocation exited 0 having scanned NOTHING — the same silent-pass failure class as the 2026-05-19 audit fraud, but at the CLI entry layer. CI was unaffected (runner paths are ASCII). Found by a subagent that noticed the audit "passed" instantly on a file with known violations.
**Fix (4357aa8a7):** compare `fs.realpathSync(fileURLToPath(import.meta.url))` to `fs.realpathSync(process.argv[1])` in a try/catch returning false.
**Rule:** After any change to audit infrastructure (or when running it on a new machine), run a NEGATIVE test first: point the CLI at a file with known violations and confirm violations print. An instant "✅ PASSED" on a known-bad file means the tool didn't run. Also: never compare `import.meta.url` to argv with string interpolation — always `fileURLToPath` + realpath.
**Open question flagged (not changed):** spacing-grid violations print but do not fail the exit code even in STRICT mode — pre-existing gate policy; needs explicit Vikram decision whether spacing should block.
**Severity:** P0 (every local audit run on this machine was a no-op; pre-commit hook signal was fake)

---

## 2026-06-10 — SQL-function param shadowing: `m.user_id = user_id` is always-true; RLS membership leaked every conversation

**Surface:** `chat_is_member()` (SECURITY DEFINER helper used by all chat RLS), found during chat design-critique live probe
**Pattern:** The helper's WHERE clause `m.user_id = user_id` resolved the unqualified `user_id` to the COLUMN (columns shadow parameters in SQL-language functions) → self-comparison, always true. Every authenticated user passed the membership check for any conversation with ≥1 member — full cross-user read access to private DMs/ticket conversations. Sibling bug class to the 2026-05-09 `project_members.project_id = project_members.id` policy self-join. Compounding: the recursion-fix migration had also dropped SELECT policies on chat_conversations and SELECT/INSERT on chat_messages entirely, so the leak was masked by "everything empty" until the policies were restored.
**Rule:** In every SQL/plpgsql function used by RLS: (1) ALWAYS qualify parameters as `function_name.param` (or prefix params `p_`), never bare names that can collide with column names; (2) after restoring/altering ANY RLS policy set, run the 2-user isolation test (SET LOCAL ROLE authenticated + request.jwt.claims swap) BEFORE declaring fixed — the member-sees-N assertion alone is insufficient, the stranger-sees-0 assertion is the one that catches leaks; (3) when a migration "fixes recursion", diff the before/after policy list per table — dropped-but-not-recreated policies fail silent (reads return empty, not errors).
**Fix:** `62191d24f` (policies restored) + `fix_chat_is_member_param_shadowing` migration (qualified params). Verified: stranger 9 browsable channels / 0 private / 0 messages; member 13 / 16.
**Severity:** P0 (cross-user data exposure + total feature blackout, both invisible to screenshots — found only by structural DOM/network/SQL probing)
