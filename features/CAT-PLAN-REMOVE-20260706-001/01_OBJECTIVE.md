# Objective

Remove the "Plan" hub (⌘0, calendar icon, under "Build & Ship" in the hub switcher) and all related code from Catalyst-web, with no regression to remaining hubs (Home, Strategy, Ideation, Product, Project, Release, Test, Incident, Tasks, Folio).

## Scope
- Hub switcher entry for Plan
- Route(s) for /plan/*
- Plan page/component files
- Plan-specific sidebar/nav
- Any lazy-load imports, hub config arrays, icon registries, keyboard shortcut maps referencing Plan
- Dangling imports/dead code left behind

## Non-scope
- Do not touch generic "planning" features unrelated to this hub (e.g. sprint planning inside Project hub, PlanLock feature-folder docs, plan_lock config).
- No DB schema changes unless a Plan-exclusive table/hook is found and confirmed unused elsewhere.

## Done looks like
- Plan entry no longer appears in hub switcher.
- /plan/* routes removed, no 404 dangling links elsewhere.
- No orphaned imports; `tsc --noEmit -p tsconfig.app.json` error count does not increase.
- App builds/runs; other hubs unaffected (verified via dev server + browser).
- Changes committed to main.
