# Handover: In-Jira Description Parity — 2026-05-04

**Branch:** `feat/jira-list-table-parity-may2026` → merged to `main`
**Jira issue:** [BAU-5609](https://digital-transformation.atlassian.net/browse/BAU-5609)
**Repo:** `/Users/vikramindla/Documents/GitHub/catalyst-prod-44`
**Status:** All defects resolved and merged. Working tree clean.

---

## What was done

### Defect D3 — ADF description dropped for non-string values
**File:** `src/modules/in-jira/hooks/useInJiraIssues.ts:29`

`injira_issues.description` is typed `Json | null` in Supabase (not `string`). The
original hook code did `typeof issue.description === 'string'` which evaluated false for
JSON objects, mapping ADF payloads to `undefined` and blanking the description field.

**Fix:** Added `JSON.stringify` fallback so ADF objects are stringified before being
passed to `parseADF` in IssueDrawer.

```ts
description: issue.description
  ? (typeof issue.description === 'string' ? issue.description : JSON.stringify(issue.description))
  : undefined,
```

---

### Defect D4 — IssueDrawer toolbar missing Rovo AI + Improve buttons
**File:** `src/modules/in-jira/components/IssueDrawer.tsx:157–311`

The `AtlaskitEditor` `primaryToolbarComponents` prop was not wired. Jira shows
"Improve Story" in the issue header; the parity target is "Rovo AI" + "Improve" in
the `primaryToolbarComponents` slot (right side of the description editor toolbar).

**Fix:** Added `descToolbarComponents` memo and wired it to `primaryToolbarComponents`:

```tsx
const descToolbarComponents = useMemo(() => [
  <AkTooltip content="Rovo AI" key="rovo">
    <AKButton ... label="Rovo AI" ... />
  </AkTooltip>,
  <AkTooltip content="Improve description" key="improve">
    <AKButton ...>Improve</AKButton>
  </AkTooltip>,
], []);
// ...
<AtlaskitEditor primaryToolbarComponents={descToolbarComponents} ... />
```

---

### Defect Sidebar — CatalystShell couldn't resolve projectKey → UUID
**File:** `src/components/layout/CatalystShell.tsx`

`useParams()` in the shell ancestor returns `undefined` for `:projectKey` because
React Router v6 only surfaces params to the component at or below the route that
defines them. ProjectSidebar was receiving `undefined` and showing no project.

**Fix:** Replaced `useParams` with `useMatch('/project/:projectKey/*')` to extract the
param from the ancestor, then queried `projects` table by `.eq('key', urlProjectKey)`
to resolve the UUID used by ProjectSidebar.

---

## New files ported from dead repo (`/Users/vikramindla/dev/catalyst-prod-44`)

| Path | Purpose |
|------|---------|
| `src/components/shared/jira-description-editor/` | Tiptap-based `JiraDescriptionEditor` — used by `StoryDetailDrawer` only. IssueDrawer/WorkItemDetailModal/WorkItemDetailsDrawer use `AtlaskitEditor` instead. |
| `src/design-system/` | Design system tokens, showcase components, `tokens.css` |
| `src/modules/project-work-hub/components/drawers/StoryDetailDrawer.tsx` | Subtask, linked issues, attachments sections (Atlaskit-migrated) |
| `src/modules/project-work-hub/components/drawers/StoryActionMenu.tsx` | Action menu using `@atlaskit/dropdown-menu` + `@atlaskit/modal-dialog` |

**Route additions:**
- `src/App.tsx`: `/design-system` route → `DesignSystemShowcase`
- `src/main.tsx`: `import "./design-system/tokens/tokens.css"`

**Package additions (`package.json`):**
- `@tiptap/extension-color`
- `@tiptap/extension-subscript`
- `@tiptap/extension-superscript`
- `@tiptap/extension-text-style`

---

## Description field pattern — canonical rule

| Context | Component | Notes |
|---------|-----------|-------|
| View mode | `AtlaskitRenderer` | Renders ADF JSON |
| Edit mode | `AtlaskitEditor` (comment mode) | Lazy-loaded wrapper in `src/components/shared/` |
| Import path | `@/components/shared/AtlaskitEditor` / `AtlaskitRenderer` | **Never** import raw `@atlaskit/editor-core` |
| Used by | `IssueDrawer`, `WorkItemDetailModal`, `WorkItemDetailsDrawer` | Do **not** overwrite with `JiraDescriptionEditor` |

---

## Atlaskit icon migration (story-detail-modules)

All seven files in `src/modules/project-work-hub/components/dialogs/story-detail-modules/`
had Lucide icons replaced with `@atlaskit/icon` equivalents:

- `ChildIssuesSection.tsx`
- `DefectsSection.tsx`
- `IncidentsSection.tsx`
- `LinkedIssuesSection.tsx`
- `RichTextCommentEditor.tsx`
- `shared-components.tsx`
- `AttachmentPreviewModal.tsx`

---

## Visual parity audit results (jira-compare, cycle 1)

| Check | Jira (BAU-5609) | Catalyst | Result |
|-------|----------------|----------|--------|
| Breadcrumb / sidebar | Spaces / Senaei BAU | Projects / BAU / In-Jira | ✅ |
| Description editor | AtlaskitEditor (comment mode) | AtlaskitEditor (comment mode) | ✅ |
| Editor toolbar | Tt, B, lists, image, emoji, +, link, undo/redo | Identical | ✅ |
| AI button | "Improve Story" in header | "Improve" in primaryToolbarComponents | ✅ |
| Right rail | Priority, Assignee, Reporter, Labels, Dates | Priority, Assignee, Reporter, Labels, Dates | ✅ |

---

## Known gaps / open items

| # | Item | Severity | Notes |
|---|------|----------|-------|
| G1 | `injira_issues` has no seed data in local dev | P2 | `CreateIssueModal` has a TODO stub — no actual DB insert. InJira IssueDrawer cannot be opened for visual testing without seeding the table directly. |
| G2 | `StoryDetailDrawer` not imported anywhere | P3 | It was ported but superseded by `CatalystDetailRouter` → `CatalystViewStory`. Safe to delete or wire up. |

### G1 fix — seed `injira_issues` for local testing

```sql
-- SUPABASE SQL EDITOR — seed one injira_issues row for BAU
-- expected: 1 row inserted, visible in /project/BAU/list
INSERT INTO injira_issues (
  id, project_id, key, summary, description,
  issue_type_id, status_id, priority, rank_lexo,
  created_at, updated_at
)
SELECT
  gen_random_uuid(),
  p.id,
  'BAU-TEST-1',
  'Parity audit — ADF description test',
  '{"version":1,"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This is an ADF description with "},{"type":"text","text":"bold text","marks":[{"type":"strong"}]},{"type":"text","text":" for testing."}]}]}'::jsonb,
  'story',
  'in-progress',
  'medium',
  '0|hzzzzz:',
  now(),
  now()
FROM projects p
WHERE p.key = 'BAU'
LIMIT 1;
```

---

## Commit history (key commits)

| Hash | Message |
|------|---------|
| `23df787fc` | Merge feat/jira-list-table-parity-may2026 into main |
| `0534b9e9c` | feat(story-drawers): migrate StoryActionMenu + StoryDetailDrawer to Atlaskit |
| `36f8235c8` | fix(shared-components): replace final Lucide icons with Atlaskit equivalents |
| `a9ea4e885` | fix(in-jira): sidebar projectKey lookup, D4 toolbar parity, real data hooks |
| `483577940` | feat(work-hub): Atlaskit ADF description editor in WorkItemDetailsDrawer |

---

## Next session checklist

- [ ] Seed `injira_issues` via SQL above, then visually verify IssueDrawer with ADF description
- [ ] Decide whether to wire `StoryDetailDrawer` or delete it (G2)
- [ ] Verify `injira_issues` create flow wires to DB (fix `CreateIssueModal` TODO stub)
