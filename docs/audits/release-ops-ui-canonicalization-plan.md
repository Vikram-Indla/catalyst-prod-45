# Release Ops — UI/UX Canonicalization Plan & Ledger

**Goal:** canonicalize the Release Ops visual layer against Catalyst canonical components (JiraTable / Project Board / ProjectPageHeader / canonical avatars / ADS tokens) — no functional change to P0–P10. Evidence pack: `~/Downloads/release_ops_ui_failure_screenshots/` (14 screens).

## Assessment (what the evidence actually shows)
The failure is **cell-renderers and presentation**, not table shells — the flagship tables already use canonical `JiraTable` (AllChangesPage, SopTemplatesPage, ProductionEventsPage, FreezeWindowsPage, AllReleasesPage). Real gaps:
1. **Status / risk / flag pills are hand-styled spans** (or `StatusLozenge` fallback → plain uppercase text) instead of the canonical `ads/Lozenge`. (screens 06/08/11/12/14)
2. **Release board card leaks a raw UUID** as the sub-key + uses a **grey generic avatar** instead of a face avatar; date shown as a red alarm pill. (screens 01/07)
3. **Timeline/Calendar/Execution read visually thin** (list-like, uncontrolled width/whitespace). (screens 03/04/05)
4. **Custom cockpit cards / people display** use `RH.*` inline styles, not canonical avatars/typography. (screens 02/09/13/14)
5. **No shared Release-Ops width/canvas rule** → pages feel sparse/stretched. (screens 04/05/07/14)

Breadcrumbs already use `ProjectPageHeader` on every Release-Ops page (canonical) — the "breadcrumb gaps" are title/typography, not the trail component.

## ⚠ Blocker for screenshot-verified iteration
As of 2026-07-06 the cyij staging Release-Ops demo data is **wiped** (0 releases / 0 changes / 0 production events) — cleared by concurrent TestHub-V2 staging work. Every surface now renders only its empty state, so the loop's Chrome-MCP before/after comparison cannot run until the P3–P9 demo dataset is re-seeded (releases + changes + SOP steps + sign-offs + overrides + issues + production events). Re-seed first, then run the loop.

## Work-list (prioritized) — screenshot → fix → file
| # | Screen | Fix | File(s) | Status |
|---|---|---|---|---|
| 06 | Change Records table | status/risk/flag → canonical `ads/Lozenge` | AllChangesPage.tsx + shared/ReleaseOpsLozenges.tsx | **DONE (iter 1)** — needs visual re-verify after re-seed |
| 01/07 | Boards | release card: show name/version+key not UUID; face avatar; date not alarm-pill | (release board) kanban card renderer; ChangeExecutionBoard card | TODO |
| 08/11/12 | SOP / Freeze / Prod-events tables | status/result/risk cells → canonical Lozenge | SopTemplatesPage, FreezeWindowsPage, ProductionEventsPage | TODO |
| 14 | Change Detail cockpit | canonical avatars (face), canonical status/risk lozenges, width canvas | ChangeCockpitSections, ChangeDetailPage | TODO |
| 02 | Release Detail | typography/page-header/avatars canonicalize | ReleaseDetailPage | TODO |
| 03/04/05 | Timeline/Calendar/Execution | enterprise canvas + width rule; timeline not a plain list | ReleaseTimelineOps, ReleaseCalendarPage, ExecutionCalendarPage | TODO |
| 09 | SOP template modal | width/typography/controls | CreateSopTemplateModal | TODO |
| 10/13 | Sign-off / Replay | title typography; width canvas | SignOffQueuePage, ProductionEventReplayPage | TODO |
| ALL | Shared width/canvas rule | one Release-Ops page-canvas wrapper (max-width + padding) applied everywhere | new shared component | TODO |

## Iteration 1 (this commit)
Added `src/components/releasehub/shared/ReleaseOpsLozenges.tsx` — `ChangeStatusLozenge` / `RiskLozenge` / `FlagLozenge` wrapping the canonical `ads/Lozenge` (which owns its ADS-token colours), replacing hand-styled status/risk/flag spans. Applied to the Change Records list. tsc + build + color/audit gates clean; typography/spacing baselines unchanged.

## Iteration 2 (workflow-driven, this commit)
Ran a 13-agent read-only analysis workflow (one agent per screen) → 45 concrete find/replace canonicalization edits + an ordered apply plan, applied by a single implementation agent (no parallel-edit conflict), then screenshot-verified.

**Shared:** added `RH.canvasMaxWidth = 1440` to `src/constants/releasehub.design.ts` (one centered page-canvas value, resolves the 1200-vs-1440 spec disagreement; 1440 fits the calendar 7-col month grid + quarter 3-up).

**Applied (13 files, 45 edits):** hand-styled status/risk/flag `<span>` pills → canonical `ChangeStatusLozenge` / `RiskLozenge` / `FlagLozenge` / `ads/Lozenge` (removed custom `Marker` / `RiskPill` / `StatusPill` / `HealthPill` components); `<h1>/<h3>` carrying `var()` token font-size → `<div role="heading" aria-level>` (typography scanner); removed `textTransform:'uppercase'` UPPERCASE offenders (Atlaskit Lozenge uppercases internally); snapped off-grid spacing to 4/8/12/16; face `CatalystAvatar` on people cells (Execution slots, Prod-events deployed-by, Sign-off/Replay approvers); shared centered `maxWidth: RH.canvasMaxWidth` canvas on detail/calendar pages. Removed now-unused imports (`StatusLozenge` on ChangeExecutionBoard, `AlertTriangle` on FreezeWindows).

**Gates:** tsc clean, build exit 0 (39651 modules), `lint:colors:gate` 0=baseline, `audit:ads:gate` all categories ≤ baseline — **typography ratcheted DOWN 1467→1454** (13 heading swaps), tokens 23723→23710; baseline committed.

**Screenshot-verified (cyij, meaningful data, no UUIDs):**
| Screen | Verified |
|---|---|
| Change Records (06) | status/risk/flag → canonical Lozenges |
| Change Board (07) | risk/flag Lozenges; lane headers title-case (uppercase removed) |
| Release Timeline (03) | DRAFT/IN READINESS/PLANNED status + EMERGENCY/EMPTY SCOPE flag Lozenges |
| Execution Calendar (05) | **status now readable ChangeStatusLozenge (was tint-only)** + FlagLozenges + face avatars on slots |
| Sign-off Queue (10) | Rejected/Pending/Approved Lozenges + face avatars (real names) |
| Change Detail cockpit (14/14b) | heading title, SCHEDULED/HIGH Lozenges, face-avatar owners, IN READINESS/PLANNED release Lozenges, contained width |

**Out-of-scope follow-ups (flagged by specs, NOT done — need data/hook or shared-component contract change):** Release Detail (02) manager/owner avatars need a profile-lookup hook; `FlagLozenge` Live/Late and `ChangeStatusLozenge` auto_approved color-map extensions are shared-component changes. No P0–P10 functional regression — presentation-only.
