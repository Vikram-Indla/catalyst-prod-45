# Handover — CAT-DS-TOKEN-POISON-20260710-001 (updated 2026-07-11, iteration 3)

## State
Branch `poison` in worktree `.claude/worktrees/poison` (node_modules symlinked to origin checkout; NEVER touch origin checkout's branch). Commits so far:
- b4bd6d53e Goal 1 token graph builder (scripts/token-graph/build-token-graph.mjs → design-governance/token-graph/)
- 888fd5e4f runtime customColors route removed (setGlobalTheme clean; tokens.ts = cp-name map only)
- e8b0897d6 app-authored --ds-* CSS layer removed (217→10; 10 TEMPORARY app-invented --ds-font-size-*/--ds-line-height-body live in theme-tokens.css pending typography sweep; FOUC guard in main.tsx; vite.config realpath fix)
- 9d2f062aa single-owner bridge: src/styles/catalyst-semantic-aliases.css owns 81 aliases (8 mode-divergent); selfRefs 14→0; 501 competing decls deleted

## In flight (background agents, do not duplicate)
- Sweep agent: phantom big-three + minor phantoms + legacy names (--fg-N/--text-N/--bg-N/--cp-t1..4/--cp-ink-2..4; --cp-ink-1 text+border only). Codemod in scripts/token-sweep/. Verify: phantoms 0 refs, tsc, gates, npm run build.
- Gate agent: scripts/token-gate/run-gate.mjs (R1..R10, --self-test with poisoned fixtures, npm script lint:tokens). Expected RED on current tree until sweep lands (R3/R7/R9).
Both report and leave changes UNCOMMITTED; verify (single-owner/self-test/graph/tsc/gates/build) then commit with explicit file lists.

## Remaining after in-flight slices
1. Commit sweep + gate slices (verify first; run gate agent's self-test + gate against post-sweep tree).
2. Ambiguous per-consumer sweeps (B.2 list, 21 tokens, worst-first: --cp-workstream-catalyst-primary 1216, --cp-bg-elevated 952, --cp-ink-1 bg-refs, --cp-bg-sunken 846, --cp-blue, --cp-lozenge-grey-bg, --cp-success/warning/danger, --cp-primary-60, ...). Each = own slice; delete their remaining scoped shadows (product-backlog dark block etc.) as consumers migrate.
3. Typography sweep: kill the 10 TEMPORARY --ds-font-size-* tokens (~7,970 consumers) → ADS font.body/heading/metric roles (font shorthand tokens --ds-font-body etc.); also 637 raw numeric fontSize in TS style objects (R9).
4. Hard-coded colors (R8): 1042 CSS decls + TS values → same-category ADS tokens (existing lint:colors baseline is 0 for new; the 1042 include ignored pragmas + debt counted in audit-gate tokens category 19951).
5. Wire gate: package.json lint:tokens into .husky/pre-commit + .github ci.yml (final slice, once tree is green).
6. Rendered dual-theme fixtures + computed-style + contrast assertions (token matrix page, both themes, representative routes incl. STRATA, Project Hub, Product Room, Work Hub, Tasks, Boards, Resource 360, Admin, Wiki, modals/menus) — needed for certificate; dark-lozenge + customColors-removal visual deltas must be inspected here.
7. Re-run full loop (graph+gate+fixtures) until zero findings → write signed certificate (branch, commits, before/after counts, cycles/undefined removed, files, tests, route coverage, light/dark, contrast, gate + deliberate-failure evidence, zero exceptions) → explicit PASS. Never merge; stop only at PASS on `poison`.

## Key facts
- Graph rebuild: `node scripts/token-graph/build-token-graph.mjs` (12MB graph.json is gitignored; summary.json committed).
- Build MUST be `npm run build` (8GB heap). Bare `npx vite build` OOMs.
- Discovery: 02_CANONICAL_DISCOVERY.md — B.3 bridge table, B.3-phantom replacements, B.6 legacy dispositions, B.2 ambiguous list, B.7 order. Section A (--ds-* spec) = summary appended at end.
- undefinedRefOccurrences rose to 4080 after slice 4 (inert fallback debris; sweep slice removes).
- dupGlobalOwners residue 30: 27 foreign namespaces (--ct-*, --ra-*, --nav-*, --wh-bg, --bg-sidebar, --surface-page, --hover) + 3 deferred (--cp-bg-sunken, --cp-bg-elevated, --cp-lozenge-grey-bg).
- Feature folder = this dir (repo-local catalyst/features/; ~/catalyst symlink in HOME is broken).
- /loop dynamic mode: ScheduleWakeup re-arms with the /loop prompt each turn; agent completions are primary wake signals.

## Update (iteration 4)
- Committed: bd3ca6b3e Goal 4 gate (R1-R10, self-test all green, npm run lint:tokens); 8958d8a34 phantom+legacy sweep (5,506 refs, 563 files; R7 4,759→0).
- Gate totals: 15,398 → 10,557. Remaining: R1 10 (temp font tokens), R3 153, R4 3 (deferred to ambiguous slices), R5 221, R8 765, R9 8,414, R10 991.
- In flight: agent for R10→0 + R3→0 (mechanical; fallback strips + undefined-residue rewrites). Then: R5 cross-category decl fixes; R9 typography sweep (kills the 10 R1 temporaries + 664 numeric fontSize + 7,750 size refs → ADS font roles); R8 hard-coded colors; B.2 ambiguous per-consumer sweeps (incl. 3 R4 dup owners); rendered dual-theme fixtures + contrast; certificate.
