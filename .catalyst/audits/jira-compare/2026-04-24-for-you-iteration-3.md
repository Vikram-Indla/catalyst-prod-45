# JIRA COMPARE — For You surface (iteration 3)
Date: 2026-04-24 · Auditor: Claude (jira-compare skill)

## Scope (from user's screenshots)

Four gaps across the For You surface as it appears on the home screen: (1) project cards in the "Recommended projects" strip render the Atlaskit default building icon instead of real project avatars; (2) the strip is unstable — cards change count and order on every tab click ("dancing screen"); (3) work-item type icons differ from Jira; (4) the Viewed tab shows the empty state on Catalyst while Jira has real items.

| Endpoint | URL |
|----------|-----|
| Jira ref | `https://digital-transformation.atlassian.net/jira/your-work` |
| Catalyst ref | `http://localhost:8080/` (For You page, index route; `/for-you` redirects to `/`) |
| Atlaskit spec | `https://atlassian.design/components/avatar` (primary primitive for this audit) |
| Screenshots | user-provided, 8 screenshots captured during iteration 3 |

## Executive verdict

The Atlaskit component identity on the For You surface is correct — `@atlaskit/avatar` is already the primitive in use for project cards and mentioner avatars, `@atlaskit/tokens` drives colour, `@atlaskit/empty-state` handles the empty Viewed tab. **There are no `@atlaskit/*` mismatches in this scope.**

The gaps are data and derivation, not primitives:

1. **`RecommendedProjectsStrip` does not pass `src` to `<Avatar>`** — so Atlaskit falls back to its default square building icon. The fix is to plumb `projects.avatar_url` through the `useForYouData` query and pipe it into the card.
2. **The strip derives cards from per-tab filtered `visibleItems`**, so switching tabs rebuilds the strip with a different set of projects each time. The strip should derive from the full account-scoped dataset — stable across tabs — not the active tab's filtered rows.
3. **The Viewed tab is empty** because `user_viewed_items` isn't being written on row-click, or the hook's filter shape doesn't match what the table actually stores. This is a wiring bug, not a UI bug.
4. **Work-item type icons are canonical inline SVGs (CLAUDE.md §11) — ACCEPTED DIVERGENCE.** Jira uses `<img>` from `/rest/api/2/universal_avatar/view/type/issuetype/avatar/<ID>`, Catalyst uses `WorkItemIcon` with the frozen viewBox "0 0 16 16" palette. §11 is explicit: "These icons are the canonical Catalyst/Jira work-item type system approved by MoIM. No AI, no Claude Code pass, no Lovable prompt may change the color, shape, or component of any icon." This finding closes as accepted — no code change.

Net: zero P0 Atlaskit-identity findings, three P1 parity/wiring findings, one documented accepted divergence. The surface is one data pipe and one dependency-array edit from parity on the visible half; the Viewed tab needs a short investigation to decide between a wiring fix and a data-seed fix.

## P0 — Atlaskit mismatches

**None.** Every interactive element in scope already uses the correct `@atlaskit/*` primitive:

| Element | Jira primitive | Catalyst primitive | Status |
|---------|---------------|--------------------|--------|
| Project card avatar | image via Atlaskit `Avatar` | `@atlaskit/avatar` `appearance="square"` size="medium" | ✅ same primitive |
| Project card shell | Atlaskit Button+Text | Native `<button>` styled to Atlaskit tokens | ✅ acceptable — Atlaskit Button would work but the current shell is token-compliant |
| Mentioner avatar (Reply-to-mentions row) | `@atlaskit/avatar` default circle | `@atlaskit/avatar` default circle | ✅ same primitive |
| Work-item type icon | `<img>` from universal_avatar | `WorkItemIcon` inline SVG (CLAUDE.md §11) | ✅ accepted divergence |
| Empty state (Viewed tab) | Atlaskit EmptyState | `@atlaskit/empty-state` | ✅ same primitive |

## P1 — Parity drift (typography, spacing, field props, tab order, scroll)

### P1-1 — Project cards show Atlaskit default building icon instead of real project avatars

**Tag:** `[CLAUDE CODE]`

**Evidence (T2 DOM probe — Jira side, 2026-04-24):**
Jira's strip renders three cards whose `<img>` tags resolve to `/rest/api/2/universal_avatar/view/type/project/avatar/10413?size=small` (and 10414, 10415 — one per project). Probing the `<img>` directly shows non-zero `naturalWidth` with a real image payload.

**Evidence (T3 Jira MCP — 2026-04-24):**
`getVisibleJiraProjects` returns 18 projects under the `digital-transformation` tenant. Every project has an `avatarUrls` object exposing four sizes:

```
{
  "48x48": "https://digital-transformation.atlassian.net/rest/api/2/universal_avatar/view/type/project/avatar/10413",
  "24x24": "https://.../view/type/project/avatar/10413?size=small",
  "16x16": "https://.../view/type/project/avatar/10413?size=xsmall",
  "32x32": "https://.../view/type/project/avatar/10413?size=medium"
}
```

**Evidence (T4 Catalyst DOM probe):**
Catalyst's card avatars are `<svg viewBox="-4 -4 24 24">` with the Atlaskit default building path — the fallback Atlaskit renders when `<Avatar>` has no `src`. No `<img>` elements are present in the strip.

**Evidence (T4 source — `src/components/for-you/atlaskit/RecommendedProjectsStrip.tsx` line 191):**

```tsx
<Avatar
  appearance="square"
  size="medium"
  name={card.name}
  src={card.avatarUrl}   // <— always undefined today
/>
```

`ProjectCard` defines `avatarUrl?: string` at line 51, but the memo that builds the card list at lines 56–75 never populates it because `WorkItem` doesn't carry a project avatar, and the Supabase projects query at `src/hooks/useForYouData.ts:503-506` doesn't select `avatar_url`.

**Fix (spec: https://atlassian.design/components/avatar):**

1. Add an `avatar_url` column in Supabase on `public.projects` (if not present — confirm via `\d projects` before migrating).
2. Seed it per project with either (a) an uploaded image in Supabase Storage, or (b) a fixed CDN URL. Ministry branding first.
3. Plumb the field through `useForYouData`:
   - Extend the projects `select()` in `src/hooks/useForYouData.ts` (lines 503–506 today) from `project:projects(id, name, key)` to `project:projects(id, name, key, avatar_url)`.
   - Surface it on the `WorkItem` interface (`src/hooks/useForYouData.ts:35` currently has `projectId?: string` — add `projectAvatarUrl?: string`).
4. Pipe it into the strip:
   - In `RecommendedProjectsStrip.tsx` lines 56–75, set `avatarUrl: item.projectAvatarUrl` when building `ProjectCard`.
5. When `projects.avatar_url` is null, leave the initials fallback intact — Atlaskit's default hashed-initials tile is the correct degradation.

### P1-2 — "Recommended projects" strip is unstable — cards change on every tab click

**Tag:** `[CLAUDE CODE]`

**Evidence (T2 Jira DOM):**
Jira's strip shows **three stable cards** (Senaei BAU, MIM Digital Transformation Demand, MIM Website Revamp) regardless of which For You tab is active. The strip is derived from the user's project membership at the account level, not from the active tab's filtered items.

**Evidence (T4 Catalyst DOM — three-tab sweep):**

| Active tab | Cards shown | Notes |
|------------|-------------|-------|
| Recommended | 2 | "Portfolio", "MIM Website Revamp" |
| Assigned | 6 with dupes | Portfolio×2, Catalyst, MIM Website Revamp, two others |
| Viewed | 0 | strip renders `null` because `items.length === 0` path at RecommendedProjectsStrip.tsx line 77 |

**Evidence (T4 source — `ForYouPage.atlaskit.tsx` line 163):**

```tsx
<RecommendedProjectsStrip items={workItems} />
```

Wait — `workItems` here is the full collection returned by `useForYouData()` at line 58, which is already scoped to the active tab. And `useMemo` at `RecommendedProjectsStrip.tsx:56` with dep `[items, maxCards]` re-derives on every tab change because `workItems` identity changes.

The duplicates on the Assigned tab are a separate symptom — two rows with the same project name but different `projectKey` values (likely case drift or an extra projects row pointing at the same hub). Resolving P1-2 by moving derivation upstream will expose that dupe, which P1-2b handles.

**Fix:**

1. Source the strip from an **account-scoped** project list, not from `workItems`.
2. Add `allUserProjects: Project[]` to `useForYouData`'s return — a single Supabase query at mount (`select('id, key, name, avatar_url').in('id', memberProjectIds)`) driven by `auth.uid()` project membership. Cached with TanStack Query at 15m (project membership is slow to change).
3. Change the strip's prop from `items: WorkItem[]` to `projects: Project[]` and drop the frequency-ranked reduce. Sort by `name.localeCompare` and cap at `maxCards`.
4. In `ForYouPage.atlaskit.tsx:163`, replace `items={workItems}` with `projects={allUserProjects}`.

This also fixes the "cards disappear on the Viewed tab" symptom — the strip is now tab-independent.

### P1-2b — Duplicate project cards on the Assigned tab

**Tag:** `[RESEARCH]` → resolves to `[CLAUDE CODE]`

**Evidence:** When Assigned is active, Catalyst renders **Portfolio (×2)** as two separate cards. Two interpretations:

(a) Two rows in `public.projects` with the same display name but different keys (data hygiene issue).
(b) One row but the reduce in RecommendedProjectsStrip.tsx lines 56–71 is keying on something that varies (e.g. a per-item alias).

**Action:** Resolve by running in Supabase:

```sql
select id, key, name from public.projects where name ilike '%portfolio%';
```

If (a): collapse duplicates via a Supabase migration that picks a canonical row and repoints FKs. If (b): the P1-2 fix (derive from `allUserProjects` keyed by `id`) removes the bug anyway — no separate action.

### P1-3 — Viewed tab shows empty state; Jira populates

**Tag:** `[RESEARCH]` → resolves to `[CLAUDE CODE]` or data-seed

**Evidence (T2 Jira DOM):**
Jira's Viewed tab lists items grouped by recency ("Today" section visible with multiple rows, icons, and relative timestamps).

**Evidence (T4 Catalyst DOM):**
Catalyst renders `ForYouEmptyState` with header "Nothing viewed yet" and description "Work items you open will appear here so you can quickly jump back." This is the correct empty-state primitive — it's just that the backing collection is empty.

**Evidence (T4 source — `ForYouPage.atlaskit.tsx` line 91):**

```tsx
const handleSelect = useCallback((item: WorkItem) => {
  handleRowClick(item.id);
  trackView(item.id, item.issueType === 'planner_task' ? 'task' : 'ph_issue');
}, [handleRowClick, trackView]);
```

`trackView` is wired on row-click. The question is whether:
(a) `trackView` is firing but the hook's Viewed-tab query filters something out (e.g. `user_viewed_items` joined on `auth.uid()` that doesn't match the session).
(b) `trackView` writes succeed but the WorkItem join isn't resolving (e.g. entity_type drift between 'task'/'ph_issue' and what Viewed filters on).
(c) `trackView` isn't firing at all (e.g. a handler swap that never reaches the hook).

**Action:** Three targeted checks, in order:

1. In Catalyst with DevTools open, click a row on the Assigned tab and watch the Network tab for a POST/INSERT to `user_viewed_items`. If no call → (c) above.
2. Query `public.user_viewed_items` in Supabase for `user_id = auth.uid()`. If rows exist → (a) or (b); if empty → (c) confirmed.
3. If rows exist, compare their `entity_type` / `entity_id` values against the filter shape in `useForYouData`'s Viewed query.

Whichever branch wins will produce a one-file fix in `src/hooks/useForYouData.ts` or `src/hooks/use<X>`. Do not guess — run the three checks first.

## P2 — Polish

(None in this audit's scope. All polish-level findings from iteration 1 — border radius, hover overlay opacity, text color tier — were closed in iteration 2 and re-verified in this iteration's T4 probe.)

## Typography sweep (page-level)

| Role | Jira | Catalyst today | Match? |
|------|------|----------------|--------|
| Greeting ("Good to see you, Vikram") | Atlassian Sans 24/700/32 | Sora 24/700/32 | ✅ house font divergence — accepted per CLAUDE.md §1 |
| Strip heading ("Recommended projects") | Atlassian Sans 16/600/20 | Inter 16/600/20 | ✅ size/weight/line-height match, house font divergence |
| Project card name | Atlassian Sans 14/600/20 | Inter 14/600/20 | ✅ |
| Tab label | Atlassian Sans 14/500/20 | Inter 14/500/20 | ✅ |
| Mention row ("mentioned you on") | Atlassian Sans 14/400/20 | Inter 14/400/20 | ✅ |
| Issue key in mention row | Atlassian Mono 12/500/20 | JetBrains Mono 12/500/20 | ✅ |
| Timestamp | Atlassian Sans 12/400/16 | Inter 12/400/16 | ✅ |
| Group heading ("TODAY"/"YESTERDAY") | Atlassian Sans 11/600/16 uppercase, letter-spacing 0.08em | Inter 11/600/16 uppercase, letter-spacing 0.08em | ✅ |

Typography is clean — the only divergence is Inter/Sora/JetBrains Mono vs Atlassian Sans/Mono, which CLAUDE.md §1 accepts.

## Tab order

Tab order matches Jira on the Recommended tab (the tab Vikram exercised in iteration 1). Not re-verified on Assigned/Starred/Worked/Viewed in iteration 3 because no tab-order issue was reported — defer to a targeted audit if a user flags one.

## Scroll behaviour

Matches Jira. The outer scroll container is the page; the strip wraps inline; each panel renders its own rows inline without a nested scroll region. Sentinel-based infinite scroll is wired in `ForYouPage.atlaskit.tsx` lines 99–111 and matches Jira's "Load more + auto-advance on scroll" pattern.

## Proposed fix plan (Atlaskit-first, surgical)

Execute in this order. Each step: one file, one change, one reason.

1. **Supabase migration** — add `public.projects.avatar_url text nullable`. Seed the top 20 projects (by activity) with ministry-branded avatars (Storage-hosted). Rollout: one migration PR, backfill script, no downtime.

2. **`src/hooks/useForYouData.ts:503-506`** — extend the projects `select` to include `avatar_url`. Surface on the `WorkItem` interface at line 35 as `projectAvatarUrl?: string`. No other hook changes.

3. **`src/hooks/useForYouData.ts`** — add `allUserProjects: Project[]` to the hook's return. Backed by a new TanStack Query (15m staleTime) that selects `id, key, name, avatar_url` from `public.projects` scoped by the caller's project membership (RLS will handle the scope).

4. **`src/components/for-you/atlaskit/RecommendedProjectsStrip.tsx`** — change the prop from `items: WorkItem[]` to `projects: Project[]`. Delete the `useMemo` at lines 56–75 that builds `ProjectCard` from items. Map `projects` directly to cards with `avatarUrl: p.avatar_url`. Sort alpha by `name`, slice to `maxCards`.

5. **`src/pages/ForYouPage.atlaskit.tsx:163`** — change `items={workItems}` to `projects={allUserProjects}`.

6. **Viewed tab wiring** — run the three checks in P1-3. Depending on outcome:
   - (c) `trackView` not firing → fix the handler in `ForYouPage.atlaskit.tsx:89-92`.
   - (a)/(b) filter drift → fix the Viewed query in `src/hooks/useForYouData.ts` at the Viewed tab branch.

7. **`package.json` / `vite.config.ts`** — no changes. `@atlaskit/avatar` is already installed and pre-bundled.

## Acceptance checks (for the human)

- [ ] Project cards render real images (not the Atlaskit default building icon) when `projects.avatar_url` is set.
- [ ] Projects without `avatar_url` render Atlaskit's hashed-initials fallback (still via `@atlaskit/avatar`, not a bespoke SVG).
- [ ] Strip count and order are stable across all 5 tabs (Recommended → Assigned → Starred → Worked on → Viewed).
- [ ] No duplicate project cards on any tab.
- [ ] Clicking a row in Assigned adds a row to `public.user_viewed_items` (verify in Supabase); the Viewed tab renders that row within 60s (query staleTime).
- [ ] `WorkItemIcon` renders unchanged per CLAUDE.md §11 — inline SVG, viewBox "0 0 16 16", the 14 canonical types listed in §11.
- [ ] No new `@atlaskit/*` dependency added (already in `package.json`).
- [ ] Typography sweep rows all still "Match" after the changes.

## Research notes

**P1-2b research:**
Duplicate Portfolio card suggests data hygiene in `public.projects`. Run `select id, key, name from public.projects where name ilike '%portfolio%'` before the fix — if two rows, decide on canonical and migrate; if one row, the reduce was keying on a transient alias and the P1-2 refactor resolves it.

**P1-3 research:**
Whether `trackView` fires and whether `user_viewed_items` rows land with the expected `entity_type` determine the fix site. Three-check protocol in P1-3 above; do not skip.

**Work-item icons (no research needed — decision on record):**
CLAUDE.md §11 freezes the Catalyst inline SVG palette at 14 canonical types. The Jira `<img>` universal_avatar approach is not a candidate for adoption — §11 explicitly bans substitution. The only legitimate work under §11 is adding a new `iconType` (requires Vikram's sign-off) or fixing a mapping alias (see §11's alias table).

## Handoff index

| Priority | Count | Tag split |
|----------|-------|-----------|
| P0 | 0 | — |
| P1 | 3 | 2× `[CLAUDE CODE]`, 1× `[RESEARCH]` → `[CLAUDE CODE]` |
| P2 | 0 | — |
| Accepted divergences | 2 | Work-item icons (CLAUDE.md §11); Font family (CLAUDE.md §1) |

**Claude Code task briefs (emitted in Phase 5):**
- `handoffs/1-plumb-project-avatar-url.md` — Supabase migration + hook query + WorkItem interface.
- `handoffs/2-stable-recommended-projects-strip.md` — refactor strip to consume `allUserProjects`.
- `handoffs/3-viewed-tab-wiring-investigation.md` — three-check protocol + conditional fix.

**No Lovable prompts.** All three fixes are surgical code edits (one file per step), not UI rebuilds. CLAUDE.md §10 "one component, one file, one fix" applies.
