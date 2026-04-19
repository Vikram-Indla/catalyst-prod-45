# Story View — Phase 2 Unification Spec (Atlaskit)

**Date:** 2026-04-19
**Owner:** Vikram (Delivery Manager / Senior UX Engineer)
**Status:** Draft — ready for execution
**Source of truth:** Jira Cloud issue view, walked live on BAU-5342 (18 April 2026)
**Design system:** Atlassian Design System / Atlaskit — `@atlaskit/*` ADF components ONLY, no shadcn on migrated surfaces, no bespoke clones
**Horizon:** 5-year maintenance lifetime. Decisions in this document are optimised for long-term maintainability, version-bump safety, accessibility durability, and testability — not for short-term delivery speed.

---

## 0 · Executive Framing

This spec replaces Catalyst's hand-rolled Story View right-rail, pickers, tables, composers, and modals with Atlassian Design System primitives so that the Story View matches the canonical Jira issue view byte-for-byte on every interactive state.

**Three things this spec explicitly descopes:**

1. **All AI / Rovo affordances** — `Improve Story`, `Improve description`, `Improve writing`, `Explain workflow`, `Create suggested work items`, `Link similar work items`. These are out of scope for Phase 2. They will return in a later phase behind a feature flag and will be additive — never a blocker for the base Atlaskit migration.
2. **All shortcuts.** No "temporary" hardcoded hex, no "we'll clean this up later" shims, no mixed design-system usage on a single surface, no copy-pasted Atlaskit internals. Every migrated surface ships production-ready, token-only, tested, and documented.
3. **Jira-only niceties that aren't part of our product** — Development panel, Automation accordion, Configure admin link, MDT Ref custom field, workflow-diagram viewer.

**Five-year durability posture:**

- A **thin Atlaskit wrapper layer** (`src/components/ads/*`) so Atlaskit major version bumps localise their blast radius to one directory.
- A **theme-bridge layer** (`src/theme/ads/*`) that maps Atlaskit tokens to Catalyst's existing `--cp-*` and NOCTURNE dark-mode tokens, so we can upgrade `@atlaskit/tokens` without changing call sites.
- **ESLint import guardrails** preventing shadcn imports on migrated surfaces, preventing raw `@atlaskit/*` imports in consumer code (must go through the wrapper), and preventing hardcoded hex.
- **Playwright visual-regression and interaction tests** for every migrated surface, in both light and NOCTURNE dark modes, run on every PR.
- **Axe-core accessibility CI** on every migrated surface; WCAG 2.1 AA is a CI gate, not a review checklist.
- **Storybook entries** for every wrapper component, every surface, every interactive state, in both themes.
- **Contract tests** on the public API of wrapper components, so an Atlaskit breaking change surfaces as a failed unit test, not a runtime regression.
- **A frozen snapshot of Atlaskit versions** with monthly dependency-upgrade dispatch, each upgrade shipped as a single reviewable PR.

The point is not just "swap the components." It's to put Catalyst's most-used surface on a foundation that stays current with Atlassian's design system for the next five years without needing another ground-up rewrite.

---

## 1 · Scope

### In scope (Phase 2)

Nine surfaces of the Story View, each captured live in the Jira walkthrough:

1. **Breadcrumb + issue-nav header** — back, add-parent chip, issue-type icon + key, prev/next issue arrows
2. **Status button + workflow-transitions popover** (main issue)
3. **Right-rail `Details` section** — stacked layout, pinned-field pattern, empty-state hover affordance
4. **Pickers** — Assignee, Reporter, Fix versions, Labels, Priority, link-type
5. **Subtasks table** — inline-add with custom-type picker, row-level status picker, `⋯` menu (Hide done / Bulk edit / View in search), progress bar, dynamic table
6. **Linked work items** — inline add + `Create linked work item` modal with minimise/expand chrome
7. **Description editor + Comment composer** — shared toolbar, stacked save/cancel, mention picker, visibility toggle
8. **Activity tabs** — All / Comments / History / Work log / SLA History / Timepiece
9. **Cross-cutting** — empty-state hover affordance, InlineEdit save/cancel pattern, icon chrome, tooltips

### Out of scope (deferred)

- AI / Rovo affordances (full list above)
- Bulk-edit drawer (Phase 3)
- Workflow diagram viewer (Phase 3)
- Admin surfaces for configuring link-types, child-issue-types, pinned-field defaults (Phase 3)
- Jira Development panel (not applicable to Catalyst)
- Automation accordion (Catalyst has its own surface)
- Configure admin link (not applicable)
- MDT Ref custom field (per user instruction)

### Absolute guardrails

1. **`@atlaskit/*` only** on migrated surfaces. No shadcn on the same surface. No hand-rolled clones of `Select`, `Lozenge`, `Modal`, `UserPicker`, `Tag`, `InlineEdit`, `EditorCore`, `DropdownMenu`, `Breadcrumbs`, `PageHeader`, `DynamicTable`, `Tabs`.
2. **Wiring preserved.** Supabase reads, TanStack Query keys, `ph_issues` / `ph_issue_links` / `jira_sync_comments` / `jira_sync_changelog` / `jira_write_back_queue` mutations must not change behaviour.
3. **All Catalyst hubs keep working.** No regressions in Kanban, Backlog, List, All work, ForYou, Incident analytics, Execution workbench — all route through `CatalystDetailRouter`.
4. **Hex literals only** in inline contexts; never HSL (CLAUDE.md §3 L38). Atlaskit token values are consumed via tokens, not literals.
5. **StatusLozenge 3-colour guardrail preserved** (CLAUDE.md §5).
6. **NOCTURNE dark mode parity.** Every migrated surface passes the computed-background check.
7. **No regressions in Lovable Failure Prevention (FP-001..010, CLAUDE.md §13).**
8. **One design system per surface.** Mid-migration surfaces are forbidden. A surface is either fully shadcn (pre-migration) or fully Atlaskit (post-migration). No hybrids.

---

## 2 · Architecture — The Wrapper Layer

The single most important architectural decision in this spec is that Catalyst does not consume `@atlaskit/*` packages directly. It consumes them through a thin wrapper layer at `src/components/ads/*` (ADS = Atlassian Design System). This is a deliberate insurance policy against Atlaskit's known churn (major version bumps every 6–12 months, several packages deprecated each year).

### 2.1 · Structure

```
src/
  components/
    ads/
      Button/
        Button.tsx              # wraps @atlaskit/button
        Button.stories.tsx
        Button.test.tsx
        Button.types.ts
        index.ts
      Select/
        Select.tsx              # wraps @atlaskit/select
        GroupedSelect.tsx       # grouped-options variant
        AsyncSelect.tsx         # paginated async variant
        ...
      UserPicker/
      Modal/
      Tag/
      Lozenge/
      DropdownMenu/
      InlineEdit/
      EditorCore/
      Breadcrumbs/
      Textfield/
      Tooltip/
      DynamicTable/
      PageHeader/
      Tabs/
      Popup/
      Toggle/
      Checkbox/
      Avatar/
      ProgressBar/
      Form/
      Icon/
      index.ts                  # single barrel, app imports only from here
```

### 2.2 · Wrapper contract

Each wrapper exports a component whose props are a **stable Catalyst-owned interface**, not a pass-through of Atlaskit props. This is the crucial constraint — when Atlaskit changes a prop name, renames an appearance, or deprecates a variant, the change is absorbed inside the wrapper; call-site code remains stable.

Example — `src/components/ads/Button/Button.types.ts`:

```ts
export type ButtonAppearance =
  | 'primary'
  | 'default'
  | 'subtle'
  | 'link'
  | 'warning'
  | 'danger';

export interface ButtonProps {
  appearance?: ButtonAppearance;
  isDisabled?: boolean;
  isLoading?: boolean;
  iconBefore?: React.ReactNode;
  iconAfter?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  testId?: string;
  'aria-label'?: string;
}
```

If `@atlaskit/button` v20 renames `appearance="link"` to `appearance="text"`, the change happens once inside `Button.tsx` — consumers never learn about it.

### 2.3 · Import guardrails (ESLint)

A custom ESLint rule enforces:

- **Outside `src/components/ads/**`**: imports from `@atlaskit/*` are forbidden — use the ADS wrapper.
- **Inside `src/components/ads/**`**: imports from `@catalyst/*` (shadcn shims) are forbidden.
- **On migrated surfaces** (tracked via a `.ads-migrated` manifest file): imports from `@/components/ui/*` (shadcn primitives) are forbidden.
- **Hardcoded hex** (`#[0-9A-Fa-f]{3,8}`) in `style={{...}}` or Tailwind arbitrary values (`bg-[#...]`) is forbidden on migrated surfaces — must use `@atlaskit/tokens` (see §3).

Config file: `.eslintrc.ads.cjs` (extends base config, turned on per-surface via overrides).

### 2.4 · Package adoption protocol

Follows CLAUDE.md §1 protocol verbatim:

1. Add `@atlaskit/<pkg>` to `package.json` dependencies.
2. Add to `vite.config.ts` → `optimizeDeps.include`.
3. Build the wrapper inside `src/components/ads/<Pkg>/`.
4. Publish a Storybook entry covering: default · hover · focus · disabled · loading · dark mode · small and large variants.
5. Add the wrapper to the ADS barrel `src/components/ads/index.ts`.
6. Write the wrapper's own unit tests (API + dark mode + a11y).
7. Run `npm run dev` — the sync-deps script handles `bun install` as needed.

### 2.5 · Atlaskit packages consumed (Phase 2)

| Package | Target version | Wrapper | Consumer surfaces |
|---|---|---|---|
| `@atlaskit/button` | `^18.x` | `ads/Button` | All primary/secondary buttons |
| `@atlaskit/modal-dialog` | `^12.x` | `ads/Modal` | Create linked work item modal |
| `@atlaskit/select` | `^18.x` | `ads/Select`, `ads/Select/Grouped` | All pickers (Reporter, Labels, Fix versions, Link-type) |
| `@atlaskit/user-picker` | `^11.x` | `ads/UserPicker` | Assignee, Reporter |
| `@atlaskit/tag` | `^12.x` | `ads/Tag` | Labels rendered as coloured chips |
| `@atlaskit/lozenge` | `^11.x` | `ads/Lozenge` | Status lozenge |
| `@atlaskit/dropdown-menu` | `^12.x` | `ads/DropdownMenu` | Subtasks `⋯`, action menus |
| `@atlaskit/inline-edit` | `^12.x` | `ads/InlineEdit` | Summary, text fields |
| `@atlaskit/editor-core` | `^180.x` | `ads/Editor` | Description + Comment composer |
| `@atlaskit/editor-common` | `^85.x` | `ads/Editor` | Shared editor types |
| `@atlaskit/breadcrumbs` | `^11.x` | `ads/Breadcrumbs` | Issue header breadcrumb |
| `@atlaskit/textfield` | `^6.x` | `ads/Textfield` | Inline-add inputs, search fields |
| `@atlaskit/tooltip` | `^18.x` | `ads/Tooltip` | Icon chrome, truncation |
| `@atlaskit/dynamic-table` | `^14.x` | `ads/DynamicTable` | Subtasks + Linked items tables |
| `@atlaskit/page-header` | `^12.x` | `ads/PageHeader` | Story View header |
| `@atlaskit/tabs` | `^14.x` | `ads/Tabs` | Activity tabs |
| `@atlaskit/popup` | `^2.x` | `ads/Popup` | Picker popovers, row-level actions |
| `@atlaskit/toggle` | `^13.x` | `ads/Toggle` | Comment visibility |
| `@atlaskit/checkbox` | `^15.x` | `ads/Checkbox` | Hide-done, Create-another |
| `@atlaskit/avatar` | `^22.x` | `ads/Avatar` | Users in rows/cells/composer |
| `@atlaskit/progress-bar` | `^0.x` | `ads/ProgressBar` | Subtasks progress |
| `@atlaskit/form` | `^9.x` | `ads/Form` | Modal forms |
| `@atlaskit/tokens` | `^2.x` | — | Consumed via theme-bridge only |
| `@atlaskit/icon` | `^22.x` | `ads/Icon` | UI chrome glyphs |
| `@atlaskit/icon-priority` | `^15.x` | `ads/Icon/Priority` | Priority glyphs |

Work-item-type icons remain the Catalyst canonical SVGs (CLAUDE.md §11). `@atlaskit/icon-object` is NOT used for work item types.

---

## 3 · Theme — The Token Bridge

Atlaskit's design tokens (`@atlaskit/tokens`) use CSS custom properties with names like `--ds-surface`, `--ds-text-subtle`, `--ds-border`. Catalyst's existing tokens use names like `--cp-bg-surface`, `--cp-text-secondary` (CLAUDE.md §4), and NOCTURNE dark mode uses a separate palette (CLAUDE.md §3, §18).

Rather than force consumers to pick one or the other, the theme bridge provides **one canonical alias layer** that both sides feed into.

### 3.1 · Structure

```
src/theme/
  ads/
    tokens.ts                  # the alias layer
    light.css                  # :root { --cp-* : var(--ds-*) ; }
    dark.css                   # .dark { --cp-* : <NOCTURNE hex> ; }
    bridge.ts                  # runtime utilities (getToken, getDarkToken)
    atlaskit-mapping.ts        # @atlaskit/tokens <-> --cp-* mapping
  index.ts
```

### 3.2 · Mapping principles

- Every semantic role has ONE canonical `--cp-*` token (e.g. `--cp-bg-surface`, `--cp-text-primary`).
- Light mode maps `--cp-*` → Atlaskit's current tokens (`var(--ds-surface)`).
- Dark mode (NOCTURNE) maps `--cp-*` → the literal NOCTURNE hex values (CLAUDE.md §18).
- Wrappers consume `--cp-*` exclusively — never `--ds-*` directly, never hex.
- Shadcn surfaces (pre-migration) continue consuming `--cp-*` as today. The bridge is invisible to them.

### 3.3 · Version-bump isolation

When `@atlaskit/tokens` v3 ships (with e.g. renamed or reshuffled tokens), only `atlaskit-mapping.ts` needs to change. The `--cp-*` surface contract is stable. This is the whole reason the bridge exists.

### 3.4 · NOCTURNE parity

After every Phase 2 surface migration, the dark-mode computed-background check must pass (CLAUDE.md §3 L37). The bridge guarantees this because `.dark` mode overrides `--cp-bg-surface` to `#1A1A1A` via CSS custom-property cascade, and every Atlaskit wrapper consumes that token.

### 3.5 · Forbidden patterns (lint-enforced)

- Reading `var(--ds-*)` outside the bridge.
- Writing hex literals in migrated surfaces' styles.
- Using Tailwind arbitrary values like `bg-[#1A1A1A]` on migrated surfaces.
- Calling `useToken()` from `@atlaskit/tokens` directly in a consumer — must come from `bridge.ts`.

---

## 4 · Surface-by-Surface Spec

Each section: **Jira anatomy → Catalyst today → Phase 2 target → Wrapper components → Acceptance criteria → Files to touch → Files NOT to touch**. Every surface's acceptance criteria are binary (checkbox-passable) and testable.

### 4.1 · Breadcrumb + Issue Nav Header

**Jira anatomy**
- `‹ Back` link-button (chevron + label)
- `✎ Add parent` chip → opens parent-picker popover (only when `parent_id` is null)
- `/` thin separator
- Work-item-type canonical SVG + issue key (clickable: opens issue / copies link)
- `∧ ∨` prev/next issue arrows driven by current filter cursor

**Catalyst today**
- `TicketBreadcrumbs.tsx` renders Back + issue-type icon + key
- Missing `Add parent` chip
- Missing prev/next arrows

**Phase 2 target**
- `ads/Breadcrumbs` wrapping `@atlaskit/breadcrumbs`
- Items: `[Back, (optional Parent link), Current key]`
- `AddParentPicker` chip rendered via `ads/Popup` + `ads/Select` when `parent_id IS NULL`
- Prev/next arrows use `ads/Button` (appearance="subtle") + `ads/Icon` with chevron glyphs

**Wrappers consumed**: `Breadcrumbs`, `Button`, `Popup`, `Select`, `Icon`, `Tooltip`.

**Acceptance criteria**
- [ ] `‹ Back` honours the `from` query param — falls back to `navigate(-1)` only if `from` is absent
- [ ] Work-item-type icon uses the canonical SVG (CLAUDE.md §11), never Atlaskit icons
- [ ] `Add parent` chip appears iff `parent_id IS NULL` and user has edit permission
- [ ] `∧` / `∨` paginate through current `globalSearchStore` cursor; disabled at head / tail
- [ ] Breadcrumb renders in `fullPageMode` AND `modal` mode; in `modal` mode only the key and actions are visible (no Back chip)
- [ ] Keyboard: `Alt+Left` = Back, `J` = prev, `K` = next (Jira-parity shortcuts)
- [ ] Passes axe-core: no a11y violations
- [ ] Visual regression snapshots pass in both themes

**Files to touch**
- `src/components/catalyst-detail-views/shared/TicketBreadcrumbs.tsx` (rewrite)
- `src/components/catalyst-detail-views/shared/AddParentPicker.tsx` (wire-up)
- `src/store/globalSearchStore.ts` (cursor helpers: `getPrevItemId`, `getNextItemId`)
- `src/components/catalyst-detail-views/shared/keyboard/useBreadcrumbKeys.ts` (new)

**Files NOT to touch**
- Any hub page (Kanban, Backlog, List, ForYou, All work)
- Any shell above `CatalystViewBase`
- Existing work-item SVG assets

---

### 4.2 · Status Button + Workflow-Transitions Popover

**Jira anatomy**
- Button above the right-rail: current status label in sentence case, subtle left chevron
- Popover shows **transitions**, not states: `<keyword> → <UPPERCASE STATUS LOZENGE>`
- Keyboard focus indicator: 2px blue left border + subtle grey background (Atlaskit `option--is-focused`)

**Catalyst today**
- Main-issue status opens a flat list of all statuses
- Subtask-row status uses a different, simpler widget
- Duplication and drift

**Phase 2 target**
- `StatusTransitionsPopover` — ONE component consumed by:
  1. Main-issue status button (right-rail)
  2. Subtask row-level lozenge
  3. Linked-item row-level lozenge
  4. Any list / board inline status picker
- Data source: `ph_workflow_transitions` keyed on `project_key` + `from_status` — if table is missing, add migration (see §9)
- Transition selection = optimistic update on `ph_issues.status` + row in `jira_write_back_queue` (existing pattern)
- Status lozenges inside the popover strictly conform to the 3-colour guardrail (CLAUDE.md §5)

**Wrappers consumed**: `Popup`, `Textfield` (search filter), `Lozenge`, `Button`, `Icon`.

**Acceptance criteria**
- [ ] Popover shows only allowed transitions from the current status — never the full status list
- [ ] Keyword search filters rows live (fuzzy match on transition name)
- [ ] Enter commits the focused row; Esc closes without change
- [ ] One component consumed in 4 call sites with zero duplicates
- [ ] Lozenges conform to the 3-colour guardrail
- [ ] Optimistic write succeeds, then reconciles with server; rollback on server error with a visible toast
- [ ] Dark mode: popover surface passes computed-background check
- [ ] Playwright visual-regression snapshot matches in both themes
- [ ] axe-core: zero violations

**Files to touch**
- `src/components/catalyst-detail-views/shared/StatusTransitionsPopover.tsx` (new)
- `src/components/catalyst-detail-views/shared/sections/CatalystSidebarDetails.tsx` (call-site wiring)
- `src/components/catalyst-detail-views/shared/sections/SubtasksPanel.tsx` (row-level wiring)
- `src/components/catalyst-detail-views/shared/sections/LinkedItemsPanel.tsx` (row-level wiring)
- `src/components/shared/StatusLozenge.tsx` (reuse only — do not modify)
- `supabase/migrations/<date>__ph_workflow_transitions.sql` (new if missing)

**Files NOT to touch**
- `StatusLozenge.tsx` internals
- Any hub filter chip
- Anything outside the Details column

---

### 4.3 · Right-Rail Details — Stacked Layout + Pinned Fields

**Jira anatomy**
- Section header `Details` with disclosure chevron (collapsible)
- Fields stacked — label above value
  - Label: 13px / weight 600 / Atlaskit `color.text.subtle`
  - Value: 14px / weight 400 / Atlaskit `color.text`
  - ~6px gap label↔value · ~20px gap between fields
- Pinned-field affordance: `⇧` pin icon beside the label when field is pinned by the user
- Empty states: `None` (pickers) · `Add text` (text fields) — italic muted
- Hover on empty value reveals a rounded grey-blue background indicating clickability
- Created/Updated timestamps render **outside** the Details accordion as plain text lines

**Catalyst today**
- `CatalystSidebarDetails.tsx` uses 2-column (96px label + 20px gap + value) — pattern drift
- No pinned-field affordance
- No hover reveal on empty values
- Timestamps inside the Details accordion

**Phase 2 target**
- `FieldRow({ label, value, pinned, onPin, emptyPlaceholder, onEdit })` — canonical stacked primitive
- Pin icon uses `ads/Tooltip` + `ads/Icon` + `ads/Button` (subtle)
- Hover affordance is the Atlaskit `InlineEdit` default — no custom CSS
- Timestamps block `IssueTimestamps` renders below all accordions as two plain lines
- Pinned-field preference persists in new `user_field_pins` table (see §9)

**Wrappers consumed**: `InlineEdit`, `Tooltip`, `Icon`, `Button`.

**Acceptance criteria**
- [ ] Every right-rail field uses `FieldRow` — no bespoke layouts
- [ ] Label width is content-sized (no fixed 96px)
- [ ] Stacked layout: label above value, never inline
- [ ] Pin click toggles `user_field_pins` row for the current user
- [ ] Pinned fields render at the top of the Details section, in pinned order (by `pinned_at DESC`)
- [ ] Empty values reveal hover affordance; click enters edit mode with autofocus
- [ ] Created/Updated render as two plain lines outside the Details accordion, below all sections
- [ ] Dark-mode computed-background check passes
- [ ] No change in Supabase writes (same TanStack hooks as today)
- [ ] axe-core: zero violations
- [ ] Keyboard: Tab cycles through pin buttons → field values; Enter commits, Esc cancels

**Files to touch**
- `src/components/catalyst-detail-views/shared/sections/CatalystSidebarDetails.tsx` (rewrite)
- `src/components/catalyst-detail-views/shared/FieldRow.tsx` (new)
- `src/components/catalyst-detail-views/shared/IssueTimestamps.tsx` (new)
- `src/hooks/useUserFieldPins.ts` (new)
- `supabase/migrations/<date>__user_field_pins.sql` (new)

**Files NOT to touch**
- Editable field components themselves (re-mounted unchanged inside `FieldRow`)
- `CatalystViewBase.tsx` layout shell
- Any hub

---

### 4.4 · Pickers

One invariant across every picker: Atlaskit's `option--is-focused` treatment. Catalyst picks this up automatically via the wrapper layer.

#### 4.4.a · Assignee / Reporter (`ads/UserPicker`)

**Jira anatomy**
- Mini-avatar + pre-selected name (auto-selected on open)
- `×` clear button on the right
- Special rows at the top: `Unassigned`, `Automatic` — both use the generic-person icon, not blank space
- Real users: photo avatar OR 2-letter initial disc (Atlaskit's colour-hashing algorithm)
- Save-on-select, close-on-outside-click

**Phase 2 target**
- `ads/UserPicker` wraps `@atlaskit/user-picker` `SingleUserPicker`
- Data source: `profiles` table + synthetic `Unassigned` + `Automatic` at the top
- Mutation: `useUpdateIssueAssignee` (existing hook) — write to `ph_issues.assignee_id` + `jira_write_back_queue`
- Avatar 24px in rows, 20px inline in the value area

**Acceptance criteria**
- [ ] `Unassigned` and `Automatic` always first
- [ ] `×` sets assignee to NULL
- [ ] Save-on-outside-click; no explicit confirm button
- [ ] Shows a loading state while the mutation is pending; shows a toast on error
- [ ] Dark-mode passes; axe-core passes
- [ ] Keyboard: Arrow down/up navigates, Enter selects, Esc closes

**Files to touch**
- `src/components/catalyst-detail-views/shared/EditableAssignee.tsx` (rewrite — becomes a thin wrapper)
- `src/components/catalyst-detail-views/shared/EditableReporter.tsx` (new — or extract)

#### 4.4.b · Fix versions — grouped select with inline create (`ads/Select/Grouped`)

**Jira anatomy**
- Grouped options: `Unreleased` / `Released` / `Archived` (group headers bold, non-selectable)
- Plain-text rows (no icons)
- Footer: `+ Create new version` pinned at the bottom of the list

**Phase 2 target**
- `ads/Select/Grouped` with custom `MenuList` that pins the create-new row at the bottom
- Create-new spawns an inline micro-form (name + release date) — NOT a modal
- Groups derived from `ph_versions`: `released_at IS NULL` → Unreleased, `released_at < now()` → Released, `archived_at IS NOT NULL` → Archived

**Acceptance criteria**
- [ ] Versions grouped correctly by state
- [ ] Inline-create writes `ph_versions` + re-selects; no modal
- [ ] Multi-select supported (a story can have multiple fix versions)

#### 4.4.c · Labels — coloured chips (`ads/Select` + `ads/Tag`)

**Jira anatomy**
- Options render as `@atlaskit/tag` chips with coloured `appearance` tokens
- Colour deterministic per label via hash

**Phase 2 target**
- Custom `Option` renders `ads/Tag` with hash-derived colour
- Centralised `labelColor(label: string): TagAppearance` function in `src/lib/labelColor.ts`
- Create-new inline supported; writes to `ph_labels` (or equivalent)

**Acceptance criteria**
- [ ] Labels consistent colour everywhere (right rail, tables, badges)
- [ ] Chip contrast passes WCAG AA at 4.5:1 text/background
- [ ] Centralised hash function — single source of truth

#### 4.4.d · Priority (`ads/Select`)

**Jira anatomy**
- Lozenge with Atlaskit priority icons: `=` medium (orange), `↑` high (red), etc.

**Phase 2 target**
- `ads/Select` with `@atlaskit/icon-priority` glyphs
- Current 5-value enum retained — no schema change

**Files to touch (all pickers 4.4)**
- `src/components/catalyst-detail-views/shared/EditableAssignee.tsx`
- `src/components/catalyst-detail-views/shared/EditableReporter.tsx`
- `src/components/catalyst-detail-views/shared/EditablePriority.tsx`
- `src/components/catalyst-detail-views/shared/EditableLabels.tsx`
- `src/components/catalyst-detail-views/shared/EditableFixVersions.tsx`
- `src/lib/labelColor.ts` (new)

**Files NOT to touch**
- `ph_issues` schema
- TanStack Query keys (`['issue', id]`, `['assignee-options']`, etc.)
- Existing mutations and write-back-queue logic

---

### 4.5 · Subtasks Table

**Jira anatomy**
- Header: `Subtasks` · progress bar · `⋯` menu · `▦` view toggle · `+` inline-add trigger
- `⋯` menu: `☐ Hide done` (toggle) · `Bulk edit` · `View in search`
- Columns: Work (type icon + key + title) · Priority · Assignee · Status
- Status column uses UPPERCASE StatusLozenge with chevron (row-level picker)

**Catalyst today**
- `SubtasksPanel.tsx` renders a bespoke grid
- `+` opens a modal (not inline)
- No progress bar · no Hide-done · no Bulk edit · no View-in-search

**Phase 2 target**
- `ads/DynamicTable` declarative rows + head
- `ads/ProgressBar` for done/total ratio
- `ads/DropdownMenu` with mixed item types for `⋯` menu:
  - Checkbox item: `Hide done` — filters statuses in `('done','closed','archived')`
  - Action items: `Bulk edit` (Phase 3 drawer — link disabled with tooltip for Phase 2) · `View in search` (navigates to `/project-hub/:key/list?parent=<id>`)
- Row hover reveals row-level actions via `ads/Button` (appearance="subtle")
- Inline-add (§4.5.b)

#### 4.5.b · Inline-add (custom type picker, no AI)

**Jira anatomy (descoped parts removed)**
- Inline row: textfield `What needs to be done?` + trailing type-chip `⊞ Sub-task ∨` + trailing `↩` enter icon
- Type picker: project-configured child types from `ph_projects.child_issue_types` (e.g. `Sub-task`, `Frontend`, `Backend`, `Integration`)
- `Cancel` ghost link at bottom-right

**Phase 2 target**
- `SubtaskInlineAdd.tsx` using `ads/Textfield` with `elemAfterInput` = type-chip + enter-icon
- Type chip uses `ads/DropdownMenu` with options from `ph_projects.child_issue_types` JSONB column (new column via migration)
- Enter submits; Esc cancels; outside-click also cancels (with unsaved-text toast)

**Wrappers consumed**: `DynamicTable`, `ProgressBar`, `DropdownMenu`, `Checkbox`, `Button`, `Textfield`, `Icon`, `Tooltip`, `Lozenge`.

**Acceptance criteria**
- [ ] Subtasks render via `DynamicTable` — no bespoke grid
- [ ] Progress bar reflects done/total live from subtask statuses
- [ ] `Hide done` preference persists in localStorage per user
- [ ] `View in search` preserves current filters + adds `parent=<id>`
- [ ] `+` click reveals inline-add row — NEVER a modal
- [ ] Textfield autofocuses on reveal; Enter submits; Esc cancels
- [ ] Type picker lists project-configured types; defaults to `Sub-task`
- [ ] Creating writes `ph_issues` row with `parent_id` and queues write-back
- [ ] Dark mode passes; axe-core passes
- [ ] Visual-regression snapshot matches

**Files to touch**
- `src/components/catalyst-detail-views/shared/sections/SubtasksPanel.tsx` (rewrite)
- `src/components/catalyst-detail-views/shared/SubtaskInlineAdd.tsx` (new)
- `src/hooks/useSubtasks.ts` (new or extend)
- `supabase/migrations/<date>__ph_projects_child_issue_types.sql` (new if missing)

**Files NOT to touch**
- `ph_issues` schema (beyond additive `parent_id`, which already exists)
- Any other hub that renders subtasks (they route through the same panel)

---

### 4.6 · Linked Work Items

**Jira anatomy (descoped parts removed)**
- Section header `Linked work items`
- Existing links grouped by link-type
- `Add linked work item` opens INLINE add flow
- `+ Create linked work item` in the inline-add footer opens a MODAL

#### 4.6.a · Inline-add

**Anatomy**
- 2-column row:
  - Left: link-type select `is blocked by ∨` (options from `ph_link_types`)
  - Right: target-issue autocomplete `Type, search or paste URL`
- Autocomplete accepts both free-text issue search AND Jira-style URL paste (parsed via regex)
- Footer: `+ Create linked work item` · `Link` (primary, disabled until valid) · `Cancel`

**Phase 2 target**
- `LinkedItemInlineAdd.tsx` composed of `ads/Select` + `ads/Textfield` with custom popup autocomplete
- URL-paste parser: `/^.+\/(issue|browse)\/([A-Z]+-\d+)$/` → issue_key
- Autocomplete queries `ph_issues` by `issue_key ILIKE` + `summary ILIKE`, debounced 200ms

**Acceptance criteria**
- [ ] Add flow never opens a modal for linking existing issues
- [ ] URL paste auto-resolves and pre-populates
- [ ] Free-text search returns within 200ms of last keystroke
- [ ] Creating a link writes `ph_issue_links` + queues write-back
- [ ] Link-type options come from `ph_link_types` (see §9)
- [ ] Dark-mode passes; axe-core passes

#### 4.6.b · Create Linked Work Item modal

**Anatomy**
- Header: title + `─` minimise + `⤢` expand + `⋯` more + `✕` close
- Helper banner: `Required fields are marked with an asterisk *`
- Fields (all stacked):
  - Space *
  - Work type *
  - Divider
  - Status (with helper `This is the initial status upon creation`)
  - Linked work items * (link-type select + target-tag field, current issue pre-filled)
  - Summary *
  - Priority
- Footer: `☐ Create another` (left) · `Cancel` · `Create` (primary)

**Phase 2 target**
- `ads/Modal` (minimise-to-pill supported via Catalyst-owned wrapper extension — see §4.6.c)
- `ads/Form` for field layout + validation
- Every field uses its canonical ADS wrapper (pickers, textfield)
- `Create another` keeps modal open after submit; clears form except Space and Work type; refocuses Summary

#### 4.6.c · Minimise-to-pill behaviour

Atlaskit `@atlaskit/modal-dialog` does not natively support minimise. Catalyst adds a wrapper-level extension:

- `ads/Modal` accepts `canMinimize?: boolean` prop (default `false`)
- When minimise is clicked, the wrapper:
  - Stores modal state (form values, scroll position) in a Zustand store `useMinimizedModals`
  - Unmounts the modal
  - Renders a floating pill at the bottom-right of the viewport via a portal
- Clicking the pill remounts the modal with state restored
- Closing the pill discards state
- Only ONE modal can be minimised at a time — opening a new modal while one is minimised either (a) stacks (behaviour TBD) or (b) discards. Spec decision: **discards**, with a confirm dialog if there are unsaved changes.

This is a Catalyst-owned feature, entirely above the Atlaskit layer. Atlaskit does not know minimisation exists.

**Wrappers consumed**: `Modal`, `Form`, `Select`, `UserPicker`, `Textfield`, `Button`, `Tag`, `Checkbox`, `Icon`.

**Acceptance criteria (4.6 combined)**
- [ ] Inline-add for existing issues; modal only for create-new
- [ ] Modal minimise → floating pill → restore works with state preservation
- [ ] `Create another` works per spec
- [ ] `Required fields *` banner present
- [ ] All fields stacked (label above)
- [ ] Current issue pre-filled as the first linked-item tag
- [ ] Submission writes `ph_issues` (new) + `ph_issue_links` (link) + queues write-back
- [ ] Dark-mode passes; axe-core passes
- [ ] Visual-regression snapshot matches for: modal closed · inline-add open · modal open · modal minimised · modal expanded

**Files to touch**
- `src/components/catalyst-detail-views/shared/sections/LinkedItemsPanel.tsx` (rewrite)
- `src/components/catalyst-detail-views/shared/LinkedItemInlineAdd.tsx` (new)
- `src/components/catalyst-detail-views/shared/CreateLinkedWorkItemModal.tsx` (new)
- `src/components/ads/Modal/MinimizablePortal.tsx` (new — part of the wrapper layer)
- `src/store/useMinimizedModals.ts` (new)
- `supabase/migrations/<date>__ph_link_types.sql` (new if missing)

**Files NOT to touch**
- `ph_issues` / `ph_issue_links` schemas (beyond additive)
- Any other hub

---

### 4.7 · Description Editor + Comment Composer

Both surfaces share `@atlaskit/editor-core`. The toolbar is identical; the surrounding chrome differs.

**Jira anatomy — shared toolbar**
- Leading content-insert menu (image / file / mention / emoji / date / table / panel / etc.)
- `Tt` heading levels
- `B` bold + more-formatting chevron
- `≡` list (bullet / ordered / task)
- `A` text colour
- `🖼` image upload
- `</>` code block
- `☺` emoji
- `+` insert more
- `🔗` link
- `↶ ↷` undo / redo
- `🕒` version history

**Description vs Comment differences**
- **Description**: enters edit mode via inline-edit click; Save/Cancel render BELOW the editor, left-aligned.
- **Comment composer**: always expanded when active; avatar is OUTSIDE the frame on the left; placeholder is a mention hint (`Type @ to mention someone.`); Save/Cancel below; visibility toggle on the right below.

**Phase 2 target**
- `ads/Editor` wraps `@atlaskit/editor-core` with a stable Catalyst-owned props surface
- Two call sites: `DescriptionField` and `CommentComposer`
- Mention picker: `@atlaskit/mention` provider wired to `profiles`
- Comment visibility: `ads/Toggle` — `All` vs `Internal only` — writes to `jira_sync_comments.visibility` (new column — see §9)
- Save/Cancel use `ads/Button` primary + subtle, left-aligned under the editor

**Wrappers consumed**: `Editor`, `Button`, `Avatar`, `Toggle`, `Tooltip`, `Icon`.

**Acceptance criteria**
- [ ] One toolbar, two call sites
- [ ] Description: Save/Cancel below editor, left-aligned; Enter is allowed for newlines (not submission); `Cmd+Enter` submits
- [ ] Comment: avatar outside-left; placeholder `Type @ to mention someone.`; submission via `Cmd+Enter` or Save button
- [ ] `@` trigger opens the mention picker backed by `profiles`
- [ ] Visibility toggle writes `jira_sync_comments.visibility`
- [ ] Undo / redo works via `Cmd+Z` / `Cmd+Shift+Z`
- [ ] Paste of rich text is sanitised; paste of images uploads to the existing attachment pipeline
- [ ] Dark-mode passes; axe-core passes
- [ ] Visual-regression snapshot matches (empty · typing · mention popup · saved · error state)

**Files to touch**
- `src/components/ads/Editor/Editor.tsx` (new wrapper)
- `src/components/catalyst-detail-views/shared/sections/DescriptionField.tsx` (rewrite)
- `src/components/catalyst-detail-views/shared/sections/CommentComposer.tsx` (rewrite)
- `src/components/catalyst-detail-views/shared/CommentList.tsx` (lightweight rewrite to match new ADF rendering)
- `src/lib/mentionProvider.ts` (new — wraps `profiles` query behind `@atlaskit/mention` interface)
- `supabase/migrations/<date>__jira_sync_comments_visibility.sql` (new if missing)

**Files NOT to touch**
- `jira_sync_comments` column layout beyond additive
- Any pre-existing TipTap-based editor in other surfaces (those migrate in a later phase)

---

### 4.8 · Activity Tabs

**Jira anatomy**
- Tabs: `All` · `Comments` · `History` · `Work log` · `SLA History` · `Timepiece`
- Active tab underline uses Atlaskit blue
- Right of tab row: sort icon `↕` toggles asc/desc, preference persists

**Phase 2 target**
- `ads/Tabs` wrapping `@atlaskit/tabs`
- Catalyst-specific tabs (`SLA History`, `Timepiece`) remain; `SLA History` hides for non-incident types
- Sort toggle uses `ads/Button` (subtle); persists in localStorage per user per tab

**Wrappers consumed**: `Tabs`, `Button`, `Icon`, `Tooltip`.

**Acceptance criteria**
- [ ] All tabs route through `ads/Tabs`
- [ ] Sort state persists across sessions
- [ ] Tab keyboard nav works (arrow keys, Home/End)
- [ ] `SLA History` hidden for non-incident types
- [ ] Dark-mode + axe-core pass

**Files to touch**
- `src/components/catalyst-detail-views/shared/sections/ActivityPanel.tsx` (rewrite)

---

### 4.9 · Cross-Cutting — InlineEdit, Empty States, Icon Chrome, Tooltips

**InlineEdit — Jira anatomy**
- Empty placeholder in italic muted grey
- Hover reveals rounded grey-blue background
- Click swaps to input with autofocus
- Save row below: `✓` (primary) + `×` (ghost)
- Enter / outside-click / `✓` = save; Esc / `×` = cancel (revert optimistic change)

**Phase 2 target**
- Every editable right-rail text field wraps `ads/InlineEdit`
- Summary, description preview, custom text fields all use `InlineEdit` in the read state
- `InlineEdit` honours `ads/Editor` for rich-text fields

**Icon chrome**
- All non-type icons come from `ads/Icon` → `@atlaskit/icon`
- Work-item-type icons remain Catalyst's canonical SVGs (CLAUDE.md §11) — no change
- Every icon button has either a `tooltip` or an `aria-label` — lint-enforced

**Tooltips**
- Every truncated label, every icon-only button, every pin icon wraps `ads/Tooltip`
- Tooltip position defaults to `bottom`, `delay={300}`

**Acceptance criteria**
- [ ] No bespoke hover-reveal CSS on any migrated surface
- [ ] All icons traceable to `ads/Icon` or the canonical SVG set
- [ ] Zero icon-button without aria-label or tooltip (lint rule)

---

## 5 · Cross-Cutting Concerns

### 5.1 · TypeScript coverage

- Every file in `src/components/ads/**` has strict TypeScript (`"strict": true` in tsconfig override), zero `any`, zero `unknown` without narrowing.
- Every wrapper exports typed props — consumers can't pass `unknown` shapes.
- Supabase types are regenerated via `supabase gen types typescript` after each migration; wrapper components consume them through typed hooks (not raw queries).

### 5.2 · Testing pyramid

- **Unit tests** (`*.test.tsx`, Vitest + React Testing Library): each wrapper component, each hook. Cover: default render, each prop variant, loading state, error state, keyboard interactions.
- **Storybook entries** (`*.stories.tsx`): every wrapper + every surface, every meaningful state, both themes.
- **Interaction tests** (Playwright + `@testing-library/react` for complex flows): every surface in §4 has at least one end-to-end test covering: mount · interact · write · unmount · rehydrate.
- **Visual regression** (Playwright `toHaveScreenshot`): stable snapshots of every surface, both themes. Thresholds: 0.01 delta.
- **Accessibility** (axe-core via Playwright): zero violations on every snapshot.
- **Contract tests** on `ads/*` wrappers: a test that imports `@atlaskit/<pkg>` and asserts the props shape the wrapper relies on still exists — so an Atlaskit major bump fails CI loudly.

### 5.3 · CI gates

On every PR:

1. `npm run typecheck` — zero errors
2. `npm run lint` — zero errors, including ADS lint rules (§2.3)
3. `npm run test:unit` — all pass
4. `npm run test:interaction` — all pass
5. `npm run test:visual` — all snapshots pass (deltas < 0.01)
6. `npm run test:a11y` — zero axe violations
7. `npm run build` — production build succeeds
8. Bundle size check — `@atlaskit/editor-core` chunk stays within budget (≤ 400KB gzipped)

Any failure blocks merge.

### 5.4 · Storybook

- Hosted at `/storybook` (local) + deployed on Vercel preview URLs
- Every wrapper has stories: `Default`, `AllStates`, `Disabled`, `Loading`, `Dark`, `RTL` (future)
- Every surface has stories: `Empty`, `Populated`, `Error`, `Loading`, `Dark`, `ModalMinimized` (where applicable)
- Storybook test-runner runs in CI: every story renders without error

### 5.5 · Dark mode — NOCTURNE parity

- Every migrated surface passes the computed-background check (CLAUDE.md §3 L37)
- The theme-bridge (§3) guarantees this at the token level
- Visual-regression snapshots are taken in BOTH themes

### 5.6 · Accessibility — WCAG 2.1 AA (CG-12)

- Every interactive element has a focus ring (2px solid, 2px offset — CLAUDE.md §15)
- Every picker traps focus while open
- Every icon button has `aria-label` or tooltip
- Colour contrast ≥ 4.5:1 on every text/background pair — tested by axe-core
- Keyboard-only navigation: every flow in §4 can be completed without a mouse
- Screen-reader narration: every Atlaskit wrapper preserves the underlying ARIA attributes

### 5.7 · Performance

- `@atlaskit/editor-core` is lazy-loaded via `React.lazy`; the Story View's initial bundle does NOT include the editor chunk
- Pickers (`@atlaskit/select`, `@atlaskit/user-picker`) lazy-loaded on first open
- Modal (`@atlaskit/modal-dialog`) lazy-loaded on first open
- Dynamic table virtualises rows when > 50
- Every write uses optimistic updates via TanStack Query; server reconciliation toasts on error

### 5.8 · Wiring preservation

The following write paths MUST NOT change behaviour:
- `ph_issues` UPDATE via `useUpdateIssue`
- `ph_issue_links` INSERT / DELETE via `useCreateIssueLink` / `useDeleteIssueLink`
- `jira_sync_comments` INSERT via `useCreateComment`
- `jira_write_back_queue` INSERT (triggered by the above)
- TanStack Query keys: `['issue', id]`, `['issue-links', id]`, `['comments', id]`, `['subtasks', parentId]`

Every rewritten component receives these hooks as props or consumes them via existing context.

### 5.9 · Feature flags

Each migrated surface ships behind a feature flag — enable per-project or per-user to allow staged rollout:

- `ads.breadcrumb`
- `ads.status-transitions`
- `ads.right-rail`
- `ads.pickers`
- `ads.subtasks`
- `ads.linked-items`
- `ads.editor`
- `ads.activity`

Flags default to `off` in production. Enable sequentially per the execution plan (§7). Rollback is instant by disabling the flag.

---

## 6 · Rollback Plan

For each work order:

1. **Feature flag default off** — merging to main does NOT enable the new surface in production.
2. **Flag on for Vikram's account only** in staging for E2E validation.
3. **Flag on for the BAU project only** in production (canary).
4. **Flag on for all projects** after 48h with no regressions.
5. **If a regression is found at any step**, flipping the flag off restores the previous behaviour with zero deploy.
6. The OLD code path remains in the tree for 30 days after GA. After 30 days, remove via a dedicated cleanup PR.

---

## 7 · Execution Plan — Eight Work Orders

Each work order is one `CC Task Brief` (CLAUDE.md §10). Ship in this exact order. Each ends with G9 QA gate (CLAUDE.md §12).

| WO | Scope | Depends on | Key deliverables |
|---|---|---|---|
| WO-0 | ADS foundation | — | `ads/*` wrapper scaffolding · theme-bridge · lint rules · Storybook · CI gates |
| WO-1 | Breadcrumb + AddParent + prev/next nav | WO-0 | §4.1 |
| WO-2 | Right-rail stacked rewrite + pinned fields + timestamps | WO-0, WO-1 | §4.3, §4.9 |
| WO-3 | Pickers migration (all 5) | WO-0 | §4.4 |
| WO-4 | StatusTransitionsPopover (main + row-level) | WO-0, WO-3 | §4.2 |
| WO-5 | Subtasks table + inline-add | WO-0, WO-4 | §4.5 |
| WO-6 | Linked items inline + Create modal + minimise | WO-0, WO-3, WO-4 | §4.6 |
| WO-7 | Editor + Comment composer | WO-0 | §4.7 |
| WO-8 | Activity tabs | WO-0, WO-7 | §4.8 |

WO-0 takes roughly one week. WO-1 through WO-8 are each one to three sessions. Total Phase 2: six to eight weeks calendar time at the current pace.

Each WO:

1. **G7 Task Brief** (Forge generates, matches CLAUDE.md §10 format)
2. **G8 Build** — Claude Code executes; writes wrappers, surface, tests, stories, migration (if any); ships behind feature flag
3. **G9 QA** — Forge scores: UI/UX ≥ 9.8, Colour = 10, Font ≥ 9.8, Design System = 10, Dead CTAs = 0, Dead Wiring = 0, Token-only CSS = 100%, WCAG AA = 100% (CLAUDE.md §14)
4. **DevTools verification** — Vikram takes dark-mode screenshot, confirms computed `rgb(26, 26, 26)` on migrated surface
5. **Feature-flag canary** — enable on Vikram's account first, then BAU project, then all

---

## 8 · Regression Protection

After every WO, the following smoke test runs in CI (Playwright):

1. `/project-hub/BAU/story-backlog` → click a story row → modal mounts
2. `/project-hub/BAU/story/<uuid>` → full-page mount
3. `/project-hub/BAU/issue/<issue-key>` → full-page mount via issue-key route
4. Kanban → click card → modal mounts
5. List view → click row → modal mounts
6. ForYou → click work item → modal mounts
7. All work → click row → modal mounts

All seven dispatch through `CatalystDetailRouter`. Any drift on one surface appears on all seven — which is the whole point of the Phase 1 unification.

---

## 9 · Schema Prerequisites

These migrations must land before the corresponding work order:

| Work order | Table / column | Migration |
|---|---|---|
| WO-2 | `user_field_pins` | PK `(user_id, field_name)`; `pinned_at timestamptz default now()` |
| WO-4 | `ph_workflow_transitions` | PK `(project_key, from_status, to_status)`; optionally `conditions jsonb` for later rules |
| WO-5 | `ph_projects.child_issue_types` | `jsonb default '["Sub-task"]'::jsonb` |
| WO-6 | `ph_link_types` | PK `(project_key, link_type)`; seed with canonical Atlassian set (`blocks`, `is blocked by`, `clones`, `is cloned by`, `duplicates`, `is duplicated by`, `relates to`) |
| WO-7 | `jira_sync_comments.visibility` | `text default 'all' check (visibility in ('all','internal'))` |

Each migration ships as a standalone PR with RLS policies, seed data, and downgrade script. No migration is bundled with its consumer WO — schema first, always.

---

## 10 · Definition of Done

A Phase 2 surface is DONE when:

- [ ] Every listed file migrated to `ads/*` wrappers (no direct `@atlaskit/*` imports in consumer code)
- [ ] Acceptance criteria for that surface all pass
- [ ] Regression smoke (§8) passes for all seven routes
- [ ] NOCTURNE dark mode computed-background check passes
- [ ] Lovable Failure Prevention (CLAUDE.md §13) — no FP-001..010 regressions
- [ ] Forge G9 ≥ 9.5/10 on all CG metrics (CLAUDE.md §14)
- [ ] Zero new `!important` blocks; zero duplicate `.dark` selectors; zero HSL; zero non-token hex in migrated code
- [ ] Visual-regression snapshots pass, both themes
- [ ] axe-core: zero violations
- [ ] Storybook stories present and passing in CI
- [ ] Feature flag added and defaults to `off` in production
- [ ] Rollback path validated (flag toggles surface on/off without reload)
- [ ] 30-day old-path removal ticket filed

When all eight work orders pass DoD, Phase 2 ships. Phase 3 covers bulk-edit drawer, workflow diagram, admin surfaces for configuration, and (separately, behind its own flag) the AI / Rovo affordance layer.

---

## 11 · Non-Goals Reiterated

Spec does NOT cover:
- AI / Rovo features (explicitly descoped per user direction)
- Shortcuts, `any` types, hardcoded hex, mixed DS usage, inline styles on migrated surfaces
- Jira Development panel, Automation accordion, Configure admin link
- MDT Ref or any Jira custom field
- Workflow diagram viewer
- Admin UIs for link-types, child-types, pinned-field defaults

Everything above is Phase 3 or beyond.

---

## 12 · Open Confirmations

Before WO-0 starts, please confirm:

1. Target Atlaskit version bundle — does the team want latest (2026-Q1) or the last known-stable major from 2025-Q4? Spec assumes latest.
2. Minimise-modal behaviour when a second modal opens — discard minimised state vs stack. Spec assumes discard with unsaved-changes confirm.
3. `SLA History` tab visibility rule — does it also hide for non-incident types in the subtask context? Spec assumes yes.
4. Storybook deployment target — Vercel preview URLs per PR vs a static `/storybook` on main. Spec assumes both.
5. Visual-regression threshold — 0.01 pixel delta is a tight budget; confirm acceptable or relax to 0.05 for rendering variance.
6. Feature-flag provider — using existing `useFeatureFlag` hook in the repo, or introducing a new provider.

---

**End of spec.**

**Sources:** live walkthrough on Jira Cloud `digital-transformation.atlassian.net`, issue `BAU-5342`, captured 2026-04-19. Atlassian Design System reference: https://atlassian.design/. Atlaskit package registry: https://atlaskit.atlassian.com/.
