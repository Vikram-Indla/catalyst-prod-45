# RUTHLESS UI AUDIT — Release Hub (2026-07-08, rubric v1)

Probe: injected computed-style JS + screenshot per route; scored against design-governance/RUTHLESS_UI_AUDIT_RUBRIC.md.
Workflow run wf_42671dc8-245, 11 routes.

## SYNTHESIS

# RELEASE HUB — RUTHLESS UI AUDIT SYNTHESIS (12 routes, rubric v1)

## 1. SCORE MATRIX

| Route | Score | Grade | Hard-fails | Top-3 point losses |
|---|---|---|---|---|
| /release-hub/calendar | 54 | F | HF1 (10px text) | B −14, A −8, D −6 |
| /release-hub/releases-management | 54 | F | HF1 (mechanical, 0px sr-only) | D −13, B −8, A −7 |
| /release-hub/release-kanban | 55 | F | none | D −11, B −11, A −8 |
| /release-hub/overview | 56 | F | HF1 (17 els at 10px) | B −15, D −8, A −7 |
| /release-hub/freeze-windows | 57 | F | HF1 (mechanical, 0px) | B −10, D −9, A −8 |
| /for-you | 57 | F | none | B −11, A −8, D −8 |
| /release-hub/sign-off-queue | 58 | F | none | B −11, A −9, C/D −6 each |
| /release-hub/changes | 59 | F | none | A −11, B −11, D −5 |
| /release-hub/execution | 59 | F | none | D −12, B −9, C −5 |
| /release-hub/production-events | 60 | C | HF1 (10px avatar badge) | B −13, D −9, A −5 |
| /release-hub/work | 61 | C | none | B −12, D −7, C −5 |
| /release-hub/sop-templates | 63 | C | HF1 (0px + 11px pair) | B −12, D −6, A/E −4 each |

**Module mean: 57.75 / 100 — F.** No route reaches B. Loss concentration: **B (typography) −137 pts total across 12 routes, D (density/empty states) −98, A (color/CTA discipline) −85.** Categories C/E/F/G/H are secondary noise; the module fails on three systemic axes, all shared-component-driven.

---

## 2. CROSS-ROUTE CONSISTENCY FINDINGS (H2)

1. **The CHG-1042 freeze countdown chip is a module-wide A2+A5+B1 violation — 12/12 routes.** Every single report flags the same 11px danger-red monospace pill in the top bar, and it is counted as a bold-fill on every route (the reason boldFillButtons is 2–4 everywhere). This is one shared chrome component (rendered from the release-hub shell/top nav; timer logic candidates: `src/components/releasehub/detail/ExecutionTimer.tsx`, banner variant in `src/components/releasehub/foryou/ReleaseChangeAnnouncementBanner.tsx` — currently modified in the working tree). One fix, twelve routes.

2. **Pink pulse FAB (hue 330) on 11/12 routes** — a permanent decorative saturated hue + extra bold-fill + 2 extra radius families (50/99). It single-handedly pushes /changes and /sign-off-queue to the 6-hue A1 ceiling and inflates contentBottomPct to a useless 100 on every empty route.

3. **Status rendering is four different patterns for the same concept across siblings:**
   - /changes: uppercase colored-text **bordered pills** (SCHEDULED, HIGH, EMERGENCY)
   - /sign-off-queue: uppercase **glowing pills** (OVERDUE, APPROVED)
   - /release-kanban: **lime bold-fill uppercase tag** (INVESTOR JOURNEY PRODUCT) — color-law breach
   - /work: correct subtle-bg lozenges, but 11px uppercase
   - /production-events + /overview: **bold-fill red "UNKNOWN"** on passive rows
   One canonical treatment exists in the codebase (`src/components/releasehub/shared/ReleaseOpsLozenges.tsx`) and is not used consistently.

4. **Empty states: five routes, five different designs, zero canonical.** /releases-management shows **two contradictory strings** ("No releases match this filter" + "This space has 0 releases"); /execution shows two bare text lines; /freeze-windows shows nothing after one card; /release-kanban shows bare dark panels; /overview portfolio shows centered "No releases". `src/components/releasehub/EmptyState.tsx` exists — none of them appear to use it with icon+value-prop+CTA.

5. **Toolbar layout drifts between siblings:** /sop-templates floats "New template" a full row above its filters; /execution orphans "All steps" at x≈1330; /calendar orphans "Re-run all" between legend and month nav; /changes keeps a proper single toolbar row. Same hub, four toolbar geometries.

6. **Radius chaos is shared, plus per-route mutations:** baseline {3,4,6,8,50} appears on all 12; /overview adds 2+12, /sign-off-queue adds 14, /release-kanban adds 10, /for-you hits **10 distinct radii** (2,3,4,6,8,11,12,25,50,99). No component-class discipline anywhere.

7. **6px gap is a systemic off-grid token:** 13–43 occurrences per route (43 on /work, 41 on /kanban, 25 on /for-you). This is one shared list-row/chip gap value, not per-page drift. Same for the 20px paddings (exactly ×2 on 9 routes — one shared container).

8. **The 0px sr-only pattern trips HF1 mechanically on 3 routes** (sop-templates, freeze-windows, releases-management flagged; same 3–5 Atlaskit hidden spans exist on all 12). Whatever wraps those a11y labels uses `font-size:0` instead of the clip pattern.

9. **Global "Create" vs page CTA conflict is unresolved across blueprints:** /changes says keep global Create bold; /overview, /releases-management, /work say keep the page CTA bold and demote Create. **Decide once, module-wide:** global "Create" is shell chrome and stays bold; every page-level CTA (Create release, New change, New template, New freeze window, Request sign-off, Deploy to beta) becomes `appearance="default"`. That yields exactly one bold-fill per view on all 12 routes with one convention.

10. **Breadcrumb duplicates the title on 4 routes** (overview "Releases/Dashboard", calendar, releases-management "Releases/Releases", sign-off-queue double title) — one breadcrumb builder bug.

---

## 3. RANKED REMEDIATION ORDER (points-per-hour)

### Tier 1 — shared-component fixes (each lifts 8–12 routes, ~1–2h each)

| # | Fix | Routes lifted | Est. pts | Component |
|---|---|---|---|---|
| 1 | **Countdown chip → subtle-bg lozenge, 12px, danger only <4h remaining** | 12 | +3–5 each (A2/A5/B1), ~+45 module | top-bar chip (ExecutionTimer/shell nav); banner twin in `ReleaseChangeAnnouncementBanner.tsx` |
| 2 | **Pulse FAB → neutral icon-subtle at rest (or remove from release-hub routes)** | 11 | +2–4 each (A1/A2/A5/H1), ~+30 | the floating pulse widget component |
| 3 | **12px floor sweep: promote every visible 10px/11px to 12px** (timeline axis/legend, ⌘K, CHG keys, filter chips, avatar badge "6", tab counts, field labels) | 12 — **clears real HF1 on /overview, /calendar, /production-events** | HF-uncap + B1, ~+40 | `ReleaseTimeline.tsx` (10px axis/legend), `FacetFilterBar.tsx` (chips), shared meta-label styles |
| 4 | **Status → `ReleaseOpsLozenges.tsx` everywhere**: sentence-case subtle-bg lozenge replaces uppercase pills/screams/bold fills | 6 (changes, sign-off, kanban, prod-events, overview, freeze-windows) | A3 0→4 + B3 gains, ~+25 | `src/components/releasehub/shared/ReleaseOpsLozenges.tsx` + `RiskBadge.tsx`, `DeployResultBadge.tsx`, `SourceBadge.tsx`, `WorkItemTag.tsx` |
| 5 | **sr-only fix: `font-size:0` → clip pattern** | 3 mechanical HF1s waived permanently (sop-templates, freeze-windows, releases-management) | HF-uncap on sop-templates (63 C → eligible for B) | whatever wraps Atlaskit icon labels |
| 6 | **Canonical empty state** (icon + value prop + CTA via `releasehub/EmptyState.tsx`), incl. fixing the releases-management contradictory dual message | 5 | D3 ~0→5 each, ~+20 | `src/components/releasehub/EmptyState.tsx` |
| 7 | **6px→8px and 20px→16/24 spacing snap** (one token change hits 200+ occurrences) | 12 | C1 +1–3 each, ~+20 | shared row/chip gap constant |
| 8 | **Radii consolidation: controls 4, cards 8, pills 50%** — retire 2/3/6/10/11/12/14/25/99 | 12 | H1 +1–2 each, ~+18 | shared card/chip styles |

### Tier 2 — highest single-page ROI

| Page | Why | Key fix |
|---|---|---|
| /sop-templates (63) | Already C; Tier-1 #3+#5 clear its HF1; add 13px→14px body cells (46 els) → **~75, B** | one cell style |
| /production-events (60) | HF1 is literally one 10px badge; TB-3/TB-5 trivial → **~70+** | one-liners |
| /work (61) | 11px→12px (25 els) + 13→14 (16 els) = B1+B2 together; drop "1–3 of 3" pagination | G-3 in its blueprint |
| /releases-management (54) | D 2/15 — the empty state IS the page; Tier-1 #6 alone is +10–12 | E-1/E-2 |
| /execution (59) | D 3/15 — render hour-grid scaffold when empty (+D1/D2) | E-1 |

### Tier 3 — page-specific density/structure (slower, do last)
/release-kanban board fill + column cap; /calendar week-row stretch + duplicate CHG-1042 event dedupe (**data-integrity bug — investigate regardless**); /changes table 2272px→fit column diet; /for-you row density 6→11 items; /overview KPI color discipline.

---

## 4. TOP-10 GLOBAL PRESCRIPTIONS

```
MODULE: /release-hub/* + /for-you (Release Ops surfaces)
CURRENT: mean 57.75/100 (F) — 6× HF1, 0 routes ≥ B

- G-1: FREEZE COUNTDOWN CHIP (all 12 routes): 11px danger-red bold monospace fill
       → 12px `var(--ds-text-subtle)` on `var(--ds-background-neutral)` subtle chip;
       danger tokens (`--ds-background-danger` + `--ds-text-danger`) ONLY when
       remaining < 4h; never counts as a bold-fill again. (A2/A5/B1, ~+45 module-wide)

- G-2: ONE BOLD-FILL CONVENTION: global "Create" keeps brand-bold; ALL page CTAs
       (Create release / New change / New template / New freeze window /
       Request sign-off / Deploy to beta / banner+gate Approve / SOP / Themify)
       → appearance="default"; boldFillButtons target = 1 on every route. (A2)

- G-3: TYPE SCALE COLLAPSE to exactly 4 buckets: 12 (metadata — promote every
       visible 10/11px), 14 (body — promote every 13px cell/row/event title),
       16 (section — fold 17/18), 22 (page title — fold 24/28 where feasible);
       clears every real HF1 (/overview 10px timeline, /calendar 10px,
       /production-events 10px badge). (B1/B2)

- G-4: SR-ONLY: replace font-size:0 hidden spans with the clip visually-hidden
       pattern module-wide; kills the 3 mechanical HF1s permanently. (HF1)

- G-5: STATUS = ReleaseOpsLozenges ONLY: every SCHEDULED/IMPLEMENTING/HIGH/
       CRITICAL/EMERGENCY/OVERDUE/APPROVED/ACTIVE/UNKNOWN/ON HOLD/lime tag
       → @atlaskit/lozenge subtle appearance, sentence case, 12px; zero
       uppercase colored-text pills, zero bold-fill status, lime retired. (A3, color law)

- G-6: TEXT COLORS → 3: var(--ds-text) / var(--ds-text-subtle) /
       var(--ds-text-subtlest); semantic color lives ONLY inside lozenge
       components; measured 6–9 per route today. (B3)

- G-7: SPACING SNAP: 6px→8px (systemic, 13–43 uses/route), 10px→8/12,
       20px→16/24, 7/19px→8/16; grid = {4,8,12,16,24,32} everywhere. (C1)

- G-8: RADII → 3 classes: controls 4px, cards 8px, pills/avatars 50%;
       retire 1/2/3/6/10/11/12/14/25/99 module-wide. (H1)

- G-9: CANONICAL EMPTY STATE (releasehub/EmptyState.tsx): icon + one-line
       value prop + single default-appearance CTA; fix releases-management's
       contradictory dual message (filter-mismatch ONLY when items exist);
       empty routes render structural scaffold (hour grid / week rows /
       column ghosts) to fill viewport ≥70%. (D1/D3, E3)

- G-10: ZERO-VALUE CHROME PURGE: no "0" count badges (kanban columns,
        "0e", "0 mand · 0 tech"), no pagination when total ≤ pageSize
        ("1–3 of 3"), no legend without rendered data (overview timeline,
        calendar health legend), no single-value columns (Source="Catalyst").
        Render "—" or nothing. (E3 + ZERO-ASSUMPTION rule)
```

**Projected outcome:** Tier-1 shared fixes alone move the module mean from ~58 to ~72–75 (C→B threshold) and clear all 6 hard-fails; only /release-kanban, /calendar, and /releases-management need structural (Tier-3) work to pass 75.

**Data-integrity flag (outside UI scope):** /calendar renders CHG-1042 twice on Jul 6 with two different title formats — dedupe by change key at the query layer, not CSS.

---

## PER-ROUTE REPORTS + BLUEPRINTS

ROUTE: /release-hub/overview
METRICS: {"viewport":[2133,1040],"fontSizes":{"0":3,"10":17,"11":25,"12":16,"13":6,"14":7,"16":3,"17":2,"22":1,"32":5},"textColors":8,"nonNeutralHues":[210,330,0,90,60],"spacingHist":{"1":2,"2":5,"4":62,"6":17,"8":45,"12":37,"16":55,"20":2,"24":4,"32":4},"offGridSpacing":[6,20],"contentBottomPct":100,"visibleEls":173,"radii":[2,3,4,6,8,12,50],"rowsVisible":0,"boldFillButtons":3}
(Supplementary probe: horizScroll:false; 17 visible elements at 10px — timeline axis labels "Jun 3/Jun 22/Jul 11...", legend "Released/Active/Upcoming/Freeze", "1 freeze window" badge, "Release" column header; the three 0px entries are visually-hidden a11y labels, excluded; uppercaseCount:4; transitionAll:0; stat tiles have tabular-nums)

SCORE: 56/100 GRADE: F HARDFAILS: HF1 (17 visible text elements at 10px — timeline axis, legend, freeze badge)

CATEGORY BREAKDOWN: A:13/20 B:5/20 C:11/15 D:7/15 E:7/10 F:7/10 G:4/5 H:2/5

BLUEPRINT:
ZONES: [Header] [KPI Row] [Release Portfolio] [Release Timeline] [AI Summary] [Pending Approvals] [Change Queue] [Production Events]

[Header]
- H-1: boldFillButtons=3 in viewport (global Create + Create release + red timer pill) → exactly 1 bold-fill inside the page (`Create release`); demote `Create change` to `appearance="default"` (already subtle — keep), and restyle the CHG-1042 countdown pill from saturated red fill to `var(--ds-background-danger)` subtle bg + `var(--ds-text-danger)` — only 1 primary CTA per view (A2).
- H-2: breadcrumb "Releases / Dashboard" while route says "overview" — keep terminal = "Dashboard" once, no duplicate route word.

[KPI Row]
- K-1: KPI captions ("all clear", "needs action", "resolve before deploy") measured at 11px in fontSizes(11:25) → raise to 12px metadata floor (B1).
- K-2: "resolve before deploy" rendered in warning/danger color on a passive caption → keep danger text ONLY on the Freeze-conflicts tile (actionable), drop color from "needs action"/"production deployments" to `var(--ds-text-subtlest)` (A5: semantic color only when action needed).
- K-3: five 32px numbers compete for the squint-test focal point (fontSizes 32:5) → keep 32px but set non-alert tiles' numbers to `var(--ds-text)` and only the 2 action tiles (Pending approvals, Freeze conflicts) get semantic color, restoring one dominance tier (E1).

[Release Portfolio]
- P-1: empty state is bare text "No releases" centered in a ~90px dead band (D3 = 0) → replace with icon + one-line value prop + `Create release` link-button, or collapse the section entirely when count=0 (a lie-free dash beats dead space).

[Release Timeline]
- T-1: axis labels, "RELEASE" header, legend, and "1 freeze window" badge all 10px (fontSizes 10:17 — the HF1 trigger) → raise every one to 11px minimum, axis/legend to 12px preferred; this single fix clears the hard fail.
- T-2: legend swatches use 4 hues (gray/blue/green/red) in a strip that currently shows zero bars → hide legend until ≥1 release renders (E3: every indicator earns its place).
- T-3: "Click release → opens filter module" italic hint at 10px → move to a tooltip on the section header, remove from canvas.

[AI Summary]
- S-1: fine as-is; keep "On track" as subtle lozenge — do not let it inherit bold fill.

[Pending Approvals]
- A-1: three identical `Review` outline buttons + row text at 11–12px → row primary text to 14px (`var(--ds-font-size-100)` equivalent token), metadata "1D" stays 12px (B1: body ≥14px).
- A-2: offGridSpacing shows 6px used 17× (row internal gaps) → snap to 8px (C1), and 20px×2 → snap to 16 or 24.

[Change Queue]
- Q-1: "HIGH RISK" / "CRITICAL RISK" are uppercase colored text screamers (uppercaseCount:4, A3) → convert to `@atlaskit/lozenge` subtle appearance (`removed`/`moved`), sentence case handled by component.
- Q-2: "SCHEDULED" / "IMPLEMENTING" right-edge uppercase text → same lozenge treatment; status never bold uppercase raw text.
- Q-3: CHG keys at 11px monospace → 12px floor (B1).

[Production Events]
- E-1: "UNKNOWN" bold-fill red badge on a passive historical event → subtle-bg neutral lozenge (`var(--ds-background-neutral)` + `var(--ds-text-subtle)`); red bold fill reserved for rows needing action today (A3/A5).

[Global]
- G-1: 9 distinct font sizes (10,11,12,13,14,16,17,22,32) → collapse to 4: 12 (metadata), 14 (body), 17→16 (section titles), 32 (KPI numerals); retire 10/11/13/22 (B2).
- G-2: 8 distinct text colors on copy → 3 levels: `var(--ds-text)`, `var(--ds-text-subtle)`, `var(--ds-text-subtlest)`; semantic colors only via lozenge components (B3).
- G-3: 7 border radii (2,3,4,6,8,12,50) → 3 classes: controls 4px, cards 8px, avatars/pills 50% — retire 2, 3, 6, 12 (H1).
- G-4: offGridSpacing [6,20] (19 occurrences) → snap 6→8 and 20→16/24; grid becomes fully {4,8,12,16,24,32} (C1).

---

ROUTE: /release-hub/calendar
METRICS: {"viewport":[1680,894],"fontSizes":{"0":3,"10":1,"11":16,"12":45,"13":1,"14":2,"16":1,"17":2,"22":1},"textColors":6,"nonNeutralHues":[210,330,0,180,90,60],"spacingHist":{"1":2,"2":5,"4":242,"6":13,"8":32,"10":2,"12":15,"16":5,"20":2,"24":4},"offGridSpacing":[6,10,20],"contentBottomPct":100,"visibleEls":185,"radii":[1,3,4,6,8,50],"rowsVisible":0,"boldFillButtons":2}
SCORE: 54/100 GRADE: F HARDFAILS: HF1 (1 element at 10px computed font-size; 16 elements at 11px sit at the absolute floor)
CATEGORY BREAKDOWN: A:12/20 B:6/20 C:10/15 D:9/15 E:6/10 F:5/10 G:3/5 H:3/5
BLUEPRINT:

PAGE: /release-hub/calendar
GRADE: F (54/100) — HF1 triggered (10px text); typography is the page's structural failure, not color
ZONES: [Header] [Toolbar] [Legend] [Calendar Grid] [Global Chrome]

[Header]
- H-1: page title 22px is the only element >17px and works as focal point — keep; but breadcrumb "Releases / Calendar" repeats the title word → terminal breadcrumb = title, drop the duplicate "Calendar" crumb text.
- H-2: header countdown pill "+1d 09h 05m CHG-1042" renders danger-red monospace text as a passive ticker → move to subtle-bg lozenge (var(--ds-background-danger) + var(--ds-text-danger)) — red must mean "act now", not "clock running".

[Toolbar]
- T-1: boldFillButtons=2 (Create + AI pulse FAB both saturated fills) → exactly 1 bold-fill per view; demote the floating pink FAB to subtle appearance or icon-only neutral — A2 fails mechanically at 2.
- T-2: "Re-run all" sits orphaned at the right edge between legend and month nav → dock it beside the Month/Quarter segmented control (left cluster = controls, right cluster = time navigation only).
- T-3: offGridSpacing shows 6px (13 uses) and 10px (2) and 20px (2) → snap 6→4 or 8, 10→8 or 12, 20→16 or 24; toolbar chips are the main 6px offenders.

[Legend]
- L-1: 16 elements at 11px are legend/metadata labels ("Release/Change/Freeze/Production", "on track/at risk/off track") → raise 11px→12px floor; the single 10px element (HF1) → 12px, nothing below 12 anywhere.
- L-2: two legends on one row (4 type colors left + 3 health colors right) = 7 simultaneous color keys feeding 6 non-neutral hues (210,330,0,180,90,60 — at the A1 ceiling) → health legend only renders when a visible event carries health data; kill teal(180)/yellow(60) from the viewport when unused.

[Calendar Grid]
- G-1: event bar titles computed 12px on dark low-contrast chips → 12px is acceptable metadata floor but these are the PRIMARY content; raise event titles to 13–14px and hold row height via line-height 16px.
- G-2: duplicate rendering — "CHG-1042 Deploy payments servic…" and "CHG-1042 — Deploy payments ser…" both on Jul 6 → dedupe by change key; a duplicate row is a data-integrity signal on a governance surface.
- G-3: textColors=6 distinct copy colors → collapse to 3 (var(--ds-text), var(--ds-text-subtle), var(--ds-text-subtlest)); event-type color belongs on the 2px left border only, never the text.
- G-4: 8 distinct font sizes (10,11,12,13,14,16,17,22) → collapse to 4: 22 (title), 14 (controls/event titles), 12 (metadata/day numbers), 11 kill entirely.
- G-5: grid bottom edge ~78% of viewport with dead band below → stretch week rows to fill to footer (min-height: calc from viewport), giving each week row +~35px so multi-event days (Jul 6 shows 3 stacked, near overflow) breathe.
- G-6: freeze indicator on Jul 7 is a bare red top border with 11px text → subtle danger-bg band across the full cell (var(--ds-background-danger)) with 12px label; border-only signal fails the squint test.

[Global Chrome / Consistency]
- C-1: radii histogram [1,3,4,6,8,50] = 6 radius values → 3 classes: controls 4px, cards/cells 8px, pills 50% — retire 1px, 3px, 6px.
- C-2: today-cell uses selected-bg + bold border + "Today" badge = 3 simultaneous signals → keep selected-bg + badge, drop the heavy border (one signal per state).

---

ROUTE: /release-hub/releases-management
METRICS: {"viewport":[1680,894],"fontSizes":{"0":3,"11":2,"12":2,"13":1,"14":7,"16":1,"17":1,"22":1},"textColors":6,"nonNeutralHues":[210,330,0,90],"spacingHist":{"1":4,"2":6,"4":47,"6":19,"8":39,"10":6,"12":9,"20":2,"24":12,"32":1,"48":2},"offGridSpacing":[6,10,20],"contentBottomPct":100,"visibleEls":70,"radii":[3,4,6,8,50],"rowsVisible":0,"boldFillButtons":3}
SCORE: 54/100 GRADE: F HARDFAILS: HF1 (mechanical: fontSizes key 0 ×3 — probed, all are visually-hidden Atlaskit a11y icon-label spans "Expand sidebar"/"Notifications"/"Settings", not rendered text; smallest VISIBLE text is 11px "⌘K"/"CHG-1042"). HF2 no (4 hues). HF3 not applied — view is an empty state, not populated (0 releases), scored under D3 instead; visible content occupies <15% of the content zone regardless. HF4 not probed. HF5 no (scrollWidth 1668 ≤ 1680).
CATEGORY BREAKDOWN: A:13/20 B:12/20 C:9/15 D:2/15 E:6/10 F:7/10 G:2/5 H:3/5

Category notes (measured basis):
- A1 6/6 (4 hues: blue 210, pink 330, red 0, green 90). A2 1/4 (boldFillButtons=3: global "Create", "Create release", plus saturated CHG countdown chip — two competing bold CTAs in one viewport). A3 2/4 (CHG-1042 "+1d 09h 10m" chip is red/pink monospace bold — passive status rendered as alarm). A4 3/3 (dark neutral field, well >85%). A5 1/3 (red/pink countdown + pink pulse FAB with green dot are decorative attention colors on non-actionable elements).
- B1 4/6 (11px on ⌘K hint and CHG-1042 — below the 12px metadata floor, above the 11px hard-fail line). B2 1/4 (7 visible size buckets: 11,12,13,14,16,17,22 vs max 4). B3 2/4 (6 distinct copy colors vs max 3). B4 3/3 (no numeric columns present — nothing violable). B5 2/3 (Atlaskit defaults, unverified edge cases).
- C1 2/5 (off-grid 6px ×19, 10px ×6, 20px ×2 = 27 of ~150 spacing samples off the 4/8 grid). C2 3/5 (toolbar→content separation fine but two empty-state texts float unanchored 70px apart). C3 2/3 (Atlaskit button padding, one unverified custom chip). C4 2/2 (single consistent gutter).
- D1 2/6 (visible content ends at y≈300 of 894 — everything below is void). D2 0/4 (0 rows). D3 0/5 (empty state = two bare text strings, no icon, no value prop, no CTA in the empty zone).
- E1 2/4 (22px "Releases" title dominates but breadcrumb repeats "Releases / Releases"). E2 3/3. E3 1/3 (contradictory dual messages: "No releases match this filter." AND "This space has 0 releases" — the filter message lies when the space is simply empty).
- F 7/10 (Atlaskit primitives carry hover/focus by default; F2 focus-visible and F3 disabled not exhaustively probed — partial credit only).
- G 2/5 (no skeleton observed on load; content pops in; transitions not audited).
- H1 1/3 (5 radius values 3,4,6,8,50 — controls split across 3/4/6/8 with no class discipline). H2 2/2 (toolbar/CTA pattern matches sibling release-hub routes).

BLUEPRINT:
```
PAGE: /release-hub/releases-management
GRADE: F (54/100) — D-category collapse (2/15): empty state is the whole page and it is bare text
ZONES: [Header] [Toolbar] [EmptyState] [GlobalChrome]

[Header]
- H-1: breadcrumb "Releases / Releases" → "Release Hub / Releases" — terminal crumb duplicates the 22px title verbatim; drop or re-parent it
- H-2: title 22px kept; ensure it is the ONLY >17px text (fontSizes shows lone 22 — correct, preserve)

[Toolbar]
- T-1: boldFillButtons 3 → 1: keep "Create release" bold; global nav "Create" → subtle/default appearance so the page CTA is unique
- T-2: off-grid paddings 6px(×19)/10px(×6)/20px(×2) → snap to 4/8/12/16/24 — 18% of spacing samples are off the ADS 4pt grid
- T-3: font-size buckets 7 → 4: fold 13px→12px and 16/17px→14px (or 16px heading tier) so the histogram reads 12/14/16/22 only

[EmptyState]
- E-1: two contradictory strings ("No releases match this filter." at y≈226 + "This space has 0 releases" at y≈295) → ONE state: when space has 0 releases show the space-empty state; show filter-mismatch ONLY when releases exist but filters exclude them
- E-2: bare text → canonical @atlaskit/empty-state: icon + "Track what ships and when" value prop + primary "Create release" action (D3 0/5 → 5/5)
- E-3: content bottom y≈300/894 (≈33% used) → center empty-state block vertically in the content zone (target ≥50% perceived occupancy)

[GlobalChrome]
- G-1: CHG-1042 countdown chip: red/pink bold 11px monospace → subtle-bg lozenge, 12px, neutral until <1h remaining (semantic red reserved for action-needed)
- G-2: 11px "⌘K" hint and chip text → 12px metadata floor (B1 debt; also clears the near-HF1 margin)
- G-3: pink pulse FAB (bottom-right, hue 330 + green dot) → neutral icon-subtle at rest; saturate only on active state (A5 debt)
- G-4: radii {3,4,6,8,50} → 2 classes: controls 4px (3→4, 6→4), cards 8px, pills 50 kept; eliminates 3px/6px strays
- G-5: text colors 6 → 3: map all copy to --ds-text / --ds-text-subtle / --ds-text-subtlest
```

---

ROUTE: /release-hub/execution
METRICS: {"viewport":[1680,894],"fontSizes":{"0":3,"11":2,"12":5,"13":2,"14":4,"17":2,"22":1},"textColors":6,"nonNeutralHues":[210,330,0,90],"spacingHist":{"1":2,"2":9,"4":42,"6":19,"8":27,"12":11,"16":7,"20":2,"24":8},"offGridSpacing":[6,20],"contentBottomPct":100,"visibleEls":57,"radii":[3,4,6,8,50],"rowsVisible":0,"boldFillButtons":3}
SCORE: 59/100 GRADE: F HARDFAILS: none confirmed — HF1 tripped mechanically on fontSizes key "0" but the 3 elements are sr-only accessibility labels ("Expand sidebar", "Notifications", "Settings") with no rendered glyphs → waived as false positive; visible floor is 11px (⌘K hint, CHG-1042 chip). HF2 pass (4 hues). HF3 N/A (view is an empty state, not populated — but real content ends at y=287 of 894 ≈ 32%, punished under D1). HF5 pass (scrollWidth 1668 < 1680, no horizontal scrollbar).
CATEGORY BREAKDOWN: A:15/20 B:11/20 C:10/15 D:3/15 E:8/10 F:7/10 G:2/5 H:3/5

Category evidence:
- A1 6/6 (4 hues: 210 blue, 330 magenta, 0 red, 90 green). A2 2/4 (boldFillButtons=3 — Create, active Day segment, timer chip; should be 1). A3 3/4 / A5 1/3 (top-bar "+1d 09h 11m CHG-1042" countdown uses danger-red monospace on a passive, non-actionable chip). A4 3/3 (screenshot ≥95% neutral).
- B1 4/6 (11px on ⌘K + CHG-1042 — below 12px metadata floor). B2 1/4 (6 visible sizes: 11/12/13/14/17/22 > 4). B3 1/4 (6 distinct copy colors > 3). B4 3/3 (no numeric columns present). B5 2/3.
- C1 2/5 (offGrid 6px ×19 + 20px ×2 = 21 of ~130 nonzero paddings/gaps). C2 4/5, C3 2/3, C4 2/2.
- D1 2/6 (calendar shell doesn't render a grid when empty; real content stops at 32% of viewport — contentBottomPct=100 is an artifact of the floating pulse widget). D2 0/4 (rowsVisible=0, no hour-slot skeleton). D3 1/5 (empty state = two lines of bare text; no illustration, no primary CTA to "Apply SOP template").
- E1 3/4, E2 2/3 ("All steps" filter orphaned at far right edge, detached from the Day/Week/Today cluster), E3 3/3.
- F 7/10 (atlaskit-derived hover/focus assumed, unprobed; no disabled states visible). G 2/5 (no skeleton on load path; empty card pops in). H1 1/3 (5 radius values 3/4/6/8/50 in one sparse view), H2 2/2.

BLUEPRINT:
ZONES: [TopBar] [PageHeader] [CalendarToolbar] [Content/EmptyState]

[TopBar]
- T-1: "+1d 09h 11m CHG-1042" chip 11px danger-red monospace → 12px `var(--ds-text-subtle)` with red reserved for last-hour urgency only; passive countdown ≠ danger (A5, B1).
- T-2: ⌘K hint 11px → 12px `var(--ds-text-subtlest)`; kills the sub-12px metadata bucket (B1).
- T-3: demote one of the 3 saturated-fill controls — Create keeps bold-fill, Day segment moves to `background-selected` neutral treatment → exactly 1 primary CTA per view (A2).

[PageHeader]
- P-1: fontSizes shows 7 visible buckets (11,12,13,14,17,22) → collapse to 4: 22 title / 14 body / 12 metadata, retire 13 and 17 (fold 17px "Execution calendar" into 16 or 20 heading token) (B2).
- P-2: textColors=6 → cap at 3 (`--ds-text`, `--ds-text-subtle`, `--ds-text-subtlest`); merge breadcrumb/hint/label colors into subtle/subtlest (B3).

[CalendarToolbar]
- CT-1: "All steps" select orphaned at right edge x≈1330 → dock it adjacent to the Day/Week/Today group (8px gap) so the scan path is title → controls → content in one run (E2).
- CT-2: offGridSpacing 6px ×19 → snap to 8px (or 4px where tight); 20px ×2 → snap to 24px; brings C1 to 100% grid compliance.
- CT-3: radii histogram [3,4,6,8,50] → one control radius (4px) for buttons/segments/selects, 8px for the content card, pill (50) only on the timer chip → 3 classes max (H1).

[Content/EmptyState]
- E-1: content ends at y=287 (32% of 894px viewport) → render the 24-hour slot grid scaffold even when empty (dimmed hour rows to footer), lifting content bbox 32% → ≥75% (D1) and giving ≥15 visible hour rows (D2).
- E-2: empty state is 2 lines of bare 14/12px text → upgrade to icon (calendar-clock, `--ds-icon-subtle`) + 14px value prop + one default-appearance button "Apply SOP template" linking to the change picker (D3).
- E-3: add a skeleton matching the slot-grid layout on load path → no pop-in (G2).
- E-4: empty-card body copy 12px `--ds-text-subtlest` at 1050px line length → 14px `--ds-text-subtle`, max-width 480px centered (B1/readability).

---

ROUTE: /release-hub/sign-off-queue
METRICS: {"viewport":[1680,894],"fontSizes":{"0":3,"11":24,"12":7,"13":8,"14":3,"17":2,"22":1},"textColors":8,"nonNeutralHues":[210,330,0,30,60,90],"spacingHist":{"1":2,"2":5,"4":45,"6":17,"7":2,"8":41,"10":24,"12":32,"16":4,"20":2,"24":4,"32":1},"offGridSpacing":[6,7,10,20],"contentBottomPct":100,"visibleEls":111,"radii":[3,4,6,8,14,50],"rowsVisible":0,"boldFillButtons":4}
SCORE: 58/100 GRADE: F HARDFAILS: none (fontSize 0 entries are visually-hidden a11y labels "Expand sidebar/Notifications/Settings", not rendered text; min visible = 11px; 6 hues ≤ 8; no horizontal scroll; contentBottomPct 100 but true content area ~66%)
CATEGORY BREAKDOWN: A:11/20 B:9/20 C:9/15 D:9/15 E:8/10 F:6/10 G:3/5 H:3/5

Category evidence:
- A1 5/6: exactly 6 non-neutral hues (210 blue, 330 pink, 0 red, 30 orange, 60 yellow, 90 green) — at the ceiling, zero headroom.
- A2 1/4: boldFillButtons=4 (Create, Request sign-off, banner Approve, gate Approve) — 4 competing primary CTAs in one viewport.
- A3 1/4: status rendered as uppercase screams ("OVERDUE", "APPROVED" — textTransform:uppercase confirmed) instead of subtle-bg lozenges.
- A4 2/3: mostly neutral dark, but the full-width saturated brown emergency band is a large painted non-neutral field.
- A5 2/3: warning band is actionable (justified); red "Rejected" text on the collapsed card header/right edge is passive status in danger color.
- B1 2/6: 24 visible elements at 11px (filter chips, CHG-1042, ⌘K); body copy at 12–13px (7+8 els) — below the 14px body floor.
- B2 1/4: 6 visible sizes {11,12,13,14,17,22} > 4.
- B3 1/4: 8 distinct text colors on copy > 3 levels.
- B4 3/3: no numeric columns in Visual mode (n/a).
- B5 2/3: line-heights approx default; density achieved by font-shrink (11–13px), not compression.
- C1 2/5: 45 off-grid spacing occurrences — 10px ×24, 6px ×17, 20px ×2, 7px ×2 (~25% of all paddings/gaps).
- C2 3/5, C3 2/3, C4 2/2.
- D1 3/6: real content ends ~y645 of 894 → ~66% of viewport area used; bottom third is dead space with one release group.
- D2 1/4: rowsVisible=0 (no table rows); a single release card + 2 gates + 1 collapsed change row — far under 15-item density.
- D3 5/5: populated view (n/a).
- E1 2/4: 22px title dominates text, but 4 bold fills + glowing banner split the squint-test focal point.
- E2 3/3, E3 3/3: count "(1)" earned; no zero badges.
- F 6/10: hover present on chips/buttons; focus-visible not verified on custom gate Approve/Reject pills; disabled states unobserved.
- G 3/5: no transition:all observed; skeleton path not observed.
- H1 1/3: 6 distinct radii {3,4,6,8,14,50} across one view — 3/4/6 used interchangeably on same-class pills. H2 2/2 (Visual/Table toggle consistent with hub siblings).

BLUEPRINT:
PAGE: /release-hub/sign-off-queue
GRADE: F (58/100) — no hard-fail, fails on typography scale, CTA discipline, density
ZONES: [Header] [FilterBar] [EmergencyBanner] [ReleaseCard] [Viewport]

[Header]
- H-1: page shows two titles ("Sign-off queue" 22px H1 + 17px breadcrumb-header duplicate) → keep one 22px title, breadcrumb terminal text stays 12px subtle; duplicate route word violates E-scan economy.
- H-2: bold-fill count 4 → 1: keep "Request sign-off" as the only brand-bold CTA on this route; global "Create" is shell chrome, but banner Approve and gate Approve → default/subtle appearance with success-colored text, because A2 allows exactly one primary.

[FilterBar]
- F-1: chip labels 11px → 12px minimum (metadata floor); 24 elements sit at the absolute HF1 boundary.
- F-2: chip radii mix (3/4/6px measured) → one control radius 4px (or pill 14px) across all 8 chips; H1 shows 6 distinct radii page-wide, target 3 (controls 4, cards 8, pills/avatars 50%).

[EmergencyBanner]
- E-1: full-width saturated warning field → warning left-border (2px) + `var(--ds-background-warning)` subtle bg only on the header strip; painted warning pixels drop ~70%, restoring A4 neutral ratio.
- E-2: banner Approve bold-fill → subtle button; Reject stays subtle danger; removes 2 of the 4 competing primaries.

[ReleaseCard]
- R-1: "OVERDUE"/"APPROVED" uppercase glowing pills → sentence-case subtle-bg lozenges (`var(--ds-background-warning)`/`var(--ds-background-success)` with matching text tokens); uppercase scream is an A3 automatic deduction.
- R-2: gate body text 12–13px (15 els) → 14px `var(--ds-text)`; metadata line ("Due Jul 6…") stays 12px; recover B1 while holding density via line-height 20px→16px.
- R-3: text colors 8 → 3 (text / text-subtle / text-subtlest); collapse the ad-hoc grays on due-dates, gate labels, and section headers into the three ADS levels.
- R-4: off-grid paddings — 10px ×24 → 8px, 6px ×17 → 8px (or 4px), 20px ×2 → 24px, 7px ×2 → 8px; snaps 45 occurrences onto the {4,8,12,16,24} grid.
- R-5: passive "Rejected" red header text → subtle danger lozenge on the card header; danger color must mark the actionable gate, not the summary label.
- R-6: font-size count 6 → 4: {12, 14, 16 section, 22 title}; drop the 13px and 17px intermediates entirely.

[Viewport]
- V-1: content area ~66% → ≥80%: expanded-by-default change-level gates (currently collapsed "4 gates · Rejected" hides the page's core data) + auto-expand the single release group; a one-card page with a dead bottom third fails its own purpose.
- V-2: rowsVisible 0 → default to Table view when queue ≤ N releases is false and density matters, or render gate rows as compact 32px rows so ≥15 decision items fit at 1440×900.
- V-3: add focus-visible ring `var(--ds-border-focused)` 2px on gate Approve/Reject pills and filter chips (unverified in probe — F2 risk).

---

ROUTE: /release-hub/sop-templates
METRICS: {"viewport":[1680,894],"fontSizes":{"0":3,"11":2,"12":25,"13":46,"14":3,"17":1,"22":1},"textColors":6,"nonNeutralHues":[210,330,0,90],"spacingHist":{"1":2,"2":89,"4":141,"6":19,"8":73,"12":91,"16":4,"20":2,"24":4,"32":1},"offGridSpacing":[6,20],"contentBottomPct":100,"visibleEls":320,"radii":[3,4,6,8,50],"rowsVisible":6,"boldFillButtons":3,"hScroll":false}
SCORE: 63/100 GRADE: C HARDFAILS: HF1 (fontSizes has keys 0px ×3 and 11px ×2 — mechanical <11px trigger on the 0px text-bearing elements)
CATEGORY BREAKDOWN: A:16/20 B:8/20 C:11/15 D:9/15 E:6/10 F:7/10 G:3/5 H:3/5
BLUEPRINT:
ZONES: [Header] [Toolbar] [Table] [Viewport]

[Header]
- H-1: title "SOP templates" 22px is sound; but 7 distinct font-size buckets on page (0,11,12,13,14,17,22) → collapse to 4 (12 metadata / 14 body / 17 section / 22 title); B2 measured 7 buckets.
- H-2: two competing bold-fill blue CTAs in one viewport ("+ Create" top nav + "+ New template") plus saturated pink pulse widget = boldFillButtons:3 → keep "New template" bold, top-nav Create is global chrome but the pink floating widget (hue 330) must go subtle/neutral; A2 requires exactly one page-level bold CTA.
- H-3: 3 text-bearing elements at computed 0px and 2 at 11px → if they are a11y-hidden text, move to a `visually-hidden` class (clip pattern, not font-size:0); raise the 11px pair to 12px floor — clears HF1.

[Toolbar]
- T-1: filter row (Environment/Category/State) sits left, search sits right, "New template" floats a full row above the filters → merge into one 32px toolbar row: filters left, search + New template right; kills one vertical band (~48px) and fixes the orphaned right-edge CTA.
- T-2: off-grid spacing 6px ×19 and 20px ×2 → snap 6→4 or 8, 20→16 or 24 (C1).

[Table]
- C-1: body cell text 13px ×46 and description text 12px ×25 with body floor at 14px → primary cell text (template name, Category, Env, Updated) 13px→14px; keep descriptions at 12px metadata (B1 is the single largest point loss on the page).
- C-2: 6 distinct copy colors → reduce to 3 (var(--ds-text) / var(--ds-text-subtle) / var(--ds-text-subtlest)); B3 measured 6.
- C-3: Steps column renders "0 · 0 mand · 0 tech · 0 ev · 0 rb" — four zero-value sub-badges per zero-step row across 4 of 6 rows → render "—" when steps=0 and show only non-zero facets when steps>0 (E3 scored 0/3; also ZERO-ASSUMPTION rule).
- C-4: Est. column shows "—" for 5/6 rows and one "120m" → ensure tabular-nums + right-align on Est. and Steps count (B4); if Est. is unpopulated in data, drop the column until it has values.
- C-5: radii histogram {3,4,6,8,50} = 4 control radii → standardize controls to 4px (or ADS border.radius token) and cards to 8px; 3px and 6px outliers merge into 4 (H1).
- C-6: an inner horizontal scrollbar track renders under the table at 1680px wide despite columns fitting → remove forced min-width/overflow-x on the table wrapper; visual noise with zero function.

[Viewport]
- V-1: populated table ends at ~480px of a 894px viewport (~54% visually; the 100% metric is inflated by the floating pulse widget at bottom-right) → let the table container fill to the footer (min-height stretch) or tighten the card to content and pull page bottom padding up; dead band below the table is ~400px (D1).
- V-2: only 6 rows for 6 templates — density acceptable for the dataset, but two-line rows spend 8px vertical padding each; keep as-is, no cramping needed (D2 not actionable at n=6).
- V-3: red timer badge "+1d 09h 16m CHG-1042" (hue 0) in global nav is a persistent danger-colored element on a non-actionable surface for this page → verify it is action-linked; if informational, demote to neutral lozenge (A5).

---

ROUTE: /release-hub/freeze-windows
METRICS: {"viewport":[1680,894],"fontSizes":{"0":3,"11":4,"12":3,"13":2,"14":4,"17":1,"22":1},"textColors":6,"nonNeutralHues":[210,330,0,90],"spacingHist":{"1":2,"2":5,"4":48,"6":13,"8":28,"12":8,"16":9,"20":2,"24":4},"offGridSpacing":[6,20],"contentBottomPct":100,"visibleEls":54,"radii":[3,4,6,8,50],"rowsVisible":0,"boldFillButtons":3,"hscroll":false}
SCORE: 57/100 GRADE: F HARDFAILS: HF1 (fontSizes has key "0" ×3 text-bearing elements — computed font-size 0px < 11px floor; visible floor is 11px ×4 which passes, but the 0px keys trip the mechanical rule — likely clipped/sr-only text that must be moved off the text-bearing path or given a real size)
CATEGORY BREAKDOWN: A:12/20 B:10/20 C:9/15 D:6/15 E:7/10 F:7/10 G:3/5 H:3/5
BLUEPRINT:

ZONES: [Header] [Toolbar] [Freeze list] [Viewport]

[Header]
- H-1: title 22px + breadcrumb 12px are fine; but 6 distinct font sizes on the view (11/12/13/14/17/22) → collapse to 4: kill 13px (description → 12px `--ds-text-subtle`) and 17px (card title → 14px semibold); B2 requires ≤4 buckets.
- H-2: 6 distinct text colors on copy → cap at 3 (`--ds-text`, `--ds-text-subtle`, `--ds-text-subtlest`); the danger-tinted title/date colors on the card contribute 3 extras.
- H-3: fontSizes key "0" ×3 → give hidden/utility text `position:absolute;clip` sr-only pattern or 12px, never `font-size:0` (HF1 trigger).

[Toolbar]
- T-1: boldFillButtons = 3 (global Create, CHG-1042 countdown pill, New freeze window) with 2 in one action band → demote "New freeze window" to default (subtle) appearance OR keep it bold and neutralize the countdown pill to subtle-bg; rubric A2 = exactly 1 bold CTA per view.
- T-2: toolbar row floats alone with the button orphaned at the right edge above an unrelated full-width card → left-align a section label ("1 active window") beside the CTA so the scan path has an anchor (E2).

[Freeze list]
- L-1: entire row painted with danger-tinted bold background + red border + red icon → replace full-row wash with neutral `--ds-surface-raised` card + 3px left border `--ds-border-danger`; reserve area fill for rows needing action today (A3/A5, currently 1/4 and 1/3).
- L-2: "ACTIVE" + "CONFLICT ×2" are uppercase screaming text chips → convert to `@atlaskit/lozenge` (ACTIVE → appearance="success" subtle; CONFLICT ×2 → appearance="removed" subtle); passive status must be subtle-bg lozenge.
- L-3: description 13px → 12px `--ds-text-subtle`; card title 17px → 14px/600 — removes the two off-bucket sizes found in the histogram.
- L-4: date "Jul 6 – Jul 7, 2026" + "Production" right-edge stack → add `font-variant-numeric: tabular-nums` and explicit right alignment for the date column (B4).
- L-5: offGridSpacing [6 ×13, 20 ×2] → snap the 13 6px gaps to 4 or 8, the 2 20px paddings to 16 or 24 (C1: 15 off-grid instances).

[Viewport]
- V-1: real painted content ends at ~235px of an 894px viewport (~26% visually; the 100% metric is inflated by the floating pulse widget bottom-right) → after the single card, render a ghost/CTA panel: "No upcoming freeze windows — schedule the next one" with icon + secondary button, filling the dead 74% (D1 2/6, D3 3/5).
- V-2: rowsVisible = 0 (cards, not a table) with 1 item → if this list is expected to grow, mount the canonical JiraTable/list at 36px row height so ≥15 rows fit at 1440×900 (D2).
- V-3: radii histogram [3,4,6,8,50] = 5 distinct → converge to 4px (controls/chips) + 8px (cards); 3px and 6px are drift (H1).

---

ROUTE: /release-hub/production-events
METRICS: {"viewport":[1680,894],"fontSizes":{"0":3,"10":1,"11":4,"12":11,"13":5,"14":3,"17":1,"22":1},"textColors":6,"nonNeutralHues":[210,330,0,90],"spacingHist":{"1":2,"2":21,"4":70,"6":13,"8":31,"12":33,"16":4,"20":2,"24":4},"offGridSpacing":[6,20],"contentBottomPct":100,"visibleEls":146,"radii":[3,4,6,8,50],"rowsVisible":1,"boldFillButtons":2}
SCORE: 60/100 GRADE: C HARDFAILS: HF1 (10px visible text — avatar count badge "6"; the three 0px entries are visually-hidden a11y labels, excluded). HF2 no (4 hues). HF3 not triggered mechanically (contentBottomPct=100, though this is polluted by the sidebar/floating pulse widget — true content bbox ends ~210px, ~24% of viewport). HF5 no (bodyHScroll=false; the horizontal scrollbar is INSIDE the table container, not the body).
CATEGORY BREAKDOWN: A:15/20 B:7/20 C:12/15 D:6/15 E:6/10 F:8/10 G:3/5 H:3/5

BLUEPRINT:
PAGE: /release-hub/production-events
ZONES: [TopBar] [PageHeader] [Table] [Viewport]

[TopBar]
- T-1: boldFillButtons=2 (Create + freeze-timer pill "+1d 09h 19m CHG-1042") → keep Create as the ONE bold-fill CTA; freeze pill to subtle-bg lozenge (var(--ds-background-danger) bg + var(--ds-text-danger) text), because A2 allows exactly one primary per view.
- T-2: monospace pink/red timer uses danger hue as ambient decoration → danger only if freeze is actionable from here; otherwise neutral subtle (A5).

[PageHeader]
- P-1: title 22px is the sole 22px element — correct focal (E1); no change.
- P-2: fontSizes histogram spans 7 buckets {10,11,12,13,14,17,22} → collapse to 4: 22 (title) / 14 (row primary) / 12 (metadata) / 11 delete — promote all 11px (4 els) to 12px and the 13px cluster (5 els) to either 12 or 14 (B2).

[Table]
- TB-1: avatar count badge "6" at 10px → 11px minimum, 12px preferred (HF1 killer; single-line fix).
- TB-2: textColors=6 on copy → 3 (var(--ds-text) / var(--ds-text-subtle) / var(--ds-text-subtlest)); audit the 3 extra colors on cell copy (B3).
- TB-3: "UNKNOWN" result rendered as uppercase scream → sentence-case subtle lozenge "Unknown" via @atlaskit/lozenge default appearance (A3); unknown result should be silence-tier, not shout-tier.
- TB-4: Snapshot column clipped at right edge behind an inner horizontal scroll (innerTableScroll=true) → drop or truncate the "By" hash column (6bbd0863… carries near-zero glanceable value; tooltip it) so Snapshot fits at 1680px with no inner scrollbar (E2).
- TB-5: "2c · 0e" — zero-value badge "0e" → render nothing when 0 (E3 + zero-assumption rule).
- TB-6: "Deployed" datetime column left-aligned, no tabular-nums → font-variant-numeric: tabular-nums, right-align numeric snapshot counts (B4).
- TB-7: offGridSpacing [6×13, 20×2] → snap 6→4 or 8, 20→16 or 24 (C1).
- TB-8: radii {3,4,6,8} across controls → one control radius (3px ADS border.radius) + 8 for cards; kill 4 and 6 (H1).

[Viewport]
- V-1: populated view real content bbox ≈24% of 894px viewport (table ends ~210px, dead field below) → table container min-height fills to footer, and with 1 row show an in-table guidance strip ("Production events appear here when deployments are replayed" + secondary action) so the page doesn't read as broken (D1/D3).
- V-2: rowsVisible=1 with no toolbar/filter/date-range row → add the standard release-hub filter bar (env, type, date) above the table to match sibling routes' pattern (H2) and give the 76% dead zone a reason to exist once data grows (D2).

---

ROUTE: /release-hub/release-kanban
METRICS: {"viewport":[1680,894],"fontSizes":{"0":5,"11":7,"12":18,"13":8,"14":14,"17":1,"18":1,"22":1},"textColors":6,"nonNeutralHues":[210,330,0,90,30],"spacingHist":{"1":4,"2":7,"4":94,"6":41,"8":84,"10":2,"12":71,"16":2,"20":4,"24":4},"offGridSpacing":[6,10,20],"contentBottomPct":100,"visibleEls":261,"radii":[3,4,6,8,10,50],"rowsVisible":0,"boldFillButtons":2}
SCORE: 55/100 GRADE: F HARDFAILS: none (fontSizes "0" bucket = 5 Atlaskit visually-hidden a11y labels, verified not rendered text; body has no horizontal scroll — the mid-page scrollbar belongs to the board container; contentBottomPct=100 is a full-height wrapper, but visually painted content ends ~55%)
CATEGORY BREAKDOWN: A:12/20 B:9/20 C:10/15 D:4/15 E:7/10 F:7/10 G:3/5 H:3/5
BLUEPRINT:

```
PAGE: /release-hub/release-kanban
GRADE: F (55/100) — density collapse + typography sprawl; no hard-fail but D category scored 4/15
ZONES: [Header] [Toolbar] [Board frame] [Cards] [Empty columns]

[Header]
- H-1: title "Release board" 22px with breadcrumb 12px is fine — keep; but topbar countdown pill "+1d 09h 21m CHG-1042" is a second saturated bold-fill element (boldFillButtons=2) → demote to subtle-bg neutral chip with danger-colored dot only; exactly ONE bold CTA ("+ Create") per view (A2).

[Toolbar]
- T-1: 11px metadata count = 7 elements ("⌘K", "CHG-1042", tag text) → raise all visible 11px text to 12px floor (B1); ⌘K hint may stay 11px only if aria-hidden decorative.
- T-2: font-size histogram shows 7 visible sizes {11,12,13,14,17,18,22} → collapse to 4: 12 (metadata), 14 (body), 17→16 kill, 18+22→20 single page title scale (B2).

[Board frame]
- B-1: painted content ends at ~490px of 894px viewport (~55%) with dead black residue below the board container → columns min-height: fill to viewport bottom (calc(100vh - header)), moving the horizontal scrollbar from mid-page y≈440 to the bottom edge (D1: 55% → ~90%).
- B-2: offGridSpacing [6×41, 10×2, 20×4] — 41 elements use 6px gaps → snap 6→4 or 8, 10→8 or 12, 20→16 or 24 (C1).
- B-3: three "0" count badges on READY FOR SIGN-OFF / APPROVED / SCHEDULED → suppress badge when count=0; header text alone carries the state (E3).
- B-4: empty columns are bare dark panels → add per-column empty state: subtle icon + one-line value prop ("No releases approved yet") + tertiary "Add release" affordance in first empty column only (D3).

[Cards]
- C-1: "INVESTOR JOURNEY PRODUCT" tag = saturated lime-green bold fill (hue 90) + UPPERCASE scream on a passive label, repeated 3× → replace with subtle-bg lozenge, sentence case, var(--ds-background-neutral)/var(--ds-text-subtle); lime is banned outside AI controls (A3, color law).
- C-2: red flag glyph on "Q3 Mobile Release" (hue 0) is decorative-semantic on a non-actionable card → keep only if flag = blocked-needs-action; otherwise swap to neutral icon (A5).
- C-3: "Q3 Mobile Release" card renders on an olive/brown tinted background while siblings are neutral raised → one card surface: var(--ds-surface-raised) for all; selection/attention conveyed by left border accent 2px, not full-bleed tint (H2).
- C-4: textColors=6 distinct copy colors → collapse to 3: var(--ds-text) / var(--ds-text-subtle) / var(--ds-text-subtlest) (B3).
- C-5: radii histogram {3,4,6,8,10,50} → 3 classes only: controls 4px, cards 8px, pills/avatars 50% — retire 3, 6, 10 (H1).

[Viewport]
- V-1: 3 cards across 6 columns at 1680×894 with 45% of viewport unpainted → after B-1, cap column width at ~280px so all 6 columns + gutter fit without the container h-scroll at this width (D2, HF5-proofing at 1440px).
```

---

ROUTE: /release-hub/work
METRICS: {"viewport":[1680,894],"fontSizes":{"0":5,"11":25,"12":5,"13":16,"14":17,"17":1,"28":2},"textColors":8,"nonNeutralHues":[210,330,0,90,270],"spacingHist":{"1":2,"2":6,"4":55,"6":43,"8":72,"10":2,"12":22,"16":20,"19":1,"24":5,"32":1},"offGridSpacing":[6,10,19],"contentBottomPct":100,"visibleEls":199,"radii":[2,3,4,6,8,12,50],"rowsVisible":0,"boldFillButtons":3,"hscroll":false}
SCORE: 61/100 GRADE: C HARDFAILS: none (fontSizes "0px" ×5 verified as Atlaskit 1×1px visually-hidden a11y spans — not visible text, HF1 not triggered; 5 hues ≤8; contentBottomPct 100; no h-scroll)
CATEGORY BREAKDOWN: A:15/20 B:8/20 C:10/15 D:8/15 E:8/10 F:7/10 G:3/5 H:2/5
BLUEPRINT:
ZONES: [WorkList (left rail)] [ReleaseHeader] [Stepper] [OverviewTab] [GlobalChrome]

[WorkList]
- W-1: list shows 3 of 3 items yet renders pagination footer "1–3 of 3" + page-size selector "3 ∨" → remove both when totalItems ≤ pageSize; E3 zero-value chrome.
- W-2: list occupies ~315px × full height for 3 cards; ~70% of rail is void → add grouped sections (by status/target date) or collapse rail to auto-height card stack; D1 residue.
- W-3: card metadata (version link, avatar) at 11px → raise to 12px floor (25 elements sitewide at 11px, largest single B1 offender).

[ReleaseHeader]
- R-1: boldFillButtons=3 (Create, Deploy to beta, +1) in one viewport → keep "Deploy to beta" as the ONE bold CTA; demote global "Create" to subtle/default and any third fill to subtle; A2 currently 3× over budget.
- R-2: "IN READINESS" + "ON TRACK" lozenges are uppercase 11px → keep subtle-bg but move to 12px sentence-case Lozenge defaults; A3/B1.
- R-3: meta strip labels (Type/Environment/Target/Changes/Readiness) at 11px → 12px; values stay 14px.

[Stepper]
- S-1: stage labels (Draft/In Progress/QA/Beta/Production) at 11px → 12px; numbered circles keep 11px only if raised to 12 fails layout — otherwise same floor.
- S-2: stepper consumes ~90px full-width band for 5 nodes → tighten vertical padding 16→8px; reclaim for content, D1.

[OverviewTab]
- O-1: fields end at ~600px; lower ~35% of the detail pane is empty on a populated record → pull Scope/Changes summary cards or activity feed up into Overview to fill below "Planned release"; D1 (measured contentBottomPct=100 comes from the fixed rail, not real content — visible content bbox ends ~66%).
- O-2: Caty banner (purple, hue 270) is passive info styled as a full-width tinted band → downgrade to SectionMessage subtle or inline text row; A5 semantic-as-decorative.
- O-3: "Assigned" as a value for Release manager/Product owner is a label, not data → render the person (avatar+name) or an em-dash; zero-assumption rendering.
- O-4: field labels 11px → 12px (--ds-font-size-100 minimum); values already 14px, keep.

[GlobalChrome]
- G-1: offGridSpacing shows 6px ×43 occurrences → snap to 4px or 8px (43 hits is a systemic gap token, likely a shared list-row gap); 10px ×2 → 8px; 19px ×1 → 16px; C1.
- G-2: radii histogram [2,3,4,6,8,12,50] = 7 distinct → consolidate to 3 classes: controls 4px (kill 2/3/6), cards 8px (kill 12 unless modal), pills/avatars 50%; H1.
- G-3: font-size buckets 11/12/13/14/17/28 = 6 sizes → collapse 13→14 (16 elements) and 11→12 (25 elements), yielding 4 sizes {12,14,17,28}; B2 fixed by the same two moves as B1.
- G-4: 8 distinct text colors on copy → cap at 3 (text / subtle / subtlest); audit the 5 extras (likely link-blue, lozenge greens, timer pink counted on copy) and rebind body copy to the 3 ADS text tokens; B3.
- G-5: live-timer badge "+1d 09h 23m CHG-1042" uses red/pink (hues 0/330) persistently in chrome → red only when overdue/action-needed; neutral otherwise; A5.

---

ROUTE: /for-you
METRICS: {"viewport":[1680,894],"fontSizes":{"0":5,"11":14,"12":25,"14":20,"16":5,"17":2,"24":1},"textColors":7,"nonNeutralHues":[210,270,60,330,90,0],"spacingHist":{"1":2,"2":20,"4":70,"6":25,"8":36,"12":31,"16":28,"24":4},"offGridSpacing":[6],"contentBottomPct":100,"visibleEls":167,"radii":[2,3,4,6,8,11,12,25,50,99],"rowsVisible":0,"boldFillButtons":3,"hScroll":false}
SCORE: 57/100 GRADE: F HARDFAILS: none (11px = floor exactly, not <11; 6 hues ≤ 8; contentBottomPct 100; no h-scroll; focus states assumed via ADS components)
CATEGORY BREAKDOWN: A:12/20 B:9/20 C:10/15 D:7/15 E:7/10 F:7/10 G:3/5 H:2/5

Notes on scoring (measured, not vibes): fontSizes "0" entries are visually-hidden a11y spans (verified: "Expand sidebar", "Notifications") — excluded from B1. The 14 elements at 11px are real visible metadata ("⌘K", "Scheduled", "High", "Running · #3...", tab count "69") — below the 12px metadata floor. 6 distinct visible font sizes (11/12/14/16/17/24) vs cap of 4. 7 distinct text colors vs cap of 3. 3 saturated bold-fill buttons (Create, SOP, Themify) vs exactly 1. 10 distinct border radii (2,3,4,6,8,11,12,25,50,99). 25 instances of off-grid 6px spacing. ~6 work items visible in 894px viewport (headers + 90px rows) vs 15-row target. Dead band y≈290–400 between tab bar and first section (~12% of viewport); each list row's middle 50% is empty with status lozenge orphaned at the far right edge.

BLUEPRINT:
```
PAGE: /for-you
GRADE: F (57/100) — no hard-fail, fails on accumulation: typography sprawl + density + radius chaos
ZONES: [ChangeBanner] [TabBar] [WorkList] [FloatingWidgets]

[ChangeBanner]
- CB-1: metadata at 11px ×6 ("Scheduled", "High", "Payments Platform 2.4", "v2.4.0", "production", "Running · #3...") → 12px (metadata floor); density held via line-height 16px
- CB-2: red bold monospace timer "+1d 09h 27m" + red left border + red dot = 3 red signals for 1 alert → keep timer red, demote border to var(--ds-border), dot absorbed into "Live" lozenge; one semantic signal per state
- CB-3: "SOP" is a saturated bold-fill button competing with header "Create" → subtle appearance (var(--ds-background-neutral)); "Open change" stays the banner's single emphasized action
- CB-4: banner radius 11px (measured, off-family) → 8px, matching card class

[TabBar]
- T-1: tab count badge "69" at 11px → 12px; same for "13" on Ageing
- T-2: dead band below tabs: first content at y≈410 vs tabs end y≈292 (~118px void, 13% of viewport) → first section header starts 24px below tab bar; reclaims ~1 full row
- T-3: "Themify" pill (saturated pink, bold-fill, right-orphaned at y≈353) is the 3rd competing CTA in the void → move into TabBar right slot as subtle icon-button; kills the void it currently justifies

[WorkList]
- W-1: 6 items visible in 894px (~90px effective per item incl. headers) → row height 56px, section header 32px ≥ 11 items visible (+83% density)
- W-2: status lozenge orphaned at right edge, ~700px of empty row between title block and lozenge → move lozenge inline after project link at fixed 3rd column ~640px, or right-align at content max-width 1024px; kills the F-scan break
- W-3: 7 text colors on copy → 3 levels: var(--ds-text) titles, var(--ds-text-subtle) "Story · MWR-919", var(--ds-text-brand) project links only
- W-4: metadata line 12px stays; row title 14px stays; delete the 16/17px strays (measured 7 els) → snap to 14px, one heading scale only (24px "For you")
- W-5: 25 uses of 6px padding/gap → snap to 4px or 8px per ADS spacing grid
- W-6: yellow "ON HOLD" bold-uppercase lozenge on passive rows reads as warning → ADS Lozenge default (neutral subtle) — yellow reserved for rows needing action; "IN PROGRESS" info-subtle is correct

[FloatingWidgets]
- F-1: pink pulse FAB (bottom right, y≈748, radius 50) + white half-pill at right edge (y≈657, radius 99) add 2 radius families + 1 decorative hue → adopt 8px-radius family or remove from this route; radius set collapses 10 → 3 (4 controls / 8 cards / 99 pills-only)
- F-2: right-edge half-visible white pill overlaps content column → dock fully offscreen until hover or remove; nothing interactive may straddle the viewport edge
```

---

All measurements captured. Composing the audit.

ROUTE: /release-hub/changes
METRICS: {"viewport":[1680,894],"fontSizes":{"0":3,"11":14,"12":21,"13":25,"14":13,"17":1,"22":1},"textColors":9,"nonNeutralHues":[210,330,0,30,60,90],"spacingHist":{"1":2,"2":89,"4":173,"6":13,"8":53,"12":113,"16":4,"20":2,"24":4,"32":1},"offGridSpacing":[6,20],"contentBottomPct":100,"visibleEls":415,"radii":[3,4,6,8,50],"rowsVisible":3,"boldFillButtons":3}
(supplementary probe: bodyHScroll=false; the 3 font-size-0 nodes are visually-hidden a11y labels; 11px text is visible — CHG keys, "Catalyst" source, and ALL status/risk/flag pills at 11px uppercase weight-653; table inner container scrolls horizontally: scrollWidth 2272 vs clientWidth 1531; transition:all count 0)

SCORE: 59/100 GRADE: F HARDFAILS: none (HF1 not triggered — 11px is at floor, 0px nodes are sr-only; HF2: 6 hues ≤ 8; HF3: page frame fills but see D1; HF5: body has no h-scroll — the h-scroll lives inside the table container)

CATEGORY BREAKDOWN: A:9/20 B:9/20 C:11/15 D:10/15 E:7/10 F:7/10 G:4/5 H:2/5

Category evidence:
- A1 4/6: exactly 6 non-neutral hue clusters (210 blue, 330 pink, 0 red, 30 orange, 60 yellow, 90 green) — at the ceiling, and pink (330) is purely decorative (pulse FAB).
- A2 1/4: 3 bold-fill CTAs in one view ("Create" header, "New change", pulse FAB) — should be exactly 1.
- A3 0/4: every status/risk/flag is an uppercase, colored-text, bordered pill (SCHEDULED, IMPLEMENTING, HIGH, CRITICAL, EMERGENCY, UNLINKED PROD) — the rubric's literal "uppercase scream" anti-pattern on passive statuses.
- A5 1/3: EMERGENCY (yellow) and CRITICAL (red) render as ambient row decoration, not action prompts; red countdown chip in the top bar adds a second permanent danger signal.
- B1 3/6: body cells are 12–13px (25 els at 13, 21 at 12) — below the 14px body floor; 14 elements sit at the 11px metadata edge.
- B2 1/4: 6 distinct visible sizes (11,12,13,14,17,22) vs max 4.
- B3 1/4: 9 distinct text colors on copy vs max 3.
- C1 3/5: off-grid 6px (13 uses) and 20px (2 uses).
- D1 3/6: real content ends at the table bottom ≈ y370 of 894 → ~41% of viewport carries content; contentBottomPct=100 is inflated by the fixed FAB/sidebar.
- D2 3/4: only 3 rows exist (data-limited, not layout-limited) but 9 columns force a 2272px-wide table into a 1531px container → internal horizontal scrollbar for 3 rows.
- H1 1/3: 4 control radii (3,4,6,8) + pill(50) — one per component class expected.

BLUEPRINT:
ZONES: [Header] [Toolbar] [Table] [Ambient]

[Header]
- H-1: two bold-fill CTAs ("Create" global + "New change" page) → demote "New change" to default appearance, keep global "Create" as the single brand-bold fill; A2 requires exactly one.
- H-2: "Map external change" default button padding stays, but move it into a subtle-appearance pairing with the demoted "New change" so the toolbar reads one action tier.
- H-3: red countdown chip "+1d 09h 06m CHG-1042" uses danger color permanently → switch to `var(--ds-text-subtle)` chip with danger color only when < 4h remain; semantic red must signal action needed.

[Toolbar]
- T-1: filter trigger labels at 13px → 14px (`font.body`); body-level interactive text is below the 14px floor.
- T-2: 6px gaps (13 occurrences, mostly filter/chip internals) → snap to 4px or 8px; 20px paddings (2) → 16px or 24px.

[Table]
- T-3: status/risk/flag pills: 11px uppercase colored-text bordered chips → replace with @atlaskit/lozenge subtle appearance (12px, sentence case per Lozenge default, subtle-bg, no border glow); kills the 0/4 on A3 and removes 3 of the 9 text colors in one move.
- T-4: EMERGENCY / UNLINKED PROD flag stack: two stacked yellow screams per row → single subtle warning lozenge + count ("2 flags") with tooltip; yellow reserved for rows needing action today.
- T-5: table scrollWidth 2272px in a 1531px container → collapse to fit: merge Type+Category into one column, drop Source column when all rows = "Catalyst" (single-value column carries zero information), shrink Env to lozenge; target scrollWidth ≤ container, no inner h-scrollbar at 1680px.
- T-6: change summary cells 13px → 14px `var(--ds-text)`; CHG-#### key stays 11–12px subtle — restores B1 without losing density.
- T-7: text colors 9 → 3: `--ds-text` (summary), `--ds-text-subtle` (key, source, env, category), lozenge-owned colors only inside lozenges.
- T-8: font-size buckets 6 → 4: {11 metadata-min → 12, 12 metadata, 13 → 14 body, 17 kill (fold into 16-equivalent heading token), 22 title} = {12, 14, 20/22, done}.
- T-9: control radii {3,4,6,8} → one per class: controls/buttons 4 (`border.radius.100`), cards/containers 8 (`border.radius.200`), pills 50; migrate the 3px and 6px stragglers.

[Ambient]
- A-1: pink pulse FAB (hue 330, bottom-right) introduces a 6th hue with zero task value on this route → remove from /release-hub/changes or restyle to neutral `--ds-background-neutral` with brand icon; drops hue count 6 → 5.
- A-2: below-table void (~53% of viewport empty with data present) → when row count < 8, render a ghost "add change" row or contextual footer (last sync time, source mapping status) so the populated view's content bbox climbs toward the 70% D1 target.

---

