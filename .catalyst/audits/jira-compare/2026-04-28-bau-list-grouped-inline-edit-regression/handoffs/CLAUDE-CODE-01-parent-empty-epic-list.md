CC TASK BRIEF — Investigate empty Epic list on Parent picker

File:   src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx
Change: Trace the `options` array passed to `makeParentEditCell` and verify
        whether BAU genuinely has no Epics, or whether a filter (project
        scope, status, or row-mapping) is silently dropping them.
Reason: Parent popover on BAU-5671 renders only the "No parent" sentinel
        with `filtered.length === 0` — meaning BacklogPage is passing an
        empty options array. Jira's parent picker on the same row should
        be the source of truth; if Jira shows Epics there, Catalyst is
        missing data; if Jira also shows none, the empty state should be
        cleaned up to read "No epics in this project" instead of just
        "No parent" + "No matches".
Spec:   https://atlassian.design/components/popup
        Audit row: P1 #1 in
        .catalyst/audits/jira-compare/2026-04-28-bau-list-grouped-inline-edit-regression.md

Acceptance:
  - [ ] Read the `options` array source in BacklogPage.atlaskit.tsx —
        identify which query/loader feeds it.
  - [ ] Cross-check with Jira parent picker on BAU-5671 (open the same
        cell on https://digital-transformation.atlassian.net/.../BAU/list).
  - [ ] If BAU has Epics: fix the loader's filter.
  - [ ] If BAU has no Epics by design: leave the loader alone, but
        improve the empty-state UI in `makeParentEditCell` to render
        "No epics in this project" instead of relying on the
        `filtered.length === 0` "No matches" branch (which is meant for
        empty *search results*, not empty *options*).
  - [ ] No regression to inline-edit popover wiring.
