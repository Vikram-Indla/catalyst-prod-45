# CAT-SPRINTS-NATIVE-20260702-002 — UI/UX Review

> Critic report: `agents/A3_uiux_critique.md`. Wireframes below are the POST-critique blueprint (supersede the 13_COUNCIL_VERDICT.md sketches).

## ADS compliance scores (A3, 2026-07-02, pre-implementation)
- List page **7/10** · Create modal **6.5/10** · Detail right rail **7.5/10** · Sprint report **6/10**

## Critique rulings applied (deltas vs council sketches)
1. **Ribbon killed** — sprint length = RadioGroup in modal; `default`-appearance Lozenge next to name everywhere else. Max 2 lozenges per list row.
2. **Month group headers** — JiraTable group-rows, sentence case "January 2026 · 3 sprints"; no ALL-CAPS, no custom header band.
3. **Modal** — @atlaskit/modal-dialog + @atlaskit/form (component-owned spacing/footer); **Owner** person-picker (creator default; D-001); auto-name preview = read-only field recomputing live.
4. **Detail header pill** — statusPalette SUBTLE tier; new statuses map onto the existing six appearances; zero new colors outside statusPalette.ts.
5. **Right-rail card geometry** — padding 16 / gap 16 / inner 8 / tight 4; section labels font-size-200/700 uniformly.
6. **Report restraint** — ungated analytics render as ABSENCE (no skeletons/placeholders); late-add flag = `moved` lozenge (not danger); approval trail = avatars + lozenge + relative time (no custom timeline widget); "Added after start" = compact JiraTable.
7. Overdue sprint-end dates = `var(--ds-text-danger)` plain text (structure adopted from Jira DOM probe; vocabulary ours).

## Blueprint wireframes (v2 — ADS-refined)

### L1 — Sprint list (`/project-hub/:key/sprints`)
```
[⬢] Senaei BAU / Sprints                                  (ProjectPageHeader, auto crumb)
[🔍 Search sprints] [Status ▾ multi] [Group: Month ▾]              [Create sprint]
──────────────────────────────────────────────────────────────────────────────
▾ January 2026 · 3 sprints                       (JiraTable group row, sentence case)
  Sprint                        Status              Progress       Start      Sprint end   Release        Owner  ⋯
  BAU-Sprint 1.1 - 08 Jan 26 [1W]  [Active]         ▓▓▓▓░░ 12/18   04 Jan 26  08 Jan 26   R-2026.01      (JK)   ⋯
  BAU-Sprint 1.2 - 15 Jan 26 [1W]  [Awaiting approval] ▓▓▓▓▓▓ 9/9  11 Jan 26  15 Jan 26   R-2026.01      (JK)   ⋯
  Hotfix-KYJ [2W]                  [Planning]       —              18 Jan 26  29 Jan 26   —              (VI)   ⋯
▸ February 2026 · 2 sprints
```
Removed: Description column, Project dropdown, density/hide menu. Status filter = multi-select checkboxes (Planning/Active/Awaiting approval/Completed/Canceled/Archived; archived unchecked by default). Contextual inline action ("Start sprint" / "Complete sprint") on eligible rows. Overdue Sprint end → danger text.

### Create sprint modal (@atlaskit/modal-dialog + form)
```
Create sprint                                                          ✕
Sprint name          (●) Auto   ( ) Custom
[ BAU-Sprint 1.2 - 15 Jan 26 ]  ← read-only in Auto, recomputes live; [1W] lozenge inline
Sprint length        (●) 1 week   ( ) 2 weeks          (RadioGroup)
Start date           [Sun 11 Jan 2026 ▾]     Ends Thu 15 Jan 2026 (computed, subtle text)
Owner                [(avatar) Jahanara Khan ▾]        (defaults to creator)
Link to release      [Select a release (optional) ▾]
Definition of done   ▸ expand — per-type rows: Story→Done ▾ · Defect→Ready for Prod ▾ …
Sprint notes         [optional …]
                                                     [Cancel]  [Create]
```

### L2 — Detail right rail (config-driven ReleaseSidePanel)
```
[ Active ▾ ]  [1 week]                       (SUBTLE status pill + default lozenge)
Start 11 Jan 26      Sprint end (Thu) 15 Jan 26
Release  R-2026.01 · releases 30 Jan 26      (from Release Hub via ph_release_sprints)
Owner    (avatar) JK        Created 02 Jul 26, 14:32
Contributors  (YD)(NA)(AM)                   (avatar-group)
── Approvals ───────────── policy: All ── +
  (VI) Vikram    [Approved]   14 Jan, 15:02
  (JK) Jahanara  [Pending]
── Sprint health ──  [CatyPulse ▸]           (aria-disabled + tooltip until gates pass)
```

### Sprint report (gated sections render as absence until proofs pass)
Approvals trail (avatars+lozenge+time) · Dependencies (existing kit) · Added-after-start (compact JiraTable, `moved` lozenge) · Time-in-status per item/status/person (TimeInStatus widgets — gated) · Efficiency vs last sprint (gated).

## Violations found (pre-existing, in-scope to fix)
- ReleasesTable hand-rolled `<table>` on the sprint list (JiraTable rule).
- ReleaseDetailPage L2 shell uses raw divs, not AtlaskitPageShell flush (CRE).
- Release status vocabulary (released/unreleased) on sprint surfaces.
- useSprintBySlug queries nonexistent deleted_at; SPRINT_CONFIG hand-concatenates URLs (slug contract).

## Visual acceptance status
PENDING — checklist in 10_SCREENSHOT_CHECKLIST.md + agents/A7_qa_validation.md §1; ratchet gates (`lint:colors:gate`, `audit:ads:gate`) block regressions.
