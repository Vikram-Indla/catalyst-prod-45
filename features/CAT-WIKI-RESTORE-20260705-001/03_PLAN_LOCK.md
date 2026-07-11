# PLAN LOCK — CAT-WIKI-RESTORE-20260705-001

**Purpose:** Re-enable the Wiki (Knowledge) hub in the ⌘-nav — restore routes removed on 2026-06-25.
**Status:** DRAFT — awaiting content-gap decision. No code until approved.
**Sibling done this session:** Strategy hub enabled (HubSwitcher `deprecated:true` dropped, route already live).

---

## Objective
Wiki nav entry navigates to a working Wiki, not the `/wiki*`→`/for-you` redirect stub.

## Non-scope
- No new Wiki features. Restore-only.
- KnowledgeGraph page (deleted, not dormant) — dropped, not restored.
- Feedback-write path (`kb_feedback` table absent) — out of scope, tracked as risk.

## Evidence gathered (2026-07-05, cyij staging)
| Fact | State |
|---|---|
| Original routes | 14, recovered from `23b8f830b^:FullAppRoutes.tsx` (lines 719–731) |
| Page components | 12 present in `src/modules-dormant/wiki/`; KnowledgeGraph absent |
| `ENABLE_WIKI` feature flag | REMOVED from featureFlags.ts — restore mounts pages directly (like Strategy) |
| Data hooks | `src/hooks/useWikiData.ts` intact |
| Tables (7/8 exist) | `wiki_pages, wiki_categories, wiki_domains, wiki_documents, wiki_bookmarks, wiki_read_log, kb_embeddings` present; **`kb_feedback` ABSENT** |
| **Content** | **wiki_pages=0, categories=0, domains=0, documents=0 — EMPTY** |
| Nav gate | `canViewInNav('wiki')` reads `permissions` row for `wiki`; likely hidden → needs module-access seed or entry stays locked |
| MG role registry | no `wiki` key in `MG_ROLE_KEY` → org-level ModuleGate only |

## ⛔ BLOCKER — empty content
Tables exist but hold zero rows on staging. Restoring routes yields a hollow Wiki:
Home/Search/AllArticles empty; every `/wiki/:slug` and `/wiki/category/:slug` 404s.
**Decision required before build** (see chat question): seed demo content / point at populated source / accept empty shell.

## Files to modify (on approval)
1. `src/routes/FullAppRoutes.tsx` — replace `/wiki*` redirect with 13 routes; imports repointed `../pages/wiki/*` → `../../modules-dormant/wiki/*`; wrap in `<MG k="wiki" t="Wiki">`.
2. `src/components/layout/HubSwitcher.tsx:80` — drop `deprecated:true`, tone `gray`→`lime`.
3. Module-access seed (DB, staging) — `wiki` permission/feature_flag row so nav isn't locked. **Migration file + ledger entry required.**

## Files forbidden
- `src/modules-dormant/wiki/*` page internals (restore-only, no rewrites).
- Prod DB (lmqw) — staging cyij only unless Vikram says otherwise.

## Validation
- `npx tsc --noEmit` clean (12 dormant pages compile from new import paths).
- Each restored route renders without crash on empty data (graceful empty states).
- ADS color gate clean.
- Screenshot acceptance: Wiki Home + one sub-route.

## Stop conditions
- Content decision unresolved → do not build.
- Any dormant page fails tsc from the path move → stop, report, don't rewrite the page.
