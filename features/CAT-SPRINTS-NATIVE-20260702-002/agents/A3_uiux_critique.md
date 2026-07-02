# A3 — UI/UX Critique (ADS lens) — Native Sprint Module
**Feature:** CAT-SPRINTS-NATIVE-20260702-002 · **Agent:** UI/UX Critic · **Date:** 2026-07-02
**Input:** 13_COUNCIL_VERDICT.md wireframe specs (list §10, create modal §1/§Jira-probe-8, detail rail §4/§7, report §8/§9) judged against ADS + repo canonical evidence (file:line cited throughout).

---

## 1. Typography

| Surface element | Verdict spec | ADS ruling | Evidence |
|---|---|---|---|
| Page title ("Sprints") | — | `PageHeader` wrapper: `Heading size="large" as="h1"` → Atlassian Sans 20/600/-0.003em, 52px shell, `padding: 0 24px`. Locked per April 2026 Decision A. Do not hand-roll an h1. | `src/components/ads/PageHeader.tsx:20-31` |
| Month group header | "JANUARY 2026" (all caps) | **REJECT all-caps.** ADS content guideline is sentence case everywhere; Jira group rows render sentence case ("In Progress (3)"). Render **"January 2026"** in the existing JiraTable group-row: 14px/600 `var(--ds-text)` + count in `var(--ds-text-subtlest)`. The uppercase 11px/700/0.08em overline style in the repo is reserved for toolbar eyebrows (`JiraTable.tsx:3063`), not row groups. | `JiraTable.tsx:849-850, 962, 3063` |
| Modal title | "Create sprint" | `@atlaskit/modal-dialog` `<ModalTitle>` — component-owned typography (Heading medium, 16/600). Never a styled `<div>`. | ADS modal-dialog; hand-rolled modals banned (CLAUDE.md) |
| Right-rail section labels | "Approvals", "Definition of done", "Release" | ReleaseSidePanel convention: `var(--ds-font-size-200)` / `fontWeight: 700` / `var(--ds-text)` — used by Description (620), Quarter (1083), Contributors (1364). **Bug to not copy:** Approvers header uses `font-size-400` (447) — an in-repo inconsistency. Standardise the sprint rail on font-size-200/700. | `ReleaseSidePanel.tsx:447, 620, 1083, 1364` |
| Table headers | Sprint · Status · Progress · … | JiraTable component-owned: `headerFontSize: 12` in DENSITY map. Do not override per-column. | `JiraTable.tsx:71-90` |
| Report section titles | — | `Heading size="small"` (h3) via the ads wrapper (`src/components/ads/Heading.tsx`) — the wrapper exists precisely so Atlaskit owns colour/dark-mode. |

## 2. Spacing — 4/8 grid audit

- **Table density:** JiraTable `comfortable` = 48px row, 10px/12px cell padding; `compact` = 40px row, 6px/12px (Jira DOM probe 2026-05-16, `JiraTable.tsx:71-90`). The verdict removes the density menu — correct anti-clutter call — so **lock `comfortable`** (Catalyst default, "one step bigger than Jira compact"). Group rows fixed 40px (`:850`). All values are already on-grid; do not introduce new row heights.
- **Right-rail cards:** ReleaseSidePanel canon = **card padding 16, gap 16 between cards, gap 8 within a card block, gap 4 for tight label/value pairs** (`ReleaseSidePanel.tsx:133-142, 439-443, 477`). Sprint rail (Details, Approvals, DoD, Release link, Health) must reuse exactly these numbers. Anything at 12/20/6 outer padding fails the grid audit.
- **Modal field stacking:** use `@atlaskit/form` `<Field>` — it owns label→control (4px) and field→field (space.200 = 16px) rhythm. Start/End date pair on one row: `<Inline space="space.200">`. Do not hand-stack with ad-hoc margins; the create-release Jira probe (verdict §Jira-8) shows exactly this rhythm.
- **Page shell:** header 52px + `0 24px` (PageHeader), table toolbar row uses existing JiraTable toolbar paddings (`4px 10px` chips, `:57`). Count banner ("This project has N sprints") = `var(--ds-text-subtle)` 12px, 8px below toolbar — matches Jira probe #6.

## 3. Color / status semantics

**Lozenge appearance per sprint status** (list rows use `@atlaskit/lozenge`, `isBold={false}` — precedent `releases/cells.tsx:66`; sibling map precedent `ReleasesTableRow.tsx:25-31`):

| Status | Appearance | Token behind it | Rationale |
|---|---|---|---|
| Planning | `default` | `--ds-background-neutral` / `--ds-text` | ADS "to do" category = neutral; nothing has happened yet |
| Active | `inprogress` | `--ds-background-information` / `--ds-text-information` | In-progress category = blue, exact Jira sprint parity |
| Awaiting approval | `moved` | `--ds-background-warning` / `--ds-text-warning` | Amber = "paused/needs attention", ADS's semantic for human-gate states; must NOT be green (not done) or red (not failed) |
| Completed | `success` | `--ds-background-success` / `--ds-text-success` | Done category |
| Canceled | `removed` | `--ds-background-danger` / `--ds-text-danger` | ADS removed = terminated abnormally |
| Archived | `default` | neutral | Terminal-neutral; pair with row text `--ds-text-subtlest` if archived rows shown |
| (Draft, if kept) | `default` | neutral | — |

- **Detail-header pill:** SUBTLE tier is LOCKED (Vikram 2026-06-29) — `STATUS_BG_SUBTLE`/`STATUS_FG_SUBTLE` from `statusPalette.ts:66-89`. Map sprint statuses → the six existing `StatusAppearance` keys above; **add zero new colors anywhere except statusPalette.ts** (that file is the canonical kill-switch for drift, per its own header).
- **Overdue end date:** plain text `var(--ds-text-danger)` in the End date cell — Jira parity DOM-probed (verdict Jira-probe #6). No lozenge, no background slab, no bold.
- Lozenge passes sentence-case labels ("Awaiting approval"); the component applies its own uppercase transform — never pre-uppercase strings.

## 4. The 1W/2W indicator — ribbon vs Lozenge/Badge

**Ribbon: REJECT.** Corner/edge ribbons are not an ADS pattern — no ribbon component exists on atlassian.design, and a diagonal/edge slab would need hand-rolled CSS + a bare color (double contract violation). **Badge: also wrong** — ADS reserves Badge for numeric counts.

**ADS-idiomatic answer: `<Lozenge appearance="default" isBold={false}>1W</Lozenge>`** —
- **List:** one subtle neutral lozenge after the sprint name in the Sprint cell (verdict §10 already says lozenge; hold it to `default` so it never competes with the Status column's semantic color). Hard cap: max two lozenges per row (status + length).
- **Modal:** the length picker is a control, not a decoration — use a two-option field ("1 week" / "2 weeks"): `@atlaskit/radio` RadioGroup inline, or `@atlaskit/select`; the computed-name preview row shows the same `default` lozenge next to the read-only auto-name. This replaces the "ribbon" mentioned in verdict §Catalyst-flags.

## 5. Grouping idiom — Month vs Status headers

JiraTable already ships the exact Jira grouping idiom: `.jira-table-group-row` — 40px, `--ds-surface-sunken` background, `@atlaskit/icon` chevron, collapsible, count, optional `renderGroupInlineRow` (`JiraTable.tsx:849-850, 1649, 1698`). Use it for BOTH groupings; do not invent a second header style:
- **Group by Month (default):** label "January 2026" + count, newest first. Sentence case (see §1).
- **Group by Status:** label = status name + count; optionally render the status lozenge itself as the group label (Jira backlog idiom).
- One "Group by" control in the toolbar (Month / Status / None) using the existing ToolbarMenuButton — not two toggles.

## 6. AI affordances — CatyPulseIcon rules

- Canonical mark: `CatyPulseIcon` — `token('color.icon.accent.magenta', '#CD519D')` (`src/components/ui/CatyPulseIcon.tsx:28`). **The magenta is the brand signal and is NEVER muted/greyed — including in the disabled state.**
- **Disabled Health/Summarize button:** do NOT use native `disabled` (Atlaskit greys all content — would mute the icon — and kills hover, so the tooltip never fires). Use the `aria-disabled` pattern: full-saturation magenta icon, label at `--ds-text-disabled`, click no-ops, wrapped in `@atlaskit/tooltip` listing the exact missing prerequisites ("Needs: sprint dates · at least 1 work item · status history"). This satisfies both the verdict's §7 tooltip requirement and the never-muted rule.
- Placement: beside "More actions" (verdict §7) — correct; results render in the canonical `CatyInsightCard` (`src/components/for-you/atlaskit/CatyInsightCard.tsx`), which the Jira probe confirmed is a genuine differentiator vs Rovo's chat drawer. Rainbow styling stays exclusive to `AIIntelligenceButton`/`CatyRainbowCTA` — the health button gets neither.

## 7. Terminology audit (ADS = sentence case, always)

| Use | Never | Why |
|---|---|---|
| **Owner** (column + modal person-picker, defaults to creator) | Driver | Jira's "Driver" is release-modal jargon; Catalyst vocabulary is Owner. Mirror only the *pattern* (avatar person-picker, creator default) |
| **End date** (column) | "Sprint end", "Release date" | Parallel construction with "Start date"; inside a Sprints table "End" is unambiguous. "Sprint end" is tolerable but asymmetric; "Release date" is a category error for sprints (SPRINT_CONFIG currently inherits `release_date` — `entity-hub/config.ts:157` — the redesign must bury that) |
| Create sprint / Start sprint / Complete sprint / Request approval | Create Sprint, START SPRINT | Sentence case for all buttons, menu items, filters |
| "Awaiting approval", "1 week"/"2 weeks" | AWAITING APPROVAL, 1W in prose | Lozenge uppercases itself; prose stays sentence case ("1W" abbreviation lives only inside the lozenge) |
| Filter: "All statuses" + multi-select checkboxes, default non-archived | "Released/Unreleased" | Release vocabulary must not leak (verdict unanimous #2) |
| Missing date/owner → "–" | any fabricated default | Zero-assumption rendering |

## 8. Anti-clutter / progressive disclosure

**Cut (verdict already agrees):** Description column, Project dropdown, density/hide menus. Keep them cut.
**Additional cuts/collapses to feel Atlaskit-designed:**
1. **Progress cell:** one segmented bar + "12/20" fraction, nothing else; per-status breakdown belongs in a tooltip on the bar (Jira idiom), not painted in the cell.
2. **Health %:** absent until the three data proofs pass — an empty column header with dashes is clutter; add the column only when it can render.
3. **Quick action:** contextual single subtle button on eligible rows only ("Start sprint"/"Complete sprint", Jira probe #6) — never a button on every row.
4. **Right rail:** Details always open; Approvals, Definition of done, Release link as collapsible cards (ReleaseSidePanel accordion precedent); AI summary card collapsed until generated. Empty cards render nothing, not "No data" slabs.
5. **Create modal:** 5 visible fields max (Name+auto/custom toggle, Length, Start date, Owner, Link to release); "Definition of done" as a collapsed expander seeded with defaults — editing DoD at create time is the exception, not the default path.
6. **Report:** sections appear only when their data source is proven (verdict §Renegotiated); last-day-add flag = `moved` (warning) lozenge, not `removed` — a late add is attention-worthy, not an error.

---

## Scores & top-3 fixes

### List page — 7/10
Solid column set and Jira-parity instincts; loses points on all-caps month headers and lozenge pile-up risk.
1. Month headers → JiraTable group-row, sentence case "January 2026" + count (no ALL-CAPS, no custom header band).
2. 1W/2W → subtle `default` Lozenge (no ribbon); max 2 lozenges/row.
3. Status colors ONLY via the appearance map (§3 table) + overdue `--ds-text-danger` plain text; lock `comfortable` density since the menu is gone.

### Create modal — 6.5/10
Right fields; the ribbon and unspecified stacking drag it down.
1. Kill the ribbon: length = RadioGroup/Select "1 week / 2 weeks"; lozenge only in the name preview.
2. Build on `@atlaskit/modal-dialog` + `@atlaskit/form` Field/Inline — component-owned title, spacing, footer; zero hand-stacked margins.
3. "Owner" person-picker (creator default, Jira Driver *pattern* only); sentence-case labels; auto-name preview as read-only field that recomputes live.

### Detail right rail — 7.5/10
Strong reuse plan (ApproversCard, CatyInsightCard).
1. Header pill = SUBTLE tier via statusPalette mapping — new statuses map to existing six appearances; no new colors outside statusPalette.ts.
2. Card geometry parity: padding 16 / gap 16 / inner 8 / tight 4; section labels unified at font-size-200/700 (do not copy the Approvers 400 inconsistency).
3. Health button: aria-disabled + tooltip, CatyPulseIcon magenta never muted.

### Sprint report — 6/10
Weakest surface: most of it is gated on unproven data and the wireframe under-specifies restraint.
1. Zero-assumption gating rendered as absence — no skeleton/placeholder sections for unproven analytics.
2. Late-add flag = `moved` (warning) lozenge, not danger; approval trail = avatars + lozenge + relative time (Approvals card pattern), not a custom timeline widget.
3. "Added after start" table = JiraTable (compact ok here), never a hand-rolled `<table>` — same rule that condemns ReleasesTable.

**Cross-cutting red line:** every surface inherits the ratchet gates (`npm run lint:colors:gate`, `audit:ads:gate`) — the ribbon and any month-header band would have introduced the only new bare-color risks; both are removed by this critique.
