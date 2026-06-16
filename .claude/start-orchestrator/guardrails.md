# Catalyst Guardrails

1. Reuse existing implementation before creating anything new.
2. No new component library.
3. No design system/theme/typography/color/spacing changes unless explicitly requested.
4. No duplicate business logic.
5. No hardcoded data where dynamic data exists.
6. Inspect source implementation before replication.
7. Inspect target module before proposing changes.
8. Prefer minimal diffs.
9. Preserve React + TypeScript + Tailwind patterns.
10. Preserve Supabase/data-access patterns.
11. Preserve route, drawer, dialog, tab, table, filter, kanban, roadmap, and form conventions.
12. Preserve filters, scoring, workflow, roadmap, OKR, dashboard, and governance logic unless explicitly changed.
13. No schema/migration/env/secret changes without explicit permission.
14. No destructive commands without explicit permission.
15. No commits or pushes without explicit permission.
16. No third-party installation without explicit permission.
