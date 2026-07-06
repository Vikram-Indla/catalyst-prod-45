# MASTER AUDIT REPORT — CAT-AUDIT-FULLSWEEP-20260703-001

Date: 2026-07-03 · Branch: main · Mode: audit-only (zero code changes)
Detail lives in `lanes/LANE-01…14`. This report consolidates.

---

## 1. Executive Summary

Catalyst has strong governance *architecture* (CRE Grids A–I, three ratchet gates, canonical component layer) but the enforcement chain is broken at the root: **CI has been dead since 2026-05-16** (every run fails at `npm install`; all gates silently skipped on every merge to main). Beneath that: the "0 hardcoded colors" baseline is an artifact of a scanner that whitelists banned `var(--ds-*, #hex)` fallbacks (2,304 hidden); 7,383 Tailwind color utilities and 12,183 typography literals persist; three parallel overlay systems coexist with 99 hand-rolled modals having zero focus traps; ~40 Create dialogs bypass CRE gating; dark mode survives only via a load-bearing global CSS patch layer over a three-writer `data-theme` race; and a live API key is committed in `.mcp.json`.

**235 clustered issues** (4+ Critical, 68+ High) backed by **~40,000 enumerated occurrence-lines** (overlap across lanes; conservatively >25,000 distinct). UI/design/ADS/typography clusters alone: 126 issues / >30,000 occurrences — both scale targets exceeded without inventing anything.

## 2. Repo Status and Safety Check

- `main` @ 8c4ee056c, origin `Vikram-Indla/catalyst-prod-45`. No stashes.
- Working tree: only this feature folder + one pre-existing foreign docs modification (untouched).
- No code, config, baseline, or DB was modified. No builds/dev-server runs (sync-deps mutation risk). No Supabase contact.

## 3. /CRE Rule Inventory

Grids A–I inventoried in full in the plan-mode discovery and LANE-01: A Module Ownership (A1–A14), B Hierarchy (B1–B13), C Links (C1–C10), D Creation Rights (D1–D7), E Hub UI Patterns (E1–E5), F Slug/URL (F1–F6), G Avatar (G1–G5), H Row Typography (H1–H3), I Backlog Eligibility (I1–I2). Source: `src/lib/catalyst-rules/RULE_TABLE.md` + `CatalystRules.ts`. Enforcement: 6 runtime chokepoints, `cre-chokepoint-gate.cjs`, ADS ratchets, avatar ESLint ban. Under-enforced (code-review only): E5, F1, F3, H2 — all four now have measured violation universes (LANE-01).

## 4. Audit Methodology

14 independent lanes (below), static + tooling probes, every finding evidence-backed (file:line or command output), clustered issues + enumerated appendices, collision-free ID ranges CAT-AUDIT-0001–1299. Runtime browser probes (light/dark screenshots, heap snapshots) deferred — no confirmed test login; catalyst-storybook/supabase MCP unauthorized (09_DECISIONS D-002). That pass is scheduled as Validation Gate work in PR execution.

## 5. Agent/Lane Outputs

| Lane | File | Issues | Occurrences | Headline |
|---|---|---|---|---|
| 1 CRE | LANE-01 | 20 | 694 | 36 UUID params, 109 raw-UUID navigations, CatalystPageHeader on 38 hub pages, lint:cre blind to grids |
| 2 Light/tokens | LANE-02 | 14 | ~5,300 | Color gate "0" is scanner illusion; 2,304 banned hex fallbacks; 3,228 raw rgb/rgba |
| 3 Dark | LANE-03 | 10 | ~2,467 | 3-writer data-theme race kills ~460 --ds dark rules; 2,005 light-locked utilities |
| 4 ADS | LANE-04 | 19 | ~13,227 | 7,383 Tailwind color utils (no ratchet); shadcn 890 files; 678 files bypass ads wrapper |
| 5 Typography | LANE-05 | 16 | 12,183 | Canonical cells.tsx violates own Grid H; 5,830 fontWeight literals; ratchet at baseline, zero paydown |
| 6 Canonicalization | LANE-06 | 30 | ~640 | 10 routed work-item tables hand-rolled; releases/ tree orphaned; ReleaseDetailPage shipped twice |
| 7 Overlays | LANE-07 | 16 | ~600 | 99 hand-rolled overlays, 0 focus traps; ~40 ungated Create dialogs; Enter-confirms-delete |
| 8 Performance | LANE-08 | 12 | n/a | vendor-atlaskit fusion nullifies editor lazy boundary; gcTime<staleTime; virtualization never enabled |
| 9 Dead code | LANE-09 | 12 | ~6,000 | 5,867 unused exports; 69 unrouted pages; 1MB fuse_hidden junk; modules-dormant is LIVE |
| 10 Tests/QA | LANE-10 | 9 | 418 routes | **CI dead since 2026-05-16**; 7 zero-test hubs; assertions swallowed |
| 11 Git/CI | LANE-11 | 11 | ~30 | Live API key in .mcp.json; 183 tsc errors; no lockfile; 13 " 2." dupes; 14MB dumps |
| 12 Cross-surface | LANE-12 | 21 | ~100 | 3 header systems; 65 toolbar/filter implementations; incident adapter pattern un-adopted |
| 13 A11y | LANE-13 | 12 | 1,982 | 683 keyboard-dead clickables; 38 no-Escape overlays; lint:accessibility script missing |
| 14 Zero-assumption | LANE-14 | 33 | 666+ | Banned `|| 'Epic'` verbatim; For-You feed fabricates priority/status/type/timestamps |
| **Total** | | **235** | **~40,000** | |

## 6. Route and Surface Inventory
~418 routes in `src/routes/FullAppRoutes.tsx` (+~30 shell/core), ~30 hub groups (Project/Product/Release/Incident/Test hubs, Admin, Enterprise, Portfolio, Ideation, Resources, For-You, Chat, Knowledge…). Full map in plan-mode discovery + LANE-12. 240 lazy vs 9 eager page imports (healthy). 69 page files unrouted (LANE-09).

## 7. Component Inventory
122 component subdirectories, ~3,182 tsx files. Canonical layer: JiraTable (111 importers), statusPalette.ts, CatalystAvatar (85), CatalystDetailPanel, ProjectPageHeader. Competing layers: shadcn ui/ (51 files, 890 importers, 2,647 imports), ads/ wrappers (34 files, under-adopted), ~20 avatar impls, 65 toolbar/filter impls. Registries stale since 2026-05-17/18 (LANE-04/06).

## 8. Dialog/Drawer/Modal Inventory
436 overlay files: shadcn/Radix 185 files (194 consumers), @atlaskit/modal-dialog 71 (123 consumers), hand-rolled fixed-div 99. Two migration shims nearly unadopted; "AtlassianModal" is a mislabeled Radix shim claiming focus management it doesn't implement. Full classified list: LANE-07 appendix.

## 9. Light Mode Findings
LANE-02: gate illusion (0100), 2,304 banned hex fallbacks, 3,228 raw rgb/rgba lines (worst: capacity Timeline.module.css 113), 313 escape hatches (143 sharing one copy-paste false justification, 48 with none), 80 named-color styles, dead Finder-dupe theme files with hex.

## 10. Dark Mode Findings
LANE-03: data-theme 3-writer race (0200, High), 2,005 light-locked utilities ≈1,000 without dark: variant (0203, Critical mass), load-bearing `.dark *` substring-selector patch layer in index.css (0204), first-visit dark-OS flash (0201), Supabase toggle race + no cross-tab sync (0202). 19 `backgroundColor:'white'` chart tooltips break dark (LANE-02/0107).

## 11. ADS Compliance Findings
LANE-04: 7,383 Tailwind color utils — heatmap components 3,853 / modules 2,421 / pages 625; worst file DefectDetailPage.tsx (130). shadcn→Atlaskit migration matrix sized per primitive (button 586 files … ). 678 files direct-import @atlaskit bypassing wrappers; @atlaskit/avatar hard-ban breached in 8 files; ads-violations registry 6 weeks stale; eslint bans warn-only.

## 12. Typography Findings
LANE-05: 12,183 occurrences. Canonical Grid H reference files themselves non-compliant (0401). AllWorkView re-implements 13/20 pair as text-[13px]/leading-[20px] (0403). 5,830 numeric fontWeights, zero weight tokens (0407). 823 raw h1–h6 vs 33 @atlaskit/heading files (0408). audit:ads typography exactly at baseline 1,658 — never paid down.

## 13. Performance Findings
LANE-08: vendor-atlaskit chunk fusion (0701 Critical) — editor+renderer+UI in one chunk, React.lazy boundary nullified; split path validated against documented Emotion constraint. gcTime 5min < staleTime 15min (0702) — fresh-cache eviction, 30-day persistence voided. Persister sync-stringifies full cache ≤1×/sec (0703). Virtualization shipped-but-never-enabled (0704). JiraTable rows unmemoized, per-cell `.find()` on hover/drag (0705).

## 14. Bundle and Heap Findings
Included in LANE-08: ~46MB unminified vendor-atlaskit; export libs mostly dynamic (2 stragglers); index.css 277KB with duplicated patch blocks; no bundle analyzer or size tracking in CI (LANE-11 gap).

## 15. Dead Code and Garbage Findings
LANE-09: 35 tracked `.fuse_hidden*` files (1.06MB); src/pages/dev ×10; 69/453 unrouted page files; 5,867 unused exports (ts-prune, 4,954 excl. stories); 23+14 depcheck-unused deps (13 high-confidence); 30/41 unreferenced scripts; 2 dead feature flags; orphaned `src/pages/releases/` tree (LANE-06/0516). **Booby trap: `src/modules-dormant/` is LIVE ideation code — never delete.** `src/_graveyard/` doesn't exist. LANE-11 adds: 13 macOS " 2." duplicates (incl. src source files), 14MB committed audit dumps, icons.zip, bun lockfiles.

## 16. Accessibility Findings
LANE-13: 683 keyboard-dead clickable divs/spans (429 files) — Critical; 38 hand-rolled overlays without Escape, 31 without focus management — Critical; 588 unlabeled raw inputs (upper bound); 28 nameless icon buttons; 348 unlabeled inline SVGs; 41 gray-on-gray contrast pairs; `npm run lint:accessibility` broken (script file missing). Clean: no positive tabIndex.

## 17. Cross-Surface Consistency Findings
LANE-12 matrix (6 dimensions): 3 header systems (Project Hub internally split 13v8); table impls diverge per hub (ForYouTable 31K hand-rolled; RisksGridPage all-shadcn); empty/loading/error handling inconsistent; 65 toolbar/filter files + a diverged 12K CSS fork; recommended standard per dimension named with evidence — IncidentListPage BacklogPage+adapter is the proven model to replicate (Risks, Product Ideas, For You).

## 18. Git and Repo Standards Findings
LANE-11: **live TestSprite API key committed** (`.mcp.json` + `.mcp 2.json`) — rotate + purge (1006, High/security). 183 live tsc errors incl. committed syntax breakage (CapacityHeatmap.tsx missing braces; icon-registry.ts JSX-in-.ts = 150 errors) (1005). No package-lock.json; CI `npm install` unreproducible (1000). tsc/eslint continue-on-error with no ratchet (1001/1004). Branch hygiene clean; commit convention 85% compliant. LANE-10: **CI workflow entirely red since 2026-05-16** — the single highest-leverage fix in the repo.

## 19. Total Issue Count by Category
CRE 20 · Light/tokens 14 · Dark 10 · ADS 19 · Typography 16 · Canonicalization 30 · Overlays 16 · Performance 12 · Dead code 12 · Tests/QA 9 · Git/CI 11 · Cross-surface 21 · A11y 12 · Zero-assumption 33 = **235 clustered issues**; **~40,000 enumerated occurrences** (inter-lane overlap; >25,000 distinct conservative). UI/design/ADS/typography clusters: 126 / >30,000 occurrences.

## 20. Total Issue Count by Severity
Tolerant tally across lane files: **Critical 4+** (CI-dead 0901-class, Tailwind color mass 0310/0203, vendor-atlaskit fusion 0701, keyboard-dead clickables 1151, no-focus-trap overlays 1156 — several lanes encode severity in tables, so treat as ≥6 Critical) · **High 68+** · **Medium 98+** · **Low 32+**.

## 21. Top 50 Highest Priority Issues
Ranked; full details in lane files.
1. 0901 CI dead since 2026-05-16 — all gates skipped (LANE-10)
2. 1006 Live API key committed in .mcp.json (LANE-11)
3. 1005 183 committed tsc errors incl. syntax-broken shipped components (LANE-11)
4. 0100 Color gate reports clean while whitelisting banned hex fallbacks — 2,304 hidden (LANE-02)
5. 0200 data-theme three-writer race killing ~460 dark tokens (LANE-03)
6. 1151 683 keyboard-dead clickable elements (LANE-13)
7. 1156 38 overlays with no Escape; 31 no focus mgmt; 0/99 focus traps (LANE-13/07)
8. 0310 7,383 Tailwind color utilities, no dedicated ratchet (LANE-04)
9. 0203 ~1,000 light-locked utilities without dark: variant (LANE-03)
10. 0701 vendor-atlaskit fusion nullifies editor lazy boundary (LANE-08)
11. L7 CRE bypass: ~40 Create dialogs insert work items ungated (LANE-07)
12. 0004 109 raw-UUID navigate() call sites (Grid F3) (LANE-01)
13. 0001/0002 42 UUID route params (Grid F1) (LANE-01)
14. 0500–0509 10 routed work-item surfaces on hand-rolled tables (LANE-06)
15. 0009–0013 CatalystPageHeader on 38 hub pages (Grid E3) (LANE-01)
16. 0702 gcTime<staleTime cache inversion (LANE-08)
17. 1250s CatalystParentLinker `parent_issue_type || "Epic"` verbatim banned pattern (LANE-14)
18. useForYouData fabricates priority/status/type/timestamps feed-wide (LANE-14)
19. 0516 Orphaned src/pages/releases/ tree shadowing live hub (LANE-06)
20. 0517 ReleaseDetailPage double-shipped on two live routes (LANE-06)
21. 0514 Dual modal systems, Radix outnumbers canonical (LANE-06)
22. 0104 143 false/copy-paste escape-hatch justifications + 48 undocumented (LANE-02)
23. 0401 Grid H canonical files violate Grid H (LANE-05)
24. 0403 AllWorkView re-implements canonical row typography in Tailwind (LANE-05)
25. 0704 Virtualization built, zero call sites (LANE-08)
26. 0705 Unmemoized table rows, per-cell find() (LANE-08)
27. 0103 3,228 raw rgb()/rgba() lines (LANE-02)
28. 0107 19 white chart tooltips broken in dark (LANE-02)
29. 1000 No lockfile; npm install in CI (LANE-11)
30. 1001/1004 tsc/eslint continue-on-error, no ratchet (LANE-11)
31. 0300 shadcn 890 files / 2,647 imports migration debt (LANE-04)
32. 0312 678 files bypass ads wrapper (LANE-04)
33. 0311 @atlaskit/avatar ban breached in 8 files (LANE-01/04)
34. 0313 153 files raw <table> (212 occurrences) (LANE-04)
35. 0407 5,830 fontWeight literals, zero tokens (LANE-05)
36. 0408 823 raw headings vs Atlaskit heading (LANE-05)
37. 1050 Three page-header systems (LANE-12)
38. 1054 ForYouTable 31K hand-rolled table (LANE-12)
39. 1053 RisksGridPage fully shadcn (LANE-12)
40. 1065/1066 65 toolbar impls + 12K CSS fork (LANE-12)
41. Destructive dialogs: Enter-confirms-delete; primary-blue Delete; unstyled confirm stub (LANE-07)
42. 53 overlay width literals >600px, mobile reflow (LANE-07)
43. 1157 588 unlabeled inputs (LANE-13)
44. 1150 lint:accessibility script missing (LANE-13)
45. 0902-class vitest --passWithNoTests + broken local runner (LANE-10)
46. 7 hubs with zero tests; 418 routes zero smoke (LANE-10)
47. 0801 1.06MB fuse_hidden junk tracked (LANE-09)
48. 0805 69 unrouted page files (LANE-09)
49. 0809 13 high-confidence unused deps (LANE-09)
50. 0020 lint:cre passes while grids violated — gate scope gap (LANE-01)

## 22. Safe Fix Clusters
(a) CI resurrection + lockfile + gate re-arm (no product code); (b) delete-verified junk: fuse_hidden, " 2." dupes, audit dumps, pages/dev, dead theme dupes, dead ui/breadcrumb (import-graph verified); (c) mechanical token swaps in leaf components (hex fallback→token-only, named colors); (d) React Query gcTime/staleTime + persister throttle (config-level, testable); (e) enable virtualization behind per-table flag; (f) zero-assumption `?? null` fixes at mapping layer (behavior-preserving for known data); (g) escape-hatch re-documentation.

## 23. Risky Fix Clusters
(a) data-theme writer consolidation (whole-app theming blast radius); (b) vendor-atlaskit chunk split (documented Emotion closure failure — needs isolated build verification); (c) shadcn→Atlaskit component migrations (890 files — must go surface-by-surface with screenshots); (d) hand-rolled table→JiraTable migrations (data/interaction parity); (e) overlay system consolidation (focus/keyboard semantics change); (f) index.css patch-layer removal (load-bearing — only after utility co-variants land); (g) dead-page/route removals flagged NEEDS-REVIEW; (h) orphaned releases/ tree deletion (verify zero deep links first).

## 24. Multi-PR Execution Plan

**Revised 2026-07-03 (D-005, D-006):** security/compliance-hygiene items descoped; build/CI repair,
git hygiene, and security are pushed to the bottom of the queue per user instruction ("deprioritize
0,11,12"). Order below is sorted purely by functional correctness and code health.

**Caveat (logged, not a blocker):** CI stays red (CAT-AUDIT-0901, dead since 2026-05-16) through
PRs 1–9 below since its repair is now last. Each of those PRs is still validated — just manually:
`npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`, targeted `vitest run <file>` where the
runner works, DOM/API probes, and screenshots per CLAUDE.md, run directly rather than via CI. Full
CI-gated validation resumes once the build-repair PR lands.

PR 1 — **Zero-assumption data correctness** — fix fabricated-default bugs (CAT-AUDIT-1250s): the
For-You feed inventing priority/status/type/timestamps, `CatalystParentLinker` rendering `|| "Epic"`
as fact, release target-date fabrication. User-facing lies about real data — functional bugs.
PR 2 — **Dead code / orphaned surfaces (verified safe-delete only)** — 1.06MB fuse_hidden junk,
duplicate ReleaseDetailPage (shipped twice on live routes), orphaned `src/pages/releases/` tree
(pending zero-deep-link verification), dead theme file duplicates. Reduces surface area before
touching anything else.
PR 3 — **Component canonicalization, tables** — 10 routed work-item surfaces on hand-rolled
`<table>` → JiraTable (one surface per slice) — functional/data-parity risk if skipped, not just style.
PR 4 — **Performance** — React Query gcTime/staleTime inversion fix, enable existing virtualization
(currently built but never turned on), row memoization on JiraTable/BacklogTable, vendor-atlaskit
chunk split (isolated slice given the documented Emotion-closure constraint).
PR 5 — **Overlay functional hardening** — CRE-gate the ~40 ungated Create dialogs (functional
correctness: these currently bypass module/type rules), fix the Enter-confirms-delete dialog and
other destructive-action defects, add Escape/focus-trap to the worst-17 hand-rolled overlays.
PR 6 — **Cross-surface consistency** — replicate the proven IncidentListPage adapter pattern to
Risks/Product-Ideas/For-You; unify the 3 competing page-header systems.
PR 7 — **Accessibility functional fixes** — 683 keyboard-dead clickables, unlabeled inputs/icon
buttons — these break real keyboard/screen-reader usage, not just compliance scoring.
PR 8 — **Dark mode correctness** — fix the 3-writer `data-theme` race (actual runtime bug), then
add `dark:` co-variants for the light-locked utilities; retire the index.css patch layer last.
PR 9 — **Test coverage** — route smoke matrix, fix assertion-swallowing tests, cover the 7
zero-test hubs.
PR 10 — **ADS/token/typography compliance** — color-fallback scanner fix, Tailwind color-utility
paydown, typography drift, shadcn→Atlaskit migration. Design-system optics, lowest functional risk
if deferred.
PR 11 (was PR 0) — **Build/CI functional repair** — fix the `npm install` failure, add
package-lock.json, fix the 183 tsc errors' root files (CapacityHeatmap.tsx missing braces,
icon-registry.ts JSX-in-.ts, SortableColumn.tsx multi-root JSX). Deprioritized per D-006; land
whenever the user wants CI green again.
PR 12 (was PR 11) — **Git/repo hygiene** — lockfile discipline, " 2." duplicate cleanup, committed
dumps, branch/PR conventions.
PR 13 (was PR 12) — **Security remediation (on request)** — API key rotation/purge. Parked per
D-005; execute whenever the user asks for it explicitly.

Every PR: ≤2h slices, explicit file list, single-revert rollback, baselines only ratchet down.

## 25. Regression Test Plan
Per LANE-10 proposal: minimum route-smoke matrix (1 route per hub × light+dark), dialog interaction checks on touched overlays, axe pass on touched surfaces, JiraTable parity probes (sort/filter/inline-edit) for table migrations, DOM/API probes for functionality + screenshots for acceptance (per CLAUDE.md), `verify:sw-chunks` after any chunk change.

## 26. CI Validation Plan
Gate order per PR: git status clean-scope → lint → tsc (ratcheted) → lint:colors:gate (fixed scanner) → audit:ads:gate → lint:cre → new tailwind-color gate → build → route smoke → visual/a11y on touched surfaces → bundle-size diff. CI must be green-and-meaningful (PR 0) before any of this counts.

## 27. Required User Decisions
1. Approve PR 0 (CI resurrection + key rotation) as the first executed change.
2. Scanner fix in PR 1 will expose ~2,304 currently-hidden violations — approve baseline reset to honest numbers (ratchet-down from there).
3. `src/pages/releases/` orphan tree + 69 unrouted pages: approve deletion review batch or park.
4. Test login for localhost:8080 runtime screenshot pass (deferred lane) — provide when convenient.
5. Confirm PR 4/5 migration order (tables-first recommended).

## 28. Explicit Consent Gate
Audit executed and consolidated; fix planning prepared. NO code changed. Per-PR approval required before any fix lands — see final session message for the gate.
