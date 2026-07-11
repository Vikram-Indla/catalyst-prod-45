# Drift log

## Drift 1 — "On hold" is not a real status_category (2026-07-08)
Plan Lock / Decision log assumed a 4th bucket "On hold". Checked `ph_issues.status_category`
(useForYouData.ts:474) — real data is standard 3-value Jira model: todo / indeterminate / done.
"On Hold" is a literal STATUS name inside the `indeterminate` (in-progress) category, same category
as "Ready for development". Bucketing it separately would require hardcoding a status-name list —
a zero-assumption violation (CLAUDE.md).
**Resolution:** 3 real category buckets (To do / In progress / Done-behind-"Show completed" toggle,
unchanged). Literal status preserved as row meta text (`· On Hold`) when it differs from the bucket
label — zero information loss, matches the lock's own "unknown category → own bucket, never a lie"
tie-breaker. Not re-blocking on approval: reversible, one file, screenshot gate still applies before
final accept.

## Drift 2 — PresenceRing has no "offline" state; finding was built on a stale comment (2026-07-08)
Plan Lock file 4 target: `PresenceRing.tsx` offline amber → gray. Checked `src/lib/presence.ts` (source
of truth for `PresenceState`): the real, live model is `on_set` (green) / `remote` (blue) / `away`
(amber) / `on_leave` (dashed blue). There is no `offline` state — `PresenceRing.tsx`'s own doc comment
(lines 24-29, describing available/busy/offline/on_leave with amber-for-offline) is stale, left over
from a defunct 5-state design. My original critique finding (and the CEO mockup's amber ring) was
built on that stale comment, not on code that runs.
**Resolution:** SKIP this file. Amber-for-`away` is a legitimate, single-purpose signal (not a
duplicate of anything else on screen) — repainting it gray would remove real information to satisfy
a bug that doesn't exist in the live component. Task marked no-change-needed, not done. No code touched.

## Drift 5 — StatusLozenge weight-653 is a canonical shared component, out of scope (2026-07-08)
Slice 2 lock said "fix weight 653 in StatusLozenge.tsx too". Reading the file before editing: its own
doc comment says it's the "CANONICAL status pill... single source of truth... For You rows, detail
headers, dropdowns, tables, cards" and that 653 was chosen because it's "Matches Jira's For You row
pill (DOM-probed 2026-04)" — a deliberate, evidence-based value, not an accidental hardcode like the
ForYouPage h1's. Changing it would restyle every status pill on every hub, far outside a Home-scoped
noise cut, and reverses a documented probe decision without re-probing.
**Resolution:** SKIP StatusLozenge.tsx. Fix only `ForYouPage.atlaskit.tsx`'s h1 (single-use, Home-only,
plainly just a copy-paste of the same number with no probe rationale attached).

## Drift 6 — tab-badge shape split is Jira-parity, not inconsistency (2026-07-08)
Slice 2 lock said unify all 3 tab badges to one borderRadius. Reading `ForYouTabs.tsx` before editing:
inline comment states "Jira parity: ageing + assigned use square badges (borderRadius 2px), all
others use the pill treatment (borderRadius 999)" — a documented, probe-verified match to real Jira's
own For You tab strip (assigned-blue bg cites a 2026-05-29 probe specifically). This is the opposite
of noise: it's deliberate Jira-accuracy. Unifying the shape would make Catalyst *less* like Jira, not
calmer than it — actively fighting documented intent.
**Resolution:** SKIP ForYouTabs.tsx. No shape change. Original critique finding assumed inconsistency
without checking whether it was intentional — third time this session a finding didn't survive a
read of the actual file (see Drift 2, Drift 4). Pattern: verify against code before assuming a
screenshot-level observation is a bug.

## Drift 3 — concurrent-session foreign edits detected in shared checkout (2026-07-08)
Post-implementation `git status` shows 3 modified files never touched this session, beyond the
already-known-foreign `ChangeCockpitSections.tsx`: `src/components/ja/CreateDropdown.tsx`,
`src/components/releasehub/foryou/ReleaseOpsForYouSection.tsx`,
`src/components/workhub/create-story/CreateStoryModal.tsx`. Another session is actively editing this
shared checkout right now (CLAUDE.md concurrent-sessions hard-stop). **Not staged, not committed,
not read.** Only the 6 files in the Plan Lock's file list will ever be staged for this feature.
