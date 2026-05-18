---
title: Preflight handover — Routing & Slug Taxonomy Audit
date: 2026-05-18
surface: cross-cutting (Home, Project Hub, Product Hub, Admin, Detail Views)
tier: high-stake
council_ran: yes (3-panel compressed)
pr_status: pending — plan approved, no rows committed yet
---

# Preflight handover — Routing & Slug Taxonomy — 2026-05-18

## Context
- **Surface:** cross-cutting — Home / Project Hub / Product Hub / Admin / Detail Views
- **Tier:** high-stake (cascading URL change affects every bookmark, share, deep-link)
- **Started:** 2026-05-18
- **Council ran:** 3-panel compressed (Design Foundation × Atlassian Architect × Engineering)
- **PR:** pending — Vikram has not yet approved implementation rows

## Phase 0.5 — Jira Architect Register (0 halts)
4 navigation/port patterns relevant — all clear. No banned-item violations. No schema/field changes proposed.

## Decision (council verdict)
1. Catalyst already gets ~70% right — `useCatalystTitle` is wired in `CatalystShell.tsx:355` with the correct identity ladder. Tabs are routes (not query params) in Project Hub, Product Hub, Admin.
2. **3 structural defects** identified:
   - Missing universal `/browse/:issueKey` resolver (documented intent in `src/lib/workItemRoutes.ts:23` but never declared as a Route)
   - 4 hardcoded `https://jira.example.com/browse/${key}` placeholders should read base URL from `ph_jira_connection` (files: `AgeingPanel.tsx:91`, `JiraSyncChip.tsx:24`, `RAJiraSidePanel.tsx:337`, `useForYouData.ts:455`)
   - Duplicate issue detail routes — `/issue/:issueKey` AND `/project-hub/:key/issue/:issueKey` — no clear canonical
3. **3 quality defects:**
   - Admin: 4 camelCase paths (`/admin/business/EpicStatus`, `/FeatureStatus`, `/ThemeStatus`, `/ProcessStep`) violate kebab-case convention
   - Home: `/for-you` uses query soup (`?tab=&mode=&scope=&filter=&search=`) — `tab` should be a route segment `/for-you/{tab}`
   - Favicon never swaps to issue-type icon despite `@/lib/jira-issue-type-icons` primitive existing

## Plan (17 rows — see Phase 3 section below)

| # | Task |
|---|------|
| 1 | Failing test — `/browse/:key` exists |
| 2 | Implement `<Route path="/browse/:issueKey">` universal resolver in App.tsx |
| 3 | Failing test — Jira URLs use real base URL from connection |
| 4 | Replace 4 `jira.example.com` placeholders with `useJiraBaseUrl()` |
| 5 | Failing test — `document.title` for for-you tabs |
| 6 | Convert `/for-you?tab=X` query → `/for-you/{tab}` segment routes |
| 7 | Failing test — admin camelCase 301 to kebab-case |
| 8 | Rename 4 admin camelCase routes + add redirects |
| 9 | **ask-Vikram** — confirm favicon swap intent + strategy |
| 10 | Failing test — favicon switches on `/browse/:key` |
| 11 | Implement `useDynamicFavicon` hook |
| 12 | Deprecate `/issue/:issueKey` + `/project-hub/:key/issue/:issueKey` → 301 to `/browse/:key` |
| 13 | ads-validator + grep — scan callsites for stale nav targets |
| 14 | jira-compare gate — URL parity on issue detail |
| 15 | **ask-Vikram** — review diff before merge |
| 16 | **ask-Vikram** — confirm PR creation |
| 17 | `gh pr create` after all rows committed |

## Progress
- [x] Phase 0 — Memory bootstrap + classification (high-stake / cross-cutting)
- [x] Phase 0.5 — 28-pattern Jira Architect scan (0 halts)
- [x] Phase 1 — Lanes B, C, E complete; Lane A deferred (no live Chrome tab)
- [x] Phase 2 — 3-panel council (compressed)
- [x] Phase 2.5 — On-site evidence report
- [x] Phase 3 — 17-row plan with gates
- [x] Phase 7 — This handover note
- [ ] Phase 4 — Execution loop (pending Vikram approval per row)
- [ ] Phase 5 — Visual evidence (post-implementation)
- [ ] Phase 6 — Learning engine (post-session)

## Files identified (no edits yet)
- `src/App.tsx:196` — `/issue/:issueKey` route
- `src/routes/FullAppRoutes.tsx:930` — `/project-hub/:key/issue/:issueKey` route
- `src/routes/FullAppRoutes.tsx:430` — type-backlog redirect (pattern reference)
- `src/lib/workItemRoutes.ts:1-50` — documents `/browse/:key` intent
- `src/hooks/useCatalystTitle.ts:1-54` — title ladder (already correct)
- `src/hooks/useIssueDocumentTitle.ts:1-59` — per-issue title (already correct)
- `src/components/layout/CatalystShell.tsx:355` — `useCatalystTitle` mount point
- `src/components/for-you/atlaskit/AgeingPanel.tsx:91` — hardcoded jira.example.com (P1)
- `src/components/shared/JiraSyncChip.tsx:24` — hardcoded jira.example.com (P1)
- `src/components/reqAssist/RAJiraSidePanel.tsx:337` — hardcoded jira.example.com (P1)
- `src/hooks/useForYouData.ts:455` — hardcoded jira.example.com (P1)
- `index.html:10` — static `<title>Catalyst</title>` (base title — keep)

## Tests to add
- `src/__tests__/routing/browse-resolver.test.tsx` — universal `/browse/:key` resolver
- `src/__tests__/routing/jira-base-url.test.tsx` — no hardcoded jira.example.com
- `src/__tests__/routing/for-you-tab-routes.test.tsx` — segment routing for tabs
- `src/__tests__/routing/admin-kebab-redirects.test.tsx` — camelCase → kebab-case redirects
- `src/__tests__/routing/document-title.test.tsx` — title format per surface
- `src/__tests__/routing/dynamic-favicon.test.tsx` — favicon swap on issue route

## Visual evidence
- N/A — routing layer (no UI surface to annotate). Post-implementation: capture browser tab title + favicon side-by-side with Jira.

## Open items / next session
1. **Vikram decisions needed (before row 1 starts):**
   - Approve the 17-row plan as-is, or scope down to phases?
   - Confirm Phase 0/baseline: is the proposed `/browse/:issueKey` taxonomy approved as canonical?
   - Approve dynamic favicon swap (row 9) — yes/no?
   - Approve admin camelCase rename (row 8) — yes/no?
   - Confirm for-you tab segment routing (row 6) — accept that `?tab=` query becomes `/for-you/{tab}` path?
2. **Optional live Chrome MCP probe** — if Vikram opens a Jira tab pre-session, Lane A can be executed for additional confirmation.
3. **Deferred:** Test Hub, Plan Hub, Enterprise routes — not audited in this session (scope was Home/Project/Product/Admin per user request). Should be a follow-up session if migration extends to those modules.

## Lessons candidates (Phase 6 — awaiting Vikram approval)

### Candidate 1 — Universal `/browse/:key` is the Jira-parity killer feature
**Surface:** routing layer, any deep-link surface
**Pattern:** Jira Cloud's `/browse/BAU-5609` resolves to whatever the current canonical detail surface is, regardless of project type or issue type. It's the universal share-unit. Catalyst documented this intent in `workItemRoutes.ts:23` but never implemented it. Result: every place that builds a Catalyst issue URL has to guess the right path (full-page? project-scoped? type-specific?). Maintenance burden.
**Rule:** Catalyst MUST have `/browse/:issueKey` as the universal canonical detail route. All other detail routes either 301 to it or are removed. New code linking to an issue should always use `/browse/${key}` and let the resolver decide context. External shares always use `/browse/`.
**Severity:** P1 (architectural)

### Candidate 2 — Tabs should always be route segments, never query params
**Surface:** any new tabbed page
**Pattern:** Project Hub and Product Hub correctly use route segments for tabs (`/project-hub/BAU/backlog`). Admin mostly does. Home `/for-you` uses query soup (`?tab=`). Result: shareable URLs are inconsistent — sharing `/for-you?tab=assigned` puts the tab state in a less-discoverable place than sharing `/project-hub/BAU/backlog`. Browser back-button behavior also differs.
**Rule:** Any tab navigation in a Catalyst surface must be expressed as a route segment, not a query param. Filters, sort orders, and selection state remain query params. The tab itself is part of the address, not a side option.
**Severity:** P1 (architectural consistency)

## Copy-paste block (next session first message)

```
I'm resuming a /preflight session from 2026-05-18 on routing taxonomy.

Surface: cross-cutting (Home, Project Hub, Product Hub, Admin)
Tier: high-stake
Handover file: active/preflight-handover-2026-05-18-routing-slug-taxonomy.md
PR: pending — no rows committed yet

What was decided in the prior session:
1. Catalyst already gets ~70% right (useCatalystTitle wired, tabs are routes).
2. 3 structural defects to fix: missing /browse/:key universal resolver, 4 jira.example.com placeholders, duplicate issue detail routes.
3. 3 quality defects: admin camelCase, for-you query soup, no favicon swap.
4. 17-row plan written, gated by TDD + ask-Vikram + ads-validator + jira-compare + jira-parity confirmation.

What needs Vikram's input BEFORE row 1 starts:
1. Approve the 17-row plan as-is, or scope down to a single phase?
2. Approve /browse/:key as universal canonical?
3. Approve dynamic favicon swap (row 9)?
4. Approve admin camelCase → kebab-case rename (row 8)?
5. Approve /for-you/{tab} segment routing (row 6)?

Read the handover, confirm decisions, then start with row 1: failing test for /browse/:key resolver.
```
