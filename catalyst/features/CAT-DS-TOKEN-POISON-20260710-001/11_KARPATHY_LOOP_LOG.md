## KL-001 (2026-07-11)
Hypothesis: external audit counts are reproducible from source with a real parser. Experiment: scripts/token-graph/build-token-graph.mjs. Measure: exact match on cp/ds decl counts + self-refs; big-three within 2% (audit run predates comment fix). Keep. 
## KL-002 (2026-07-11)
Hypothesis: atlaskitCustomColors is consumed only by AdsThemeProvider; removal is type-safe. Experiment: grep consumers + tsc --noEmit. Measure: 0 consumers, 0 type errors. Keep (committed).
## KL-003 (2026-07-11)
Hypothesis: app --ds-* CSS layers are dead code under Atlaskit's runtime cascade; deletion is visually inert except the dark lozenge wrapper + app-invented names. Experiment: cascade analysis (specificity+order) + deletion + graph/tsc/gates/build. Measure: appDs 217→10, gates green, tokens debt −1236. Keep. Dark-lozenge change deferred to rendered-fixture verification (moves TO canonical ADS values).
## Loop — bridge slice (2026-07-11, worktree poison)
- Hypothesis: the 80(→81) B.3 aliases can become single-owner in one new file with zero winning-value regressions outside spec-sanctioned de-poisoning.
- Experiment: postcss codemod (dry-run first) — delete bridge-name decls (243), delete-only decls (189), self-refs (10), cascade-loser dupes (59); winner = last in main.tsx/index.css import order per mode bucket.
- Measure: graph rebuild — selfRefs 0, bridge names 81/81 single-owner, dupGlobalOwners 90→30, appDs 10 unchanged; tsc + both ratchet gates green.
- Keep: yes. Discard: nothing. Learned: (1) graph `consumers` misses token-decl-level refs — 6 "zero-consumer" tokens were live via --pb-*/--roadmap-* chains without fallbacks; (2) `:root, [data-theme="light"]` compounds are builder-"scoped" but cascade-global — winner logic must correct for it; (3) fallback-position self-refs are harmless (never evaluated), only leading-position ones are guaranteed-invalid.
