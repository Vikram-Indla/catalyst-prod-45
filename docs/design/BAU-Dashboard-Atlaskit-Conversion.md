# BAU Dashboard — Strict Atlaskit Conversion Blueprint

**Surface:** `/project-hub/:key/dashboard` (e.g. `/project-hub/BAU/dashboard`)
**Author:** Vikram · **Date:** 19 Apr 2026 · **Status:** G7 Task Brief — pre-build
**Target:** Atlassian Design System (Atlaskit) — strict. Light + Dark via `@atlaskit/tokens`.
**Constraint:** research / blueprint only. No code changes in this pass.

---

## 0. Executive Summary

The BAU Dashboard is a bespoke V12-Hybrid-Precision surface — it pre-dates the `src/components/ads/*` Atlaskit wrapper layer and never migrated. Every widget reimplements primitives the `ads/` layer already owns:

- Hand-written `<table>` elements with inline `th`/`td` styles (instead of `DynamicTable`).
- `<span>` pills using hard-coded hex for status/priority/severity (instead of `Lozenge` / `StatusLozenge`).
- Hand-rolled `<div style={{ borderRadius: '50%' }}>` avatars (instead of `Avatar`).
- Inline `style={{ background: 'var(--cp-primary-60)' }}` primary buttons (instead of `Button appearance="primary"`).
- Bespoke empty-state `<div>` blocks (instead of `EmptyState`).
- Inline breadcrumb spans (instead of `Breadcrumbs`).
- `CatalystPageHeader` hand-styled with `"Atlassian Sans"` inline (instead of `@atlaskit/heading` + `@atlaskit/page-header`).

**Good news:** the wrapper layer (`src/components/ads/*`), the token bridge (`src/theme/ads/tokens.ts`), and the runtime provider (`AdsThemeProvider`) are already in production — used by SubtasksPanel, LinkedWorkItems, EpicBacklogTable, BacklogPage.atlaskit.tsx. `vite.config.ts` pre-bundles every `@atlaskit/*` primitive we need. The dashboard migration is **wiring work, not foundation work.** Zero new packages, zero new infrastructure.

**Conversion shape:** delete ~600 lines of bespoke markup across 14 files; replace with imports from `@/components/ads` and `@atlaskit/primitives`. Typography and spacing come for free once `<Heading>` / `<Text>` replace inline `fontSize`/`fontWeight` props and layout moves to `<Stack>` / `<Inline>` / `<Box>`.

---

## 1. Discovery — What's Actually Rendered (Chrome MCP, live page)

Pulled from `localhost:8080/project-hub/BAU/dashboard` via DOM + `getComputedStyle`:

### 1a. Page chrome

| Element | Current computed | Source | Verdict |
|---|---|---|---|
| Page bg | `#FFFFFF` (`--cp-bg-page`) | `ProjectDashboardPage.tsx:51` inline | ✅ matches Atlaskit `elevation.surface` |
| Body font | `Inter, ui-sans-serif, ...` @ 16px / 24px line | inherited | ✅ matches Atlaskit body |
| H1 "Dashboard" | `Atlassian Sans` 20px / 600 / `#172B4D` / `-0.003em` | `CatalystPageHeader.tsx:47-52` inline | 🟡 looks Atlaskit but hand-coded; should use `<Heading size="large" as="h1">` |
| Breadcrumb | 13px / 500 / `#64748B` ChevronRight separators | `ProjectDashboardPage.tsx:54-66` inline | 🔴 bespoke — replace with `<Breadcrumbs>` |
| Toolbar buttons | 12px / 600 / `0.75px` subpixel border | `ProjectDashboardPage.tsx:42-48` `btnStyle` | 🔴 subpixel border, inline style — replace with `<Button appearance="subtle">` |
| Primary CTA (Configure Gates) | `#2563EB` / white / 6px radius / 12px × 6px pad | `KeyMilestonesWidget.tsx:18-23` inline | 🔴 hard-coded hex — replace with `<Button appearance="primary">` |

### 1b. Widget card chrome

| Element | Current | Verdict |
|---|---|---|
| Card bg | `#FFFFFF` (`#1A1A1A` dark) | ✅ matches `elevation.surface` in token bridge |
| Card border | `1px solid #E2E8F0` (`#2E2E2E` dark) | ✅ matches `color.border` in token bridge |
| Card radius | `8px` | 🟡 Atlaskit card surfaces use `border.radius` = 3px; Catalyst uses 8px — keep Catalyst (already in V12 §4) |
| Card shadow | `0 1px 3px rgba(0,0,0,.06)` light / none dark | ✅ matches `elevation.shadow.raised` |
| Header bar | 8px × 14px padding, 14px / 700 / Sora title | 🔴 inline `fontFamily: 'Sora'` — replace with `<Heading size="xsmall">` |
| Divider below header | `1px solid #EBECF0` | 🟡 replace with `color.border.subtle` token (= `#F1F5F9` light) |
| Count badge on header | rounded pill, JetBrains Mono 11px / 800 | 🔴 bespoke — replace with `<Lozenge>` |

### 1c. Status / priority / severity pills — **critical audit**

| Pill text | Current bg | Current fg | Role | Atlaskit mapping |
|---|---|---|---|---|
| `1 OPEN`, `4 OPEN`, `ToDo`, `open` | `#DEEBFF` | `#0747A6` | Status: in-progress | `<Lozenge appearance="inprogress">` ✅ |
| `9 CLOSED`, `6 CLOSED`, `Closed`, `closed`, `READY FOR PRODUCTION`, `READY FOR QA`, `P3`, `MINO` | `#DFE1E6` | `#253858` | Status: done / minor priority | `<Lozenge appearance="default">` (grey) |
| `P2`, `MAJO` | `#FFF7E6` | `#A36200` | Priority: high / severity: major | `<Lozenge appearance="moved">` (amber) — **priority ≠ status** |
| `P1`, `CRIT` | `#FFEBE6` | `#BF2600` | Priority: highest / severity: critical | `<Lozenge appearance="removed">` (red) — **priority ≠ status** |

🔴 **Live bug surfaced during audit:** "READY FOR PRODUCTION" is currently rendered **grey** — semantically that's an in-progress status and should be **blue**. The bespoke span classifier in `ProductionIncidentsWidget.tsx:95-99` short-circuits on `status_category === 'Done'` but "Ready for Production" is not Done. Status classification logic is wrong regardless of which primitive renders it; the conversion must fix the `toStatusCategory()` call at the source. See §5 acceptance criteria.

🟢 **Guardrail clarification (CLAUDE.md §5):** The 3-colour guardrail applies to **StatusLozenge** (status badges). It does NOT apply to **Lozenge** (generic badge). Priority/severity pills are correctly implemented as `Lozenge` with amber/red appearances — those are Atlaskit canonical priority colours, NOT status colours. **No guardrail violation to fix here — but the components must be split**: `StatusLozenge` for status columns, `Lozenge` for priority/severity columns. The live page does not make this distinction.

### 1d. Table chrome

| Element | Current | Verdict |
|---|---|---|
| `<th>` bg | `#F1F5F9` (`--cp-bg-inset`) | ✅ matches `color.background.neutral.subtle` |
| `<th>` text | 11px / 650 / uppercase / `0.44px` tracking / Inter / `#64748B` | 🟡 close to Atlaskit meta-style; `DynamicTable` owns this already |
| Row height | 36px | ✅ matches CLAUDE.md §4 locked density |
| Row divider | **`0px solid`** — **missing** | 🔴 CLAUDE.md §4 says `0.75px solid var(--cp-border-default)`; current rendering has no divider (computed 0px) |
| Hover | `hover:bg-black/[0.04]` Tailwind | ✅ matches interact-hover token |
| Assignee avatar | bespoke `<div>` with `charCodeAt` colour hash | 🔴 replace with `<Avatar>` (handles initials, AK presence, accessibility) |

---

## 2. Critique — First Impression → Priority Recommendations

### 2a. Overall impression (2s test)
**What works:** grid rhythm is clean, 3-column layout scans well, empty states have friendly icons, the page is uncluttered. **Biggest opportunity:** every surface is reinventing Atlaskit primitives that already exist two directories away. This is not a design problem; it's a wiring problem.

### 2b. Usability

| Finding | Severity | Recommendation |
|---|---|---|
| Table headers are not sortable (no sort arrows, no click affordance) | 🟡 Moderate | `DynamicTable` gives this free via `head.cells[].isSortable` |
| No pagination on Incidents (10 rows shown, "View All in IncidentHub" footer is the only exit) | 🟢 Minor | Acceptable pattern — widget is a preview, full list lives in the hub |
| "READY FOR PRODUCTION" status renders grey (looks like "done") but is an in-progress status | 🔴 Critical | Fix `toStatusCategory` classifier, then use `StatusLozenge status="inProgress"` |
| Breadcrumb "ProjectHub" is clickable but styled identically to non-clickable "BAU" — no affordance | 🟡 Moderate | `<Breadcrumbs>` renders interactive crumbs as anchors, terminal as `aria-current="page"` |
| Avatar initial colours hash from `charCodeAt` → inconsistent across widgets for the same person | 🟡 Moderate | `<Avatar>` uses Atlaskit's canonical colour derivation — consistent everywhere |
| Empty states use emoji icons (🛡, ◎, ◡) — informal for a government platform | 🟢 Minor | `<EmptyState>` accepts `imageUrl` — use line-art SVGs for MoIM |

### 2c. Visual hierarchy
- **What draws the eye first:** the light-grey widget header strips. Correct — they're the zoning device.
- **Reading flow:** top-left (Milestones/Release Health) → full-width KPIs → wide tables → team. Natural.
- **Emphasis issue:** the count badge "10 incidents" on the summary bar has the same visual weight as the "1 OPEN" lozenge next to it. Currently both are bespoke pills; under Atlaskit, `10` should be body text bolded (`<Text weight="bold">`) and `1 OPEN` should be `<Lozenge appearance="inprogress">`.

### 2d. Consistency

| Element | Issue | Recommendation |
|---|---|---|
| Two widget wrappers coexist (`WidgetCard.tsx` and `WidgetWrapper` referenced by `ProductionIncidentsWidget`) | Identical visual, different code paths, drift guaranteed | Collapse to one `<WidgetCard>` built on `@atlaskit/primitives` + token bridge |
| Pill radius | `3px` (P1/P2/P3) vs `4px` (OPEN/CLOSED) — computed | Atlaskit `<Lozenge>` uses single radius — drift disappears |
| Title typography | `fontFamily: 'Sora'` inline in WidgetCard vs `Atlassian Sans` in CatalystPageHeader vs Inter elsewhere | `<Heading>` owns the font stack; three inline strings become one import |
| Button borders | `0.75px solid` subpixel in toolbar vs `1px solid` in retry state | `<Button>` removes the debate |

### 2e. Accessibility
- **Color contrast:** pill contrast ratios pass AA; `#0747A6` on `#DEEBFF` = 8.2:1 ✅. But the grey-on-grey muted text `#94A3B8` on `#FFFFFF` = 3.1:1 — **fails AA for normal text** (< 4.5:1). Atlaskit `color.text.subtlest` resolves to `#626F86` (5.4:1) — switch via token bridge.
- **Keyboard:** bespoke clickable `<span>` breadcrumb not in tab order. Atlaskit `<BreadcrumbsItem>` renders as anchor/button.
- **ARIA:** WidgetCard has `role="region" aria-label={title}` ✅. Tables have no `<caption>` — `DynamicTable` accepts `aria-label`.
- **Touch targets:** toolbar buttons are 6px vertical pad = ~28px total. Atlaskit compact button = 32px. Bump on migration.

---

## 3. Component Map — Every Widget, Every Surface

**Legend:** `🟢` = swap to ADS wrapper, `🟡` = recompose via primitives, `🔴` = delete bespoke markup.

### 3a. Page chrome

| Current | New | Source file |
|---|---|---|
| `ProjectDashboardPage.tsx` inline `<div>` breadcrumb | 🟢 `<Breadcrumbs items={[{key:'hub',text:'ProjectHub',href:'/project-hub/projects'},{key:'pkey',text:pKey,isCurrent:false,onClick:...},{key:'current',text:'Dashboard',isCurrent:true}]} LinkComponent={RouterLink} />` | `src/components/ads/Breadcrumbs.tsx` |
| `CatalystPageHeader` bespoke `<h1>` | 🟡 Keep `CatalystPageHeader` as a layout shell (header role, 52px height, padding) but replace its `<h1>` with `<Heading as="h1" size="large">{title}</Heading>`. Delete all inline font styles. | `src/components/shared/CatalystPageHeader.tsx` |
| Toolbar `+ Add Widget` / `Edit Layout` / `Reset` | 🟢 `<Button appearance="subtle" spacing="compact" iconBefore={<Plus size={14}/>}>Add Widget</Button>` ×3 | `src/components/ads/Button.tsx` |
| Widget grid (3-col, 16px gap) | 🟡 Keep custom `<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap: token('space.200')}}>` or switch to `@atlaskit/primitives` `<Grid templateColumns="repeat(3, 1fr)" gap="space.200">`. Atlaskit Grid is stable — use it. | `DashboardWidgetGrid.tsx` |
| Loading skeleton `<div class="animate-pulse">` | 🟢 `@atlaskit/skeleton` `<Skeleton width="100%" height={160} />` — add to optimizeDeps | new |

### 3b. Widget card shell

| Current `WidgetCard` concern | New |
|---|---|
| Outer `<div>` with inline border, radius, shadow | `<Box backgroundColor="elevation.surface" xcss={...}>` from `@atlaskit/primitives`, borders via `color.border`, radius via `border.radius`, shadow via `elevation.shadow.raised` |
| Header strip | `<Inline alignBlock="center" spread="space-between" space="space.100" xcss={headerCss}>` |
| Title + count | `<Inline alignBlock="center" space="space.100"><Heading as="h3" size="xsmall">{title}</Heading>{count !== undefined && <Lozenge appearance="default">{count}</Lozenge>}</Inline>` |
| Subtitle | `<Text size="small" color="color.text.subtle">· {subtitle}</Text>` |
| Action button | `<Button appearance="link" spacing="compact">{actionLabel}</Button>` |
| Error branch | `<SectionMessage appearance="error" title="Failed to load" actions={[{ key:'retry', text:'Retry', onClick: onRetry }]}>Try again in a moment.</SectionMessage>` |
| Body container | `<Box paddingBlock="space.0" xcss={bodyCss}>{children}</Box>` |

### 3c. Per-widget spec

#### Key Milestones (empty state)
- Current: emoji icon `◎`, hardcoded text styles, inline-styled primary `<button>`.
- New:
```tsx
<WidgetCard title="Key Milestones" subtitle="Configurable status gates">
  <EmptyState
    header="No milestones configured"
    description="Set up status gates to track key delivery checkpoints across your project lifecycle."
    primaryAction={
      <Button appearance="primary" iconBefore={<Settings size={14}/>} onClick={onConfigure}>
        Configure Gates
      </Button>
    }
  />
</WidgetCard>
```

#### Release Health (empty state)
- Current: 📦 emoji + bespoke link.
- New: `<EmptyState header="No active releases" description="Create a release to track delivery progress." primaryAction={<Button appearance="link" iconAfter={<ExternalLink size={12}/>}>View in ReleaseHub</Button>} />`

#### Items by Status / Overdue / On Hold (KPI tiles)
- Current: centred icon + two text lines.
- New: `<EmptyState size="narrow" />` pattern OR — if a count is present — `<Stack space="space.100" alignInline="center"><Heading size="xlarge">{count}</Heading><Text color="color.text.subtle">{label}</Text></Stack>`

#### Production Incidents / QA Defects (tables)
- Current: hand-written `<table>`, inline th/td styles, bespoke pills, bespoke avatars, manual hover class.
- New:
```tsx
import { DynamicTable, Lozenge, StatusLozenge, Avatar, toStatusCategory } from '@/components/ads';

const head = {
  cells: [
    { key: 'key',       content: 'Key',       isSortable: true, width: 10 },
    { key: 'pri',       content: 'Pri',       isSortable: true, width: 6  },
    { key: 'title',     content: 'Title',     isSortable: false },
    { key: 'status',    content: 'Status',    isSortable: true, width: 18 },
    { key: 'assignee',  content: 'Assignee',  isSortable: false, width: 14 },
  ],
};

const rows = incidents.map(inc => ({
  key: inc.id,
  cells: [
    { key:'key',      content: <Link to={`/incidents/${inc.issue_key}`}>{inc.issue_key}</Link> },
    { key:'pri',      content: <Lozenge appearance={priToAppearance(inc.priority)}>{priLabel(inc.priority)}</Lozenge> },
    { key:'title',    content: <Text>{inc.title}</Text> },
    { key:'status',   content: <StatusLozenge status={toStatusCategory(inc.status)}>{inc.status}</StatusLozenge> },
    { key:'assignee', content: <Inline alignBlock="center" space="space.075"><Avatar size="xsmall" name={inc.assignee} src={inc.assignee_avatar_url}/><Text>{inc.assignee?.split(' ')[0] ?? '—'}</Text></Inline> },
  ],
}));

<DynamicTable head={head} rows={rows} aria-label="Production incidents" emptyView={<EmptyState header="No production incidents" description="No open incidents for this project." />} isLoading={isLoading} />
```
Summary bar above the table becomes:
```tsx
<Inline alignBlock="center" space="space.150" xcss={summaryCss}>
  <Text weight="semibold">{incidents.length} incidents</Text>
  {open    > 0 && <Lozenge appearance="inprogress">{open} OPEN</Lozenge>}
  {resolved > 0 && <Lozenge appearance="success">{resolved} RESOLVED</Lozenge>}
  {closed  > 0 && <Lozenge appearance="default">{closed} CLOSED</Lozenge>}
</Inline>
```

#### Team Workload / Scope Change / Time in Status / Recent Activity
- All four are empty-state-dominant widgets; same `EmptyState` pattern as Release Health with surface-specific icons and copy. No table primitive needed until backend data lights up.

---

## 4. Token Map — `--cp-*` → `@atlaskit/tokens`

The bridge already exists (`src/theme/ads/tokens.ts`) and is surfaced at runtime by `AdsThemeProvider`. The dashboard needs no new token work — it just needs to **stop hardcoding hex** and start reading through the bridge. Reference table:

| Catalyst `--cp-*` | Atlaskit token | Light | Dark (NOCTURNE) |
|---|---|---|---|
| `--cp-bg-page` | `color.background.neutral` | `#FFFFFF` | `#0A0A0A` |
| `--cp-bg-surface` | `elevation.surface` | `#FFFFFF` | `#1A1A1A` |
| `--cp-bg-overlay` | `elevation.surface.overlay` | `#F8FAFC` | `#1F1F1F` |
| `--cp-bg-inset` | `color.background.neutral.subtle` | `#F1F5F9` | `#111111` |
| `--cp-interact-hover` | `color.background.neutral.hovered` | `rgba(0,0,0,0.04)` | `#1F1F1F` |
| `--cp-interact-selected` | `color.background.selected` | `rgba(37,99,235,0.08)` | `rgba(37,99,235,0.14)` |
| `--cp-text-primary` | `color.text` | `#0F172A` | `#EDEDED` |
| `--cp-text-secondary` | `color.text.subtle` | `#475569` | `#A1A1A1` |
| `--cp-text-muted` | `color.text.subtlest` | `#94A3B8` | `#878787` |
| `--cp-border-default` | `color.border` | `#E2E8F0` | `#2E2E2E` |
| `--cp-border-subtle` | `color.border.accent.gray` | `#F1F5F9` | `#292929` |
| `--cp-border-focus` | `color.border.focused` | `#2563EB` | `#2563EB` |
| `--cp-primary-60` | `color.background.brand.bold` | `#2563EB` | `#2563EB` |
| `--cp-primary-70` | `color.background.brand.bold.hovered` | `#1D4ED8` | `#1D4ED8` |

**Rule for the migrated dashboard files:** no hex literals. Either read through `@atlaskit/tokens`' `token('color.text', fallback)` helper (inside `xcss` / style composers), or — inside ADS-scope code — read `cp(adsTokens.text.primary)` which returns `var(--cp-text-primary)`. The ESLint profile on `src/components/ads/**` already blocks hex; extend the same rule to `src/components/project-hub/dashboard/**` at conversion time.

### Typography tokens

| Current | Target |
|---|---|
| `fontFamily: "'Sora', sans-serif"` (title in WidgetCard) | `<Heading size="xsmall">` — resolves to Atlassian Sans via `@atlaskit/heading` |
| `fontFamily: "'Inter', sans-serif"` (subtitle) | inherit body stack — Atlaskit body = Inter already |
| `fontFamily: "'JetBrains Mono', monospace"` (count badge, issue key) | `<Text as="code">` or token `font.family.code` |
| `fontSize: 11, fontWeight: 650, letterSpacing: '0.04em', textTransform: 'uppercase'` (table headers) | owned by `DynamicTable` — delete the inline recipe |
| `fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em'` (widget title) | `<Heading size="xsmall">` |
| `fontSize: 20, fontWeight: 600, letterSpacing: '-0.003em'` (page title) | `<Heading size="large">` |

### Spacing tokens

The dashboard uses raw pixel values (`16`, `8`, `12`, `6`). Replace with Atlaskit space tokens:

| Raw px | Atlaskit space | `--cp-space-*` |
|---|---|---|
| 4  | `space.050` | `--cp-space-1` |
| 8  | `space.100` | `--cp-space-2` |
| 12 | `space.150` | `--cp-space-3` |
| 16 | `space.200` | `--cp-space-4` |
| 20 | `space.250` | `--cp-space-5` |
| 24 | `space.300` | `--cp-space-6` |

### Radius

| Surface | Atlaskit | Keep as is? |
|---|---|---|
| Card | 8px (V12 §4) | Yes — intentional Catalyst deviation from AK's 3px |
| Button | 6px (V12 §4) | Yes — same reasoning |
| Lozenge | 3px (AK default) | Yes — single AK value |
| Input | 4px | Yes |

CLAUDE.md §4 locks these. The conversion does not change radii.

### Elevation

| Surface | Light | Dark |
|---|---|---|
| Card rest | `elevation.shadow.raised` ≈ `0 1px 3px rgba(0,0,0,.06)` | `none` (matches NOCTURNE) |
| Card hover | `elevation.shadow.overlay` ≈ `0 4px 8px rgba(0,0,0,.10)` | `none` |
| Modal | `elevation.shadow.overflow` | `none` |

---

## 5. File-by-File Rewrite Plan

Order is deliberate: foundations first, then chrome, then widgets, widest-impact widgets last. Each bullet is a **separate commit** and a **separate surgical scope** per CLAUDE.md §10.

### Commit 1 — Add `PageHeader` wrapper to ADS layer
- **New file:** `src/components/ads/PageHeader.tsx` — thin wrapper over `@atlaskit/page-header` or composed from `<Heading>` + `@atlaskit/primitives` (PageHeader exists but is opinionated; a composed shell is cleaner).
- **Barrel update:** `src/components/ads/index.ts` — add export.
- **Vite:** `optimizeDeps.include` — already has `@atlaskit/primitives` and `@atlaskit/heading`. No change. (If `@atlaskit/page-header` is used, append to optimizeDeps per CLAUDE.md Atlaskit adoption protocol step 2.)
- **Scope check:** single wrapper file; no existing surface changes.

### Commit 2 — Retrofit `CatalystPageHeader`
- **File:** `src/components/shared/CatalystPageHeader.tsx`
- **Change:** replace inline `<h1 style={…}>` with `<Heading as="h1" size="large">{title}</Heading>`. Delete all font/color inline styles. Wrap actions in `<Inline alignBlock="center" space="space.100">`. Keep the 52px / 24px padding shell (that's an intentional Catalyst deviation per April 2026 Decision A).
- **Risk:** this is the canonical page header used by 10+ surfaces (Strategy, Product, Project, Story detail). Verify no callers pass inline font overrides. Single-commit scope per CLAUDE.md §10.

### Commit 3 — Retrofit breadcrumb in `ProjectDashboardPage`
- **File:** `src/pages/project-hub/ProjectDashboardPage.tsx`
- **Change:**
  - Delete lines 42-48 (`btnStyle` object), 54-66 (inline breadcrumb), 51 inline style on outer div.
  - Replace breadcrumb with `<Breadcrumbs items={...} LinkComponent={RouterLink} />`.
  - Replace outer `<div style={{fontFamily, background, minHeight}}>` with `<Box xcss={pageCss}>` where `pageCss` uses `color.background.neutral`.
  - Replace the three toolbar `<button style={btnStyle}>` with `<Button appearance="subtle" spacing="compact" iconBefore={...}>`.
- **Vite:** already covers `@atlaskit/breadcrumbs`, `@atlaskit/button`, `@atlaskit/primitives`. No change.
- **Risk:** URL routing behaviour must match — `<Breadcrumbs LinkComponent={Link}>` from react-router is required (existing pattern in migrated surfaces).

### Commit 4 — Unify widget card
- **Decision:** keep `WidgetCard.tsx`, delete `WidgetWrapper` (audit which one is actually imported — `widget-registry.ts` uses files that import `WidgetWrapper`; `WidgetCard.tsx` appears orphaned or used elsewhere). Collapse to one wrapper.
- **File:** `src/components/project-hub/dashboard/WidgetCard.tsx`
- **Change:**
  - Replace inline `<div style={{border, borderRadius, boxShadow, …}}>` with `<Box xcss={cardCss}>` reading `elevation.surface` / `color.border` / `border.radius` / `elevation.shadow.raised` via `xcss` + `token()`.
  - Replace title `<span style={{fontFamily:'Sora',…}}>` with `<Heading as="h3" size="xsmall">`.
  - Replace count pill with `<Lozenge>` (appearance mapping: neutral → `default`, green → `success`, amber → `moved`, red → `removed`, blue → `inprogress`).
  - Replace error branch with `<SectionMessage appearance="error" title="Failed to load" actions={…}>`.
  - Delete `useTheme` hook usage (`isDark` split) — token bridge handles light/dark automatically through `AdsThemeProvider`. This removes the dual-branch styling everywhere.
- **Risk:** widgets currently pass `countColor` as hex; need a small mapping function (hex → LozengeAppearance) OR refactor callers to pass `appearance` directly. Prefer the latter — pushing semantic intent upstream.

### Commit 5 — Retrofit the two tables (Production Incidents + QA Defects)
- **Files:**
  - `src/components/project-hub/dashboard/widgets/ProductionIncidentsWidget.tsx`
  - `src/components/project-hub/dashboard/widgets/QADefectsWidget.tsx`
- **Change:** delete the `<table>`, `<tr>`, `<th>`, `<td>` JSX; delete `thStyle` / `tdStyle` / `getAvatarColor` / `priClassName`. Build `head` + `rows` arrays and call `<DynamicTable head={head} rows={rows} aria-label="…" emptyView={...} isLoading={isLoading} />`.
- **Data fixes that ride along:**
  - Call `toStatusCategory(inc.status)` (from `@/components/ads`) before rendering `<StatusLozenge>` — this is the classifier that currently misroutes "Ready for Production" as grey instead of blue. Fixing it here also fixes the same issue downstream in any other surface that reuses `toStatusCategory`.
  - Priority mapping: introduce `priToAppearance(priority)` helper: `highest|P1 → 'removed'`, `high|P2 → 'moved'`, `medium|P3 → 'default'`, `low|P4 → 'default'`.
  - Avatar: replace hand-rolled `<div style={{borderRadius:'50%',…}}>` with `<Avatar size="xsmall" name={assigneeName} src={avatarUrl} />`.
- **Risk:** DynamicTable has its own pagination/sorting state. Current widget truncates to 10 via `.slice(0,10)` — keep the slice; pass `rowsPerPage={0}` to disable AK pagination (preview pattern per FP-003 — no pagination in widgets).

### Commit 6 — Retrofit the nine "empty-state" widgets
- **Files:**
  - `KeyMilestonesWidget.tsx` (has primary CTA)
  - `ReleaseHealthWidget.tsx`
  - `ItemsByStatusWidget.tsx`
  - `OverdueWidget.tsx`
  - `OnHoldWidget.tsx`
  - `ScopeChangeWidget.tsx`
  - `TeamWorkloadWidget.tsx`
  - `TimeInStatusWidget.tsx`
  - `RecentActivityWidget.tsx`
- **Change:** replace each bespoke `<div class="flex flex-col items-center py-6 text-center">` block with `<EmptyState header description primaryAction secondaryAction imageUrl />`.
- **Risk:** `EmptyState` from `@atlaskit/empty-state` sets its own padding — visual regression is likely. Verify padding parity; if AK's block is tighter than the current 24-py layout, wrap in `<Box paddingBlock="space.300">` to match.

### Commit 7 — Lint + typography scope extension
- Extend the ADS ESLint profile (`no-restricted-syntax` blocks on hex literals) to cover `src/components/project-hub/dashboard/**`.
- Add a `no-inline-style` rule to the same scope to prevent regressions.
- **Risk:** zero — tooling only.

### Commit 8 — Remove orphaned `WidgetWrapper`
- After confirming all widgets import `@/components/project-hub/dashboard/WidgetCard` (post-commit 4 rename if needed), delete `WidgetWrapper.tsx`.
- **Risk:** dead-code removal; grep confirms no remaining imports.

---

## 6. Adoption Protocol (Vite Integration)

From CLAUDE.md §1 — every new `@atlaskit/*` package requires three steps. Inventory for this migration:

| Package | In package.json? | In `vite.config.ts` `optimizeDeps.include`? | Action |
|---|---|---|---|
| `@atlaskit/avatar` | ✅ | ✅ | none |
| `@atlaskit/avatar-group` | ✅ | ✅ | none |
| `@atlaskit/breadcrumbs` | ✅ | ✅ | none |
| `@atlaskit/button` | ✅ | ✅ | none |
| `@atlaskit/dynamic-table` | ✅ | ✅ | none |
| `@atlaskit/empty-state` | ✅ | ✅ | none |
| `@atlaskit/heading` | ✅ | ✅ | none |
| `@atlaskit/lozenge` | ✅ | ✅ | none |
| `@atlaskit/primitives` | ✅ | ✅ | none |
| `@atlaskit/section-message` | ✅ | ✅ | none |
| `@atlaskit/tokens` | ✅ | ✅ | none |
| `@atlaskit/skeleton` | TBD | TBD | **verify + add if absent** — used for widget loading states. If added: append to deps + `optimizeDeps.include`. |

**Result:** 11 of 12 primitives are fully wired. At most one package add (`@atlaskit/skeleton`) — even that is optional (current skeleton is a bare animated div and can keep using `<Box xcss={shimmerCss}>`).

---

## 7. Verification Checklist (pre-merge, each commit)

Executed on localhost:8080, light + dark mode:

```
☐ Grep: no hex literals in src/components/project-hub/dashboard/**
☐ Grep: no style={{ background: '#…' }} in src/components/project-hub/dashboard/**
☐ Grep: no HSL() values (CLAUDE.md banned)
☐ Grep: no fontFamily: 'Sora' / 'Inter' / 'JetBrains Mono' inline (must go through Heading/Text)
☐ Grep: no .dark .bg-white stacked !important blocks
☐ DevTools: H1 computed font = "Atlassian Sans" 20px / 600
☐ DevTools: card computed bg = rgb(255,255,255) light, rgb(26,26,26) dark
☐ DevTools: card computed border = rgb(226,232,240) light, rgb(46,46,46) dark
☐ DevTools: th computed bg = rgb(241,245,249) light, rgb(17,17,17) dark
☐ DevTools: row computed border-bottom = 0.75px solid (NOT 0px — current bug)
☐ DevTools: "READY FOR PRODUCTION" lozenge computed bg = rgb(222,235,255) blue (NOT grey — current bug)
☐ DevTools: muted text computed color = rgb(98,111,134) light — ≥ 4.5:1 on white (WCAG AA)
☐ DevTools: Tab-key navigation hits every breadcrumb, toolbar button, table row
☐ DevTools: <h1>, <h2>, <h3> ARIA hierarchy intact (Breadcrumbs → H1 Dashboard → H3 widget titles)
☐ CLAUDE.md §5 guardrail: every StatusLozenge renders ONLY grey/blue/green
☐ CLAUDE.md §5 guardrail: every red/amber pill is a Lozenge (priority/severity) not a StatusLozenge
☐ Chrome MCP regression: dashboard screenshots light + dark match reference — no chrome shift
☐ npm run dev cold start: zero "Failed to resolve import '@atlaskit/…'" errors
☐ No new !important blocks in src/index.css
☐ No new .dark override blocks in src/index.css
```

---

## 8. Risk Callouts

1. **`CatalystPageHeader` is platform-wide chrome.** Commit 2 touches every page in the app — Strategy, Product, Project, Story detail all use it. Must run the full visual regression suite, not just the dashboard. *Mitigation: Commit 2 is typographic only; no layout change. But screenshot every CatalystPageHeader caller before/after.*
2. **`toStatusCategory()` fix may cascade.** Other surfaces may rely on the current (broken) grey classification of "Ready for Production". *Mitigation: grep all callers of `toStatusCategory`; update consumer expectations; this is a correctness improvement, not a regression.*
3. **`DynamicTable` pagination default.** Atlaskit ships with `rowsPerPage` default > 0. FP-003 says no pagination in widget previews. *Mitigation: always pass `rowsPerPage={0}` in widget scope. Add to ADS DynamicTable wrapper's doc comment.*
4. **Avatar colour change.** Replacing `charCodeAt`-hash avatars with Atlaskit's canonical derivation means every user's initial colour shifts on first paint. Users may double-take. *Mitigation: acceptable one-time polish — log in release notes.*
5. **`EmptyState` padding.** Atlaskit EmptyState has a minimum `maxImageWidth` and its own vertical rhythm. Widget heights may shift 8-16px. *Mitigation: set `maxImageWidth={120}` and wrap body in `<Box paddingBlock="space.300">` for parity.*
6. **`WidgetCard` ↔ `WidgetWrapper` duplication.** The audit in commit 4 must be real — don't assume one is orphaned. *Mitigation: grep `import.*Widget(Card|Wrapper)` before renaming; produce a full caller list.*
7. **Dashboard grid stays on CSS Grid.** `@atlaskit/primitives` `<Grid>` is fine, but its API is less flexible for asymmetric spans (`span 2 | span 1 | span 1`). *Mitigation: keep raw CSS Grid inside a `<Box>` until AK Grid gains span support; this is the one intentional bespoke layout that remains.*

---

## 9. Out of Scope (for this pass)

- `WidgetGalleryModal` (commit 3 dependency but full refactor deferred — uses `<Modal>` already via ads/).
- The actual data hooks (`useDashboardWidgets`, `useDashboardIncidents`). This is pure presentation work.
- The table's column-width system — AK `DynamicTable` supports relative widths but behaviour differs from `<table>` layout. If it regresses, file a follow-up; do not hand-tune in this migration.
- The NOCTURNE `.dark` override blocks in `src/index.css` — the migration removes the dashboard's dependency on them but does not touch the block. ECLIPSE pipeline continues on its own cadence.
- Any Atlaskit upgrade. Using what's installed.

---

## 10. Done Criteria

1. Every file in `src/components/project-hub/dashboard/**` passes the grep checks in §7.
2. No visual regression in light mode (pixel diff ≤ 2% on Chrome MCP screenshots).
3. Dark mode now renders via `AdsThemeProvider` + `setGlobalTheme` — NO per-component `isDark` branching in dashboard code.
4. All three live bugs surfaced in §2b fixed: status classifier, breadcrumb affordance, muted-text contrast.
5. CLAUDE.md quality gate: CG-02 Colour = 10.0, CG-04 Design System = 10.0, CG-11 Token-Only CSS = 100%, CG-12 WCAG AA = 100%.
6. Zero new `!important`, zero new `.dark` blocks, zero HSL, zero inline `style={{ background: '#…' }}`.

---

*Blueprint ends. No code changes executed in this pass — ready for per-commit CC Task Briefs when the user gives the go-ahead.*
