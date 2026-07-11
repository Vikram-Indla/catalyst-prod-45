# Evidence — Live UI Probe (Chrome MCP, localhost:8080→cyij staging, 1512×805, VERIFIED 2026-07-04)

Method: logged-in session, all 14 routes visited, screenshots reviewed in-session (not persisted to disk — Phase B prototype will produce persisted light/dark shots). Dark mode via theme-toggle + full reload (server-persisted user_theme_preferences overrides localStorage). Theme restored to light. No data mutations except 2 theme-pref writes.

## Route summary: 0 hard 404s, 0 crashes. All 14 resolve.

## TOP 10 UX DEFECTS (ranked)
1. **"+ Create case" DEAD on Repository** — mouse + programmatic click, no dialog, no nav, no error. Core CRUD broken.
2. **Dashboard FK crash every load** — dashboard_widget_config_project_id_fkey violation ×2; TestHub reuses ProjectDashboardPage with synthetic project id; layout persistence can never save.
3. **"Active test cycles" widget header-only** (55px, badge "1", zero body); dashboard ~70% whitespace.
4. **Board wrong-empty** — "Your board is empty — Create an issue" while 12 cases/1 cycle/2 defects exist; no columns; non-test-domain copy.
5. **My Work shows ALL 12 cases, all Unassigned** — no mine-filter semantics.
6. **Dependencies cards titled with raw UUIDs** (human name demoted to subtitle) — zero-assumption/icon-contract violation.
7. **Cycle detail + cycles list fixed-width (~1030px) tables clip columns** behind inner h-scrollbar while ~30% viewport unused.
8. **Breadcrumb chaos**: Reports "Test Hub / Test Hub / Reports / Reports"; Filters switches to project-lozenge "TESTHUB"; 3 crumb styles in one module.
9. **Dual key formats in same tables**: TC-001 vs TC-0001, DEF-002 vs DEF-00001.
10. **Non-canonical micro-UI**: custom uppercase 0-radius status pills (not Lozenge), 📌 emoji in Sets, SET-001 key wraps, React DOM-prop leaks (testId/isSelected) from hand-rolled FolderNode.

## CRITICAL WIRING FACT
`tm_test_cases?...project_id=eq.00000000-0000-0000-0000-000000000001` — **hardcoded placeholder project UUID**; TestHub ignores real project context. Root cause of dashboard FK crash + board wrong-empty + project-scoping absence.

## WHAT WORKS (preserve)
- **Execute runner genuinely good**: case rail, timer, keyboard legend (1/2/3/4 + Enter), no-steps fallback verdict, attachments dropzone, disabled-until-verdict Save.
- Repository read path: folder tree expand + counts correct, real table semantics, ADS tokens (Approved=--ds-text-success verified computed), Atlassian Mono keys.
- Reports hub: 26-report nav, real KPI data (Senaei BAU), honest caveat banner (folder-join limitation), Save view/Export; dark clean.
- Cycle detail→execute flow, display-key URLs (/testhub/TESTHUB/cycles/CYC-001), progress math consistent.
- Honest empty states (Traceability, Filters). Zero-assumption dashes (Sprint "—").

## Dark mode
NO white-glare on dashboard/repository/reports. data-color-mode flips, body rgb(24,25,26). Nits: repo rows 1px light outline (heavier than Jira dark); chart palette theme-blind (lime slice garish on dark, not broken).

## Per-route one-liners
dashboard: 2 half-widgets + FK crash · repository: best surface, dead create · cycles: 1 row, clipped table · cycle detail: real progress, clipped col, native-select assignee · execute: GOOD · my-work: wrong semantics · sets: real, emoji + key-wrap · defects: real, editable pills · traceability: honest empty · reports: real + breadcrumb dup · timeline: Gantt shell, "No issues with dates" modal (cycles lack dates) · board: wrong-empty · filters: legit empty, crumb inconsistency · dependencies: real link, UUID titles.

## Console/network
Only backend failure = dashboard FK (console). No REST 4xx/5xx observed. React DOM-prop warnings (testId, isSelected) in RepositoryPage:583 + AtlaskitPageShell.
