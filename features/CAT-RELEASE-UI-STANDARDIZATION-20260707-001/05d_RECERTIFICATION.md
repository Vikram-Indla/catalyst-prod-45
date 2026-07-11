# RE-CERTIFICATION (2026-07-08, wf_1b96bcc7-f3b)

# Certification Synthesis — Re-Probe Wave (bar: ≥75 + zero hard-fails)

## 1. Certification Table

| Route | Old | New | Δ | HF | Verdict |
|---|---|---|---|---|---|
| /project-hub/MWR/dashboard | 64 | 75 | +11 | none | **CERTIFIED** |
| /project-hub/MWR/allwork | n/a | 74 | — | none | NOT-YET |
| /project-hub/MWR/timeline | 64 | 78 | +14 | none | **CERTIFIED** |
| /project-hub/MWR/sprints | 73 | 79 | +6 | none | **CERTIFIED** |
| /project-hub/MWR/filters | 70 | 79 | +9 | none | **CERTIFIED** |
| /product-hub/INV/dashboard | 65 | 73 | +8 | none | NOT-YET |
| /product-hub/INV/backlog | 74 | 77 | +3 | none | **CERTIFIED** |
| /product-hub/INV/roadmap | 57 | 74 | +17 | none | NOT-YET |
| /product-hub/INV/milestones | 67 | 74 | +7 | none | NOT-YET |
| /testhub/repository | n/a | 79 | — | none | **CERTIFIED** |
| /testhub/cycles | 63 | 77 | +14 | none | **CERTIFIED** |
| /testhub/plans | 67 | 77 | +10 | none | **CERTIFIED** |
| /testhub/defects | 71 | 82 | +11 | **HF1** (10px avatar initials) | NOT-YET |
| /testhub/reports | 46 | 64 | +18 | none | NOT-YET |
| /incident-hub/board | 57 | 74 | +17 | **HF1** (10px AvatarGroup initials) | NOT-YET |
| /incident-hub/analytics | 63 | 73 | +10 | none | NOT-YET |
| /incident-hub/committee-queue | 61 | 81 | +20 | none | **CERTIFIED** |
| /tasks | 64 | 71 | +7 | none | NOT-YET |

**9/18 CERTIFIED · 9 NOT-YET · 0 DEAD.** Overall mean 75.6 (was 66). No route regressed.

## 2. Module Means

| Hub | Routes | Mean | Certified |
|---|---|---|---|
| Project Hub (MWR) | 5 | 77.0 | 4/5 |
| Product Hub (INV) | 4 | 74.5 | 1/4 |
| TestHub | 5 | 75.8 | 3/5 |
| Incident Hub | 3 | 76.0 | 1/3 |
| Tasks | 1 | 71.0 | 0/1 |

## 3. True Remaining Set (NOT-YET only)

| Route | Gap to bar | Top point-loss | Fix locus |
|---|---|---|---|
| /project-hub/MWR/allwork | 1 pt | B2/B3: 8 font sizes / 6 text colors (~6 pts); bold-fill uppercase "IN QA" status (A3) | **Shared-canonical** — type-scale + text-color re-base; status pill |
| /product-hub/INV/roadmap | 1 pt | B: 7 font sizes, 8× 11px nodes, 5 color levels (−8) | **Shared-canonical** — type/color re-base; zero-badge removal page-local |
| /product-hub/INV/milestones | 1 pt | B1/B2/B3: 11px trio + 13px stray + 5 colors (+5 avail) | **Shared-canonical** type re-base; footer count page-local |
| /product-hub/INV/dashboard | 2 pts | B2/B3: 6 sizes / 6 colors (~5 pts); D3 bare-text widget empty states | **Shared** (type) + **page-local** (empty-state CTA, "0" badge) |
| /incident-hub/analytics | 2 pts | B1/B2/B3: 35× 11px chart labels, 7 colors (−10) | Mostly **page-local** (chart label config) + shared text-color |
| /tasks | 4 pts | B: 6 sizes / 7 colors (−10); zero-count widgets bare (D3/E3) | **Shared** (type) + **page-local** (widget guidance) |
| /testhub/defects | HF only (82 pts) | HF1: 10px avatar monogram initials | **Shared-canonical** — avatar monogram font floor ≥11px |
| /incident-hub/board | HF + 1 pt | HF1: 10px AvatarGroup initials; 7 font sizes | **Shared-canonical** — same avatar fix; type re-base |
| /testhub/reports | 11 pts | B2/B3: 8 sizes / 9 colors (−8); D3 bare empty state; red on zeros | **Shared** (type/color) + **page-local** (empty state, zero semantics) — deepest hole, needs both |

## 4. Executive Verdict

**9/20 certified (9/18 probed; 2 routes not in this wave).** The single highest-leverage action is a **shared-canonical typography/text-color re-base** — collapse 11/13/17px strays into the 12/14/20/24 scale and cap copy at 3 text-color levels: it is the top loss on 7 of 9 NOT-YET routes and alone certifies ~6 of them (allwork, roadmap, milestones, INV dashboard, analytics, tasks are all within 1–4 pts); pair it with the one-line shared **avatar monogram ≥11px** fix to clear both HF1 routes (defects instantly certifies at 82). Only /testhub/reports needs page-local work beyond that.

---

## PER-ROUTE

ROUTE: /project-hub/MWR/dashboard
STATE: OK
SCORE: 75/100 GRADE: B (was 64) HARDFAILS: none
CATEGORY: A:17/20 B:10/20 C:12/15 D:13/15 E:8/10 F:8/10 G:4/5 H:3/5

Metrics: fonts {11:20, 12:10, 13:4, 14:18, 17:1, 20:1, 22:1, 24:3} (8 sizes, none <11px), 3 non-neutral hues, 5 text colors, off-grid {6,20}, contentBottom 100%, no h-scroll, radii {1,3,4,6,8,50}.

Wins since baseline: no sub-11px text (HF1 cleared), 3 hues, content fills viewport, empty state now heading + guidance copy + primary "Open ProductHub" CTA (D3 pass per v2.1; thin-data timeline shows "4 sprints total" footer).

VERDICT: CERTIFIED (75, no HF) — at the floor. Remaining losses if pushing to solid B/A:
1. B2/B3 (-7): 8 font sizes (13/17/22px stragglers → collapse to 12/14/20/24) and 5 text-color levels (→3).
2. A2 (-2): two bold-fill CTAs co-visible (global Create + widget "Open ProductHub" → demote widget CTA to default appearance).
3. E3 (-2): green "0" count badge on Overdue widget header — zero-value badge should not render.

---

ROUTE: /project-hub/MWR/allwork
STATE: OK (populated split list+detail, 120 items, footer "1–25 of 120", 19 rows in DOM, no h-scroll)
SCORE: 74/100 GRADE: C (was n/a) HARDFAILS: none

| Route | Score | Grade | Hard-fails | A Color | B Type | C Space | D Density | E Signal | F States | G Motion | H Consist |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /project-hub/MWR/allwork | 74/100 | C | none | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ⚠️ |

CATEGORY: A:13/20 B:11/20 C:11/15 D:13/15 E:10/10 F:9/10 G:4/5 H:3/5

Metrics: fonts {11:2, 12:15, 13:6, 14:46, 16/17/22/24 singletons} = 8 sizes; textColors 6; hues 4; offGrid [6,10,19,20,152]; contentBottom 100%; radii [2,3,4,6,8,50].

VERDICT: NOT-YET (74 < 75, no HF — one point short)
- B2/B3: 8 distinct font sizes (cap 4) and 6 text colors (cap 3) — collapse 13→12/14, kill singleton 16/17px chrome sizes (~6 pts)
- A3/A5: "IN QA" status is bold-fill uppercase button, and "Acceptance Criteria" heading uses danger-red decoratively — both should be subtle tokens (~5 pts)
- H1 + B1: 6 border radii across controls/cards/avatar, plus 2 text nodes at 11px under the 12px metadata floor (~4 pts)

---

ROUTE: /project-hub/MWR/timeline
STATE: OK (loads, populated chrome; timeline lane thin-data — "No issues with dates" guidance banner shown)
SCORE: 78/100 GRADE: B (was 64) HARDFAILS: none (HF1 clear — min visible 11px; 4 non-neutral hues; no h-scroll; D1 gated per v2.1 thin-data rule: banner + Create CTA + guidance present)
CATEGORY: A:19/20 B:14/20 C:10/15 D:10/15 E:9/10 F:8/10 G:4/5 H:4/5
VERDICT: CERTIFIED

Remaining point losses (for future polish, not blocking):
- B: 5 font sizes (11/12/13/14/22 — one 11px + stray 13px node) and 5 text-color levels vs the ≤4-size / ≤3-level caps (-6)
- C: off-grid spacing values {6, 10, 14, 20} still present in timeline chrome (-5)
- D: left lane empty state is bare text ("No issues match your filters") with no icon/CTA of its own; no footer count (-5)

---

ROUTE: /project-hub/MWR/sprints
STATE: OK
SCORE: 79/100 GRADE: B (was 73) HARDFAILS: none
CATEGORY: A:17/20 B:13/20 C:11/15 D:14/15 E:9/10 F:8/10 G:4/5 H:3/5

| Route | Score | Grade | Hard-fails | A Color | B Type | C Space | D Density | E Signal | F States | G Motion | H Consist |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /project-hub/MWR/sprints | 79/100 | B | none | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ⚠️ |

Metrics: fonts {11:10, 12:11, 14:43, 22:1} — nothing <11px (HF1 clear); 4 non-neutral hues (HF2 clear); no h-scroll (HF5 clear). D1 v2.1 gate applies: 5 sprints cannot fill viewport; footer count ("This space has 5 sprints") + primary CTA (Create sprint) present → thin-data honest, no HF3. All 5 rows rendered, progress bars + subtle lozenges token-clean.

VERDICT: CERTIFIED (79, no HF)

Remaining losses (informational):
- B3: 7 distinct text colors on copy (target ≤3 text levels) — biggest single loss (-3)
- B1/B4: 10 elements at 11px below the 12px metadata floor; date columns not tabular-nums/right-aligned (-4)
- H1/C1: 5 border radii (3,4,6,8,50) and off-grid spacing 6/10/20px (-4)

---

ROUTE: /project-hub/MWR/filters
STATE: OK (loaded, signed-in; 0 filters — thin-data view, empty state rendered)
SCORE: 79/100 GRADE: B (was 70) HARDFAILS: none (min visible font = 11px, not <11; 3 hues; hasHScroll false; D1 exempt per v2.1 thin-data gate)
CATEGORY: A:18/20 B:14/20 C:12/15 D:10/15 E:9/10 F:9/10 G:4/5 H:3/5
VERDICT: CERTIFIED

Probe metrics: fontSizes {11:1, 12:7, 14:22, 17:1, 22:1}, textColors 5, hues [90,150,210], offGrid [6,10,20], contentBottom 100%, radii [3,4,6,8,50], rows 1.

Remaining point losses (for future polish, not blocking):
- B2/B3: 5 font sizes (>4) and 5 text colors (>3) in viewport; one 11px stray sits below the 12px metadata floor (-6)
- D3: empty state has value prop + CTA but no icon/illustration, and no "0 filters" footer count (-5)
- A2/H1: two bold-fill "Create filter" CTAs visible at once (header + empty state), and 4 distinct control radii (3/4/6/8) (-4)

---

ROUTE: /product-hub/INV/dashboard
STATE: OK (renders, signed-in; widgets present but all empty-state — thin-data view)
SCORE: 73/100 GRADE: C (was 65) HARDFAILS: none
CATEGORY: A:17/20 B:12/20 C:12/15 D:9/15 E:8/10 F:8/10 G:4/5 H:3/5

Probe metrics: fontSizes {11:2, 12:7, 13:1, 14:22, 17:3, 22:1} (6 buckets), textColors 6, hues [90,150,210], offGrid [6,20], contentBottom 100%, rows 0, hScroll false, radii [3,4,6,8,50].

D1 passes under v2.1: dashboard shell fills viewport and data volume could not fill it (all widgets empty); judged on guidance instead — Release Timeline has icon + value prop but no CTA; Delivery Composition is bare text with no icon/CTA (D3 loss). E3: literal "0" badge on Overdue widget header.

VERDICT: NOT-YET (73 < 75)
- B2/B3: 6 font sizes (13px and 17px stragglers) and 6 text colors on copy — collapse to ≤4 sizes / 3 color levels (~5 pts)
- D3: Delivery Composition empty state is bare text — add icon + "Add business request" CTA; Release Timeline needs its CTA button (~3 pts)
- E3+H1: remove the "0" badge on Overdue; unify control radii (3/4/6/8 coexist) (~4 pts)

---

ROUTE: /product-hub/INV/backlog
STATE: OK (81 items, 13 rows visible, footer "81 of 81" + Create)
SCORE: 77/100 GRADE: B (was 74) HARDFAILS: none (min font = 11px, not <11; hues 3; no h-scroll; content 100% bottom)
CATEGORY: A:15/20 B:13/20 C:11/15 D:12/15 E:10/10 F:8/10 G:4/5 H:4/5
VERDICT: CERTIFIED

Remaining point losses (for next iteration):
- A3 (-4): status lozenges are bold-fill uppercase (DONE/IMPLEMENTATION/REJECTED solid green/blue) — rubric wants subtle-bg sentence-case for passive status
- B1/B2/B3 (-7): 19 visible elements at 11px (below 12px metadata floor), 5 distinct font sizes (>4 cap), 5 text color levels (>3 cap)
- D2 (-2): 13 data rows visible with ~150px dead band above footer despite 81 items available; row fill could reach 15-16
- C1 (-2): off-grid spacing values 6, 10, 20px present

Probe JSON: fontSizes {11:19, 12:8, 13:20, 14:70, 22:2}, textColors 5, hues [90,150,210], offGrid [6,10,20], contentBottomPct 100, radii [3,4,6,8,50], hasHScroll false.

---

ROUTE: /product-hub/INV/roadmap
STATE: OK (renders, zero-data view — proper empty state with icon + value prop + CTA)
SCORE: 74/100 GRADE: C (was 57) HARDFAILS: none (min font 11px, 3 non-neutral hues, no h-scroll; HF3 waived per v2.1 thin-data gate — 0 rows available, guidance/CTA present)
CATEGORY: A:16/20 B:12/20 C:11/15 D:13/15 E:7/10 F:8/10 G:4/5 H:3/5
VERDICT: NOT-YET (1 pt short of 75)
- B typography (-8): 7 distinct font sizes (11,13,14,17,24,28,48 — cap 4); 8 elements at 11px below the 12px metadata floor; 5 text color levels (cap 3)
- E3 (-2): three zero-value stat indicators ("0", "0 Active", "0 Validation") rendered as prominent badges — rubric bans "0" badges; green "0" also uses semantic color decoratively (A5)
- H1 (-2): 6 distinct radii (3,4,6,8,12,50) — consolidate to one per component class; plus off-grid spacing 6/18/20px (C1)

---

ROUTE: /product-hub/INV/milestones
STATE: OK (2 milestones, table renders, no redirect)
SCORE: 74/100 GRADE: C (was 67) HARDFAILS: none — 11px is floor-legal, 3 hues, no h-scroll; D1 content-fill waived per v2.1 (2 rows × ~48px cannot fill 805px viewport)
CATEGORY: A:18/20 B:12/20 C:11/15 D:9/15 E:9/10 F:8/10 G:4/5 H:3/5
VERDICT: NOT-YET (74, needs ≥75)
- B2/B1: 5 font-size buckets {11×3, 12×8, 13×2, 14×22, 22} — kill the 11px trio (below 12px metadata floor) and fold 13px into 12 or 14 → +3
- B3: 5 distinct text colors on copy (limit 3: text/subtle/subtlest) → +2
- D1 thin-data guidance: CTA present but no footer count ("2 milestones") and no next-step hint; "No work items" bare text repeats per row (E3) → +3
Secondary: off-grid spacing {6,10,20} (C1) and 5 control radii {3,4,6,8,50} (H1); two bold-fill CTAs in viewport (global Create + Create milestone, A2).

---

ROUTE: /testhub/repository
STATE: OK (loads signed-in, 2 test cases, folders tree, footer "2 of 2")
SCORE: 79/100 GRADE: B (was n/a) HARDFAILS: none (min font 11px; 4 hues; no h-scroll; D1 thin-data gate applies — 2 rows, footer count + "Create case" CTA + inline "+ Create case" present)
CATEGORY: A:16/20 B:12/20 C:13/15 D:14/15 E:9/10 F:8/10 G:4/5 H:3/5

| Route | Score | Grade | Hard-fails | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /testhub/repository | 79/100 | B | none | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |

VERDICT: CERTIFIED
- Residual B2/B3: 5 font sizes (11,12,13,14,22) and 7 text colors — collapse 11px (12 elements, below 12px metadata floor) and 13px into the 12/14 pair, prune text-color levels to 3.
- Residual A2: two brand-bold CTAs in viewport (global "Create" + "Create case") — acceptable since one is app chrome, but page-level parity would demote one.
- Residual H1: 4 control radii (3,4,6,8) — normalize to one radius per component class; off-grid spacing 6px/20px minor.

---

ROUTE: /testhub/cycles
STATE: OK (populated, 4 cycles)
SCORE: 77/100 GRADE: B (was 63) HARDFAILS: none
CATEGORY: A:17/20 B:11/20 C:11/15 D:12/15 E:10/10 F:9/10 G:4/5 H:3/5
VERDICT: CERTIFIED (≥75, no HF)

Notes:
- Metrics: fontSizes {11:9, 12:20, 14:27, 16:1, 22:1}; textColors 6; hues [90,150,210]; offGrid [6,10,20]; contentBottom 100%; rows 4; hasHScroll false; radii [3,4,6,8,50].
- D1 gated per v2.1: 4 rows cannot fill viewport — CTA present ("Create cycle"); no footer count/guidance, minor D loss only.
- No HF1 (nothing <11px), 3 non-neutral hues, no body h-scroll (inner table container scrolls, allowed).
- Remaining point losses if pushing toward A: (1) B1/B2 — 9 elements at 11px and 5 distinct sizes, consolidate 11px→12px; (2) B3 — 6 text colors, collapse to text/subtle/subtlest; (3) H1 — radius sprawl 3/4/6/8, pick one control radius; plus two bold-fill CTAs in view (global "+ Create" + "Create cycle").

---

ROUTE: /testhub/plans
STATE: OK (2 seed plans render, table + header + CTA present)
SCORE: 77/100 GRADE: B (was 67) HARDFAILS: none — min font 11px (no HF1), 3 non-neutral hues (no HF2), no h-scroll (no HF5), D1 gated per v2.1 (2 rows cannot fill viewport; CTA + subtitle guidance present)
CATEGORY: A:19/20 B:10/20 C:11/15 D:12/15 E:10/10 F:8/10 G:4/5 H:3/5
VERDICT: CERTIFIED
- Typography remains the drag: 6 distinct font sizes (11,12,13,14,17,22 — cap is 4) and 7 text colors (cap 3) cost B2/B3 nearly all points; 3 elements still at 11px metadata.
- No footer row-count ("2 plans") for the thin-data view — the v2.1 D1 gate expects count + CTA + guidance; count is missing (-2).
- Radius sprawl (3,4,6,8px on controls) breaks one-radius-per-class (H1 1/3); off-grid spacing 6px/20px lingers (C1 -1).

---

ROUTE: /testhub/defects
STATE: OK (19 rows, populated, no h-scroll)
SCORE: 82/100 GRADE: C (was 71) HARDFAILS: HF1 — avatar monogram initials ("RB", 24×24 circles in Assignee column + filter bar) render at 10px (3 instances)
CATEGORY: A:18/20 B:12/20 C:11/15 D:15/15 E:10/10 F:8/10 G:4/5 H:4/5
VERDICT: NOT-YET
- HF1: 10px avatar initials — bump avatar monogram font to ≥11px or use xsmall @atlaskit/avatar image-only (caps grade at C despite 82 pts)
- B2/B3: 6 distinct font sizes (10,11,12,13,14,22) vs ≤4, and 5 text colors vs ≤3 — collapse 13px stragglers (×20) into 14px body and drop one text-color level (-5 pts)
- A3: status lozenges uppercase + bold-fill green CLOSED — sentence-case subtle-bg pair per rubric (-2 pts)

Notes: D fully recovered (contentBottom 100%, 19 rows visible ≥15 — D1/D2/D3 max, was the baseline's biggest loss). Hues 4/6 clean, off-grid spacing only {6,10,20} residual.

---

ROUTE: /testhub/reports (→ /testhub/reports/sprint-testing-status)
STATE: OK
SCORE: 64/100 GRADE: C (was 46) HARDFAILS: none

CATEGORY: A:16/20 B:8/20 C:10/15 D:9/15 E:7/10 F:7/10 G:4/5 H:3/5

| Route | Score | Grade | HF | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /testhub/reports | 64/100 | C | none | ✅ | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ |

Metrics: 5 non-neutral hues (was HF2 territory), min font 11px (no HF1), no h-scroll, contentBottom 100%, 8 font sizes {11:5, 12:19, 13:19, 14:24, 16:8, 17:1, 22:1, 28:5}, 9 text colors, off-grid spacing {6,10,14,20}, radii {3,4,6,8,50}, 4 rows (thin data — D1 gated per v2.1, honest).

VERDICT: NOT-YET
- B2/B3 (−8): 8 distinct font sizes (target ≤4) and 9 text colors (target ≤3) — consolidate 11/13/17 into 12/14/16.
- D3 (−4): governance-mismatch empty state is bare text "No governance mismatches." — needs icon + value prop + CTA.
- A5/E3 (−4): danger-red on "0 failed / 0 blocked" zero values and AT-RISK uppercase pill — semantic color on non-actionable zeros; render zeros neutral.

---

ROUTE: /incident-hub/board
STATE: OK
SCORE: 74/100 GRADE: C (was 57) HARDFAILS: HF1 — AvatarGroup facepile initials "AA" render at 10px (4 instances, board toolbar); also 11px "Archived"/"137" rail at floor
CATEGORY: A:18/20 B:12/20 C:11/15 D:10/15 E:8/10 F:8/10 G:4/5 H:3/5
VERDICT: NOT-YET
- B2/HF1: 7 distinct font sizes (10,11,12,13,14,18,22) — kill the 10px avatar initials (use ≥size-small w/ 11px+ or tooltip-only) and collapse 13→12/14 (-5 pts + HF cap)
- D3/E3: empty "IN PROGRESS 0" column is bare text with a zero badge — needs icon + guidance + drop the "0" (-5 pts)
- B3/H1: 5 text colors (>3 levels) and 5 control radii (3,4,6,8,10) — consolidate to text/subtle/subtlest and one radius per component class (-4 pts)

Notes: hues 4 (≤6, HF2 clear), no h-scroll (HF5 clear), content fills viewport (D1 pass under v2.1 gate — column counts 14/1/0 shown), single bold CTA. Off-grid spacing residue: 6/10/20px. Probe metrics from /incident-hub/board live DOM, signed-in.

---

ROUTE: /incident-hub/analytics
STATE: OK
SCORE: 73/100 GRADE: C (was 63) HARDFAILS: none
CATEGORY: A:17/20 B:10/20 C:12/15 D:11/15 E:9/10 F:7/10 G:4/5 H:3/5
VERDICT: NOT-YET

- B1/B2/B3 (-10): 35 visible text nodes at 11px (below 12px metadata floor, one notch above HF1), 5 distinct font sizes {11,12,13,14,22}, 7 text colors on copy (limit 3) — chart axis/labels and KPI captions need uplift to 12px+ and consolidated color levels.
- A5/A3 (-3): semantic red on passive "SLA Breach Rate 100%" KPI and red/orange severity bars are decorative-semantic; move to subtle-bg lozenge treatment.
- H1 + D1 (-4): 6 border radii {2,3,4,6,8,50} across one view; lower-right quadrant empty below Status Distribution — third chart row or wider grid would balance density (data volume could fill it).

Improvements since baseline: hues 5 (≤6, was >8 class), no h-scroll, off-grid spacing down to {6,20}, empty KPIs render honest dashes, single bold CTA.

---

ROUTE: /incident-hub/committee-queue
STATE: EMPTY (loads OK; "All clear" empty state, 0 rows)
SCORE: 81/100 GRADE: B (was 61) HARDFAILS: none
CATEGORY: A:18/20 B:16/20 C:11/15 D:11/15 E:10/10 F:8/10 G:4/5 H:3/5

Metrics: fontSizes {11:11, 12:1, 14:18, 22:1} — nothing <11px, no HF1. Hues 4 (0/90/150/210) — no HF2. hasHScroll false — no HF5. D1 gated per v2.1: 0 rows cannot fill viewport, judged on empty-state guidance (icon + value prop present).

VERDICT: CERTIFIED (81, no hard-fails)

Remaining losses for a future polish pass:
- B: 11 elements at 11px (column headers/meta) sit below the 12px metadata floor (-2); 5 distinct text colors vs 3 allowed (-2)
- C+H: off-grid spacing values 6px and 20px; 4 control radii (3/4/6/8) instead of one per component class (-5 combined)
- D3: empty state lacks a primary CTA / next-step action ("Create request" or link) (-2); no footer count

---

ROUTE: /tasks
STATE: OK (redirects to /tasks/overview — Tasks Dashboard)
SCORE: 71/100 GRADE: C (was 64) HARDFAILS: none
CATEGORY: A:18/20 B:10/20 C:11/15 D:9/15 E:8/10 F:8/10 G:4/5 H:3/5
VERDICT: NOT-YET
- B (-10): 6 distinct font sizes (11,12,14,17,22,24 — limit 4) and 7 text colors (limit 3); 9 elements at 11px sit below the 12px metadata floor (no HF, but B1 bleed).
- D (-6): thin-data gate applied (2 tasks total, contentBottom 100% — D1 passes), but zero-count widgets (Overdue, Blocked) collapse to bare header + "0" badge with no guidance/CTA (D3), and no next-step affordance replaces the empty table.
- E3/H1 (-4): redundant "0" badges on two widget headers; radius spread 3/4/6/8 across sibling cards/controls — collapse to one per component class.

Probe JSON: hues=4 (30/90/150/210), offGrid=[6,10,20], radii=[3,4,6,8,50], rowsVisible=0, hasHScroll=false.