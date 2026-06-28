# D2 — Route & Component / Shell-Rail Inventory

> STATUS: 🟢 FIRST PASS (Explore agent). Cite file:line.

## Test Hub routes (FullAppRoutes.tsx:664-684)
dashboard, my-work, board, repository, cycles, cycles/:id, cycles/:id/execute, sets, sets/:id,
traceability, defects, **reports-lab**, **reports**, **reports/:type**, filters, filters/create, filters/:id.

## Sidebar
`src/components/layout/TestHubSidebar.tsx` (11 items incl. Reports + Reports Lab). Mounted in
CatalystShell when `pathname.startsWith("/testhub")` (CatalystShell.tsx:711-712).

## Shell & rails — viewport control (the "reading mode" requirement)
- Shell: `src/components/layout/CatalystShell.tsx`.
- **LEFT rail**: CatalystShell.tsx:892-946 (`#catalyst-sidebar`), 240px open / 0px hidden.
- **RIGHT rail: NONE** currently mounted in shell.
- Main: CatalystShell.tsx:948-988 (`#catalyst-main`, flex-1).
- Report content width cap: ReportDetailPage.tsx ~:1354 `maxWidth: 1200px` centered.
- Existing rail control: `src/contexts/CatalystContext.tsx` — `sidebarExpanded/Hidden/Pinned/HoverOpen`,
  `setSidebarHidden(true)` collapses left rail; Cmd/Ctrl+[ cycles. → full-width report mode achievable
  by `setSidebarHidden(true)` + dropping the 1200px cap. No dedicated "focus/reading mode" exists yet.

## ⚠️ ADS violation spotted (pre-existing, flag only)
ReportDetailPage.tsx ~:1337 uses hex fallback `var(--ds-surface-sunken, #F7F8F9)` — banned per CLAUDE.md. Logged in D16.
