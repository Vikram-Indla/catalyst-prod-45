# RUTHLESS UI AUDIT RUBRIC — v2 (2026-07-08)

> Generic, product-agnostic, unforgiving. Scores what a user SEES, not what the code says.
> Token compliance is the entry fee, not the score. A page can be 100% token-clean and still fail.
> Every criterion is MEASURED from computed styles / DOM geometry — no adjectives, no vibes.

## Scoring

100 points across 8 categories. Grade bands:
- **A (90–100)** — flagship. Screenshot-worthy against Linear/Height/Jira.
- **B (75–89)** — competitive. Ship, iterate.
- **C (60–74)** — functional, not standout. Remediation required.
- **F (<60)** — redesign the page, don't patch it.

### HARD-FAIL OVERRIDES (cap grade at C regardless of points)
- HF1: any text with computed font-size < 11px
- HF2: > 8 distinct non-neutral hues visible in one viewport
- HF3: populated view using < 50% of viewport area for content
- HF4: any interactive element with no visible focus state
- HF5: horizontal scrollbar on the page body at 1440px width

## Categories

### A. Color discipline — 20 pts
| # | Check | Measure | Pts |
|---|---|---|---|
| A1 | ≤ 6 distinct non-neutral hues per viewport | count computed color/bg-color/border-color, cluster by hue, exclude neutrals (sat < 15%) | 6 |
| A2 | Exactly 1 primary (bold-fill) CTA per view | count elements with brand-bold background | 4 |
| A3 | Passive status = subtle-bg lozenge, never bold fill / glow / uppercase scream | inspect status elements' bg vs text tokens | 4 |
| A4 | 60-30-10: ≥ 85% of painted pixels neutral | sample screenshot pixel saturation | 3 |
| A5 | Semantic color never decorative (yellow/red only when action needed) | count warning/danger tokens on non-actionable elements | 3 |

### B. Typography — 20 pts
| # | Check | Measure | Pts |
|---|---|---|---|
| B1 | Body/content text ≥ 14px; metadata floor 12px; NOTHING below 11px | font-size histogram | 6 |
| B2 | ≤ 4 distinct font sizes per view | histogram bucket count | 4 |
| B3 | ≤ 3 text color levels (text / subtle / subtlest) | distinct text colors on copy | 4 |
| B4 | Numeric columns: tabular-nums + right-aligned | computed fontVariantNumeric + textAlign | 3 |
| B5 | Line-height 1.3–1.6 body; compression (not font-shrink) used for density | computed lineHeight/fontSize ratio | 3 |

### C. Spacing & rhythm — 15 pts
| # | Check | Measure | Pts |
|---|---|---|---|
| C1 | All gap/padding/margin ∈ {0,2,4,8,12,16,24,32,40,48} | computed style histogram | 5 |
| C2 | Group separation ≥ 2× intra-group gap (proximity = hierarchy) | section gap vs item gap ratio | 5 |
| C3 | Padding ratio: horizontal ≈ 1.5–2× vertical on buttons/cells/chips | computed padding pairs | 3 |
| C4 | One gutter width per page edge, consistent | left/right content offsets | 2 |

### D. Density & viewport — 15 pts
| # | Check | Measure | Pts |
|---|---|---|---|
| D1 | Populated view: content bounding box ≥ 70% of viewport — **applies only when available data could fill the viewport** (rows × rowHeight > viewport). A 4-row table ending high is honest, not a defect; stretching a border to fake density is worse design (v2.1 calibration, 2026-07-08). Thin-data views are scored on D3-style guidance instead: footer count, CTA, next-step affordance. | content bbox / viewport area, gated on data volume | 6 |
| D2 | List/table: ≥ 15 rows visible at 1440×900 without cramping | row count in first viewport | 4 |
| D3 | Empty state: illustration/icon + value prop + primary CTA (never bare text) | DOM inspection of empty views | 5 |

### E. Hierarchy & signal — 10 pts
| # | Check | Measure | Pts |
|---|---|---|---|
| E1 | Squint test: single focal element identifiable (title or primary action dominates) | largest text + boldest fill uniqueness | 4 |
| E2 | F/Z scan path: title → filters → content, no orphaned right-edge criticals | element position audit | 3 |
| E3 | Every count/badge earns its place (no "0" badges, no redundant labels) | zero-value indicator count | 3 |

### F. Interaction states — 10 pts
| # | Check | Measure | Pts |
|---|---|---|---|
| F1 | Hover state on every row/button/link | :hover style presence | 4 |
| F2 | focus-visible ring on every interactive element | computed outline/box-shadow on focus | 4 |
| F3 | Disabled state visually distinct + cursor not-allowed | disabled element styles | 2 |

### G. Motion & perceived perf — 5 pts
| # | Check | Measure | Pts |
|---|---|---|---|
| G1 | No `transition: all`; transitions ≤ 200ms, state-change only | computed transition properties | 2 |
| G2 | Skeleton/optimistic on load paths matching final layout (no jump) | load observation | 3 |

### H. Consistency — 5 pts
| # | Check | Measure | Pts |
|---|---|---|---|
| H1 | One radius per component class (controls / cards / pills) | borderRadius histogram | 3 |
| H2 | Same pattern for same action across sibling routes | cross-route comparison | 2 |

## Audit output format (mandatory) — COMBINED MATRIX

One table, one row per route, BOTH views fused: pass/fail per category (scan layer) + score/grade/hard-fails (severity layer).

Cell rule per category: ✅ = ≥ 80% of category points; ⚠️ = 50–79%; ❌ = < 50%.

```
| Route | Score | Grade | Hard-fails | A Color | B Type | C Space | D Density | E Signal | F States | G Motion | H Consist |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /x/list | 59/100 | F | HF1 | ⚠️ | ❌ | ⚠️ | ❌ | ✅ | ⚠️ | ✅ | ⚠️ |
```

Below the table: one line per hard-fail naming the exact offending element + measured value.

## Remediation output format (mandatory) — WIREFRAME BLUEPRINT

Architect floor-plan per page: ASCII wireframe of the TARGET layout at 1440×900, every zone dimensioned (heights, paddings, font sizes, gaps), placeholders showing what is visible where. Current→target deltas annotated in a CHANGES ledger under the frame. ■ marks the single bold-fill CTA. Dimensions use the ADS scale only.

```
PAGE: /release-hub/changes   TARGET LAYOUT @1440×900   grade F(59) → B(78) projected
┌─ VIEWPORT 1440 ─────────────────────────────────────────────────────────┐
│ HEADER h=56 · pad 0 32 · border-b --ds-border                           │
│  ⌂ Releases / Changes (20px/600)          [Map external] [+ New change]■│
│    12px breadcrumb                          32px h, subtle   32px h, bold│
├─ TOOLBAR h=40 · pad 8 32 · gap 8 ───────────────────────────────────────┤
│  [Status ▾][Type ▾][Risk ▾][Env ▾]                    [🔍 Search 240px] │
│   28px h chips · 12px text · radius 4                                   │
├─ TABLE · row h=40 · pad 8 16 · body 14px · meta 12px mono ──────────────┤
│  ☐ │ CHG-1042 │ Deploy payments service…  │ ‹Scheduled› │ ‹High› │ Jul 6│
│      12px mono   14px --ds-text             subtle-lozenge pair    12px │
│  ░░ ×16 rows visible (currently 3 + 62% dead space)                     │
│  ░░                                                                     │
├─ FOOTER h=32 · "3 changes" 12px --ds-text-subtlest ─────────────────────┤
└──────────────────────────────────────────────────────────────────────────┘
CHANGES vs CURRENT
- C1 glow pills (SCHEDULED/EMERGENCY uppercase, bold-fill) → sentence-case subtle-bg lozenges
- C2 row h 52→40, rows visible 3→16 (empty residue killed, table min-height fills to footer)
- C3 body cells 12→14px; CHG key stays 12px mono; hue families 9→4
- C4 two bold CTAs → one (■); "Map external" demoted to default appearance
```

Every zone: height + padding + font sizes IN the frame. Every delta: current value → target value. No "improve X" without a number.
