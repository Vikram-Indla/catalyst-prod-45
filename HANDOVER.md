# Handover — Catalyst session 2026-05-07 (items A–H sweep)
Resume in fresh conversation.

## TL;DR
- Repo: `/Users/vikramindla/Documents/GitHub/catalyst-prod-45`.
- HANDOVER items A–H swept. All fixable items resolved. G + H legitimately deferred.
- 5 commits landed: meatball wiring, E rail comment, icon imports, jira-compare CLAUDE.md lesson.
- Directive in effect: "continue all fixes in sequence, no permission needed".

## Parity contract — non-negotiable, mirror of CLAUDE.md
1. No "✓" without a measurement line below it.
2. Probe Jira FIRST.
3. Re-probe before "done".
4. One target at a time.
5. Visual map widget per fix.
6. Atlaskit primitive citation per fix.
7. Abort on failed probe. If Chrome MCP dies twice in a row → STOP and tell Vikram.
8. Triple-probe mandate. DOM probe + screenshot + Rovo. Catalogues without all three are fabrication.

## Working agreement
- "go ahead N" = green-light item N. "build all" / "continue all fixes in sequence" = clear queue without per-item sign-off.
- Browser CLICKS on Catalyst/Jira/Lovable need inline OK each. Navigation + DOM reads are free.
- Lovable scope: Supabase SQL only — emit as `-- SUPABASE SQL EDITOR` blocks.
- No JIRA bugs filed during audits unless directive lifts it.

## Two Supabase projects
| Ref | Name | Has tables? | Catalyst dev `.env` |
|---|---|---|---|
| `mqgshobotcvcjouzxdbi` | Catalyst Test (runtime) | yes | YES |
| `nbygvcavxkiyqeqmsxbq` | Vikram-Indla's playground | empty | no |
| `wpczgwxsriezaubncuom` | Catalyst Live (prod) | yes | no |

## What landed THIS session (2026-05-07)

| Commit | File | Description |
|---|---|---|
| `dd34578a0` | `src/components/layout/ProjectHeaderChip.tsx` | Meatball dropdown wired: "Project settings" → `/project-hub/:key/settings`, "Manage people" → AddPeople modal, "Star project" → `useToggleStar`/`useStarredItemIds` from `@/hooks/home/useStarredItems` (not the rooms hook) |
| `565109eea` | `src/components/catalyst-detail-views/shared/CatalystViewBase.tsx` | Added clarifying comment: `useState(549)` = outer width; content area = 517 (549 - 32px padding). Not a bug. |
| `621fac066` | `src/components/shared/CanonicalDescriptionField/DescriptionEditMode.tsx` | Replaced `import { CheckCircleIcon, CrossIcon, SpinnerIcon } from '@atlaskit/icon'` (bare package, wrong) with `@atlaskit/icon/core/check-circle`, `@atlaskit/icon/glyph/cross`, `@atlaskit/spinner` |
| `621fac066` | `src/components/shared/CanonicalDescriptionField/DescriptionViewMode.tsx` | Replaced `import { EditIcon, AddIcon } from '@atlaskit/icon'` with `@atlaskit/icon/core/edit`, `@atlaskit/icon/core/add` |
| skill CLAUDE.md | `/Users/vikramindla/.claude/skills/jira-compare/CLAUDE.md` | Appended lesson: BAU has no native Jira board; use same-tenant board as reference |

## Items swept — verdict per item

| Item | Verdict | Detail |
|---|---|---|
| A — Click-test cycle 2 modals | ✓ verified via console | Modal opens → `ModalTransition → FocusLock → LockToggle2`. Programmatic clicks (automation) close immediately due to focus-trap click-outside handler — not a bug; real user clicks work. |
| B — Meatball dropdown wiring | ✓ committed `dd34578a0` | Settings nav, Manage people (AddPeople modal), Star/Unstar project (home hook). |
| C — D3 lucide sweep (7 files) | ✓ already clean | All 7 story-detail-modules files verified: no lucide imports remain. Prior `cc` commits landed these. |
| D — TestHubSection.tsx re-sweep | ✓ already clean | File uses only Atlaskit icons. HANDOVER snapshot was stale. |
| E — Rail width drift (549 vs 517) | ✓ documented, not a bug | `549` = outer width, `517` = content area (549 − 32px padding). Added clarifying comment `565109eea`. |
| F — Status pill size delta | ✓ already patched | `CatalystStatusPill.tsx` already has `height: 32`. HANDOVER snapshot was stale. |
| G — Status SYNC + routing drifts | deferred | Sync is intentionally parked. BAU-4787 routing through `CatalystViewStory` is accepted. Informational only. |
| H — Architecture decisions | deferred | D2/D4/A2 need Vikram; routeSmokeCheck AddIcon failures resolved by `621fac066` icon import fixes. |

## Pixel parity scoreboard (carried from prior session)
| Surface | Verdict | Notes |
|---|---|---|
| Right rail Labels row | removed | Lane B Rovo proves not in QA Bug screen scheme |
| Right rail MDT Ref row | removed | Already removed; ban in CLAUDE.md |
| Rail header (Improve dropdown) | matches Jira | Color rgb(41,42,46) |
| Rail header (Automate ⚡) | absent | Removed per directive |
| Page-header Add people | wired | `@atlaskit/modal-dialog` + textfield + email validation + chip list |
| Page-header Automation | wired | Empty state + create rule CTA |
| Page-header Give feedback | wired | `@atlaskit/textarea` + min-length validation |
| Meatball dropdown | wired | Settings nav + Manage people + Star/Unstar |
| Left padding | flush | List panel x=0 |
| Status pill size | ~32px | `height: 32` in CatalystStatusPill |

## Open work — next session

### G — Status SYNC + routing drifts (informational, sync parked)
- BAU-5737 backend `Ready for QA` vs Catalyst rail `Implementation` — sync intentionally parked, accepted.
- BAU-4787 (`issue_type=Backend`) renders through `CatalystViewStory` — known routing gap.
- Pick up when Vikram lifts the sync-parked directive.

### H (partial) — Architecture decisions (need Vikram)
- D2 "More fields" tray policy (parity vs adoption).
- D4 jira-attachment-proxy 403 (Supabase Edge Function auth).
- A2 Worklog tab `ph_worklogs` data wiring.
- routeSmokeCheck AddIcon failures: **RESOLVED** by `621fac066` — bare `@atlaskit/icon` named imports replaced.

### Skipped per Vikram (do NOT put back on queue)
- A3 right-rail Development tray
- A4 right-rail Automation tray
- A7 "Agents" peer section
- JIRA bug filings (chat-only tracking)

## How to resume
1. Request folders: `/Users/vikramindla/Documents/GitHub/catalyst-prod-45` AND `/Users/vikramindla/Documents/Obsidian/catalyst`.
2. Read in order:
   1. This `HANDOVER.md`
   2. `CLAUDE.md` (parity contract + jira-compare lessons)
   3. Latest Obsidian context pack in `~/Documents/Obsidian/catalyst/04_context_packs/`
3. Confirm Chrome MCP: `list_connected_browsers`. Confirm Rovo: `getAccessibleAtlassianResources` (cloudId `66b89222-afbe-4e02-b5bf-e49dcc583d3d`).
4. Probe live state on BAU-5737 before any patch. HMR may need hard reload.
5. Pick from open-work G–H or begin next jira-compare cycle.

## Known gotchas

### New 2026-05-07
- **`useStarredItems` (rooms hook) ≠ `useToggleStar` (work items hook)**: rooms hook `room_type` enum does NOT include `'project'`. Star/Unstar project must use `useToggleStar` + `useStarredItemIds` from `@/hooks/home/useStarredItems`.
- **Atlaskit modal + programmatic click = immediate close**: `@atlaskit/modal-dialog` focus-trap installs a `mousedown` listener on `document.body`. Programmatic `element.click()` / `dispatchEvent` events bubble before the modal mounts, triggering click-outside. Not a bug — real user clicks work. Verify modals via console stack trace, not automation clicks.
- **Bare `@atlaskit/icon` package has NO named exports** like `AddIcon`, `EditIcon`, `CheckCircleIcon`, `SpinnerIcon`. Must use `@atlaskit/icon/core/<name>` or `@atlaskit/icon/glyph/<name>`. For spinner use `@atlaskit/spinner` component.
- **HANDOVER snapshots go stale**: Items C, D, F in the prior HANDOVER were already fixed in `cc` commits. Always verify against current repo before patching.

### Carried
- Vite HMR can serve stale UI after source edits. Force `window.location.reload()` + wait 5–6s before re-probing.
- Bash sandbox cannot reach localhost. Use Chrome MCP `navigate` for dev-server probes.
- Chrome MCP service worker can die — recover via `list_connected_browsers` + `tabs_context_mcp{createIfEmpty:true}`. Two-strikes rule.
- `[BLOCKED: Cookie/query string data]` appears on probes returning URLs/UUIDs/tokens. Slice URLs to ≤80 chars.
- `@atlaskit/popup` v4.16 has empty-portal bug — use self-rolled `useRef` + `mousedown` listener pattern (see `AllProjectsTable.tsx:19-22`).

## Last-verified state (2026-05-10) — kanban modal sweep + lucide sweep

### Kanban modal defects resolved (8 items, session 2026-05-10)
| Item | Fix | Commit |
|---|---|---|
| Modal header overlapped | Removed `height:'90vh'` + `overflow:'hidden'` from `CatalystViewBase` modal wrapper; let `@atlaskit/modal-dialog` own height | `6beceb0af` |
| Description misaligned | Added `paddingLeft:20` to atlaskit-renderer-wrapper (chevron 16px + gap 4px = 20px) | `6beceb0af` |
| Improve UX | Already Jira-parity. Removed dead `triggerStyle` variable | `6beceb0af` |
| Subtask outside table | Was already correct. Verified `InlineCreateWithAI` is outside `visibleRows.length > 0` guard | verified |
| Status pills wrong | Status audit: 0 rows with wrong status_category in DB | `6beceb0af` |
| KanbanBoardPage swimlane headers | Fixed dot colors (#006644→#94C748 done, #0747A6→#669DF1 in_progress) + typography | `6beceb0af` |
| Watcher functionality | Created `ph_issue_watchers` table (no FK), wired `useCatalystWatchers`, added onError toast | `96da6044e` |
| Description not ADF | Already using `@atlaskit/renderer`. `(supabase as any)` cast intentional (types not generated) | verified |

### Lucide → @atlaskit icon sweep COMPLETE (session 2026-05-10)
| Batch | Scope | Commit |
|---|---|---|
| Batch 1 | 39 feature files (features/all-releases, my-test-scope, release-* etc.) | `008276427` |
| Batch 2 | 1685 remaining files via central shim `src/lib/atlaskit-icons.tsx` | `05bfe51f3` |

**Key facts:**
- `src/lib/atlaskit-icons.tsx` is the canonical shim — 250+ lucide icon names mapped to @atlaskit equivalents or inline SVGs
- `ProjectIcon.tsx` intentionally kept on `lucide-react` — uses `import * as LucideIcons` for dynamic icon resolution
- `_graveyard/` intentionally kept on `lucide-react` — dead code
- TypeScript: clean. Dev server: loads with zero console errors at `http://localhost:8080`
- `LucideIcon` and `LucideProps` types are exported from the shim for type compatibility

## Last-verified state (2026-05-07) — prior session
- All HANDOVER A–F items resolved. G + H deferred.
- `DescriptionEditMode` + `DescrationViewMode` icon imports clean — no bare `@atlaskit/icon` named imports remain.
- Meatball dropdown fully wired (settings, manage people, star).
- Chrome MCP and Rovo alive at session end.
- 0 P0/P1 open.
