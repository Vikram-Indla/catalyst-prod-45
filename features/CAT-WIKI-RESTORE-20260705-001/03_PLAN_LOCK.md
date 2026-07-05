# PLAN LOCK — CAT-WIKI-RESTORE-20260705-001

**Purpose:** Re-enable the Wiki (Knowledge) hub — restore routes removed 2026-06-25.
**Status:** DONE — implemented + verified live on localhost:8080, seeded on staging cyij.
**Sibling:** Strategy hub enable already on origin/main.

## Objective
Wiki nav entry navigates to a working Wiki, not the `/wiki*`→`/for-you` redirect stub.

## What was done
1. `src/routes/FullAppRoutes.tsx` — replaced the `/wiki*` redirect with 13 routes wired to
   `src/modules-dormant/wiki/*` pages, wrapped in `<MG k="wiki" t="Wiki">`. KnowledgeGraph
   page was deleted (not dormant) → route dropped. No Domains index page exists →
   `/wiki/domains`→redirect `/wiki`, `/wiki/domains/:slug`→WikiCategoryPage.
2. `src/components/layout/HubSwitcher.tsx` — dropped `deprecated:true` on the wiki row
   (tone gray→lime) so it renders as a live LinkItem, not a disabled dead CTA.
3. `supabase/migrations/20260705120000_seed_wiki_demo_content.sql` — demo content seed
   (2 domains, 3 categories, 5 published pages + sections, 3 quick refs, 1 learning path).
   Applied to staging cyij + ledger row. Idempotent.

## Evidence (2026-07-05, staging cyij)
- Backend fully intact pre-restore: useWikiHub.ts (19 hooks), RPCs
  get_wiki_home_stats/get_wiki_domain_cards/increment_view_count/update_article_helpfulness,
  kb-query edge fn, all wiki_* tables present. Only gaps were routes + empty content.
- tsc --noEmit clean. No new hardcoded colors.
- Verified live: `/wiki` home populated, `/wiki/engineering-onboarding-guide` renders
  sections, HubSwitcher shows Strategy + Wiki as live hubs.

## Known quirk (not a regression)
Wiki home stat header shows "9 Domains" but only 2 render — `get_wiki_home_stats` RPC
returns a legacy/hardcoded demo count, unrelated to the seed.

## Gating notes
- `wiki`+`enterprise` in CORE_NAV_MODULES → admin/super_admin auto-full; non-admin roles
  need an `admin_role_module_permissions` grant to see the hub.
- `useModuleEnabled` defaults true when a feature_flags row is absent; `wiki_hub` flag on.
