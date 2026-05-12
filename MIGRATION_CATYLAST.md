# Catylast Component Library — Migration Handoff

> **Purpose.** This document is the canonical handoff for moving the
> Catylast component library out of its own repo (`catylast-storybook`)
> and into the production app repo (`catalyst-prod-45`). It's written
> for two audiences: the human running the migration, and any future
> Claude Code session that needs to pick up where this one left off.
>
> Read end-to-end before touching code.

---

## 0. CURRENT STATE — Phase 1 COMMITTED (as of 2026-05-11)

**TL;DR for a fresh Claude session in `catalyst-prod-45`:** Phase 1
setup is **complete, verified, and committed** to the
`feat/catylast-component-library` branch. The seven `@catylast/*`
packages are vendored as workspace packages, npm install resolves
cleanly, all seven packages build, and Storybook 10 boots on port 6007
alongside prod's existing Storybook 8 on port 6006. **Your immediate
job is to diagnose prod-app console errors the user reported, then
move on to DynamicTable styling against the design.**

### What's already on disk in `catalyst-prod-45`

Feature branch: **`feat/catylast-component-library`** (off `main`).

New / modified files:

| File                       | Status   | Notes                                                                                                                                    |
| -------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `MIGRATION_CATYLAST.md`    | new      | This doc copied here at integration time                                                                                                 |
| `tsconfig.base.json`       | new      | Required by our packages; copied from `catylast-storybook`                                                                               |
| `tsconfig.app.json`        | modified | Added 14 `@catylast/*` path mappings                                                                                                     |
| `package.json`             | modified | Added `workspaces` array, 7 `@catylast/*` deps, fontsource fonts, two Atlaskit deps promoted from `overrides`, four `catylast:*` scripts |
| `src/main.tsx`             | modified | Imports fontsource + 5 catylast CSS files at the top of the file                                                                         |
| `packages/`                | new      | The seven `@catylast/*` packages with `dist/` built                                                                                      |
| `apps/storybook-catylast/` | new      | Storybook 10 docs site, runs on port 6007                                                                                                |

### Lessons learned during Phase 1 setup (write these into CLAUDE.md eventually)

These caught us off-guard and are worth knowing for future migrations:

1. **`workspace:*` protocol does NOT work with npm** — only pnpm and Bun
   understand it. All `workspace:*` references in package.json files
   were converted to `*` (still works in Bun, also works in npm).

2. **Bun is the team's standard package manager** (per `bun.lock`) but
   the user is on Windows without Bun installed. The convenience scripts
   in the root `package.json` were originally `bun run --filter` but
   were rewritten to `npm run --workspace=` so they work without Bun.
   Both managers understand the cross-platform npm form.

3. **`@atlaskit/adf-schema` MUST be a direct `dependency`, not just an
   `overrides` entry.** Vite's existing alias in `vite.config.ts` points
   to the top-level `node_modules/@atlaskit/adf-schema` path — but
   `overrides` alone doesn't force npm to install it at the top level,
   only when a transitive package requests it (nested). On macOS/Bun this
   apparently hoisted; on Windows/npm it stayed nested across 9+ deep
   paths, breaking the Vite alias and causing 6 ADF resolution errors at
   dev-server boot. **Fix:** added `"@atlaskit/adf-schema": "52.6.6"`
   directly to `dependencies`. Same version as the existing `overrides`.

4. **`@atlaskit/editor-plugins` has the same issue.** `editor-core`
   deep-imports from `@atlaskit/editor-plugins/help-dialog`, and Rollup
   couldn't resolve it because the package was nested-only. **Fix:** added
   `"@atlaskit/editor-plugins": "13.0.120"` directly to `dependencies`.
   Same version as the override.

5. **`scripts/sync-deps.js` (prod's auto-install helper) fails on the
   user's Windows shell** with `npm install... FAILED after 0.0s` —
   message-only failure, no actual error surface. It doesn't block
   `npm run dev` from starting because the deps are already installed
   manually. Worth investigating later but not a blocker.

6. **Two preexisting prod issues** that are NOT caused by this migration:
   - `src/components/admin/slack/SlackSetupWizard.tsx` lines 578-579 have
     parser errors in `tsc -p tsconfig.app.json --noEmit` — the file
     itself looks syntactically fine; might be a TS-version quirk. Same
     errors appear without our changes.
   - The full prod `vite build` hits other Atlaskit subpath issues even
     after we fixed `editor-plugins/help-dialog`. The dev server boots,
     so this is build-only. Not investigated yet.

### What's been verified

- ✅ `npm install` — 2536 + 461 packages added, no errors, no `EUNSUPPORTEDPROTOCOL`
- ✅ All 7 `@catylast/*` packages build cleanly (`dist/` populated for each)
- ✅ `tsc --noEmit` on each `@catylast/*` package passes
- ✅ `tsc -p tsconfig.app.json --noEmit` on the prod app shows ONLY the 2 preexisting `SlackSetupWizard` parser errors — no leakage from our packages
- ✅ Prod `vite dev` boots on port 8080
- ✅ Our `@catylast/storybook` boots on port 6007 (`npm run catylast:storybook`)
- ✅ All 7 `@catylast/*` workspace symlinks exist in `node_modules/@catylast/`
- ✅ `@atlaskit/adf-schema` and `@atlaskit/editor-plugins` are at the top level of node_modules
- ✅ Inter Variable + JetBrains Mono Variable font files load (check Network tab in DevTools)

### What's NOT yet verified (the immediate next things to do)

- ⏳ **User reports "a lot of errors in the console" on the prod app** —
  these were NOT captured before the commit. **First action of the next
  session:** start `npm run dev`, open the app at `localhost:8080`, copy
  the console output and classify each error:
  - Is it an `@catylast/*` import error? → our problem, fix in `packages/`
  - Is it an `@atlaskit/*` resolution error? → same hoisting pattern
    as adf-schema; promote to direct dep
  - Is it a runtime error from a screen the user navigated to? → may need
    that specific component / Atlaskit dep added
  - Is it a Tailwind / Lovable / Storybook addon warning? → likely
    preexisting, can be ignored
- ⏳ Visual comparison of prod screens against `main` — should look
  identical since no `src/` imports changed yet
- ⏳ Open a PR from `feat/catylast-component-library` once errors are
  cleared (or document them as preexisting)

### User's stated next goal after Phase 1

The user explicitly said the **next thing they want to do is complete
the DynamicTable styling to match a design screenshot at
`c:\Users\wasim\OneDrive\Desktop\Screenshot 2025-12-10 223046.png`**.
Most of what's in that design is already supported via existing
DynamicTable slots (`toolbarLeft` / `toolbarRight` / `renderCreator` /
`pinnedColumns` / column visibility). Only ask them what specifically
looks off — don't speculate.

---

## 1. What we've built

Over several weeks the `catylast-storybook` repo evolved from an empty
scaffold into a complete, brand-owned component library that mirrors
the surface area of Atlassian's Design System without using any of its
source, names, or branding. The library is consumed via npm-style scoped
packages (`@catylast/*`) and ships full Storybook documentation.

### 1.1 Packages shipped

All packages live under `packages/`. Versions are point-in-time at the
moment of this handoff.

| Package                   | Version | Role                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `@catylast/tokens`        | 0.2.0   | Single source of truth for design tokens — color ramps, spacing scale, radius scale, typography slots, motion, z-index. Emits both a typed JS module and a `tokens.css` file (CSS custom properties scoped by `data-theme`).                                                                                                           |
| `@catylast/theme`         | 0.1.0   | `ThemeProvider`, `useTheme`, system-mode detection. Sets `data-theme="light                                                                                                                                                                                                                                                            | dark"`on the document root; everything in`@catylast/tokens` reads from there. |
| `@catylast/icons`         | 0.2.0   | Lucide-backed `<Icon>` registry plus brand families: `WorkItemTypeIcon` (14 types — epic, story, qa-bug, etc.) and `PriorityIcon` (6 tiers). Both accept `previewTitle` to render icon + canonical label inline.                                                                                                                       |
| `@catylast/primitives`    | 0.8.0   | The big one. Button family (Button, IconButton, LinkButton, LinkIconButton, SplitButton, ButtonGroup), Avatar, Badge, Calendar, DatePicker, TimePicker, Checkbox, Combobox, Comment, ContextMenu, DropdownMenu, Menu, Pagination, Popover, Select, Tooltip, plus the four typography primitives (`Heading`, `Text`, `Metric`, `Code`). |
| `@catylast/card`          | 0.1.0   | Standalone `Card` primitive (variants, states, slots, sizing knobs, polymorphic `as`, CSS-var escape hatch). Lives in its own package so consumers that only need the card surface don't pull in the rest of `primitives`.                                                                                                             |
| `@catylast/rich-editor`   | 0.3.0   | Tiptap-backed rich text editor — dynamic toolbar (`basic`/`standard`/`full` presets), click-to-edit pattern, slash menu, mentions, panels, custom-built block drag-and-drop, image/video/file uploads, attachment cards.                                                                                                               |
| `@catylast/dynamic-table` | 0.1.0   | Generic, theme-aware data table on TanStack v8. Sorting, multi-row selection, hierarchical expansion, sticky pinned columns, column resizing, density modes, column visibility, inline editing, hover row actions, inline creator footer, pagination (footer-anchored with start/center/end positioning).                              |

### 1.2 Foundation systems

- **Tokens.** Three-tier model:
  1. **Primitive** — raw values (color ramps, spacing scale, etc.)
  2. **Semantic** — purpose-named, theme-aware (`color.text.primary`, `color.surface.background`, etc.)
  3. **Typography** — semantic slots bundling `{ fontSize, fontWeight, lineHeight, fontFamily }` (e.g. `typography.heading.large`, `typography.body.medium`, `typography.metric.large`, `typography.code`)
- **Fonts.** Inter Variable (sans) + JetBrains Mono Variable (mono). The Catylast designer specified `fontWeight.bold = 653` — a custom variable-font axis value between Semibold (600) and Bold (700). Headings, Metric, and Body Bold all use 653.
- **Theme.** Light / dark / system. Driven by `data-theme` attribute on the document root; every CSS variable resolves to the active theme's value.
- **Customization rule.** Every styling dimension on every component is exposed as **both** an enum prop (e.g. `appearance="primary"`) **AND** a CSS variable (e.g. `--btn-bg`). Consumers can override per-instance via inline `style` without forking the component.

### 1.3 Typography migration (just completed)

We migrated every shipped component off literal `fontSize: "12px"` /
`fontWeight: 600` values onto the `typography.*` semantic slots:

- 7 sizes of heading (xxlarge → xxsmall) at fontWeight 653
- 4 sizes of body (xlarge / large / medium / small), each with Regular / Medium / Bold weight variants
- 3 sizes of metric (large / medium / small) for KPI numerals with tabular-nums
- 1 code slot at 12 / 20 in JetBrains Mono Variable

The primitive `fontSize.{xs,sm,md,lg,xl,2xl,3xl,4xl,5xl}` tokens are
still defined as an escape hatch but no component references them
anymore.

### 1.4 Pagination (just shipped)

Standalone `Pagination` primitive in `@catylast/primitives` — windowed
page-number list with prev/next chevrons, controlled/uncontrolled
modes, three sizes, ellipsis for large page counts, ARIA-correct.

Wired into `DynamicTable` via a `pagination` prop with three shapes:

- Omitted → default behavior (`pageSize: 20`, `position: "center"`, auto-hide on single page)
- `false` → fully disabled, every row renders
- Object → customize `pageSize`, `position` (`start` / `center` / `end`), `hideOnSinglePage`, plus optional controlled `page` + `onPageChange`

Critical detail: the pagination footer sits **outside the scrolling row
region**. Container uses `flex-direction: column` with `height: 100%`;
scrollArea is `flex: 1` with `min-height: 0`. Pagination stays anchored
at the bottom regardless of how many rows are in the table.

### 1.5 Storybook docs

Storybook 10 (`@storybook/react-vite`) at `apps/storybook/`. Navigation
order (set via `parameters.options.storySort` in `preview.tsx`):

```
Welcome
  └─ Welcome.mdx

Foundations
  ├─ Tokens
  ├─ Theme
  ├─ Icons (Lucide registry + WorkItemTypeIcon + PriorityIcon)
  └─ Typography (5 stories: Heading / Body / Metric / Code / Overview)

Actions
  ├─ Button (full button family + states + variants)
  └─ IconButton

Forms
  ├─ Calendar
  ├─ Checkbox
  ├─ DatePicker + TimePicker (DateTime Picker subsection)
  ├─ Combobox
  ├─ Select
  └─ RichEditor (with insert-element menu showcase)

Display
  ├─ Avatar
  ├─ Badge
  ├─ Card
  └─ Comment

Overlay
  ├─ ContextMenu
  ├─ DropdownMenu
  ├─ Menu
  ├─ Popover
  └─ Tooltip

Navigation
  └─ Pagination (with windowing, sizes, controlled/uncontrolled, etc.)

Data
  └─ DynamicTable (Default / Sortable / Pinned / Selection / Expansion /
                  ColumnVisibility / CustomCells / InlineEditing /
                  Pagination / PaginationPositions / IconOnlyType /
                  WithToolbar / Compact / Comfortable / ReadOnly /
                  Empty / Loading / Showcase)
```

Every component has an MDX docs page with Examples / Code / Usage / Changelog tabs.

### 1.6 Testing / quality

- **Visual regression** — Playwright + Storybook Test Runner running against `storybook-static/`. Each story screenshotted in light + dark mode. Baselines live in `apps/storybook/tests/visual.spec.ts-snapshots/`. **Note:** baselines from this session are not yet regenerated post-typography-and-pagination changes. The new repo will need a fresh `test:visual:update` run.
- **Typecheck** — strict TS with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. All 8 workspace packages pass `pnpm -r typecheck`.
- **Lint** — ESLint flat config + Prettier.
- **No unit tests yet.** Pure-function helpers in `_dynamicTableDemo/data.ts` and similar have no Vitest coverage — added as a next-sprint item.

### 1.7 Brand sweep

Per IP positioning memory: no use of the words "Jira", "Confluence",
"Atlassian", or "Atlaskit" anywhere in user-visible content (story
descriptions, MDX docs, READMEs, changesets, source comments, demo
sample text, UI labels). The product is "Catylast" — the functionality
is Jira-like, but the brand is owned.

If any new feature is added, this rule applies. Replacement vocabulary:

- "Jira-style" → "click-to-edit" or "ticket-style" (context-dependent)
- "Confluence" UI labels → "Workspace"
- "Atlassian-style spec" → "the design-system spec"

---

## 2. What we're integrating into

The production app: `catalyst-prod-45`, owned by Vikram-Indla
(GitHub: `Vikram-Indla/catalyst-prod-45`). The local clone lives at
`c:\Users\wasim\OneDrive\Desktop\catalyst-prod-45`.

### 2.1 Stack

| Layer                        | Choice                                                                 |
| ---------------------------- | ---------------------------------------------------------------------- |
| Bundler                      | Vite 5                                                                 |
| Framework                    | React 18.3                                                             |
| Language                     | TypeScript 5.8                                                         |
| Routing                      | React Router 6                                                         |
| Backend                      | Supabase (Postgres + Auth + Realtime + Storage)                        |
| State                        | TanStack Query + Zustand                                               |
| Styling (existing)           | Tailwind 3.4 + Shadcn/ui patterns + Radix primitives                   |
| Component library (existing) | **`@atlaskit/*` — ~50 packages, the thing we're replacing**            |
| Rich editor (existing)       | `@atlaskit/editor-core` + Tiptap                                       |
| Tables (existing)            | `@atlaskit/dynamic-table` + TanStack Table                             |
| Drag-and-drop                | `@atlaskit/pragmatic-drag-and-drop` + `@dnd-kit` + `@hello-pangea/dnd` |
| Storybook                    | 8.6                                                                    |
| Package manager              | Bun (lockfile is `bun.lock`) — npm also works                          |
| Node                         | `>=20.0.0 <24.0.0` (per `engines`)                                     |
| Testing                      | Vitest + Playwright + Testing Library                                  |
| Linting                      | ESLint flat config                                                     |

### 2.2 Why we're integrating

The whole purpose of `catylast-storybook` is to **replace Atlaskit** in
this app. Reasons:

1. **License cost.** Atlaskit components are MIT but tied to Atlassian's
   ecosystem; the company wants IP it owns.
2. **Brand identity.** Catylast is positioned as its own product, not
   an Atlassian one.
3. **Upgrade discipline.** Atlaskit's breaking changes are out of the
   team's control; our components freeze when we decide.
4. **Bundle size.** Atlaskit packages pull in a lot of cross-package
   dependencies. Our `@catylast/*` packages are much smaller.

### 2.3 What's already in the prod repo (don't disturb)

- `src/` with ~33 top-level folders — pages, modules, features, contexts, hooks, integrations, etc.
- `src/design-system/showcase/` — an internal design-system showcase (different concept; not our packages)
- `.storybook/` — Storybook 8.6 config + stories already present
- `supabase/` — DB migrations and edge functions
- `e2e/`, `tests/` — Playwright suites
- `CLAUDE.md` — 55 KB of project-specific implementation rules (banned integrations, shell-command patterns, etc.)
- Multiple `HANDOVER-*.md` files and `PHASE_*_COMPLETION.md` files documenting prior sprints

**Critical:** every existing file is load-bearing. The migration is
**additive** — we add our packages alongside existing code, then migrate
imports one component at a time. We never delete or overwrite existing
files until the corresponding Atlaskit imports are gone.

---

## 3. Migration architecture — Option A

We use **workspace packages**. The prod repo becomes a Bun workspace
with two roots:

```
catalyst-prod-45/
├── package.json                  (workspace root — declares packages/*)
├── apps/                         (NEW — optional, see §3.3)
│   └── storybook-catylast/       (NEW — relocated from catylast-storybook/apps/storybook)
├── packages/                     (NEW — relocated from catylast-storybook/packages)
│   ├── tokens/
│   ├── theme/
│   ├── icons/
│   ├── primitives/
│   ├── card/
│   ├── rich-editor/
│   └── dynamic-table/
├── src/                          (existing — the prod app)
├── .storybook/                   (existing — Storybook 8.6 for the app)
├── public/
├── supabase/
└── ...                           (all other existing files unchanged)
```

The prod app's `src/` keeps importing from `@atlaskit/*` exactly as
today. When we migrate a screen, we change that screen's imports from
`@atlaskit/button` to `@catylast/primitives` (etc.) and verify nothing
breaks. Both work in parallel.

### 3.1 Why workspace packages, not npm publishing

- **Local-only iteration.** A workspace setup lets us edit `packages/primitives/Button.tsx` and see the change in the prod app's `src/` immediately, with no `npm publish` step in between.
- **One git history.** The prod app and the design system are tightly coupled — they evolve together. Splitting into separate repos with separate release cycles is friction without benefit.
- **No registry setup needed.** Publishing to npm requires a private registry (for IP reasons) or a public scope; both add operational complexity.
- **Future migration to npm is still possible** — once the components are stable across a few release cycles, we can split them out into a separate repo and publish without a code rewrite.

### 3.2 Coexistence — Tailwind + vanilla-extract

Tailwind utility classes (used by prod app) and vanilla-extract scoped
classes (used by our packages) coexist cleanly because:

- They generate different class names — no collision risk
- Tailwind only processes `content` paths it's configured to watch (currently `src/**/*.{ts,tsx}`); it ignores `packages/`
- vanilla-extract generates hashed class names per component file — Tailwind's reset / preflight doesn't touch them

No config changes needed for this to work — both build into the same final CSS bundle.

### 3.3 Storybook — two or one?

Two options:

- **Two Storybooks initially.** Keep prod's Storybook 8.6 (`storybook` script) on port 6006. Add our Storybook 10 (`storybook:catylast` script) on port 6007. Two storybooks during the migration; collapse to one once Storybook 8 → 10 upgrade is done.
- **Upgrade to one Storybook 10.** Bump prod's Storybook from 8.6 → 10 first, then merge our stories into the existing `.storybook/` config. Bigger upfront effort but cleaner end state.

**Recommendation: two Storybooks first.** Less risky. Prod's existing
visual regression tests stay green; our work doesn't perturb them.
Schedule the Storybook upgrade as its own follow-up task.

---

## 4. Step-by-step migration procedure

### Phase 1 — Setup (1 PR, ~2 hours)

The goal of Phase 1 is to land the `@catylast/*` packages in the prod
repo **without changing a single import in `src/`**. After Phase 1,
running `bun run dev` on the prod app produces the same output as
before; running `bun run storybook:catylast` boots our Storybook 10 on
port 6007 with all stories intact.

Steps:

1. **Create a feature branch** in the prod repo: `feat/catylast-component-library`.
2. **Copy `packages/` from `catylast-storybook` into `catalyst-prod-45/packages/`.** Preserve folder structure (`tokens/`, `theme/`, `icons/`, `primitives/`, `card/`, `rich-editor/`, `dynamic-table/`).
3. **Copy `apps/storybook/` from `catylast-storybook` into `catalyst-prod-45/apps/storybook-catylast/`.** Rename to avoid conflict with prod's `.storybook/`.
4. **Convert `pnpm-workspace.yaml` → Bun workspaces.** Delete the old yaml; add `"workspaces": ["packages/*", "apps/*"]` to the prod root `package.json`.
5. **Reconcile root devDependencies** — the prod root needs `tsup`, `changesets`, `turbo` (or skip turbo and rely on bun's parallel scripts).
6. **Add scripts to the prod root `package.json`:**
   - `"build:catylast": "bun run --filter '@catylast/*' build"`
   - `"storybook:catylast": "bun run --filter @catylast/storybook dev"`
   - `"typecheck:catylast": "bun run --filter '@catylast/*' typecheck"`
7. **Update `tsconfig.json`** to add `paths` mappings so the prod app's `src/` can resolve `@catylast/*` to the workspace packages without going through `dist/`:
   ```json
   "paths": {
     "@catylast/tokens": ["./packages/tokens/src/index.ts"],
     "@catylast/theme": ["./packages/theme/src/index.ts"],
     "@catylast/icons": ["./packages/icons/src/index.ts"],
     "@catylast/primitives": ["./packages/primitives/src/index.ts"],
     "@catylast/card": ["./packages/card/src/index.ts"],
     "@catylast/rich-editor": ["./packages/rich-editor/src/index.ts"],
     "@catylast/dynamic-table": ["./packages/dynamic-table/src/index.ts"]
   }
   ```
8. **Import the tokens CSS once** in prod's `src/main.tsx`:
   ```ts
   import "@catylast/tokens/tokens.css";
   import "@catylast/primitives/styles.css";
   // ... existing imports
   ```
9. **Install `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono`** as prod app deps (they were previously only in `apps/storybook/package.json`).
10. **Run `bun install`** at the prod root. All workspace symlinks should resolve cleanly.
11. **Verify the prod app still builds and runs:** `bun run dev`. Open `localhost:8080`, click through 3-5 key screens. Nothing should look or behave differently.
12. **Verify our Storybook boots:** `bun run storybook:catylast`. Open `localhost:6007`. All stories from `catylast-storybook` should load.
13. **Open a PR** with title `feat: vendor @catylast component library as workspace packages`. **No `src/` imports changed yet** — this PR is pure infrastructure.

After this PR merges, the prod app continues to use Atlaskit; we just have our packages sitting alongside, ready to be consumed.

### Phase 2 — Single-component proof of concept (1 PR per component, ~1-2 hours each)

Pick the smallest, lowest-risk component to migrate first. **Recommendation: `Badge`.**

1. **Branch:** `feat/catylast-migrate-badge`.
2. **Find all `@atlaskit/badge` imports** in `src/`:
   ```bash
   grep -rn "@atlaskit/badge" src/
   ```
3. **For each occurrence:**
   - Replace the import with `import { Badge } from "@catylast/primitives";`
   - Adjust the props if the API differs (most should match conceptually but token names may differ)
4. **Visual diff.** Open `localhost:8080` and visit every page that uses Badge. Compare side-by-side with main.
5. **Run tests:** `bun run test` (Vitest unit tests), `bun run test:visual` (Playwright).
6. **PR.** Title: `feat: migrate Badge from @atlaskit to @catylast`. Include before/after screenshots in the PR body.

Repeat the same pattern for each component. The migration order below is rough — adjust per actual usage in `src/`.

### Phase 3 — Per-component migration order

Smallest blast radius first. Each row is its own PR.

| Order | Component                   | Atlaskit source                       | Catylast target                                                                             | Risk                                                                     |
| ----- | --------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1     | Badge                       | `@atlaskit/badge`                     | `@catylast/primitives` → `Badge`                                                            | Low                                                                      |
| 2     | Tooltip                     | `@atlaskit/tooltip`                   | `@catylast/primitives` → `Tooltip`                                                          | Low                                                                      |
| 3     | Avatar                      | `@atlaskit/avatar`                    | `@catylast/primitives` → `Avatar`                                                           | Low                                                                      |
| 4     | Spinner                     | `@atlaskit/spinner`                   | NOT BUILT YET — add to backlog                                                              | Skip                                                                     |
| 5     | Button                      | `@atlaskit/button`                    | `@catylast/primitives` → `Button`, `IconButton`, `LinkButton`, `SplitButton`, `ButtonGroup` | Medium (high usage)                                                      |
| 6     | Checkbox                    | `@atlaskit/checkbox`                  | `@catylast/primitives` → `Checkbox`                                                         | Low                                                                      |
| 7     | Toggle                      | `@atlaskit/toggle`                    | NOT BUILT YET — add to backlog                                                              | Skip                                                                     |
| 8     | Select                      | `@atlaskit/select`                    | `@catylast/primitives` → `Select` family                                                    | Medium                                                                   |
| 9     | DropdownMenu                | `@atlaskit/dropdown-menu`             | `@catylast/primitives` → `DropdownMenu` family                                              | Medium (per CLAUDE.md rule: prod app uses Atlaskit dropdown universally) |
| 10    | DatePicker / DateTimePicker | `@atlaskit/datetime-picker`           | `@catylast/primitives` → `DatePicker`, `TimePicker`                                         | Medium                                                                   |
| 11    | Calendar                    | (none)                                | `@catylast/primitives` → `Calendar`                                                         | Low                                                                      |
| 12    | Tabs                        | `@atlaskit/tabs`                      | NOT BUILT YET — add to backlog                                                              | Skip                                                                     |
| 13    | Modal                       | `@atlaskit/modal-dialog`              | NOT BUILT YET — add to backlog                                                              | Skip                                                                     |
| 14    | Popover                     | `@atlaskit/popup`                     | `@catylast/primitives` → `Popover`                                                          | Medium                                                                   |
| 15    | DescriptionList             | (Atlassian's heading family + custom) | NOT BUILT YET — backlog                                                                     | Skip                                                                     |
| 16    | Form / Field                | `@atlaskit/form`                      | NOT BUILT YET — backlog                                                                     | Skip                                                                     |
| 17    | Card / Lozenge / Tag        | `@atlaskit/lozenge` etc.              | `@catylast/card` → `Card`; `@catylast/primitives` → `Badge` (covers Lozenge usage)          | Medium                                                                   |
| 18    | Comment                     | (Atlassian inline editor)             | `@catylast/primitives` → `Comment`                                                          | Medium                                                                   |
| 19    | DynamicTable                | `@atlaskit/dynamic-table`             | `@catylast/dynamic-table`                                                                   | **High** — biggest single migration, every row + column renderer changes |
| 20    | RichEditor                  | `@atlaskit/editor-core`               | `@catylast/rich-editor`                                                                     | **High** — Tiptap-based; check ADF compatibility carefully               |

Items marked **NOT BUILT YET** mean we shipped this library before
implementing that component. Don't migrate those — leave them on
Atlaskit and add them to the `catylast-storybook` backlog as a separate
planning task.

### Phase 4 — Cleanup (1 PR, ~1 hour)

Once every migratable component is off Atlaskit:

1. **Audit remaining Atlaskit deps.** `grep -rn "@atlaskit/" src/`. The only remaining imports should be for components we never built (Spinner, Toggle, Tabs, Modal, Form, DescriptionList).
2. **Remove unused Atlaskit packages from `package.json`.** For each `@atlaskit/*` in `dependencies` that has no `src/` reference, drop it.
3. **Bundle size win.** Run `bun run build` and compare bundle output before/after. Expect significant reduction.
4. **Collapse the two storybooks.** Bump prod's Storybook 8 → 10. Merge our `apps/storybook-catylast/.storybook/main.ts` story globs into prod's `.storybook/main.ts`. Delete the now-duplicate apps/storybook-catylast folder.
5. **Update CLAUDE.md.** The existing rule that "Hand-rolled dropdowns must be replaced with `@atlaskit/dropdown-menu`" becomes "Hand-rolled dropdowns must be replaced with `@catylast/primitives` `DropdownMenu`". Sweep similar rules.
6. **Final visual regression.** Regenerate baselines from the unified Storybook. Commit.

---

## 5. Risks and mitigations

| Risk                                                                                                                | Likelihood | Impact         | Mitigation                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------- | ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual regression mid-migration (a page looks different after swapping a component)                                 | High       | Medium         | Playwright snapshots from our Storybook are the source of truth. Compare before/after screenshots in every migration PR.                                                           |
| Atlaskit and Catylast components on the same page look visually inconsistent during migration                       | Certain    | Low (cosmetic) | Acceptable. Migration is temporary; final state has all Catylast components.                                                                                                       |
| `@catylast/dynamic-table` API differs enough from `@atlaskit/dynamic-table` that Phase 3 step 19 is a major rewrite | Medium     | High           | Audit prod's table usage early (Phase 2). If significant API gap, extend `@catylast/dynamic-table` to match before migrating.                                                      |
| Tiptap ADF (Atlassian Document Format) docs in prod don't render cleanly in `@catylast/rich-editor`                 | Medium     | High           | Audit prod's editor schema. Build a one-shot ADF → Catylast schema converter if needed. Plan for a longer migration window for this single component.                              |
| Bun workspaces don't resolve `@catylast/*` correctly with our existing `pnpm-workspace.yaml` baggage                | Low        | Low            | Delete `pnpm-workspace.yaml` after copying files; rely on root `package.json` `workspaces` field. Run `rm -rf node_modules && bun install` if symlinks misbehave.                  |
| Tokens CSS variables collide with Tailwind's                                                                        | Low        | Low            | Our vars are all `--catylast-*` prefixed. No collision possible with Tailwind's `--tw-*` prefix.                                                                                   |
| React version mismatch (prod 18.3 vs our peer dep 18 OR 19)                                                         | Low        | Low            | Our packages list `"react": "^18.3.0 \|\| ^19.0.0"` as peer dep. Prod uses 18.3. Resolves cleanly.                                                                                 |
| Inter Variable / JetBrains Mono Variable don't load in prod                                                         | Low        | Medium         | Import `@fontsource-variable/*` in `src/main.tsx` (Phase 1 step 9). Verify in Chrome DevTools → Network. Without the variable fonts loaded, weight 653 silently falls back to 700. |
| Vikram-Indla's reviews require coordination                                                                         | Certain    | Low            | Treat each migration PR as a standalone, reviewable unit. Small, focused, with screenshots.                                                                                        |

---

## 6. How to resume Claude Code in the new repo

Claude Code sessions are keyed to the working directory. You can't
literally "open this exact chat" inside `catalyst-prod-45`, but you can
hand a fresh Claude session the same context.

### 6.1 Copy the memory files

```powershell
# Source: this repo's auto-memory
$src = "C:\Users\wasim\.claude\projects\C--Users-wasim-OneDrive-Desktop-catylast-storybook\memory"

# Destination: the new repo's auto-memory location (create if missing)
$dst = "C:\Users\wasim\.claude\projects\C--Users-wasim-OneDrive-Desktop-catalyst-prod-45\memory"
New-Item -ItemType Directory -Force -Path $dst
Copy-Item -Path "$src\*" -Destination $dst -Recurse -Force
```

Memory files carried over:

- `user_role.md` — frontend dev, building UI library for employer
- `project_catylast.md` — internal Jira-alternative app
- `project_catalyst_prod.md` — the prod repo context (this very thing)
- `project_rich_editor.md` — Tiptap-based editor decisions
- `feedback_ip_positioning.md` — no Jira/Confluence/Atlassian names anywhere visible
- `feedback_component_customization.md` — every styling dimension exposed as both enum prop AND CSS variable
- `MEMORY.md` — the index

### 6.2 CLAUDE.md carries with the code

The `CLAUDE.md` from `catylast-storybook` should be **renamed**
(prod has its own `CLAUDE.md`) and dropped into the new repo as
`CLAUDE_CATYLAST.md` or appended to the existing `CLAUDE.md` under a
new top-level section `# Component Library (@catylast/*)`.

### 6.3 Recommended first prompt in the new repo

> Read `MIGRATION.md` (Catylast component library handoff) and confirm
> where we are in the migration. Phase 1 setup is [done / in progress /
>
> > not started — fill in]. Today I want to [next thing].

The new Claude session will read this doc, the carried-over memory, and
the prod CLAUDE.md, and have effectively the same context as this
session.

### 6.4 When to delete `catylast-storybook`

**Not yet.** Keep it as a read-only reference until:

1. Phase 1 is merged and verified
2. At least 3 components are successfully migrated in Phase 2/3 (proves the integration works end-to-end)
3. Baseline screenshots have been regenerated in the prod repo
4. You've gotten through one full week of dev work in the new repo with no need to consult the old one

Then delete it. The git history is preserved in the original GitHub
remote anyway.

---

## 7. Appendix

### 7.1 Key files reference

| File                                                    | What it does                                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `packages/tokens/src/definitions.ts`                    | All primitive + semantic + typography token values. Single source of truth.                                                   |
| `packages/tokens/scripts/build-css.ts`                  | Emits `dist/tokens.css` with CSS custom properties scoped by `data-theme`.                                                    |
| `packages/tokens/tsup.config.ts`                        | Has `onSuccess: "tsx scripts/build-css.ts"` — critical for `tsup --watch` to regenerate tokens.css on every JS rebuild.       |
| `packages/*/src/*.css.ts`                               | vanilla-extract style files. Reference `typography.*` slots for fonts, semantic `color.*` for colors, never hardcoded values. |
| `apps/storybook/.storybook/preview.tsx`                 | Storybook globals — theme toolbar, font loading, decorators.                                                                  |
| `apps/storybook/src/Foundations/Typography.stories.tsx` | The canonical typography reference page. Designer's spec lives here.                                                          |

### 7.2 Conventions to carry over

- **No hardcoded colors, sizes, radii, shadows, or font sizes** in component code. Everything resolves through `@catylast/tokens`.
- **Theme-agnostic.** No `if (theme === 'dark')` in component logic. Theme differences are token values.
- **Customization rule.** Every styling dimension exposed as enum prop **and** CSS variable.
- **No "Jira" / "Confluence" / "Atlassian" anywhere visible.** Functionality is Jira-like; vocabulary is Catylast-owned.
- **Generic and composable.** Public APIs use TypeScript generics for parametric components (`DynamicTable<Row>`, `Combobox<Item>`).
- **Stories cover every state.** Default, hover, focus-visible, disabled, loading, empty, error.

### 7.3 Sprint log — what got built when

(Most recent first. Dates are approximate.)

- **Pagination** — `@catylast/primitives` `Pagination` primitive + `DynamicTable` `pagination` prop with `start`/`center`/`end` positioning. Footer anchored outside scroll region.
- **Install commands sweep** — all 17 component MDX docs + READMEs show pnpm/npm/yarn variants.
- **Brand sweep** — every visible "Jira" / "Confluence" / "Atlassian" / "Atlaskit" removed from source, comments, docs, changelogs. Internal-only references stay in CLAUDE.md `§17` (renamed sections).
- **Typography migration** — every component migrated off legacy `fontSize.{xs,sm,md,...}` onto `typography.{heading,body,metric,code}.*` slots. Inter Variable + JetBrains Mono Variable loaded. `fontWeight.bold` changed from 700 to 653 per designer spec.
- **Typography foundation** — `typography.*` semantic slots added; `<Heading>`, `<Text>`, `<Metric>`, `<Code>` primitives shipped; `Foundations/Typography` Storybook page mirroring designer's reference.
- **Package rename** — `@catylast/react-primitives` → `@catylast/primitives`, `@catylast/react-dynamic-table` → `@catylast/dynamic-table`. Dropped the `react-` prefix repo-wide.
- **DynamicTable showcase polish** — Done strike-through on prefix only, project-scoped ticket key system (CAT/IRP/SS prefixes), `LinkButton` for ticket keys, IconOnlyType story demonstrating `previewTitle={false}`.
- **DynamicTable inline editing** — click-to-edit title (like assignee/status), inline-editable priority with brand icons, fix for dropdown clipping (kebab/camel CSS-var mismatch in `_buildVars.ts`).
- **Brand icons** — 14 work-item type icons + 6 priority icons, both with `previewTitle` prop. Lives in `@catylast/icons`.
- **DropdownMenu family** — full surface area (DropdownMenu, DropdownItem, DropdownItemGroup, DropdownItemCheckbox, DropdownItemRadioGroup, sub-menus). Wired into DynamicTable's `+ Create` and per-row kebab.
- **Date / Time pickers** — DatePicker (input + Calendar popover), TimePicker (input + time list), with 12h/24h support.
- **Comment** — author / type / time / restricted / actions / nested replies, deterministic name-hashed avatar colors.
- **Checkbox** — full state model (isChecked, isIndeterminate, isDisabled, isInvalid, isRequired).
- **Calendar** — standalone calendar primitive.
- **Button family** — Button, IconButton, LinkButton, LinkIconButton, SplitButton, ButtonGroup with appearance / size / spacing / state surface area.
- **Card** — own package, three variants × five states × four named slots, polymorphic `as` prop.
- **RichEditor** — Tiptap-backed, dynamic toolbar, click-to-edit, slash menu, mentions, panels, custom block DnD, image/video/file uploads.
- **DynamicTable v0.1** — sorting, pinning, expansion, selection, column visibility, hover actions, inline editing, density modes.
- **Foundations** — tokens (kebab-case CSS var bug fixed), theme provider, icons (Lucide registry).

### 7.4 Outstanding tasks (not blockers for migration)

- Spinner primitive
- Toggle / Switch primitive
- Tabs
- Modal (and ConfirmDialog)
- Form / Field wrapper
- Toast / InlineMessage / Banner
- ProgressBar / ProgressCircle / Skeleton
- EmptyState / ErrorState
- Breadcrumbs
- Stepper
- Tree
- DescriptionList
- Timeline (Gantt-style — composite built on DynamicTable)
- WorkItemCard composition (separate package, built on top of `Card`)

These are documented in `CLAUDE.md` §3 "Component roadmap". The
migration doesn't require these to be built first — the prod app keeps
its Atlaskit imports for these components until we ship them.

### 7.5 Versions at handoff time

```
@catylast/tokens          0.2.0
@catylast/theme           0.1.0
@catylast/icons           0.2.0
@catylast/primitives      0.8.0
@catylast/card            0.1.0
@catylast/rich-editor     0.3.0
@catylast/dynamic-table   0.1.0
```

After Phase 4 of the migration (cleanup), bump everything to `1.0.0`
and tag the release in the new repo.

---

## 8. TL;DR for the new Claude session

You're picking up a component library migration. The library
(`@catylast/*` — tokens, theme, icons, primitives, card, rich-editor,
dynamic-table) lives in `packages/` as Bun workspace packages. The
goal is to replace ~50 `@atlaskit/*` imports in `src/` one component
at a time. Phase 1 (setup) lands the packages without touching `src/`.
Phase 2/3 migrates one component per PR. Phase 4 removes Atlaskit and
collapses to one Storybook.

Visual fidelity to Atlassian's design is the target; the word
"Atlassian" never appears in user-visible content. Every styling
dimension is exposed as both an enum prop and a CSS variable. Tokens
are primitive → semantic → typography in three tiers.

Read `CLAUDE.md` (project rules), `CLAUDE_CATYLAST.md` (component
library rules — from the old repo), and the carried-over memory files.
Then ask the user where in the migration they are.
