# FINAL CERTIFICATION (2026-07-08, wf_2e2b0838-080)

# FINAL CERTIFICATION VERDICT — Route Design Rubric v2.1

> Note on count: the union of prior-certified routes (11, of which defects + board were re-probed this wave) and this wave's 9 probes yields **18 unique routes**, not 20. All 18 are tabled below; no other route data exists in this certification record.

## 1. Final Table — All Routes

| # | Route | Module | Final Score | Hard-Fails | Status |
|---|-------|--------|------------|------------|--------|
| 1 | /project-hub/MWR/dashboard | Project Hub (MWR) | 75 | none | CERTIFIED |
| 2 | /project-hub/MWR/timeline | Project Hub (MWR) | 78 | none | CERTIFIED |
| 3 | /project-hub/MWR/sprints | Project Hub (MWR) | 79 | none | CERTIFIED |
| 4 | /project-hub/MWR/filters | Project Hub (MWR) | 79 | none | CERTIFIED |
| 5 | /project-hub/MWR/allwork | Project Hub (MWR) | 76 (was 74) | none | CERTIFIED |
| 6 | /product-hub/INV/backlog | Product Hub (INV) | 77 | none | CERTIFIED |
| 7 | /product-hub/INV/roadmap | Product Hub (INV) | 84 (was 74) | none | CERTIFIED |
| 8 | /product-hub/INV/milestones | Product Hub (INV) | 87 (was 74) | none | CERTIFIED |
| 9 | /product-hub/INV/dashboard | Product Hub (INV) | 78 (was 73) | none | CERTIFIED |
| 10 | /testhub/repository | TestHub | 79 | none | CERTIFIED |
| 11 | /testhub/cycles | TestHub | 77 | none | CERTIFIED |
| 12 | /testhub/plans | TestHub | 77 | none | CERTIFIED |
| 13 | /testhub/defects | TestHub | 87 (was 82) | none | CERTIFIED |
| 14 | /testhub/reports (→ sprint-testing-status) | TestHub | 75 (was 64) | none | CERTIFIED |
| 15 | /incident-hub/analytics | Incident Hub | 81 (was 73) | none | CERTIFIED |
| 16 | /incident-hub/board | Incident Hub | 82 (was 74) | none | CERTIFIED |
| 17 | /committee-queue | Governance | 81 | none | CERTIFIED |
| 18 | /tasks (→ /tasks/overview) | Tasks | 74 (was 71) | none | **NOT-YET** |

## 2. Overall

- **Certified: 17 / 18** (94%). Every certified route is B-band (75+) with zero hard-fails.
- Module means:
  - Project Hub (MWR): **77.4** (5 routes)
  - Product Hub (INV): **81.5** (4 routes)
  - TestHub: **79.0** (5 routes)
  - Incident Hub: **81.5** (2 routes)
  - Governance (committee-queue): **81.0** (1 route)
  - Tasks: **74.0** (1 route) — below bar
- Grand mean across 18 routes: **79.2**

## 3. NOT-YET Remediation

**/tasks (74/100, needs +1 to bar, ~+4 realistic target)**
- Gap 1 — E3 zero-badge suppression did not land: "0" badges still render on the Overdue tasks and Blocked tasks widget headers (E3 scored 0/3). Fix: suppress the count badge when count === 0 (render nothing, per zero-assumption rendering rule).
- Gap 2 — B2 typography sprawl: 6 distinct font sizes (11, 12, 14, 17, 22, 24) vs cap of 4. Fix: collapse the stray 17px into 16px or 14px scale steps.
- Gap 3 — B3 text-color sprawl: 7 text colors vs cap of 3. Fix: consolidate to `var(--ds-text)` / `var(--ds-text-subtle)` / `var(--ds-text-subtlest)`.
- Gap 4 — 8 elements at 11px sit below the 12px metadata floor (not a hard-fail at 11px, but costs B points). Fix: lift metadata text to 12px.
- Projected score after fixes: ~78 → CERTIFIED.

## 4. One-Line Verdict

**Bar not yet met: 17 of 18 non-Release routes are ≥75/B with zero hard-fails — /tasks alone remains at 74, blocked only by unshipped zero-badge suppression and typography consolidation, both cosmetic and low-effort.**

## POST-VERDICT ADDENDUM

/tasks re-certified after zero-badge fix (c90a0e3f4 amended): E3 0/3 -> 3/3, total 74 -> **77/100 CERTIFIED** (verified live, no error overlay, badges gone).

**FINAL: 18/18 probed non-Release routes >= 75/B, zero hard-fails. Grand mean 79.4. GOAL CONDITION MET.**

---

## PER-ROUTE

ROUTE: /project-hub/MWR/allwork
SCORE: 76/100 (was 74) HARDFAILS: none
CATEGORY: A:15 B:12 C:10 D:14 E:10 F:8 G:4 H:3
VERDICT: CERTIFIED — B band (75+), zero hard-fails. Metrics: min font 11px (avatar floor, HF1 clear), 4 non-neutral hues, 19 rows, content 100% viewport, no h-scroll. Top remaining loss: typography sprawl — 7 distinct font sizes (11/12/14/16/17/22/24) and 6 text colors vs rubric's 4/3 caps (B2/B3), plus 6 off-grid spacing values (6,10,19,20,64,152) and 6 radii. Consolidating the 16/17px one-offs into 14/20 scale would recover ~5 pts.

---

ROUTE: /product-hub/INV/roadmap
SCORE: 84/100 (was 74) HARDFAILS: none (min font 12px, 3 hues, no h-scroll, content 100%)
CATEGORY: A:19 B:15 C:12 D:14 E:8 F:9 G:4 H:3
VERDICT: CERTIFIED — B band. Top remaining loss: typography spread (7 font-size buckets: 12/13/14/17/24/28/48, B2) plus 4 text-color levels; secondary: quadruple-zero analytics strip ("0 / 0 of 0 / 0 Active 0 Validation") duplicating the empty state (E3), off-grid spacing 6/18/20, and 5 in-page radii (3/4/6/8/12). Note: INV roadmap rendered its empty state (0 BRs), so D1/D2 scored via the v2.1 thin-data gate — empty state itself is exemplary (icon + value prop + single bold CTA).

---

ROUTE: /product-hub/INV/milestones
SCORE: 87/100 (was 74) HARDFAILS: none
CATEGORY: A:17 B:17 C:12 D:15 E:10 F:8 G:4 H:4
VERDICT: CERTIFIED — min font now 12px, 3 sizes, 3 hues, zero-badges gone, footer count present, D1 thin-data gate passes (2 milestones, honest layout, no h-scroll). Top remaining loss: 5 text colors (B3 wants ≤3), off-grid spacing 6/10/20px, and radius sprawl (3/4/6/8px) — cosmetic, not blocking.

---

ROUTE: /product-hub/INV/dashboard
SCORE: 78/100 (was 73) HARDFAILS: none — min font 12px (HF1 cleared), 3 non-neutral hues, no h-scroll, content 100% bottom
CATEGORY: A:18 B:17 C:13 D:7 E:8 F:8 G:4 H:3
VERDICT: CERTIFIED (B-band) — top remaining loss is D: empty-state widgets ("No business requests", "Overdue", "On Hold") are bare text with no icon/CTA, and "0 need attention" zero-label survives in Release Health subtitle; secondary: 5 text-color levels (B3) and 4 control radii 3/4/6/8 (H1). Note: INV product has zero data, so D1/D2 were gated per v2.1 — density scored on empty-state guidance, which is the weak spot.

---

ROUTE: /incident-hub/analytics
SCORE: 81/100 (was 73) HARDFAILS: none — min font 12px, 5 non-neutral hues, no h-scroll, contentBottom 100%
CATEGORY: A:19 B:16 C:12 D:11 E:9 F:7 G:4 H:3
VERDICT: CERTIFIED (grade B — competitive). Top remaining loss: B3 text-color sprawl (7 distinct copy colors vs 3-level max) plus H1 radius histogram [2,3,4,6,8,50]; secondary: right column dead space below Status Distribution (~40% of content zone empty while left column stacks two chart groups).

---

ROUTE: /tasks (→ /tasks/overview)
SCORE: 74/100 (was 71) HARDFAILS: none (min font 11px, 4 hues, no h-scroll)
CATEGORY: A:18 B:12 C:11 D:11 E:7 F:8 G:4 H:3
VERDICT: NOT-YET — Typography still bleeds: 6 distinct sizes (11,12,14,17,22,24; B2 ≤4) and 7 text colors (B3 ≤3), 8 elements at 11px sitting below the 12px metadata floor; and zero-badge suppression did NOT land — "0" badges render on Overdue tasks and Blocked tasks widget headers (E3 0/3). Fix badge suppression + collapse 17px into 16/14 and recount colors to clear ~78.

---

ROUTE: /testhub/defects
SCORE: 87/100 (was 82) HARDFAILS: none — min font 11px (no <11), 4 non-neutral hues, content 100% vh, no h-scroll
CATEGORY: A:18 B:15 C:12 D:15 E:10 F:9 G:4 H:4
VERDICT: CERTIFIED — B (competitive). Top remaining loss: typography — 21 elements at 11px (lozenge/avatar text under the 12px metadata floor) and 5 text-color levels vs 3; secondary: off-grid spacing 6/10/20px and 4 control radii (3/4/6/8).

---

ROUTE: /incident-hub/board
SCORE: 82/100 (was 74) HARDFAILS: none — min font 11px (avatar initials, at floor), 4 non-neutral hues, content 100% vh, no h-scroll
CATEGORY: A:19 B:15 C:13 D:11 E:8 F:9 G:4 H:3
VERDICT: CERTIFIED (B-band). Top remaining loss: typography spread — 5 font sizes (11/12/14/18/22) and 5 text colors vs limits of 4/3; plus "IN PROGRESS 0" column count badge still renders zero, and radius histogram spans 3/4/6/8/10.

---

ROUTE: /testhub/reports (→ /sprint-testing-status)
SCORE: 75/100 (was 64) HARDFAILS: none (min font 11px, 4 hues, content 100% vh, no h-scroll)
CATEGORY: A:17/20 B:12/20 C:11/15 D:10/15 E:9/10 F:8/10 G:4/5 H:4/5
VERDICT: CERTIFIED — B band reached, zero hard-fails. Top remaining loss is typography: 7 distinct font sizes (11,12,14,16,17,22,28 — stray 17px) and 7 text colors vs the ≤4/≤3 caps (B2/B3, -7pts); secondary: off-grid spacing 6/10/14/20 and bare-text empty state in Governance mismatches.