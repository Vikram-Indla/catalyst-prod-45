# Drift Log

| # | Date | Drift | Resolution |
|---|------|-------|------------|
| DR-001 | 2026-07-03 | Session limit hit mid-run: lanes 3, 5, 8, 10, 12 died before writing reports (lanes 7, 9, 14 wrote files but their agents died before returning summaries — summaries recovered from the files' Lane Summary sections). | All five missing lanes relaunched after limit reset with identical scope + instruction to write reports incrementally. No re-baselining needed; ID ranges unchanged. |
| DR-002 | 2026-07-03 | CAT-AUDIT-1281 (useIssueViewData.ts / IssueContentView.tsx priority fallback) skipped during PR-ZA-01 | Verified `useIssueViewData` only reaches the app via `IssueViewShell` → `HierarchyAllWorkPage`, which is not registered in FullAppRoutes.tsx (docblock confirms "Deprecated 2026-04-25 with the /project-hub/:key/hierarchy/allwork route"). No user can reach this code path; fixing it would require widening `AllWorkItem.priority` from `string` to `string \| null` for zero behavioral benefit. Left as-is; candidate for PR 2 dead-code removal instead. |
