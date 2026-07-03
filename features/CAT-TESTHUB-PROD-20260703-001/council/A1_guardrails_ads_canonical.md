# A1 — Guardrails: ADS Token Archaeologist + Canonical Component Enforcer

Feature: CAT-TESTHUB-PROD-20260703-001 · Advanced Council v3 · 2026-07-03
Inputs: discovery/08, /11, /01, /05 (deep); gaps G01, G04, G07, G10, G11, G12 (deep); all others skimmed.
Verified directly in src/ this session (do not re-litigate):
- `src/styles/testhub.css` orphan CONFIRMED — `grep -rln "testhub.css" src/ index.html` → zero hits. Delete is safe pending a Storybook/dynamic-import re-check at implementation time (UXD-004).
- `scripts/no-hardcoded-colors.cjs` fallback hole CONFIRMED — `isAllowedUsage()` (~line 103) comments "fallback-pragmatic mode per prompts 3" and allows `var(--ds-*, #hex)` / `var(--ds-*, rgba())`, directly contradicting the file's own banner comment at lines 53-55 AND CLAUDE.md. UXD-001 is real.
- `scripts/cre-chokepoint-gate.cjs` has ZERO TestHub entries — `grep -n "TESTHUB\|testhub"` → 0 matches. ADM-028 is real.
- `src/components/shared/rich-text/CatalystRichTextEditor.tsx` is a NEUTERED TOMBSTONE — exports `never` types, header says "DEPRECATED (2026-04-20)… Atlaskit (@atlaskit/editor-core + @atlaskit/renderer) is now the single canonical rich-text surface." Any plan citing it will not compile. See VETO-1.

**Overall verdict: GO with 8 vetoes and 4 mandatory enforcement additions.** The gap shards are directionally correct; two of them cite a dead component, and three proposed fixes would launder debt into new hand-rolled UI unless pinned to canonicals below.

---

## 1. Enforcement additions (mandatory, land in P1 alongside the sweep — not after)

| # | Addition | Detail | Verdict |
|---|---|---|---|
| E1 | **TestHub-scoped zero-baseline ratchet** (`lint:colors:testhub`) | New npm script scanning `src/pages/testhub`, `src/components/testhub`, `src/components/test-cycles`, `src/components/test-plans`, `src/features/test-cycles` in STRICT mode (no fallback-pragmatic allowance): hex, rgba/hsl incl. `var(--ds-*, rgba())` fallbacks, AND Tailwind color utils. Baseline = 0. Wire into `.husky/pre-commit` + `ci.yml` in the same slice the P1 color sweep completes. | ADOPT (UXD-003, extended to cover Tailwind) |
| E2 | **Fix the global scanner lie** | `no-hardcoded-colors.cjs isAllowedUsage()` allows what CLAUDE.md bans. Minimum: strip the `var(--ds-*, color)` allowance for the E1 paths; preferred: remove it globally and re-baseline `design-governance/color-baseline.json` once (counts go UP one time, ratchet resumes). Align the line-103 comment with the law. | ADOPT (UXD-001) |
| E3 | **audit:ads per-path breakdown** | Extend `scripts/ads-audit-gate.cjs` with per-path counts so TestHub's 95 Tailwind hits are individually ratcheted, not absorbed in global baseline noise. | ADOPT (UXD-002) |
| E4 | **lint:cre extension** | Register every revamped TestHub create/link surface (CaseDrawer, CyclesPage create modal, set-add dialogs, defect-create entry) in `cre-chokepoint-gate.cjs` CHECKS; route type catalogues through `filterCreatableTypes(types,'TESTHUB')`. Fix ADM-029 (BacklogPage `moduleCode` prop, default 'TEAM', pass 'TESTHUB' from useDefectsSource). ADM-030 `EXTRA_CREATE_RIGHTS.TESTHUB` ONLY if Plan Lock scopes create-story-from-requirement; extend the map, never bypass the filter (project memory). | ADOPT (ADM-028/029; ADM-030 conditional) |

Token-existence rule for the sweep: three tokens proposed in the shards are UNVERIFIED in this ADS version — `--ds-border-information`, `--ds-border-success`, `--ds-icon-warning`. Probe each in `@atlaskit/tokens` before writing; if absent use `--ds-border-brand` / `--ds-border` / `--ds-text-warning`. No unprobed token names in committed code.

## 2. Canonical component verdict table (every proposed UI element)

| Element (gap refs) | Canonical | Verdict |
|---|---|---|
| Work-item tables (UXL-004/005/006, V1-V4) | `shared/JiraTable` + prefab cells | **USE** — mandatory; plan in §3 |
| Traceability matrix | `shared/dynamic-table/DynamicTable.tsx` (24.7K one, NOT `ads/DynamicTable.tsx`) | **USE** — matrix is legitimately non-JiraTable; document the choice in Plan Lock |
| Folder tree (UXL-046) | none — `@atlaskit/tree` deprecated/not installed; only Tier-5 one-offs | **MISSING → Vikram approval required.** Build ONE shared `FolderTree` (pragmatic-drag-and-drop + lazy load), ship audit-grade story, delete AddTestCasesToCycleDialog/FolderTree + RepositoryPage one-off. This is the single sanctioned hand-roll of the feature |
| Split view / 3-pane repository (UXL-060) | only shadcn `ui/resizable.tsx` (react-resizable-panels) | **DECISION REQUIRED** — approve resizable as a documented shadcn exception OR compose `RightDetailsPanel`/`CatalystViewBase` panel mode. Do not silently import ui/* |
| Drawer (UXL-008, V5) | `ads/CatalystDrawer` / `CatalystDetailRouter` `entityKind='test_case'` short-circuit | **USE** — delete portal drawer, zIndex 8000 hack, manual Escape |
| Modals (UXL-010, V6) | `ads/Modal.tsx` (@atlaskit/modal-dialog); destructive = `shared/DangerConfirmModal` | **USE** |
| Kebab/row menus (UXL-011, V7) | JiraTable `makeRowActionsCell` / `@atlaskit/dropdown-menu` | **USE** |
| Tabs | `@atlaskit/tabs` direct (unbanned) | **USE** — never `ui/tabs.tsx` |
| Status pills / .th-badge-* (UXD-039–042, UXD-052) | `shared/StatusLozenge` for statuses; `@atlaskit/lozenge` appearance map for case type; `@atlaskit/tag` for labels | **USE** — delete testhub.css (dead) + delete `AddTestCasesToCycleDialog/utils.ts:91-119` color maps (UXD-010). Define the appearance map ONCE in Plan Lock component table |
| Rich text (TD-006/007, G01) | `shared/AtlaskitEditor.tsx` or `shared/rich-text/atlaskit/AdfDescriptionField.tsx` (editor-core, ADF round-trip) + `shared/AtlaskitRenderer` | **USE — but see VETO-1**: the shards name the dead `CatalystRichTextEditor`. Zero new tiptap/`jira-description-editor` imports |
| Step editor 3-col grid (TD-004/005) | `@atlaskit/form` fields + `@atlaskit/pragmatic-drag-and-drop` row handles; per-cell inline commit | **EXTEND** — form-layout composition, not a hand-rolled table; if it renders as a table it must be JiraTable |
| Date fields | `shared/CatalystDueDateField` / `@atlaskit/datetime-picker`; in-table `makeDateEditCell` | **USE** |
| Selects / people | `ads/Select`, `ads/ProfilePicker`, `@atlaskit/user-picker` | **USE** |
| Comments (UXL-050) | `shared/CommentsSection` / catalyst-ds Comment family + tm_comments adapter | **EXTEND** (adapter only) |
| Charts (G07) | `testhub/reports/charts/ReportChart` + report-registry | **USE** — additive registry entries only; shipped bodies are REUSE-frozen |
| Flags/toasts | `shared/JiraTable/flags.tsx` `showFlag` | **USE** — no sonner in new files |
| Empty states | `ads/EmptyState` | **USE** |
| Calendar suite (UXD-015–020) | keep structure; tokens only: roots `var(--ds-surface)`, panel `var(--ds-surface-overlay)`+`var(--ds-shadow-overlay)`, segmented control → `@atlaskit/button` group, CTAs → `<Button appearance="primary">` | **USE (retheme in place)** — evaluate `@atlaskit/drawer` for DayDetailPanel |
| Execution runner shell (V14) | wrap in canonical page chrome; case pane via CatalystViewBase panel mode | **EXTEND** — bespoke two-pane layout tolerated for MVP if chrome + tokens are canonical |
| Kanban (if execution board scoped) | `kanban/PragmaticBoard` + new TestHub source adapter | **EXTEND** — never fork |
| Timeline | `shared/Timeline/TimelineView` | **USE** |
| AI CTAs (UXD-022) | `AIIntelligenceButton` (it IS an AI control) or `<Button appearance="primary">` | **USE** — gradients banned elsewhere |
| AI provenance chip (UXD-055) | `@atlaskit/lozenge` w/ `var(--ds-background-discovery)`/`var(--ds-text-discovery)` semantics | **USE** — define once in Plan Lock |
| Bulk actions bar (audit §1e) | `shared/JiraTable/BulkFooterBar` / `shared/BulkSelectionBar` | **USE — see VETO-3**, do not "rebuild on tokens" |

## 3. JiraTable adoption plan — the 4 banned tables

Pattern donor: `CyclesPage.tsx:178` (`JiraTable<TMCycle>` already proves TM typing works). Order chosen so each slice also deletes rgba-fallback sites (ratchets E1 toward 0):

1. **TestSetsPage.tsx:415-438** (CSS-grid fake table) → `JiraTable<TMTestSet>` with `makeCheckboxCell/makeKeyCell/makeSummaryCell/makeDateCell/makeRowActionsCell`. Kills the portal kebab (V7) and 6 inline rgba-fallback sites (:193,198,204,210,328,447). 1 slice.
2. **SetDetailPage.tsx:600 + :663** (two raw `<table>`s) → two JiraTable instances sharing column defs; hand-rolled modals (:151,:324) → `ads/Modal` in the same slice (they share the file). 1–2 slices.
3. **CycleDetailPage.tsx:423** (raw scope `<table>`, checkbox th :427) → `JiraTable<TMTestCase>` + `makeStatusCell`; pairs with UXL-008 drawer deletion (:636-645). 1–2 slices.
4. **defects/DefectsPage.tsx:370-379** → **DELETE the file** (orphan, unrouted, "move not copy"); do NOT port its grid to JiraTable. Confirm only `pages/testhub/DefectsPage.tsx` stays routed. 0.5 slice.

## 4. ADS-debt risk ruling on proposed gap fixes

- **LOW risk / endorse as written:** all UXD token swaps (one token both themes, delete `dark:` twins), UXD-004 testhub.css deletion, UXD-010 map deletion, ADM-051 (SectionMessage), UXL-016 fallback strip, RPT rows (additive registry entries, hooks-only error fix per silent-query-error-sweep).
- **MEDIUM:** TD-004 step grid ("JiraTable-style rows or ADS grid" is an invitation to hand-roll — pinned in §2); calendar segmented control (must be atlaskit Button group, not repainted divs); CoverageRing (threshold→semantic-token mapping is allowed, threshold→class-string map is not).
- **HIGH / veto-gated:** VETO-1/2/3 below. Also: every "fix" that writes a token with a fallback re-adds the exact debt being removed — E1 strict mode is the backstop, which is why it must land in the same phase, not after.

## 5. VETO LIST

- **VETO-1 — G01 TD-006/TD-007 as written.** `CatalystRichTextEditor` is a `never`-typed tombstone (file header, verified). Replace with the editor-core ADF path (`AtlaskitEditor` / `AdfDescriptionField` + `AtlaskitRenderer`). Corollary: those rows target dormant `*_html` columns, but the canonical editor is ADF-native — prefer adding `*_adf` columns to tm_test_steps/tm_test_cases (exact precedent: tm_defects `*_adf`, commit 663607f70) with plain-text mirror for search, over an HTML transformer round-trip. Schema decision for Plan Lock.
- **VETO-2 — any new `dark:` Tailwind twins or per-theme override CSS.** The 540-line testhub.css dark block is the corpse of that approach. One semantic token, both themes; a fix that adds a `dark:` class is rejected in review.
- **VETO-3 — "rebuild BulkActionsBar on tokens" (audit §1e).** Retheming a hand-rolled floating bar still violates the hand-rolled ban. Use `BulkFooterBar`/`BulkSelectionBar`.
- **VETO-4 — any new import from `src/components/ui/*` in TestHub files** except the two pending-decision exceptions (`resizable`, `catalyst-date-picker`) and only WITH recorded approval. AIGenerateTestCasesDialog rebuild (V8) goes to @atlaskit/modal-dialog + primitives.
- **VETO-5 — shared FolderTree without explicit Vikram approval + audit-grade story.** It is the only sanctioned hand-roll; scope it as its own approval line in Plan Lock, not buried in a slice.
- **VETO-6 — any tiptap / `jira-description-editor` / detail-view Description-extension import in new TestHub files.** Re-opens the prosemirror Selection.jsonID collision documented in the tombstone header. Add a grep check to the review checklist.
- **VETO-7 — unprobed token names** (`--ds-border-information`, `--ds-border-success`, `--ds-icon-warning`, any `--ds-*-hovered` variant not in the CLAUDE.md table) committed without an existence probe against `@atlaskit/tokens`.
- **VETO-8 — touching the 26 shipped report bodies.** Reports are REUSE-frozen per feature constraint; RPT fixes are hook-level or additive registry entries only. RPT-025 (RPC swap inside useRealTestReportData behind the same ReportData shape) is the boundary case — allowed only because bodies/ReportCanvas stay byte-identical; any body diff fails review.

## 6. Residual UNKNOWNs for Plan Lock

1. `--ds-blanket` availability for the modal scrims replacing `--ds-shadow-raised`-as-color (10 sites, audit §2a) — probe; fallback is `@atlaskit/blanket` component.
2. Storybook/dynamic-import re-verification of testhub.css orphanhood at delete time (grep clean today).
3. Whether the repository 3-pane ships MVP (drives the split-view decision) — if MVP is tree+table only, defer the resizable exception entirely.
