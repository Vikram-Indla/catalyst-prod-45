LOVABLE PROMPT — bau-list-grouped (avatar strip + Add people CTA)

Context:
  Catalyst is migrating the BAU list page (route /project-hub/BAU/backlog?groupBy=status)
  to the Atlassian Design System. The current toolbar starts with Search → Filter
  → Group, then a flex spacer, then count + maximize. Jira's BAU list at
  https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list?groupBy=status
  has a visible LEFT cluster anchored to the toolbar start that Catalyst is missing:

      [Add people]  [avatar][avatar][avatar][avatar][avatar] [+7]   |   [Filter] ...

  The "Add people" button is a primary @atlaskit/button. The avatar strip is an
  @atlaskit/avatar-group (size="small", appearance="stack" or grid) populated with
  the project's team members. The "+N" overflow chip is the avatar-group's built-in
  overflow primitive — must carry aria-label "N more people" (per audit row P-A11Y #13).

  Canonical spec: https://atlassian.design/components/avatar-group
                  https://atlassian.design/components/button
  File in scope: src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx
  Toolbar block:  ~lines 1547-1646 (the <div> that wraps Search, JiraFilterAtlaskit,
                  GroupByControl, flex spacer, count, toolbarMaximizeIcon)

  CLAUDE CODE has separately patched the toolbar to split into two flex clusters
  (LEFT: Search/Filter, RIGHT: Group/Settings/More/count/maximize). The avatar
  strip + "Add people" button are the LEFT cluster's missing pieces — they sit
  BEFORE the Search input or BETWEEN the Filter and the flex spacer (Vikram to
  decide which placement is closer to Jira; both are acceptable).

Task:
  Add an @atlaskit/avatar-group + a primary "Add people" @atlaskit/button to the
  LEFT cluster of the BAU list toolbar. Population source: the existing
  `useTeamMembers` hook (src/hooks/useTeamMembers.ts) — pass each member's id,
  name, and resolved avatar URL (via `resolveAvatarUrl` from src/lib/avatars.ts).
  Cap at 7 visible avatars; everyone past 7 collapses into the +N overflow chip.

  "Add people" button click handler: open an @atlaskit/modal-dialog with a
  user-picker (deferred — wire to a stub `() => flag.info('Add people', 'Coming
  soon')` for now; real flow can ship in a follow-up).

Atlaskit-only mandate (hard):
  Every interactive element introduced must be an @atlaskit/* primitive.
    - avatar-group   → @atlaskit/avatar-group (already in package.json, v12.6.1)
    - avatar         → @atlaskit/avatar (already imported in this file)
    - button         → @atlaskit/button (already imported in this file)
    - modal-dialog   → @atlaskit/modal-dialog (already imported in this file)

  No bespoke Tailwind, no shadcn, no Radix, no custom hover states. Use ADS
  tokens for spacing (8/12/16) and typography (defaults).

Wiring acceptance criteria:
  - [ ] AvatarGroup renders ≤7 visible + a +N overflow chip when team count > 7.
  - [ ] +N chip has aria-label="<N> more people" (P-A11Y #13).
  - [ ] "Add people" button uses @atlaskit/button appearance="primary",
        spacing="compact", icon="add" (lucide Plus is acceptable as iconBefore).
  - [ ] Click on "Add people" fires flag.info() stub or opens modal — not dead.
  - [ ] Avatar group sits BEFORE the Filter pill OR before Search — match Jira.
  - [ ] On dark mode (NOCTURNE), avatars and button respect ADS dark theme tokens.
  - [ ] Tab order: Add people → first avatar → +N chip → Search → Filter.
  - [ ] No regression on existing toolbar elements (Search, Filter, Group,
        count, maximize, toolbarMaximizeIcon).

Adoption protocol (already satisfied — verify only):
  1. package.json — "@atlaskit/avatar-group": "^12.6.1" PRESENT.
  2. vite.config.ts — confirm '@atlaskit/avatar-group' is in optimizeDeps.include.
  3. Import canonically: `import AvatarGroup from '@atlaskit/avatar-group';`

Audit row reference: P0 #1 in
  .catalyst/audits/jira-compare/2026-04-27-bau-list-grouped.md
