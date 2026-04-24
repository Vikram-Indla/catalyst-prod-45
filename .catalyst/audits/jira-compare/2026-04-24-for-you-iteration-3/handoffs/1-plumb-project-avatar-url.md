📋 CC TASK BRIEF — For You / Project avatar plumbing
════════════════════════════════════

CONTEXT
─────────
The "Recommended projects" strip on the For You page renders the Atlaskit default building icon instead of real project avatars. Root cause: `<Avatar>` at `RecommendedProjectsStrip.tsx:191` is rendered without a `src`, and `projects.avatar_url` is not selected by the Supabase query in `useForYouData`, and the `projects` table may not even have the column.

This brief plumbs `avatar_url` end-to-end so the strip can render real images when present, and falls back to Atlaskit's hashed-initials tile otherwise.

Jira parity reference: `/rest/api/2/universal_avatar/view/type/project/avatar/<ID>?size=small` — confirmed via Jira MCP `getVisibleJiraProjects` on 2026-04-24; all 18 visible projects on the `digital-transformation` tenant expose `avatarUrls` in 4 sizes (16, 24, 32, 48).

Atlaskit spec: https://atlassian.design/components/avatar

TASK
────
1. Migration — add `avatar_url text` (nullable) to `public.projects`. No backfill in this PR; seeding happens separately.
2. Extend the Supabase projects query in `useForYouData` to select `avatar_url`.
3. Surface `projectAvatarUrl` on the `WorkItem` interface so downstream components can read it.

FILES TO TOUCH
──────────────
  - supabase/migrations/<YYYYMMDDHHMMSS>_add_projects_avatar_url.sql  (NEW)
  - src/hooks/useForYouData.ts  (existing select + WorkItem interface)

Target edits in `useForYouData.ts`:
  - Line ~35 (WorkItem interface): add `projectAvatarUrl?: string` next to `projectId?: string`.
  - Lines ~503-506 (the `project:projects(id, name, key)` select): extend to `project:projects(id, name, key, avatar_url)`.
  - Wherever `WorkItem` rows are mapped from the Supabase response (search the file for `.project?.name` / `.project?.id`): also propagate `projectAvatarUrl: row.project?.avatar_url`.

DO NOT TOUCH
────────────
  - `src/components/for-you/atlaskit/RecommendedProjectsStrip.tsx` — task #2 in this iteration refactors its data source; touching it here creates merge conflicts.
  - `src/pages/ForYouPage.atlaskit.tsx` — same reason.
  - Any other hub's project query. This is scoped to useForYouData only.
  - `vite.config.ts` — no new dep.

GUARDRAILS
──────────
  - L39 (UUID column guard) — `avatar_url` is a text column; do NOT accidentally type it as uuid in the migration.
  - §11 (Work item icons) — this brief is about PROJECT avatars, not work item icons. Do not touch `WorkItemIcon` or any iconType mapping.
  - §17 (one .dark block) — no CSS changes required in this brief.
  - Hex only / no HSL — no style edits required.

ACCEPTANCE CRITERIA
───────────────────
  - [ ] `supabase/migrations/*_add_projects_avatar_url.sql` creates `projects.avatar_url` as `text null`.
  - [ ] `useForYouData`'s return shape has `projectAvatarUrl` on `WorkItem` items where the project has a value set.
  - [ ] `select project:projects(id, name, key, avatar_url)` appears in the hook.
  - [ ] No consumer of `WorkItem` breaks (the new field is optional).
  - [ ] `npm run typecheck` passes.
  - [ ] No `@atlaskit/*` package added.

VERIFICATION (after fix)
─────────────────────────
  1. Run the migration locally: `supabase db reset` → migrations apply cleanly.
  2. Manually seed one row: `update projects set avatar_url = 'https://example.com/test.png' where id = '<one project id>';`
  3. Open `/` (For You page) in the dev server, run `window.__wi = ...` DevTools probe on `visibleItems`, confirm the seeded project's WorkItem has `projectAvatarUrl` set.

Send to Vikram for DevTools verification with screenshot of one `WorkItem` with `projectAvatarUrl` populated.
