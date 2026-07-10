# Session 017 — AC5 100-node jank proof (2026-07-09)

## Scope
Close the AC5 "100-node bound untested" limitation from session 016 with a temporary local-only dataset, per Vikram's instruction.

## Delivered
- 100-node / 95-edge Strategy Map exercised with real input (wheel zoom, pane-drag pan), window foregrounded and visibility-verified.
- **Result: p50 16.7ms / p95 17.6ms across 617 clean frames, ZERO frames >50ms, 3 isolated ~34ms single-frame drops.** Locked 60fps — no jank at the AC's 100-node bound. Full method + tables in 06_VALIDATION_EVIDENCE.md §017.
- Injection was client-side React state only (fiber `onNodesChange` add-changes); the page's two DB write paths (node-drag position persist, handle-connect edge create) were never triggered. Cleanup by reload; DOM and staging verified back to pre-test state (0 jank rows). Prod untouched.

## Effect on release decision
AC5 fully CLOSED (limitation retired). RELEASE_READINESS.md updated — the only remaining human gate is the screenshot signoff package (SCREENSHOT_SIGNOFF.md).

## Environment note
The Chrome window repeatedly lost visibility between tool calls (rAF suspension mid-sampler on one run — discarded). Fix that worked: activate the exact tab by URL via AppleScript, then run sampler start + interactions + sampler stop inside ONE browser_batch call so there is no gap for the window to hide.
