# CONTEXT HANDOFF — /jira-compare continuation

**Surface:** /project-hub/BAU/backlog
**Iteration state:** iter-9 patches all on disk; live verification blocked behind FUSE-mount inotify gap
**Catalyst route:** http://localhost:8080/project-hub/BAU/backlog
**Jira route:** https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list?sortBy=key&direction=DESC
**Scope:** BAU backlog list-view header, columns, group-by toolbar, detail side panel.

## Files & folders to read FIRST in the new conversation

```
.catalyst/audits/jira-compare/2026-04-26-bau-backlog.md           ← full audit report
.catalyst/audits/jira-compare/2026-04-26-bau-backlog/F13-root-cause.md
.catalyst/audits/jira-compare/2026-04-26-bau-backlog/patches/iter9-F14.md
.catalyst/audits/jira-compare/2026-04-26-bau-backlog/patches/iter9-F8-F9-F10.md
.catalyst/audits/jira-compare/.probes/2026-04-26-bau-backlog/jira-iter1.json
.catalyst/audits/jira-compare/.probes/2026-04-26-bau-backlog/catalyst-iter8-post-l20.json
.catalyst/audits/jira-compare/.probes/2026-04-26-bau-backlog/targets-correction.md
.catalyst/audits/jira-compare/lessons.local.md
```

## Open findings (priority order)

| # | Tag | Status | Action needed |
|---|-----|--------|---------------|
| F11 | [CLAUDE CODE] | disk ✅ / live ❌ | Vikram: clean restart + cmd-shift-r → re-probe color resolves to rgb(107, 110, 118) |
| F14 | [CLAUDE CODE] | disk ✅ / live ❌ | Vikram: same restart → click row 2-N, verify inline edit works + queueWriteBack row created |
| F10 | [CLAUDE CODE] | disk ✅ / live ❌ | Vikram: same restart → verify group-by dropdown is @atlaskit/select |
| F8 | [CLAUDE CODE] | disk ✅ / live ❌ | Vikram: same restart → verify caret column gone |
| F9 | [CLAUDE CODE] | disk ✅ / live ❌ | Vikram: same restart → verify Type column ~108px |
| F13 | [DBA] | root-caused | Data migration: catalyst_issues rows → ph_issues. Verify with: `SELECT id FROM ph_issues WHERE id='<BAU-1 id>';` vs `SELECT id FROM catalyst_issues WHERE id='<BAU-1 id>';` |
| F12 | deferred | P2 polish | Card radius 6px → 8px; border thickness +0.45px |

## Disk edits to land (single restart picks up all five)

```
src/components/shared/JiraTable/JiraTable.tsx
  line 499: color: #6B6E76 (F11)

src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx
  line 22: + import { jiraSyncService } from '@/services/jira-sync.service';
  line 26: + import Select from '@atlaskit/select';
  lines ~352-410: updateField.mutationFn (writes ph_issues + queueWriteBack)
  lines ~818-829: __caret column object removed (F8)
  line ~833: width 3 → 9 (F9)
  line ~894: canEdit () => true (F14)
  lines ~1202-1226: native select → @atlaskit/select (F10)
```

## Cleanest unstick recipe (Vikram in his terminal)

```bash
pkill -9 -f vite
pkill -9 -f 'node.*8080'
sleep 1
ps aux | grep -E 'vite|node' | grep -v grep    # confirm zero matches
rm -rf node_modules/.vite node_modules/.vite-temp
# Cmd+S each file in your editor to fire native inotify (insurance)
npm run dev
```

Then in browser: hard-reload (Cmd+Shift+R) and walk the Acceptance
checks at the bottom of the audit report.

## Known issue carried forward

The cowork sandbox's FUSE mount has an inotify-propagation gap that
sometimes leaves Vite serving stale modules even after a "successful"
restart. When this recurs (probe shows pre-edit values, disk has
post-edit values), apply the L20 nuclear protocol but ALSO have Vikram
Cmd+S the affected files in his editor — the native macOS save event
fires inotify in a way the sandbox Edit doesn't.

## Wiring recorder (Phase 8 — to run after iter-9 lands live)

1. Click row BAU-1 key cell → expect detail panel with breadcrumb +
   body. Body present = F13 closed via data migration.
2. Click row BAU-5609 (Jira-sourced) summary text → expect inline edit
   to enter (input rendered).
3. Type "TEST iter-9 verify <timestamp>", blur → expect:
   - Toast: "Updated · Change queued for Jira sync approval"
   - Row in `jira_write_back_queue`: `(ph_issue_id=<row id>, field_name='summary', new_value='TEST...')`
   - `pending_write_back_at` stamped on `ph_issues` for that row.
4. Refresh page → edited summary persists (because `useBacklogData`
   reads from `ph_issues`, where F14's mutationFn now writes).
5. Group-by dropdown — open it, select "Status" → table groups by
   status; chevron animates; uses Atlaskit Select styling.

## START the new conversation with

> /jira-compare — continue from handoff. Read the audit at
> `.catalyst/audits/jira-compare/2026-04-26-bau-backlog.md` and the
> handoff at `.catalyst/audits/jira-compare/2026-04-26-bau-backlog/CONTEXT-HANDOFF.md`,
> then resume Phase 8 (wiring test) once Vikram confirms the iter-9
> patches have landed live.
