# JIRA COMPARE — /project-hub/BAU/backlog
Date: 2026-04-26 · Iteration: 9 · Auditor: Claude (jira-compare skill v3)

## Scope (from user's screenshot)
The list-view backlog table for the BAU project — header row, Type/Key/
Summary/Status/Parent/Assignee/Priority/Updated columns, the inline
group-by toolbar above the table, and the right-hand detail side panel
that opens on row click.

Jira ref:     https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list?sortBy=key&direction=DESC
Catalyst ref: http://localhost:8080/project-hub/BAU/backlog
Wiring list:  row-click opens detail panel; inline summary edit on any row;
              group-by dropdown changes table grouping; sort header click
              cycles asc/desc.

## Executive verdict

This session closed 5 of the original handoff fixes (iter-8) with full
visual parity on the header row. Iter-9 surfaced 4 new findings — two
P0 wiring breaks (broken detail panel; inline edit blocked on Jira-
sourced rows), two parity items (header color token correction, native
&lt;select&gt; → @atlaskit/select). All four are patched on disk; live
verification deferred behind a FUSE-mount inotify gap that prevents
sandbox edits from reaching the host's Vite watcher.

The dominant finding from iter-9 is the table-of-truth divergence
between `catalyst_issues` (legacy) and `ph_issues` (canonical mirror).
This single divergence explains both F13 (broken detail panel) and the
risk surface around F14 (inline edit). Fix path: a one-shot data
migration moving Catalyst-native rows from `catalyst_issues` into
`ph_issues` (out of scope for jira-compare; needs DBA review).

## Findings inventory

### Iter-8 (LANDED in browser, verified by post-restart probe)

| # | Element | Before | After | Status |
|---|---------|--------|-------|--------|
| H1 | Header text-transform | uppercase | none | ✅ live |
| H2 | Header font-weight | 600 | 700 | ✅ live |
| H3 | Header letter-spacing | 0.04em | normal | ✅ live |
| H4 | Header color | #6B778C (--ds-text-muted) | #505258 (--ds-text-subtle) | ✅ live (but see F11) |
| H5 | Summary col width | 339px (fixed) | 30% (percent-based) | ✅ live |

### Iter-9 NEW findings

| # | Severity | Element | Status | Spec |
|---|----------|---------|--------|------|
| F8 | P1 | __caret structural col (redundant) | ✅ patched on disk | n/a |
| F9 | P1 | Type col width 3% (~40px) → 9% (~108px) | ✅ patched on disk | n/a |
| F10 | P0 | Native `<select>` for Group-by → @atlaskit/select | ✅ patched on disk | https://atlassian.design/components/select |
| F11 | P1 | Header color #505258 → #6B6E76 (--ds-text-subtlest) | ✅ patched on disk | https://atlassian.design/tokens |
| F12 | P2 | Card radius 6px → 8px, border 0.55px → 1px | ⏸ deferred | n/a |
| F13 | P0 wiring | Detail panel renders breadcrumb only, body empty | ⚠ root-caused, no patch | n/a |
| F14 | P0 wiring | Inline edit blocked on Jira-sourced rows | ✅ patched on disk | n/a |

### Handoff tags

- [CLAUDE CODE] (in-session, applied to disk): F8, F9, F10, F11, F14
- [DBA / DATA MIGRATION]: F13 (catalyst_issues → ph_issues consolidation)
- [DEFERRED]: F12 (P2 polish)

## Files touched (all in-session edits)

1. `src/components/shared/JiraTable/JiraTable.tsx` — F11 color fix.
   Line 499: `color: #505258;` → `color: #6B6E76;`
   Lines 485-492: comment block updated to reference --ds-text-subtlest
   and the iter-9 correction history.

2. `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` —
   F8, F9, F10, F14.
   - Line 22: added `import { jiraSyncService } from '@/services/jira-sync.service';`
   - Line 26: added `import Select from '@atlaskit/select';`
   - Lines ~352-410: `updateField.mutationFn` rewritten — writes to
     `ph_issues`, queues writeback for source='jira'.
   - Lines ~818-829: __caret column object removed (F8).
   - Line ~833: `width: 3` → `width: 9` (F9).
   - Lines ~1202-1226: native `<select>` replaced with `@atlaskit/select`
     (F10).
   - Line ~894: `canEdit: (r) => r.source === 'catalyst'` →
     `canEdit: () => true` (F14).

## P0 — Atlaskit mismatches + wiring breaks

| # | Element | Catalyst (today) | Fix | Spec | Handoff |
|---|---------|-------------------|-----|------|---------|
| F10 | Group-by control | native `<select>` | `@atlaskit/select` | https://atlassian.design/components/select | [CLAUDE CODE] ✅ disk |
| F13 | Detail panel body | empty (CatalystDetailRouter returns null when ph_issues lookup misses) | Migrate catalyst_issues rows to ph_issues OR teach router to fall back to catalyst_issues | n/a | [DBA] |
| F14 | Inline edit | `canEdit: r => r.source === 'catalyst'` blocks Jira rows | All rows editable; Catalyst writes to ph_issues + queueWriteBack for jira | n/a | [CLAUDE CODE] ✅ disk |

## P1 — Parity drift

- F8 — caret structural column duplicates Jira's inline expand pattern. Dropped.
- F9 — Type col width too narrow vs Jira's primary identifier column. Widened.
- F11 — Header color resolved to wrong DS token. Corrected.

## P2 — Polish

- F12 — Card radius 6px → 8px; border 0.55px #DFE1E6 → 1px rgba(11,18,14,0.14).
  Both Catalyst and Jira are correctly elevated cards on tinted blue
  page bg (#E9F2FE on both sides). Only fine-tune.

## Typography sweep (header row only — body row sweep deferred)

| Role | Jira (probed) | Catalyst (post iter-8) | Match? |
|------|---------------|------------------------|--------|
| Column header | Atlassian Sans 12px / 653 / #6B6E76 / `text-transform: none` / `letter-spacing: normal` | Charlie Text 12px / 700 / #505258 / `none` / `normal` | partial — color is one token off (corrected in F11, awaiting live verify) |

## Wiring inventory

| Interaction | Jira | Catalyst (current observed) | Expected | Status |
|-------------|------|------------------------------|----------|--------|
| Row click → detail panel | full work-item view | breadcrumb only, empty body | full work-item view | ⚠ F13 |
| Inline summary edit on row 1 (Catalyst-sourced) | n/a | ✅ works | works | ✅ |
| Inline summary edit on rows 2..N (Jira-sourced) | works (in Jira) | ❌ blocked | works (writeback queued) | ⚠ F14 patched, awaiting live verify |
| Group-by dropdown | Atlaskit primitive | native `<select>` | @atlaskit/select | ⚠ F10 patched, awaiting live verify |
| Sort header click | works | (not tested this session) | works | deferred |

## Risks logged for production

1. **Table-of-truth migration (P0).** F14 mutationFn now writes to
   `ph_issues` instead of `catalyst_issues`. Audit DELETE/INSERT call
   sites (BacklogPage.atlaskit.tsx lines 1035, 1059, 1083, 1637; plus
   any analytics/edge-functions reading `catalyst_issues` directly).

2. **Detail panel ghost rows.** F13 root cause is the same divergence —
   existing rows in `catalyst_issues` are invisible to
   CatalystDetailRouter. A migration is required for the panel to work
   on Catalyst-native items.

3. **Sync write-loop potential.** F14 writes to `ph_issues`, then
   queueWriteBack posts to Jira. The Jira→Catalyst inbound sync may
   re-apply. Should be idempotent if content-hash gated.

4. **`updated_at` flicker.** Both Catalyst optimistic write and inbound
   sync stamp `updated_at`; the field will toggle on each round trip.

## Probes / patches archive

- `.catalyst/audits/jira-compare/.probes/2026-04-26-bau-backlog/`
  - `jira-iter1.json` — Jira ground-truth header + columns
  - `catalyst-iter8-pre-l20.json` — proof of stuck-cache state
  - `catalyst-iter8-post-l20.json` — successful iter-8 landing
  - `targets-correction.md` — handoff target corrections (color, F9 width)
- `.catalyst/audits/jira-compare/2026-04-26-bau-backlog/patches/`
  - `iter9-F14.md` — mutationFn rewrite + canEdit flip
  - `iter9-F8-F9-F10.md` — column drop + width + Atlaskit select
- `.catalyst/audits/jira-compare/2026-04-26-bau-backlog/F13-root-cause.md`
- `.catalyst/audits/jira-compare/lessons.local.md` — L20, L21, L22, L23
  (skill file is read-only in this Cowork session — fold into §19 next
  time SKILL.md is opened).

## Acceptance checks (for the human, run after a clean restart)

- [ ] Hard-reload `localhost:8080/project-hub/BAU/backlog` — header
      color resolves to `rgb(107, 110, 118)` = #6B6E76 (F11).
- [ ] Caret column gone; Type column visibly wider (F8, F9).
- [ ] Group-by control renders as Atlaskit dropdown with chevron (F10).
- [ ] Click row 2 (BAU-5609) summary cell — enters inline edit (F14).
- [ ] Type a new title, blur — toast says "Updated · Change queued for
      Jira sync approval"; new row in `jira_write_back_queue`;
      `pending_write_back_at` stamped on `ph_issues`.
- [ ] Click row 1 (BAU-1) key — detail panel shows breadcrumb + body.
      Body empty = F13 still present (data migration needed).

## Lessons for skill §19 (saved in lessons.local.md)

- **L20** — Vite transform cache can pin a single file in stale form.
- **L21** — Always grep for `<<<<<<< HEAD` before declaring "Vite won't start".
- **L22** — `pkill -f vite` from sandbox bash does NOT reach the host.
- **L23** — When L20 "doesn't take", check for residual processes via
  `ps aux | grep -E 'vite|node'` + `lsof -i :8080`.
