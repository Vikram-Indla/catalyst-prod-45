# Objective

Execute the five-goal loop from Vikram's /goal directive (2026-07-10):
1. Build the token graph (CSS parser + TS AST; owners, cycles, undefined refs, duplicate owners, category mismatches, computed light/dark outcomes).
2. Remove poison at the highest parent (Atlaskit exclusively owns --ds-*; kill customColors inversions, self-refs, app-authored --ds-*, competing owners; one one-way compat bridge).
3. Sweep all descendants (935 phantom-token refs, cross-category consumers, hard-coded colors, manual typography) by semantic purpose, both themes.
4. Install root-level immunity (parser/AST gate in CI + local, poisoned fixtures proving each rule fails, dual-theme rendered fixtures + contrast).
5. Certify: signed PASS certificate, zero remaining poison, zero deferrals. Branch poison only. Never merge.
