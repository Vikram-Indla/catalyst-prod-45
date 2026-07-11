# Drift Log — CAT-TESTHUB-REBUILD-20260704-001

| # | Date | Drift vs plan | Disposition |
|---|---|---|---|
| 1 | 2026-07-05 | Lab tables REPRODUCE JiraTable visual grammar (40px rows, mono keys, Lozenges) instead of importing JiraTable — mock-wiring friction. Allowed by Plan Lock with listing. | Production phases D/E MUST use real JiraTable. Affected: Repository case list, ScopeBuilder scope table, Traceability matrix. |
| 2 | 2026-07-05 | First build-agent wave killed by usage-credit outage (zero files written). | Relaunched identically; no residue. |
| 3 | 2026-07-05 | Step-editor pseudo-class states (:focus, hover-reveal) via scoped token-only `<style>` block in CaseDetail — inline styles can't express pseudo-classes. | Acceptable in lab; production uses CSS modules or emotion per repo norms. |
| 4 | 2026-07-05 | CaseDetail uses `var(--ds-link)` (agent verified existing repo usage) — not in Plan Lock token list. | Token-legal; noted. |
| 5 | 2026-07-05 | Gate B feedback: (a) LabShell double sidebar rejected; (b) nav-pruning recommendation REVERSED — Board/Timeline/Dependencies/Filters stay + uplift; (c) exhaustive beat-every-tool feature matrix demanded; (d) mock data insufficient — wire live staging data (writes authorized, "no risk"). | Phase B2 slice: single-sidebar shell, live tm_* wiring, 01_WORLDCLASS_FEATURE_MATRIX.md. Blueprint §11 updated. |
| 6 | 2026-07-05 | design-critique RCA: the "double sidebar" was never fully fixed — B2's top tab strip was a SECOND fix over the wrong cause. Real cause: CatalystShell.tsx:551 `isTestHubRoute = startsWith("/testhub")` matches `/testhub-lab` → renders the production TestHubSidebar, which duplicated the lab nav. Score 18/30, 3 P0 (H4/H8/H6). | FIX: CatalystShell suppresses production TestHubSidebar on /testhub-lab + renders lab's own single canonical sidebar (TestHubLabSidebar via SidebarBase); top tab strip removed from LabShell. One nav, canonical left-rail pattern. tsc+color clean. |
