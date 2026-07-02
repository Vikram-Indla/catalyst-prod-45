# Catalyst Rules Engine — Locked Rule Table

> **This file is the source of truth for all Catalyst product rules.**
> Every row was confirmed by Vikram. Changes require `/cre update [row-id] "[new rule]"` and a new confirmation.
> `CatalystRules.ts` implements these rows exactly. If they diverge, this file wins.

Confirmed: 2026-07-01 · Council session: CRE design + opportunity analysis

---

## GRID A — Module Ownership

Each work item type belongs to exactly one module.
Subtask family is universal (permitted in all modules).

| ID  | Type (Display)      | Kind               | Module    | Migration Needed |
|-----|---------------------|--------------------|-----------|-----------------|
| A1  | Story               | `story`            | TEAM      | No              |
| A2  | Epic                | `epic`             | PROGRAM   | No              |
| A3  | Feature             | `feature`          | TEAM      | No              |
| A4  | QA Bug              | `defect`           | TESTHUB   | **Yes** — was TEAM |
| A5  | Production Incident | `incident`         | INCIDENT  | **Yes** — was TEAM |
| A6  | Business Request    | `business_request` | PRODUCT   | No              |
| A7  | Business Gap        | `business_gap`     | PRODUCT   | No              |
| A8  | Change Request      | `change_request`   | TEAM      | No              |
| A9  | Task                | `task`             | TEAM      | No              |
| A10 | Subtask family      | `subtask`          | Universal | No              |
| A11 | Test Case           | `test_case`        | TESTHUB   | No              |
| A12 | Test Cycle          | `test_cycle`       | TESTHUB   | No              |
| A13 | Theme               | `theme`            | ENTERPRISE| No              |
| A14 | Objective           | `objective`        | ENTERPRISE| No              |

**Subtask family types (universal child, all modules):**
Sub-task, Backend, Frontend, Figma, Integration, API Requirement, BRD Task

---

## GRID B — Hierarchy (Parent → Children)

Structural parent_key relationships. A type not listed as an allowed child cannot be created under that parent.

| ID  | Parent Type         | Allowed Children                                                                                      |
|-----|---------------------|-------------------------------------------------------------------------------------------------------|
| B1  | Business Request    | Epic                                                                                                  |
| B2  | Epic                | Feature, Story, Task, QA Bug, Change Request, Production Incident, Business Gap, + subtask family     |
| B3  | Feature             | Story                                                                                                 |
| B4  | Story               | Subtask family                                                                                        |
| B5  | Task                | Subtask family                                                                                        |
| B6  | QA Bug              | Subtask family                                                                                        |
| B7  | Production Incident | Subtask family                                                                                        |
| B8  | Change Request      | Subtask family                                                                                        |
| B9  | Business Gap        | None (leaf)                                                                                           |
| B10 | Subtask family      | None (leaf)                                                                                           |

**Explicit hierarchy violations (enforced as bans):**

| ID  | Rule                                    | Enforcement |
|-----|-----------------------------------------|-------------|
| B11 | Epic CANNOT be a child of Story         | Epic not in Story's allowed children |
| B12 | Story CANNOT be a child of Story        | Story not in Story's allowed children |
| B13 | Any type CANNOT be its own child        | Same-type child creation banned universally |

---

## GRID C — Link Rules (ph_issue_links)

Many-to-many cross-references. Banned pairs are rejected by `canLinkTo()`.
All non-banned pairs are allowed unless explicitly listed here.

### Banned link pairs

| ID  | Type A              | Type B           | Rule    | Reason                                      |
|-----|---------------------|------------------|---------|---------------------------------------------|
| C1  | Business Request    | QA Bug           | ❌ BAN  | BR is product-level; defects belong in QA chain |
| C3  | Production Incident | QA Bug           | ❌ BAN  | Incidents and defects are separate domains  |
| C10 | Any type            | Same type        | ❌ BAN  | Self-type linking creates circular ambiguity (Story→Story, Epic→Epic, etc.) |

### Explicit allow (override of any future conservative default)

| ID  | Type A              | Type B              | Rule      | Reason                                   |
|-----|---------------------|---------------------|-----------|------------------------------------------|
| C2  | Business Request    | Production Incident | ✅ ALLOW  | Incidents can trace back to a BR         |
| C4  | Story               | QA Bug              | ✅ ALLOW  | Story-to-defect traceability             |
| C5  | Epic                | QA Bug              | ✅ ALLOW  | Epic-level defect tracking               |
| C6  | Story               | Production Incident | ✅ ALLOW  | Story may surface an incident            |
| C7  | Business Request    | Story               | ✅ ALLOW  | BR → delivery traceability               |
| C8  | Business Request    | Epic                | ✅ ALLOW  | BR → program traceability                |
| C9  | QA Bug              | Test Case           | ✅ ALLOW  | Defect ↔ test case traceability          |

---

## GRID D — Creation Rights

Each module may only create the types it owns, plus subtask family.

| ID  | Module    | Types Permitted to Create                                     |
|-----|-----------|---------------------------------------------------------------|
| D1  | TEAM      | Story, Feature, Task, Change Request + subtask family         |
| D2  | PRODUCT   | Business Request, Business Gap + subtask family               |
| D3  | PROGRAM   | Epic + subtask family                                         |
| D4  | TESTHUB   | QA Bug, Test Case, Test Cycle + subtask family                |
| D5  | INCIDENT  | Production Incident + subtask family                          |
| D6  | ENTERPRISE| Theme, Objective, Snapshot                                    |

---

## GRID E — UI Pattern Rules

Hub navigation patterns enforced on all route surfaces.

### E1 — L1 Hub List Pages

| ID | Rule | Enforcement |
|----|------|-------------|
| E1 | L1 list route MUST use `CatalystListPageLayout chromeBand={<ProjectPageHeader hubType projectKey />}` — NO `trail`, NO `title` props. `deriveRouteWord()` auto-fills section name from URL. | Ban `CatalystPageHeader` on L1; ban explicit `title` prop on L1 `ProjectPageHeader` |

Canonical: `src/pages/project-hub/filters/FiltersListPage.tsx`

```tsx
// L1 — CORRECT
<CatalystListPageLayout chromeBand={<ProjectPageHeader projectKey={key} hubType="project" />}>
  <JiraTable ... />
</CatalystListPageLayout>
```

### E2 — L2 Hub Detail Pages

| ID | Rule | Enforcement |
|----|------|-------------|
| E2 | L2 detail route MUST use `AtlaskitPageShell flush chromeBand={<ProjectPageHeader trail={[{text,href}]} title={name} />}`. `trail` adds clickable L1 crumb; `title` becomes bold current crumb. | Ban missing `trail` on detail pages; ban `breadcrumbs` prop (unsupported by ProjectPageHeader, silently dropped) |

Canonical: `src/pages/project-hub/filters/FilterDetailPage.tsx`

```tsx
// L2 — CORRECT
<AtlaskitPageShell flush chromeBand={
  <ProjectPageHeader
    projectKey={key}
    hubType="project"
    trail={[{ text: 'Filters', href: `/project-hub/${key}/filters` }]}
    title={filter.name}
  />
}>
```

### E3 — CatalystPageHeader Ban on Hub Routes

| ID | Rule | Enforcement |
|----|------|-------------|
| E3 | `CatalystPageHeader` BANNED on all hub routes — no breadcrumb support. Any hub route using it MUST migrate to `ProjectPageHeader`. | `grep -r "CatalystPageHeader" src/pages/` → zero results on hub routes |

### E4 — Global Hub Pages (no `:key` in URL)

| ID | Rule | Enforcement |
|----|------|-------------|
| E4 | Global hub pages (incident-hub, testhub, release-hub, tasks, all-projects, all-products) MUST use `ProjectPageHeader hubType={…}` without `projectKey`. Same L1/L2 pattern applies. | `projectKey` omitted; `hubType` drives root crumb |

```tsx
// Global L1 — CORRECT
<ProjectPageHeader hubType="project" actions={<Button>Create</Button>} />
```

### E5 — Hand-rolled Breadcrumbs Ban

| ID | Rule | Enforcement |
|----|------|-------------|
| E5 | Hand-rolled `<nav>` breadcrumbs, standalone `<Breadcrumbs>` in hub chrome, and skip-level breadcrumbs (L2 without L1 crumb in `trail`) BANNED. `ProjectPageHeader trail` is sole sanctioned mechanism. | Reject any PR adding `<nav>` / `<Breadcrumbs>` to hub chrome layer |

---

## GRID F — Slug & URL Contract

Every route that navigates to an entity MUST use a human-readable slug, key, or
display-key. UUIDs are permanently banned from URL params. This grid is enforced
at code-review, pre-commit, and via `CatalystRules.isValidRouteParam()`.

### F1 — No UUID/bare-ID in route params

| ID | Rule | Enforcement |
|----|------|-------------|
| F1 | Route params MUST NOT end in `Id`, `ID`, `_id`, `uuid`, or `UUID`. Only `:slug`, `:key`, `:*Key`, or `:*Slug` suffixes allowed. | `grep -rn '/:.*[Ii][Dd]\b\|/:.*uuid' src/routes/` → zero results |

**Banned param names (examples):** `:boardId`, `:teamId`, `:portfolioId`, `:cycleId`, `:releaseId`, `:filterId`, `:sprintId`, `:id`

**Allowed param names (examples):** `:boardSlug`, `:teamSlug`, `:portfolioKey`, `:cycleKey`, `:releaseSlug`, `:filterId` ← **only** when the column is named `slug` or `key` on the table

### F2 — Every new navigable table needs a slug column

| ID | Rule | Enforcement |
|----|------|-------------|
| F2 | Any new Supabase table with a detail route MUST ship: (a) `slug TEXT NOT NULL UNIQUE` column, (b) `catalyst_slugify()`-based INSERT trigger, (c) entry in `src/lib/routes.ts`, (d) `useXBySlug()` dual-mode resolution hook. | Migration review checklist item; CRE pre-commit hook |

Canonical trigger pattern (must match exactly):
```sql
CREATE OR REPLACE FUNCTION public.<table>_set_slug() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE base_slug TEXT; candidate TEXT; counter INT := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN RETURN NEW; END IF;
  base_slug := catalyst_slugify(NEW.name);
  IF base_slug IS NULL OR base_slug = '' THEN base_slug := '<prefix>-' || substring(NEW.id::text, 1, 8); END IF;
  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.<table> WHERE slug = candidate AND id IS DISTINCT FROM NEW.id)
  LOOP candidate := base_slug || '-' || counter; counter := counter + 1; END LOOP;
  NEW.slug := candidate; RETURN NEW;
END; $$;
```

### F3 — URL construction via `Routes.*` builders only

| ID | Rule | Enforcement |
|----|------|-------------|
| F3 | All navigation call sites MUST use typed builders from `src/lib/routes.ts`. String-concatenating a UUID into a URL path (e.g. `` `/board/${board.id}` ``) is banned. | `grep -rn 'navigate.*\$\{[a-zA-Z]*\.[Ii][Dd]\}' src/` → zero results on nav call sites |

```typescript
// BANNED
navigate(`/project-hub/${key}/boards/${board.id}`)

// REQUIRED
import { Routes } from '@/lib/routes';
navigate(Routes.projectHub.board(key, board.slug))
```

### F4 — Dual-mode resolution in every slug hook

| ID | Rule | Enforcement |
|----|------|-------------|
| F4 | Every `useXBySlug()` hook MUST accept both slug AND UUID via `isValidUUID(param) ? 'id' : 'slug'`. This provides backward compat for any stale UUID links until Phase 4 permanent redirects land. | Hook code review; `isValidUUID` import required |

```typescript
// REQUIRED pattern in every resolution hook
const field = isValidUUID(slugOrId) ? 'id' : 'slug';
const { data } = await supabase.from('table').select('...').eq(field, slugOrId).maybeSingle();
```

### F5 — Slugs are frozen on creation

| ID | Rule | Enforcement |
|----|------|-------------|
| F5 | A slug is derived from `name` at INSERT time via `catalyst_slugify()`. It NEVER changes when the entity is renamed. `name` / `display_name` can change freely. Dedup suffix (`-2`, `-3`) appended at creation if collision. | INSERT trigger must guard `IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN RETURN NEW` — never overwrite existing slug |

### F6 — UUID→slug redirects mount OUTSIDE CatalystShell

| ID | Rule | Enforcement |
|----|------|-------------|
| F6 | Any component that redirects a UUID URL to its slug equivalent MUST be mounted in `FullAppRoutes.tsx` OUTSIDE the `<CatalystShell>` wrapper. Mounting inside CatalystShell causes Navigate re-render loops. | Code review; canonical pattern: `IncidentBacklogKeyRedirect` in `FullAppRoutes.tsx` |

---

## GRID G — Avatar & People Picker Contract

Every surface that renders a user identity (assignee, reporter, member, owner) MUST use the canonical avatar stack. No exceptions.

### G1 — Canonical Avatar Component

| ID | Rule | Enforcement |
|----|------|-------------|
| G1 | Every user/assignee/reporter/member identity render MUST use `CatalystAvatar` (`@/components/shared/CatalystAvatar`) or `UserAvatar` (`@/components/shared/UserAvatar`). Direct `@atlaskit/avatar` or `@atlaskit/avatar-group` imports in product code are BANNED. | ESLint `no-restricted-imports` gate in `eslint.config.js`; `grep -rn "from '@atlaskit/avatar'" src/ | grep -v "CatalystAvatar.tsx\|Avatar.tsx"` → zero results |

**Canonical hierarchy (use in this order):**
1. `UserAvatar` — face component with country flag chip; use where profile context is shown
2. `CatalystAvatar` — photo → ADS-palette initials → nothing; use everywhere else
3. `@atlaskit/avatar` — ALLOWED ONLY in `src/components/ads/Avatar.tsx` and `src/components/shared/CatalystAvatar.tsx`

**Canonical references:**
- `src/components/shared/CatalystAvatar.tsx` — canonical wrapper
- `src/components/shared/UserAvatar.tsx` — face component

### G2 — Fallback Chain (mandatory)

| ID | Rule | Enforcement |
|----|------|-------------|
| G2 | Avatar fallback chain is FIXED and must be respected by all callers: (1) local bundled photo via `resolveAvatarUrl(name)` — if found, renders image; (2) deterministic ADS-palette initials circle derived from name hash — if no photo; (3) nothing (empty avatar slot). External CDN URLs (Gravatar, `atl-paas.net`, `googleusercontent.com`) are BANNED — `isBannedAvatarSrc()` in `CatalystAvatar` rejects them at runtime. | `CatalystAvatar.isBannedAvatarSrc()` blocks banned URLs at render time |

**BANNED fallback patterns:**
```tsx
// BANNED — gray silhouette, bypasses CDN ban + ADS palette
<Avatar name={user.name} src={user.avatarUrl} />

// BANNED — custom initials span, not ADS palette
<span style={{ background: '#333', color: 'white' }}>{initials}</span>

// BANNED — raw img tag for user photo
<img src={user.gravatar} alt={user.name} />
```

**REQUIRED pattern:**
```tsx
// CORRECT — CatalystAvatar handles photo → initials → nothing
<CatalystAvatar size="medium" name={user.name} src={user.avatarUrl ?? undefined} />

// CORRECT — UserAvatar for full profile context
<UserAvatar size="medium" user={user} />
```

### G3 — People Picker / Assignee Picker Contract

| ID | Rule | Enforcement |
|----|------|-------------|
| G3 | Every user picker, assignee picker, people selector, or member-list dropdown MUST render each option with `CatalystAvatar` or `UserAvatar`. No plain initials span, no `<img>` tag, no colored `<div>` with text. Canonical people-picker component is `ProfilePicker` from `@/components/ads` — use before hand-rolling. | Code review; `grep -rn "ProfilePicker\|CatalystAvatar\|UserAvatar" src/components/` confirms usage |

### G4 — AvatarGroup Contract

| ID | Rule | Enforcement |
|----|------|-------------|
| G4 | Avatar stacks / groups MUST wrap `CatalystAvatar` instances, never raw `@atlaskit/avatar-group`. Overflow count (`+N`) must use `<Badge>` from `@atlaskit/badge` — never a custom colored div. | `grep -rn "from '@atlaskit/avatar-group'" src/ | grep -v "CatalystAvatar.tsx\|Avatar.tsx"` → zero results |

---

## GRID H — Row Typography Contract

Every Jira/work-item row surface (Board, Backlog, All Work, Sprint, and any future row surface) MUST render issue key and title/summary text through the same canonical token pair. No exceptions, no per-surface reinvention.

### H1 — Canonical token pair

| ID | Rule | Enforcement |
|----|------|-------------|
| H1 | Issue KEY text = `var(--ds-font-size-300)` / `var(--ds-line-height-body)` (13px/20px). Issue TITLE/summary text = `var(--ds-font-size-400)` / `var(--ds-line-height-body)` (14px/20px). Applies to every row/table/card surface that renders a work item. | DOM computed-style probe (Chrome MCP) against Board as reference; `CatalystRules.CANONICAL_ROW_TYPOGRAPHY` |

### H2 — No hardcoded line-height literals

| ID | Rule | Enforcement |
|----|------|-------------|
| H2 | Hardcoded `lineHeight` literals (`1`, `1.4`, `1.5`) or Tailwind `leading-[...]` classes BANNED in row/table cell components. Every line-height MUST reference `var(--ds-line-height-body)`. | `CatalystRules.containsHardcodedLineHeight()`; `grep -rn "lineHeight: 1\b\|lineHeight: 1\.4\|lineHeight: 1\.5\|leading-\[" src/components/shared/JiraTable/ src/pages/project-hub/` → zero results outside documented exceptions |

### H3 — Canonical reference implementations

| ID | Rule | Enforcement |
|----|------|-------------|
| H3 | New row-rendering components MUST match, not reinvent, the canonical implementations: `src/components/shared/JiraTable/cells.tsx` (`makeKeyCell`) and `src/components/shared/JiraTable/editors.tsx` (`SummaryOverlayEditor`). Board's kanban card is the historical reference the other surfaces were normalized to (2026-07-02 typography-parity fix: `CAT-TYPOGRAPHY-ROWSYNC-20260702-001`). | Code review — new row surfaces must import/reuse these, not hand-roll |

**Known documented exception:** `src/components/shared/JiraTable/editors.tsx` line ~861 (`InlineEdit` readView fallback branch, used when `overlayEditor` is false) intentionally keeps `lineHeight: 1.4` — comment dated 2026-06-11 explains it prevents descender clipping (g/y/p/q/j) under an `overflow:hidden` parent. Left as-is; not currently rendered by any of the four audited surfaces (Board/Backlog/All Work/Sprint).

**Open follow-up (not yet done):** Board's kanban card still renders through a separate component from the shared `cells.tsx`/`editors.tsx` machinery — H3 states the target, but the actual migration onto one shared component (so drift becomes structurally impossible, not just token-corrected) is a separate, larger Plan Lock, not covered by this rule's initial confirmation.

**2026-07-02 repo-wide sweep:** Audited all ~35 list/table surfaces across Project, Product, Test, Incident, Release, and Tasks hubs. ~80% render through `JiraTable`/`cells.tsx` or `BacklogTable` (which imports `makeKeyCell` directly) — these inherited H1/H2 for free, no edits needed; live DOM-verified clean on Filters, Incident Hub. One additional real violation found and fixed: `src/components/for-you/ForYouTable.tsx` (card summary, `lineHeight: 1.3` → `var(--ds-line-height-body)`).

**Resolved 2026-07-02 (`CAT-KANBAN-TYPOGRAPHY-20260702-001`):** `src/components/kanban/WorkItemCard.tsx` (kanban card renderer shared by Product/Incident/Tasks/TestHub boards) intentionally keeps its own density-driven font scale (`d.titleSize`/`d.metaSize`, compact/dense/comfortable) — it is **not** folded into H1's flat table-row token pair. Live DOM probe of Project Board's `kb-column` reference implementation (`src/features/kanban-board/components/Card.tsx`, committed state) shows *why* a flat match would be wrong: its title uses the same canonical pair as tables (`--ds-font-size-400`/14px + `--ds-line-height-body`/20px), but its issue-key text is deliberately smaller — `--ds-font-size-200`/12px + 16px line-height, a `+4` font-to-line-height ratio, not the table's `+7`. Real Jira kanban cards are more compact than list rows for secondary/meta text; primary title text still matches. Decision: kanban cards may diverge from Grid H's row pair for meta/key text, but must not use disconnected magic-literal line-heights — they must derive from the density system or the actual token the element's font-size uses. Fixed accordingly: `WorkItemCard.tsx` line ~479 (issue-key button) now computes `` `${d.metaSize + 4}px` `` (mirrors Board's committed +4 key ratio, scaled per this card's own density); line ~145 (subtask chip) now uses `calc(var(--ds-font-size-100) + 5px)` (same rendered 16px as the untouched sibling epic chip, but anchored to the font-size token it pairs with instead of a bare literal). Non-table surfaces (kanban boards, timelines, DAG dependency graphs, `AllProductsPage.tsx` custom grid, `DefectsPage.tsx` custom list) remain out of Grid H's scope generally — Grid H governs row/table typography, not card/graph/timeline UI; this entry documents kanban cards' typography contract as a standing exception, not a violation.

---

## Change Log

| Date       | Row  | Change                          | Confirmed by |
|------------|----- |---------------------------------|--------------|
| 2026-07-01 | A4   | QA Bug module: TEAM → TESTHUB   | Vikram       |
| 2026-07-01 | A5   | Production Incident: TEAM → INCIDENT | Vikram  |
| 2026-07-01 | C2   | Business Request ↔ Production Incident: ALLOW (was proposed BAN) | Vikram |
| 2026-07-01 | C10  | Same-type linking: BAN          | Vikram       |
| 2026-07-01 | E1–E5 | Grid E added: Hub L1/L2 breadcrumb pattern, CatalystPageHeader ban, global hub rule, hand-rolled breadcrumb ban | Vikram |
| 2026-07-01 | F1–F6 | Grid F added: Slug & URL Contract — no UUIDs in route params, slug columns on navigable tables, Routes.* builders only, dual-mode hooks, frozen slugs, redirect mounting outside CatalystShell | Vikram |
| 2026-07-01 | G1–G4 | Grid G added: Avatar & People Picker Contract — CatalystAvatar/UserAvatar mandatory, CDN ban, ADS-palette fallback chain, ProfilePicker for people pickers, AvatarGroup via wrapped CatalystAvatar | Vikram |
| 2026-07-02 | H1–H3 | Grid H added: Row Typography Contract — canonical key/title token pair (`--ds-font-size-300`/`-400` + new `--ds-line-height-body` token), ban on hardcoded lineHeight literals, cells.tsx/editors.tsx as canonical reference. Codifies the CAT-TYPOGRAPHY-ROWSYNC-20260702-001 fix. | Vikram |
| 2026-07-02 | H3   | Kanban card typography resolved: WorkItemCard.tsx keeps its own compact density scale (not folded into H1); fixed its 2 magic-literal line-heights (key `+4` density-derived, subtask chip `calc()`-anchored) per CAT-KANBAN-TYPOGRAPHY-20260702-001 | Vikram |

---

## How to Add a Rule

Use `/cre add "[rule text]"` — classifies, writes here, updates `CatalystRules.ts`, confirms before commit.
Or tell Claude Code directly: "Add CRE rule: [rule text]" — it will run plan-mode and ask for YES.
