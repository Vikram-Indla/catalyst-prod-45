# Preflight handover — Home / For You page overhaul — 2026-05-10

## Context
- Surface: `cross-cutting` (ui-bug-fix + ui-feature + ui-refactor + design-only)
- Tier: **high-stake**
- Started: 2026-05-10
- Status: **SESSION COMPLETE — all plan rows executed**
- Council ran: no (abridged 3-advisor)
- Jira probe reference: https://digital-transformation.atlassian.net/jira/for-you

---

## Phase 0 — Bootstrap gates (verbatim)

> **TDD non-negotiable (CLAUDE.md):** Write a failing test first. Write minimal code to pass it. Refactor only after green.

> **Small steps (CLAUDE.md):** After every single logical change — stop, explain, suggest commit, await confirmation.

> **ADS-only (CLAUDE.md 2026-04-28):** All dark/light theme values must come exclusively from Atlaskit tokens. No raw hex, no custom theme libs.

> **Ask before add/remove (CLAUDE.md 2026-05-04):** Before adding any field/component a user would see, or removing anything — STOP and explicitly ask Vikram.

> **jira-compare gate (CLAUDE.md 2026-05-04):** Any UI feature must pass jira-compare before declared done.

> **JiraIssueTypeIcon (CLAUDE.md 2026-05-09):** Never use coloured dots/squares for work item type.

> **Anti-pattern #18 (CLAUDE.md 2026-05-05):** Before adding any field, probe getJiraIssueTypeMetaWithFields.

---

## Phase 0.5 — Design Intelligence Brief

### Defect inventory (code-audited)

| # | ID | Severity | Status |
|---|---|---|---|
| 1 | **F1-CRITICAL** | P0 | ✅ Fixed — AgeingPanel uses openDetail, not navigate('/issues/:key') |
| 2 | **F2-HIGH** | P0 | ✅ Fixed — RecommendedProjectsStrip navigates to /project-hub/projects |
| 3 | **L1-HIGH** | P1 | ✅ Fixed — HomeSidebar renders projectKey ('BAU'), not projectName |
| 4 | **L2-MEDIUM** | P1 | ✅ Fixed — HomeSidebar uses section-specific Lucide icons, not ProjectIcon ghost |
| 5 | **R1-HIGH** | P1 | ✅ Fixed — RecommendedProjectsStrip sorts by visitedAt (recency-first) |
| 6 | **A1-HIGH** | P1 | ✅ Fixed — star removed from AgeingPanel (no-op dead interaction); ForYouRow gates on prop |
| 7 | **A2-MEDIUM** | P1 | ✅ Fixed — 6 age buckets: thisWeek, thisMonth, twoMonths, threeMonths, sixMonths, sixPlus |
| 8 | **D2-HIGH** | P1 | ✅ Fixed — ForYouRow height 62→56px (April 2026 spec) |
| 9 | **X6** | P1 | ✅ Fixed — CatalystActivitySection excludes field_name='comment' from history feed |
| 10 | **C1-MEDIUM** | P2 | ✅ Investigated — cache working correctly; forceRefresh=true bypasses server cache; no code change |
| 11 | **B1-MEDIUM** | P2 | ⏸ Deferred — requires explicit Vikram design approval |
| 12 | **X5** | P1 | ✅ Investigated — ADF media pipeline already wired (EpicDescriptionRenderer + MediaProvidersShell) |
| 13 | **Row 20** | P2 | ✅ Done — ADS space.* token sweep across ForYouRow, AgeingPanel, ForYouTabs |

---

## Phase 2 — Plan (final progress)

| # | Task | Status |
|---|---|---|
| 1 | Jira DOM probe | ✅ |
| 2 | Failing test: AgeingPanel navigate | ✅ |
| 3 | Fix F1 | ✅ |
| 4 | Failing test: View all projects | ✅ |
| 5 | Fix F2 | ✅ |
| 6 | ads-validator Phase 1 | ✅ |
| 7 | ProjectIcon investigation | ✅ |
| 8 | Ask Vikram sidebar display | ✅ |
| 9 | Failing test: HomeSidebar projectKey | ✅ |
| 10 | Fix L1+L2 | ✅ |
| 11 | Fix R1 (recency sort) | ✅ |
| 12 | jira-compare Phase 2 probe | ✅ |
| 13 | Fix D2 (height 62→56) | ✅ |
| 14 | D1 lozenge verify | ✅ |
| 15 | ads-validator Phase 2 | ✅ |
| 16 | C1 caching investigation | ✅ (no fix needed) |
| 17 | Fix A2 (ageing buckets) | ✅ |
| 18 | Fix A1 (star in Ageing) | ✅ (removed — no-op confirmed) |
| 19 | Ask Vikram bulk status change | ✅ (deferred — B1 pending approval) |
| 20 | ADS density token sweep | ✅ `fa1f2238f` |
| 21 | jira-compare final parity check | ✅ — see results below |
| 22 | Ask Vikram before merge | ✅ — approved by Vikram "go" |

---

## Row 21 — jira-compare final results

### Tab strip: ✅ full parity

| Metric | Catalyst | Jira |
|---|---|---|
| tablist gap | 4px | 4px |
| tablist padding | 4px | 4px |
| tablist bg | rgba(5,21,36,0.06) | rgba(5,21,36,0.06) |
| tablist border-radius | 8px | 8px |
| tablist height | 32px | 32px |
| tab height | 24px | 24px |
| tab padding | 2px 12px | 2px 12px |
| tab border-radius | 6px | 6px |

### Row: 1 known drift item (surfaced, Vikram approved hold)

| Metric | Catalyst | Jira |
|---|---|---|
| height | 56px | 62px ⚠️ |
| paddingBlock | 12px | 12px |
| paddingInline | 16px | 16px |
| gap | 16px | 16px |

**Height note:** Jira's Assigned-to-me rows measure 62px (explicit CSS, not natural expansion). The April 2026 probe that established the 56px spec was taken from the Recommended tab which had no content to probe on the May session. The ForYouRow.height.test.tsx locks height=56 based on the April spec. Vikram approved keeping 56 in this session. Flag for re-probe when the Recommended tab has loaded content.

---

## Commits in this session

| Hash | Description |
|---|---|
| `3e69e0e03` | fix(activity): exclude comment-field changelog entries from history feed |
| `3b76993f3` | fix(for-you): ForYouRow height 62→56px + green ForYou test suite |
| `6b5f409fe` | test(for-you): assert AgeingPanel omits star + ForYouRow gates on prop |
| `fa1f2238f` | feat(for-you): ADS density token sweep — replace raw px spacing with space.* tokens |

Prior session commits (same handover):
- F1 navigate fix, F2 view-all route, L1/L2 sidebar, R1 recency sort, A1/A2 ageing panel, X5 investigation

---

## Files touched

- `src/components/for-you/atlaskit/AgeingPanel.tsx` — F1 navigate, A1 star removed, A2 buckets, space.* tokens
- `src/components/for-you/atlaskit/ForYouRow.tsx` — D2 height 56px, space.* tokens
- `src/components/for-you/atlaskit/ForYouTabs.tsx` — space.* tokens
- `src/components/for-you/atlaskit/RecommendedProjectsStrip.tsx` — F2 route, R1 sort
- `src/components/layout/HomeSidebar.tsx` — L1 projectKey, L2 section icons
- `src/components/catalyst-detail-views/shared/sections/CatalystActivitySection.tsx` — X6 dedup filter

## Tests added

- `src/components/for-you/atlaskit/__tests__/AgeingPanel.navigate.test.tsx` — F1 navigation + bucket test
- `src/components/for-you/atlaskit/__tests__/AgeingPanel.star.test.tsx` — A1 star gate (structural)
- `src/components/for-you/atlaskit/__tests__/ForYouRow.height.test.tsx` — D2 height=56 (structural)
- `src/components/layout/__tests__/HomeSidebar.sidebar.test.tsx` — L1/L2 sidebar display
- `src/components/catalyst-detail-views/shared/sections/__tests__/CatalystActivitySection.dedup.test.ts` — X6 comment dedup

---

## Open items / next session

- **B1 Bulk status change**: requires Vikram design approval — confirm interaction pattern (checkbox select + action bar, or shift-click range?) before any code
- **Row height re-probe**: when the Jira Recommended tab has loaded content, re-probe to confirm whether 56 or 62 is the canonical Recommended row height. If 62 → update ForYouRow.tsx + test.
- **Assign to me UX (S1)**: "assign to me" spacing noted as awkward by user — needs separate audit pass

---

## Phase 6 — Learning Engine (draft lessons for Vikram approval)

```
## 2026-05-10 — For You AgeingPanel: navigate('/issues/:key') is a dead route
Surface: AgeingPanel.tsx / ForYouPage ageing tab
Pattern: AgeingPanel.handleSelect used navigate('/issues/${item.key}') instead of the canonical
useGlobalSearchStore.openDetail() path that every other For You panel uses. The route /issues/:key
does not exist in FullAppRoutes.tsx. Row click silently navigated to a 404.
Rule: In ANY For You panel or home-surface component, row click must use
useGlobalSearchStore.getState().openDetail({ id: item.phIssueId ?? item.id, itemType, projectKey })
for Jira-synced work items. The navigate() path for issues is never /issues/:key — it is the
detail modal via the globalSearchStore. This applies to every future home surface component.
```

```
## 2026-05-10 — View all projects must navigate to /project-hub/projects not /projects
Surface: RecommendedProjectsStrip.tsx / Home page
Pattern: "View all projects" button used navigate('/projects') which resolves to ProjectDirectory
(a legacy catch-all). The canonical all-projects surface is /project-hub/projects (AllProjectsPage).
Rule: Any "View all projects" / "See all projects" link on the home surface must navigate to
/project-hub/projects. The /projects route is legacy and does not contain the hub-based projects UI.
```

```
## 2026-05-10 — Jira For You row height: 56 (Recommended, April 2026) vs 62 (Assigned, May 2026)
Surface: ForYouRow.tsx row height
Pattern: Fresh jira-compare of Assigned-to-me tab measured Jira rows at 62px explicit height.
April 2026 spec was established from Recommended tab (or Recommended tab rows were not loaded
during the May session). The ForYouRow height test locks to 56px based on the April spec.
Rule: When re-probing For You row height, always click Assigned to me (confirmed to have rows)
AND Recommended (may not always load). If Assigned consistently shows 62, update spec to 62 and
update the height test accordingly.
```

---

## Copy-paste block (next session)

```
Continuing Home / For You overhaul handover (2026-05-10).
Status: all 22 plan rows complete.

Open items:
1. B1 Bulk status change — needs Vikram design approval on interaction pattern
2. Row height re-probe — Jira Assigned tab shows 62px, April spec says 56. Need to re-probe Recommended tab when it has content.
3. S1 "assign to me" spacing — low priority, separate pass

All committed to origin/main. No pending staged changes from this session.

Commits: 3e69e0e03, 3b76993f3, 6b5f409fe, fa1f2238f (plus prior session commits for F1-F2, L1-L2, R1, A1, A2)

Tests green: AgeingPanel.navigate, AgeingPanel.star, ForYouRow.height, HomeSidebar.sidebar, CatalystActivitySection.dedup (7 assertions, 4 files)

jira-compare: tab strip full parity. Row height drift noted (56 vs 62) — Vikram approved keeping 56 for now.
```
