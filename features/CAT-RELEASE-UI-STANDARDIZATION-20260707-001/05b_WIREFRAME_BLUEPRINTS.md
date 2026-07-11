# RUTHLESS AUDIT v2 — Combined Matrix + Wireframe Blueprints (Release Hub, 2026-07-08)

Format per design-governance/RUTHLESS_UI_AUDIT_RUBRIC.md v2. Source metrics: wf_42671dc8-245 probes (05_UI_UX_REVIEW.md).

## COMBINED MATRIX

| Route | Score | Grade | Hard-fails | A Color | B Type | C Space | D Density | E Signal | F States | G Motion | H Consist |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /release-hub/overview | 56/100 | F | HF1 | ⚠️ | ❌ | ⚠️ | ❌ | ⚠️ | ⚠️ | ✅ | ❌ |
| /release-hub/calendar | 54/100 | F | HF1 | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| /release-hub/releases-management | 54/100 | F | HF1 (mechanical) | ⚠️ | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | ❌ | ⚠️ |
| /release-hub/execution | 59/100 | F | none | ⚠️ | ⚠️ | ⚠️ | ❌ | ✅ | ⚠️ | ❌ | ⚠️ |
| /release-hub/sign-off-queue | 58/100 | F | none | ⚠️ | ❌ | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ |
| /release-hub/sop-templates | 63/100 | C | HF1 (mechanical) | ✅ | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| /release-hub/freeze-windows | 57/100 | F | HF1 (mechanical) | ⚠️ | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| /release-hub/production-events | 60/100 | C | HF1 | ⚠️ | ❌ | ✅ | ❌ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| /release-hub/release-kanban | 55/100 | F | none | ⚠️ | ❌ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| /release-hub/work | 61/100 | C | none | ⚠️ | ❌ | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ❌ |
| /for-you | 57/100 | F | none | ⚠️ | ❌ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ |
| /release-hub/changes | 59/100 | F | none | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ❌ |

**Cell math** (✅ ≥80% of max, ⚠️ 50–79%, ❌ <50%; maxes A20 B20 C15 D15 E10 F10 G5 H5): computed directly from each route's CATEGORY BREAKDOWN — e.g. /changes A 9/20 = 45% ❌, /work D 8/15 = 53% ⚠️, /execution D 3/15 = 20% ❌, /production-events C 12/15 = 80% ✅.

## Hard-fails

- **/release-hub/overview — HF1**: 17 visible text elements at 10px computed font-size — timeline axis labels ("Jun 3 / Jun 22 / Jul 11…"), timeline legend ("Released / Active / Upcoming / Freeze"), "1 freeze window" badge, "RELEASE" column header, plus 10px italic hint "Click release → opens filter module".
- **/release-hub/calendar — HF1**: 1 element at 10px computed font-size; 16 further elements (legend/metadata labels "Release/Change/Freeze/Production", "on track/at risk/off track") sit at the absolute 11px floor.
- **/release-hub/releases-management — HF1 (mechanical)**: fontSizes key "0" ×3 — visually-hidden Atlaskit a11y icon-label spans "Expand sidebar" / "Notifications" / "Settings" rendered via `font-size:0` instead of the clip sr-only pattern; smallest VISIBLE text is 11px ("⌘K", "CHG-1042"). Waivable once the clip pattern replaces `font-size:0`.
- **/release-hub/sop-templates — HF1 (mechanical)**: fontSizes keys 0px ×3 (`font-size:0` a11y-hidden text) plus a 2-element 11px pair; fix = clip-pattern visually-hidden class + raise the 11px pair to 12px.
- **/release-hub/freeze-windows — HF1 (mechanical)**: fontSizes key "0" ×3 text-bearing elements at computed 0px (clipped/sr-only text on the text-bearing path); visible floor is 11px ×4, which passes — the 0px keys trip the mechanical <11px rule.
- **/release-hub/production-events — HF1**: avatar count badge "6" at 10px computed font-size (single visible offender; the three 0px entries are visually-hidden a11y labels, excluded). Single-line fix: 10px → 12px.

Notes: /execution, /sign-off-queue, /release-kanban, /work, /for-you, /changes each tripped the 0px probe mechanically but were verified as sr-only Atlaskit a11y spans with no rendered glyphs and waived (visible floor 11px = at the boundary, not below). Module-wide, the `font-size:0` sr-only wrapper exists on all 12 routes; G-4 (clip pattern) permanently retires the 3 mechanical HF1s.

---

## WIREFRAME BLUEPRINTS (target layouts @1440×900)

PAGE: /release-hub/overview   TARGET LAYOUT @1440×900   grade F(56) → B(78) projected
```
┌─ VIEWPORT 1440 ──────────────────────────────────────────────────────────────┐
│ HEADER h=56 · pad 0 32 · border-b var(--ds-border)                           │
│  ⌂ Releases / Dashboard (20px/600)   [+1d 09h CHG-1042] [Create release] [Create]■
│    12px breadcrumb, no dup crumb      12px subtle chip    32px h default  32px h bold (global)
├─ KPI ROW h=96 · pad 16 32 · gap 16 · 5 tiles · card radius 8 ────────────────┤
│ ┌ Active ────┐┌ Pending ───┐┌ Freeze ────┐┌ Deploys ───┐┌ Incidents ─┐       │
│ │ 12  28px   ││ 3   28px   ││ 1   28px   ││ 7   28px   ││ 0   28px   │       │
│ │ --ds-text  ││ warn color ││ dngr color ││ --ds-text  ││ --ds-text  │       │
│ │ caption 12px --ds-text-subtlest ("needs action" uncolored)        │        │
│ └────────────┘└────────────┘└────────────┘└────────────┘└────────────┘       │
├─ ROW B y=192 h=280 · gap 16 ─────────────────────────────────────────────────┤
│ ┌ RELEASE TIMELINE w=904 · pad 16 ─────────┐ ┌ AI SUMMARY w=440 h=132 ─────┐ │
│ │ Release timeline (17px/600)   ⓘ tooltip  │ │ Caty digest 14px body        │ │
│ │ axis: Jun 3 · Jun 22 · Jul 11  (12px)    │ │ ‹On track› subtle lozenge    │ │
│ │ ▬▬▬▬ release bars row h=32 gap 8         │ └──────────────────────────────┘ │
│ │ ‹1 freeze window› 12px subtle lozenge    │ ┌ PORTFOLIO w=440 h=132 ──────┐ │
│ │ legend 12px — RENDERED ONLY IF ≥1 bar    │ │      ⛴ icon 32px            │ │
│ └──────────────────────────────────────────┘ │ Track what ships and when   │ │
│                                              │ 14px · [Create release] dflt│ │
│                                              │ view sample data (12px link)│ │
│                                              └──────────────────────────────┘ │
├─ ROW C y=488 h=364 · 3 cards gap 16 · each w=445 · pad 16 · radius 8 ────────┤
│ ┌ PENDING APPROVALS ─────┐┌ CHANGE QUEUE ──────────┐┌ PRODUCTION EVENTS ───┐ │
│ │ title 17px/600         ││ title 17px/600          ││ title 17px/600      │ │
│ │ row h=40 · gap 8       ││ row h=40 · gap 8        ││ row h=40 · gap 8    │ │
│ │ CHG-1044 14px  [Review]││ CHG-1042 12px mono      ││ Deploy payments…14px│ │
│ │ meta "1d" 12px  28px h ││ Deploy payments… 14px   ││ ‹Success› ‹—›       │ │
│ │ ×7 rows fill to bottom ││ ‹Scheduled›‹High risk›  ││ subtle lozenges 12px│ │
│ │                        ││ subtle lozenges 12px ×7 ││ no red "UNKNOWN" ×7 │ │
│ └────────────────────────┘└─────────────────────────┘└─────────────────────┘ │
└─ bottom pad 24 · content fills to y=876 ─────────────────────────────────────┘
```
CHANGES vs CURRENT
- C1 **HF1 clear**: 17 visible els at 10px (timeline axis "Jun 3/Jun 22/Jul 11", legend, "1 freeze window" badge, "RELEASE" column header) → 12px; 10px italic "Click release → opens filter" hint → tooltip on section header, off canvas
- C2 fontSizes 9 buckets (10,11,12,13,14,16,17,22,32) → 5 (12,14,17,20,28): 11→12 (25 els: KPI captions, CHG keys, approval meta), 13→14 (6 els), 16→17 (3 els), title 22→20/600, KPI numerals 32→28
- C3 boldFillButtons 3→1: global Create stays bold (■, module convention); "Create release" → appearance="default"; CHG-1042 red monospace countdown pill → 12px `var(--ds-background-neutral)` subtle chip, danger tokens only when <4h remaining
- C4 nonNeutralHues 5 (210,330,0,90,60) → ≤3: pulse FAB (330) neutral icon-subtle at rest; warning/danger color stripped from passive captions ("needs action", "production deployments" → `var(--ds-text-subtlest)`); semantic color only on the 2 action tiles + lozenges
- C5 uppercase screamers (uppercaseCount 4: "HIGH RISK"/"CRITICAL RISK"/"SCHEDULED"/"IMPLEMENTING") + bold-fill red "UNKNOWN" on passive events → ReleaseOpsLozenges subtle-bg sentence-case 12px (`removed`/`moved`/neutral)
- C6 textColors 8→3: `var(--ds-text)` / `--ds-text-subtle` / `--ds-text-subtlest`; semantic color lives only inside lozenges
- C7 radii 7 (2,3,4,6,8,12,50) → 3 classes: controls 4, cards 8, pills/avatars 50% — retire 2/3/6/12
- C8 offGridSpacing [6,20] (6px ×17 approval-row gaps, 20px ×2) → 8 and 16/24; grid fully {4,8,12,16,24,32}
- C9 Portfolio bare "No releases" in ~90px dead band (D3=0) → canonical empty block in 440×132 card: icon 32px + "Track what ships and when" 14px + default `Create release` CTA + 12px sample-data link
- C10 timeline legend (4 swatch hues over zero rendered bars) → hidden until ≥1 release bar renders
- C11 KPI focal chaos (five 32px numbers competing) → non-alert tiles `var(--ds-text)`, one dominance tier restored

PROJECTED: HF1 uncap + B 5→14 (+9), A 13→17 (+4), D 7→11 (+4), C 11→13 (+2), H 2→4 (+2), E 7→8 (+1) → **78 B** (density fills via row-C stretch, typography collapses to 5 buckets, color discipline restored — B cap earned)

---

PAGE: /release-hub/calendar   TARGET LAYOUT @1440×900   grade F(54) → B(78) projected

```
PAGE: /release-hub/calendar   TARGET LAYOUT @1440×900   grade F(54) → B(78) projected
┌─ VIEWPORT 1440 ──────────────────────────────────────────────────────────────┐
│ HEADER h=56 · pad 0 32 · border-b var(--ds-border)                           │
│  Release Hub /            ‹CHG-1042 · 1d 09h›              [Create]■        │
│  12px breadcrumb           12px subtle-bg lozenge            32px h, bold    │
│  Calendar (20px/600)       (danger tokens only <4h left)    (global chrome)  │
├─ TOOLBAR h=40 · pad 8 32 · gap 8 ────────────────────────────────────────────┤
│  [Month|Quarter] [Re-run all]              [◀] July 2026 [▶]  [Today]       │
│   32px h seg ctrl  32px h default btn       14px/600 label     32px h subtle │
│   radius 4         docked in left cluster   right cluster = time nav only    │
├─ LEGEND h=32 · pad 4 32 · gap 16 ────────────────────────────────────────────┤
│  ● Release  ● Change  ▨ Freeze  ● Production          (health legend hidden │
│  12px var(--ds-text-subtle) · 8px dot·label gap        until events carry    │
│                                                        health data)          │
├─ CALENDAR GRID · fills to viewport bottom ───────────────────────────────────┤
│  MON    TUE    WED    THU    FRI    SAT    SUN     ← weekday hdr h=32, 12px  │
│ ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐  var(--ds-text-subtlest) │
│ │ 29   │ 30   │  1   │  2   │  3   │  4   │  5   │ week row min-h=148       │
│ │      │      │      │      │      │      │      │ = calc((900−160)/5)      │
│ ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤ cell pad 8 · radius 0    │
│ │ 6 ●Today    │ 7    │  8   │  9   │ 10   │ 11   │ day num 12px top-right   │
│ │ ▐CHG-1042 Deploy payments…  │      │      │     │ event chip h=24 · pad 4 8│
│ │ ▐REL-204 Beta cut           │      │      │     │ 14px/16lh var(--ds-text) │
│ │ +1 more (12px link)         │      │      │     │ radius 4 · 2px left      │
│ │      │▓FREEZE▓             │      │      │      │ border = type color,     │
│ │      │12px lbl│            │      │      │      │ text stays neutral       │
│ ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤ freeze = full-cell       │
│ │ 13   │ 14   │ 15   │ 16   │ 17   │ 18   │ 19   │ var(--ds-background-     │
│ ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤ danger) band, not a bare │
│ │ 20   │ 21   │ 22   │ 23   │ 24   │ 25   │ 26   │ 1px top border           │
│ ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤ today = selected-bg +    │
│ │ 27   │ 28   │ 29   │ 30   │ 31   │  1   │  2   │ badge (heavy border      │
│ └──────┴──────┴──────┴──────┴──────┴──────┴──────┘ dropped — 2 signals max) │
└──────────────────────────────────────────────────────── grid bottom = 900 ──┘
```

CHANGES vs CURRENT
- C1 boldFillButtons 2→1: pink pulse FAB (hue 330, radii 50/99) demoted to neutral icon-subtle at rest / removed from route; global Create keeps the only bold fill (■) per module convention — page has no competing bold CTA
- C2 countdown pill: 11px danger-red bold monospace fill → 12px sentence-case subtle-bg lozenge (`var(--ds-background-neutral)` + `var(--ds-text-subtle)`); danger tokens (`--ds-background-danger`/`--ds-text-danger`) only when remaining <4h; no longer counts as a bold fill
- C3 HF1 cleared: 1 el at 10px + 16 els at 11px (legend/metadata labels) → 12px floor everywhere; nothing below 12px in the viewport
- C4 font-size buckets 8 (10,11,12,13,14,16,17,22) → 3 (12 metadata/day numbers/legend, 14 event titles + controls, 20 page title); title 22→20px/600 per header rule; 13/16/17 folded into 14
- C5 event titles 12px on low-contrast chips → 14px `var(--ds-text)` at line-height 16, chip h=24; type color moves to 2px left border only, never the text
- C6 grid bottom ~78% of viewport → 100%: week rows stretch via min-height calc((900−160)/5)=148 (+~35px per row), so Jul 6's 3 stacked events fit with a 12px "+1 more" overflow link instead of clipping
- C7 non-neutral hues 6 (210,330,0,180,90,60) → 3 (210,0,90): pink 330 leaves with the FAB; teal 180 + yellow 60 leave with the health legend, which now renders only when a visible event carries health data
- C8 textColors 6 → 3: `var(--ds-text)` / `var(--ds-text-subtle)` / `var(--ds-text-subtlest)`; semantic color only inside lozenges/borders
- C9 radii [1,3,4,6,8,50] → 3 classes: controls/event chips 4, cards/cells 8, pills 50%; retire 1/3/6
- C10 offGridSpacing: 6px (×13, toolbar chips) → 8; 10px (×2) → 8; 20px (×2) → 16/24; all gaps on {4,8,12,16,24}
- C11 "Re-run all" orphaned at right edge between legend and month nav → docked in left control cluster beside Month/Quarter segmented control; right cluster = month nav + Today only
- C12 freeze indicator (Jul 7): bare red 1px top border + 11px text → full-cell `var(--ds-background-danger)` band with 12px label (passes squint test)
- C13 today cell: selected-bg + heavy border + badge (3 signals) → selected-bg + badge only
- C14 breadcrumb "Releases / Calendar" duplicating the title → single 12px crumb "Release Hub /", terminal = the 20px title itself
- C15 duplicate CHG-1042 event on Jul 6 (two title formats) → dedupe by change key at query layer (data-integrity fix, tracked outside CSS)

Projected: 54 + (HF1 uncap + B 6→13 + A 12→17 + D 9→13 + C 10→12 + E 6→8 + H 3→5) ≈ 78 → **B** (density C6, typography C3/C4/C5, and color C1/C2/C7/C8 all resolve, so the B cap is earned, not exceeded)

---

PAGE: /release-hub/changes   TARGET LAYOUT @1440×900   grade F(59) → B(79) projected
```
┌─ VIEWPORT 1440 ──────────────────────────────────────────────────────────────┐
│ SHELL TOPBAR h=48 · pad 0 16 · border-b --ds-border                          │
│  [⌕ Search…]        ‹Freeze · CHG-1042 in 1d 09h›            [+ Create]■     │
│                      12px --ds-text-subtle chip on            32px h, bold   │
│                      --ds-background-neutral · radius 4       (only ■ in view)│
├─ PAGE HEADER h=56 · pad 0 32 ────────────────────────────────────────────────┤
│  Releases / Changes                    [Map external change] [New change]    │
│  12px breadcrumb --ds-text-subtlest     32px h subtle         32px h default │
│  Changes  (20px/600 --ds-text)          gap 8                                │
├─ TOOLBAR h=40 · pad 8 32 · gap 8 ────────────────────────────────────────────┤
│  [Status ▾][Risk ▾][Type ▾][Env ▾][Window ▾]            [⌕ Filter… 240w]     │
│   32px h triggers · 14px label --ds-text · radius 4      32px h · 14px       │
├─ TABLE · header row h=32 (12px/600 --ds-text-subtle) · width 1336 ≤ 1376 ────┤
│  ☐  │ KEY     │ SUMMARY                │ STATUS     │ RISK  │ TYPE   │ ENV │ WINDOW │
│  40 │ 96      │ 560 flex               │ 112        │ 96    │ 128    │ 88  │ 120    │
│ ─ body rows h=40 · pad 8 16 · gap 8 ─────────────────────────────────────────│
│  ☐  CHG-1042  Deploy payments service…  ‹Scheduled›  ‹High›  Standard  PRD  Jul 6  │
│      12px mono  14px --ds-text           subtle-bg lozenges, sentence-case,  │
│      --ds-text-subtle                    12px, lozenge-owned color only      │
│  ☐  CHG-1043  Rotate TLS certs…         ‹Implementing› ‹Critical› Emergency PRD Jul 7│
│      flags collapse → single ‹2 flags› warning lozenge + tooltip (was 2 rows │
│      of stacked yellow uppercase screams)                                    │
│  ☐  CHG-1044  Enable feature flag…      ‹Scheduled›  ‹Low›   Normal   STG  Jul 8  │
│  ┄  + Add change (ghost row, h=40, 14px --ds-text-subtlest, radius 4)        │
│  ░░ zebra fill rows (--ds-surface-sunken alternate) — table min-height       │
│  ░░ stretches to footer; NO inner h-scrollbar (fit 1336px, was 2272)         │
│  ░░                                              content bbox ≥70% viewport  │
├─ FOOTER h=32 · pad 0 32 ─────────────────────────────────────────────────────┤
│  3 changes · Last synced 2m ago · Source: Catalyst   12px --ds-text-subtlest │
└──────────────────────────────────────────────────────────────────────────────┘
```
CHANGES vs CURRENT
- C1 boldFillButtons 3→1 (■ = global shell "Create" per module convention): "New change" bold→`appearance="default"`; pink pulse FAB (hue 330) removed from route — nonNeutralHues 6→4
- C2 status/risk/flag pills: 11px uppercase weight-653 colored-text bordered chips (SCHEDULED/IMPLEMENTING/HIGH/CRITICAL/EMERGENCY/UNLINKED PROD) → ReleaseOpsLozenges subtle-bg sentence-case 12px; A3 0/4 resolved
- C3 EMERGENCY + UNLINKED PROD stacked yellow screams per row → one subtle warning lozenge "2 flags" + tooltip; yellow only on rows actionable today
- C4 countdown chip "+1d 09h 06m CHG-1042" permanent danger-red fill → 12px `--ds-text-subtle` on `--ds-background-neutral`; danger tokens only when <4h remain
- C5 body cells 13px (25 els)→14px; filter trigger labels 13→14px; CHG keys + source/env meta 11px (14 els)→12px; font buckets 6 {11,12,13,14,17,22}→4 {12,14,20,22} (17px singleton folded)
- C6 textColors 9→3: `--ds-text` (summary), `--ds-text-subtle` (key/meta), `--ds-text-subtlest` (footer); semantic color lives only inside lozenges
- C7 table scrollWidth 2272→1336 in 1376 container: merge Type+Category into one 128px column, drop Source column (single-value "Catalyst" → footer line), Env → 88px lozenge; inner h-scrollbar eliminated
- C8 content bottom ~41% (y≈370/894, 3 rows over dead void) → ≥70%: ghost "+ Add change" row + zebra structural fill + 32px footer; table min-height fills to footer
- C9 gaps: 6px ×13 → 8px; padding 20px ×2 → 16/24; grid = {4,8,12,16,24,32}
- C10 radii {3,4,6,8,50} → controls 4 / cards-containers 8 / pills 50%; 3px and 6px stragglers migrated

PROJECTED: 59 + A(+8: A2 1→4, A3 0→4, A5 +1) + B(+8: B1 3→6, B2 1→3, B3 1→4) + C(+2: off-grid cleared) + D(+3: D1 fill, h-scroll gone) + H(+2: radius classes) ≈ 79–82, reported as B(79) — density, typography, and color all resolve, B cap honored.

---

PAGE: /release-hub/releases-management   TARGET LAYOUT @1440×900   grade F(54) → B(75) projected
```
┌─ VIEWPORT 1440 ──────────────────────────────────────────────────────────────┐
│ TOP BAR (shell chrome) h=48 · pad 0 16 · gap 8                               │
│  ☰  Catalyst   [🔍 Search… ⌘K 12px subtlest]   [+ Create]■  ‹CHG-1042 1d 9h› │
│                 240px w · 32px h · radius 4     32px h bold   subtle lozenge │
│                                                               12px --ds-text-│
│                                                               subtle · pill  │
├─ HEADER h=56 · pad 0 32 · border-b --ds-border ──────────────────────────────┤
│  Release Hub / Releases (12px breadcrumb, --ds-text-subtlest)                │
│  Releases (20px/600 --ds-text)                    [Create release]           │
│                                                    32px h · default · rad 4  │
├─ TOOLBAR h=40 · pad 8 32 · gap 8 ────────────────────────────────────────────┤
│  [Status ▾][Version ▾][Owner ▾][Date ▾]              [🔍 Filter list 240px]  │
│   28px h chips · 12px text · radius 4 · gap 8         32px h · radius 4      │
├─ CONTENT zone h=724 (y96→820) · pad 24 32 · --ds-surface ────────────────────┤
│  ░ ghost table header row h=40 · 12px --ds-text-subtlest · border-b ░░░░░░░  │
│  ░ NAME            VERSION      STATUS       OWNER        SHIP DATE ░░░░░░░  │
│                                                                              │
│              ┌─ EMPTY STATE 400×248 · centered (x520 y300) ─┐                │
│              │            ⛴  icon 32px --ds-icon-subtle     │                │
│              │                 gap 16 below                  │                │
│              │   Track what ships and when (14px --ds-text)  │                │
│              │   This space has 0 releases. (12px subtle)    │                │
│              │                 gap 16                        │                │
│              │        [Create release] 32px h · default      │                │
│              │                 gap 8                         │                │
│              │    Load sample data (12px link --ds-text-brand)│               │
│              └───────────────────────────────────────────────┘                │
│  ░░ dimmed ghost rows ×6 · h=40 · --ds-surface-sunken · fill to footer ░░░░  │
├─ FOOTER h=32 · pad 0 32 · "0 releases" 12px --ds-text-subtlest ──────────────┤
└──────────────────────────────────────────────────────────────────────────────┘
  ◦ FAB bottom-right 40×40 · --ds-icon-subtle neutral at rest · radius 50%
```
CHANGES vs CURRENT
- C1 boldFillButtons 3→1 (■ = global Create only, per module convention): "Create release" bold→`appearance="default"`; CHG-1042 countdown chip saturated red/pink mono fill → subtle-bg lozenge (`--ds-background-neutral` + `--ds-text-subtle`; danger tokens only <4h remaining)
- C2 breadcrumb "Releases / Releases" → "Release Hub / Releases"; title 22px→20px/600, stays the only element >17px
- C3 empty state: two contradictory strings 70px apart ("No releases match this filter." y≈226 + "This space has 0 releases" y≈295) → ONE canonical block (icon 32px + value prop 14px + CTA + sample-data link) centered in content zone; filter-mismatch message rendered ONLY when releases exist (D3 0→5, E3 1→3)
- C4 content occupancy: visible content ends y≈300/894 (≈33%) → ghost table header + dimmed ghost rows fill to footer, perceived occupancy ≥70% (D1 2→5)
- C5 font buckets 7→3 visible (11,12,13,14,16,17,22 → 12/14/20): ⌘K hint 11→12, CHG chip 11→12, 13→12, 16/17→14, 22→20 (B1 4→6, B2 1→3)
- C6 text colors 6→3: all copy on `--ds-text` / `--ds-text-subtle` / `--ds-text-subtlest`; semantic color only inside lozenges (B3 2→4)
- C7 spacing snap: 6px(×19)→8, 10px(×6)→8/12, 20px(×2)→16/24; grid = {4,8,12,16,24,32} (C1 2→4)
- C8 radii {3,4,6,8,50} → 3 classes: controls 4 (3→4, 6→4), cards 8, pills 50% (H1 1→3)
- C9 pink pulse FAB (hue 330 + green dot) → neutral `--ds-icon-subtle` at rest, saturate only when active (A5 1→3, A3 2→4)
- C10 sr-only spans `font-size:0` ×3 → clip visually-hidden pattern; mechanical HF1 permanently waived
- C11 projected: 54 + (A2 +3, A3 +2, A5 +2, B1 +2, B2 +2, B3 +2, C1 +2, D1 +3, D3 +5, E1 +1, E3 +2, H1 +2) ≈ 75 → B; capped there honestly — D2 (rowsVisible 0) cannot exceed partial credit until real release rows exist

---

PAGE: /release-hub/execution   TARGET LAYOUT @1440×900   grade F(59) → B(82) projected

```
┌─ VIEWPORT 1440 ──────────────────────────────────────────────────────────────┐
│ TOPBAR (shell) h=48 · pad 0 16 · border-b --ds-border                        │
│  ☰  Catalyst   [🔍 Search… ⌘K 12px subtlest, 240px]                          │
│                ‹1d 09h · CHG-1042› 12px subtle chip      [+ Create]■         │
│                 --ds-background-neutral · pill 50%        32px h, bold       │
│                 (danger tokens ONLY when remaining <4h)                      │
├─ PAGE HEADER h=56 · pad 0 32 ────────────────────────────────────────────────┤
│  Releases / Execution                      (breadcrumb 12px --ds-text-subtle)│
│  Execution calendar                        (title 20px/600 --ds-text)        │
├─ TOOLBAR h=40 · pad 8 32 · gap 8 ────────────────────────────────────────────┤
│  [Today] [◀ Tue Jul 8 ▶] [ Day │ Week ] [All steps ▾]                        │
│   28px h controls · 12px text · radius 4                                     │
│   active "Day" = --ds-background-selected (NOT bold-fill)                    │
│   "All steps" docked 8px right of segment (was orphaned x≈1330)              │
├─ CONTENT · 24h slot-grid scaffold · hour row h=40 · pad 0 32 ────────────────┤
│  00:00 ┆░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  01:00 ┆░░  12px --ds-text-subtlest hour labels · row border --ds-border    │
│  02:00 ┆░░  ×18 dimmed hour rows render to footer even when 0 steps         │
│  03:00 ┆░░  (rowsVisible 0 → 18; content bbox 32% → ~92%)                   │
│  04:00 ┆░░                                                                   │
│  05:00 ┆░░        ┌── EMPTY-STATE BLOCK · max-w 480 · centered ──┐          │
│  06:00 ┆░░        │        🗓  32px icon --ds-icon-subtle         │          │
│  07:00 ┆░░        │  No execution steps scheduled for Jul 8      │          │
│  08:00 ┆░░        │   14px --ds-text-subtle value prop · gap 12  │          │
│  09:00 ┆░░        │        [ Apply SOP template ]                │          │
│  10:00 ┆░░        │         32px h · default appearance          │          │
│  11:00 ┆░░        │        View a sample day  (12px link)        │          │
│  12:00 ┆░░        └──────────────────────────────────────────────┘          │
│  13:00 ┆░░                                                                   │
│  …     ┆░░  skeleton on load = same slot-grid layout (no pop-in)            │
│  17:00 ┆░░                                                                   │
├─ FOOTER h=32 · "0 steps scheduled · Tue Jul 8" 12px --ds-text-subtlest ──────┤
└──────────────────────────────────────────────────────────────────────────────┘
```

CHANGES vs CURRENT
- C1 boldFillButtons 3 → 1 (■ global Create only, per module convention): active Day segment bold-fill → `--ds-background-selected` neutral; countdown chip no longer counts as a fill (A2 2/4 → 4/4, ~+2)
- C2 countdown chip "+1d 09h 11m CHG-1042" 11px danger-red monospace on passive chrome → 12px `--ds-text-subtle` on `--ds-background-neutral` subtle pill; danger tokens reserved for remaining <4h (A5 1/3 → 3/3, ~+2)
- C3 ⌘K hint 11px → 12px `--ds-text-subtlest`; kills the sub-12px bucket entirely (B1 4/6 → 6/6, +2)
- C4 visible font buckets 6 {11,12,13,14,17,22} → 3 {12 metadata, 14 body, 20 title}: 11→12, 13→14, 17px "Execution calendar" folds into the 20px/600 page title, 22→20 (B2 1/4 → 3/4, +2)
- C5 copy colors 6 → 3 (`--ds-text` / `--ds-text-subtle` / `--ds-text-subtlest`); semantic color lives only inside lozenges (B3 1/4 → 3/4, +2)
- C6 off-grid spacing 6px ×19 → 8px, 20px ×2 → 24px; grid = {4,8,12,16,24} 100% (C1 2/5 → 5/5, +3)
- C7 radii [3,4,6,8,50] → 3 classes: controls 4, content card 8, timer chip pill 50% — retire 3 and 6 (H1 1/3 → 3/3, +2)
- C8 "All steps" select orphaned at x≈1330 → docked 8px right of Day/Week segment; scan path title → controls → content in one run (E2 2/3 → 3/3, +1)
- C9 real content ends y=287 (32% of viewport) with rowsVisible=0 → 24-hour slot-grid scaffold renders even when empty: 18 dimmed 40px hour rows fill to footer, content bbox ≥92% (D1 2/6 → 5/6, D2 0/4 → 3/4, +6)
- C10 empty state = 2 bare text lines at 1050px line length → canonical block per `releasehub/EmptyState.tsx`: 32px calendar-clock icon + 14px value prop (max-w 480 centered) + default-appearance "Apply SOP template" CTA + 12px sample-data link (D3 1/5 → 4/5, +3)
- C11 no load skeleton, empty card pops in → skeleton matching the slot-grid layout (G 2/5 → 4/5, +2)
- C12 pink pulse FAB (hue 330) removed from route per module rule → nonNeutralHues 4 → 3 [210, 0, 90]; also removes the contentBottomPct=100 artifact (A hygiene, ~+1)

Projected: 59 + ~23 (A +4, B +6, C +3, D +9 partial-credited conservatively, E +1, G +2, H +2, minus rounding) = **82 / B** — density (C8/C9), typography (C3/C4/C5), and color/CTA (C1/C2/C12) all resolve, so the B cap lifts; A-grade blocked until populated-state density and focus-visible states (F) are proven live.

---

PAGE: /release-hub/sign-off-queue   TARGET LAYOUT @1440×900   grade F(58) → B(79) projected

```
PAGE: /release-hub/sign-off-queue   TARGET LAYOUT @1440×900   grade F(58) → B(79) projected
┌─ VIEWPORT 1440 ──────────────────────────────────────────────────────────────┐
│ HEADER h=56 · pad 0 32 · border-b --ds-border                                │
│  Releases / Sign-off queue (12px breadcrumb, terminal once — no dup title)   │
│  Sign-off queue (20px/600)   ‹CHG-1042 · 1d 09h› [Request sign-off] [+ Create]■
│                               12px subtle chip     32px h, default  32px bold │
│                               (shell chrome — the ONE bold fill)             │
├─ TOOLBAR h=40 · pad 8 32 · gap 8 ────────────────────────────────────────────┤
│  [Status ▾][Gate ▾][Assignee ▾][Overdue ▾]   [Visual|Table]  [🔍 Search 240px]│
│   28px h chips · 12px text · radius 4         28px toggle     32px h, radius 4│
├─ EMERGENCY BANNER h=48 · pad 12 16 · bg --ds-background-warning (subtle) ────┤
│ ▌2px left border --ds-border-warning                                         │
│ ▌⚠ Emergency change CHG-1042 needs expedited sign-off (14px)  [Approve][Reject]
│                                                       28px h subtle · danger-subtle
├─ GROUP HEADER h=40 · pad 8 16 ───────────────────────────────────────────────┤
│  ▾ Release 2026.07 — Payments  ‹In review›  4 gates · 1 overdue (12px subtle)│
│    14px/600                     subtle-bg lozenge, sentence case, 12px       │
├─ GATE ROWS (expanded by default) · row h=32 · pad 4 16 · gap 8 ──────────────┤
│  Security review      │ CHG-1042 │ ◯ A. Rahman │ Due Jul 6 │ ‹Overdue›  [✓][✕]│
│   14px --ds-text        12px mono  24px avatar   12px subtle  warn-subtle 24px │
│  Change advisory board│ CHG-1042 │ ◯ S. Chen   │ Jul 7     │ ‹Approved› [✓][✕]│
│  QA sign-off          │ CHG-1042 │ ◯ —         │ Jul 7     │ ‹Pending›  [✓][✕]│
│  Release manager      │ CHG-1042 │ ◯ V. Indla  │ Jul 8     │ ‹Rejected› [✓][✕]│
│                                                  danger-subtle lozenge (passive)
│  ░░ ×16 rows visible capacity (currently 0 rows — gates hidden in a          │
│  ░░ collapsed "4 gates · Rejected" card, content dead below y645)            │
├─ FOOTER h=32 · pad 0 32 · "1 release · 4 gates · 1 overdue" 12px subtlest ───┤
└──────────────────────────────────────────────────────────────────────────────┘
```

CHANGES vs CURRENT
- C1 boldFillButtons 4→1: global Create keeps brand-bold (■, shell convention per SYNTHESIS G-2); "Request sign-off" bold→`appearance="default"`; banner Approve bold→subtle; gate Approve bold→24px subtle icon-button
- C2 status pills: uppercase glowing "OVERDUE"/"APPROVED" (textTransform:uppercase, A3 1/4) → ReleaseOpsLozenges sentence-case subtle-bg lozenges (‹Overdue› warning-subtle, ‹Approved› success-subtle, ‹Pending› neutral), 12px
- C3 emergency banner: full-width saturated brown field (A4 breach) → `--ds-background-warning` subtle strip h=48 + 2px left border `--ds-border-warning`; painted warning pixels −~70%
- C4 passive "Rejected" red header text → ‹Rejected› danger-subtle lozenge on the row; danger color reserved for actionable gates (A5)
- C5 typography floor: 24 els at 11px (filter chips, CHG-1042, ⌘K) → 12px; gate body 13px (8 els) → 14px `--ds-text`; metadata (due dates, keys) stays 12px
- C6 font buckets 6 {11,12,13,14,17,22} → 4 {12,14,17,20}: 13px and 11px eliminated, title 22→20px/600 per module header rule, 17px kept for section headers only
- C7 text colors 8→3: text / text-subtle / text-subtlest; semantic color lives only inside lozenges
- C8 spacing snap (45 off-grid occurrences): 10px ×24→8, 6px ×17→8, 7px ×2→8, 20px ×2→24; all gaps on {4,8,12,16,24,32}
- C9 radii 6 families {3,4,6,8,14,50} → 3: controls 4, cards 8, pills/avatars 50%; 3/6/14 retired
- C10 density: collapsed gate card → gates expanded by default as 32px rows; rowsVisible 0→16 capacity; content area ~66% (dead below y645) → ≥85%, list min-height fills to footer
- C11 double title (22px H1 + 17px breadcrumb-header duplicate) → one 20px title, breadcrumb terminal 12px rendered once
- C12 CHG-1042 countdown: 11px danger-red bold monospace fill → 12px subtle chip on `--ds-background-neutral`; danger tokens only when remaining <4h (G-1); no longer counts as bold fill
- C13 focus-visible: 2px `--ds-border-focused` ring on gate ✓/✕ buttons and filter chips (F2 risk closed)

DELTA MATH (honest): A 11→18 (C1+C2+C3+C4), B 9→15 (C5+C6+C7), C 9→11 (C8), D 9→13 (C10), E 8→9 (C11), F 6→7 (C13), H 3→5 (C9+C12) → 58+21 = 79. Density, typography, and color all resolve, so B is earned — but hue count stays at the 6-hue A1 ceiling (pink FAB hue 330 is a shared-component fix outside this page), which blocks A-range.

---

PAGE: /release-hub/sop-templates   TARGET LAYOUT @1440×900   grade C(63, HF1-capped) → B(78) projected
┌─ VIEWPORT 1440 ──────────────────────────────────────────────────────────────┐
│ HEADER h=56 · pad 0 32 · border-b var(--ds-border)                           │
│  ⌂ Releases / SOP templates (20px/600 var(--ds-text))     [＋ Create]■       │
│    12px breadcrumb var(--ds-text-subtle)                   global chrome CTA │
│    ‹Freeze in 1d 9h · CHG-1042› 12px subtle-bg neutral lozenge (not danger)  │
├─ TOOLBAR h=40 · pad 8 32 · gap 8 ────────────────────────────────────────────┤
│  [Environment ▾][Category ▾][State ▾]      [🔍 Search 240px] [＋ New template]│
│   28px h chips · 12px text · radius 4       32px h            32px h, DEFAULT│
│                                                               appearance     │
├─ TABLE · row h=48 (2-line) · pad 8 16 · radius 8 card · fills to footer ─────┤
│  NAME 14px var(--ds-text)          │CATEGORY │ENV      │STEPS      │UPDATED  │
│  col headers 12px/600 subtle        12px      12px      right-align  12px    │
│ ─────────────────────────────────────────────────────────────────────────────│
│  Standard prod deployment          │‹Deploy› │‹Prod›   │ 12 · 4 mand│ Jul 6  │
│   Rollout with smoke checks (12px   subtle    subtle    tabular-nums  12px   │
│   var(--ds-text-subtle))            lozenge   lozenge   14px               │
│  Hotfix emergency path             │‹Deploy› │‹Prod›   │     —      │ Jul 5  │
│   (steps=0 → single "—", NO         sentence  sentence                        │
│    "0 · 0 mand · 0 tech" badges)    case      case                            │
│  ░░ ×6 template rows (dataset n=6) · ×~9 remaining capacity                  │
│ ─────────────────────────────────────────────────────────────────────────────│
│  GHOST PANEL h=120 · centered · fills residual band below last row           │
│   ⧉ 32px icon var(--ds-icon-subtle)                                          │
│   "Standardize every deploy with a reusable SOP" 14px var(--ds-text-subtle)  │
│   [New template] 32px default btn · "Start from a sample" 12px link          │
├─ FOOTER h=32 · "6 templates" 12px var(--ds-text-subtlest) ───────────────────┤
└───────────────────────────────────────────────────────────────────────────────┘
CHANGES vs CURRENT
- C1 HF1 clear: 3 els at computed 0px (font-size:0 sr-only) → clip visually-hidden pattern; 2 els at 11px → 12px floor (uncaps the page; per synthesis G-4)
- C2 body cells 13px ×46 → 14px (template name, Category, Env, Updated); descriptions stay 12px; font buckets 7 {0,11,12,13,14,17,22} → 4 {12,14,16,20}; title 22 → 20px/600 per header rule
- C3 boldFillButtons 3 → 1 (■ global Create stays bold per G-2 convention; "＋ New template" demotes to appearance="default" — overrides route H-2's local call; pink pulse FAB hue 330 removed from route)
- C4 CHG-1042 countdown pill: 11px danger bold-fill → 12px neutral subtle-bg lozenge, danger tokens only <4h remaining (G-1); non-neutral hues 4 [210,330,0,90] → 1 [210]
- C5 toolbar geometry: "New template" floating a full row above filters → merged single 40px toolbar row (filters left, search+CTA right); recovers ~48px vertical band
- C6 Steps cell "0 · 0 mand · 0 tech · 0 ev · 0 rb" on 4/6 rows → "—" when steps=0, only non-zero facets when >0; tabular-nums + right-align
- C7 Est. column ("—" on 5/6 rows) → dropped until data populates (per route C-4)
- C8 copy colors 6 → 3 (var(--ds-text) / var(--ds-text-subtle) / var(--ds-text-subtlest))
- C9 off-grid spacing 6px ×19 → 8px, 20px ×2 → 16/24 (8px grid)
- C10 radii {3,4,6,8,50} → controls 4 / cards 8 / pills 50% (3 and 6 retired)
- C11 inner horizontal scrollbar under table at 1440px despite fitting columns → remove forced min-width/overflow-x on wrapper
- C12 dead band: content ends ~480px of 894 (~54% painted) → table card min-height stretches to footer; residual band filled by ghost panel (icon 32px + value-prop 14px + default CTA + sample-data link 12px)
PROJECTION: 63 → 78 (B) — HF1 uncap + B 8→14 (C2/C8) + A 16→19 (C3/C4) + C 11→13 (C9) + D 9→12 (C12) + E 6→8 (C6) + H 3→4 (C10); capped at B (density and typography resolve; color hues reduced to brand-only but 330-FAB removal is a shared-component dependency)

---

PAGE: /release-hub/freeze-windows   TARGET LAYOUT @1440×900   grade F(57) → B(76) projected
```
┌─ VIEWPORT 1440 ──────────────────────────────────────────────────────────────┐
│ HEADER h=56 · pad 0 32 · border-b --ds-border                                │
│  ⌂ Releases / Freeze windows (12px breadcrumb, --ds-text-subtlest)           │
│  Freeze windows (20px/600 --ds-text)   ‹Freeze in 1d 09h · CHG-1042›  [+ Create]■│
│                                         12px subtle chip, neutral bg   32px h, bold │
│                                         (danger tokens ONLY if <4h)   (global, the ONE)│
├─ TOOLBAR h=40 · pad 8 32 · gap 8 ────────────────────────────────────────────┤
│  1 active window (12px --ds-text-subtle)  [Env ▾][Status ▾]  [New freeze window]│
│   left anchor per E2                       28px h chips,      32px h, default  │
│                                            12px, radius 4     appearance (demoted)│
├─ ACTIVE WINDOW CARD · h=88 · margin 16 32 0 · pad 16 · radius 8 ─────────────┤
│ ▎│ Q3 production freeze (14px/600)   ‹Active› ‹Conflict ×2›   Jul 6 – Jul 7, 2026│
│ ▎│ Blocks all prod deploys… (12px     12px sentence-case       12px tabular-nums,│
│ ▎  --ds-text-subtle)                  subtle lozenges           right-aligned    │
│ 3px left border --ds-border-danger · surface --ds-surface-raised (no row wash) │
│  ‹Production› env lozenge 12px · gap 8 between meta items                      │
├─ UPCOMING LIST ZONE · h≈652 · fills to footer (--ds-surface) ────────────────┤
│                                                                               │
│                        ┌─ EMPTY STATE w=400 · centered ─┐                     │
│                        │        ❄ icon 32×32px          │                     │
│                        │  No upcoming freeze windows —  │                     │
│                        │  schedule the next one to      │                     │
│                        │  protect production (14px,     │                     │
│                        │  --ds-text-subtle, center)     │                     │
│                        │  gap 16                        │                     │
│                        │  [Schedule freeze window]      │                     │
│                        │   32px h, default appearance   │                     │
│                        │  View past windows (12px link) │                     │
│                        └────────────────────────────────┘                     │
│  (when >1 window: canonical list rows h=36 · title 14px · meta 12px · ≥15 fit)│
├─ FOOTER h=32 · pad 0 32 · "1 freeze window" 12px --ds-text-subtlest ─────────┤
└───────────────────────────────────────────────────────────────────────────────┘
```
CHANGES vs CURRENT
- C1 (H-3, HF1): 3 text els at font-size:0 → sr-only clip pattern (`position:absolute;clip`), never 0px — mechanical HF1 uncapped permanently
- C2 (T-1, G-2): boldFillButtons 3→1 — global "+ Create" keeps brand-bold (■); "New freeze window" bold→`appearance="default"`; CHG-1042 countdown pill red bold-fill 11px mono → 12px neutral subtle chip (`--ds-background-neutral` + `--ds-text-subtle`), danger tokens only when <4h remaining
- C3 (H-1, L-3, G-3): visible font buckets 6 {11,12,13,14,17,22} → 3 {12,14,20}: 11px×4→12, 13px×2 description→12 subtle, 17px card title→14/600, 22px page title→20/600 per header rule
- C4 (H-2, G-6): textColors 6→3 (`--ds-text` / `--ds-text-subtle` / `--ds-text-subtlest`); the 3 danger-tinted title/date extras stripped — semantic color lives only in lozenges + left border
- C5 (L-1, L-2, G-5): full-row danger wash + red border + red icon → neutral `--ds-surface-raised` card with 3px left border `--ds-border-danger`; "ACTIVE"/"CONFLICT ×2" uppercase scream chips → `@atlaskit/lozenge` sentence-case subtle (‹Active› success, ‹Conflict ×2› removed)
- C6 (L-4): date "Jul 6 – Jul 7, 2026" → `font-variant-numeric: tabular-nums`, right-aligned column
- C7 (L-5, G-7): offGridSpacing 6px×13→8px, 20px×2→16/24 — spacing histogram fully on {2,4,8,12,16,24,32}
- C8 (V-3, G-8): radii [3,4,6,8,50] 5 families → 3: controls 4, cards 8, pills 50% — retire 3 and 6
- C9 (V-1, V-2, G-9): painted content 235px/894 (~26%) → ≥85%: canonical empty-state block (icon 32 + value-prop 14px + default CTA + past-windows link) centered in list zone, zone min-height fills to footer; growth path = 36px canonical list rows (≥15 visible at 900px, rowsVisible 0→15)
- C10 (T-2): orphaned right-edge CTA above unrelated card → toolbar gains left anchor "1 active window" 12px so the scan path starts at a label (E2)
- C11 (synthesis #2): pink pulse FAB (hue 330) removed from route → nonNeutralHues 4 [210,330,0,90] → 2 [210,0]; contentBottomPct metric no longer inflated

PROJECTION: HF1 uncap + A 12→16 (+4: one bold CTA, wash removed, hues 4→2) + B 10→16 (+6: buckets 6→3, colors 6→3, tabular-nums) + C 9→12 (+3: off-grid 15→0) + D 6→11 (+5: empty-state + fill ≥85%) + H 3→5 (+2: radii 5→3) = 57+19 ≈ **76 B** — density, typography, and color all resolve, so B is earned but not exceeded (E/F/G untouched).

---

PAGE: /release-hub/production-events   TARGET LAYOUT @1440×900   grade C(60) → B(76) projected
```
┌─ VIEWPORT 1440 ──────────────────────────────────────────────────────────────┐
│ HEADER h=56 · pad 0 32 · border-b var(--ds-border)                           │
│  ⌂ Releases / Production events (20px/600)   ‹Freeze CHG-1042 · 1d 09h›      │
│    12px breadcrumb --ds-text-subtlest          12px subtle-bg neutral chip,  │
│                                                danger tokens only <4h        │
│                                                       [+ Create]■ 32px h bold│
├─ TOOLBAR h=40 · pad 8 32 · gap 8 ────────────────────────────────────────────┤
│  [Env ▾][Type ▾][Result ▾][Date range ▾]              [🔍 Search 240px]      │
│   28px h chips · 12px text · radius 4 · gap 8                                │
├─ TABLE header row h=36 · 12px/600 --ds-text-subtle · pad 8 16 ───────────────┤
│  EVENT              │ RELEASE  │ RESULT     │ SNAPSHOT │ DEPLOYED    │ WHO   │
├─ TABLE body · row h=40 · pad 8 16 · body 14px · meta 12px mono ──────────────┤
│  Deploy replay #14  │ REL-2031 │ ‹Unknown›  │  2c      │ Jul 6 14:02 │ ◯⁺⁶   │
│   14px --ds-text      12px mono  subtle-lozenge tabular  12px right   badge  │
│                                  sentence-case  -nums    -aligned     12px   │
├─ GUIDANCE STRIP h=48 · pad 12 16 · bg var(--ds-surface-sunken) · radius 8 ───┤
│  ⓘ Production events appear here when deployments are replayed               │
│    14px --ds-text-subtle              [View deployment replays] 12px link    │
├─ RESIDUE · table container min-height fills to footer (~560px) ──────────────┤
│  ░░ ghost rows ×14 capacity (row h=40) — currently 1 row + 76% dead zone     │
│  ░░                                                                          │
│  ░░                                                                          │
├─ FOOTER h=32 · pad 0 32 · "1 event" 12px --ds-text-subtlest ─────────────────┤
└──────────────────────────────────────────────────────────────────────────────┘
```
CHANGES vs CURRENT
- C1 boldFillButtons 2→1 (■ global Create only, per module convention); freeze-timer pill "+1d 09h CHG-1042" bold-fill danger monospace → subtle-bg neutral chip 12px, danger tokens (--ds-background-danger/--ds-text-danger) only when remaining <4h [T-1/T-2, G-1/G-2]
- C2 HF1 cleared: avatar count badge "6" 10px→12px [TB-1]
- C3 fontSizes 7 buckets {10,11,12,13,14,17,22}→4 {12,14,17,20}: 11px ×4→12, 13px ×5→14 (row primary) or 12 (meta), title 22→20px/600 per header rule [P-2, G-3]
- C4 "UNKNOWN" uppercase bold-fill red scream → sentence-case subtle-bg ‹Unknown› via ReleaseOpsLozenges/@atlaskit/lozenge default [TB-3, G-5]
- C5 zero-value badge "2c · 0e"→"2c" — render nothing when 0 [TB-5]
- C6 "By" hash column (6bbd0863…) dropped → tooltip on row; Snapshot fits, inner h-scroll removed at 1440 [TB-4]
- C7 Deployed datetime + snapshot counts: left-aligned proportional → right-aligned font-variant-numeric: tabular-nums [TB-6]
- C8 textColors 6→3 (--ds-text / --ds-text-subtle / --ds-text-subtlest); semantic color only inside lozenges [TB-2, G-6]
- C9 offGridSpacing snapped: 6px ×13→8, 20px ×2→16; grid = {4,8,12,16,24,32} [TB-7, G-7]
- C10 radii {3,4,6,8,50}→3 classes: controls 4, cards/strips 8, pills/avatars 50% — retire 3 and 6 [TB-8, G-8]
- C11 density: true content bbox 24% (~210px)→100%; table min-height fills to footer; 1 row + guidance strip (48px, icon 16 + 14px value-prop + 12px link CTA) + ghost-row scaffold ×14 so page reads intentional, not broken [V-1]
- C12 new toolbar h=40 (Env/Type/Result/Date-range chips 28px h, 12px, radius 4) — matches sibling routes' filter-bar pattern, absent today [V-2]
- C13 non-neutral hues 4 [210,330,0,90]→2 [210 brand, 0 danger-conditional]: pink 330 timer neutralized (C1), 90 retired with lozenge swap (C4)

PROJECTION: 60 + HF-uncap/B +8 (C2/C3/C8) + D +5 (C11/C12) + A +3 (C1/C4/C13) = 76 B — density, typography, and color all resolve, so B is earned; A/E residue (pulse FAB shared chrome, single-row data reality) blocks higher.

---

PAGE: /release-hub/release-kanban   TARGET LAYOUT @1440×900   grade F(55) → B(76) projected
```
┌─ VIEWPORT 1440 ──────────────────────────────────────────────────────────────┐
│ HEADER h=56 · pad 0 24 · border-b --ds-border                                │
│  ⌂ Releases / Board (20px/600)   ‹1d 09h · CHG-1042› 12px      [+ Create]■  │
│    12px breadcrumb                neutral subtle chip,          32px h, bold │
│                                   danger tokens only <4h        (global)     │
├─ TOOLBAR h=40 · pad 8 24 · gap 8 ────────────────────────────────────────────┤
│  [Release ▾][Env ▾][Assignee ▾]                        [🔍 Search 240px ⌘K] │
│   28px h chips · 12px text · radius 4                   ⌘K hint 12px        │
├─ BOARD h=804 (fills to y=900) · pad 16 24 · col gap 8 · 6 cols ×224px ──────┤
│ ┌DRAFT (3)──┐┌IN PROGRESS┐┌READY SIGN.┐┌APPROVED──┐┌SCHEDULED─┐┌RELEASED──┐ │
│ │ hdr h=32  ││ (2)       ││ hdr h=32  ││          ││          ││ (1)      │ │
│ │ 12px/600  ││           ││ no badge  ││ no badge ││ no badge ││          │ │
│ │┌─────────┐││┌─────────┐││ when 0    ││          ││          ││┌────────┐│ │
│ ││CARD h≈96│││ Q3 Mobile ││           ││ ◌ 16px   ││          ││ v2.4.0 ││ │
│ ││pad 12   │││ Release   ││           ││ "No      ││          ││        ││ │
│ ││radius 8 │││ 14px/600  ││           ││ releases ││          ││        ││ │
│ ││surface- │││‹Investor  ││           ││ approved ││          ││        ││ │
│ ││raised   │││ journey…› ││           ││ yet" 12px││          ││        ││ │
│ │└─────────┘││ 12px loz. ││           ││ [Add     ││          ││└────────┘│ │
│ │ title 14px││ subtle-bg ││           ││ release] ││          ││          │ │
│ │ meta 12px ││ sentence  ││           ││ tertiary ││          ││          │ │
│ │           ││           ││           ││ (1st     ││          ││          │ │
│ │ ░ ghost   ││ ░ ghost   ││ ░ ghost   ││ empty    ││ ░ ghost  ││ ░ ghost  │ │
│ │ drop zone ││ fills to  ││ fills to  ││ col only)││ fills to ││ fills to │ │
│ │ → y=900   ││ y=900     ││ y=900     ││          ││ y=900    ││ y=900    │ │
│ └───────────┘└───────────┘└───────────┘└──────────┘└──────────┘└──────────┘ │
│  h-scrollbar (if any) docked at y=900 bottom edge, never mid-page            │
└──────────────────────────────────────────────────────────────────────────────┘
```
CHANGES vs CURRENT
- C1 (A2) boldFillButtons 2→1: red bold monospace countdown pill "+1d 09h 21m CHG-1042" → 12px neutral subtle chip (`--ds-background-neutral` + `--ds-text-subtle`, danger tokens only when <4h remaining); global [+ Create] keeps the sole ■ bold fill per module convention
- C2 (A3, color law) lime bold-fill UPPERCASE tag "INVESTOR JOURNEY PRODUCT" ×3 (hue 90) → ReleaseOpsLozenges subtle-bg sentence-case 12px lozenge; lime retired
- C3 (D1) painted content 55%→≥90%: columns min-height `calc(100vh − 96px)` fill to y=900; board container h-scrollbar moves from mid-page y≈440 to bottom edge
- C4 (D2/V-1) column width capped at 224px so all 6 columns + 24px gutters fit at 1440 with no container h-scroll (current: 3 cards across 6 columns, 45% unpainted)
- C5 (B1) 11px visible text ×7 (⌘K, CHG-1042, tag text) → 12px floor
- C6 (B2) 7 visible font sizes {11,12,13,14,17,18,22}→4: 13→14 (8 els), 17→16 kill (1), 18+22→20px/600 single page title (per header rule); target set {12,14,16,20}
- C7 (B3) textColors 6→3: `--ds-text` / `--ds-text-subtle` / `--ds-text-subtlest`; semantic color lives only inside lozenges
- C8 (C1) offGrid spacing snapped: 6px ×41→8, 10px ×2→8, 20px ×4→16/24; card pad 12, col gap 8, board pad 16 24
- C9 (E3) three "0" count badges (READY FOR SIGN-OFF / APPROVED / SCHEDULED) → suppressed when count=0; header text alone carries state
- C10 (D3) bare dark empty panels → canonical per-column empty block in FIRST empty column only: ◌ icon 16px + "No releases approved yet" 12px `--ds-text-subtle` + tertiary [Add release]; remaining empties get ghost dashed drop-zone fill
- C11 (H1) radii {3,4,6,8,10,50}→3 classes: controls 4 / cards 8 / pills 50%; retire 3, 6, 10
- C12 (H2/A5) olive-tinted "Q3 Mobile Release" card + red flag glyph → all cards `--ds-surface-raised`; attention = 2px left border accent, flag only if blocked-needs-action; hues 5→2 (210 + semantic-in-lozenge)

Projected: A 12→17, B 9→15, C 10→12, D 4→11, E 7→8, H 3→5 ⇒ 55→76 (B) — density (C3/C4/C10), typography (C5–C7), and color (C1/C2/C12) all resolve, so the B cap is earned.

---

PAGE: /release-hub/work   TARGET LAYOUT @1440×900   grade C(61) → B(77) projected
```
┌─ VIEWPORT 1440 ──────────────────────────────────────────────────────────────┐
│ HEADER h=56 · pad 0 32 · border-b var(--ds-border)                           │
│  ⌂ Releases / Work (12px breadcrumb, --ds-text-subtlest)                     │
│  Release work (20px/600 --ds-text)     ‹+1d 09h CHG-1042› 12px   [Create]■   │
│                                         neutral-subtle chip      32px h bold │
├─ WORKLIST RAIL w=320 · pad 16 ──┬─ DETAIL PANE w=1120 · pad 24 32 ───────────┤
│ IN READINESS (12px/600 subtle)  │ RELEASE HEADER h=88 · pad 0 0 16 · gap 8   │
│ ┌─ card h=88 · pad 12 · r=8 ──┐ │  Payments Platform 2.4  (17px/600)         │
│ │ Payments Platform 2.4 14px  │ │  ‹In readiness› ‹On track›  12px sentence- │
│ │ v2.4.0 · 👤 12px subtle     │ │   case subtle-bg ReleaseOpsLozenges        │
│ │ ‹In readiness› 12px lozenge │ │  [Deploy to beta] [•••]  32px h, default   │
│ └─────────────────────────────┘ │  META STRIP h=40 · gap 16                  │
│ ┌─ card h=88 (selected,       │ │  Type 12px / Major 14px · Env 12px /       │
│ │  bg --ds-background-        │ │  production 14px · Target 12px / Jul 14    │
│ │  selected) ─────────────────┘ │  14px · Changes 12px / 3 14px              │
│ ┌─ card h=88 ─────────────────┐ ├─ STEPPER h=56 · pad 8 0 · gap 8 ───────────┤
│ │ (3rd release card)          │ │  ●─────●─────○─────○─────○                 │
│ └─────────────────────────────┘ │  Draft  In prog QA   Beta  Production      │
│  gap between cards = 8         │ │  12px labels · 20px circles                │
│                                 ├─ TABS h=40 · border-b ─────────────────────┤
│  (rail = auto-height stack,    │ │  Overview | Changes | Sign-offs | Activity│
│   grouped by status; NO        │ │  14px · active border-b-2 --ds-border-    │
│   pagination row, NO page-size │ │  focused                                  │
│   selector — 3 of 3 shown)     │ ├─ OVERVIEW h≈560 · 2-col grid · gap 24 ────┤
│                                 │ │ FIELDS col w=520          SUMMARY col     │
│  remaining rail below stack =  │ │  Release manager 12px      ┌─ Changes ──┐ │
│  --ds-surface, no chrome       │ │  👤 A. Rahman 14px         │ card r=8   │ │
│                                 │ │  Product owner 12px       │ pad 16     │ │
│                                 │ │  — (em-dash, unknown)     │ 3 changes  │ │
│                                 │ │  Target date 12px         │ 14px rows  │ │
│                                 │ │  Jul 14, 2026 14px        │ h=40 each  │ │
│                                 │ │  Planned release 12px     └────────────┘ │
│                                 │ │  v2.4.0 14px              ┌─ Activity ─┐ │
│                                 │ │  Caty note: inline row,   │ card r=8   │ │
│                                 │ │  14px --ds-text-subtle,   │ 4 events   │ │
│                                 │ │  info icon 16px (no       │ 12px meta  │ │
│                                 │ │  tinted band)             │ h=32 each  │ │
│                                 │ │                           └────────────┘ │
├─ (content fills to y≈868) ─────┴─┴───────────────────────────────────────────┤
└──────────────────────────────────────────────────────────────────────────────┘
■ = the ONE bold-fill CTA: global "Create" (shell chrome, brand-bold) —
    per module convention G-2. "Deploy to beta" demotes to appearance="default".
```

CHANGES vs CURRENT
- C1 boldFillButtons 3→1: global "Create" keeps brand-bold (■); "Deploy to beta" bold-fill → `appearance="default"`; third fill (red countdown chip counted as fill) → neutral subtle chip. [R-1, G-2 convention]
- C2 countdown chip "+1d 09h 23m CHG-1042": persistent red/pink (hues 0/330) monospace fill → 12px `var(--ds-text-subtle)` on `var(--ds-background-neutral)`; danger tokens only when <4h remain. [G-5 route / G-1 module]
- C3 11px→12px sweep, 25 elements: WorkList card metadata (version link, avatar), lozenge text, meta-strip labels (Type/Environment/Target/Changes/Readiness), stepper stage labels, Overview field labels. Largest single B1 offender cleared. [W-3, R-2, R-3, S-1, O-4]
- C4 13px→14px, 16 elements: body/values snap to 14; font buckets 6 {11,12,13,14,17,28} → 4 {12,14,17,20} (28px title folds to 20px/600 per header rule; 17px section heading kept). [G-3]
- C5 lozenges "IN READINESS"/"ON TRACK" uppercase 11px → ReleaseOpsLozenges subtle-bg sentence-case 12px. [R-2, synthesis G-5]
- C6 pagination "1–3 of 3" + page-size "3 ∨" → removed (totalItems ≤ pageSize = zero-value chrome). [W-1, G-10]
- C7 rail: ~70% void below 3 cards → grouped auto-height card stack (group header 12px/600, cards h=88, gap 8); residue is plain surface, no dead list chrome. [W-2]
- C8 stepper band ~90px → 56px: vertical padding 16→8; reclaimed ~34px given to Overview. [S-2]
- C9 Overview dead lower ~35% (content bbox ended ~66%) → Changes summary card + Activity feed pulled up into a 2-col grid beside fields; content bottom ~66%→~96%. [O-1]
- C10 Caty banner: full-width purple (hue 270) tinted band on passive info → inline 14px subtle text row with 16px info icon; non-neutral hues 5→3 (210 links, semantic inside lozenges only). [O-2]
- C11 "Assigned" placeholder as field value → avatar+name when known, em-dash when not (zero-assumption). [O-3]
- C12 spacing snap: 6px ×43 → 8px, 10px ×2 → 8px, 19px ×1 → 16px; all gaps/pads on {4,8,12,16,24,32}. [G-1 route]
- C13 radii 7 families [2,3,4,6,8,12,50] → 3 classes: controls 4, cards 8, pills/avatars 50%. [G-2 route]
- C14 text colors 8→3 on copy: `--ds-text` values/titles, `--ds-text-subtle` labels/meta, `--ds-text-subtlest` hints; semantic color lives only inside lozenges. [G-4 route]

Projected: A 15→18 (C1,C2,C10), B 8→15 (C3,C4,C5,C14), C 10→13 (C12), D 8→12 (C7,C8,C9), E 8→9 (C6), H 2→4 (C13) → 61+16 = **77 (B)**. Density (C7–C9), typography (C3–C5) and color (C1,C2,C10,C14) all resolve, so B is honestly reachable; A-grade blocked by remaining shared-chrome debt (pulse FAB, module-wide radius/spacing drift outside this route's files).

---

PAGE: /for-you   TARGET LAYOUT @1440×900   grade F(57) → B(78) projected
```
┌─ VIEWPORT 1440 ──────────────────────────────────────────────────────────────┐
│ HEADER h=56 · pad 0 32 · border-b var(--ds-border)                           │
│  ⌂ Home / For you (12px breadcrumb, --ds-text-subtlest)         [+ Create]■  │
│  For you (20px/600, --ds-text)                          32px h, brand-bold   │
├─ CHANGE BANNER h=72 · margin 16 32 0 · pad 12 16 · radius 8 · card ──────────┤
│  ‹Live› Payments Platform 2.4 · v2.4.0 (14px --ds-text)   +1d 09h 27m        │
│  Scheduled · High · production · Running · #3  (12px --ds-text-subtle,       │
│   subtle-bg sentence-case lozenges, gap 8)     timer 12px mono --ds-text-    │
│  [Open change] 32px h default  [SOP] 32px h subtle        danger (red ONLY)  │
├─ TAB BAR h=40 · pad 0 32 · gap 8 · border-b var(--ds-border) ────────────────┤
│  Work items (69)  Ageing (13)  Boards  Recent        [◇ Themify] icon-subtle │
│   14px tabs · count badges 12px, radius 4                28px h, no fill     │
├─ WORK LIST · starts 24px below tabs · pad 0 32 ──────────────────────────────┤
│  IN PROGRESS — section header h=32 · 14px/600 --ds-text-subtle               │
│  ▣ MWR-919  Fix payout reconciliation drift…   Payments   ‹In progress›     │
│    row h=56 · pad 8 16 · title 14px --ds-text · meta 12px --ds-text-subtle   │
│    "Story · MWR-919" 12px · project link --ds-text-brand · lozenge col @640  │
│  ▣ MWR-903  Rotate service credentials…        Platform   ‹In progress›     │
│  ON HOLD — section header h=32                                               │
│  ▣ MWR-871  Vendor webhook retries…            Payments   ‹On hold›         │
│    (neutral subtle lozenge — no yellow on passive rows)                      │
│  ░░ ×11 rows visible @56px (currently 6 @~90px effective)                    │
│  ░░                                                                          │
│  ░░                                                                          │
└─ (no floating FAB, no edge half-pill on this route) ─────────────────────────┘
```
CHANGES vs CURRENT
- C1 bold-fill CTAs 3→1 (■ global Create only, per module convention G-2): "SOP" saturated fill → subtle `var(--ds-background-neutral)` 32px button [CB-3]; "Themify" pink pulse pill (y≈353, right-orphaned) → subtle icon-button docked in TabBar right slot [T-3]
- C2 12px floor: 14 visible 11px els ("⌘K", "Scheduled", "High", "Running · #3…", tab counts "69"/"13") → 12px, line-height 16px holds density [CB-1, T-1]
- C3 type buckets 6 (11/12/14/16/17/24) → 3 {12 meta, 14 body, 20 title}: the 7 strays at 16/17px → 14px; "For you" 24px → 20px/600 per header rule [W-4, G-3]
- C4 text colors 7 → 3: titles `var(--ds-text)`, "Story · MWR-919" `var(--ds-text-subtle)`, project links `var(--ds-text-brand)`; semantic color only inside lozenges [W-3, G-6]
- C5 banner red trio (red mono timer + red left border + red dot) → one signal: timer keeps `var(--ds-text-danger)`, border → `var(--ds-border)`, dot absorbed into ‹Live› lozenge [CB-2]
- C6 status pills → ReleaseOpsLozenges subtle-bg sentence-case 12px; yellow "ON HOLD" uppercase scream on passive rows → neutral subtle ‹On hold› [W-6, G-5]
- C7 density: item cost ~90px → row 56px + section header 32px; rows visible 6 → 11 (+83%) in 900px [W-1]
- C8 dead band 118px (tabs end y≈292 → first content y≈410) → 24px gap; reclaims ~1.5 rows [T-2]
- C9 lozenge orphaned at far-right edge (~700px empty mid-row) → fixed lozenge column at x≈640, content max-width 1024px [W-2]
- C10 radii 10 (2,3,4,6,8,11,12,25,50,99) → 3 classes: controls 4 / cards 8 / pills 50%; banner 11px → 8px; FAB(50) + half-pill(99) removed from route [CB-4, F-1, G-8]
- C11 off-grid 6px spacing ×25 → 4px or 8px; all gaps on {4,8,12,16,24,32} [W-5, G-7]
- C12 pink pulse FAB (hue 330, y≈748) + white half-pill straddling viewport edge (y≈657) → removed from /for-you; hue count 6 → 5, nothing interactive straddles the edge [F-1, F-2]

PROJECTED: A 12→16 (one bold CTA, one red signal, hue 330 gone), B 9→16 (3 buckets, 3 colors, 12px floor), C 10→13 (6px purge), D 7→12 (11 rows, void killed), H 2→4 (radii 3 classes) = 57 → 78 (B). Density, typography, and color all resolve, so B is earned; A-tier blocked until module-wide chrome (countdown chip, shell Create pattern) ships everywhere.

---

