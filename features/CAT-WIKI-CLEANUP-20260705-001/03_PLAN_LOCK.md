# CAT-WIKI-CLEANUP-20260705-001 — Plan Lock

**Status**: Ready for execution

**Objective**: Clean up all Wiki routes, pages, components, hooks, and database references. Keep label on HubSwitcher (visual only, non-functional).

**Non-Scope**:
- Do NOT remove `@atlaskit/knowledge-base` or other KB/AI packages
- Do NOT touch other hubs (Project, Product, Release, IncidentHub, etc.)
- Do NOT modify auth, RLS, or migration infrastructure
- Do NOT delete any non-Wiki tables

---

## EXACT FILE REMOVAL LIST

### Routes & imports (FullAppRoutes.tsx ~line 150-810):
- Remove 12 Wiki page lazy imports (WikiHomePage through WikiTemplatesPage)
- Remove 12 `<Route path="/wiki/*">` definitions

### File deletions:
- `src/modules-dormant/wiki/` — entire directory (11 files)
- `src/components/wiki/` — entire directory (5+ files)
- `src/hooks/useWikiHub.ts`
- `src/hooks/useWikiData.ts`
- `src/components/layout/WikiSidebar.tsx` (if exists)

### Component updates:
- `src/components/layout/HubSwitcher.tsx` — keep label, set `disabled: true` or remove `href`

### DB tables (to be dropped via DDL or migration):
- `wiki_pages`
- `wiki_learning_paths`
- `wiki_learning_progress`
- `wiki_knowledge_requests`
- `wiki_verification_queue`
- `wiki_analytics` (if exists)
- `wiki_template_*` (if exists)
- Any `wiki_*` tables

---

## VALIDATION CHECKLIST

✅ Zero grep matches for `wiki` (case-insensitive) except:
   - Comments documenting the removal
   - String literals in tests/migrations (allowable)
   
✅ HubSwitcher still renders "Wiki" label but disabled/non-clickable

✅ No 404 errors on other hub routes (project, product, release, incident)

✅ No broken imports or dangling references

✅ Feature folder `sessions/001_cleanup.md` logged with evidence

---

## TIMEBOX

2 hours max. If cleanup surfaces surprises (cross-module dependencies, hidden references), escalate before continuing.

---

## STOP CONDITIONS

1. Grep finds unexpected Wiki references (non-comment, non-string)
2. HubSwitcher label removal triggers regression in other hubs
3. DB drop fails or shows FK constraints

Execute STOP + raise before proceeding past the blocker.
